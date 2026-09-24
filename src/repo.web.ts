import { H450_SEEDS } from './maintenance';
import { DEFAULT_VEHICLE, DEFAULT_VEHICLE_ID } from './models';
import { DEFAULT_SETTINGS, type Persisted, type Repo } from './repoTypes';

const KEY = 'opendash.v1';

export function newSid(): string {
  return crypto.randomUUID();
}

function seed(): Persisted {
  const now = Date.now();
  return {
    vehicles: [DEFAULT_VEHICLE],
    activeVehicleId: DEFAULT_VEHICLE_ID,
    odometerByVehicle: { [DEFAULT_VEHICLE_ID]: 0 },
    expenses: [],
    fuel: [],
    maintenance: H450_SEEDS.map((s, i) => ({
      id: i + 1,
      sid: s.sid,
      name: s.name,
      iconKey: s.icon,
      intervalKm: s.interval,
      lastDoneOdoKm: 0,
      lastDoneDateMs: now,
      vehicleId: DEFAULT_VEHICLE_ID,
    })),
    rides: [],
    savedLocations: [],
    settings: DEFAULT_SETTINGS,
  };
}

export async function createRepo(): Promise<Repo> {
  return {
    async load() {
      try {
        const raw = globalThis.localStorage?.getItem(KEY);
        if (raw) return JSON.parse(raw) as Persisted;
      } catch {
        /* ignore */
      }
      return seed();
    },
    async save(data) {
      try {
        globalThis.localStorage?.setItem(KEY, JSON.stringify(data));
      } catch {
        /* ignore */
      }
    },
  };
}
