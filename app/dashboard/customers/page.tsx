import Link from "next/link";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { GoneQuietList } from "@/components/dashboard/GoneQuietList";
import { RegularsTable } from "@/components/dashboard/RegularsTable";
import { Section } from "@/components/dashboard/Section";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { CustomersTable, type CustomerRow } from "@/components/venue/CustomersTable";
import { VisitsHeatmap } from "@/components/venue/VisitsHeatmap";
import { button, card } from "@/components/ui/styles";
import { requireVenue } from "@/lib/auth";
import { getCustomerInsights, getCustomerStats, getHeatmap, getOverview } from "@/lib/data";
import { formatMoney, formatPercent } from "@/lib/format";
import { buildVisitHeatmap, goneQuiet, hasSpend, progressFor, toSummary, topRegulars } from "@/lib/insights";
import { programSummary } from "@/lib/rewards";
import { venueTypeLabel } from "@/lib/venues";

export default function CustomersPage({ searchParams }: PageProps<"/dashboard/customers">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

async function Customers({ searchParams }: { searchParams: PageProps<"/dashboard/customers">["searchParams"] }) {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  const { label } = await searchParams;

  const [rows, overview, heatmapRows, insights] = await Promise.all([
    getCustomerStats(venue.id),
    getOverview(venue.id),
    getHeatmap(venue.id),
    getCustomerInsights(venue.id),
  ]);
  const labelOf = new Map(insights.map((i) => [i.id, i.label]));
  const spend = hasSpend(rows);
  const quiet = goneQuiet(rows, venue.timezone);
  const repeatRate = overview.active_customers ? overview.repeat_customers / overview.active_customers : 0;
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: venue.timezone }).format(new Date());

  const customers: CustomerRow[] = rows
    .map((r) => {
      const s = toSummary(r, venue.timezone);
      return {
        id: r.id,
        name: r.name,
        phone: r.phone,
        visits: r.visits,
        spend: r.spend,
        daysSinceLastVisit: r.last_visit_at ? s.daysSinceLastVisit : null,
        progress: progressFor(r, venue),
        textConsent: r.text_consent,
        label: labelOf.get(r.id) ?? "occasional",
      };
    })
    .sort((a, b) => (a.daysSinceLastVisit ?? 1e9) - (b.daysSinceLastVisit ?? 1e9));

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-1 pb-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">
            {venueTypeLabel(venue.type)} · {programSummary(venue)}
          </p>
          <h1 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">{venue.name}</h1>
        </div>
        <Link href={`/v/${venue.slug}`} className="text-sm font-semibold text-accent-strong underline underline-offset-2">
          Open check-in page
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className={`${card} p-6 text-center sm:p-10`}>
          <h2 className="font-display text-3xl font-bold uppercase">No check-ins yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Print your QR sign and put it at the front desk. Customers scan it, enter their phone number, and show up
            here.
          </p>
          <Link href="/dashboard/qr" className={`${button.primary} mt-5`}>
            Get your QR sign
          </Link>
        </div>
      ) : (
        <>
          <CustomersTable customers={customers} showSpend={spend} initialLabel={typeof label === "string" ? label : undefined} />
          <StatGrid
            columns="sm:grid-cols-2 lg:grid-cols-4"
            items={[
              { label: "Active customers", value: String(overview.active_customers), note: "Visited in the last 60 days" },
              { label: "Repeat visit rate", value: formatPercent(repeatRate), note: "Of active customers came 2+ times" },
              { label: "Visits this month", value: String(overview.visits_this_month), note: `Check-ins in ${month}` },
              { label: "Rewards redeemed", value: String(overview.rewards_this_month), note: `Earned in ${month}` },
            ]}
          />

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <RegularsTable
              regulars={topRegulars(rows, venue.timezone)}
              subtitle={spend ? "Your top customers by visits and spend" : "Your top customers by visits"}
              showSpend={spend}
            />
            <Section
              title="Gone quiet"
              subtitle={
                quiet.length
                  ? `${quiet.length} customer${quiet.length === 1 ? " has" : "s have"} 3+ visits but ${quiet.length === 1 ? "hasn't" : "haven't"} been back in 3+ weeks.`
                  : "Nobody with 3+ visits has been away for 3+ weeks. Nice."
              }
            >
              {quiet.length > 0 && (
                <>
                  <GoneQuietList
                    customers={quiet}
                    valueFor={(c) => (spend && c.spend > 0 ? formatMoney(c.spend) : `${c.visits} visits`)}
                  />
                  <Link href="/dashboard/messages?audience=gone_quiet&template=win_back" className={`${button.primary} mt-4 w-full`}>
                    Draft a win-back message
                  </Link>
                </>
              )}
            </Section>
          </div>

          <VisitsHeatmap heatmap={buildVisitHeatmap(heatmapRows)} />
        </>
      )}
    </div>
  );
}
