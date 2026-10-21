import "server-only";
import type { Venue } from "./auth";
import { getCustomerInsights } from "./data";
import type { PlannedCustomer } from "./offer-plan";
import { createAdminClient } from "./supabase/admin";
import { createUserClient } from "./supabase/server";

// Loads what offer planning needs. The rules themselves live in offer-plan.ts.

export { planOffer, type OfferPlan, type PlannedCustomer } from "./offer-plan";

/** Everything needed to plan any audience: labels, wallet status and last offer per customer. */
export async function loadOfferContext(venue: Venue) {
  const supabase = await createUserClient();
  const [insights, { data: cards }, { data: recent }] = await Promise.all([
    getCustomerInsights(venue.id),
    supabase.from("customers").select("id, pass_serial, wallet_platforms").eq("venue_id", venue.id),
    supabase
      .from("offer_recipients")
      .select("customer_id, offer_sends!inner(created_at)")
      .eq("venue_id", venue.id)
      .eq("status", "delivered")
      .gte("offer_sends.created_at", new Date(Date.now() - 60 * 86_400_000).toISOString()),
  ]);

  const serials = (cards ?? []).map((c) => c.pass_serial as string);
  // Device registrations are server-only; only read the ones for this venue's own passes.
  const appleSerials = new Set<string>();
  for (let i = 0; i < serials.length; i += 500) {
    const { data } = await createAdminClient()
      .from("apple_registrations")
      .select("serial_number")
      .in("serial_number", serials.slice(i, i + 500));
    (data ?? []).forEach((r) => appleSerials.add(r.serial_number as string));
  }

  const cardById = new Map((cards ?? []).map((c) => [c.id as string, c]));
  const lastOffer = new Map<string, string>();
  for (const r of (recent ?? []) as unknown as { customer_id: string; offer_sends: { created_at: string } }[]) {
    const at = r.offer_sends.created_at;
    if (!lastOffer.has(r.customer_id) || lastOffer.get(r.customer_id)! < at) lastOffer.set(r.customer_id, at);
  }

  const customers: PlannedCustomer[] = insights.map((c) => {
    const card = cardById.get(c.id);
    const serial = (card?.pass_serial as string) ?? "";
    return {
      id: c.id,
      name: c.name,
      label: c.label,
      serial,
      apple: appleSerials.has(serial),
      google: ((card?.wallet_platforms as string[]) ?? []).includes("google"),
      lastOfferAt: lastOffer.get(c.id) ?? null,
    };
  });
  return { customers };
}

