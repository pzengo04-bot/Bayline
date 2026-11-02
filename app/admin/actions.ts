"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { geocodeAddress } from "@/lib/geocode";
import { addPerson, isEmail } from "@/lib/team";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { parseRewardSettings, slugify, TIMEZONES, VENUE_TYPES } from "@/lib/venues";
import { pushPassUpdates } from "@/lib/wallet/apns";
import { appleConfig } from "@/lib/wallet/config";
import { getPassData } from "@/lib/wallet/data";
import { voidGoogleObject } from "@/lib/wallet/google";

export type FormState = { status: "idle" | "ok" | "error"; message?: string };

export async function createVenue(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);
  const type = String(form.get("type"));
  const timezone = String(form.get("timezone"));
  const ownerEmail = String(form.get("owner_email") ?? "").trim().toLowerCase();
  const phoneRaw = String(form.get("owner_phone") ?? "").trim();
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
  const rewards = parseRewardSettings(form);
  const address = String(form.get("address") ?? "").trim().slice(0, 160) || null;
  const staffEmails = [...new Set(String(form.get("staff_emails") ?? "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];

  if (!name || name.length > 80) return { status: "error", message: "Enter the venue name (80 characters max)." };
  if (!slug) return { status: "error", message: "Enter a web address for the check-in page." };
  if (!VENUE_TYPES.some((t) => t.value === type)) return { status: "error", message: "Pick a venue type." };
  if (!TIMEZONES.some((t) => t.value === timezone)) return { status: "error", message: "Pick a time zone." };
  if (!rewards.ok) return { status: "error", message: rewards.error };
  if (ownerEmail && !isEmail(ownerEmail)) return { status: "error", message: "Owner email doesn't look right." };
  if (phoneRaw && !phone) return { status: "error", message: "Owner phone should be a 10-digit US number." };
  const badStaff = staffEmails.find((e) => !isEmail(e));
  if (badStaff) return { status: "error", message: `Staff email “${badStaff}” doesn't look right.` };
  const ppv = Number(form.get("points_per_visit"));

  const supabase = await createUserClient();
  const { data: venue, error } = await supabase
    .from("venues")
    .insert({
      name,
      slug,
      type,
      timezone,
      phone,
      ...rewards.value,
      points_per_visit: Number.isInteger(ppv) && ppv >= 1 && ppv <= 10000 ? ppv : 10,
      head_start_stamps: rewards.ok && rewards.value.reward_type === "stamps" && form.get("welcome_stamp") === "on" ? 1 : 0,
      address,
      ...(address ? await geocodeAddress(address) : null),
    })
    .select("id")
    .single();
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? `getbayline.app/v/${slug} is taken. Choose another address.` : error.message,
    };
  }

  const notes: string[] = [];
  for (const [email, role] of [...(ownerEmail ? [[ownerEmail, "owner"] as const] : []), ...staffEmails.map((e) => [e, "staff"] as const)]) {
    try {
      notes.push(await addPerson(email, venue.id, role));
    } catch (e) {
      notes.push((e as Error).message);
    }
  }
  revalidatePath("/admin");
  return {
    status: "ok",
    message: `${name} created. NFC link: ${siteUrl()}/t/${slug}. ${notes.join(" ") || "No one invited yet."} Next: Design card and Stand PDF in its setup list.`,
  };
}

export async function invitePerson(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const venueId = String(form.get("venue_id"));
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const role = form.get("role") === "staff" ? "staff" : "owner";
  if (!isEmail(email)) return { status: "error", message: "Enter a valid email." };
  try {
    const note = await addPerson(email, venueId, role);
    revalidatePath("/admin");
    return { status: "ok", message: note };
  } catch (e) {
    return { status: "error", message: (e as Error).message };
  }
}

/**
 * After a pitch: remove real people who joined the demo card. Their passes are voided first (Apple
 * keeps a final voided copy to fetch; Google cards go inactive), then their customer rows go.
 */
export async function clearDemoGuests(venueId: string): Promise<FormState> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: venue } = await admin.from("venues").select("id, is_demo").eq("id", venueId).maybeSingle();
  if (!venue?.is_demo) return { status: "error", message: "Only the demo venue has demo guests." };

  const { data: guests } = await admin
    .from("customers")
    .select("id, pass_serial, apple_auth_token, wallet_platforms")
    .eq("venue_id", venueId)
    .eq("is_seed", false);
  if (!guests?.length) return { status: "ok", message: "No demo guests to clear." };

  for (const g of guests) {
    const data = await getPassData(g.pass_serial as string);
    if (data) {
      await admin.from("voided_passes").upsert({
        serial: g.pass_serial,
        venue_id: venueId,
        apple_auth_token: g.apple_auth_token,
        pass_data: data,
      });
    }
    if (((g.wallet_platforms as string[]) ?? []).includes("google")) await voidGoogleObject(g.pass_serial as string);
  }
  const { error } = await admin.from("customers").delete().in("id", guests.map((g) => g.id));
  if (error) return { status: "error", message: error.message };

  // Wake their iPhones so Wallet fetches the voided pass.
  const cfg = appleConfig();
  if (cfg) {
    const { data: regs } = await admin
      .from("apple_registrations")
      .select("push_token")
      .in("serial_number", guests.map((g) => g.pass_serial as string));
    await pushPassUpdates((regs ?? []).map((r) => r.push_token as string));
  }
  revalidatePath("/admin");
  return { status: "ok", message: `Cleared ${guests.length} demo guest${guests.length === 1 ? "" : "s"}. Their cards are now voided.` };
}
