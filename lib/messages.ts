// Message templates and audiences for the Messages page. Sending happens outside Bayline for now.

import type { RewardSettings } from "./rewards";
import type { VenueType } from "./auth";

export const STOP_LINE = "Reply STOP to opt out.";

export const AUDIENCES = [
  { id: "gone_quiet", label: "Gone quiet", hint: "3+ visits, not seen in 3+ weeks" },
  { id: "regulars", label: "Regulars", hint: "3+ visits, seen in the last 3 weeks" },
  { id: "all", label: "All opted-in customers", hint: "Everyone who agreed to texts" },
] as const;
export type AudienceId = (typeof AUDIENCES)[number]["id"];

export const TEMPLATES = [
  { id: "win_back", label: "Win-back" },
  { id: "off_peak", label: "Off-peak offer" },
  { id: "reward_reminder", label: "Reward reminder" },
] as const;
export type TemplateId = (typeof TEMPLATES)[number]["id"];

const UNIT: Record<VenueType, string> = {
  golf_sim: "bay hour",
  pickleball: "court hour",
  batting_cages: "cage session",
  cafe: "drink",
  barbershop: "cut",
  fitness: "class",
  pet: "visit",
  car_wash: "wash",
  dessert: "treat",
  other: "visit",
};

export function templateText(
  id: TemplateId,
  venue: RewardSettings & { name: string; type: VenueType },
  slot: string | null,
) {
  const unit = UNIT[venue.type];
  // Plain hyphens: one en dash makes a text cost 3x as many SMS segments.
  slot = slot?.replace(/[–—]/g, "-") ?? null;
  switch (id) {
    case "win_back":
      return `We miss you at ${venue.name}! Come back in the next 2 weeks for 20% off your next ${unit}. Show this text at the front desk.`;
    case "off_peak":
      return `${slot ?? "Weekday afternoons"} is wide open at ${venue.name}. Come in this week for 20% off your ${unit}. Show this text at the desk.`;
    case "reward_reminder":
      return venue.reward_type === "stamps"
        ? `You're close to a ${venue.reward_text} at ${venue.name}! Every visit earns a stamp. Just check in with your phone number.`
        : `Your points are adding up at ${venue.name}! ${venue.points_needed} points gets you a ${venue.reward_text}. Ask the front desk for your balance.`;
  }
}

/** The full text as it should be sent: the owner's message plus the opt-out line. */
export function withStopLine(body: string) {
  const trimmed = body.trim();
  return trimmed.toLowerCase().includes("reply stop") ? trimmed : `${trimmed} ${STOP_LINE}`;
}

/** Text-message segments: 160 characters each, or 70 if the message has emoji or special characters. */
export function smsSegments(text: string) {
  const gsm = /^[\n\r\x20-\x7E£¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ¤¡ÄÖÑÜ§¿äöñüà€]*$/.test(text);
  const [single, multi] = gsm ? [160, 153] : [70, 67];
  return text.length <= single ? 1 : Math.ceil(text.length / multi);
}
