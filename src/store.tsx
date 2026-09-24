import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { DashboardSettings } from './dashboard';
import { addMonths, officialScheduleFor } from './maintenance';
import {
  DEFAULT_VEHICLE,
  type CurrencyCode,
  type Expense,
  type FuelFill,
  type MaintRow,
  type MaintenanceItem,
  type Ride,
  type SavedLocation,
  type Vehicle,
} from './models';
import { plannedReminders, syncReminders, type FleetVehicle, type PlannedReminder } from './reminders';
import { createRepo, newSid } from './repo';
import { DEFAULT_SETTINGS, type Persisted, type Repo, type Settings } from './repoTypes';
import { paletteFor, type Palette, type ThemeName } from './theme';

type DashState = {
  ready: boolean;
  vehicles: Vehicle[];
  activeVehicleId: string;
  odometerKm: number;
  expenses: Expense[];
  fuel: FuelFill[];
  maint: MaintRow[];
  rides: Ride[];
  savedLocations: SavedLocation[];
  settings: Settings;
  avgKmplLast5: number | null;
  upcomingReminders: PlannedReminder[];
};

type DashActions = {
  palette: Palette;
  activeVehicle: Vehicle;
  addVehicle: (input: Omit<Vehicle, 'id'>) => Promise<void>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  selectVehicle: (id: string) => Promise<void>;
  setOdometer: (km: number) => Promise<void>;
  addExpense: (input: {
    category: string;
    amount: number;
    note: string;
    dateMs?: number;
    litres?: number;
    odometerKm?: number;
    location?: string;
  }) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (sid: string) => Promise<void>;
  duplicateExpense: (expense: Expense) => Promise<void>;
  importExpenses: (rows: { category: string; amount: number; note: string; dateMs: number }[]) => Promise<number>;
  addMaintenance: (name: string, iconKey: string, intervalKm: number) => Promise<void>;
  logService: (item: MaintenanceItem, odoKm: number, intervalKm: number) => Promise<void>;
  deleteMaintenance: (sid: string) => Promise<void>;
  addRide: (ride: Omit<Ride, 'id' | 'sid'> & { sid?: string }) => Promise<void>;
  deleteRide: (sid: string) => Promise<void>;
  saveLocation: (loc: Omit<SavedLocation, 'id' | 'sid'> & { sid?: string }) => Promise<void>;
  deleteLocation: (sid: string) => Promise<void>;
  setTheme: (theme: ThemeName) => Promise<void>;
  setCurrency: (code: CurrencyCode) => Promise<void>;
  setMapProvider: (provider: 'apple' | 'google') => Promise<void>;
  setRemindersEnabled: (enabled: boolean) => Promise<void>;
  updateDashboard: (update: (current: DashboardSettings) => DashboardSettings) => Promise<void>;
};

type DashContextValue = DashState & DashActions;
const DashContext = createContext<DashContextValue | null>(null);

type FleetSource = Pick<Persisted, 'vehicles' | 'maintenance' | 'odometerByVehicle' | 'fuel'>;

function vehicleOdometer(data: FleetSource, vehicleId: string): number {
  const latestFuel = data.fuel
    .filter((f) => f.vehicleId === vehicleId)
    .reduce((max, f) => Math.max(max, f.odometerKm), 0);
  return Math.max(data.odometerByVehicle[vehicleId] ?? 0, latestFuel);
}

function maintRowsFor(data: FleetSource, vehicleId: string, odometerKm: number, now: number): MaintRow[] {
  const uniqueMaint = Object.values(
    data.maintenance
      .filter((m) => m.vehicleId === vehicleId)
      .reduce<Record<string, MaintenanceItem>>((acc, item) => {
        const key = item.name.trim().toLowerCase();
        if (!acc[key] || item.lastDoneOdoKm > acc[key].lastDoneOdoKm) acc[key] = item;
        return acc;
      }, {}),
  );
  return uniqueMaint.map((item) => {
    const official = officialScheduleFor(item);
    const remainingKm = item.lastDoneOdoKm + item.intervalKm - odometerKm;
    const remainingDays = official?.intervalMonths
      ? Math.ceil((addMonths(item.lastDoneDateMs, official.intervalMonths) - now) / 86_400_000)
      : null;
    const timeWarning =
      official?.intervalMonths != null && remainingDays != null
        ? remainingDays < official.intervalMonths * 30 * 0.25
        : false;
    const tone: MaintRow['tone'] =
      remainingKm < 0 || (remainingDays != null && remainingDays < 0)
        ? 'alert'
        : remainingKm < item.intervalKm * 0.25 || timeWarning
          ? 'warn'
          : 'ok';
    return { item, remainingKm, remainingDays, tone, official };
  });
}

function fleetFrom(data: FleetSource, now: number): FleetVehicle[] {
  return data.vehicles.map((vehicle) => ({
    vehicle,
    rows: maintRowsFor(data, vehicle.id, vehicleOdometer(data, vehicle.id), now),
  }));
}

function viewFrom(data: Persisted): Omit<DashState, 'ready'> {
  const activeVehicle = data.vehicles.find((v) => v.id === data.activeVehicleId) ?? data.vehicles[0] ?? DEFAULT_VEHICLE;
  const vehicleFuel = data.fuel
    .filter((f) => f.vehicleId === activeVehicle.id)
    .sort((a, b) => b.odometerKm - a.odometerKm || b.dateMs - a.dateMs);
  const fuel: FuelFill[] = vehicleFuel.map((f, i) => {
    const prev = vehicleFuel[i + 1];
    const kmpl = prev && f.litres > 0 && f.odometerKm > prev.odometerKm ? (f.odometerKm - prev.odometerKm) / f.litres : null;
    return { ...f, kmpl };
  });
  const odometerKm = vehicleOdometer(data, activeVehicle.id);
  const expenses = data.expenses
    .filter((e) => e.vehicleId === activeVehicle.id)
    .sort((a, b) => b.dateMs - a.dateMs);
  const now = Date.now();
  return {
    vehicles: data.vehicles,
    activeVehicleId: activeVehicle.id,
    odometerKm,
    expenses,
    fuel,
    maint: maintRowsFor(data, activeVehicle.id, odometerKm, now),
    rides: [...data.rides].sort((a, b) => b.startMs - a.startMs),
    savedLocations: [...data.savedLocations].sort((a, b) => b.createdMs - a.createdMs),
    settings: data.settings,
    avgKmplLast5: average(fuel.map((f) => f.kmpl).filter((n): n is number => n != null).slice(0, 5)),
    upcomingReminders: plannedReminders(fleetFrom(data, now), now),
  };
}

export function OpenDashProvider({ children }: { children: React.ReactNode }) {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [data, setData] = useState<Persisted>({
    vehicles: [DEFAULT_VEHICLE],
    activeVehicleId: DEFAULT_VEHICLE.id,
    odometerByVehicle: { [DEFAULT_VEHICLE.id]: 0 },
    expenses: [],
    fuel: [],
    maintenance: [],
    rides: [],
    savedLocations: [],
    settings: DEFAULT_SETTINGS,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const created = await createRepo();
        const loaded = await created.load();
        if (cancelled) return;
        setRepo(created);
        setData(loaded);
      } catch (error) {
        console.error('OpenDash failed to load data', error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(
    async (next: Persisted) => {
      setData(next);
      await repo?.save(next);
    },
    [repo],
  );

  const { vehicles, maintenance, odometerByVehicle, fuel } = data;
  const remindersEnabled = data.settings.remindersEnabled;
  useEffect(() => {
    if (!ready || !repo) return;
    const fleet = fleetFrom({ vehicles, maintenance, odometerByVehicle, fuel }, Date.now());
    void syncReminders(remindersEnabled, fleet, repo);
  }, [ready, repo, vehicles, maintenance, odometerByVehicle, fuel, remindersEnabled]);

  const view = useMemo(() => viewFrom(data), [data]);
  const activeVehicle = view.vehicles.find((v) => v.id === view.activeVehicleId) ?? DEFAULT_VEHICLE;

  const actions: DashActions = useMemo(
    () => ({
      palette: paletteFor(view.settings.theme),
      activeVehicle,
      addVehicle: (input) => {
        const id = newSid();
        return commit({
          ...data,
          vehicles: [...data.vehicles, { ...input, id }],
          activeVehicleId: id,
          odometerByVehicle: { ...data.odometerByVehicle, [id]: 0 },
        });
      },
      updateVehicle: (vehicle) =>
        commit({ ...data, vehicles: data.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v)) }),
      selectVehicle: (id) => commit({ ...data, activeVehicleId: id }),
      setOdometer: (km) =>
        commit({
          ...data,
          odometerByVehicle: { ...data.odometerByVehicle, [activeVehicle.id]: km },
        }),
      addExpense: async (input) => {
        const dateMs = input.dateMs ?? Date.now();
        const expense: Expense = {
          id: Date.now(),
          sid: newSid(),
          dateMs,
          category: input.category,
          amount: input.amount,
          note: input.note,
          vehicleId: activeVehicle.id,
        };
        let next: Persisted = { ...data, expenses: [expense, ...data.expenses] };
        if (input.category === 'Fuel' && input.litres && input.odometerKm) {
          next = {
            ...next,
            fuel: [
              {
                id: Date.now(),
                sid: newSid(),
                dateMs,
                litres: input.litres,
                cost: input.amount,
                odometerKm: input.odometerKm,
                location: input.location ?? '',
                vehicleId: activeVehicle.id,
              },
              ...next.fuel,
            ],
            odometerByVehicle: { ...next.odometerByVehicle, [activeVehicle.id]: input.odometerKm },
          };
        }
        await commit(next);
      },
      updateExpense: (expense) =>
        commit({ ...data, expenses: data.expenses.map((e) => (e.sid === expense.sid ? expense : e)) }),
      deleteExpense: (sid) => commit({ ...data, expenses: data.expenses.filter((e) => e.sid !== sid) }),
      duplicateExpense: (expense) =>
        commit({
          ...data,
          expenses: [{ ...expense, id: Date.now(), sid: newSid() }, ...data.expenses],
        }),
      importExpenses: async (rows) => {
        const extras: Expense[] = rows.map((row, i) => ({
          id: Date.now() + i,
          sid: newSid(),
          dateMs: row.dateMs,
          category: row.category,
          amount: row.amount,
          note: row.note,
          vehicleId: activeVehicle.id,
        }));
        await commit({ ...data, expenses: [...extras, ...data.expenses] });
        return extras.length;
      },
      addMaintenance: (name, iconKey, intervalKm) =>
        commit({
          ...data,
          maintenance: [
            ...data.maintenance,
            {
              id: Date.now(),
              sid: newSid(),
              name,
              iconKey,
              intervalKm,
              lastDoneOdoKm: view.odometerKm,
              lastDoneDateMs: Date.now(),
              vehicleId: activeVehicle.id,
            },
          ],
        }),
      logService: (item, odoKm, intervalKm) =>
        commit({
          ...data,
          maintenance: data.maintenance.map((m) =>
            m.sid === item.sid ? { ...m, lastDoneOdoKm: odoKm, lastDoneDateMs: Date.now(), intervalKm } : m,
          ),
        }),
      deleteMaintenance: (sid) =>
        commit({ ...data, maintenance: data.maintenance.filter((m) => m.sid !== sid) }),
      addRide: (ride) =>
        commit({
          ...data,
          rides: [{ ...ride, id: Date.now(), sid: ride.sid ?? newSid() }, ...data.rides],
        }),
      deleteRide: (sid) => commit({ ...data, rides: data.rides.filter((r) => r.sid !== sid) }),
      saveLocation: (loc) =>
        commit({
          ...data,
          savedLocations: [{ ...loc, id: Date.now(), sid: loc.sid ?? newSid() }, ...data.savedLocations],
        }),
      deleteLocation: (sid) =>
        commit({ ...data, savedLocations: data.savedLocations.filter((s) => s.sid !== sid) }),
      setTheme: (theme) => commit({ ...data, settings: { ...data.settings, theme } }),
      setCurrency: (code) => commit({ ...data, settings: { ...data.settings, currency: code } }),
      setMapProvider: (provider) => commit({ ...data, settings: { ...data.settings, mapProvider: provider } }),
      setRemindersEnabled: (enabled) =>
        commit({ ...data, settings: { ...data.settings, remindersEnabled: enabled } }),
      updateDashboard: (update) =>
        commit({ ...data, settings: { ...data.settings, dashboard: update(data.settings.dashboard) } }),
    }),
    [activeVehicle, commit, data, view.odometerKm, view.settings.theme],
  );

  const value = useMemo(() => ({ ready, ...view, ...actions }), [ready, view, actions]);
  return <DashContext.Provider value={value}>{children}</DashContext.Provider>;
}

export function useOpenDash(): DashContextValue {
  const ctx = useContext(DashContext);
  if (!ctx) throw new Error('useOpenDash must be used inside OpenDashProvider');
  return ctx;
}

function average(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
