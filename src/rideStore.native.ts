import * as SQLite from 'expo-sqlite';

import type { ActiveRide, TrackPoint } from './rideTrack';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= (async () => {
    const opened = await SQLite.openDatabaseAsync('ride-recorder.db');
    await opened.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS active_ride (
        id INTEGER PRIMARY KEY CHECK (id = 1), start_ms INTEGER NOT NULL, bike TEXT NOT NULL,
        distance_m REAL NOT NULL DEFAULT 0, shown_m REAL NOT NULL DEFAULT 0, shown_ms INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS ride_point (
        id INTEGER PRIMARY KEY AUTOINCREMENT, lat REAL NOT NULL, lng REAL NOT NULL, t INTEGER NOT NULL);
    `);
    return opened;
  })().catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

export async function loadActiveRide(): Promise<ActiveRide | null> {
  const row = await (await db()).getFirstAsync<{
    start_ms: number;
    bike: string;
    distance_m: number;
    shown_m: number;
    shown_ms: number;
  }>('SELECT start_ms, bike, distance_m, shown_m, shown_ms FROM active_ride WHERE id = 1');
  return row
    ? { startMs: row.start_ms, bike: row.bike, distanceM: row.distance_m, shownM: row.shown_m, shownMs: row.shown_ms }
    : null;
}

export async function beginActiveRide(startMs: number, bike: string): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    await conn.execAsync('DELETE FROM ride_point; DELETE FROM active_ride;');
    await conn.runAsync('INSERT INTO active_ride (id, start_ms, bike, shown_ms) VALUES (1, ?, ?, ?)', [
      startMs,
      bike,
      startMs,
    ]);
  });
}

export async function lastTrackPoint(): Promise<TrackPoint | null> {
  return (await db()).getFirstAsync<TrackPoint>('SELECT lat, lng, t FROM ride_point ORDER BY id DESC LIMIT 1');
}

export async function appendTrackPoints(points: TrackPoint[], distanceM: number): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    for (const p of points) {
      await conn.runAsync('INSERT INTO ride_point (lat, lng, t) VALUES (?, ?, ?)', [p.lat, p.lng, p.t]);
    }
    await conn.runAsync('UPDATE active_ride SET distance_m = ? WHERE id = 1', [distanceM]);
  });
}

export async function markActivityShown(distanceM: number, atMs: number): Promise<void> {
  await (await db()).runAsync('UPDATE active_ride SET shown_m = ?, shown_ms = ? WHERE id = 1', [distanceM, atMs]);
}

export async function loadTrack(): Promise<TrackPoint[]> {
  return (await db()).getAllAsync<TrackPoint>('SELECT lat, lng, t FROM ride_point ORDER BY id');
}

export async function clearActiveRide(): Promise<void> {
  await (await db()).execAsync('DELETE FROM ride_point; DELETE FROM active_ride;');
}
