import Link from "next/link";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { ActionCard } from "@/components/home/ActionCard";
import { SlippingList } from "@/components/home/SlippingList";
import { WeekPreview } from "@/components/home/WeekPreview";
import { button, card } from "@/components/ui/styles";
import { requireVenue } from "@/lib/auth";
import { getCustomerInsights, getHeatmap, getHomeStats } from "@/lib/data";
import { formatPercent } from "@/lib/format";
import { findSlowWindow, FULL_DAY_NAMES } from "@/lib/slow-hours";
import { programSummary } from "@/lib/rewards";
import { venueTypeLabel } from "@/lib/venues";

export default function DashboardHome() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;

  const [insights, stats, heatmapRows] = await Promise.all([
    getCustomerInsights(venue.id),
    getHomeStats(venue.id),
    getHeatmap(venue.id),
  ]);
  const slipping = insights
    .filter((c) => c.label === "slipping")
    .sort((a, b) => b.visits_180 - a.visits_180 || (a.days_since ?? 0) - (b.days_since ?? 0));
  const slow = findSlowWindow(heatmapRows, { openHour: venue.open_hour, closeHour: venue.close_hour });
  const returningRate = stats.month_customers ? stats.month_returning / stats.month_customers : 0;
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: venue.timezone }).format(new Date());
  const bestDay = stats.best_day
    ? `${FULL_DAY_NAMES[(new Date(`${stats.best_day.date}T12:00:00Z`).getUTCDay() + 6) % 7]} (${stats.best_day.visits} visit${stats.best_day.visits === 1 ? "" : "s"})`
    : null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="pb-1">
        <p className="text-sm font-medium text-muted">
          {venueTypeLabel(venue.type)} · {programSummary(venue)}
        </p>
        <h1 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">{venue.name}</h1>
      </div>

      {insights.length === 0 ? (
        <div className={`${card} p-6 text-center sm:p-10`}>
          <h2 className="font-display text-3xl font-bold uppercase">No customers yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Put your stand at the front desk. Customers tap or scan it, add the card to their wallet, and show up here.
          </p>
          <Link href="/dashboard/stand" className={`${button.primary} mt-5`}>
            Set up your stand
          </Link>
        </div>
      ) : (
        <>
          <StatGrid
            items={[
              { label: "Customers this month", value: String(stats.month_customers), note: `Visited in ${month}` },
              { label: "Returning rate", value: formatPercent(returningRate), note: "Of this month's customers had been before" },
              { label: "Slipping regulars", value: String(slipping.length), note: "Away twice their usual time" },
            ]}
          />
          {slipping.length > 0 ? (
            <ActionCard kind="slipping" count={slipping.length} demo={venue.is_demo} />
          ) : slow ? (
            <ActionCard kind="slow" window={slow.label} demo={venue.is_demo} />
          ) : (
            <ActionCard kind="quiet" demo={venue.is_demo} />
          )}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <SlippingList customers={slipping.slice(0, 10)} total={slipping.length} />
            <WeekPreview
              newCustomers={stats.week_new}
              rewards={stats.week_rewards}
              visits={stats.week_visits}
              bestDay={bestDay}
              quietest={slow?.label ?? null}
            />
          </div>
          <p className="pt-1 text-center text-sm text-muted">
            <Link href="/dashboard/customers" className="font-semibold text-ink underline underline-offset-2">
              All customers, regulars and busy hours
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
