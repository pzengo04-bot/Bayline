import "server-only";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import { siteUrl } from "@/lib/env";
import { isRewardReady, type Progress } from "@/lib/rewards";
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
  };
  progress: Progress;
};

const rgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

export const progressValue = (p: Progress) =>
  p.reward_type === "stamps" ? `${p.stamps} of ${p.stamps_needed}` : `${p.points} / ${p.points_needed} pts`;

async function fetchLogo(url: string | null) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Fallback mark for venues without a logo: their initials on the card color. */
function initialsSvg(name: string, bg: string, fg: string, size: number) {
  const initials = name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase();
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${bg}"/><text x="50%" y="62%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${size * 0.42}" fill="${fg}">${initials}</text></svg>`,
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
      files[`logo${suffix}.png`] = await sharp(logo).resize(160 * scale, 50 * scale, { fit: "inside" }).png().toBuffer();
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
export async function buildApplePass(d: PassData): Promise<Buffer> {
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
      ...(hasLogo ? {} : { logoText: v.name }),
      backgroundColor: rgb(v.card_bg),
      foregroundColor: rgb(v.card_fg),
      labelColor: rgb(v.card_fg),
      sharingProhibited: true,
      // Apple calls these to register devices and fetch updated passes.
      webServiceURL: `${siteUrl()}/api/wallet/apple`,
      authenticationToken: d.apple_auth_token,
    },
  );
  pass.type = "storeCard";

  pass.headerFields.push({
    key: "progress",
    label: p.reward_type === "stamps" ? "VISITS" : "POINTS",
    value: progressValue(p),
    changeMessage: p.reward_type === "stamps" ? "Stamp added: %@" : "Points: %@",
  });
  pass.secondaryFields.push(
    {
      key: "reward",
      label: "REWARD",
      value: isRewardReady(p) ? "Ready, show staff" : v.reward_text,
    },
    { key: "member", label: "MEMBER", value: d.first_name, textAlignment: "PKTextAlignmentRight" },
  );
  pass.backFields.push(
    {
      key: "message",
      label: `FROM ${v.name.toUpperCase()}`,
      value: v.pass_message ?? "Tap the stand or scan the code at the front desk to earn rewards.",
      changeMessage: "%@",
    },
    {
      key: "how",
      label: "HOW IT WORKS",
      value:
        p.reward_type === "stamps"
          ? `Earn a stamp each visit. ${p.stamps_needed} stamps = ${v.reward_text}.`
          : `Earn points each visit. ${p.points_needed} points = ${v.reward_text}.`,
    },
    { key: "card", label: "YOUR CARD", value: `${siteUrl()}/v/${v.slug}` },
  );
  pass.setBarcodes({ message: d.serial, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" });

  return pass.getAsBuffer();
}
