import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchLogo, initialsSvg } from "@/lib/wallet/apple";

// Square program logo for Google Wallet (and anywhere a square mark is needed):
// the venue's logo centered on its card color, or its initials.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("venue") ?? "";
  const { data: v } = await createAdminClient()
    .from("venues")
    .select("name, logo_url, card_bg, card_fg")
    .eq("id", id)
    .maybeSingle();
  if (!v) return new NextResponse(null, { status: 404 });

  const size = 660;
  const logo = await fetchLogo(v.logo_url);
  const png = logo
    ? await sharp({ create: { width: size, height: size, channels: 4, background: v.card_bg } })
        .composite([{ input: await sharp(logo).resize(Math.round(size * 0.72), Math.round(size * 0.72), { fit: "inside" }).toBuffer(), gravity: "center" }])
        .png()
        .toBuffer()
    : await sharp(initialsSvg(v.name, v.card_bg, v.card_fg, size, 0)).png().toBuffer(); // Google crops to a circle
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" },
  });
}
