import Link from "next/link";
import { LabelChip } from "@/components/app/LabelChip";
import { Section } from "@/components/dashboard/Section";
import { rhythmLine, type CustomerInsight } from "@/lib/labels";

/** Regulars drifting away, most frequent first. */
export function SlippingList({ customers, total }: { customers: CustomerInsight[]; total: number }) {
  return (
    <Section
      title="Slipping regulars"
      subtitle={total ? "Away more than twice their usual time" : "Nobody is slipping right now."}
      action={
        total > customers.length ? (
          <Link href="/dashboard/customers?label=slipping" className="text-sm font-semibold underline underline-offset-2">
            See all {total}
          </Link>
        ) : undefined
      }
    >
      {customers.length > 0 && (
        <ul className="divide-y divide-line/70 rounded-xl border border-line">
          {customers.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{c.name}</span>
                  <LabelChip label={c.label} />
                </p>
                <p className="text-xs text-muted">{rhythmLine(c)}</p>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-muted">
                {c.visits_180} visit{c.visits_180 === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
