import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushPassUpdates } from "./apns";
import { appleConfig } from "./config";

// Tell wallets that passes changed (stamp, redeem, redesign). The database already bumped
// pass_updated_at; this wakes the devices so they fetch the new version within seconds.
// Safe to call before credentials exist (it does nothing).

async function pushToSerials(serials: string[]) {
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

export async function notifyPassChanged(customerIds: string[], changeMessage?: string) {
  void changeMessage; // Apple shows the field's changeMessage; Google uses it in step 5
  try {
    const { data } = await createAdminClient().from("customers").select("pass_serial").in("id", customerIds);
    await pushToSerials((data ?? []).map((c) => c.pass_serial as string));
  } catch (e) {
    console.error("notifyPassChanged failed", (e as Error).message);
  }
}

/** A venue's card design or rewards changed: refresh every customer's pass. */
export async function notifyVenuePassesChanged(venueId: string) {
  try {
    const { data } = await createAdminClient().from("customers").select("pass_serial").eq("venue_id", venueId);
    await pushToSerials((data ?? []).map((c) => c.pass_serial as string));
  } catch (e) {
    console.error("notifyVenuePassesChanged failed", (e as Error).message);
  }
}
