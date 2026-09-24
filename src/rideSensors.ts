import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import type { GpsStatus } from './dashboard';
import { haversine, type TrackPoint } from './rideTrack';

const ACCURACY_GATE_M = 25;
const MIN_STEP_M = 8;
const MAX_PLAUSIBLE_MPS = 70;
const MOVING_MPS = 2.5;
const GPS_COURSE_HOLD_MS = 3000;
const STALE_MS = 6000;
const HEADING_STEP_DEG = 2;

type WatchState = 'starting' | 'watching' | 'denied' | 'services-off' | 'unavailable';
type Fix = { speedMps: number | null; accuracyM: number | null; t: number };
type Heading = { deg: number; source: 'gps' | 'compass' };

export type RideSensors = {
  watch: WatchState;
  fix: Fix | null;
  heading: Heading | null;
  compass: boolean;
  tripMeters: number;
  sessionMeters: number;
  tripStartMs: number;
  resetTrip: () => void;
  retry: () => void;
};

function angleGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

export function gpsStatus(sensors: Pick<RideSensors, 'watch' | 'fix'>, now: number): GpsStatus {
  if (sensors.watch === 'denied' || sensors.watch === 'services-off' || sensors.watch === 'unavailable') {
    return sensors.watch;
  }
  if (!sensors.fix) return 'waiting';
  return now - sensors.fix.t > STALE_MS ? 'stale' : 'live';
}

export function useRideSensors(): RideSensors {
  const [watch, setWatch] = useState<WatchState>('starting');
  const [fix, setFix] = useState<Fix | null>(null);
  const [heading, setHeading] = useState<Heading | null>(null);
  const [compass, setCompass] = useState(false);
  const [distance, setDistance] = useState({ trip: 0, session: 0 });
  const [tripStartMs, setTripStartMs] = useState(() => Date.now());
  const [attempt, setAttempt] = useState(0);
  const anchor = useRef<TrackPoint | null>(null);
  const previous = useRef<TrackPoint | null>(null);
  const gpsCourseUntil = useRef(0);
  const shown = useRef<Heading | null>(null);

  useEffect(() => {
    let alive = true;
    const subscriptions: Location.LocationSubscription[] = [];

    function showHeading(raw: number, source: Heading['source']) {
      const deg = Math.round(((raw % 360) + 360) % 360) % 360;
      const last = shown.current;
      if (last && last.source === source && angleGap(last.deg, deg) < HEADING_STEP_DEG) return;
      shown.current = { deg, source };
      setHeading(shown.current);
    }

    function onPosition(loc: Location.LocationObject) {
      if (!alive) return;
      const { latitude, longitude, accuracy, speed, heading: course } = loc.coords;
      const point = { lat: latitude, lng: longitude, t: loc.timestamp };
      const last = previous.current;
      previous.current = point;
      let mps = speed != null && speed >= 0 ? speed : null;
      if (mps == null && last && point.t > last.t) mps = haversine(last, point) / ((point.t - last.t) / 1000);
      if (mps != null && mps > MAX_PLAUSIBLE_MPS) mps = null;
      setFix({ speedMps: mps, accuracyM: accuracy ?? null, t: loc.timestamp });

      if (mps != null && mps >= MOVING_MPS && course != null && course >= 0) {
        gpsCourseUntil.current = Date.now() + GPS_COURSE_HOLD_MS;
        showHeading(course, 'gps');
      }

      if (accuracy != null && accuracy > ACCURACY_GATE_M) return;
      const from = anchor.current;
      if (!from) {
        anchor.current = point;
        return;
      }
      const d = haversine(from, point);
      const dt = (point.t - from.t) / 1000;
      if (dt <= 0 || d / dt > MAX_PLAUSIBLE_MPS) {
        anchor.current = point;
        return;
      }
      if (d < Math.max(MIN_STEP_M, accuracy ?? 0)) return;
      anchor.current = point;
      setDistance((v) => ({ trip: v.trip + d, session: v.session + d }));
    }

    function onCompass(h: Location.LocationHeadingObject) {
      if (!alive || Date.now() < gpsCourseUntil.current) return;
      const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      if (!(deg >= 0)) return;
      showHeading(deg, 'compass');
    }

    (async () => {
      try {
        if (!(await Location.hasServicesEnabledAsync())) {
          if (alive) setWatch('services-off');
          return;
        }
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (!alive) return;
        if (!permission.granted) {
          setWatch('denied');
          return;
        }
        const position = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 0,
            timeInterval: 1000,
          },
          onPosition,
          (reason) => console.warn('OpenDash dashboard GPS error', reason),
        );
        if (!alive) {
          position.remove();
          return;
        }
        subscriptions.push(position);
        setWatch('watching');
        if (Platform.OS === 'web') return;
        try {
          const heading = await Location.watchHeadingAsync(onCompass);
          if (!alive) {
            heading.remove();
            return;
          }
          subscriptions.push(heading);
          setCompass(true);
        } catch {
          if (alive) setCompass(false);
        }
      } catch (error) {
        console.warn('OpenDash could not start dashboard sensors', error);
        if (alive) setWatch('unavailable');
      }
    })();

    return () => {
      alive = false;
      subscriptions.forEach((s) => s.remove());
    };
  }, [attempt]);

  useEffect(() => {
    if (watch === 'starting' || watch === 'watching') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setAttempt((n) => n + 1);
    });
    return () => sub.remove();
  }, [watch]);

  const resetTrip = useCallback(() => {
    setDistance((v) => ({ ...v, trip: 0 }));
    setTripStartMs(Date.now());
  }, []);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    watch,
    fix,
    heading,
    compass,
    tripMeters: distance.trip,
    sessionMeters: distance.session,
    tripStartMs,
    resetTrip,
    retry,
  };
}
