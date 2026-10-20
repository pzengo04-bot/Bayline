// Turns database rows (customer_stats, visit_heatmap) into what the dashboard components expect.
// Pure functions, no database access.

import { DAY_NAMES, type CustomerSummary, type UtilizationGrid } from "./analytics";
import { calendarDaysSince, daysSince } from "./format";
import type { Progress, RewardSettings } from "./rewards";

export type CustomerStatsRow = {
  id: string;
  venue_id: string;
  name: string;
  phone: string;
  text_consent: boolean;
  consent_timestamp: string | null;
  created_at: string;
  visits: number;
  spend: number;
  visits_with_amount: number;
  first_visit_at: string | null;
  last_visit_at: string | null;
  visits_60d: number;
  stamps: number;
  points: number;
  rewards: number;
};

export type HeatmapRow = { dow: number; hour: number; visits: number };

export const QUIET_DAYS = 21;
export const MIN_VISITS_FOR_REGULAR = 3;

export function toSummary(r: CustomerStatsRow, timeZone: string, now = Date.now()): CustomerSummary {
  const span = r.first_visit_at && r.last_visit_at ? daysSince(r.first_visit_at, Date.parse(r.last_visit_at)) : 0;
  return {
    id: r.id,
    name: r.name,
    firstName: r.name.split(" ")[0],
    phone: r.phone,
    visits: r.visits,
    spend: r.spend,
    lastVisit: r.last_visit_at ?? r.created_at,
    daysSinceLastVisit: calendarDaysSince(r.last_visit_at ?? r.created_at, timeZone, now),
    avgDaysBetweenVisits: r.visits > 1 ? Math.max(1, Math.round(span / (r.visits - 1))) : null,
    smsOptIn: r.text_consent,
  };
}

/** Top customers by visits, then spend. */
export function topRegulars(rows: CustomerStatsRow[], timeZone: string, limit = 10) {
  return rows
    .filter((r) => r.visits >= 2)
    .sort((a, b) => b.visits - a.visits || b.spend - a.spend)
    .slice(0, limit)
    .map((r) => toSummary(r, timeZone));
}

/** Customers with 3+ visits who haven't been back in 21+ days, most valuable first. */
export function goneQuiet(rows: CustomerStatsRow[], timeZone: string) {
  return rows
    .map((r) => ({ r, s: toSummary(r, timeZone) }))
    .filter(({ r, s }) => r.visits >= MIN_VISITS_FOR_REGULAR && r.last_visit_at && s.daysSinceLastVisit >= QUIET_DAYS)
    .sort((a, b) => b.r.visits - a.r.visits || b.r.spend - a.r.spend)
    .map(({ s }) => s);
}

/** Customers with 3+ visits who've been in within the last 21 days. */
export function activeRegulars(rows: CustomerStatsRow[], timeZone: string) {
  return rows.filter(
    (r) => r.visits >= MIN_VISITS_FOR_REGULAR && r.last_visit_at && calendarDaysSince(r.last_visit_at, timeZone) < QUIET_DAYS,
  );
}

export const hasSpend = (rows: CustomerStatsRow[]) => rows.some((r) => r.visits_with_amount > 0);

export function progressFor(r: Pick<CustomerStatsRow, "stamps" | "points">, venue: RewardSettings): Progress {
  return {
    reward_type: venue.reward_type,
    reward_text: venue.reward_text,
    stamps: r.stamps,
    stamps_needed: venue.stamps_needed,
    points: r.points,
    points_needed: venue.points_needed,
  };
}

export type VisitHeatmap = {
  grid: UtilizationGrid; // values scaled 0–1 against the busiest hour
  counts: number[][];
  emptyKeys: string[];
  block: { dayIndex: number; day: string; startHour: number; endHour: number } | null;
  total: number;
};

/**
 * Check-in counts by day and hour. The hour range follows when the venue actually sees visits
 * (at least 10am–10pm); the quiet stretch is the 3-hour run with the fewest check-ins.
 */
export function buildVisitHeatmap(rows: HeatmapRow[]): VisitHeatmap {
  const busyHours = rows.filter((r) => r.visits > 0).map((r) => r.hour);
  const first = Math.min(10, ...busyHours);
  const last = Math.max(22, ...busyHours);
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  const counts = DAY_NAMES.map(() => hours.map(() => 0));
  for (const r of rows) {
    const col = r.hour - first;
    if (r.dow >= 0 && r.dow < 7 && col >= 0 && col < hours.length) counts[r.dow][col] += r.visits;
  }
  const max = Math.max(1, ...counts.flat());
  const total = counts.flat().reduce((a, b) => a + b, 0);
  const grid: UtilizationGrid = {
    hours,
    rows: DAY_NAMES.map((day, d) => ({ day, values: counts[d].map((n) => n / max) })),
  };

  let block: VisitHeatmap["block"] = null;
  const emptyKeys: string[] = [];
  if (total >= 20) {
    let best = Infinity;
    counts.forEach((row, d) => {
      for (let i = 0; i + 3 <= row.length; i++) {
        const sum = row[i] + row[i + 1] + row[i + 2];
        if (sum < best) {
          best = sum;
          block = { dayIndex: d, day: DAY_NAMES[d], startHour: hours[i], endHour: hours[i] + 3 };
        }
      }
    });
  }
  return { grid, counts, emptyKeys, block, total };
}
