import "server-only";
import type { CustomerStatsRow, HeatmapRow } from "./insights";
import type { CustomerInsight } from "./labels";
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

/** Labels and rhythm for every customer of a venue. */
export async function getCustomerInsights(venueId: string): Promise<CustomerInsight[]> {
  const supabase = await createUserClient();
  const rows: CustomerInsight[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("customer_insights")
      .select("*")
      .eq("venue_id", venueId)
      .order("last_visit_at", { ascending: false, nullsFirst: false })
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...((data ?? []) as CustomerInsight[]));
    if (!data || data.length < 1000) return rows;
  }
}

export type HomeStats = {
  month_customers: number;
  month_returning: number;
  week_visits: number;
  week_new: number;
  week_rewards: number;
  best_day: { date: string; visits: number } | null;
};

export async function getHomeStats(venueId: string): Promise<HomeStats> {
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("venue_home", { p_venue: venueId });
  if (error) throw error;
  return data as HomeStats;
}
