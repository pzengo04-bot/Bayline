import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import type { CardStatus } from "@/app/dashboard/scan/actions";
import { LabelChip } from "@/components/app/LabelChip";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { ProgressCard } from "@/components/checkin/ProgressCard";
import { ProfileActions } from "@/components/customer/ProfileActions";
import { Section } from "@/components/dashboard/Section";
import { SendOfferButton } from "@/components/home/SendOfferButton";
import { CARD_EVENT_COLUMNS, eventActor, eventText, isRewardEvent, type CardEvent } from "@/lib/activity";
import { requireVenue } from "@/lib/auth";
import type { CustomerInsight } from "@/lib/labels";
import { offerTemplate, offerTemplateShort } from "@/lib/offer-templates";
import { formatPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserClient } from "@/lib/supabase/server";

export default function CustomerPage({ params }: PageProps<"/dashboard/customers/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Customer params={params} />
    </Suspense>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Customer({ params }: { params: PageProps<"/dashboard/customers/[id]">["params"] }) {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createUserClient();
  const [{ data: status }, { data: insight }, { data: events }, { data: wallet }] = await Promise.all([
    supabase.rpc("card_status", { p_customer: id }),
    supabase.from("customer_insights").select("*").eq("id", id).eq("venue_id", venue.id).maybeSingle(),
    supabase.from("card_events").select(CARD_EVENT_COLUMNS).eq("customer_id", id).eq("venue_id", venue.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("customers").select("pass_serial, wallet_platforms, consent_timestamp").eq("id", id).eq("venue_id", venue.id).maybeSingle(),
  ]);
  const card = status as CardStatus | null;
  const c = insight as CustomerInsight | null;
  if (!card || !c || !wallet) notFound();
  await connection();

  // Device registrations are server-only; this reads just this customer's own pass.
  const { count: appleDevices } = await createAdminClient()
    .from("apple_registrations")
    .select("serial_number", { count: "exact", head: true })
    .eq("serial_number", wallet.pass_serial as string);
  const walletName = appleDevices ? "Apple Wallet" : ((wallet.wallet_platforms as string[]) ?? []).includes("google") ? "Google Wallet" : null;
  const history = (events ?? []) as unknown as CardEvent[];
  const p = card.progress;
  const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: venue.timezone });
  const whenTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: venue.timezone });

  const facts = [
    { label: "Total visits", value: String(card.visits) },
    { label: "Last visit", value: card.last_visit_at ? (c.days_since === 0 ? "Today" : `${when.format(new Date(card.last_visit_at))} (${c.days_since} day${c.days_since === 1 ? "" : "s"} ago)`) : "No visits yet" },
    { label: "Usually comes", value: c.rhythm_days ? `Every ${Math.max(1, Math.round(c.rhythm_days))} days` : "Not enough visits yet" },
    {
      label: p.reward_type === "stamps" ? "Stamps" : "Points",
      value: p.reward_type === "stamps" ? `${p.stamps} of ${p.stamps_needed}` : `${p.points} of ${p.points_needed}`,
    },
    { label: "Reward", value: p.reward_ready ? `Ready: ${p.reward_text}` : "Not yet" },
    { label: "Offers", value: walletName ? `On, through ${walletName}` : "No wallet card, so no offers" },
    { label: "Text messages", value: card.text_consent && wallet.consent_timestamp ? `Agreed ${when.format(new Date(wallet.consent_timestamp as string))}` : "Not agreed" },
    { label: "Member since", value: when.format(new Date(card.created_at)) },
  ];

  const owner = venue.role !== "staff";
  const template = c.label === "slipping" || c.label === "lapsed" ? "win_back" : "reward";

  return (
    <div className="mx-auto max-w-3xl space-y-3 sm:space-y-4">
      <Link href="/dashboard/customers" className="text-sm font-semibold text-muted hover:text-fg">
        ← Customers
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
            {card.name}
            <LabelChip label={c.label} />
          </h1>
          <p className="mt-1.5 text-muted tabular-nums">{formatPhone(card.phone)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <ProfileActions
          card={card}
          message={
            owner && walletName ? (
              <SendOfferButton
                editable
                size="medium"
                label="Send message"
                venue={{ name: venue.name, logoUrl: venue.logo_url, cardBg: venue.card_bg, cardFg: venue.card_fg, cooldownDays: venue.offer_cooldown_days }}
                draft={{
                  audience: "everyone",
                  message: offerTemplate(template, venue, null),
                  short: offerTemplateShort(template, null),
                  customerIds: [card.id],
                  recipients: [card.name.split(" ")[0]],
                  noCard: 0,
                  cooldown: 0,
                }}
              />
            ) : null
          }
        />
      </section>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Card">
          <ProgressCard progress={p} />
        </Section>
        <Section title="Details">
          <dl className="divide-y divide-line/70">
            {facts.map((f) => (
              <div key={f.label} className="flex justify-between gap-4 py-2 text-sm">
                <dt className="text-muted">{f.label}</dt>
                <dd className="text-right font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Section>
      </div>

      <Section title="History" subtitle="Every visit, stamp and change, newest first">
        {history.length === 0 ? (
          <p className="rounded-xl bg-midnight p-4 text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-line/70 rounded-xl border border-line">
            {history.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-3 py-2.5">
                <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${isRewardEvent(e) ? "bg-orange" : e.kind === "joined" ? "bg-blue" : "bg-fg/30"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{eventText(e, venue.reward_type)}</p>
                  <p className="truncate text-xs text-muted">{eventActor(e)}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted">{whenTime.format(new Date(e.created_at))}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
