import { formatDate, parseIsoDate } from './format';
import { addMonths } from './maintenance';
import type { MaintRow, Vehicle } from './models';
import { notificationsAllowed, presentNotification, replaceScheduledReminders } from './notifications';
import type { Repo } from './repoTypes';

const PREFIX = 'opendash-reminder:';
const REMIND_HOUR = 9;

export type FleetVehicle = { vehicle: Vehicle; rows: MaintRow[] };
export type PlannedReminder = { id: string; date: Date; title: string; body: string };
type DueService = { key: string; line: string };

function morningOf(day: Date, offsetDays = 0): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + offsetDays, REMIND_HOUR);
}

export function plannedReminders(fleet: FleetVehicle[], now: number): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (const { vehicle, rows } of fleet) {
    const documents = [
      { key: 'puc', label: 'PUC', value: vehicle.puc },
      { key: 'insurance', label: 'Insurance', value: vehicle.insurance },
    ];
    for (const doc of documents) {
      const expiry = parseIsoDate(doc.value);
      if (!expiry) continue;
      const until = formatDate(expiry.getTime());
      planned.push(
        {
          id: `${PREFIX}${doc.key}:${vehicle.id}:week`,
          date: morningOf(expiry, -7),
          title: `${doc.label} expires in 7 days`,
          body: `${vehicle.title}: ${doc.label} is valid until ${until}. Renew it before it lapses.`,
        },
        {
          id: `${PREFIX}${doc.key}:${vehicle.id}:day`,
          date: morningOf(expiry),
          title: `${doc.label} expires today`,
          body: `${vehicle.title}: ${doc.label} runs out today (${until}). Renew it before your next ride.`,
        },
      );
    }
    for (const row of rows) {
      const months = row.official?.intervalMonths;
      if (!months) continue;
      planned.push({
        id: `${PREFIX}service:${row.item.sid}`,
        date: morningOf(new Date(addMonths(row.item.lastDoneDateMs, months))),
        title: `${row.item.name} is due`,
        body: `${vehicle.title}: ${months} months since the last service. Log it in Garage once it is done.`,
      });
    }
  }
  return planned.filter((r) => r.date.getTime() > now).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function dueByDistance(fleet: FleetVehicle[]): DueService[] {
  return fleet.flatMap(({ vehicle, rows }) =>
    rows.flatMap((row) => {
      const km = Math.round(row.remainingKm);
      const state = km < 0 ? 'overdue' : km < row.item.intervalKm * 0.25 ? 'due' : null;
      if (!state) return [];
      const name = fleet.length > 1 ? `${vehicle.title} · ${row.item.name}` : row.item.name;
      const line =
        state === 'overdue'
          ? `${name} — overdue by ${Math.abs(km).toLocaleString('en-IN')} km`
          : `${name} — due in ${km.toLocaleString('en-IN')} km`;
      return [{ key: `${row.item.sid}:${state}`, line }];
    }),
  );
}

let pending: Promise<void> = Promise.resolve();

export function syncReminders(enabled: boolean, fleet: FleetVehicle[], repo: Repo): Promise<void> {
  pending = pending
    .then(() => runSync(enabled, fleet, repo))
    .catch((error) => console.warn('OpenDash reminders sync failed', error));
  return pending;
}

async function runSync(enabled: boolean, fleet: FleetVehicle[], repo: Repo) {
  const allowed = enabled && (await notificationsAllowed());
  await replaceScheduledReminders(PREFIX, allowed ? plannedReminders(fleet, Date.now()) : []);

  const due = dueByDistance(fleet);
  const notified = new Set(await repo.loadNotifiedServices());
  const fresh = due.some((d) => !notified.has(d.key));
  if (allowed && fresh) {
    const [title, body] =
      due.length === 1 ? ['Service due', due[0].line] : [`${due.length} services due`, due.map((d) => d.line).join('\n')];
    await presentNotification(title, body);
  }
  const keys = (allowed && fresh ? due : due.filter((d) => notified.has(d.key))).map((d) => d.key);
  if (keys.length !== notified.size || keys.some((k) => !notified.has(k))) {
    await repo.saveNotifiedServices(keys);
  }
}
