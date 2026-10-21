// One description of a customer's card, used by the Apple pass, the Google card and the Card tab
// previews, so the previews can't drift from what customers see.

import type { Progress } from "@/lib/rewards";
import { backSections, cardFront, memberDigits, memberNumber, offerShort } from "./pass-content";
import { stampIconFor } from "./stamp-icons";
import type { StripState } from "./strip";

/** Everything a pass shows, from the wallet_pass_data database function. */
export type PassData = {
  customer_id: string;
  serial: string;
  first_name: string;
  apple_auth_token: string;
  updated_at: string;
  venue: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    card_bg: string;
    card_fg: string;
    card_accent: string;
    pass_message: string | null;
    reward_type: "stamps" | "points";
    reward_text: string;
    logo_text?: string | null;
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    timezone?: string;
    type?: string | null;
    stamp_icon?: string | null;
  };
  progress: Progress;
  /** The active offer for this customer, if any: short line on the front, full text on the back. */
  offer?: { text: string; short?: string | null; sent_at: string; expires_at: string } | null;
};

export type PassField = { key: string; label: string; value: string; changeMessage?: string };

export type PassModel = {
  /** Text beside the logo: the venue's choice, or its name when there's no logo. */
  logoText: string | null;
  header: PassField[];
  /** REWARD, and OFFER while an offer is active. */
  fields: PassField[];
  back: PassField[];
  barcode: { message: string; altText: string };
  strip: StripState;
};

/**
 * Lock-screen alerts: iPhone announces a field only when its value changes, never when it first
 * appears, so alerts ride on back fields that are always present: "offer" (new offers) and "status"
 * (a reward turning ready). Nothing else carries a changeMessage, so stamps arrive quietly.
 */
export function passModel(d: PassData, opts: { hasLogo: boolean; platform?: "apple" | "google" }): PassModel {
  const v = d.venue;
  const p = d.progress;
  const short = d.offer ? offerShort(d.offer) : null;
  const member = { name: d.first_name, number: memberNumber(d.serial) };
  const back = backSections(v, p, d.offer, opts.platform ?? "apple", v.timezone, member);
  const ready = back.find((s) => s.key === "status")?.value.includes("ready!") ?? false;
  return {
    logoText: v.logo_text || (opts.hasLogo ? null : v.name),
    header: [{ key: "member_name", label: "MEMBER", value: d.first_name }],
    fields: cardFront(v, p, short ? { short } : null).fields,
    back: back.map((s) => ({
      ...s,
      ...((s.key === "offer" && d.offer) || (s.key === "status" && ready) ? { changeMessage: "%@" } : {}),
    })),
    barcode: { message: memberDigits(d.serial), altText: `Member ${member.number}` },
    strip: { progress: p, offerShort: short, bg: v.card_bg, fg: v.card_fg, accent: v.card_accent, icon: stampIconFor(v) },
  };
}
