import type { Ionicons } from '@expo/vector-icons';

import { isProblemValue, parseIsoDate } from './format';
import type { MaintRow, Vehicle } from './models';

export type TileKind =
  | 'speed'
  | 'trip'
  | 'rideTime'
  | 'heading'
  | 'clock'
  | 'range'
  | 'odometer'
  | 'service'
  | 'documents';
export type TileSize = 'small' | 'large';
export type DashTile = { kind: TileKind; size: TileSize };
export type DashLayout = { id: string; name: string; tiles: DashTile[] };
export type DashboardSettings = {
  layouts: DashLayout[];
  activeLayoutId: string;
  nightMode: boolean;
  tankLitresByVehicle: Record<string, number>;
};
export type Tone = 'ok' | 'warn' | 'alert';

export const DEFAULT_TANK_LITRES = 17;
export const MAX_TANK_LITRES = 60;

export const TILE_KINDS: TileKind[] = [
  'speed',
  'trip',
  'rideTime',
  'heading',
  'clock',
  'range',
  'odometer',
  'service',
  'documents',
];

export const TILE_META: Record<TileKind, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  speed: { label: 'Speed', icon: 'speedometer-outline' },
  trip: { label: 'Trip', icon: 'flag-outline' },
  rideTime: { label: 'Ride time', icon: 'stopwatch-outline' },
  heading: { label: 'Heading', icon: 'compass-outline' },
  clock: { label: 'Clock', icon: 'time-outline' },
  range: { label: 'Range (est.)', icon: 'water-outline' },
  odometer: { label: 'Odometer', icon: 'analytics-outline' },
  service: { label: 'Next service', icon: 'construct-outline' },
  documents: { label: 'PUC & insurance', icon: 'document-text-outline' },
};

function tiles(spec: [TileKind, TileSize][]): DashTile[] {
  return spec.map(([kind, size]) => ({ kind, size }));
}

export const DEFAULT_DASHBOARD: DashboardSettings = {
  layouts: [
    {
      id: 'commute',
      name: 'Commute',
      tiles: tiles([
        ['speed', 'large'],
        ['clock', 'small'],
        ['trip', 'small'],
        ['range', 'small'],
        ['documents', 'small'],
      ]),
    },
    {
      id: 'touring',
      name: 'Touring',
      tiles: tiles([
        ['speed', 'large'],
        ['heading', 'small'],
        ['trip', 'small'],
        ['rideTime', 'small'],
        ['range', 'small'],
        ['service', 'small'],
        ['odometer', 'small'],
      ]),
    },
  ],
  activeLayoutId: 'commute',
  nightMode: false,
  tankLitresByVehicle: {},
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidTank(litres: number): boolean {
  return Number.isFinite(litres) && litres >= 1 && litres <= MAX_TANK_LITRES;
}

function normalizeLayout(raw: unknown): DashLayout | null {
  if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id || !Array.isArray(raw.tiles)) return null;
  const seen = new Set<TileKind>();
  const list: DashTile[] = [];
  for (const tile of raw.tiles) {
    if (!isRecord(tile)) continue;
    const kind = tile.kind as TileKind;
    if (!TILE_KINDS.includes(kind) || seen.has(kind)) continue;
    seen.add(kind);
    list.push({ kind, size: tile.size === 'large' ? 'large' : 'small' });
  }
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Layout';
  return { id: raw.id, name, tiles: list };
}

export function normalizeDashboard(raw: unknown): DashboardSettings {
  if (!isRecord(raw)) return DEFAULT_DASHBOARD;
  const layouts: DashLayout[] = [];
  for (const entry of Array.isArray(raw.layouts) ? raw.layouts : []) {
    const layout = normalizeLayout(entry);
    if (layout && !layouts.some((l) => l.id === layout.id)) layouts.push(layout);
  }
  const list = layouts.length ? layouts : DEFAULT_DASHBOARD.layouts;
  const activeLayoutId = list.find((l) => l.id === raw.activeLayoutId)?.id ?? list[0].id;
  const tankLitresByVehicle: Record<string, number> = {};
  if (isRecord(raw.tankLitresByVehicle)) {
    for (const [vehicleId, litres] of Object.entries(raw.tankLitresByVehicle)) {
      if (typeof litres === 'number' && isValidTank(litres)) tankLitresByVehicle[vehicleId] = litres;
    }
  }
  return { layouts: list, activeLayoutId, nightMode: raw.nightMode === true, tankLitresByVehicle };
}

export function dashboardFromJson(json: string | undefined): DashboardSettings {
  if (!json) return DEFAULT_DASHBOARD;
  try {
    return normalizeDashboard(JSON.parse(json));
  } catch {
    return DEFAULT_DASHBOARD;
  }
}

export function activeLayout(board: DashboardSettings): DashLayout {
  return board.layouts.find((l) => l.id === board.activeLayoutId) ?? board.layouts[0] ?? DEFAULT_DASHBOARD.layouts[0];
}

function editTiles(board: DashboardSettings, edit: (tiles: DashTile[]) => DashTile[]): DashboardSettings {
  const current = activeLayout(board);
  return {
    ...board,
    layouts: board.layouts.map((l) => (l.id === current.id ? { ...l, tiles: edit(l.tiles) } : l)),
  };
}

export function addTile(board: DashboardSettings, kind: TileKind): DashboardSettings {
  return editTiles(board, (list) =>
    list.some((t) => t.kind === kind) ? list : [...list, { kind, size: kind === 'speed' ? 'large' : 'small' }],
  );
}

export function removeTile(board: DashboardSettings, kind: TileKind): DashboardSettings {
  return editTiles(board, (list) => list.filter((t) => t.kind !== kind));
}

export function moveTile(board: DashboardSettings, kind: TileKind, delta: -1 | 1): DashboardSettings {
  return editTiles(board, (list) => {
    const from = list.findIndex((t) => t.kind === kind);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= list.length) return list;
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  });
}

export function toggleTileSize(board: DashboardSettings, kind: TileKind): DashboardSettings {
  return editTiles(board, (list) =>
    list.map((t) => (t.kind === kind ? { ...t, size: t.size === 'large' ? 'small' : 'large' } : t)),
  );
}

export function applySpeedFocus(board: DashboardSettings): DashboardSettings {
  return editTiles(board, (list) => [
    { kind: 'speed', size: 'large' },
    ...list.filter((t) => t.kind !== 'speed').map((t) => ({ ...t, size: 'small' as const })),
  ]);
}

export function selectLayout(board: DashboardSettings, id: string): DashboardSettings {
  return board.layouts.some((l) => l.id === id) ? { ...board, activeLayoutId: id } : board;
}

export function nextLayoutId(board: DashboardSettings): string {
  const index = board.layouts.findIndex((l) => l.id === activeLayout(board).id);
  return board.layouts[(index + 1) % board.layouts.length].id;
}

export function createLayout(board: DashboardSettings, id: string, name: string): DashboardSettings {
  const copy: DashLayout = { id, name: name.trim(), tiles: activeLayout(board).tiles.map((t) => ({ ...t })) };
  return { ...board, layouts: [...board.layouts, copy], activeLayoutId: id };
}

export function renameLayout(board: DashboardSettings, id: string, name: string): DashboardSettings {
  return { ...board, layouts: board.layouts.map((l) => (l.id === id ? { ...l, name: name.trim() } : l)) };
}

export function deleteLayout(board: DashboardSettings, id: string): DashboardSettings {
  if (board.layouts.length <= 1) return board;
  const layouts = board.layouts.filter((l) => l.id !== id);
  const activeLayoutId = layouts.some((l) => l.id === board.activeLayoutId) ? board.activeLayoutId : layouts[0].id;
  return { ...board, layouts, activeLayoutId };
}

export function tankLitresFor(board: DashboardSettings, vehicleId: string): number {
  return board.tankLitresByVehicle[vehicleId] ?? DEFAULT_TANK_LITRES;
}

export function setTankLitres(board: DashboardSettings, vehicleId: string, litres: number): DashboardSettings {
  return { ...board, tankLitresByVehicle: { ...board.tankLitresByVehicle, [vehicleId]: litres } };
}

export type TileRow = { tiles: DashTile[]; weight: number };

export function packRows(list: DashTile[]): TileRow[] {
  const rows: DashTile[][] = [];
  let pending: DashTile | null = null;
  for (const tile of list) {
    if (tile.size === 'large') {
      if (pending) rows.push([pending]);
      pending = null;
      rows.push([tile]);
    } else if (pending) {
      rows.push([pending, tile]);
      pending = null;
    } else {
      pending = tile;
    }
  }
  if (pending) rows.push([pending]);
  return rows.map((row) => ({
    tiles: row,
    weight: row[0].size === 'large' ? (row[0].kind === 'speed' ? 3 : 2) : 1,
  }));
}

export type FuelRange =
  | { kind: 'unknown' }
  | { kind: 'estimate'; remainingKm: number; fullKm: number; tankLitres: number; kmpl: number };

export function estimateRange(input: {
  tankLitres: number;
  kmpl: number | null;
  odometerKm: number;
  lastFillOdoKm: number | null;
  riddenKm: number;
}): FuelRange {
  const { tankLitres, kmpl, odometerKm, lastFillOdoKm, riddenKm } = input;
  if (kmpl == null || !(kmpl > 0) || lastFillOdoKm == null) return { kind: 'unknown' };
  const fullKm = tankLitres * kmpl;
  const usedKm = Math.max(0, odometerKm - lastFillOdoKm) + Math.max(0, riddenKm);
  const remainingKm = Math.round(Math.max(0, fullKm - usedKm) / 5) * 5;
  return { kind: 'estimate', remainingKm, fullKm, tankLitres, kmpl };
}

export type DocState = { tone: Tone; short: string; detail: string };

export function documentState(value: string, now: number): DocState {
  const v = value.trim();
  if (!v || v.toLowerCase() === 'not set') return { tone: 'warn', short: 'Not set', detail: 'not set' };
  const expiry = parseIsoDate(v);
  if (!expiry) {
    return isProblemValue(v)
      ? { tone: 'alert', short: 'Expired', detail: 'expired' }
      : { tone: 'ok', short: 'Valid', detail: 'valid' };
  }
  const today = new Date(now);
  const days = Math.round(
    (expiry.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000,
  );
  if (days < 0) return { tone: 'alert', short: 'Expired', detail: 'expired' };
  if (days === 0) return { tone: 'warn', short: 'Today', detail: 'expires today' };
  if (days <= 30) return { tone: 'warn', short: 'Expiring', detail: `${days} d left` };
  return { tone: 'ok', short: 'Valid', detail: 'valid' };
}

const SEVERITY: Record<Tone, number> = { ok: 0, warn: 1, alert: 2 };

export function nextService(rows: MaintRow[]): MaintRow | null {
  return rows.reduce<MaintRow | null>((best, row) => (!best || row.remainingKm < best.remainingKm ? row : best), null);
}

export function cardinal(deg: number): string {
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return points[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export function formatElapsed(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function clockParts(ms: number): { time: string; period: string } {
  const [time, ...rest] = new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).split(/\s+/);
  return { time, period: rest.join(' ') };
}

export type GpsStatus = 'waiting' | 'live' | 'stale' | 'denied' | 'services-off' | 'unavailable' | 'preview';

export type DashContext = {
  now: number;
  gps: GpsStatus;
  speedMps: number | null;
  accuracyM: number | null;
  tripMeters: number;
  tripStartMs: number;
  headingDeg: number | null;
  headingSource: 'gps' | 'compass' | null;
  compass: boolean;
  odometerKm: number;
  range: FuelRange;
  service: MaintRow | null;
  vehicle: Pick<Vehicle, 'puc' | 'insurance'>;
};

export type TileView = { value: string; unit?: string; caption?: string; tone?: Tone; dim?: boolean };

const STANDSTILL_MPS = 0.8;

function gpsCaption(ctx: DashContext): string {
  switch (ctx.gps) {
    case 'live':
      return ctx.accuracyM != null ? `GPS ±${Math.round(ctx.accuracyM)} m` : 'GPS';
    case 'stale':
      return 'GPS signal lost';
    case 'denied':
      return 'Location is off';
    case 'services-off':
      return 'Location Services off';
    case 'unavailable':
      return 'GPS unavailable';
    case 'preview':
      return 'Phone GPS';
    default:
      return 'Waiting for GPS';
  }
}

export function tileView(kind: TileKind, ctx: DashContext): TileView {
  switch (kind) {
    case 'speed': {
      const mps = ctx.gps === 'live' ? ctx.speedMps : null;
      const kmh = mps != null && mps >= STANDSTILL_MPS ? Math.round(mps * 3.6) : 0;
      return { value: mps != null ? String(kmh) : '—', unit: 'km/h', caption: gpsCaption(ctx), dim: mps == null };
    }
    case 'trip':
      return { value: (ctx.tripMeters / 1000).toFixed(1), unit: 'km', caption: 'GPS distance' };
    case 'rideTime':
      return {
        value: formatElapsed((ctx.now - ctx.tripStartMs) / 1000),
        caption: `Since ${clockParts(ctx.tripStartMs).time}`,
      };
    case 'heading':
      if (ctx.headingDeg == null) {
        return { value: '—', caption: ctx.compass ? 'Waiting for compass' : 'Needs GPS movement', dim: true };
      }
      return {
        value: cardinal(ctx.headingDeg),
        unit: `${Math.round(ctx.headingDeg)}°`,
        caption: ctx.headingSource === 'gps' ? 'GPS course' : 'Compass',
      };
    case 'clock': {
      const { time, period } = clockParts(ctx.now);
      const date = new Date(ctx.now).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
      return { value: time, unit: period || undefined, caption: date };
    }
    case 'range': {
      const r = ctx.range;
      if (r.kind === 'unknown') {
        return { value: 'Add fuel data', caption: 'Log two fill-ups with odometer in Expenses', dim: true };
      }
      const share = r.fullKm > 0 ? r.remainingKm / r.fullKm : 0;
      return {
        value: `≈${r.remainingKm.toLocaleString('en-IN')}`,
        unit: 'km',
        caption: `${r.tankLitres} L × ${r.kmpl.toFixed(1)} km/l, if full at last fill`,
        tone: share <= 0.1 ? 'alert' : share <= 0.2 ? 'warn' : undefined,
      };
    }
    case 'odometer':
      return { value: Math.round(ctx.odometerKm).toLocaleString('en-IN'), unit: 'km', caption: 'Last logged reading' };
    case 'service': {
      const row = ctx.service;
      if (!row) return { value: '—', caption: 'Add intervals in Garage', dim: true };
      const byDate = row.remainingDays != null && row.remainingDays < 0 ? ' · overdue by date' : '';
      if (row.remainingKm < 0) {
        return {
          value: 'Overdue',
          caption: `${row.item.name} · ${Math.abs(Math.round(row.remainingKm)).toLocaleString('en-IN')} km over`,
          tone: 'alert',
        };
      }
      return {
        value: Math.round(row.remainingKm).toLocaleString('en-IN'),
        unit: 'km',
        caption: `${row.item.name}${byDate}`,
        tone: row.tone === 'ok' ? undefined : row.tone,
      };
    }
    case 'documents': {
      const puc = documentState(ctx.vehicle.puc, ctx.now);
      const insurance = documentState(ctx.vehicle.insurance, ctx.now);
      const worst = SEVERITY[insurance.tone] > SEVERITY[puc.tone] ? insurance : puc;
      return {
        value: worst.short,
        caption: `PUC ${puc.detail} · Insurance ${insurance.detail}`,
        tone: worst.tone,
      };
    }
  }
}
