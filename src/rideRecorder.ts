import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { endRideActivity, ensureRideActivity, startRideActivity, updateRideActivity } from './liveActivity';
import type { Ride } from './models';
import * as rideStore from './rideStore';
import { haversine, summarizeRide, type ActiveRide, type TrackPoint } from './rideTrack';

const RIDE_LOCATION_TASK = 'opendash-ride-location';
const ACCURACY_GATE_M = 20;
const ACTIVITY_EVERY_M = 100;
const ACTIVITY_EVERY_MS = 20_000;

export type LiveRide = { startMs: number; distanceM: number; bike: string };
export type RideMode = 'background' | 'foreground' | 'paused';
export type RideStatus = { ride: LiveRide; mode: RideMode; always: boolean };
export type StartFailure = 'services-off' | 'denied';

const listeners = new Set<(ride: LiveRide | null) => void>();
let queue: Promise<unknown> = Promise.resolve();
let foregroundWatch: Location.LocationSubscription | null = null;

TaskManager.defineTask<{ locations?: Location.LocationObject[] }>(RIDE_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  await enqueue(data.locations);
});

function serial<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task);
  queue = next.catch(() => undefined);
  return next;
}

function enqueue(locations: Location.LocationObject[]): Promise<void> {
  return serial(() => ingest(locations)).catch((error) => console.warn('OpenDash could not record a ride point', error));
}

function live(ride: ActiveRide): LiveRide {
  return { startMs: ride.startMs, distanceM: ride.distanceM, bike: ride.bike };
}

function activityProps(ride: LiveRide) {
  return { bike: ride.bike, startMs: ride.startMs, distanceKm: ride.distanceM / 1000 };
}

function emit(ride: LiveRide | null) {
  listeners.forEach((listener) => listener(ride));
}

async function ingest(locations: Location.LocationObject[]) {
  const ride = await rideStore.loadActiveRide();
  if (!ride) return;
  let last = await rideStore.lastTrackPoint();
  let distanceM = ride.distanceM;
  const accepted: TrackPoint[] = [];
  for (const loc of [...locations].sort((a, b) => a.timestamp - b.timestamp)) {
    if (loc.timestamp < ride.startMs) continue;
    if (loc.coords.accuracy != null && loc.coords.accuracy > ACCURACY_GATE_M) continue;
    const point = { lat: loc.coords.latitude, lng: loc.coords.longitude, t: loc.timestamp };
    if (last) distanceM += haversine(last, point);
    accepted.push(point);
    last = point;
  }
  if (!accepted.length) return;
  await rideStore.appendTrackPoints(accepted, distanceM);
  const current = live({ ...ride, distanceM });
  emit(current);
  const now = Date.now();
  if (distanceM - ride.shownM >= ACTIVITY_EVERY_M || now - ride.shownMs >= ACTIVITY_EVERY_MS) {
    await updateRideActivity(activityProps(current));
    await rideStore.markActivityShown(distanceM, now);
  }
}

async function startUpdates(): Promise<RideMode> {
  try {
    await Location.startLocationUpdatesAsync(RIDE_LOCATION_TASK, {
      accuracy: Location.Accuracy.Highest,
      distanceInterval: 8,
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });
    return 'background';
  } catch {
    foregroundWatch?.remove();
    foregroundWatch = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Highest, distanceInterval: 8, timeInterval: 2000 },
      (loc) => void enqueue([loc]),
    );
    return 'foreground';
  }
}

async function stopUpdates() {
  foregroundWatch?.remove();
  foregroundWatch = null;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(RIDE_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(RIDE_LOCATION_TASK);
    }
  } catch {
    /* background updates unavailable in this runtime */
  }
}

async function hasAlwaysPermission(): Promise<boolean> {
  try {
    return (await Location.getBackgroundPermissionsAsync()).status === 'granted';
  } catch {
    return false;
  }
}

export function subscribeRide(listener: (ride: LiveRide | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function hasActiveRide(): Promise<boolean> {
  try {
    return (await rideStore.loadActiveRide()) != null;
  } catch {
    return false;
  }
}

export async function startRide(bike: string): Promise<RideStatus | StartFailure> {
  if (!(await Location.hasServicesEnabledAsync())) return 'services-off';
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return 'denied';
  const always = await Location.requestBackgroundPermissionsAsync()
    .then((p) => p.status === 'granted')
    .catch(() => false);
  await stopUpdates();
  const startMs = Date.now();
  await serial(() => rideStore.beginActiveRide(startMs, bike));
  const mode = await startUpdates();
  const ride = { startMs, distanceM: 0, bike };
  await startRideActivity(activityProps(ride));
  emit(ride);
  return { ride, mode, always };
}

export async function restoreRide(): Promise<RideStatus | null> {
  const saved = await rideStore.loadActiveRide();
  if (!saved) return null;
  const ride = live(saved);
  let mode: RideMode = foregroundWatch ? 'foreground' : 'background';
  const running = await Location.hasStartedLocationUpdatesAsync(RIDE_LOCATION_TASK).catch(() => false);
  if (!running && !foregroundWatch) {
    const permission = await Location.getForegroundPermissionsAsync();
    mode = permission.status === 'granted' ? await startUpdates() : 'paused';
  }
  if (mode === 'background') await ensureRideActivity(activityProps(ride));
  return { ride, mode, always: await hasAlwaysPermission() };
}

export async function finishRide(): Promise<Omit<Ride, 'id' | 'sid'> | null> {
  await stopUpdates();
  return serial(async () => {
    const ride = await rideStore.loadActiveRide();
    if (!ride) return null;
    return summarizeRide(ride.startMs, Date.now(), await rideStore.loadTrack());
  });
}

export async function discardRide(): Promise<void> {
  await stopUpdates();
  await serial(() => rideStore.clearActiveRide());
  await endRideActivity();
  emit(null);
}
