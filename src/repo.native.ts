import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

import { H450_SEEDS } from './maintenance';
import {
  CURRENCIES,
  DEFAULT_VEHICLE,
  DEFAULT_VEHICLE_ID,
  type CurrencyCode,
  type Expense,
  type MaintenanceItem,
  type Ride,
  type SavedLocation,
  type Vehicle,
} from './models';
import type { Persisted, Repo } from './repoTypes';
import { DEFAULT_THEME, type ThemeName } from './theme';

export function newSid(): string {
  return Crypto.randomUUID();
}

export async function createRepo(): Promise<Repo> {
  const db = await SQLite.openDatabaseAsync('opendash.db');
  await migrate(db);
  return {
    load: () => loadAll(db),
    save: (data) => saveAll(db, data),
    loadNotifiedServices: async () => {
      const row = await db.getFirstAsync<{ keys: string }>('SELECT keys FROM service_notified WHERE id = 1');
      return row ? (JSON.parse(row.keys) as string[]) : [];
    },
    saveNotifiedServices: async (keys) => {
      await db.runAsync('INSERT OR REPLACE INTO service_notified (id, keys) VALUES (1, ?)', [JSON.stringify(keys)]);
    },
  };
}

async function loadAll(db: SQLite.SQLiteDatabase): Promise<Persisted> {
  const settingRows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM app_settings');
  const settingsMap = Object.fromEntries(settingRows.map((r) => [r.key, r.value]));
  const vehicles =
    (await db.getAllAsync<Vehicle>('SELECT id, title, nickname, puc, insurance, service FROM vehicle')) ?? [];
  const vehicleList = vehicles.length ? vehicles : [DEFAULT_VEHICLE];
  const activeVehicleId =
    settingsMap.active_vehicle && vehicleList.some((v) => v.id === settingsMap.active_vehicle)
      ? settingsMap.active_vehicle
      : vehicleList[0].id;
  const odoRows = await db.getAllAsync<{ vehicle_id: string; odometer_km: number }>(
    'SELECT vehicle_id, odometer_km FROM vehicle_state',
  );
  const fuel = (
    await db.getAllAsync<{
      id: number;
      sid: string;
      date_ms: number;
      litres: number;
      cost: number;
      odometer_km: number;
      location: string;
      vehicle_id: string;
    }>('SELECT id, sid, date_ms, litres, cost, odometer_km, location, vehicle_id FROM fuel_fillup')
  ).map((f) => ({
    id: f.id,
    sid: f.sid,
    dateMs: f.date_ms,
    litres: f.litres,
    cost: f.cost,
    odometerKm: f.odometer_km,
    location: f.location,
    vehicleId: f.vehicle_id,
  }));
  const expenses = (
    await db.getAllAsync<{
      id: number;
      sid: string;
      date_ms: number;
      category: string;
      amount: number;
      note: string;
      vehicle_id: string;
    }>('SELECT id, sid, date_ms, category, amount, note, vehicle_id FROM expense')
  ).map(
    (e): Expense => ({
      id: e.id,
      sid: e.sid,
      dateMs: e.date_ms,
      category: e.category,
      amount: e.amount,
      note: e.note,
      vehicleId: e.vehicle_id,
    }),
  );
  const maintenance = (
    await db.getAllAsync<{
      id: number;
      sid: string;
      name: string;
      icon_key: string;
      interval_km: number;
      last_done_odo_km: number;
      last_done_date_ms: number;
      vehicle_id: string;
    }>(
      'SELECT id, sid, name, icon_key, interval_km, last_done_odo_km, last_done_date_ms, vehicle_id FROM maintenance_item',
    )
  ).map(
    (m): MaintenanceItem => ({
      id: m.id,
      sid: m.sid,
      name: m.name,
      iconKey: m.icon_key,
      intervalKm: m.interval_km,
      lastDoneOdoKm: m.last_done_odo_km,
      lastDoneDateMs: m.last_done_date_ms,
      vehicleId: m.vehicle_id,
    }),
  );
  const rides = (
    await db.getAllAsync<{
      id: number;
      sid: string;
      start_ms: number;
      end_ms: number;
      distance_m: number;
      duration_s: number;
      avg_speed: number;
      max_speed: number;
      start_lat: number;
      start_lng: number;
      end_lat: number;
      end_lng: number;
    }>(
      'SELECT id, sid, start_ms, end_ms, distance_m, duration_s, avg_speed, max_speed, start_lat, start_lng, end_lat, end_lng FROM ride',
    )
  ).map(
    (r): Ride => ({
      id: r.id,
      sid: r.sid,
      startMs: r.start_ms,
      endMs: r.end_ms,
      distanceMeters: r.distance_m,
      durationSec: r.duration_s,
      avgSpeedMps: r.avg_speed,
      maxSpeedMps: r.max_speed,
      startLat: r.start_lat,
      startLng: r.start_lng,
      endLat: r.end_lat,
      endLng: r.end_lng,
    }),
  );
  const savedLocations = (
    await db.getAllAsync<{
      id: number;
      sid: string;
      name: string;
      lat: number;
      lng: number;
      note: string;
      created_ms: number;
    }>('SELECT id, sid, name, lat, lng, note, created_ms FROM saved_location')
  ).map(
    (s): SavedLocation => ({
      id: s.id,
      sid: s.sid,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      note: s.note,
      createdMs: s.created_ms,
    }),
  );
  const themes: ThemeName[] = [
    'Hanle Black',
    'Mana Black',
    'Kamet White',
    'Slate Himalayan Salt',
    'Slate Poppy Blue',
    'Kaza Brown',
  ];
  const theme = themes.includes(settingsMap.theme as ThemeName) ? (settingsMap.theme as ThemeName) : DEFAULT_THEME;
  const currency = (CURRENCIES.some((c) => c.code === settingsMap.currency) ? settingsMap.currency : 'INR') as CurrencyCode;
  return {
    vehicles: vehicleList,
    activeVehicleId,
    odometerByVehicle: Object.fromEntries(odoRows.map((r) => [r.vehicle_id, r.odometer_km])),
    expenses,
    fuel,
    maintenance,
    rides,
    savedLocations,
    settings: {
      theme,
      currency,
      mapProvider: settingsMap.map_provider === 'google' ? 'google' : 'apple',
      remindersEnabled: settingsMap.reminders_enabled === '1',
    },
  };
}

async function saveAll(db: SQLite.SQLiteDatabase, data: Persisted) {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM vehicle;
      DELETE FROM vehicle_state;
      DELETE FROM fuel_fillup;
      DELETE FROM expense;
      DELETE FROM maintenance_item;
      DELETE FROM saved_location;
      DELETE FROM ride;
      DELETE FROM app_settings;
    `);
    for (const v of data.vehicles) {
      await db.runAsync(
        'INSERT INTO vehicle (id, title, nickname, puc, insurance, service) VALUES (?, ?, ?, ?, ?, ?)',
        [v.id, v.title, v.nickname, v.puc, v.insurance, v.service],
      );
    }
    for (const [vehicleId, km] of Object.entries(data.odometerByVehicle)) {
      await db.runAsync('INSERT INTO vehicle_state (vehicle_id, odometer_km) VALUES (?, ?)', [vehicleId, km]);
    }
    for (const f of data.fuel) {
      await db.runAsync(
        'INSERT INTO fuel_fillup (sid, date_ms, litres, cost, odometer_km, location, vehicle_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [f.sid, f.dateMs, f.litres, f.cost, f.odometerKm, f.location, f.vehicleId],
      );
    }
    for (const e of data.expenses) {
      await db.runAsync(
        'INSERT INTO expense (sid, date_ms, category, amount, note, vehicle_id) VALUES (?, ?, ?, ?, ?, ?)',
        [e.sid, e.dateMs, e.category, e.amount, e.note, e.vehicleId],
      );
    }
    for (const m of data.maintenance) {
      await db.runAsync(
        'INSERT INTO maintenance_item (sid, name, icon_key, interval_km, last_done_odo_km, last_done_date_ms, vehicle_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [m.sid, m.name, m.iconKey, m.intervalKm, m.lastDoneOdoKm, m.lastDoneDateMs, m.vehicleId],
      );
    }
    for (const s of data.savedLocations) {
      await db.runAsync(
        'INSERT INTO saved_location (sid, name, lat, lng, note, created_ms) VALUES (?, ?, ?, ?, ?, ?)',
        [s.sid, s.name, s.lat, s.lng, s.note, s.createdMs],
      );
    }
    for (const r of data.rides) {
      await db.runAsync(
        'INSERT INTO ride (sid, start_ms, end_ms, distance_m, duration_s, avg_speed, max_speed, start_lat, start_lng, end_lat, end_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          r.sid,
          r.startMs,
          r.endMs,
          r.distanceMeters,
          r.durationSec,
          r.avgSpeedMps,
          r.maxSpeedMps,
          r.startLat,
          r.startLng,
          r.endLat,
          r.endLng,
        ],
      );
    }
    await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', ['active_vehicle', data.activeVehicleId]);
    await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', ['theme', data.settings.theme]);
    await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', ['currency', data.settings.currency]);
    await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', [
      'map_provider',
      data.settings.mapProvider,
    ]);
    await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', [
      'reminders_enabled',
      data.settings.remindersEnabled ? '1' : '0',
    ]);
  });
}

async function migrate(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS vehicle (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, nickname TEXT NOT NULL DEFAULT '',
      puc TEXT NOT NULL DEFAULT 'Not set', insurance TEXT NOT NULL DEFAULT 'Not set', service TEXT NOT NULL DEFAULT 'Not set');
    CREATE TABLE IF NOT EXISTS vehicle_state (vehicle_id TEXT PRIMARY KEY, odometer_km INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS fuel_fillup (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, date_ms INTEGER NOT NULL, litres REAL NOT NULL,
      cost REAL NOT NULL, odometer_km INTEGER NOT NULL, location TEXT NOT NULL DEFAULT '', vehicle_id TEXT NOT NULL DEFAULT 'default');
    CREATE TABLE IF NOT EXISTS expense (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, date_ms INTEGER NOT NULL, category TEXT NOT NULL,
      amount REAL NOT NULL, note TEXT NOT NULL DEFAULT '', vehicle_id TEXT NOT NULL DEFAULT 'default');
    CREATE TABLE IF NOT EXISTS maintenance_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, name TEXT NOT NULL, icon_key TEXT NOT NULL,
      interval_km INTEGER NOT NULL, last_done_odo_km INTEGER NOT NULL, last_done_date_ms INTEGER NOT NULL,
      vehicle_id TEXT NOT NULL DEFAULT 'default');
    CREATE TABLE IF NOT EXISTS saved_location (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, name TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL,
      note TEXT NOT NULL DEFAULT '', created_ms INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS ride (
      id INTEGER PRIMARY KEY AUTOINCREMENT, sid TEXT NOT NULL, start_ms INTEGER NOT NULL, end_ms INTEGER NOT NULL,
      distance_m REAL NOT NULL, duration_s INTEGER NOT NULL, avg_speed REAL NOT NULL, max_speed REAL NOT NULL,
      start_lat REAL NOT NULL DEFAULT 0, start_lng REAL NOT NULL DEFAULT 0, end_lat REAL NOT NULL DEFAULT 0, end_lng REAL NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS service_notified (id INTEGER PRIMARY KEY CHECK (id = 1), keys TEXT NOT NULL);
  `);
  const vehicles = await db.getAllAsync<{ id: string }>('SELECT id FROM vehicle');
  if (vehicles.length === 0) {
    await db.runAsync(
      'INSERT INTO vehicle (id, title, nickname, puc, insurance, service) VALUES (?, ?, ?, ?, ?, ?)',
      [
        DEFAULT_VEHICLE.id,
        DEFAULT_VEHICLE.title,
        DEFAULT_VEHICLE.nickname,
        DEFAULT_VEHICLE.puc,
        DEFAULT_VEHICLE.insurance,
        DEFAULT_VEHICLE.service,
      ],
    );
    await db.runAsync('INSERT OR REPLACE INTO vehicle_state (vehicle_id, odometer_km) VALUES (?, ?)', [
      DEFAULT_VEHICLE_ID,
      0,
    ]);
    await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
      'active_vehicle',
      DEFAULT_VEHICLE_ID,
    ]);
  }
  const existing = await db.getAllAsync<{ sid: string }>(
    'SELECT sid FROM maintenance_item WHERE vehicle_id = ?',
    [DEFAULT_VEHICLE_ID],
  );
  const have = new Set(existing.map((r) => r.sid));
  const now = Date.now();
  for (const seed of H450_SEEDS) {
    if (have.has(seed.sid)) continue;
    await db.runAsync(
      'INSERT INTO maintenance_item (sid, name, icon_key, interval_km, last_done_odo_km, last_done_date_ms, vehicle_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [seed.sid, seed.name, seed.icon, seed.interval, 0, now, DEFAULT_VEHICLE_ID],
    );
  }
}
