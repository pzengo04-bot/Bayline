// What a wallet card says, shared by the Apple pass, the Google card and the Card tab previews.

import { isRewardReady, type Progress } from "@/lib/rewards";
import { stripLine } from "./strip";

export type PassVenue = {
  name: string;
  reward_type: "stamps" | "points";
  reward_text: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  pass_message?: string | null;
};

export type PassOffer = { text: string; short?: string | null; expires_at: string } | null | undefined;

/** The front-of-card offer line: the venue's short version, or the start of the full text. */
export function offerShort(offer: NonNullable<PassOffer>) {
  if (offer.short) return offer.short;
  const t = offer.text.replace(/\s+/g, " ").trim();
  const first = t.split(/(?<=[.!?])\s/)[0];
  const s = first.length <= OFFER_SHORT_MAX ? first : t;
  return s.length <= OFFER_SHORT_MAX ? s : `${s.slice(0, OFFER_SHORT_MAX - 1).replace(/\s+\S*$/, "")}…`;
}

export const OFFER_SHORT_MAX = 40;

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** The member number's digits, for the barcode. */
export const memberDigits = (serial: string) => memberNumber(serial).replace(" ", "");

/** "8247 1930": a short member number derived from the pass serial (stable, not secret). */
export function memberNumber(serial: string) {
  const n = parseInt(serial.replace(/-/g, "").slice(0, 12), 16) % 100_000_000; // 48 bits: exact in a JS number
  const s = String(n).padStart(8, "0");
  return `${s.slice(0, 4)} ${s.slice(4)}`;
}

export const progressValue = (p: Progress) =>
  p.reward_type === "stamps" ? `${p.stamps} of ${p.stamps_needed}` : `${p.points} / ${p.points_needed} pts`;


/** What the customer is working toward next: the milestone until it's reached, then the main reward. */
export function nextReward(p: Progress, rewardText: string) {
  const have = p.reward_type === "stamps" ? p.stamps : p.points;
  return p.milestone && have < p.milestone.at ? p.milestone.text : rewardText;
}

/**
 * The field row under the strip: REWARD (always the reward itself, e.g. "Free drink"; "ready" lives
 * in the strip banner) and OFFER only while an offer is active.
 */
export function cardFront(v: Pick<PassVenue, "reward_text">, p: Progress, offer?: { short: string } | null) {
  const reward = isRewardReady(p) ? v.reward_text : p.milestone?.ready ? p.milestone.text : nextReward(p, v.reward_text);
  return {
    fields: [
      { key: "reward", label: "REWARD", value: capitalize(reward) },
      ...(offer ? [{ key: "offer", label: "OFFER", value: offer.short }] : []),
    ],
  };
}

export function offerUntil(offer: NonNullable<PassOffer>, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone }).format(new Date(offer.expires_at));
}

/** "Free pitcher at stamp 5 · Free bay hour at stamp 10" (or points). */
export function rewardsSummary(v: Pick<PassVenue, "reward_text">, p: Progress) {
  const unit = p.reward_type === "stamps" ? "stamp" : "points";
  const at = (n: number) => (p.reward_type === "stamps" ? `at stamp ${n}` : `at ${n} ${unit}`);
  const goal = p.reward_type === "stamps" ? p.stamps_needed : p.points_needed;
  return [p.milestone ? `${capitalize(p.milestone.text)} ${at(p.milestone.at)}` : null, `${capitalize(v.reward_text)} ${at(goal)}`]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Pass Details (the back of the card), top to bottom. `platform` picks the right "turn off
 * notifications" steps. The offer section is always present (a placeholder when there's none),
 * because iPhone only announces a field whose value changes, never one that newly appears.
 */
export function backSections(
  v: PassVenue,
  p: Progress,
  offer: PassOffer,
  platform: "apple" | "google",
  timeZone = "America/New_York",
  member?: { name: string; number: string },
) {
  const sections: { key: string; label: string; value: string }[] = [];
  sections.push(
    offer
      ? { key: "offer", label: "Latest offer", value: offer.text }
      : { key: "offer", label: "Latest offer", value: `No current offers. New offers from ${v.name} show up here.` },
  );
  if (offer) sections.push({ key: "offer_until", label: "Offer valid until", value: offerUntil(offer, timeZone) });
  // Always present, so a reward turning ready can alert on the lock screen ("Free drink ready! Show staff").
  sections.push({ key: "status", label: "Your card", value: stripLine({ progress: p }).text });
  sections.push({ key: "rewards", label: "Rewards", value: rewardsSummary(v, p) });
  sections.push({
    key: "how",
    label: "How it works",
    value:
      p.reward_type === "stamps"
        ? `Tap the stand at ${v.name} each visit to earn a stamp.`
        : `Tap the stand at ${v.name} each visit to earn points.`,
  });
  if (member) sections.push({ key: "member", label: "Member", value: `${member.name} · ${member.number}` });
  if (v.pass_message) sections.push({ key: "message", label: `From ${v.name}`, value: v.pass_message });
  if (v.address) sections.push({ key: "address", label: "Address", value: v.address });
  if (v.phone) sections.push({ key: "phone", label: "Phone", value: formatUsPhone(v.phone) });
  if (v.website) sections.push({ key: "website", label: "Website", value: v.website });
  sections.push({
    key: "notifications",
    label: "Notifications",
    value:
      platform === "apple"
        ? "To turn off offer notifications, tap ⋯ at the top right, choose Pass Details, then turn off Allow Notifications."
        : "To turn off notifications, open this pass, tap ⋮ at the top right, then turn off notifications.",
  });
  sections.push({ key: "powered", label: "", value: "Powered by Bayline · getbayline.app" });
  return sections;
}

function formatUsPhone(e164: string) {
  const d = e164.replace(/^\+1/, "");
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}
