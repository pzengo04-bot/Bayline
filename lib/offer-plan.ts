// Who an offer would reach: audience match, customers without a wallet card, and the per-venue
// weekly limit (off for the demo venue). Pure, so it's unit-tested. Run on the server for every
// preview and again at send time.

import type { Venue } from "./auth";
import type { CustomerInsight } from "./labels";
import { audienceIncludes, type OfferAudience } from "./offer-templates";

export type PlannedCustomer = Pick<CustomerInsight, "id" | "name" | "label"> & {
  serial: string;
  apple: boolean;
  google: boolean;
  lastOfferAt: string | null;
};

export type OfferPlan = {
  audience: OfferAudience;
  matched: number;
  deliver: PlannedCustomer[];
  cooldown: PlannedCustomer[];
  noCard: PlannedCustomer[];
};

export function planOffer(
  venue: Pick<Venue, "is_demo" | "offer_cooldown_days">,
  customers: PlannedCustomer[],
  audience: OfferAudience,
  now = Date.now(),
): OfferPlan {
  const matched = customers.filter((c) =>
    audience === "demo_guests" ? c.label === "demo_guest" : audienceIncludes(audience, c.label),
  );
  const cutoff = now - venue.offer_cooldown_days * 86_400_000;
  const plan: OfferPlan = { audience, matched: matched.length, deliver: [], cooldown: [], noCard: [] };
  for (const c of matched) {
    if (!c.apple && !c.google) plan.noCard.push(c);
    else if (!venue.is_demo && c.lastOfferAt && Date.parse(c.lastOfferAt) > cutoff) plan.cooldown.push(c);
    else plan.deliver.push(c);
  }
  return plan;
}
