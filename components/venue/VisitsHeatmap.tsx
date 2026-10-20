"use client";

import Link from "next/link";
import { HeatmapGrid } from "@/components/dashboard/HeatmapGrid";
import { Section } from "@/components/dashboard/Section";
import { button } from "@/components/ui/styles";
import { formatHour, formatHourRange } from "@/lib/format";
import type { VisitHeatmap } from "@/lib/insights";

const plural = (n: number) => `${n} check-in${n === 1 ? "" : "s"}`;

/** Real-data heatmap: check-ins by day and hour, with a link to draft an off-peak offer. */
export function VisitsHeatmap({ heatmap }: { heatmap: VisitHeatmap }) {
  const { grid, counts, emptyKeys, block, total } = heatmap;
  const range = block ? `${block.day} ${formatHourRange(block.startHour, block.endHour)}` : null;

  return (
    <Section
      title="Busy vs. empty hours"
      subtitle="Check-ins by day and hour, last 8 weeks"
      action={
        range ? (
          <Link href={`/dashboard/messages?audience=all&template=off_peak&slot=${encodeURIComponent(range)}`} className={button.small}>
            Fill these hours
          </Link>
        ) : undefined
      }
    >
      <HeatmapGrid
        grid={grid}
        emptyKeys={emptyKeys}
        block={block ?? undefined}
        emptyLegend="Quietest hours"
        describe={(d, i) => `${grid.rows[d].day} ${formatHour(grid.hours[i])}: ${plural(counts[d][i])}`}
        readout={(d, i) => plural(counts[d][i])}
      />
      <p className="mt-4 flex items-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm">
        {range ? (
          <>
            <span className="size-3 shrink-0 rounded-[3px] bg-accent ring-2 ring-inset ring-ink" aria-hidden="true" />
            <span>
              Quietest stretch: <strong>{range}</strong>. A good time to offer a deal.
            </span>
          </>
        ) : (
          <span>
            {total === 0
              ? "No check-ins in the last 8 weeks yet."
              : `${plural(total)} so far. The quiet hours stand out after about 20 check-ins.`}
          </span>
        )}
      </p>
    </Section>
  );
}
