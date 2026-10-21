import { NextResponse, type NextRequest } from "next/server";
import { googleConfig } from "@/lib/wallet/config";
import { getPassData, markWalletPlatform, serialFromCookie } from "@/lib/wallet/data";
import { googleSaveUrl } from "@/lib/wallet/google";

// "Add to Google Wallet": sign a save link for the customer on this phone and send them to Google.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("venue") ?? "";
  if (!googleConfig()) return new NextResponse("Google Wallet isn't set up yet.", { status: 503 });

  const serial = await serialFromCookie(slug);
  if (!serial) return NextResponse.redirect(new URL(`/v/${encodeURIComponent(slug)}`, request.url));
  const data = await getPassData(serial);
  if (!data) return new NextResponse("Card not found", { status: 404 });

  const url = await googleSaveUrl(data);
  await markWalletPlatform(serial, "google");
  return NextResponse.redirect(url);
}
