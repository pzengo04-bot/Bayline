import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Record a wallet event (push sent, pass fetched…). Never throws: logging must not break delivery. */
export async function logWalletEvent(event: string, opts: { serial?: string | null; status?: number; detail?: string } = {}) {
  try {
    await createAdminClient()
      .from("wallet_events")
      .insert({ event, serial: opts.serial ?? null, status: opts.status ?? null, detail: opts.detail?.slice(0, 500) ?? null });
  } catch {}
}
