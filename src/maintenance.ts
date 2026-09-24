import { DEFAULT_VEHICLE_ID, type MaintenanceItem, type OfficialSchedule } from './models';

const SOURCE_PAGES = "Owner's Manual, Periodical Maintenance, pp. 122-127";

export const H450_SEEDS: { sid: string; name: string; icon: string; interval: number }[] = [
  { sid: 'seed-oil', name: 'Engine oil', icon: 'drop', interval: 10000 },
  { sid: 'seed-oilfilter', name: 'Oil filter', icon: 'fuel', interval: 10000 },
  { sid: 'seed-brakes', name: 'Brake pads - front', icon: 'gauge', interval: 10000 },
  { sid: 'seed-brakes-rear', name: 'Brake pads - rear', icon: 'gauge', interval: 10000 },
  { sid: 'seed-front-tyre', name: 'Front tyre', icon: 'gauge', interval: 10000 },
  { sid: 'seed-rear-tyre', name: 'Rear tyre', icon: 'gauge', interval: 10000 },
  { sid: 'seed-airfilter', name: 'Air filter', icon: 'wrench', interval: 10000 },
  { sid: 'seed-chain', name: 'Drive chain', icon: 'chain', interval: 500 },
];

export function officialScheduleFor(item: MaintenanceItem): OfficialSchedule | null {
  if (item.vehicleId !== DEFAULT_VEHICLE_ID) return null;
  switch (item.name.trim().toLowerCase()) {
    case 'engine oil':
      return {
        action: 'Replace',
        intervalKm: 10000,
        intervalMonths: 12,
        guidance:
          'Replace every 10,000 km or 12 months after the initial 500 km service. Check the oil level every 1,000 km.',
        manualPages: SOURCE_PAGES,
      };
    case 'oil filter':
    case 'engine oil filter':
      return {
        action: 'Replace',
        intervalKm: 10000,
        intervalMonths: 12,
        guidance: 'Replace every 10,000 km or 12 months after the initial 500 km service.',
        manualPages: SOURCE_PAGES,
      };
    case 'air filter':
    case 'air filter element':
      return {
        action: 'Replace',
        intervalKm: 10000,
        intervalMonths: 12,
        guidance: 'Replace every 10,000 km or 12 months. Clean or replace more frequently in dusty conditions.',
        manualPages: SOURCE_PAGES,
      };
    case 'brake pads - front':
    case 'brake pads - rear':
      return {
        action: 'Inspect',
        intervalKm: 10000,
        intervalMonths: 12,
        guidance:
          'Inspect at each scheduled service and replace if necessary; the manual specifies no fixed replacement distance.',
        manualPages: SOURCE_PAGES,
      };
    case 'front tyre':
    case 'rear tyre':
      return {
        action: 'Inspect',
        intervalKm: 10000,
        intervalMonths: 12,
        guidance:
          'Inspect tyre wear at each scheduled service and replace if necessary; the manual specifies no fixed replacement distance.',
        manualPages: SOURCE_PAGES,
      };
    case 'chain sprocket':
    case 'drive chain':
    case 'rear wheel drive chain':
      return {
        action: 'Maintain',
        intervalKm: 500,
        intervalMonths: null,
        guidance:
          'Clean, lubricate, and adjust every 500 km or earlier, and after wet, dusty, or muddy riding. Replace worn parts as necessary.',
        manualPages: SOURCE_PAGES,
      };
    default:
      return null;
  }
}

export function addMonths(ms: number, months: number): number {
  const d = new Date(ms);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

export function iconForKey(key: string): string {
  switch (key) {
    case 'chain':
      return 'link';
    case 'drop':
      return 'water';
    case 'gauge':
      return 'speedometer-outline';
    case 'thermo':
      return 'thermometer-outline';
    case 'fuel':
      return 'water-outline';
    default:
      return 'construct-outline';
  }
}
