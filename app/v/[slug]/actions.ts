"use server";

import { normalizePhone } from "@/lib/phone";
import type { Progress } from "@/lib/rewards";
import { createAnonClient } from "@/lib/supabase/server";

export type CheckInResult =
  | { status: "new_customer" }
  | { status: "checked_in"; first_name: string; is_new: boolean; reward_unlocked: boolean; progress: Progress }
  | { status: "too_soon"; first_name: string; next_check_in_at: string; progress: Progress }
  | { status: "invalid_phone" | "venue_not_found" | "error" };

/** Customer self check-in. Runs without a login through the database's check_in function. */
export async function checkIn(input: { slug: string; phone: string; name?: string; consent?: boolean }): Promise<CheckInResult> {
  const phone = normalizePhone(input.phone);
  if (!phone) return { status: "invalid_phone" };
  const name = input.name?.trim().slice(0, 60) || null;

  const { data, error } = await createAnonClient().rpc("check_in", {
    p_slug: input.slug,
    p_phone: phone,
    p_name: name,
    p_consent: Boolean(input.consent),
  });
  if (error) {
    console.error("check_in failed", error.message);
    return { status: "error" };
  }
  return data as CheckInResult;
}
