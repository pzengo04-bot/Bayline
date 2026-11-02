import { NextResponse } from "next/server";
import { byLine, historyLine } from "@/components/dash/ProfileView";
import { CARD_EVENT_COLUMNS, type CardEvent } from "@/lib/activity";
import { getCurrentVenue, isOwner } from "@/lib/auth";
import { createUserClient } from "@/lib/supabase/server";

const cell = (v: string) => `"${(/^[=+\-@\t\r]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;

/** One customer's visit history as CSV (owners only). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { venue } = await getCurrentVenue();
  if (!venue || !isOwner(venue)) return new NextResponse("Only owners can export", { status: 403 });
  const { id } = await params;
  const supabase = await createUserClient();
  const [{ data: customer }, { data: events }] = await Promise.all([
    supabase.from("customers").select("name").eq("id", id).eq("venue_id", venue.id).maybeSingle(),
    supabase.from("card_events").select(CARD_EVENT_COLUMNS).eq("customer_id", id).eq("venue_id", venue.id).order("created_at", { ascending: false }),
  ]);
  if (!customer) return new NextResponse("Not found", { status: 404 });
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { ...o, timeZone: venue.timezone }).format(new Date(iso));
  const rows = ((events ?? []) as unknown as CardEvent[])
    .filter((e) => ["stamp", "visit", "redeem", "milestone", "stamp_removed", "card_reset"].includes(e.kind))
    .map((e) => [fmt(e.created_at, { year: "numeric", month: "2-digit", day: "2-digit" }), fmt(e.created_at, { hour: "2-digit", minute: "2-digit" }), historyLine(e).text, byLine(e)]);
  const csv = [["Date", "Time", "What happened", "By"], ...rows].map((r) => r.map(cell).join(",")).join("\n");
  const file = String(customer.name).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${file}-visits.csv"`, "Cache-Control": "private, no-store" },
  });
}
