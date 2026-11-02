import { type NextRequest } from "next/server";
import { getCurrentVenue } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { standInsertPdf } from "@/lib/stand-insert";

/** The 4×6" stand insert as a print-ready PDF. ?venue=<id> for admins; otherwise the current venue. */
export async function GET(request: NextRequest) {
  const { access, venue: current } = await getCurrentVenue();
  const wanted = request.nextUrl.searchParams.get("venue");
  const venue = access.venues.find((v) => v.id === wanted) ?? current;
  if (!venue) return new Response("Pick a venue", { status: 400 });

  const logo = venue.logo_url ? await fetch(venue.logo_url).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null) : null;
  const pdf = await standInsertPdf(
    { name: venue.name, card_bg: venue.card_bg, logo_png: logo ? new Uint8Array(logo) : null },
    `${siteUrl()}/t/${venue.slug}?src=qr`,
  );
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${venue.slug}-stand-insert-4x6.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
