// Assembles everything the owner dashboard needs from raw rows.
// Swap the demo arrays for database queries and the UI keeps working.

import {
  emptySlotKeys,
  findEmptiestBlock,
  getGoneQuiet,
  getTopRegulars,
  getTopStats,
  getUtilization,
  summarizeCustomers,
  type CustomerSummary,
  type SlotBlock,
  type TopStats,
  type UtilizationGrid,
} from "./analytics";
import type { Booking, Campaign, Customer } from "./demo-data";

export type DashboardData = {
  venueName: string;
  stats: TopStats;
  regulars: CustomerSummary[];
  goneQuiet: CustomerSummary[];
  goneQuietMonthlyValue: number;
  grid: UtilizationGrid;
  emptiest: SlotBlock;
  emptyKeys: string[];
  optedInCustomers: number;
  lastCampaign: Campaign | null;
};

type Input = {
  venue: { name: string; bays: number; openHour: number; closeHour: number };
  customers: readonly Customer[];
  bookings: readonly Booking[];
  campaigns: readonly Campaign[];
  today: string;
};

export function buildDashboard({ venue, customers, bookings, campaigns, today }: Input): DashboardData {
  const ctx = { customers, bookings, today };
  const summaries = summarizeCustomers(ctx);
  const goneQuiet = getGoneQuiet(summaries);
  const grid = getUtilization(ctx, venue);

  // What these customers used to spend in a typical month, based on their own history.
  const goneQuietMonthlyValue = goneQuiet.reduce((sum, c) => {
    if (!c.avgDaysBetweenVisits) return sum;
    return sum + (c.spend / c.visits) * (30 / c.avgDaysBetweenVisits);
  }, 0);

  return {
    venueName: venue.name,
    stats: getTopStats(ctx),
    regulars: getTopRegulars(summaries, 10),
    goneQuiet,
    goneQuietMonthlyValue: Math.round(goneQuietMonthlyValue / 10) * 10,
    grid,
    emptiest: findEmptiestBlock(grid),
    emptyKeys: emptySlotKeys(grid),
    optedInCustomers: customers.filter((c) => c.smsOptIn).length,
    lastCampaign: [...campaigns].sort((a, b) => (a.sentOn < b.sentOn ? 1 : -1))[0] ?? null,
  };
}
