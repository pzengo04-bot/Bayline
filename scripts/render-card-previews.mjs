// Renders the front of the Apple wallet card for sample businesses, as PNGs, from the same pass model
// and strip renderer as real passes. Usage:
//   node --import ./tests/unit/register.mjs scripts/render-card-previews.mjs [outDir]
import { mkdirSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
import sharp from "sharp";
import { passModel } from "../lib/wallet/pass-model.ts";
import { STRIP_H, STRIP_W, stripSvg } from "../lib/wallet/strip.ts";
import { outlineText } from "../lib/wallet/strip-font.ts";

const out = process.argv[2] ?? "card-previews";
mkdirSync(out, { recursive: true });
const S = 3; // @3x

const venues = {
  cafe: { name: "Corner Coffee", type: "cafe", reward_text: "free drink", card_bg: "#f6efe4", card_fg: "#2b1d14", card_accent: "#a8551e" },
  golf: { name: "Back Nine Golf", type: "golf_sim", reward_text: "free bay hour", card_bg: "#0f1512", card_fg: "#ffffff", card_accent: "#c4f04a" },
  barber: { name: "Sharp & Co.", type: "barbershop", reward_text: "free haircut", card_bg: "#1d3a5f", card_fg: "#ffffff", card_accent: "#f2c14e" },
};
const progress = (v, have, needed, extra = {}) => ({
  reward_type: "stamps", reward_text: v.reward_text, stamps: have, stamps_needed: needed, points: 0, points_needed: 0, ...extra,
});
const pastry = (ready, redeemed = false) => ({ at: 4, text: "free pastry", ready, redeemed });
const offer = { text: "Bonus stamp on any visit this week. See you on the course!", short: "Bonus stamp on any visit this week", sent_at: "", expires_at: "2030-01-01T00:00:00Z" };

const samples = [
  ["cafe-in-progress", venues.cafe, progress(venues.cafe, 3, 8, { milestone: pastry(false) }), null, "Ava"],
  ["cafe-reward-ready", venues.cafe, progress(venues.cafe, 8, 8, { reward_ready: true, milestone: pastry(false, true) }), null, "Ava"],
  ["golf-in-progress-offer", venues.golf, progress(venues.golf, 6, 10), offer, "Mike"],
  ["golf-reward-ready", venues.golf, progress(venues.golf, 10, 10, { reward_ready: true }), null, "Mike"],
  ["barber-in-progress", venues.barber, progress(venues.barber, 2, 6), null, "Jordan"],
  ["barber-reward-ready", venues.barber, progress(venues.barber, 6, 6, { reward_ready: true }), null, "Jordan"],
];

for (const [name, venue, prog, off, first] of samples) {
  const d = {
    customer_id: "sample", serial: "5028d3c8-1004-4451-80d5-360c7f24f151", first_name: first, apple_auth_token: "", updated_at: "",
    venue: { id: "v", slug: "v", logo_url: null, pass_message: null, reward_type: "stamps", ...venue },
    progress: prog,
    offer: off,
  };
  const m = passModel(d, { hasLogo: false });
  const W = STRIP_W;
  const { card_bg: bg, card_fg: fg } = venue;
  const t = (s, o) => outlineText.draw(s, o);
  const headerH = 56;
  const fieldsY = headerH + STRIP_H;
  const qrY = fieldsY + 62;
  const qrSize = 92;
  const H = qrY + qrSize + 40;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" rx="14" fill="${bg}"/>`;
  // Header: logo text, MEMBER top right.
  if (m.logoText) svg += t(m.logoText, { x: 16, y: 34, size: 18, weight: 600, anchor: "start", fill: fg, maxWidth: W - 120 });
  for (const f of m.header) {
    svg += t(f.label, { x: W - 16, y: 22, size: 9, weight: 600, anchor: "end", fill: fg, opacity: 0.7 });
    svg += t(f.value, { x: W - 16, y: 39, size: 15, weight: 600, anchor: "end", fill: fg });
  }
  // Field row: REWARD, and OFFER while an offer is active.
  m.fields.forEach((f, i) => {
    const x = i === 0 ? 16 : W - 16;
    const anchor = i === 0 ? "start" : "end";
    svg += t(f.label, { x, y: fieldsY + 22, size: 10, weight: 600, anchor, fill: fg, opacity: 0.7 });
    svg += t(f.value, { x, y: fieldsY + 42, size: 15, weight: 600, anchor, fill: fg, maxWidth: m.fields.length === 1 ? W - 32 : W / 2 - 24 });
  });
  // QR of the member number, with altText under it.
  const qr = QRCode.create(m.barcode.message, { errorCorrectionLevel: "M" }).modules;
  const cell = qrSize / qr.size;
  const qx = (W - qrSize) / 2;
  svg += `<rect x="${qx - 8}" y="${qrY}" width="${qrSize + 16}" height="${qrSize + 30}" rx="6" fill="#fff"/>`;
  for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
    if (qr.get(y, x)) svg += `<rect x="${qx + x * cell}" y="${qrY + 8 + y * cell}" width="${cell + 0.05}" height="${cell + 0.05}" fill="#000"/>`;
  }
  svg += t(m.barcode.altText, { x: W / 2, y: qrY + qrSize + 22, size: 10, weight: 600, anchor: "middle", fill: "#000", opacity: 0.8 });
  svg += `</svg>`;

  const strip = await sharp(Buffer.from(stripSvg(m.strip, outlineText, S))).png().toBuffer();
  await sharp(Buffer.from(svg)).composite([{ input: strip, top: headerH * S, left: 0 }]).png().toFile(path.join(out, `${name}.png`));
  console.log("wrote", path.join(out, `${name}.png`));
}
