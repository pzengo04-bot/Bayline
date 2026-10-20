import type { TopStats } from "@/lib/analytics";
import { formatMoney, formatPercent } from "@/lib/format";
import { StatGrid } from "./StatGrid";

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
  return <StatGrid items={items} period="last 30 days" />;
}
