import { CURRENCIES, type CurrencyCode } from './models';

export function currencySymbol(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '₹';
}

export function formatMoney(amount: number, code: CurrencyCode, decimals = 0): string {
  const symbol = currencySymbol(code);
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return symbol.length > 1 ? `${symbol} ${formatted}` : `${symbol}${formatted}`;
}

export function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString('en-IN')} km`;
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function isProblemValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v || v === 'not set') return true;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  return parsed < Date.now();
}

export function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
