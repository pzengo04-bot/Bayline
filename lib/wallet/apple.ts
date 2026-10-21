import "server-only";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import { siteUrl } from "@/lib/env";
import { appleConfig } from "./config";
import { passModel, type PassData } from "./pass-model";
import { STRIP_H, STRIP_W, stripSvg } from "./strip";
import { outlineText } from "./strip-font";

export type { PassData } from "./pass-model";

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

/**
 * Apple's logo slot is up to 160×50 points and pins the image to the top-left, while the logo text
 * sits centered in that 50pt row. Drawing the logo 30pt tall, centered on a full-height canvas, keeps
 * it level with the text and gives it the same breathing room above as on the left.
 */
async function paddedLogo(logo: Buffer, scale: number) {
  const art = await sharp(logo)
    .resize(160 * scale, LOGO_ART_PT * scale, { fit: "inside", kernel: "lanczos3" })
    .png()
    .toBuffer({ resolveWithObject: true });
  const h = 50 * scale;
  return sharp({ create: { width: art.info.width, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: art.data, top: Math.round((h - art.info.height) / 2), left: 0 }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const LOGO_ART_PT = 30;

/** What the strip image shows for this customer (shared with Google's hero image). */
export const stripState = (d: PassData) => passModel(d, { hasLogo: Boolean(d.venue.logo_url) }).strip;

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

    if (logo) files[`logo${suffix}.png`] = await paddedLogo(logo, scale);

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
  const { files, hasLogo } = await passImages(d);
  const model = passModel(d, { hasLogo });

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
      ...(model.logoText ? { logoText: model.logoText } : {}),
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

  for (const f of model.header) pass.headerFields.push({ ...f, textAlignment: "PKTextAlignmentRight" });
  for (const f of model.fields) {
    pass.secondaryFields.push({
      ...f,
      // Keys are unique across the whole pass; the back already has "offer".
      key: f.key === "offer" ? "offer_front" : f.key,
      ...(f.key === "offer" ? { textAlignment: "PKTextAlignmentRight" as const } : {}),
    });
  }
  for (const f of model.back) pass.backFields.push({ ...f, label: f.label.toUpperCase() });
  // A small square QR of the member number (8 digits keeps it the simplest, sparsest QR).
  pass.setBarcodes({ ...model.barcode, format: "PKBarcodeFormatQR", messageEncoding: "iso-8859-1" });

  return pass.getAsBuffer();
}
