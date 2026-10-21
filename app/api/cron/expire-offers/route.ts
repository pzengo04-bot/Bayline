import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyPassChanged } from "@/lib/wallet/notify";

// Daily job (vercel.json): take expired offers off customers' cards. Pass data already hides expired
// offers; this wakes the phones so the card updates without waiting for the next stamp.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  const { data: sends } = await admin
    .from("offer_sends")
    .select("id")
    .lte("expires_at", new Date().toISOString())
    .is("expired_cleared_at", null)
    .limit(200);
  let cards = 0;
  for (const s of sends ?? []) {
    const { data: recips } = await admin.from("offer_recipients").select("customer_id").eq("send_id", s.id).eq("status", "delivered");
    const ids = (recips ?? []).map((r) => r.customer_id as string);
    if (ids.length) {
      await admin.from("customers").update({ pass_updated_at: new Date().toISOString() }).in("id", ids);
      await notifyPassChanged(ids);
      cards += ids.length;
    }
    await admin.from("offer_sends").update({ expired_cleared_at: new Date().toISOString() }).eq("id", s.id);
  }
  return NextResponse.json({ expiredSends: sends?.length ?? 0, cards });
}
