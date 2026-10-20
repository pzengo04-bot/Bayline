// Pure functions that turn raw customers + bookings into dashboard numbers.
// They take plain arrays, so the same code works on demo data today and on
// rows from the real database later.

import type { Booking, Customer } from "./demo-data";

const DAY_MS = 86_400_000;

function daysBetween(fromIso: string, toIso: string) {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

function dayOfWeek(iso: string) {
  return (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7; // 0 = Monday
}

type Context = {
  customers: readonly Customer[];
  bookings: readonly Booking[];
  today: string; // ISO date
};

export type CustomerSummary = {
  id: string;
  name: string;
  firstName: string;
  phone: string;
  visits: number;
  spend: number;
  lastVisit: string;
  daysSinceLastVisit: number;
  avgDaysBetweenVisits: number | null;
  smsOptIn: boolean;
};

export function summarizeCustomers({ customers, bookings, today }: Context): CustomerSummary[] {
  const byCustomer = new Map<string, Booking[]>();
  for (const b of bookings) {
    if (!b.customerId) continue;
    if (!byCustomer.has(b.customerId)) byCustomer.set(b.customerId, []);
    byCustomer.get(b.customerId)!.push(b);
  }
  return customers.flatMap((c) => {
    const visits = byCustomer.get(c.id);
    if (!visits?.length) return [];
    const dates = visits.map((v) => v.date).sort();
    const first = dates[0];
    const last = dates[dates.length - 1];
    return [
      {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        firstName: c.firstName,
        phone: c.phone,
        visits: visits.length,
        spend: visits.reduce((sum, v) => sum + v.amount, 0),
        lastVisit: last,
        daysSinceLastVisit: daysBetween(last, today),
        avgDaysBetweenVisits: visits.length > 1 ? Math.round(daysBetween(first, last) / (visits.length - 1)) : null,
        smsOptIn: c.smsOptIn,
      },
    ];
  });
}

export type TopStats = {
  activeCustomers: number;
  repeatVisitRate: number; // 0–1
  memberRevenue: number;
  memberRevenueShare: number; // 0–1 of all bay revenue
};

/** Headline numbers for the last `days` days (excluding today). */
export function getTopStats({ bookings, today }: Context, days = 30): TopStats {
  const recent = bookings.filter((b) => {
    const age = daysBetween(b.date, today);
    return age >= 1 && age <= days;
  });
  const visitsPerMember = new Map<string, number>();
  let memberRevenue = 0;
  let totalRevenue = 0;
  for (const b of recent) {
    totalRevenue += b.amount;
    if (!b.customerId) continue;
    memberRevenue += b.amount;
    visitsPerMember.set(b.customerId, (visitsPerMember.get(b.customerId) ?? 0) + 1);
  }
  const active = visitsPerMember.size;
  const repeaters = [...visitsPerMember.values()].filter((n) => n >= 2).length;
  return {
    activeCustomers: active,
    repeatVisitRate: active ? repeaters / active : 0,
    memberRevenue,
    memberRevenueShare: totalRevenue ? memberRevenue / totalRevenue : 0,
  };
}

/** A regular has 6+ visits on record. */
const isRegular = (s: CustomerSummary) => s.visits >= 6;

export function getTopRegulars(summaries: CustomerSummary[], limit = 10) {
  return summaries
    .filter((s) => isRegular(s) && s.daysSinceLastVisit < 21)
    .sort((a, b) => b.visits - a.visits || b.spend - a.spend)
    .slice(0, limit);
}

export function getGoneQuiet(summaries: CustomerSummary[], quietDays = 21) {
  return summaries
    .filter((s) => isRegular(s) && s.daysSinceLastVisit >= quietDays)
    .sort((a, b) => b.spend - a.spend);
}

export type UtilizationGrid = {
  hours: number[]; // e.g. [10, 11, …, 22]
  rows: { day: string; values: number[] }[]; // Monday first, values 0–1
};

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Share of bay-hours booked for each day-of-week × hour over the last `weeks` weeks. */
export function getUtilization(
  { bookings, today }: Context,
  opts: { bays: number; openHour: number; closeHour: number; weeks?: number },
): UtilizationGrid {
  const weeks = opts.weeks ?? 8;
  const hours = Array.from({ length: opts.closeHour - opts.openHour }, (_, i) => opts.openHour + i);
  const booked = DAY_NAMES.map(() => hours.map(() => 0));
  for (const b of bookings) {
    const age = daysBetween(b.date, today);
    if (age < 1 || age > weeks * 7) continue;
    const dow = dayOfWeek(b.date);
    for (let h = b.startHour; h < b.startHour + b.hours; h++) {
      const col = h - opts.openHour;
      if (col >= 0 && col < hours.length) booked[dow][col]++;
    }
  }
  const capacity = opts.bays * weeks;
  return {
    hours,
    rows: DAY_NAMES.map((day, d) => ({ day, values: booked[d].map((n) => Math.min(1, n / capacity)) })),
  };
}

export type SlotBlock = { dayIndex: number; day: string; startHour: number; endHour: number; utilization: number };

/** The emptiest run of `length` consecutive hours on any day. */
export function findEmptiestBlock(grid: UtilizationGrid, length = 3): SlotBlock {
  let best: SlotBlock = { dayIndex: 0, day: grid.rows[0].day, startHour: grid.hours[0], endHour: grid.hours[0] + length, utilization: Infinity };
  for (const [d, row] of grid.rows.entries()) {
    for (let i = 0; i + length <= row.values.length; i++) {
      const avg = row.values.slice(i, i + length).reduce((a, b) => a + b, 0) / length;
      if (avg < best.utilization) {
        best = { dayIndex: d, day: row.day, startHour: grid.hours[i], endHour: grid.hours[i] + length, utilization: avg };
      }
    }
  }
  return best;
}

/** Slots below the threshold, used to highlight the heatmap. */
export function emptySlotKeys(grid: UtilizationGrid, threshold = 0.15) {
  const keys: string[] = [];
  grid.rows.forEach((row, d) =>
    row.values.forEach((v, i) => {
      if (v < threshold) keys.push(`${d}-${grid.hours[i]}`);
    }),
  );
  return keys;
}
