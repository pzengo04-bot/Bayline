import "server-only";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import { siteUrl } from "@/lib/env";
import type { Progress } from "@/lib/rewards";
import { backSections, cardFront, memberDigits, memberNumber, offerShort } from "./pass-content";
import { appleConfig } from "./config";
import { STRIP_H, STRIP_W, stripSvg } from "./strip";
import { outlineText } from "./strip-font";

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
  };
  progress: Progress;
  /** The active offer for this customer, if any: short line on the front, full text on the back. */
  offer?: { text: string; short?: string | null; sent_at: string; expires_at: string } | null;
};

const rgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;


export async function fetchLogo(url: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Fallback mark for venues without a logo: their initials on the card color. */
export function initialsSvg(name: string, bg: string, fg: string, size: number, radius = 0.22) {
  const initials = name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * radius}" fill="${bg}"/><text x="50%" y="62%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${size * 0.42}" fill="${fg}">${initials}</text></svg>`,
  );
}

/** What the strip image shows for this customer (shared with Google's hero image). */
export function stripState(d: PassData) {
  return {
    progress: d.progress,
    offerShort: d.offer ? offerShort(d.offer) : null,
    bg: d.venue.card_bg,
    fg: d.venue.card_fg,
    accent: d.venue.card_accent,
  };
}

/** Icon (lock screen / notifications), logo (top-left of the card) and strip (punch card) images. */
async function passImages(d: PassData) {
  const v = d.venue;
  const logo = await fetchLogo(v.logo_url);
  const files: Record<string, Buffer> = {};

  for (const [suffix, scale] of [["", 1], ["@2x", 2], ["@3x", 3]] as const) {
    const icon = 29 * scale;
    files[`icon${suffix}.png`] = logo
      ? await sharp({ create: { width: icon, height: icon, channels: 4, background: v.card_bg } })
          .composite([{ input: await sharp(logo).resize(Math.round(icon * 0.8), Math.round(icon * 0.8), { fit: "inside" }).toBuffer(), gravity: "center" }])
          .png()
          .toBuffer()
      : await sharp(initialsSvg(v.name, v.card_bg, v.card_fg, icon)).png().toBuffer();

    if (logo) {
      // Apple's logo area is up to 160×50 points; render each density from the full-size source.
      files[`logo${suffix}.png`] = await sharp(logo)
        .resize(160 * scale, 50 * scale, { fit: "inside", kernel: "lanczos3" })
        .png({ compressionLevel: 9 })
        .toBuffer();
    }

    files[`strip${suffix}.png`] = await sharp(Buffer.from(stripSvg(stripState(d), outlineText, scale)))
      .resize(STRIP_W * scale, STRIP_H * scale)
      .png({ compressionLevel: 9 })
      .toBuffer();
  }
  return { files, hasLogo: Boolean(logo) };
}

/** Build and sign a .pkpass for one customer. Throws if Apple credentials aren't configured. */
export async function buildApplePass(d: PassData, opts: { voided?: boolean } = {}): Promise<Buffer> {
  const cfg = appleConfig();
  if (!cfg) throw new Error("Apple Wallet is not configured");
  const v = d.venue;
  const p = d.progress;
  const { files, hasLogo } = await passImages(d);

  const pass = new PKPass(
    files,
    { wwdr: cfg.wwdr, signerCert: cfg.cert, signerKey: cfg.key, signerKeyPassphrase: cfg.keyPassphrase },
    {
      formatVersion: 1,
      passTypeIdentifier: cfg.passTypeId,
      teamIdentifier: cfg.teamId,
      serialNumber: d.serial,
      organizationName: v.name,
      description: `${v.name} rewards card`,
      // Text beside the logo: the venue's choice (e.g. "Bayline" next to a symbol), or its name if there's no logo.
      ...(v.logo_text ? { logoText: v.logo_text } : hasLogo ? {} : { logoText: v.name }),
      backgroundColor: rgb(v.card_bg),
      foregroundColor: rgb(v.card_fg),
      labelColor: rgb(v.card_fg),
      sharingProhibited: true,
      // Apple calls these to register devices and fetch updated passes.
      webServiceURL: `${siteUrl()}/api/wallet/apple`,
      authenticationToken: d.apple_auth_token,
      // Cleared demo guests: Wallet greys the card out and stops expecting updates.
      ...(opts.voided ? { voided: true } : {}),
    },
  );
  pass.type = "storeCard";

  // Front: no header fields (the strip image shows progress and the offer banner), then REWARD and,
  // while an offer is active, OFFER. REWARD alerts only when a reward becomes ready; the offer alert
  // rides on the back's offer field, which is always present (iPhone ignores fields that newly appear).
  const front = cardFront(v, p, d.offer ? { short: offerShort(d.offer) } : null);
  for (const f of front.fields) {
    const ready = f.key === "reward" && /ready!/i.test(f.value);
    pass.secondaryFields.push({
      // Keys are unique across the whole pass; the back already has "offer".
      key: f.key === "offer" ? "offer_front" : f.key,
      label: f.label,
      value: f.value,
      ...(f.key === "offer" ? { textAlignment: "PKTextAlignmentRight" as const } : {}),
      ...(ready ? { changeMessage: "%@" } : {}),
    });
  }

  const member = { name: d.first_name, number: memberNumber(d.serial) };
  for (const section of backSections(v, p, d.offer, "apple", v.timezone, member)) {
    pass.backFields.push({
      key: section.key,
      label: section.label.toUpperCase(),
      value: section.value,
      ...(section.key === "offer" && d.offer ? { changeMessage: "%@" } : {}),
    });
  }
  // Slim Code 128 of the member number (staff find customers by phone; nothing needs the long card ID).
  pass.setBarcodes({
    message: memberDigits(d.serial),
    format: "PKBarcodeFormatCode128",
    messageEncoding: "iso-8859-1",
    altText: `Member ${member.number}`,
  });

  return pass.getAsBuffer();
}
