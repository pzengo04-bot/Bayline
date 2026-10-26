import { after, NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Stand link written to NFC tags and printed as the insert's QR code. Forwarding through here lets
// us change what a tap does without reprogramming tags, and tells taps (nfc) from scans (qr) apart.
// "site" and "demo" come from getbayline.app (the homepage and the /demo page's QR and button).
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const param = request.nextUrl.searchParams.get("src");
  const src = param === "qr" || param === "site" || param === "demo" ? param : "nfc";
  if (src === "demo") {
    after(async () => {
      await createAdminClient().from("site_events").insert({ event: "demo_link_open", path: `/t/${slug}` });
    });
  }
  return NextResponse.redirect(new URL(`/v/${encodeURIComponent(slug)}?src=${src}`, request.url), 307);
}
