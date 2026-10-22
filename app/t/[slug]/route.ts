import { NextResponse, type NextRequest } from "next/server";

// Stand link written to NFC tags and printed as the insert's QR code. Forwarding through here lets
// us change what a tap does without reprogramming tags, and tells taps (nfc) from scans (qr) apart.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // "site": the Try it button and QR on getbayline.app (counted as demo joins from the site).
  const param = request.nextUrl.searchParams.get("src");
  const src = param === "qr" || param === "site" ? param : "nfc";
  return NextResponse.redirect(new URL(`/v/${encodeURIComponent(slug)}?src=${src}`, request.url), 307);
}
