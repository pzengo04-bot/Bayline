import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushPassUpdates } from "./apns";
import { appleConfig, googleConfig } from "./config";
import { logWalletEvent } from "./events";
import { sendGoogleMessage } from "./google";

/**
 * Deliver a logged offer to recipients' wallet cards.
 * Apple: mark their passes changed (the pass now carries the offer in "Latest offer") and push.
 * Google: add the message to each loyalty card with a notification.
 * Recipients whose Google card was never actually saved are marked "no card".
 */
export async function deliverOffer(sendId: string) {
  const admin = createAdminClient();
  try {
    const { data: send } = await admin.from("offer_sends").select("id, venue_id, message, venues(name)").eq("id", sendId).single();
    if (!send) return;
    const venueName = (send.venues as unknown as { name: string } | null)?.name ?? "";
    const { data: recips } = await admin
      .from("offer_recipients")
      .select("customer_id, apple, google, customers(pass_serial)")
      .eq("send_id", sendId)
      .eq("status", "delivered");
    const list = ((recips ?? []) as unknown as { customer_id: string; apple: boolean; google: boolean; customers: { pass_serial: string } }[]).map(
      (r) => ({ id: r.customer_id, apple: r.apple, google: r.google, serial: r.customers.pass_serial }),
    );

    // Apple
    const apple = list.filter((r) => r.apple);
    const cfg = appleConfig();
    await logWalletEvent("offer_deliver", { detail: `send=${sendId} apple=${apple.length} google=${list.filter((r) => r.google).length} appleConfigured=${Boolean(cfg)}` });
    if (apple.length && cfg) {
      await admin.from("customers").update({ pass_updated_at: new Date().toISOString() }).in("id", apple.map((r) => r.id));
      const { data: regs } = await admin
        .from("apple_registrations")
        .select("push_token")
        .eq("pass_type_id", cfg.passTypeId)
        .in("serial_number", apple.map((r) => r.serial));
      await logWalletEvent("offer_apple_push", { detail: `tokens=${(regs ?? []).length}` });
      const dead = await pushPassUpdates((regs ?? []).map((r) => r.push_token as string));
      if (dead.length) await admin.from("apple_registrations").delete().in("push_token", dead);
    }

    // Google
    if (googleConfig()) {
      for (const r of list.filter((x) => x.google)) {
        const outcome = await sendGoogleMessage(r.serial, venueName, send.message);
        if (outcome === "notified" || outcome === "silent") {
          await admin.from("offer_recipients").update({ google_notified: outcome === "notified" }).match({ send_id: sendId, customer_id: r.id });
        } else {
          // Never saved (or failed): only Apple can still count it as delivered.
          await admin
            .from("offer_recipients")
            .update(r.apple ? { google: false } : { google: false, status: "no_card" })
            .match({ send_id: sendId, customer_id: r.id });
        }
      }
    }

    const { count } = await admin
      .from("offer_recipients")
      .select("customer_id", { count: "exact", head: true })
      .eq("send_id", sendId)
      .eq("status", "delivered");
    await admin.from("offer_sends").update({ delivered: count ?? 0 }).eq("id", sendId);
  } catch (e) {
    console.error("deliverOffer failed", (e as Error).message);
  }
}
