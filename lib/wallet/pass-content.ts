// What a wallet card says, shared by the Apple pass, the Google card and the Card tab previews.

import { isRewardReady, type Progress } from "@/lib/rewards";
import type { Milestone } from "./strip";

export type PassVenue = {
  name: string;
  reward_type: "stamps" | "points";
  reward_text: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  pass_message?: string | null;
};

export type PassOffer = { text: string; expires_at: string } | null | undefined;

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "8247 1930": a short member number derived from the pass serial (stable, not secret). */
export function memberNumber(serial: string) {
  const n = parseInt(serial.replace(/-/g, "").slice(0, 12), 16) % 100_000_000; // 48 bits: exact in a JS number
  const s = String(n).padStart(8, "0");
  return `${s.slice(0, 4)} ${s.slice(4)}`;
}

export const progressValue = (p: Progress) =>
  p.reward_type === "stamps" ? `${p.stamps} of ${p.stamps_needed}` : `${p.points} / ${p.points_needed} pts`;

export const rewardValue = (p: Progress, rewardText: string) => (isRewardReady(p) ? "Ready! Show staff" : capitalize(rewardText));

/** What the customer is working toward next: the milestone until it's reached, then the main reward. */
export function nextReward(p: Progress, rewardText: string, milestone?: Milestone | null) {
  const have = p.reward_type === "stamps" ? p.stamps : p.points;
  return milestone && have < milestone.at ? milestone.text : rewardText;
}

/**
 * The field row under the strip: REWARD always, OFFER only while an offer is active. Both carry the
 * lock-screen alerts, because iPhone reliably announces changes to front fields.
 */
export function cardFront(v: Pick<PassVenue, "reward_text">, p: Progress, milestone?: Milestone | null, offer?: { short: string } | null) {
  const reward = isRewardReady(p)
    ? "Ready! Show staff"
    : milestone?.ready
      ? `${capitalize(milestone.text)} ready! Show staff`
      : capitalize(nextReward(p, v.reward_text, milestone));
  return {
    fields: [
      { key: "reward", label: "REWARD", value: reward },
      ...(offer ? [{ key: "offer", label: "OFFER", value: offer.short }] : []),
    ],
  };
}

export function offerUntil(offer: NonNullable<PassOffer>, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone }).format(new Date(offer.expires_at));
}

/** The back of the card, top to bottom. `platform` picks the right "turn off notifications" steps. */
export function backSections(
  v: PassVenue,
  p: Progress,
  offer: PassOffer,
  platform: "apple" | "google",
  timeZone = "America/New_York",
) {
  const sections: { key: string; label: string; value: string }[] = [];
  sections.push(
    offer
      ? { key: "offer", label: "Latest offer", value: offer.text }
      : { key: "offer", label: "Latest offer", value: `No current offers. New offers from ${v.name} show up here.` },
  );
  if (offer) sections.push({ key: "offer_until", label: "Offer valid until", value: offerUntil(offer, timeZone) });
  sections.push({
    key: "how",
    label: "How it works",
    value:
      p.reward_type === "stamps"
        ? `Tap the stand at ${v.name} each visit to earn a stamp. ${p.stamps_needed} stamps = ${v.reward_text}.`
        : `Tap the stand at ${v.name} each visit to earn points. ${p.points_needed} points = ${v.reward_text}.`,
  });
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
