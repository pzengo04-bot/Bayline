// Offer audiences and message templates for wallet-card offers (Phase 2a).

import type { Label } from "./labels";
import type { VenueType } from "./auth";

export const OFFER_MAX = 120;

export const OFFER_AUDIENCES = [
  { id: "slipping", label: "Slipping regulars", hint: "Away more than twice their usual time" },
  { id: "regulars", label: "Regulars + VIPs", hint: "Your most loyal customers" },
  { id: "everyone", label: "Everyone with a card", hint: "All customers who added the wallet card" },
] as const;
export type OfferAudience = (typeof OFFER_AUDIENCES)[number]["id"] | "demo_guests";

export const audienceIncludes = (audience: OfferAudience, label: Label) =>
  audience === "everyone" ||
  (audience === "slipping" && label === "slipping") ||
  (audience === "regulars" && (label === "regular" || label === "vip")) ||
  // Real people who joined the demo card are in every demo audience.
  label === "demo_guest";

const PLACE: Record<VenueType, string> = {
  golf_sim: "Bays are",
  pickleball: "Courts are",
  batting_cages: "Cages are",
  cafe: "Tables are",
  barbershop: "Chairs are",
  fitness: "Classes are",
  pet: "We're",
  car_wash: "Bays are",
  dessert: "We're",
  other: "We're",
};

export const OFFER_TEMPLATES = [
  { id: "win_back", label: "We miss you" },
  { id: "slow_hours", label: "Quiet hours" },
  { id: "reward", label: "Reward nudge" },
] as const;
export type OfferTemplate = (typeof OFFER_TEMPLATES)[number]["id"];

/** The short line for the front of the card (max 40 characters). */
export function offerTemplateShort(id: OfferTemplate, slow: string | null) {
  switch (id) {
    case "win_back":
      return "Bonus stamp on any visit this week";
    case "slow_hours":
      return slow && slow.length <= 30 ? `Wide open ${slow}` : "Quiet hours: come play!";
    case "reward":
      return "You're close to your reward!";
  }
}

export function offerTemplate(id: OfferTemplate, venue: { name: string; type: VenueType; reward_text: string }, slow: string | null) {
  switch (id) {
    case "win_back":
      return `We miss you at ${venue.name}! Come back this week for a bonus stamp.`;
    case "slow_hours":
      return `${PLACE[venue.type]} wide open ${slow ?? "weekday afternoons"}. Come play!`;
    case "reward":
      return `You're close to a ${venue.reward_text} at ${venue.name}. See you soon!`;
  }
}
