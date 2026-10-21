import "server-only";
import { importPKCS8, SignJWT } from "jose";
import { siteUrl } from "@/lib/env";
import { isRewardReady } from "@/lib/rewards";
import { type PassData, progressValue } from "./apple";
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
  return {
    id: objectId(cfg.issuerId, d.serial),
    classId: classId(cfg.issuerId, v.id),
    state: "ACTIVE",
    accountId: d.serial,
    accountName: d.first_name,
    loyaltyPoints: {
      label: p.reward_type === "stamps" ? "Visits" : "Points",
      balance: { string: progressValue(p) },
    },
    secondaryLoyaltyPoints: {
      label: "Reward",
      balance: { string: isRewardReady(p) ? "Ready, show staff" : v.reward_text },
    },
    barcode: { type: "QR_CODE", value: d.serial },
    heroImage: {
      sourceUri: {
        uri: `${siteUrl()}/api/wallet/image/strip?serial=${d.serial}&v=${encodeURIComponent(d.updated_at)}`,
      },
      contentDescription: { defaultValue: { language: "en-US", value: progressValue(p) } },
    },
    textModulesData: [
      {
        id: "message",
        header: `From ${v.name}`,
        body: v.pass_message ?? "Tap the stand or scan the code at the front desk to earn rewards.",
      },
    ],
    linksModuleData: {
      uris: [{ id: "card", uri: `${siteUrl()}/v/${v.slug}`, description: "Your card" }],
    },
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

/** Push a venue's look (name, logo, color) to its Google class. */
export async function updateGoogleClass(d: Pick<PassData, "venue">) {
  const cfg = googleConfig();
  if (!cfg) return;
  const cls = loyaltyClass(cfg, d);
  const res = await api(cfg, "PATCH", `/loyaltyClass/${encodeURIComponent(cls.id)}`, cls);
  if (!res.ok && res.status !== 404) console.warn("Google class update", res.status, await res.text());
}

/** Phase 2: show an offer on a customer's Google card with a phone notification. */
export async function sendGoogleMessage(serial: string, header: string, body: string) {
  const cfg = googleConfig();
  if (!cfg) return;
  const id = objectId(cfg.issuerId, serial);
  const res = await api(cfg, "POST", `/loyaltyObject/${encodeURIComponent(id)}/addMessage`, {
    message: { header, body, id: `msg_${Date.now()}`, messageType: "TEXT_AND_NOTIFY" },
  });
  if (!res.ok && res.status !== 404) console.warn("Google addMessage", res.status, await res.text());
}
