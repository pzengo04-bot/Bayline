import "server-only";
import { importPKCS8, SignJWT } from "jose";
import { siteUrl } from "@/lib/env";
import type { PassData } from "./apple";
import { backSections, cardFront, memberDigits, memberNumber, offerShort, progressValue } from "./pass-content";
import { googleConfig } from "./config";

// Google Wallet loyalty cards: one class per venue (look and program), one object per customer
// (progress). Customers add a card through a signed "save" link; later changes PATCH the object.

const API = "https://walletobjects.googleapis.com/walletobjects/v1";

export const classId = (issuerId: string, venueId: string) => `${issuerId}.venue_${venueId.replace(/-/g, "")}`;
export const objectId = (issuerId: string, serial: string) => `${issuerId}.card_${serial.replace(/-/g, "")}`;

type Cfg = NonNullable<ReturnType<typeof googleConfig>>;

let cachedToken: { value: string; expires: number } | null = null;

/** OAuth access token for the service account (cached until shortly before it expires). */
async function accessToken(cfg: Cfg) {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const key = await importPKCS8(cfg.privateKey, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/wallet_object.issuer" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(cfg.clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`Google token error ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function api(cfg: Cfg, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken(cfg)}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return res;
}

export function loyaltyClass(cfg: Cfg, d: Pick<PassData, "venue">) {
  const v = d.venue;
  return {
    id: classId(cfg.issuerId, v.id),
    issuerName: v.name,
    programName: `${v.name} Rewards`,
    programLogo: {
      sourceUri: { uri: `${siteUrl()}/api/wallet/image/logo?venue=${v.id}` },
      contentDescription: { defaultValue: { language: "en-US", value: `${v.name} logo` } },
    },
    hexBackgroundColor: v.card_bg,
    reviewStatus: "UNDER_REVIEW",
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
  };
}

export function loyaltyObject(cfg: Cfg, d: PassData) {
  const v = d.venue;
  const p = d.progress;
  const member = memberNumber(d.serial);
  const links = [
    ...(v.website ? [{ id: "website", uri: v.website, description: "Website" }] : []),
    ...(v.phone ? [{ id: "phone", uri: `tel:${v.phone}`, description: "Call" }] : []),
    { id: "card", uri: `${siteUrl()}/v/${v.slug}`, description: "Your card" },
  ];
  return {
    id: objectId(cfg.issuerId, d.serial),
    classId: classId(cfg.issuerId, v.id),
    state: "ACTIVE",
    accountId: member,
    accountName: d.first_name,
    loyaltyPoints: {
      label: p.reward_type === "stamps" ? "Visits" : "Points",
      balance: { string: progressValue(p) },
    },
    secondaryLoyaltyPoints: { label: "Reward", balance: { string: cardFront(v, p).fields[0].value } },
    barcode: { type: "CODE_128", value: memberDigits(d.serial), alternateText: `Member ${member}` },
    heroImage: {
      sourceUri: {
        uri: `${siteUrl()}/api/wallet/image/strip?serial=${d.serial}&d=3&v=${encodeURIComponent(d.updated_at)}`,
      },
      contentDescription: { defaultValue: { language: "en-US", value: progressValue(p) } },
    },
    // The hero image carries stamps and the offer banner; details list the offer and the rest.
    textModulesData: [
      ...(d.offer ? [{ id: "offer_short", header: "Offer", body: offerShort(d.offer) }] : []),
      ...backSections(v, p, d.offer, "google", v.timezone, { name: d.first_name, number: member })
        .filter((s) => s.label && !["address", "phone", "website"].includes(s.key))
        .map((s) => ({ id: s.key, header: s.label, body: s.value })),
    ],
    linksModuleData: { uris: links },
    ...(v.address
      ? { infoModuleData: { labelValueRows: [{ columns: [{ label: "Address", value: v.address }] }], showLastUpdateTime: false } }
      : {}),
  };
}

/** "Add to Google Wallet" link: a signed JWT that creates the class (if new) and the customer's card. */
export async function googleSaveUrl(d: PassData) {
  const cfg = googleConfig();
  if (!cfg) throw new Error("Google Wallet is not configured");
  const key = await importPKCS8(cfg.privateKey, "RS256");
  const jwt = await new SignJWT({
    typ: "savetowallet",
    origins: [siteUrl()],
    payload: { loyaltyClasses: [loyaltyClass(cfg, d)], loyaltyObjects: [loyaltyObject(cfg, d)] },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(cfg.clientEmail)
    .setAudience("google")
    .setIssuedAt()
    .sign(key);
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

/** Push a customer's latest progress to their Google card. A 404 means they never saved it. */
export async function updateGoogleObject(d: PassData) {
  const cfg = googleConfig();
  if (!cfg) return;
  const obj = loyaltyObject(cfg, d);
  const res = await api(cfg, "PATCH", `/loyaltyObject/${encodeURIComponent(obj.id)}`, obj);
  if (!res.ok && res.status !== 404) console.warn("Google object update", res.status, await res.text());
}

/** Retire a customer's Google card (cleared demo guests). */
export async function voidGoogleObject(serial: string) {
  const cfg = googleConfig();
  if (!cfg) return;
  const id = objectId(cfg.issuerId, serial);
  const res = await api(cfg, "PATCH", `/loyaltyObject/${encodeURIComponent(id)}`, { state: "INACTIVE" });
  if (!res.ok && res.status !== 404) console.warn("Google void", res.status, await res.text());
}

/** Push a venue's look (name, logo, color) to its Google class. */
export async function updateGoogleClass(d: Pick<PassData, "venue">) {
  const cfg = googleConfig();
  if (!cfg) return;
  const cls = loyaltyClass(cfg, d);
  const res = await api(cfg, "PATCH", `/loyaltyClass/${encodeURIComponent(cls.id)}`, cls);
  if (!res.ok && res.status !== 404) console.warn("Google class update", res.status, await res.text());
}

/**
 * Show an offer on a customer's Google card with a phone notification. Google limits notifications
 * per pass; if that's hit, the message is still added, silently. Returns what happened.
 */
export async function sendGoogleMessage(
  serial: string,
  header: string,
  body: string,
  expiresAt?: string,
): Promise<"notified" | "silent" | "not_saved" | "failed"> {
  const cfg = googleConfig();
  if (!cfg) return "failed";
  const id = objectId(cfg.issuerId, serial);
  const post = (messageType: string) =>
    api(cfg, "POST", `/loyaltyObject/${encodeURIComponent(id)}/addMessage`, {
      message: {
        header,
        body,
        id: `offer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        messageType,
        // Matches the offer's end date: Google hides the message after it.
        ...(expiresAt ? { displayInterval: { start: { date: new Date().toISOString() }, end: { date: expiresAt } } } : {}),
      },
    });
  let res = await post("TEXT_AND_NOTIFY");
  if (res.ok) return "notified";
  if (res.status === 404) return "not_saved";
  const detail = await res.text();
  if (res.status === 429 || /notif|limit|quota/i.test(detail)) {
    console.warn("Google notification limit hit; adding the message without a notification", serial.slice(0, 8));
    res = await post("TEXT");
    if (res.ok) return "silent";
  }
  console.warn("Google addMessage failed", res.status, detail.slice(0, 300));
  return "failed";
}
