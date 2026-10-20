import "server-only";
import type { CustomerStatsRow, HeatmapRow } from "./insights";
import { createUserClient } from "./supabase/server";

// Dashboard reads. All go through the signed-in user's client, so Row Level Security applies.

/** Every customer of a venue with their totals (paged past Supabase's 1,000-row limit). */
export async function getCustomerStats(venueId: string): Promise<CustomerStatsRow[]> {
  const supabase = await createUserClient();
  const rows: CustomerStatsRow[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from("customer_stats")
      .select("*")
      .eq("venue_id", venueId)
      .order("created_at")
      .range(from, from + page - 1);
    if (error) throw error;
    rows.push(...(data as CustomerStatsRow[]));
    if (!data || data.length < page) return rows;
  }
}

export type Overview = {
  active_customers: number;
  repeat_customers: number;
  visits_this_month: number;
  rewards_this_month: number;
};

export async function getOverview(venueId: string): Promise<Overview> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("venue_overview", { p_venue: venueId });
  if (error) throw error;
  return data as Overview;
}

export async function getHeatmap(venueId: string, days = 56): Promise<HeatmapRow[]> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("visit_heatmap", { p_venue: venueId, p_days: days });
  if (error) throw error;
  return (data ?? []) as HeatmapRow[];
}
