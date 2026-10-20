"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAccess, requireVenue, VENUE_COOKIE } from "@/lib/auth";
import { createUserClient } from "@/lib/supabase/server";

/** Switch which venue the dashboard shows. */
export async function selectVenue(form: FormData) {
  const access = await requireAccess();
  const id = String(form.get("venueId") ?? "");
  if (access.venues.some((v) => v.id === id)) {
    (await cookies()).set(VENUE_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  redirect(String(form.get("next") ?? "/dashboard"));
}

/** Record that a customer replied STOP (or asked not to be texted). Consent can't be turned back on here. */
export async function markOptedOut(customerId: string): Promise<{ ok: boolean }> {
  const { venue } = await requireVenue();
  if (!venue) return { ok: false };
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from("customers")
    .update({ text_consent: false })
    .eq("id", customerId)
    .eq("venue_id", venue.id)
    .select("id");
  return { ok: !error && Boolean(data?.length) };
}
