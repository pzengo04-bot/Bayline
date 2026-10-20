import { card } from "@/components/ui/styles";

export type StatItem = { label: string; value: string; note: string };

type Props = {
  items: StatItem[];
  /** Shared time period, e.g. "last 30 days": a heading on phones, appended to each note on larger screens. */
  period?: string;
  columns?: string;
};

export function StatGrid({ items, period, columns = "sm:grid-cols-3" }: Props) {
  return (
    <div className={`grid gap-2 ${columns} sm:gap-3`}>
      {period && (
        <p className="text-xs font-medium uppercase tracking-wider text-muted sm:hidden">
          {period[0].toUpperCase() + period.slice(1)}
        </p>
      )}
      {items.map((s) => (
        <div key={s.label} className={`${card} flex items-center justify-between gap-4 p-4 sm:block sm:p-5`}>
          <div className="min-w-0">
            <p className="text-sm font-medium">{s.label}</p>
            <p className="mt-1 text-xs text-muted sm:hidden">{s.note}</p>
          </div>
          <p className="shrink-0 font-display text-4xl font-bold tabular-nums leading-none sm:mt-1 sm:text-5xl">{s.value}</p>
          <p className="mt-2 hidden text-xs text-muted sm:block">
            {s.note}
            {period ? ` · ${period}` : null}
          </p>
        </div>
      ))}
    </div>
  );
}
