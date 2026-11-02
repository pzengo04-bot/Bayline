// Renders the social share image (app/opengraph-image.png, 1200×630): the logo and headline on midnight
// with the hero's glow. Text is drawn as Inter outlines, like the wallet strip. Usage:
//   node --import ./tests/unit/register.mjs scripts/render-og-image.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { outlineText } from "../lib/wallet/strip-font.ts";

const W = 1200;
const H = 630;
const t = (s, o) => outlineText.draw(s, o);

const lines = Array.from({ length: Math.ceil(W / 32) }, (_, i) => `<rect x="${i * 32}" width="1" height="${H}" fill="#f2f5f7" fill-opacity="0.045"/>`).join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <radialGradient id="blue" cx="50%" cy="100%" r="75%">
    <stop offset="0" stop-color="#0297de" stop-opacity="0.38"/>
    <stop offset="0.55" stop-color="#0297de" stop-opacity="0.1"/>
    <stop offset="0.85" stop-color="#02070a" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="orange" cx="50%" cy="100%" r="42%">
    <stop offset="0" stop-color="#fc734d" stop-opacity="0.6"/>
    <stop offset="0.7" stop-color="#fc734d" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="fade" x1="0" y1="1" x2="0" y2="0">
    <stop offset="0" stop-color="#fff"/>
    <stop offset="0.75" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
</defs>
<rect width="${W}" height="${H}" fill="#02070a"/>
<rect width="${W}" height="${H}" fill="url(#blue)"/>
<rect width="${W}" height="${H}" fill="url(#orange)"/>
<g mask="url(#m)">${lines}</g>
${t("Turn first-timers into", { x: W / 2, y: 318, size: 72, weight: 700, anchor: "middle", fill: "#f2f5f7" })}
${t("regulars.", { x: W / 2, y: 404, size: 72, weight: 700, anchor: "middle", fill: "#0297de" })}
${t("Tap-to-join wallet rewards cards for local businesses", { x: W / 2, y: 470, size: 28, weight: 600, anchor: "middle", fill: "#8a99a3" })}
</svg>`;

const logo = await sharp(readFileSync(new URL("../public/brand/logo-for-dark-bg.svg", import.meta.url)), { density: 300 })
  .resize({ height: 84 })
  .png()
  .toBuffer();
const { width: lw } = await sharp(logo).metadata();
await sharp(Buffer.from(svg))
  .composite([{ input: logo, top: 120, left: Math.round((W - lw) / 2) }])
  .png()
  .toFile(fileURLToPath(new URL("../app/opengraph-image.png", import.meta.url)));
console.log("wrote app/opengraph-image.png");
