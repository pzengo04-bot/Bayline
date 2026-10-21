// The punch-card strip shown on the wallet pass (and in the card designer preview), as SVG.
// The Apple pass rasterizes this to strip.png; Google shows its own layout.

type Strip = {
  rewardType: "stamps" | "points";
  stamps: number;
  stampsNeeded: number;
  points: number;
  pointsNeeded: number;
  bg: string;
  fg: string;
  accent: string;
};

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

/** 375×123 is Apple's storeCard strip size at 1x; render at 2x/3x by scaling. */
export function stripSvg(s: Strip, width = 375, height = 123) {
  const pad = 18;
  if (s.rewardType === "points") {
    const pct = Math.max(0, Math.min(1, s.points / Math.max(1, s.pointsNeeded)));
    const barW = width - pad * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${s.bg}"/>
  <text x="${pad}" y="58" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" fill="${s.accent}">${esc(String(s.points))}</text>
  <text x="${width - pad}" y="58" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="${s.fg}" fill-opacity="0.75">of ${esc(String(s.pointsNeeded))} pts</text>
  <rect x="${pad}" y="80" width="${barW}" height="14" rx="7" fill="${s.fg}" fill-opacity="0.18"/>
  <rect x="${pad}" y="80" width="${Math.max(14, barW * pct)}" height="14" rx="7" fill="${s.accent}"/>
</svg>`;
  }

  const n = Math.max(2, Math.min(s.stampsNeeded, 12));
  const rows = n > 6 ? 2 : 1;
  const perRow = Math.ceil(n / rows);
  const gap = 10;
  const size = Math.min((width - pad * 2 - gap * (perRow - 1)) / perRow, (height - 20 - gap * (rows - 1)) / rows);
  const totalW = perRow * size + (perRow - 1) * gap;
  const x0 = (width - totalW) / 2;
  const y0 = (height - (rows * size + (rows - 1) * gap)) / 2;
  const r = size / 2;
  let circles = "";
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const cx = x0 + col * (size + gap) + r;
    const cy = y0 + row * (size + gap) + r;
    const filled = i < s.stamps;
    const last = i === n - 1;
    circles += filled
      ? `<circle cx="${cx}" cy="${cy}" r="${r - 1}" fill="${s.accent}"/><path d="M${cx - r * 0.32} ${cy + r * 0.02} l${r * 0.22} ${r * 0.24} l${r * 0.42} -${r * 0.46}" fill="none" stroke="${s.bg}" stroke-width="${Math.max(2, r * 0.16)}" stroke-linecap="round" stroke-linejoin="round"/>`
      : `<circle cx="${cx}" cy="${cy}" r="${r - 2}" fill="none" stroke="${s.fg}" stroke-opacity="0.35" stroke-width="2.5"/>` +
        (last
          ? `<text x="${cx}" y="${cy + r * 0.3}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${r * 0.9}" fill="${s.fg}" fill-opacity="0.5">★</text>`
          : "");
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${s.bg}"/>${circles}
</svg>`;
}

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
