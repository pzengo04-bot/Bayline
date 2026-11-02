import Link from "next/link";
import type { ReactNode } from "react";

// Building blocks for the redesigned dashboard: cards, headers, trends, avatars, empty states.

export const dashCard = "rounded-[14px] border border-line bg-surface";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${dashCard} min-w-0 p-5 ${className}`}>{children}</section>;
}

export function CardHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-base font-bold">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** A dashed box for a card with nothing to show yet. */
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-[10px] border border-dashed border-line px-4 py-8 text-center">
      <div>
        <p className="font-semibold">{title}</p>
        {children && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{children}</p>}
      </div>
    </div>
  );
}

/** Blue when the change is good news, orange when it's bad, grey when flat. */
export function Trend({ diff, text, upIsBad = false }: { diff: number; text: string; upIsBad?: boolean }) {
  const good = diff === 0 ? null : diff > 0 !== upIsBad;
  return (
    <span className={`text-sm font-semibold ${good === null ? "text-muted" : good ? "text-blue-light" : "text-orange"}`}>
      {diff > 0 ? "↑ " : diff < 0 ? "↓ " : ""}
      {text}
    </span>
  );
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function Avatar({ name, size = 36, tone = "blue" }: { name: string; size?: number; tone?: "blue" | "orange" }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold ${tone === "orange" ? "bg-orange/15 text-orange" : "bg-blue/15 text-blue-light"}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-semibold text-blue-light hover:underline">
      {children}
    </Link>
  );
}

/** New / Regular / VIP in blue, Slipping in orange, the rest grey. */
export function StatusPill({ label }: { label: string }) {
  const names: Record<string, string> = {
    new: "New",
    regular: "Regular",
    vip: "VIP",
    slipping: "Slipping",
    lapsed: "Lapsed",
    occasional: "Occasional",
    demo_guest: "Demo guest",
  };
  const tone =
    label === "slipping"
      ? "bg-orange/15 text-orange ring-orange/30"
      : label === "new" || label === "regular" || label === "vip"
        ? "bg-blue/15 text-blue-light ring-blue/30"
        : "bg-fg/5 text-muted ring-line";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}>{names[label] ?? label}</span>;
}
