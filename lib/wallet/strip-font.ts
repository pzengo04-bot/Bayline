// Draws strip text as font outlines (Inter, bundled in lib/wallet/fonts), so the wallet images look
// the same on Vercel as on a Mac: the server has no fonts of its own for SVG text.

import { readFileSync } from "node:fs";
import path from "node:path";
import opentype from "opentype.js";
import type { TextFn, TextOpts } from "./strip";

const FONT_DIR = path.join(process.cwd(), "lib", "wallet", "fonts");
let fonts: Record<600 | 700, opentype.Font> | null = null;

function load() {
  if (!fonts) {
    const parse = (file: string) => {
      const buf = readFileSync(path.join(FONT_DIR, file));
      return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    };
    fonts = { 600: parse("inter-latin-600-normal.woff"), 700: parse("inter-latin-700-normal.woff") };
  }
  return fonts;
}

/** Drop characters the font can't draw (emoji and other scripts) instead of showing boxes. */
function drawable(font: opentype.Font, text: string) {
  return [...text].filter((ch) => ch === " " || font.charToGlyphIndex(ch) > 0).join("").replace(/\s+/g, " ").trim();
}

const width = (text: string, size: number, weight: 600 | 700) => load()[weight].getAdvanceWidth(text, size, { kerning: true });

function fit(text: string, o: TextOpts) {
  const font = load()[o.weight];
  let t = drawable(font, text);
  let size = o.size;
  if (!o.maxWidth) return { t, size };
  while (width(t, size, o.weight) > o.maxWidth && size > o.size * 0.8) size -= 0.5;
  if (width(t, size, o.weight) > o.maxWidth) {
    while (t.length > 1 && width(`${t}…`, size, o.weight) > o.maxWidth) t = t.slice(0, -1).trimEnd();
    t = `${t}…`;
  }
  return { t, size };
}

export const outlineText: TextFn = {
  width: (text, size, weight) => width(drawable(load()[weight], text), size, weight),
  draw(text, o) {
    const { t, size } = fit(text, o);
    const font = load()[o.weight];
    const w = width(t, size, o.weight);
    const x = o.anchor === "middle" ? o.x - w / 2 : o.anchor === "end" ? o.x - w : o.x;
    const d = font.getPath(t, x, o.y, size, { kerning: true }).toPathData(2);
    return `<path d="${d}" fill="${o.fill}"${o.opacity !== undefined ? ` fill-opacity="${o.opacity}"` : ""}/>`;
  },
};
