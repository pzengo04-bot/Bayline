import { site } from "@/lib/site";

/** Wordmark: a simple "bay" mark next to the brand name. */
export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect width="26" height="26" rx="7" fill={inverted ? "var(--accent)" : "var(--ink)"} />
        <rect x="6" y="7" width="3" height="12" rx="1.5" fill={inverted ? "var(--ink)" : "var(--accent)"} />
        <rect x="11.5" y="7" width="3" height="12" rx="1.5" fill={inverted ? "var(--ink)" : "var(--accent)"} />
        <rect x="17" y="13" width="3" height="6" rx="1.5" fill={inverted ? "var(--ink)" : "var(--accent)"} />
      </svg>
      <span className="font-display text-[22px] font-bold uppercase tracking-wide leading-none">{site.name}</span>
    </span>
  );
}
