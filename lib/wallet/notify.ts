import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushPassUpdates } from "./apns";
import { appleConfig, googleConfig } from "./config";
import { getPassData } from "./data";
import { updateGoogleClass, updateGoogleObject } from "./google";

// Tell wallets that passes changed (stamp, redeem, redesign). The database already bumped
// pass_updated_at; this wakes iPhones (APNs) and patches Google cards so they update in seconds.
// Safe to call before credentials exist (it does nothing). Runs after the response via after().

type Card = { pass_serial: string; wallet_platforms: string[] };

async function pushApple(serials: string[]) {
  const cfg = appleConfig();
  if (!cfg || serials.length === 0) return;
  const admin = createAdminClient();
  const { data: regs } = await admin
    .from("apple_registrations")
    .select("push_token")
    .eq("pass_type_id", cfg.passTypeId)
    .in("serial_number", serials);
  const dead = await pushPassUpdates((regs ?? []).map((r) => r.push_token as string));
  if (dead.length) await admin.from("apple_registrations").delete().in("push_token", dead);
}

async function patchGoogle(cards: Card[]) {
  if (!googleConfig()) return;
  for (const c of cards.filter((c) => c.wallet_platforms.includes("google"))) {
    const data = await getPassData(c.pass_serial);
    if (data) await updateGoogleObject(data);
  }
}

async function refresh(cards: Card[]) {
  await Promise.allSettled([pushApple(cards.map((c) => c.pass_serial)), patchGoogle(cards)]);
}

export async function notifyPassChanged(customerIds: string[], changeMessage?: string) {
  void changeMessage; // Apple shows the field's changeMessage itself; Google updates silently
  try {
    const { data } = await createAdminClient().from("customers").select("pass_serial, wallet_platforms").in("id", customerIds);
    await refresh((data ?? []) as Card[]);
  } catch (e) {
    console.error("notifyPassChanged failed", (e as Error).message);
  }
}

/** A venue's card design or rewards changed: refresh every customer's pass. */
export async function notifyVenuePassesChanged(venueId: string) {
  try {
    const { data } = await createAdminClient().from("customers").select("pass_serial, wallet_platforms").eq("venue_id", venueId);
    const cards = (data ?? []) as Card[];
    const first = cards[0] ? await getPassData(cards[0].pass_serial) : null;
    if (first && googleConfig()) await updateGoogleClass(first);
    await refresh(cards);
  } catch (e) {
    console.error("notifyVenuePassesChanged failed", (e as Error).message);
  }
}
