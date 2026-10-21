import "server-only";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import { siteUrl } from "@/lib/env";
import type { Progress } from "@/lib/rewards";
import { backSections, memberNumber, progressValue, rewardValue } from "./pass-content";
import { appleConfig } from "./config";
import { stripSvg } from "./strip";

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
  /** Latest offer sent to this customer (Phase 2a), shown on the back with a lock-screen notification. */
  offer?: { text: string; sent_at: string; expires_at: string } | null;
};

const rgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

export { progressValue } from "./pass-content";

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

    const p = d.progress;
    const svg = stripSvg(
      {
        rewardType: p.reward_type,
        stamps: p.stamps,
        stampsNeeded: p.stamps_needed,
        points: p.points,
        pointsNeeded: p.points_needed,
        bg: v.card_bg,
        fg: v.card_fg,
        accent: v.card_accent,
      },
      375,
      123,
    );
    files[`strip${suffix}.png`] = await sharp(Buffer.from(svg), { density: 72 * scale })
      .resize(375 * scale, 123 * scale)
      .png()
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

  // Front: progress in the header ("NEW OFFER" beside it while an offer is active), then just the
  // reward and the member's first name under the stamp strip.
  if (d.offer) pass.headerFields.push({ key: "offer_flag", label: "", value: "NEW OFFER" });
  pass.headerFields.push({
    key: "progress",
    label: p.reward_type === "stamps" ? "VISITS" : "POINTS",
    value: progressValue(p),
    changeMessage: p.reward_type === "stamps" ? "Stamp added: %@" : "Points: %@",
  });
  pass.secondaryFields.push(
    { key: "reward", label: "REWARD", value: rewardValue(p, v.reward_text) },
    { key: "member", label: "MEMBER", value: d.first_name, textAlignment: "PKTextAlignmentRight" },
  );

  // Back: the offer first. It's always present (a placeholder when there's none), because iPhone only
  // announces a field whose value changes, never one that newly appears. changeMessage "%@" puts the
  // new offer text on the lock screen.
  for (const section of backSections(v, p, d.offer, "apple", v.timezone)) {
    pass.backFields.push({
      key: section.key,
      label: section.label.toUpperCase(),
      value: section.value,
      ...(section.key === "offer" && d.offer ? { changeMessage: "%@" } : {}),
    });
  }
  pass.setBarcodes({
    message: d.serial,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: `Member ${memberNumber(d.serial)}`,
  });

  return pass.getAsBuffer();
}
