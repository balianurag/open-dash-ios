import type { SharedLocation } from './models';

const URL_RE = /https?:\/\/[^\s)]+/;
const COORD_3D4D = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
const COORD_AT = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
const COORD_Q = /[?&](?:q|query|destination|daddr)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
const COORD_LL = /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/;
const COORD_GEO = /geo:(-?\d+\.\d+),(-?\d+\.\d+)/;
const COORD_SEARCH = /\/search\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/;
const PLACE_PATH = /\/place\/([^/@?]+)/;
const PLACE_Q = /[?&]q=([^&0-9\-@][^&]*)/;

function valid(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}

function pair(a: string, b: string): [number, number] | null {
  const lat = Number(a);
  const lng = Number(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !valid(lat, lng)) return null;
  return [lat, lng];
}

export function extractCoords(s: string): [number, number] | null {
  for (const re of [COORD_3D4D, COORD_GEO, COORD_SEARCH, COORD_AT, COORD_Q, COORD_LL]) {
    const m = re.exec(s);
    if (!m) continue;
    const p = pair(m[1], m[2]);
    if (p) return p;
  }
  return null;
}

export function extractPlaceName(s: string): string | null {
  const path = PLACE_PATH.exec(s);
  if (path) {
    try {
      return decodeURIComponent(path[1].replace(/\+/g, ' ')).replace(/_/g, ' ').trim() || null;
    } catch {
      return path[1];
    }
  }
  const q = PLACE_Q.exec(s);
  if (q) {
    try {
      return decodeURIComponent(q[1].replace(/\+/g, ' ')).trim() || null;
    } catch {
      return q[1];
    }
  }
  return null;
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

export function isAllowedNetworkUrl(value: string): boolean {
  try {
    const uri = new URL(value);
    if (uri.protocol !== 'https:') return false;
    const host = uri.host.toLowerCase();
    const path = uri.pathname;
    if (host.endsWith('openstreetmap.org') || host.endsWith('osm.org')) return true;
    if (host === 'maps.app.goo.gl' || host === 'maps.google.com') return true;
    if (host === 'goo.gl' && path.startsWith('/maps')) return true;
    if ((host === 'www.google.com' || host === 'google.com') && path.startsWith('/maps')) return true;
    if (host === 'maps.apple.com') return true;
    return false;
  } catch {
    return false;
  }
}

function isAllowedShareUri(value: string): boolean {
  return value.startsWith('geo:') || isAllowedNetworkUrl(value);
}

export function parseSharedLocation(text: string): SharedLocation {
  const trimmed = text.trim();
  const raw = URL_RE.exec(trimmed)?.[0]?.replace(/[.,;!?)\]]+$/, '') ?? (trimmed.startsWith('geo:') ? trimmed : null);
  const url = raw && isAllowedShareUri(raw) ? raw : null;
  const coords = url ? extractCoords(url) : raw ? null : extractCoords(trimmed);
  const textBefore = url ? trimmed.slice(0, trimmed.indexOf(url)).trim() : '';
  const textName = textBefore
    .split('\n')
    .reverse()
    .find((line) => line.trim())
    ?.replace(/:$/, '')
    .replace(/^Check out/i, '')
    .trim();

  const name = textName && textName !== 'Check out'
    ? textName
    : url
      ? extractPlaceName(url) ?? 'Shared location'
      : coords
        ? 'Dropped pin'
        : 'Loading…';

  return {
    name,
    lat: coords?.[0] ?? null,
    lng: coords?.[1] ?? null,
    url,
    needsExpansion: Boolean(url && !coords),
  };
}

export async function resolveMapUrl(url: string): Promise<{ lat: number; lng: number; name: string | null } | null> {
  if (!isAllowedNetworkUrl(url)) return null;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const finalUrl = res.url || url;
    let coords = extractCoords(finalUrl);
    const name = extractPlaceName(finalUrl);
    if (!coords) {
      const body = (await res.text()).slice(0, 256 * 1024);
      const bodyMatch =
        COORD_3D4D.exec(body) ||
        /\[null,null,(-?\d+\.\d{3,}),(-?\d+\.\d{3,})\]/.exec(body) ||
        COORD_AT.exec(body);
      if (bodyMatch) coords = pair(bodyMatch[1], bodyMatch[2]);
    }
    if (!coords) return name ? { lat: 0, lng: 0, name } : null;
    return { lat: coords[0], lng: coords[1], name };
  } catch {
    return null;
  }
}

export function appleMapsUrl(lat: number, lng: number, name?: string): string {
  const q = name ? encodeURIComponent(name) : `${lat},${lng}`;
  return `http://maps.apple.com/?daddr=${lat},${lng}&q=${q}`;
}

export function googleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
