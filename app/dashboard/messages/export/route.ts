import { NextResponse, type NextRequest } from "next/server";
import { getCurrentVenue } from "@/lib/auth";
import { getCustomerStats } from "@/lib/data";
import { activeRegulars, goneQuiet, type CustomerStatsRow } from "@/lib/insights";
import type { AudienceId } from "@/lib/messages";

// CSV of opted-in customers for the chosen audience. Customers without text consent are never included.

/** Quote a CSV cell and stop spreadsheet apps from running it as a formula. */
function cell(value: string | number) {
  let s = String(value);
  // Phone numbers like +19145550123 are safe and must stay importable; anything else starting with
  // a formula character (a name like "=HYPERLINK(...)") gets a leading apostrophe.
  if (/^[=+\-@\t\r]/.test(s) && !/^\+\d{10,15}$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const { venue } = await getCurrentVenue();
  if (!venue) return new NextResponse("No venue", { status: 404 });

  const audience = (request.nextUrl.searchParams.get("audience") ?? "all") as AudienceId;
  const rows = await getCustomerStats(venue.id);
  const quietIds = new Set(goneQuiet(rows, venue.timezone).map((c) => c.id));
  const regularIds = new Set(activeRegulars(rows, venue.timezone).map((r) => r.id));
  const pick: Record<AudienceId, (r: CustomerStatsRow) => boolean> = {
    gone_quiet: (r) => quietIds.has(r.id),
    regulars: (r) => regularIds.has(r.id),
    all: () => true,
  };
  const selected = rows.filter((r) => r.text_consent && (pick[audience] ?? pick.all)(r));

  const date = new Intl.DateTimeFormat("en-CA", { timeZone: venue.timezone }); // YYYY-MM-DD
  const lines = [
    ["first_name", "name", "phone", "visits", "last_visit", "opted_in_on"].map(cell).join(","),
    ...selected.map((r) =>
      [
        r.name.split(" ")[0],
        r.name,
        r.phone,
        r.visits,
        r.last_visit_at ? date.format(new Date(r.last_visit_at)) : "",
        r.consent_timestamp ? date.format(new Date(r.consent_timestamp)) : "",
      ]
        .map(cell)
        .join(","),
    ),
  ];
  const filename = `${venue.slug}-${audience.replace("_", "-")}-${date.format(new Date())}.csv`;
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
