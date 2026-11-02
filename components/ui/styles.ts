// Shared class strings so buttons and cards look the same everywhere.
const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

// Orange and blue fills always take midnight text: white on them fails contrast.
export const button = {
  primary: `${base} bg-orange text-midnight hover:bg-orange-hover px-5 h-11 text-sm`,
  accent: `${base} bg-blue text-midnight hover:bg-blue-hover px-5 h-11 text-sm`,
  secondary: `${base} border border-line bg-surface-2 text-fg hover:border-blue/60 px-5 h-11 text-sm`,
  small: `${base} bg-blue text-midnight hover:bg-blue-hover px-4 h-9 text-sm`,
};

export const card = "rounded-2xl border border-line bg-surface";
