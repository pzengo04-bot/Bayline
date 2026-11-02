import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LabelChip } from "@/components/app/LabelChip";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { Section } from "@/components/dashboard/Section";
import { ActionCard } from "@/components/home/ActionCard";
import { AutoRefresh } from "@/components/home/AutoRefresh";
import { SendOfferButton, type OfferDraft } from "@/components/home/SendOfferButton";
import { StatCards } from "@/components/home/StatCards";
import { button, card } from "@/components/ui/styles";
import { CARD_EVENT_COLUMNS, eventActor, eventText, isRewardEvent, timeAgo, type CardEvent } from "@/lib/activity";
import { requireVenue } from "@/lib/auth";
import { getCustomerInsights, getCustomerStats, getHeatmap, getHomeStats } from "@/lib/data";
import { progressFor } from "@/lib/insights";
import { rhythmLine } from "@/lib/labels";
import { offerTemplate, offerTemplateShort, type OfferAudience, type OfferTemplate } from "@/lib/offer-templates";
import { loadOfferContext, planOffer, type PlannedCustomer } from "@/lib/offers";
import { programSummary } from "@/lib/rewards";
import { findSlowWindow } from "@/lib/slow-hours";
import { createUserClient } from "@/lib/supabase/server";
import { venueTypeLabel } from "@/lib/venues";

export default function DashboardHome() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home />
    </Suspense>
  );
}

const firstName = (name: string) => name.split(" ")[0];

async function Home() {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  const owner = venue.role !== "staff";

  const supabase = await createUserClient();
  const [insights, stats, heatmapRows, rows, offers, { data: events }] = await Promise.all([
    getCustomerInsights(venue.id),
    getHomeStats(venue.id),
    getHeatmap(venue.id),
    getCustomerStats(venue.id),
    owner ? loadOfferContext(venue) : Promise.resolve(null),
    supabase.from("card_events").select(CARD_EVENT_COLUMNS).eq("venue_id", venue.id).order("created_at", { ascending: false }).limit(10),
  ]);
  await connection(); // Recent activity says how long ago

  const slipping = insights
    .filter((c) => c.label === "slipping")
    .sort((a, b) => b.visits_180 - a.visits_180 || (a.days_since ?? 0) - (b.days_since ?? 0));
  const slow = findSlowWindow(heatmapRows, { openHour: venue.open_hour, closeHour: venue.close_hour });
  const shortSlow = slow ? `${slow.shortDay} ${slow.label.split(" ").slice(1).join(" ")}` : null;
  const readyRows = rows
    .map((r) => ({ id: r.id, name: r.name, progress: progressFor(r, venue) }))
    .filter((r) => r.progress.reward_ready)
    .sort((a, b) => a.name.localeCompare(b.name));
  const activity = (events ?? []) as unknown as CardEvent[];

  const draft = (audience: OfferAudience, template: OfferTemplate, only?: string): OfferDraft | null => {
    if (!offers) return null;
    const pool = only ? offers.customers.filter((c) => c.id === only) : offers.customers;
    const plan = planOffer(venue, pool, audience);
    return {
      audience,
      message: offerTemplate(template, venue, shortSlow),
      short: offerTemplateShort(template, shortSlow),
      customerIds: only ? [only] : undefined,
      recipients: plan.deliver.map((c: PlannedCustomer) => firstName(c.name)),
      noCard: plan.noCard.length,
      cooldown: plan.cooldown.length,
    };
  };
  const offerVenue = { name: venue.name, logoUrl: venue.logo_url, cardBg: venue.card_bg, cardFg: venue.card_fg, cooldownDays: venue.offer_cooldown_days };
  const action = slipping.length > 0 ? draft("slipping", "win_back") : slow ? draft("regulars", "slow_hours") : null;

  return (
    <div className="space-y-3 sm:space-y-4">
      <AutoRefresh />
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
            Put your stand at the counter. Customers tap it, add the card to their wallet, and show up here.
          </p>
          <Link href="/dashboard/stand" className={`${button.primary} mt-5`}>
            Set up your stand
          </Link>
        </div>
      ) : (
        <>
          <StatCards
            items={[
              { label: "Visits this week", value: stats.week_visits, before: stats.prev_visits, note: "Check-ins in the last 7 days" },
              { label: "Active regulars", value: stats.regulars, before: stats.prev_regulars, note: "Coming back on their usual rhythm" },
              { label: "Slipping", value: stats.slipping, before: stats.prev_slipping, note: "Regulars away twice their usual time", upIsBad: true },
            ]}
          />

          {slipping.length > 0 ? (
            <ActionCard kind="slipping" count={slipping.length} actions={action && <SendOfferButton draft={action} venue={offerVenue} />} />
          ) : slow ? (
            <ActionCard kind="slow" window={slow.label} actions={action && <SendOfferButton draft={action} venue={offerVenue} />} />
          ) : (
            <ActionCard kind="quiet" />
          )}

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
            <div className="space-y-3 sm:space-y-4">
              <Section
                title="Rewards ready"
                subtitle={readyRows.length ? "Full cards waiting to be redeemed. Scan their card at the counter." : "No rewards waiting right now."}
              >
                {readyRows.length > 0 && (
                  <ul className="divide-y divide-line/70 rounded-xl border border-line">
                    {readyRows.slice(0, 8).map((r) => (
                      <li key={r.id}>
                        <Link href={`/dashboard/customers/${r.id}`} className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-surface-2">
                          <span className="truncate font-medium">{r.name}</span>
                          <span className="shrink-0 rounded-full bg-orange px-2.5 py-1 text-xs font-semibold text-midnight">{r.progress.reward_text}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {readyRows.length > 8 && <p className="mt-2 text-sm text-muted">And {readyRows.length - 8} more.</p>}
              </Section>

              <SlippingSection
                customers={slipping.slice(0, 5)}
                total={slipping.length}
                offerFor={(id) => draft("slipping", "win_back", id)}
                venue={offerVenue}
              />
            </div>

            <Section title="Recent activity" subtitle="Check-ins, new members and rewards. Updates on its own.">
              {activity.length === 0 ? (
                <p className="rounded-xl bg-midnight p-4 text-sm text-muted">Nothing yet today.</p>
              ) : (
                <ul className="divide-y divide-line/70 rounded-xl border border-line">
                  {activity.map((e) => (
                    <li key={e.id} className="flex items-start gap-3 px-3 py-2.5">
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${isRewardEvent(e) ? "bg-orange" : e.kind === "joined" ? "bg-blue" : "bg-fg/30"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <Link href={`/dashboard/customers/${e.customer_id}`} className="text-sm font-medium hover:underline">
                          {eventText(e, venue.reward_type, e.customers?.name ?? "A customer")}
                        </Link>
                        <p className="truncate text-xs text-muted">{eventActor(e)}</p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted">{timeAgo(e.created_at, venue.timezone)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <Link href="/dashboard/brief" className={`${card} glow-hover flex items-center justify-between gap-4 p-4 sm:p-5`}>
            <span>
              <span className="block font-display text-2xl font-bold uppercase leading-none">This week&apos;s Monday brief</span>
              <span className="mt-1 block text-sm text-muted">What happened last week and what to do this week.</span>
            </span>
            <span className="text-2xl text-blue" aria-hidden="true">
              →
            </span>
          </Link>
        </>
      )}
    </div>
  );
}

function SlippingSection({
  customers,
  total,
  offerFor,
  venue,
}: {
  customers: Awaited<ReturnType<typeof getCustomerInsights>>;
  total: number;
  offerFor: (id: string) => OfferDraft | null;
  venue: Parameters<typeof SendOfferButton>[0]["venue"];
}) {
  return (
    <Section
      title="Slipping regulars"
      subtitle={total ? "Away more than twice their usual time" : "Nobody is slipping right now."}
      action={
        total > 0 ? (
          <Link href="/dashboard/customers?label=slipping" className="text-sm font-semibold text-blue underline underline-offset-2">
            See all{total > customers.length ? ` ${total}` : ""}
          </Link>
        ) : undefined
      }
    >
      {customers.length > 0 && (
        <ul className="divide-y divide-line/70 rounded-xl border border-line">
          {customers.map((c) => {
            const offer = offerFor(c.id);
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <Link href={`/dashboard/customers/${c.id}`} className="min-w-0 hover:underline">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{c.name}</span>
                    <LabelChip label={c.label} />
                  </span>
                  <span className="block text-xs text-muted">{rhythmLine(c)}</span>
                </Link>
                {offer &&
                  (offer.recipients.length ? (
                    <SendOfferButton draft={offer} venue={venue} size="small" />
                  ) : (
                    <span className="shrink-0 text-xs text-muted">{offer.noCard ? "No wallet card" : "Offer sent recently"}</span>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

