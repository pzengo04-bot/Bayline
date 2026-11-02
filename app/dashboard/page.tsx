import { connection } from "next/server";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { HomeView } from "@/components/dash/HomeView";
import { AutoRefresh } from "@/components/home/AutoRefresh";
import { SendOfferButton, type OfferDraft } from "@/components/home/SendOfferButton";
import { requireOwnerVenue } from "@/lib/auth";
import { getHeatmap } from "@/lib/data";
import { greetingFor } from "@/lib/greeting";
import { loadHome, parseRange } from "@/lib/home-data";
import { offerTemplate, offerTemplateShort, type OfferAudience, type OfferTemplate } from "@/lib/offer-templates";
import { loadOfferContext, planOffer } from "@/lib/offers";
import { findSlowWindow } from "@/lib/slow-hours";
import { createUserClient } from "@/lib/supabase/server";

export default function DashboardHome({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}

async function Home({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const { access, venue } = await requireOwnerVenue();
  if (!venue) return <NoVenue />;
  const days = parseRange((await searchParams).range);
  const [data, offers, heat56] = await Promise.all([
    loadHome(await createUserClient(), venue, days),
    loadOfferContext(venue),
    getHeatmap(venue.id),
  ]);
  await connection(); // the greeting depends on the time of day

  // Offer wording uses the 8-week quiet window, like the Messages page.
  const slow = findSlowWindow(heat56, { openHour: venue.open_hour, closeHour: venue.close_hour });
  const shortSlow = slow ? `${slow.shortDay} ${slow.label.split(" ").slice(1).join(" ")}` : null;
  const draft = (audience: OfferAudience, template: OfferTemplate, only?: string): OfferDraft => {
    const pool = only ? offers.customers.filter((c) => c.id === only) : offers.customers;
    const plan = planOffer(venue, pool, audience);
    return {
      audience,
      message: offerTemplate(template, venue, shortSlow),
      short: offerTemplateShort(template, shortSlow),
      customerIds: only ? [only] : undefined,
      recipients: plan.deliver.map((c) => c.name.split(" ")[0]),
      noCard: plan.noCard.length,
      cooldown: plan.cooldown.length,
    };
  };
  const offerVenue = { name: venue.name, logoUrl: venue.logo_url, cardBg: venue.card_bg, cardFg: venue.card_fg, cooldownDays: venue.offer_cooldown_days };
  const action = data.numbers.slipping > 0 ? draft("slipping", "win_back") : slow ? draft("regulars", "slow_hours") : null;

  return (
    <>
      <AutoRefresh />
      <HomeView
        venue={venue}
        data={data}
        days={days}
        greeting={greetingFor(access.user, venue.timezone)}
        actionButton={action && <SendOfferButton draft={action} venue={offerVenue} size="orange" />}
        rowAction={(id) => {
          const d = draft("slipping", "win_back", id);
          return d.recipients.length ? (
            <SendOfferButton draft={d} venue={offerVenue} size="outline" />
          ) : (
            <span className="text-xs text-muted">{d.noCard ? "No wallet card" : "Sent recently"}</span>
          );
        }}
      />
    </>
  );
}
