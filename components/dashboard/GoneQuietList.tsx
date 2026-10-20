import type { CustomerSummary } from "@/lib/analytics";

type Props = {
  customers: CustomerSummary[];
  /** Right-hand figure for each row, e.g. lifetime spend or visit count. */
  valueFor: (c: CustomerSummary) => string;
};

/** Regulars who stopped coming, with how long it's been. Used by the demo and the real dashboard. */
export function GoneQuietList({ customers, valueFor }: Props) {
  return (
    <ul className="max-h-[22rem] divide-y divide-line/70 overflow-y-auto rounded-xl border border-line">
      {customers.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {c.name}
              {!c.smsOptIn && (
                <span className="ml-2 rounded-full bg-paper px-2 py-0.5 text-[11px] font-normal text-muted">
                  no texts
                </span>
              )}
            </p>
            <p className="text-xs text-muted">
              Last seen {c.daysSinceLastVisit} days ago
              {c.avgDaysBetweenVisits ? ` · usually every ${c.avgDaysBetweenVisits} days` : ""}
            </p>
          </div>
          <p className="shrink-0 text-sm tabular-nums text-muted">{valueFor(c)}</p>
        </li>
      ))}
    </ul>
  );
}
