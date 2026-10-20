// Shared class strings so buttons and cards look the same everywhere.
const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const button = {
  primary: `${base} bg-ink text-white hover:bg-ink/85 px-5 h-11 text-sm`,
  accent: `${base} bg-accent text-ink hover:bg-[#b5e43a] px-5 h-11 text-sm`,
  secondary: `${base} border border-ink/15 bg-white text-ink hover:border-ink/40 px-5 h-11 text-sm`,
  small: `${base} bg-ink text-white hover:bg-ink/85 px-4 h-9 text-sm`,
};

export const card = "rounded-2xl border border-line bg-card";
