import { card } from "@/components/ui/styles";

export type StatCard = {
  label: string;
  value: number;
  /** The same number a week earlier. */
  before: number;
  note: string;
  /** For counts where going up is bad news (slipping regulars). */
  upIsBad?: boolean;
};

/** Three numbers with how they moved since last week. */
export function StatCards({ items }: { items: StatCard[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {items.map((s) => {
        const diff = s.value - s.before;
        const good = diff === 0 ? null : (diff > 0) !== Boolean(s.upIsBad);
        return (
          <div key={s.label} className={`${card} p-3 sm:p-5`}>
            <p className="text-xs font-medium leading-tight text-muted sm:text-sm">{s.label}</p>
            <p className="mt-1.5 font-display text-4xl font-bold tabular-nums leading-none sm:text-5xl">{s.value}</p>
            <p className={`mt-1.5 text-xs font-semibold sm:text-sm ${good === null ? "text-muted" : good ? "text-blue" : "text-amber-300"}`}>
              {diff === 0 ? "Same as last week" : `${diff > 0 ? "+" : "−"}${Math.abs(diff)} vs last week`}
            </p>
            <p className="mt-1 hidden text-xs text-muted sm:block">{s.note}</p>
          </div>
        );
      })}
    </div>
  );
}
