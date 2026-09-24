import type { Ride } from './models';

export type TrackPoint = { lat: number; lng: number; t: number };

export type ActiveRide = {
  startMs: number;
  bike: string;
  distanceM: number;
  shownM: number;
  shownMs: number;
};

export function haversine(a: TrackPoint, b: TrackPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function summarizeRide(startMs: number, endMs: number, track: TrackPoint[]): Omit<Ride, 'id' | 'sid'> | null {
  if (track.length < 2) return null;
  let distance = 0;
  let maxSpeed = 0;
  for (let i = 1; i < track.length; i++) {
    const d = haversine(track[i - 1], track[i]);
    distance += d;
    const dt = (track[i].t - track[i - 1].t) / 1000;
    if (dt > 0) maxSpeed = Math.max(maxSpeed, d / dt);
  }
  const durationSec = Math.max(1, Math.round((endMs - startMs) / 1000));
  return {
    startMs,
    endMs,
    distanceMeters: distance,
    durationSec,
    avgSpeedMps: distance / durationSec,
    maxSpeedMps: maxSpeed,
    startLat: track[0].lat,
    startLng: track[0].lng,
    endLat: track[track.length - 1].lat,
    endLng: track[track.length - 1].lng,
  };
}
