import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NoVenue } from "@/components/app/NoVenue";
import { PageSkeleton } from "@/components/app/PageSkeleton";
import { Section } from "@/components/dashboard/Section";
import { card } from "@/components/ui/styles";
import { requireVenue } from "@/lib/auth";
import { getCustomerInsights, getCustomerStats, getHeatmap } from "@/lib/data";
import { ymdInZone } from "@/lib/format";
import { progressFor } from "@/lib/insights";
import { findSlowWindow, FULL_DAY_NAMES } from "@/lib/slow-hours";
import { createUserClient } from "@/lib/supabase/server";

export default function BriefPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Brief />
    </Suspense>
  );
}

type Week = {
  visits: number;
  prev_visits: number;
  customers: number;
  new: number;
  prev_new: number;
  rewards: number;
  best_day: { date: string; visits: number } | null;
};

const addDays = (ymd: string, n: number) => new Date(Date.parse(`${ymd}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const dayIndex = (ymd: string) => (new Date(`${ymd}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
const short = (ymd: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${ymd}T12:00:00Z`));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function change(now: number, before: number) {
  if (now === before) return "the same as the week before";
  return `${now > before ? "up" : "down"} ${Math.abs(now - before)} from ${before} the week before`;
}

/** The Monday brief: last Monday-to-Sunday week in plain language, and what to do this week. */
async function Brief() {
  const { venue } = await requireVenue();
  if (!venue) return <NoVenue />;
  await connection();
  const today = ymdInZone(venue.timezone);
  const start = addDays(today, -dayIndex(today) - 7);
  const end = addDays(start, 6);

  const supabase = await createUserClient();
  const [{ data }, insights, rows, heatmapRows] = await Promise.all([
    supabase.rpc("venue_week", { p_venue: venue.id, p_start: start }),
    getCustomerInsights(venue.id),
    getCustomerStats(venue.id),
    getHeatmap(venue.id),
  ]);
  const w = data as Week;
  const slipping = insights.filter((c) => c.label === "slipping").length;
  const ready = rows.filter((r) => progressFor(r, venue).reward_ready).length;
  const slow = findSlowWindow(heatmapRows, { openHour: venue.open_hour, closeHour: venue.close_hour });

  const happened = [
    `${plural(w.visits, "visit")}, ${change(w.visits, w.prev_visits)}.`,
    `${plural(w.customers, "different customer")} came in${w.new ? `, ${w.new} of them for the first time` : ""}.`,
    w.rewards ? `${plural(w.rewards, "reward")} redeemed.` : "No rewards redeemed.",
    ...(w.best_day ? [`Busiest day: ${FULL_DAY_NAMES[dayIndex(w.best_day.date)]} with ${plural(w.best_day.visits, "visit")}.`] : []),
  ];
  const todo: { text: string; href?: string; cta?: string }[] = [
    ...(slipping
      ? [{ text: `${plural(slipping, "regular has", "regulars have")} gone quiet. Send them a “we miss you” offer.`, href: "/dashboard", cta: "Send offer" }]
      : []),
    ...(slow ? [{ text: `${slow.label} is your quietest stretch. Invite your regulars in.`, href: "/dashboard/messages?audience=regulars&template=slow_hours", cta: "Invite them" }] : []),
    ...(ready ? [{ text: `${plural(ready, "customer has", "customers have")} a full card. Redeem it when they come in.`, href: "/dashboard/scan", cta: "Open Scan" }] : []),
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-3 sm:space-y-4">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-blue">Monday brief</p>
        <h1 className="mt-1 font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
          Week of {short(start)} – {short(end)}
        </h1>
      </div>
      <Section title="Last week">
        <ul className="space-y-2">
          {happened.map((t) => (
            <li key={t} className="flex gap-3">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
      </Section>
      <Section title="This week">
        {todo.length === 0 ? (
          <p className="text-muted">Nothing needs you. Your regulars are on track.</p>
        ) : (
          <ul className="space-y-3">
            {todo.map((t) => (
              <li key={t.text} className={`${card} flex flex-col gap-3 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between`}>
                <span>{t.text}</span>
                {t.href && (
                  <Link href={t.href} className="shrink-0 rounded-full bg-blue px-4 py-2 text-center text-sm font-semibold text-midnight hover:bg-blue-hover">
                    {t.cta}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
