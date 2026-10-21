import { NextResponse, type NextRequest } from "next/server";
import { buildApplePass } from "@/lib/wallet/apple";
import { appleConfig } from "@/lib/wallet/config";
import { getPassData, markWalletPlatform, serialFromCookie } from "@/lib/wallet/data";

// "Add to Apple Wallet": the customer's own card, found by the return cookie set when they joined.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("venue") ?? "";
  if (!appleConfig()) return new NextResponse("Apple Wallet isn't set up yet.", { status: 503 });

  const serial = await serialFromCookie(slug);
  if (!serial) return NextResponse.redirect(new URL(`/v/${encodeURIComponent(slug)}`, request.url));
  const data = await getPassData(serial);
  if (!data) return new NextResponse("Card not found", { status: 404 });

  const pkpass = await buildApplePass(data);
  await markWalletPlatform(serial, "apple");
  return new NextResponse(new Uint8Array(pkpass), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${data.venue.slug}.pkpass"`,
      "Cache-Control": "no-store",
      "Last-Modified": new Date(data.updated_at).toUTCString(),
    },
  });
}
