"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { isOwner, requireVenue } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import type { Progress } from "@/lib/rewards";
import { createUserClient } from "@/lib/supabase/server";
import { notifyPassChanged } from "@/lib/wallet/notify";

// Card actions for the Scan page and the customer profile. Every action re-reads the current venue
// from the session and goes through database functions that check membership and log who did it.

export type CardStatus = {
  id: string;
  name: string;
  phone: string;
  text_consent: boolean;
  created_at: string;
  visits: number;
  last_visit_at: string | null;
  /** Already had today's stamp (the venue's daily limit). */
  stamped_today: boolean;
  progress: Progress;
};

export type CardResult = { ok: true; card: CardStatus; done?: string } | { ok: false; message: string };
export type FindResult = CardResult | { ok: false; message: string; code: "not_found" | "other_venue" | "old_card" };
export type SearchHit = { id: string; name: string; phone: string };

const SCAN_CODE = /^[0-9A-Fa-f]{16}$/;
const OLD_MEMBER_NUMBER = /^\d{8}$/;

/** Wallets update within seconds; the dashboard pages pick the change up on their next render. */
function changed(customerId: string) {
  after(() => notifyPassChanged([customerId]));
  revalidatePath("/dashboard", "layout");
}

function failure(message: string, fallback: string): { ok: false; message: string } {
  if (message.includes("not ready")) return { ok: false, message: "The reward isn't ready yet." };
  if (message.includes("No stamps")) return { ok: false, message: "There are no stamps on this card to remove." };
  return { ok: false, message: fallback };
}

/** The card behind a scanned QR code. */
export async function findCard(scanned: string): Promise<FindResult> {
  const { venue } = await requireVenue();
  if (!venue) return { ok: false, message: "No venue selected." };
  const code = scanned.trim();
  if (OLD_MEMBER_NUMBER.test(code)) {
    return {
      ok: false,
      code: "old_card",
      message: "This card needs an update. Search by name for now; the card refreshes itself shortly.",
    };
  }
  if (!SCAN_CODE.test(code)) return { ok: false, code: "not_found", message: "That isn't a Bayline card. Try again, or search by name." };
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("find_card", { p_venue: venue.id, p_code: code });
  if (error) return { ok: false, message: "Couldn't look that up. Try again." };
  const r = data as { status: "found" | "not_found" | "other_venue"; card?: CardStatus };
  if (r.status === "found" && r.card) return { ok: true, card: r.card };
  return r.status === "other_venue"
    ? { ok: false, code: "other_venue", message: `This card is for a different business, not ${venue.name}.` }
    : { ok: false, code: "not_found", message: "We couldn't find that card. Try again, or search by name." };
}

export async function getCard(customerId: string): Promise<CardResult> {
  const { venue } = await requireVenue();
  if (!venue) return { ok: false, message: "No venue selected." };
  const { data, error } = await (await createUserClient()).rpc("card_status", { p_customer: customerId });
  if (error || !data) return { ok: false, message: "Couldn't load that card." };
  return { ok: true, card: data as CardStatus };
}

/** Name or phone, for when a card won't scan. */
export async function searchCustomers(query: string): Promise<SearchHit[]> {
  const { venue } = await requireVenue();
  const q = query.trim();
  if (!venue || q.length < 2) return [];
  const digits = q.replace(/\D/g, "");
  // Strip characters that mean something in PostgREST filters.
  const words = q.replace(/[,()*%\\.:]/g, " ").trim();
  const filters = [
    ...(words ? [`name.ilike.%${words}%`] : []),
    ...(digits.length >= 3 ? [`phone.like.%${digits.slice(-10)}%`] : []),
  ];
  if (!filters.length) return [];
  const { data } = await (await createUserClient())
    .from("customers")
    .select("id, name, phone")
    .eq("venue_id", venue.id)
    .or(filters.join(","))
    .order("name")
    .limit(12);
  return (data ?? []) as SearchHit[];
}

export async function addStamp(customerId: string, amount?: string): Promise<CardResult> {
  const { venue } = await requireVenue();
  if (!venue) return { ok: false, message: "No venue selected." };
  let value: number | null = null;
  if (amount?.trim()) {
    value = Number(amount.replace(/[$,\s]/g, ""));
    if (!(Number.isFinite(value) && value >= 0 && value < 100000)) return { ok: false, message: "Enter the amount in dollars, like 45 or 62.50." };
    value = Math.round(value * 100) / 100;
  }
  const { data, error } = await (await createUserClient()).rpc("stamp_customer", { p_customer: customerId, p_amount: value });
  if (error) return failure(error.message, "Couldn't add the stamp. Try again.");
  const r = data as { result: "stamped" | "limit_reached" | "reward_ready"; card: CardStatus };
  if (r.result === "limit_reached") return { ok: false, message: "Already stamped today. One stamp per day." };
  if (r.result === "reward_ready") return { ok: false, message: "The card is full. Redeem the reward instead." };
  changed(customerId);
  const p = r.card.progress;
  return { ok: true, card: r.card, done: p.reward_type === "stamps" ? `Stamp added: ${p.stamps} of ${p.stamps_needed}` : `Visit added: ${p.points} points` };
}

export async function redeem(customerId: string, kind: "main" | "milestone" = "main"): Promise<CardResult> {
  const { venue } = await requireVenue();
  if (!venue) return { ok: false, message: "No venue selected." };
  const supabase = await createUserClient();
  const { error } = await supabase.rpc("redeem_reward", { p_customer: customerId, p_kind: kind === "milestone" ? "milestone" : "main" });
  if (error) return failure(error.message, "Couldn't redeem. Try again.");
  changed(customerId);
  const got = await getCard(customerId);
  if (!got.ok) return got;
  const p = got.card.progress;
  const done =
    kind === "milestone"
      ? `Redeemed ✓ ${p.milestone?.text ?? "Milestone reward"}`
      : p.reward_type === "stamps"
        ? `Redeemed ✓ Card reset to 0 of ${p.stamps_needed}`
        : `Redeemed ✓ ${p.points} points left`;
  return { ok: true, card: got.card, done };
}

export async function removeStamp(customerId: string): Promise<CardResult> {
  const { venue } = await requireVenue();
  if (!venue) return { ok: false, message: "No venue selected." };
  if (!isOwner(venue)) return { ok: false, message: "Only owners can change stamps by hand." };
  const { data, error } = await (await createUserClient()).rpc("remove_stamp", { p_customer: customerId });
  if (error) return failure(error.message, "Couldn't remove the stamp. Try again.");
  changed(customerId);
  const card = data as CardStatus;
  return { ok: true, card, done: `Stamp removed: ${card.progress.stamps} of ${card.progress.stamps_needed}` };
}

export async function resetCard(customerId: string): Promise<CardResult> {
  const { venue } = await requireVenue();
  if (!venue) return { ok: false, message: "No venue selected." };
  if (!isOwner(venue)) return { ok: false, message: "Only owners can change stamps by hand." };
  const { data, error } = await (await createUserClient()).rpc("reset_card", { p_customer: customerId });
  if (error) return failure(error.message, "Couldn't reset the card. Try again.");
  changed(customerId);
  const card = data as CardStatus;
  return { ok: true, card, done: `Card reset to 0 of ${card.progress.stamps_needed}` };
}

/** A customer without a card yet: create them by phone and give today's stamp. */
export async function addNewCustomer(phoneInput: string, name: string, amount?: string): Promise<CardResult> {
  const { venue } = await requireVenue();
  if (!venue) return { ok: false, message: "No venue selected." };
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, message: "Enter a 10-digit US phone number." };
  if (!name.trim()) return { ok: false, message: "Add the customer's first name." };
  const value = amount?.trim() ? Number(amount.replace(/[$,\s]/g, "")) : null;
  if (value !== null && !(Number.isFinite(value) && value >= 0 && value < 100000)) return { ok: false, message: "Enter the amount in dollars, like 45 or 62.50." };
  const { data, error } = await (await createUserClient()).rpc("add_visit", {
    p_venue: venue.id,
    p_phone: phone,
    p_amount: value === null ? null : Math.round(value * 100) / 100,
    p_name: name.trim(),
  });
  if (error) return { ok: false, message: "Couldn't add them. Try again." };
  const r = data as { customer_id: string; result: string };
  changed(r.customer_id);
  const got = await getCard(r.customer_id);
  if (!got.ok) return got;
  return { ok: true, card: got.card, done: r.result === "stamped" ? `Added ${got.card.name} with their first stamp` : `Found ${got.card.name}` };
}
