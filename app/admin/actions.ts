"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";
import { normalizePhone } from "@/lib/phone";
import { parseRewardSettings, slugify, TIMEZONES, VENUE_TYPES } from "@/lib/venues";
import { pushPassUpdates } from "@/lib/wallet/apns";
import { appleConfig } from "@/lib/wallet/config";
import { getPassData } from "@/lib/wallet/data";
import { voidGoogleObject } from "@/lib/wallet/google";

export type FormState = { status: "idle" | "ok" | "error"; message?: string };

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Adds someone to a venue. New emails get an invite; existing logins get a login link. */
async function addPerson(email: string, venueId: string, role: "owner" | "staff") {
  const admin = createAdminClient();
  const redirectTo = `${siteUrl()}/auth/confirm`;

  let userId: string | undefined;
  for (let page = 1; !userId; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    userId = data.users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }

  let emailNote: string;
  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (error) throw new Error(`Couldn't send the invite: ${error.message}`);
    userId = data.user.id;
    emailNote = `Invite sent to ${email}.`;
  } else {
    const { error } = await admin.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: redirectTo } });
    emailNote = error ? `${email} already has a login; they can sign in at /login.` : `Login link sent to ${email}.`;
  }

  const supabase = await createUserClient(); // admin RLS policy allows adding members
  const { error } = await supabase
    .from("venue_members")
    .upsert({ user_id: userId, venue_id: venueId, role }, { onConflict: "user_id,venue_id" });
  if (error) throw new Error(`Couldn't add ${email} to the venue: ${error.message}`);
  return emailNote;
}

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

  if (!name || name.length > 80) return { status: "error", message: "Enter the venue name (80 characters max)." };
  if (!slug) return { status: "error", message: "Enter a web address for the check-in page." };
  if (!VENUE_TYPES.some((t) => t.value === type)) return { status: "error", message: "Pick a venue type." };
  if (!TIMEZONES.some((t) => t.value === timezone)) return { status: "error", message: "Pick a time zone." };
  if (!rewards.ok) return { status: "error", message: rewards.error };
  if (ownerEmail && !isEmail(ownerEmail)) return { status: "error", message: "Owner email doesn't look right." };
  if (phoneRaw && !phone) return { status: "error", message: "Owner phone should be a 10-digit US number." };
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
    })
    .select("id")
    .single();
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? `getbayline.app/v/${slug} is taken. Choose another address.` : error.message,
    };
  }

  let note = "No owner invited yet.";
  if (ownerEmail) {
    try {
      note = await addPerson(ownerEmail, venue.id, "owner");
    } catch (e) {
      note = (e as Error).message;
    }
  }
  revalidatePath("/admin");
  return { status: "ok", message: `${name} created at /v/${slug}. ${note}` };
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
