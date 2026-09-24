import { csvCell } from './format';
import type { CurrencyCode, Expense } from './models';

const CATEGORIES = new Set([
  'Fuel',
  'Repairs',
  'Accessories',
  'Riding Gear',
  'Food',
  'Stay',
  'Transport',
  'Others',
]);

export function buildExpensesCsv(expenses: Expense[], currency: CurrencyCode): string {
  const header = `Date,Odometer_km,Distance_Covered_km,Fuel_L,Cost_${currency},Fuel_Price_per_L_${currency},Category,Note`;
  const rows = expenses.map((e) => {
    const fuel = fuelFields(e.note);
    return [
      isoDate(e.dateMs),
      fuel.odometer,
      fuel.distance,
      fuel.fuel,
      e.amount.toFixed(2),
      fuel.price,
      e.category,
      e.note,
    ]
      .map(csvCell)
      .join(',');
  });
  return [header, ...rows].join('\n');
}

export function buildExpensesHtml(expenses: Expense[], periodLabel: string, totalLabel: string): string {
  const rows = expenses
    .map(
      (e) =>
        `<tr><td>${escapeHtml(isoDate(e.dateMs))}</td><td>${escapeHtml(e.category)}</td><td>${escapeHtml(
          String(e.amount.toFixed(2)),
        )}</td><td>${escapeHtml(e.note)}</td></tr>`,
    )
    .join('');
  return `<html><head><meta charset="utf-8"><title>OpenDash Expenses</title></head><body><h1>OpenDash Expenses - ${escapeHtml(
    periodLabel,
  )}</h1><p>Total: ${escapeHtml(totalLabel)}</p><table border="1" cellspacing="0" cellpadding="6"><tr><th>Date</th><th>Category</th><th>Amount</th><th>Note</th></tr>${rows}</table></body></html>`;
}

export function parseCsv(text: string): { category: string; amount: number; note: string; dateMs: number }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const hasHeader = header.some((h) =>
    ['date', 'category', 'amount', 'note', 'odometer_km', 'cost_rs'].includes(h),
  );
  const data = hasHeader ? lines.slice(1) : lines;
  const out: { category: string; amount: number; note: string; dateMs: number }[] = [];
  for (const line of data) {
    const cells = parseCsvLine(line);
    if (cells.length === 0) continue;
    const date = valueFor(cells, header, hasHeader, 'date', 0);
    const categoryRaw = valueFor(cells, header, hasHeader, 'category', hasHeader ? 6 : 1);
    const amountRaw = valueFor(cells, header, hasHeader, 'amount', hasHeader ? 4 : 2).replace(/[₹$,]/g, '');
    const note = valueFor(cells, header, hasHeader, 'note', hasHeader ? 7 : 3);
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    out.push({
      category: normalizeCategory(categoryRaw),
      amount,
      note,
      dateMs: parseImportDate(date) ?? Date.now(),
    });
  }
  return out;
}

function fuelFields(note: string): { odometer: string; distance: string; fuel: string; price: string } {
  const odometer = /Odometer:\s*([\d.]+)/i.exec(note)?.[1] ?? '';
  const distance = /Distance covered:\s*([\d.]+)/i.exec(note)?.[1] ?? '';
  const fuel = /Fuel:\s*([\d.]+)/i.exec(note)?.[1] ?? '';
  const price = /Fuel price\/L:\s*[^\d]*([\d.]+)/i.exec(note)?.[1] ?? '';
  return { odometer, distance, fuel, price };
}

function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function valueFor(cells: string[], header: string[], hasHeader: boolean, key: string, fallback: number): string {
  const idx = hasHeader ? (header.includes(key) ? header.indexOf(key) : fallback) : fallback;
  return (cells[idx] ?? '').trim();
}

function normalizeCategory(raw: string): string {
  const match = [...CATEGORIES].find((c) => c.toLowerCase() === raw.trim().toLowerCase());
  return match ?? (raw.trim() || 'Others');
}

function parseImportDate(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
