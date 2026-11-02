import Link from "next/link";
import type { ReactNode } from "react";
import type { CardEvent } from "@/lib/activity";
import type { Venue } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { visitsPerMonth, type ProfileData } from "@/lib/profile-data";
import { CardProgress } from "./CardProgress";
import { EditName } from "./EditName";
import { Avatar, Card, CardHeader, Empty, StatusPill } from "./ui";

type Props = { venue: Venue; data: ProfileData; owner: boolean; offerButton?: ReactNode };

const DAY = 86_400_000;

/** Customer details: who they are, their rhythm, their card, and everything that happened. */
export function ProfileView({ venue, data, owner, offerButton }: Props) {
  const { card, insight: c } = data;
  const tz = venue.timezone;
  const date = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) =>
    new Intl.DateTimeFormat("en-US", { ...opts, timeZone: tz }).format(new Date(iso));
  const slipping = c.label === "slipping" || c.label === "lapsed";
  const firstVisit = data.visits.at(-1) ?? null;
  const lastVisit = data.visits[0] ?? null;
  const months = visitsPerMonth(data.visits, tz);
  const lastVisitMonth = lastVisit ? new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: tz }).format(new Date(lastVisit)).slice(0, 7) : null;
  const maxMonth = Math.max(1, ...months.map((m) => m.n));

  // The timeline: card events, offers they got, and when they started slipping.
  const timeline: { at: string; text: string; tone: "blue" | "orange" | "grey" }[] = [
    ...data.events
      .filter((e) => e.kind !== "stamp_removed" && e.kind !== "visit_deleted")
      .slice(0, 12)
      .map((e) => ({ at: e.created_at, ...timelineLine(e) })),
    ...data.offers.map((o) => ({ at: o.at, text: "Offer received", tone: "grey" as const })),
    ...(c.label === "slipping" && lastVisit && c.rhythm_days
      ? [{ at: new Date(Date.parse(lastVisit) + 2 * c.rhythm_days * DAY).toISOString(), text: "Marked as slipping", tone: "orange" as const }]
      : []),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const history = data.events.filter((e) => ["stamp", "visit", "redeem", "milestone", "stamp_removed", "card_reset"].includes(e.kind));
  const walletName = [data.wallet.apple && "Apple Wallet", data.wallet.google && "Google Wallet"].filter(Boolean).join(" + ");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/dashboard/customers" className="hover:text-fg">
              Customers
            </Link>{" "}
            / <span className="text-fg">{card.name}</span>
          </nav>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">Customer details</h1>
        </div>
        {offerButton}
      </header>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Customer information" right={<EditName id={card.id} name={card.name} />} />
            <div className="flex items-center gap-4">
              <Avatar name={card.name} size={52} tone={slipping ? "orange" : "blue"} />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">{card.name}</p>
                <p className="text-sm text-muted">Member since {date(card.created_at)}</p>
                <div className="mt-1.5">
                  <StatusPill label={c.label} />
                </div>
              </div>
            </div>
            <dl className="mt-5 divide-y divide-line text-sm">
              {[
                ["Phone", formatPhone(card.phone)],
                ["Email", data.email ?? "Not given"],
                ["Offers", walletName ? "Opted in" : "No wallet card yet"],
                ["Wallet", walletName || "Not added"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Recent activity" />
            {timeline.length === 0 ? (
              <Empty title="Nothing yet" />
            ) : (
              <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
                {timeline.map((t, i) => (
                  <li key={i} className="relative flex items-start gap-3 pl-6">
                    <span
                      className={`absolute left-0 top-1 size-[15px] rounded-full border-[3px] border-surface ${t.tone === "orange" ? "bg-orange" : t.tone === "blue" ? "bg-blue" : "bg-muted"}`}
                      aria-hidden="true"
                    />
                    <p className="flex-1 text-sm font-medium">{t.text}</p>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{date(t.at, { month: "short", day: "numeric" })}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
            <Stat label="Total visits" value={String(card.visits)} sub={firstVisit ? `since ${date(firstVisit, { month: "long", year: "numeric" })}` : "No visits yet"} />
            <Stat label="Usually every" value={c.rhythm_days ? `${Math.max(1, Math.round(c.rhythm_days))} days` : "—"} sub={c.rhythm_days ? "between visits" : "Needs 3+ visits"} />
            <Stat label="Rewards redeemed" value={String(data.rewardsRedeemed)} sub={card.progress.reward_text} />
            <Stat
              label="Last visit"
              value={c.days_since === null ? "—" : c.days_since === 0 ? "Today" : `${c.days_since} day${c.days_since === 1 ? "" : "s"}`}
              sub={lastVisit ? `${c.days_since ? "ago · " : ""}${date(lastVisit, { month: "short", day: "numeric" })}` : "No visits yet"}
              warn={slipping}
            />
          </div>

          <Card>
            <CardHeader title="Visits per month" subtitle="Last 12 months" />
            {data.visits.length === 0 ? (
              <Empty title="No visits yet" />
            ) : (
              <div className="flex h-40 items-end gap-1.5 sm:gap-2.5">
                {months.map((m) => {
                  const quiet = slipping && lastVisitMonth !== null && m.month > lastVisitMonth;
                  const label = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${m.month}-15T12:00:00Z`));
                  return (
                    <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${label}: ${m.n} visit${m.n === 1 ? "" : "s"}`}>
                      {m.n > 0 && <span className="font-mono text-[10px] text-muted">{m.n}</span>}
                      <span
                        className={`w-full max-w-9 rounded-t-[4px] ${quiet ? "bg-orange/35" : "bg-blue"}`}
                        style={{ height: quiet ? 4 : m.n ? `${(m.n / maxMonth) * 100}%` : 2, opacity: !quiet && !m.n ? 0.25 : undefined }}
                      />
                      <span className="font-mono text-[10px] text-muted">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Card progress" />
            <CardProgress card={card} owner={owner} />
          </Card>

          <Card>
            <CardHeader
              title="Visit history"
              right={
                owner && (
                  <a href={`/dashboard/customers/${card.id}/export`} className="inline-flex h-9 items-center rounded-[10px] border border-line px-3 text-sm font-semibold hover:border-blue/60">
                    Export CSV
                  </a>
                )
              }
            />
            {history.length === 0 ? (
              <Empty title="No visits yet" />
            ) : (
              <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Time</th>
                      <th className="pb-2 font-medium">What happened</th>
                      <th className="pb-2 font-medium">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {history.slice(0, 25).map((e) => {
                      const what = historyLine(e);
                      return (
                        <tr key={e.id}>
                          <td className="py-2.5 pr-3">{date(e.created_at, { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td className="py-2.5 pr-3 font-mono text-xs">{date(e.created_at, { hour: "numeric", minute: "2-digit" })}</td>
                          <td className="py-2.5 pr-3">
                            <span className="flex items-center gap-2">
                              <span className={`size-2 shrink-0 rounded-full ${what.tone === "orange" ? "bg-orange" : what.tone === "blue" ? "bg-blue" : "bg-muted"}`} aria-hidden="true" />
                              {what.text}
                            </span>
                          </td>
                          <td className="py-2.5 text-muted">{byLine(e)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, warn = false }: { label: string; value: string; sub: string; warn?: boolean }) {
  return (
    <div className={`rounded-[14px] border bg-surface p-4 ${warn ? "border-orange/45" : "border-line"}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-extrabold tabular-nums ${warn ? "text-orange" : ""}`}>{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>
    </div>
  );
}

function timelineLine(e: CardEvent): { text: string; tone: "blue" | "orange" | "grey" } {
  switch (e.kind) {
    case "joined":
      return { text: "Joined", tone: "blue" };
    case "redeem":
    case "milestone":
      return { text: `Redeemed ${e.detail ?? "a reward"}`, tone: "orange" };
    case "card_reset":
      return { text: "Card reset", tone: "grey" };
    case "reward_undone":
      return { text: "Reward undone", tone: "grey" };
    default:
      return { text: "Checked in", tone: "blue" };
  }
}

export function historyLine(e: CardEvent): { text: string; tone: "blue" | "orange" | "grey" } {
  switch (e.kind) {
    case "stamp":
      return { text: `Stamp · ${e.source === "staff" ? "added by staff" : "tap"}${e.detail ? ` (${e.detail})` : ""}`, tone: "blue" };
    case "visit":
      return { text: "Visit · card full, no stamp", tone: "grey" };
    case "redeem":
    case "milestone":
      return { text: `Reward redeemed · ${e.detail ?? "reward"}`, tone: "orange" };
    case "stamp_removed":
      return { text: "Stamp removed", tone: "grey" };
    case "card_reset":
      return { text: "Card reset to 0", tone: "grey" };
    default:
      return { text: e.kind, tone: "grey" };
  }
}

export const byLine = (e: CardEvent) => (e.source === "customer" ? "Customer" : e.actor_email ? e.actor_email.split("@")[0] : "Staff");
