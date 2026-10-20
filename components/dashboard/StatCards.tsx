import type { TopStats } from "@/lib/analytics";
import { formatMoney, formatPercent } from "@/lib/format";
import { card } from "@/components/ui/styles";

export function StatCards({ stats }: { stats: TopStats }) {
  const items = [
    { label: "Active customers", value: String(stats.activeCustomers), note: "Checked in at least once" },
    { label: "Repeat visit rate", value: formatPercent(stats.repeatVisitRate), note: "Of active customers came back 2+ times" },
    {
      label: "Revenue from rewards members",
      value: formatMoney(stats.memberRevenue),
      note: `${formatPercent(stats.memberRevenueShare)} of all bay revenue`,
    },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
      <p className="text-xs font-medium uppercase tracking-wider text-muted sm:hidden">Last 30 days</p>
      {items.map((s) => (
        <div key={s.label} className={`${card} flex items-center justify-between gap-4 p-4 sm:block sm:p-5`}>
          <div className="min-w-0">
            <p className="text-sm font-medium">{s.label}</p>
            <p className="mt-1 text-xs text-muted sm:hidden">{s.note}</p>
          </div>
          <p className="shrink-0 font-display text-4xl font-bold tabular-nums leading-none sm:mt-1 sm:text-5xl">{s.value}</p>
          <p className="mt-2 hidden text-xs text-muted sm:block">
            {s.note} · last 30 days
          </p>
        </div>
      ))}
    </div>
  );
}
