// The paid plan, kept here while the site shows only the founding offer. Not shown anywhere yet;
// bring it back by rendering it on the homepage (and in the terms) when pricing goes public.
export const PRICING = {
  perLocation: 49,
  extraLocation: 15,
  included: [
    "Branded wallet card (Apple + Google)",
    "NFC stand, yours to keep",
    "Stamps or points",
    "Custom stamp icons",
    "Halfway rewards",
    "Insights & the Monday Brief",
    "Unlimited offers to wallet cards",
  ],
  foundingOffer: "First 10 businesses: 60 days free, then keep $49/month for life.",
} as const;
