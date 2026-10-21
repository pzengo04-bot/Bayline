"use server";

import { after } from "next/server";
import { requireVenue } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import type { Progress } from "@/lib/rewards";
import { createUserClient } from "@/lib/supabase/server";
import { notifyPassChanged } from "@/lib/wallet/notify";

export type FoundCustomer = {
  id: string;
  name: string;
  phone: string;
  text_consent: boolean;
  visits: number;
  last_visit_at: string | null;
  progress: Progress;
};

export type LookupResult =
  | { status: "found"; customer: FoundCustomer }
  | { status: "new"; phone: string }
  | { status: "error"; message: string };

export type SaveVisitResult =
  | { status: "saved"; name: string; progress: Progress; customerId: string }
  | { status: "error"; message: string };

// Every action re-reads the current venue from the session; the browser never chooses it.

export async function lookupCustomer(phoneInput: string): Promise<LookupResult> {
  const { venue } = await requireVenue();
  if (!venue) return { status: "error", message: "No venue selected." };
  const phone = normalizePhone(phoneInput);
  if (!phone) return { status: "error", message: "Enter a 10-digit US phone number." };

  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("lookup_customer", { p_venue: venue.id, p_phone: phone });
  if (error) return { status: "error", message: "Couldn't look that up. Try again." };
  return data ? { status: "found", customer: data as FoundCustomer } : { status: "new", phone };
}

export async function saveVisit(input: { phone: string; amount: string; name?: string }): Promise<SaveVisitResult> {
  const { venue } = await requireVenue();
  if (!venue) return { status: "error", message: "No venue selected." };
  const phone = normalizePhone(input.phone);
  if (!phone) return { status: "error", message: "Enter a 10-digit US phone number." };

  const raw = input.amount.replace(/[$,\s]/g, "");
  const amount = raw === "" ? null : Number(raw);
  if (amount !== null && !(Number.isFinite(amount) && amount >= 0 && amount < 100000)) {
    return { status: "error", message: "Enter the amount in dollars, like 45 or 62.50." };
  }
  if (venue.reward_type === "points" && amount === null) {
    return { status: "error", message: "Enter the amount spent so points can be added." };
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("add_visit", {
    p_venue: venue.id,
    p_phone: phone,
    p_amount: amount === null ? null : Math.round(amount * 100) / 100,
    p_name: input.name?.trim() || null,
  });
  if (error) {
    return { status: "error", message: error.message.includes("needs a name") ? "Add the customer's first name." : "Couldn't save. Try again." };
  }
  const r = data as { customer_id: string; name: string; progress: Progress };
  after(() => notifyPassChanged([r.customer_id], r.progress.reward_type === "stamps" ? "Stamp added" : "Points added"));
  return { status: "saved", name: r.name, progress: r.progress, customerId: r.customer_id };
}

export async function redeemReward(
  customerId: string,
  kind: "main" | "milestone" = "main",
): Promise<{ ok: boolean; progress?: Progress; message?: string }> {
  const { venue } = await requireVenue();
  if (!venue) return { ok: false, message: "No venue selected." };
  const supabase = await createUserClient();
  const { data, error } = await supabase.rpc("redeem_reward", { p_customer: customerId, p_kind: kind === "milestone" ? "milestone" : "main" });
  if (error) return { ok: false, message: error.message.includes("not ready") ? "The reward isn't ready yet." : "Couldn't redeem. Try again." };
  after(() => notifyPassChanged([customerId], "Reward redeemed"));
  return { ok: true, progress: data as Progress };
}
