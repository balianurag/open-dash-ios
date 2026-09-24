import type {
  CurrencyCode,
  Expense,
  FuelFill,
  MaintenanceItem,
  Ride,
  SavedLocation,
  Vehicle,
} from './models';
import { DEFAULT_THEME, type ThemeName } from './theme';

export type Settings = {
  theme: ThemeName;
  currency: CurrencyCode;
  mapProvider: 'apple' | 'google';
  remindersEnabled: boolean;
};

export type Persisted = {
  vehicles: Vehicle[];
  activeVehicleId: string;
  odometerByVehicle: Record<string, number>;
  expenses: Expense[];
  fuel: Omit<FuelFill, 'kmpl'>[];
  maintenance: MaintenanceItem[];
  rides: Ride[];
  savedLocations: SavedLocation[];
  settings: Settings;
};

export type Repo = {
  load(): Promise<Persisted>;
  save(data: Persisted): Promise<void>;
  loadNotifiedServices(): Promise<string[]>;
  saveNotifiedServices(keys: string[]): Promise<void>;
};

export const DEFAULT_SETTINGS: Settings = {
  theme: DEFAULT_THEME,
  currency: 'INR',
  mapProvider: 'apple',
  remindersEnabled: false,
};
