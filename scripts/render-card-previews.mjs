// Renders the front of the Apple wallet card for a set of sample states, as PNGs, to check the design
// without a phone. Usage: node --import ./tests/unit/register.mjs scripts/render-card-previews.mjs [outDir]
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { stripSvg, STRIP_W, STRIP_H } from "../lib/wallet/strip.ts";
import { outlineText } from "../lib/wallet/strip-font.ts";
import { cardFront } from "../lib/wallet/pass-content.ts";
import { code128c } from "../lib/wallet/code128.ts";

const out = process.argv[2] ?? "card-previews";
mkdirSync(out, { recursive: true });
const S = 3; // @3x
const demoLogo = readFileSync(path.join("public", "brand", "bayline-mark-for-dark-bg.svg"));

const demo = { name: "Bayline Demo", logoText: "Bayline", logo: demoLogo, bg: "#0f1512", fg: "#ffffff", accent: "#c4f04a" };
const light = { name: "Fairway Social", logoText: "Fairway Social", logo: null, bg: "#f4efe6", fg: "#1d2b22", accent: "#2f6b4f" };
const pitcher = (at, ready) => ({ at, text: "free pitcher", ready });
const stamps = (n, extra = {}) => ({
  reward_type: "stamps", reward_text: "free bay hour", stamps: n, stamps_needed: 10, points: 0, points_needed: 0, ...extra,
});

const states = [
  ["a-new-member-1-of-10", demo, stamps(1), pitcher(5, false), null],
  ["b-7-of-10-with-offer", demo, stamps(7), pitcher(5, false), "Bonus stamp on any visit this week"],
  ["c-milestone-reached", demo, stamps(5), pitcher(5, true), null],
  ["d-main-reward-ready", demo, stamps(10, { reward_ready: true }), pitcher(5, false), null],
  ["e-light-brand-4-of-10", light, stamps(4), pitcher(5, false), null],
  ["f-points-venue", light, { reward_type: "points", reward_text: "free 30-minute cage", stamps: 0, stamps_needed: 0, points: 180, points_needed: 300 }, { at: 150, text: "free drink", ready: false }, null],
];

for (const [name, v, base, milestone, offerShort] of states) {
  const progress = { ...base, milestone };
  const W = STRIP_W;
  const front = cardFront({ name: v.name, reward_type: progress.reward_type, reward_text: progress.reward_text }, progress, offerShort ? { short: offerShort } : null);
  const t = (s, o) => outlineText.draw(s, o);
  const headerH = 56;
  const fieldsY = headerH + STRIP_H;
  const barcodeY = fieldsY + 60;
  const H = barcodeY + 112;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" rx="14" fill="${v.bg}"/>`;
  // Header: logo + logo text only.
  const logoX = v.logo ? 16 + 34 + 8 : 16;
  svg += t(v.logoText, { x: logoX, y: 35, size: 18, weight: 600, anchor: "start", fill: v.fg });
  // Field row.
  front.fields.forEach((f, i) => {
    const x = i === 0 ? 16 : W - 16;
    const anchor = i === 0 ? "start" : "end";
    svg += t(f.label, { x, y: fieldsY + 22, size: 10, weight: 600, anchor, fill: v.fg, opacity: 0.7 });
    svg += t(f.value, { x, y: fieldsY + 42, size: 15, weight: 600, anchor, fill: v.fg, maxWidth: front.fields.length === 1 ? W - 32 : W / 2 - 24 });
  });
  // Barcode: Code 128 of the member number, with altText under it.
  const bars = code128c("74985092");
  const modules = bars.reduce((a, b) => a + b, 0);
  const mod = 1.5;
  const bw = modules * mod;
  const bx = (W - bw) / 2;
  svg += `<rect x="${bx - 14}" y="${barcodeY}" width="${bw + 28}" height="86" rx="6" fill="#fff"/>`;
  let x = bx;
  bars.forEach((w, i) => {
    if (i % 2 === 0) svg += `<rect x="${x}" y="${barcodeY + 10}" width="${w * mod}" height="50" fill="#000"/>`;
    x += w * mod;
  });
  svg += t("Member 7498 5092", { x: W / 2, y: barcodeY + 77, size: 11, weight: 600, anchor: "middle", fill: "#000", opacity: 0.8 });
  svg += `</svg>`;

  const strip = await sharp(Buffer.from(stripSvg({ progress, offerShort, bg: v.bg, fg: v.fg, accent: v.accent }, outlineText, S))).png().toBuffer();
  const layers = [{ input: strip, top: headerH * S, left: 0 }];
  if (v.logo) layers.push({ input: await sharp(v.logo, { density: 600 }).resize(34 * S, 34 * S, { fit: "inside" }).png().toBuffer(), top: 11 * S, left: 16 * S });
  await sharp(Buffer.from(svg)).composite(layers).png().toFile(path.join(out, `${name}.png`));
  console.log("wrote", path.join(out, `${name}.png`));
}
