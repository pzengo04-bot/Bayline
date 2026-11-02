import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CARD_EVENT_COLUMNS, type CardEvent } from "./activity";
import type { Venue } from "./auth";
import type { HeatmapRow } from "./insights";
import type { CustomerInsight } from "./labels";

// Everything the owner Home shows for one range (7, 30 or 90 days). Takes the Supabase client so the
// page uses the signed-in user's (RLS applies).

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const parseRange = (v: unknown): Range => (RANGES.includes(Number(v) as Range) ? (Number(v) as Range) : 30);

export type DashNumbers = {
  days: number;
  visits: number;
  prev_visits: number;
  active: number;
  prev_active: number;
  new: number;
  prev_new: number;
  slipping: number;
  prev_slipping: number;
  regulars: number;
  redeemed: number;
  ready: number;
  series: { d: string; n: number }[];
};

export type FeedItem =
  | { type: "event"; at: string; event: CardEvent }
  | { type: "offer"; at: string; id: string; message: string; delivered: number; audience: string };

export type HomeData = {
  numbers: DashNumbers;
  heatmap: HeatmapRow[];
  slipping: CustomerInsight[];
  feed: FeedItem[];
  hasCustomers: boolean;
};

export async function loadHome(client: SupabaseClient, venue: Venue, days: Range): Promise<HomeData> {
  const [{ data: numbers, error }, { data: heat }, { data: slipping }, { count }, { data: events }, { data: offers }] = await Promise.all([
    client.rpc("venue_dashboard", { p_venue: venue.id, p_days: days }),
    client.rpc("visit_heatmap", { p_venue: venue.id, p_days: days }),
    client
      .from("customer_insights")
      .select("*")
      .eq("venue_id", venue.id)
      .eq("label", "slipping")
      .order("visits_180", { ascending: false })
      .order("days_since", { ascending: true })
      .limit(200),
    client.from("customers").select("id", { count: "exact", head: true }).eq("venue_id", venue.id),
    client.from("card_events").select(CARD_EVENT_COLUMNS).eq("venue_id", venue.id).order("created_at", { ascending: false }).limit(12),
    client.from("offer_sends").select("id, message, delivered, audience, created_at").eq("venue_id", venue.id).order("created_at", { ascending: false }).limit(5),
  ]);
  if (error) throw error;

  const feed: FeedItem[] = [
    ...((events ?? []) as unknown as CardEvent[]).map((e) => ({ type: "event" as const, at: e.created_at, event: e })),
    ...(offers ?? []).map((o) => ({
      type: "offer" as const,
      at: o.created_at as string,
      id: o.id as string,
      message: o.message as string,
      delivered: o.delivered as number,
      audience: o.audience as string,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  return {
    numbers: numbers as DashNumbers,
    heatmap: (heat ?? []) as HeatmapRow[],
    slipping: (slipping ?? []) as CustomerInsight[],
    feed,
    hasCustomers: (count ?? 0) > 0,
  };
}

/** "↑ 8%" style change. null when there's nothing to compare against. */
export function percentChange(now: number, before: number) {
  if (before === 0) return now === 0 ? 0 : null;
  return Math.round(((now - before) / before) * 100);
}

/** Opening hours to show on the heatmap: the venue's own, else the hours that ever get visits. */
export function heatmapHours(venue: Pick<Venue, "open_hour" | "close_hour">, rows: HeatmapRow[]) {
  if (venue.open_hour != null && venue.close_hour != null) {
    return Array.from({ length: venue.close_hour - venue.open_hour }, (_, i) => venue.open_hour! + i);
  }
  const busy = rows.filter((r) => r.visits > 0).map((r) => r.hour);
  const lo = busy.length ? Math.min(...busy) : 10;
  const hi = busy.length ? Math.max(...busy) + 1 : 22;
  return Array.from({ length: hi - lo }, (_, i) => lo + i);
}
