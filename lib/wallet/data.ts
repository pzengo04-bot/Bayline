import "server-only";
import { cookies } from "next/headers";
import { isToken, returnCookieName } from "@/lib/customer-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PassData } from "./pass-model";

// Server-side wallet reads and writes. These use the secret key because they run for customers
// (no login) and for Apple's servers; every caller authenticates by cookie or pass token first.

export async function getPassData(serial: string): Promise<PassData | null> {
  const { data, error } = await createAdminClient().rpc("wallet_pass_data", { p_serial: serial });
  if (error) throw error;
  return (data as PassData | null) ?? null;
}

/** The pass serial for the customer whose return cookie is on this phone, for a venue slug. */
export async function serialFromCookie(slug: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: venue } = await admin.from("venues").select("id").eq("slug", slug).maybeSingle();
  if (!venue) return null;
  const token = (await cookies()).get(returnCookieName(venue.id))?.value;
  if (!isToken(token)) return null;
  const { data } = await admin
    .from("customers")
    .select("pass_serial")
    .eq("venue_id", venue.id)
    .eq("return_token", token)
    .maybeSingle();
  return (data?.pass_serial as string | undefined) ?? null;
}

export async function markWalletPlatform(serial: string, platform: "apple" | "google") {
  const admin = createAdminClient();
  const { data } = await admin.from("customers").select("wallet_platforms").eq("pass_serial", serial).maybeSingle();
  const current = (data?.wallet_platforms as string[] | undefined) ?? [];
  if (!current.includes(platform)) {
    await admin.from("customers").update({ wallet_platforms: [...current, platform] }).eq("pass_serial", serial);
  }
}

/** A cleared demo guest's final (voided) pass, kept so their iPhone can fetch it once more. */
export async function getVoidedPass(serial: string): Promise<(PassData & { voided: true }) | null> {
  const { data } = await createAdminClient().from("voided_passes").select("pass_data, voided_at").eq("serial", serial).maybeSingle();
  if (!data) return null;
  return { ...(data.pass_data as PassData), updated_at: data.voided_at as string, voided: true };
}
