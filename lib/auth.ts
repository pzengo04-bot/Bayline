import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { RewardSettings } from "@/lib/rewards";
import { createUserClient } from "@/lib/supabase/server";

// Data access layer: every signed-in page and action resolves the user and their venues through here.

export type VenueType = "golf_sim" | "pickleball" | "batting_cages" | "other";

export type Venue = RewardSettings & {
  id: string;
  name: string;
  slug: string;
  type: VenueType;
  timezone: string;
  created_at: string;
  phone: string | null;
  logo_url: string | null;
  card_bg: string;
  card_fg: string;
  card_accent: string;
  points_per_visit: number;
  stamps_per_day: number | null;
  pass_message: string | null;
};

export type Access = {
  user: { id: string; email: string };
  isAdmin: boolean;
  venues: (Venue & { role: "owner" | "staff" | "admin" })[];
};

export const VENUE_COOKIE = "bayline_venue";

/** The signed-in user, their admin flag and the venues they can open. Cached per request. */
export const getAccess = cache(async (): Promise<Access | null> => {
  await connection(); // signed-in pages are per request and work with "now" (days since last visit, this month)
  const supabase = await createUserClient();
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims?.sub;
  if (!sub) return null;

  const [{ data: adminRow }, { data: memberships }, { data: venues }] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id", sub).maybeSingle(),
    supabase.from("venue_members").select("venue_id, role").eq("user_id", sub),
    supabase.from("venues").select("*").order("name"), // RLS: own venues, or all for admins
  ]);
  const roles = new Map((memberships ?? []).map((m) => [m.venue_id as string, m.role as "owner" | "staff"]));
  return {
    user: { id: sub, email: String(claims.claims.email ?? "") },
    isAdmin: Boolean(adminRow),
    venues: ((venues ?? []) as Venue[]).map((v) => ({ ...v, role: roles.get(v.id) ?? "admin" })),
  };
});

export async function requireAccess() {
  const access = await getAccess();
  if (!access) redirect("/login");
  return access;
}

export async function requireAdmin() {
  const access = await requireAccess();
  if (!access.isAdmin) redirect("/dashboard");
  return access;
}

/** The venue the dashboard is showing: the one picked in the switcher, else the first. */
export const getCurrentVenue = cache(async () => {
  const access = await requireAccess();
  const picked = (await cookies()).get(VENUE_COOKIE)?.value;
  const venue = access.venues.find((v) => v.id === picked) ?? access.venues[0] ?? null;
  return { access, venue };
});

/** For pages that need a venue: sends admins without one to /admin. */
export async function requireVenue() {
  const { access, venue } = await getCurrentVenue();
  if (!venue && access.isAdmin) redirect("/admin");
  return { access, venue };
}
