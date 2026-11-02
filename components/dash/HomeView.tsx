import Link from "next/link";
import type { ReactNode } from "react";
import type { Venue } from "@/lib/auth";
import { eventText, timeAgo } from "@/lib/activity";
import { heatmapHours, percentChange, type FeedItem, type HomeData, type Range } from "@/lib/home-data";
import { programSummary } from "@/lib/rewards";
import { findSlowWindow } from "@/lib/slow-hours";
import { venueTypeLabel } from "@/lib/venues";
import { BusyHeatmap, slowCells, slowLabel } from "./BusyHeatmap";
import { IconGift } from "./icons";
import { Avatar, Card, CardHeader, Empty, TextLink, Trend } from "./ui";
import { VisitsChart } from "./VisitsChart";

type Props = {
  venue: Venue;
  data: HomeData;
  days: Range;
  greeting: string;
  /** The orange Send offer for this week's action (owners only). */
  actionButton?: ReactNode;
  /** The outlined Send offer on a slipping regular's row. */
  rowAction?: (customerId: string) => ReactNode;
};

/** The owner Home: four numbers, visits over time, this week's action, busy hours, rewards, lists. */
export function HomeView({ venue, data, days, greeting, actionButton, rowAction }: Props) {
  const n = data.numbers;
  const vs = `vs last ${days} days`;
  const pct = (now: number, before: number) => {
    const p = percentChange(now, before);
    return { diff: now - before, text: p === null ? `${now - before} ${vs}` : `${Math.abs(p)}% ${vs}` };
  };
  const stats = [
    { label: "Visits", value: n.visits, ...pct(n.visits, n.prev_visits), href: "/dashboard/customers" },
    { label: "Active customers", value: n.active, ...pct(n.active, n.prev_active), href: "/dashboard/customers" },
    { label: "New members", value: n.new, ...pct(n.new, n.prev_new), href: "/dashboard/customers?label=new" },
    {
      label: "Slipping regulars",
      value: n.slipping,
      diff: n.slipping - n.prev_slipping,
      text: n.slipping === n.prev_slipping ? `Same as ${days} days ago` : `${Math.abs(n.slipping - n.prev_slipping)} ${vs}`,
      href: "/dashboard/customers?label=slipping",
      warn: true,
    },
  ];
  const slowWindow = findSlowWindow(data.heatmap, { openHour: venue.open_hour, closeHour: venue.close_hour });
  const slow = slowCells(data.heatmap, slowWindow);
  const earned = n.redeemed + n.ready;
  const redeemedPct = earned ? Math.round((n.redeemed / earned) * 100) : 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted">
            {venueTypeLabel(venue.type)} · {programSummary(venue)}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting}</h1>
        </div>
        <nav aria-label="Time range" className="flex rounded-[10px] border border-line bg-surface p-1">
          {([7, 30, 90] as const).map((r) => (
            <Link
              key={r}
              href={r === 30 ? "/dashboard" : `/dashboard?range=${r}`}
              aria-current={r === days ? "page" : undefined}
              className={`rounded-[7px] px-3.5 py-1.5 text-sm font-semibold ${r === days ? "bg-surface-2 text-fg shadow-sm ring-1 ring-line" : "text-muted hover:text-fg"}`}
            >
              {r} days
            </Link>
          ))}
        </nav>
      </header>

      {/* Row 1: the numbers */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-[14px] border bg-surface p-5 ${s.warn ? "border-orange/45" : "border-line"}`}>
            <p className="text-sm font-medium text-muted">{s.label}</p>
            <p className="mt-2 text-4xl font-extrabold tabular-nums">{s.value}</p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
              <Trend diff={s.diff} text={s.text} upIsBad={s.warn} />
              <TextLink href={s.href}>View →</TextLink>
            </div>
          </div>
        ))}
      </div>

      {/* Row 2: visits over time + this week's action */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Visits over time" subtitle={`Check-ins per day, last ${days} days`} />
          {n.visits === 0 ? <Empty title="No visits yet">Visits show up here as customers tap your stand.</Empty> : <VisitsChart data={n.series} />}
        </Card>
        <section className="flex flex-col rounded-[14px] border border-blue/40 bg-[linear-gradient(150deg,#0b2a3d,#0a1218_70%)] p-5">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-blue-light">This week&apos;s action</p>
          {n.slipping > 0 ? (
            <>
              <p className="mt-3 text-2xl font-bold leading-snug">
                {n.slipping} regular{n.slipping === 1 ? "" : "s"} {n.slipping === 1 ? "hasn't" : "haven't"} been back in twice their usual time.
              </p>
              <p className="mt-2 text-muted">A “we miss you” offer with a bonus stamp brings most of them back within two weeks.</p>
            </>
          ) : slowWindow ? (
            <>
              <p className="mt-3 text-2xl font-bold leading-snug">{slowWindow.label} is your quietest stretch.</p>
              <p className="mt-2 text-muted">Invite your regulars in when you have room.</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold leading-snug">All quiet. Your regulars are on track.</p>
              <p className="mt-2 text-muted">Nothing needs you this week.</p>
            </>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-4 pt-5">
            {actionButton}
            {n.slipping > 0 && <TextLink href="/dashboard/customers?label=slipping">See who →</TextLink>}
          </div>
        </section>
      </div>

      {/* Row 3: busiest times + rewards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Busiest times"
            subtitle={`Visits by day and hour, last ${days} days`}
            right={slow && <span className="text-sm font-semibold text-orange">Slowest: {slowLabel(slow)}</span>}
          />
          {n.visits === 0 ? (
            <Empty title="Not enough visits yet">Your busy and slow hours appear after a few weeks of check-ins.</Empty>
          ) : (
            <BusyHeatmap rows={data.heatmap} hours={heatmapHours(venue, data.heatmap)} slow={slow} />
          )}
        </Card>
        <Card>
          <CardHeader title="Rewards" subtitle={`Last ${days} days`} />
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-orange/15 text-orange">
              <IconGift />
            </span>
            <p>
              <span className="block text-4xl font-extrabold tabular-nums leading-none">{n.ready}</span>
              <span className="text-sm text-muted">reward{n.ready === 1 ? "" : "s"} ready to use</span>
            </p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ["Earned", earned],
              ["Redeemed", n.redeemed],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[10px] bg-surface-2 p-3">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-1 font-mono text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-blue" style={{ width: `${redeemedPct}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">{earned ? `${redeemedPct}% of earned rewards redeemed` : "No rewards earned yet"}</p>
          </div>
        </Card>
      </div>

      {/* Row 4: slipping regulars + recent activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Slipping regulars"
            subtitle="Away more than twice their usual time"
            right={data.slipping.length > 0 && <TextLink href="/dashboard/customers?label=slipping">See all {data.slipping.length} →</TextLink>}
          />
          {data.slipping.length === 0 ? (
            <Empty title="Nobody is slipping">Regulars who stop coming show up here, with a button to bring them back.</Empty>
          ) : (
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-2 font-medium">Customer</th>
                    <th className="pb-2 font-medium">Usually every</th>
                    <th className="pb-2 font-medium">Last visit</th>
                    <th className="pb-2 text-right font-medium">Visits</th>
                    {rowAction && <th className="pb-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.slipping.slice(0, 5).map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 pr-3">
                        <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                          <Avatar name={c.name} size={32} />
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-muted">{c.rhythm_days ? `${Math.max(1, Math.round(c.rhythm_days))} days` : "—"}</td>
                      <td className="py-2.5 pr-3 font-semibold text-orange">{c.days_since} days ago</td>
                      <td className="py-2.5 pr-3 text-right font-mono">{c.visits_180}</td>
                      {rowAction && <td className="py-2.5 text-right">{rowAction(c.id)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Recent activity"
            right={
              <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-light">
                <span className="size-2 animate-pulse rounded-full bg-blue-light" aria-hidden="true" />
                Live
              </span>
            }
          />
          {data.feed.length === 0 ? (
            <Empty title="Nothing yet">Check-ins, new members and rewards show up here as they happen.</Empty>
          ) : (
            <ul className="space-y-3.5">
              {data.feed.map((item) => (
                <FeedRow key={item.type === "event" ? item.event.id : item.id} item={item} venue={venue} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

const AUDIENCE: Record<string, string> = { slipping: "slipping regulars", regulars: "regulars", everyone: "everyone", demo_guests: "demo guests" };

function FeedRow({ item, venue }: { item: FeedItem; venue: Venue }) {
  let icon: { glyph: string; tone: "blue" | "orange" | "grey" };
  let title: string;
  let detail: string;
  if (item.type === "offer") {
    icon = { glyph: "→", tone: "grey" };
    title = "Offer sent";
    detail = `To ${item.delivered} ${AUDIENCE[item.audience] ?? "customers"}`;
  } else {
    const e = item.event;
    const name = e.customers?.name ?? "A customer";
    const [have, need] = (e.detail ?? "").split(" of ").map(Number);
    const unlocked = e.kind === "stamp" && need > 0 && have >= need;
    if (e.kind === "joined") {
      icon = { glyph: "+", tone: "blue" };
      title = `${name} joined`;
      detail = "New member";
    } else if (e.kind === "redeem" || e.kind === "milestone" || unlocked) {
      icon = { glyph: "★", tone: "orange" };
      title = unlocked ? `${name} unlocked a reward` : `${name} redeemed a reward`;
      detail = unlocked ? `${venue.reward_text} · ${e.detail}` : (e.detail ?? "Reward");
    } else if (e.kind === "stamp" || e.kind === "visit") {
      icon = { glyph: "✓", tone: "blue" };
      title = `${name} checked in`;
      detail = e.kind === "visit" ? "Card full, no stamp" : `${e.source === "staff" ? "Stamp added by staff" : "Stamp added"}${e.detail ? ` · ${e.detail}` : ""}`;
    } else {
      icon = { glyph: "•", tone: "grey" };
      title = eventText(e, venue.reward_type, name);
      detail = e.actor_email ? `By ${e.actor_email.split("@")[0]}` : "Staff";
    }
  }
  const tones = { blue: "bg-blue/15 text-blue-light", orange: "bg-orange/15 text-orange", grey: "bg-fg/10 text-muted" };
  return (
    <li className="flex items-start gap-3">
      <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold ${tones[icon.tone]}`} aria-hidden="true">
        {icon.glyph}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted">{detail}</p>
      </div>
      <span className="shrink-0 font-mono text-[11px] text-muted">{timeAgo(item.at, venue.timezone)}</span>
    </li>
  );
}
