export const DEFAULT_VEHICLE_ID = 'default';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'SGD' | 'AED';

export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: 'INR', symbol: '₹', label: 'Indian rupee' },
  { code: 'USD', symbol: '$', label: 'US dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British pound' },
  { code: 'AUD', symbol: 'A$', label: 'Australian dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian dollar' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore dollar' },
  { code: 'AED', symbol: 'AED', label: 'UAE dirham' },
];

export const EXPENSE_CATEGORIES = [
  'Fuel',
  'Repairs',
  'Accessories',
  'Riding Gear',
  'Food',
  'Stay',
  'Transport',
  'Others',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type Vehicle = {
  id: string;
  title: string;
  nickname: string;
  puc: string;
  insurance: string;
  service: string;
};

export type Expense = {
  id: number;
  sid: string;
  dateMs: number;
  category: string;
  amount: number;
  note: string;
  vehicleId: string;
};

export type FuelFill = {
  id: number;
  sid: string;
  dateMs: number;
  litres: number;
  cost: number;
  odometerKm: number;
  location: string;
  vehicleId: string;
  kmpl: number | null;
};

export type MaintenanceItem = {
  id: number;
  sid: string;
  name: string;
  iconKey: string;
  intervalKm: number;
  lastDoneOdoKm: number;
  lastDoneDateMs: number;
  vehicleId: string;
};

export type OfficialSchedule = {
  action: 'Replace' | 'Inspect' | 'Maintain';
  intervalKm: number;
  intervalMonths: number | null;
  guidance: string;
  manualPages: string;
};

export type MaintRow = {
  item: MaintenanceItem;
  remainingKm: number;
  remainingDays: number | null;
  tone: 'ok' | 'warn' | 'alert';
  official: OfficialSchedule | null;
};

export type Ride = {
  id: number;
  sid: string;
  startMs: number;
  endMs: number;
  distanceMeters: number;
  durationSec: number;
  avgSpeedMps: number;
  maxSpeedMps: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

export type SavedLocation = {
  id: number;
  sid: string;
  name: string;
  lat: number;
  lng: number;
  note: string;
  createdMs: number;
};

export type SharedLocation = {
  name: string;
  lat: number | null;
  lng: number | null;
  url: string | null;
  needsExpansion: boolean;
};

export const DEFAULT_VEHICLE: Vehicle = {
  id: DEFAULT_VEHICLE_ID,
  title: 'Himalayan 450',
  nickname: 'Default vehicle',
  puc: 'Not set',
  insurance: 'Not set',
  service: 'Not set',
};
