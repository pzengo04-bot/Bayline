// The strip image on the front of the wallet card: stamps (or a points bar) plus one line of text
// under them. It's the card's main design canvas, because Apple's storeCard layout is otherwise fixed.
// Text is drawn by a TextFn (font outlines on the server, see strip-font.ts) so it renders the same
// everywhere, with no dependence on fonts installed on the machine.

import { isRewardReady, type Progress } from "@/lib/rewards";

export type Milestone = {
  /** The stamp (or points total) that unlocks it. */
  at: number;
  text: string;
  /** Reached this cycle and not redeemed yet. */
  ready: boolean;
};

export type StripState = {
  progress: Progress;
  milestone?: Milestone | null;
  /** The venue's short offer text while an offer is active. */
  offerShort?: string | null;
  bg: string;
  fg: string;
  accent: string;
};

export type TextOpts = {
  x: number;
  y: number;
  size: number;
  weight: 600 | 700;
  anchor: "start" | "middle" | "end";
  fill: string;
  opacity?: number;
  /** Shrink (down to 80%) and then truncate with "…" to fit. */
  maxWidth?: number;
};
export type TextFn = {
  draw: (text: string, o: TextOpts) => string;
  width: (text: string, size: number, weight: 600 | 700) => number;
};

/** Apple's storeCard strip, in points. Content stays inside the middle 123pt so it survives either crop. */
export const STRIP_W = 375;
export const STRIP_H = 144;

const lowerFirst = (s: string) => (s && !/^[A-Z]{2}/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "a free bay hour", "an extra hour", "2 free drinks". */
export function withArticle(reward: string) {
  const r = lowerFirst(reward.trim());
  if (/^(a|an|the|your|\d)\b/i.test(r) || /^\d/.test(r)) return r;
  return `${/^[aeiou]/i.test(r) ? "an" : "a"} ${r}`;
}

export type StripLine = { kind: "progress" | "ready" | "offer"; text: string };

/** The one line under the stamps. Ready rewards beat offers, offers beat progress. */
export function stripLine(s: Pick<StripState, "progress" | "milestone" | "offerShort">): StripLine {
  const p = s.progress;
  const m = s.milestone;
  if (isRewardReady(p)) return { kind: "ready", text: `${upperFirst(p.reward_text)} ready! Show staff` };
  if (m?.ready) return { kind: "ready", text: `${upperFirst(m.text)} ready! Show staff` };
  if (s.offerShort) return { kind: "offer", text: s.offerShort };
  const have = p.reward_type === "stamps" ? p.stamps : p.points;
  const goal = p.reward_type === "stamps" ? p.stamps_needed : p.points_needed;
  const next = m && have < m.at ? { at: m.at, text: m.text } : { at: goal, text: p.reward_text };
  const left = Math.max(1, next.at - have);
  const unit = p.reward_type === "stamps" ? (left === 1 ? "visit" : "visits") : left === 1 ? "point" : "points";
  return { kind: "progress", text: `${left} more ${unit} to ${withArticle(next.text)}` };
}

/** A small wrapped present, drawn in a 24-unit box centered on (cx, cy). */
function gift(cx: number, cy: number, size: number, fill: string, cut: string) {
  const k = size / 24;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${k})">
<path d="M12 7.2C10.6 3.4 6.4 2.6 6 5.2c-.3 1.8 2.6 2.4 6 2zM12 7.2c1.4-3.8 5.6-4.6 6-2 .3 1.8-2.6 2.4-6 2z" fill="none" stroke="${fill}" stroke-width="2" stroke-linejoin="round"/>
<rect x="2.5" y="7.5" width="19" height="4.5" rx="1.2" fill="${fill}"/>
<rect x="4" y="12.6" width="16" height="9" rx="1.2" fill="${fill}"/>
<rect x="11" y="7.5" width="2" height="14.1" fill="${cut}"/>
<rect x="2.5" y="12" width="19" height="0.6" fill="${cut}"/>
</g>`;
}

const check = (cx: number, cy: number, r: number, color: string) =>
  `<path d="M${cx - r * 0.38} ${cy + r * 0.02} l${r * 0.26} ${r * 0.27} l${r * 0.5} -${r * 0.52}" fill="none" stroke="${color}" stroke-width="${Math.max(2, r * 0.2)}" stroke-linecap="round" stroke-linejoin="round"/>`;

/** WCAG contrast ratio between two #rrggbb colors (1–21). Under 4.5 is hard to read for small text. */
export function contrastRatio(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
      c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Text color for a fill: the card background or foreground, whichever reads better on it. */
const onColor = (fill: string, bg: string, fg: string) => (contrastRatio(fill, bg) >= contrastRatio(fill, fg) ? bg : fg);

/**
 * The strip as SVG, laid out in points (375×144) and scaled to `scale` (1, 2 or 3 for Apple; Google's
 * hero image uses its own scale). Stamps sit in one row, or two when there are more than 6.
 */
export function stripSvg(s: StripState, text: TextFn, scale = 1) {
  const W = STRIP_W;
  const H = STRIP_H;
  const p = s.progress;
  const m = s.milestone;
  const line = stripLine(s);
  const marginX = 24;
  let body = "";

  // Bottom line: plain text for progress, a solid banner for offers and ready rewards.
  const lineY = 120; // baseline
  if (line.kind === "progress") {
    body += text.draw(line.text, { x: W / 2, y: lineY, size: 16, weight: 600, anchor: "middle", fill: s.fg, opacity: 0.9, maxWidth: W - marginX * 2 });
  } else {
    const ink = onColor(s.accent, s.bg, s.fg);
    const icon = line.kind === "offer" ? 18 : 0;
    const size = 15;
    const maxText = W - marginX * 2 - 28 - (icon ? icon + 6 : 0);
    const tw = Math.min(text.width(line.text, size, 700), maxText);
    const bw = tw + 28 + (icon ? icon + 6 : 0);
    const bx = (W - bw) / 2;
    body += `<rect x="${bx}" y="${lineY - 21}" width="${bw}" height="31" rx="15.5" fill="${s.accent}"/>`;
    if (icon) body += gift(bx + 14 + icon / 2, lineY - 5.5, icon, ink, s.accent);
    body += text.draw(line.text, { x: bx + 14 + (icon ? icon + 6 : 0), y: lineY, size, weight: 700, anchor: "start", fill: ink, maxWidth: maxText });
  }

  if (p.reward_type === "points") {
    const pct = (v: number) => Math.max(0, Math.min(1, v / Math.max(1, p.points_needed)));
    const barX = marginX;
    const barW = W - marginX * 2;
    const barY = 70;
    body += text.draw(String(p.points), { x: barX, y: 54, size: 30, weight: 700, anchor: "start", fill: s.accent });
    const nw = text.width(String(p.points), 30, 700);
    body += text.draw(`of ${p.points_needed} pts`, { x: barX + nw + 6, y: 54, size: 15, weight: 600, anchor: "start", fill: s.fg, opacity: 0.7 });
    body += `<rect x="${barX}" y="${barY}" width="${barW}" height="12" rx="6" fill="${s.fg}" fill-opacity="0.18"/>`;
    body += `<rect x="${barX}" y="${barY}" width="${Math.max(12, barW * pct(p.points))}" height="12" rx="6" fill="${s.accent}"/>`;
    if (m && m.at > 0 && m.at < p.points_needed) {
      const gx = barX + barW * pct(m.at);
      const reached = p.points >= m.at;
      body += `<circle cx="${gx}" cy="${barY + 6}" r="13" fill="${reached ? s.accent : s.bg}" stroke="${reached ? s.bg : s.fg}" stroke-opacity="${reached ? 1 : 0.45}" stroke-width="2"/>`;
      body += gift(gx, barY + 6, 15, reached ? onColor(s.accent, s.bg, s.fg) : s.fg, reached ? s.accent : s.bg);
    }
  } else {
    const n = Math.max(2, Math.min(p.stamps_needed, 20));
    const rows = n > 6 ? 2 : 1;
    const perRow = Math.ceil(n / rows);
    const zoneTop = 18;
    const zoneH = 72; // stamps live in y 18–90, the text line below
    const gap = rows === 1 ? 12 : 10;
    const rowGap = 6;
    const size = Math.min(
      (W - marginX * 2 - gap * (perRow - 1)) / perRow,
      (zoneH - rowGap * (rows - 1)) / rows,
      rows === 1 ? 46 : 33,
    );
    const r = size / 2;
    const stroke = Math.max(2, size * 0.065);
    const y0 = zoneTop + (zoneH - (rows * size + (rows - 1) * rowGap)) / 2;
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / perRow);
      const inRow = row === rows - 1 ? n - perRow * (rows - 1) : perRow;
      const col = i - row * perRow;
      const rowW = inRow * size + (inRow - 1) * gap;
      const cx = (W - rowW) / 2 + col * (size + gap) + r;
      const cy = y0 + row * (size + rowGap) + r;
      const earned = i < p.stamps;
      const isMilestone = m && m.at === i + 1 && m.at < p.stamps_needed;
      if (earned) {
        const ink = onColor(s.accent, s.bg, s.fg);
        body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${s.accent}"/>`;
        body += isMilestone ? gift(cx, cy, size * 0.56, ink, s.accent) : check(cx, cy, r, ink);
      } else {
        body += `<circle cx="${cx}" cy="${cy}" r="${r - stroke / 2}" fill="none" stroke="${s.fg}" stroke-opacity="0.45" stroke-width="${stroke}"/>`;
        if (isMilestone) body += `<g opacity="0.8">${gift(cx, cy, size * 0.52, s.fg, s.bg)}</g>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${s.bg}"/>
${body}
</svg>`;
}
