import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import type { Progress } from "@/lib/rewards";
import { createUserClient } from "@/lib/supabase/server";
import { STRIP_H, STRIP_W, stripSvg, type StripState } from "@/lib/wallet/strip";
import { outlineText } from "@/lib/wallet/strip-font";
import { isStampIcon } from "@/lib/wallet/stamp-icons";

// The strip image for the Card tab previews, drawn by the same code as real passes. Signed-in venue
// users only. ?s= is base64url JSON of the pass model's strip: { p: Progress, o: offer short text,
// bg, fg, ac, ic: stamp icon, g: Google width }.
const HEX = /^#[0-9a-f]{6}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const int = (v: unknown, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

function parse(raw: string): { state: StripState; google: boolean } | null {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const p = (j.p ?? {}) as Record<string, unknown>;
  const m = p.milestone as Record<string, unknown> | null | undefined;
  if (![j.bg, j.fg, j.ac].every((c) => typeof c === "string" && HEX.test(c))) return null;
  const progress: Progress = {
    reward_type: p.reward_type === "points" ? "points" : "stamps",
    reward_text: str(p.reward_text, 60) || "reward",
    stamps: int(p.stamps, 0, 50),
    stamps_needed: int(p.stamps_needed, 2, 50),
    points: int(p.points, 0, 100000),
    points_needed: int(p.points_needed, 10, 100000),
    reward_ready: Boolean(p.reward_ready),
    milestone: m ? { at: int(m.at, 1, 100000), text: str(m.text, 40) || "reward", ready: Boolean(m.ready) } : null,
  };
  return {
    state: {
      progress,
      offerShort: str(j.o, 40) || null,
      bg: j.bg as string,
      fg: j.fg as string,
      accent: j.ac as string,
      icon: isStampIcon(j.ic) ? j.ic : "check",
    },
    google: Boolean(j.g),
  };
}

export async function GET(request: NextRequest) {
  const supabase = await createUserClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return new NextResponse(null, { status: 401 });
  const parsed = parse(request.nextUrl.searchParams.get("s") ?? "");
  if (!parsed) return new NextResponse(null, { status: 400 });

  const width = parsed.google ? STRIP_H * (1032 / 336) : STRIP_W;
  const png = await sharp(Buffer.from(stripSvg(parsed.state, outlineText, 2, width))).png().toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=86400" },
  });
}
