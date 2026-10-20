import type { CustomerSummary } from "@/lib/analytics";
import { formatDaysAgo, formatMoney } from "@/lib/format";
import { Section } from "./Section";

type Props = {
  regulars: CustomerSummary[];
  subtitle?: string;
  showSpend?: boolean;
};

export function RegularsTable({ regulars, subtitle = "Your top customers by visits, last 6 months", showSpend = true }: Props) {
  return (
    <Section title="Regulars" subtitle={subtitle}>
      <div className="-mx-4 overflow-x-auto sm:-mx-5">
        <table className="w-full min-w-[320px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2 pl-4 pr-2 font-medium sm:pl-5">Customer</th>
              <th className="px-2 py-2 text-right font-medium">Visits</th>
              {showSpend && <th className="px-2 py-2 text-right font-medium">Spend</th>}
              <th className="hidden py-2 pl-2 pr-5 text-right font-medium sm:table-cell">Last visit</th>
            </tr>
          </thead>
          <tbody>
            {regulars.map((c, i) => (
              <tr key={c.id} className="border-b border-line/70 last:border-0">
                <td className="py-2.5 pl-4 pr-2 sm:pl-5">
                  <span className="mr-2 inline-block w-4 text-right font-mono text-xs text-muted">{i + 1}</span>
                  <span className="font-medium">{c.name}</span>
                </td>
                <td className="px-2 py-2.5 text-right tabular-nums">{c.visits}</td>
                {showSpend && <td className="px-2 py-2.5 text-right tabular-nums">{formatMoney(c.spend)}</td>}
                <td className="hidden py-2.5 pl-2 pr-5 text-right text-muted sm:table-cell">
                  {formatDaysAgo(c.daysSinceLastVisit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
