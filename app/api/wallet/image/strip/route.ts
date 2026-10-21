import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { getPassData } from "@/lib/wallet/data";
import { stripSvg } from "@/lib/wallet/strip";

// Punch-card image for one customer's card (Google Wallet hero image). Only shows stamp progress.
// The URL carries a version so Google refetches after each change.
export async function GET(request: NextRequest) {
  const serial = request.nextUrl.searchParams.get("serial") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(serial)) return new NextResponse(null, { status: 404 });
  const d = await getPassData(serial);
  if (!d) return new NextResponse(null, { status: 404 });
  const p = d.progress;
  const svg = stripSvg(
    {
      rewardType: p.reward_type,
      stamps: p.stamps,
      stampsNeeded: p.stamps_needed,
      points: p.points,
      pointsNeeded: p.points_needed,
      bg: d.venue.card_bg,
      fg: d.venue.card_fg,
      accent: d.venue.card_accent,
    },
    1032,
    336,
  );
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
