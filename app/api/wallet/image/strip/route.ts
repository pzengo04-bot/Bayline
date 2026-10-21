import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { stripState } from "@/lib/wallet/apple";
import { getPassData } from "@/lib/wallet/data";
import { STRIP_H, stripSvg } from "@/lib/wallet/strip";
import { outlineText } from "@/lib/wallet/strip-font";

// Google Wallet hero image for one customer's card: the same strip as the Apple pass (stamps plus
// the progress line or offer banner), widened to Google's 1032×336. The URL carries a version so
// Google refetches after each change.
export async function GET(request: NextRequest) {
  const serial = request.nextUrl.searchParams.get("serial") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(serial)) return new NextResponse(null, { status: 404 });
  const d = await getPassData(serial);
  if (!d) return new NextResponse(null, { status: 404 });
  const scale = 336 / STRIP_H;
  const png = await sharp(Buffer.from(stripSvg(stripState(d), outlineText, scale, 1032 / scale)))
    .resize(1032, 336)
    .png()
    .toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
