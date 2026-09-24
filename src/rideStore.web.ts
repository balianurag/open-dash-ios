import type { ActiveRide, TrackPoint } from './rideTrack';

const KEY = 'opendash.v1.active-ride';

type Saved = { ride: ActiveRide; track: TrackPoint[] };

function read(): Saved | null {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function write(saved: Saved | null) {
  try {
    if (saved) globalThis.localStorage?.setItem(KEY, JSON.stringify(saved));
    else globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export async function loadActiveRide(): Promise<ActiveRide | null> {
  return read()?.ride ?? null;
}

export async function beginActiveRide(startMs: number, bike: string): Promise<void> {
  write({ ride: { startMs, bike, distanceM: 0, shownM: 0, shownMs: startMs }, track: [] });
}

export async function lastTrackPoint(): Promise<TrackPoint | null> {
  return read()?.track.at(-1) ?? null;
}

export async function appendTrackPoints(points: TrackPoint[], distanceM: number): Promise<void> {
  const saved = read();
  if (saved) write({ ride: { ...saved.ride, distanceM }, track: [...saved.track, ...points] });
}

export async function markActivityShown(distanceM: number, atMs: number): Promise<void> {
  const saved = read();
  if (saved) write({ ...saved, ride: { ...saved.ride, shownM: distanceM, shownMs: atMs } });
}

export async function loadTrack(): Promise<TrackPoint[]> {
  return read()?.track ?? [];
}

export async function clearActiveRide(): Promise<void> {
  write(null);
}
