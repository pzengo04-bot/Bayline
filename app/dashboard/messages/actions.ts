"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireVenue } from "@/lib/auth";
import { endOfDayInZone, ymdInZone } from "@/lib/format";
import { loadOfferContext, planOffer } from "@/lib/offers";
import { OFFER_MAX, type OfferAudience } from "@/lib/offer-templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";
import { deliverOffer } from "@/lib/wallet/offer-delivery";

export type SendResult =
  | { ok: true; delivered: number; matched: number; noCard: number; cooldown: number }
  | { ok: false; message: string };

const AUDIENCES: OfferAudience[] = ["slipping", "regulars", "everyone", "demo_guests"];

export async function sendOffer(input: { audience: string; message: string; endsOn?: string }): Promise<SendResult> {
  const { access, venue } = await requireVenue();
  if (!venue || venue.role === "staff") return { ok: false, message: "Only the venue owner can send offers." };
  const audience = input.audience as OfferAudience;
  if (!AUDIENCES.includes(audience) || (audience === "demo_guests" && !venue.is_demo)) {
    return { ok: false, message: "Pick an audience." };
  }
  let message = input.message.replace(/\s+/g, " ").trim();
  if (!message) return { ok: false, message: "Write a message first." };
  if (message.length > OFFER_MAX) return { ok: false, message: `Keep it to ${OFFER_MAX} characters.` };

  // Offers expire at the end of the chosen day, venue time (default 7 days, at most 90).
  const today = ymdInZone(venue.timezone);
  const endsOn = /^\d{4}-\d{2}-\d{2}$/.test(input.endsOn ?? "") ? input.endsOn! : ymdInZone(venue.timezone, 7);
  if (endsOn < today || endsOn > ymdInZone(venue.timezone, 89)) return { ok: false, message: "Pick an end date within the next 90 days." };
  const expiresAt = endOfDayInZone(endsOn, venue.timezone);

  // Recompute recipients now; never trust a list from the browser.
  const { customers } = await loadOfferContext(venue);
  const plan = planOffer(venue, customers, audience);
  if (plan.deliver.length === 0) {
    return { ok: false, message: plan.matched ? "Nobody in this audience can get an offer right now." : "Nobody in this audience yet." };
  }

  // iPhone only notifies when the offer text changes, so repeat texts get a short date.
  const supabase = await createUserClient();
  const { data: previous } = await supabase
    .from("offer_sends")
    .select("message")
    .eq("venue_id", venue.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (previous?.message === message) {
    const stamp = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: venue.timezone }).format(new Date());
    message = `${message.slice(0, OFFER_MAX - stamp.length - 3)} · ${stamp}`;
  }

  const { data: send, error } = await supabase
    .from("offer_sends")
    .insert({
      venue_id: venue.id,
      audience,
      message,
      recipients: plan.matched,
      delivered: plan.deliver.length,
      created_by: access.user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (error || !send) return { ok: false, message: error?.message ?? "Couldn't send. Try again." };

  const rows = [
    ...plan.deliver.map((c) => ({ send_id: send.id, customer_id: c.id, venue_id: venue.id, status: "delivered", apple: c.apple, google: c.google })),
    // Every row lists every column: a bulk insert fills missing ones with null, not their defaults.
    ...plan.cooldown.map((c) => ({ send_id: send.id, customer_id: c.id, venue_id: venue.id, status: "cooldown", apple: false, google: false })),
    ...plan.noCard.map((c) => ({ send_id: send.id, customer_id: c.id, venue_id: venue.id, status: "no_card", apple: false, google: false })),
  ];
  for (let i = 0; i < rows.length; i += 500) {
    const { error: e } = await supabase.from("offer_recipients").insert(rows.slice(i, i + 500));
    if (e) {
      // Don't leave a half-logged send behind.
      await createAdminClient().from("offer_sends").delete().eq("id", send.id);
      return { ok: false, message: "Couldn't send. Try again." };
    }
  }

  after(() => deliverOffer(send.id));
  revalidatePath("/dashboard/messages");
  return { ok: true, delivered: plan.deliver.length, matched: plan.matched, noCard: plan.noCard.length, cooldown: plan.cooldown.length };
}
