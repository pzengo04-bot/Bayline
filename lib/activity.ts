// Plain-language lines for card_events: the home page's Recent activity and a customer's history.

import type { RewardType } from "./rewards";

export type CardEvent = {
  id: string;
  customer_id: string;
  kind: "joined" | "stamp" | "visit" | "redeem" | "milestone" | "stamp_removed" | "card_reset" | "visit_deleted" | "reward_undone";
  source: "customer" | "staff";
  actor_email: string | null;
  detail: string | null;
  created_at: string;
  customers?: { name: string } | null;
};

export const CARD_EVENT_COLUMNS = "id, customer_id, kind, source, actor_email, detail, created_at, customers(name)";

/** "Priya S. redeemed a free bay hour" (with the name) or "Redeemed a free bay hour" (without). */
export function eventText(e: CardEvent, rewardType: RewardType, name?: string) {
  const who = name ?? null;
  const stamp = rewardType === "stamps" ? "a stamp" : "points";
  const lines: Record<CardEvent["kind"], [string, string]> = {
    joined: [`${who} joined`, "Joined"],
    stamp: e.source === "customer" ? [`${who} checked in`, `Checked in, got ${stamp}`] : [`${who} got ${stamp}`, `Got ${stamp}`],
    visit: [`${who} checked in, no stamp (card full)`, "Checked in, no stamp (card full)"],
    redeem: [`${who} redeemed ${e.detail ?? "a reward"}`, `Redeemed ${e.detail ?? "a reward"}`],
    milestone: [`${who} redeemed ${e.detail ?? "a reward"}`, `Redeemed ${e.detail ?? "a reward"}`],
    stamp_removed: [`Stamp removed from ${who}`, "Stamp removed"],
    card_reset: [`${who}'s card reset to 0`, "Card reset to 0"],
    visit_deleted: [`A visit by ${who} was deleted`, "Visit deleted"],
    reward_undone: [`A reward for ${who} was undone`, "Reward undone"],
  };
  return lines[e.kind][who ? 0 : 1];
}

/** Who did it: "tap at the stand" or the staff account. */
export function eventActor(e: CardEvent) {
  if (e.source === "customer") return e.kind === "joined" ? "at the stand" : "tap at the stand";
  return e.actor_email ? `by ${e.actor_email}` : "by staff";
}

export const isRewardEvent = (e: CardEvent) => e.kind === "redeem" || e.kind === "milestone";

/** "just now", "5 min ago", "3 h ago", "Oct 28" */
export function timeAgo(iso: string, timeZone: string, now = Date.now()) {
  const mins = Math.round((now - Date.parse(iso)) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(new Date(iso));
}
