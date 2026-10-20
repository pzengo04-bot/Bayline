"use client";

import { useState } from "react";
import type { SlotBlock, UtilizationGrid } from "@/lib/analytics";
import { formatHour, formatHourRange, formatPercent } from "@/lib/format";
import { button } from "@/components/ui/styles";
import { HeatmapGrid } from "./HeatmapGrid";
import { Section } from "./Section";
import { SendOfferModal } from "./SendOfferModal";

type Props = {
  grid: UtilizationGrid;
  emptiest: SlotBlock;
  emptyKeys: string[];
  recipientCount: number;
  venueName: string;
};

export function UtilizationHeatmap({ grid, emptiest, emptyKeys, recipientCount, venueName }: Props) {
  const [open, setOpen] = useState(false);
  const range = `${emptiest.day} ${formatHourRange(emptiest.startHour, emptiest.endHour)}`;

  return (
    <Section
      title="Busy vs. empty hours"
      subtitle="Share of bays booked, by day and hour, last 8 weeks"
      action={
        <button type="button" onClick={() => setOpen(true)} className={button.small}>
          Fill these hours
        </button>
      }
    >
      <HeatmapGrid
        grid={grid}
        emptyKeys={emptyKeys}
        block={emptiest}
        emptyLegend="Under 15% booked"
        describe={(d, i) => `${grid.rows[d].day} ${formatHour(grid.hours[i])}: ${formatPercent(grid.rows[d].values[i])} of bays booked`}
        readout={(d, i) => `${formatPercent(grid.rows[d].values[i])} booked`}
      />

      <p className="mt-4 flex items-center gap-2 rounded-xl bg-paper px-3 py-2.5 text-sm">
        <span className="size-3 shrink-0 rounded-[3px] bg-accent ring-2 ring-inset ring-ink" aria-hidden="true" />
        <span>
          Emptiest stretch: <strong>{range}</strong>, only {formatPercent(emptiest.utilization)} of bays booked.
        </span>
      </p>

      <SendOfferModal
        open={open}
        onClose={() => setOpen(false)}
        title="Off-peak offer"
        recipientCount={recipientCount}
        recipientNote="Everyone in your rewards program who opted in to texts."
        defaultMessage={`Bays are wide open ${range} — 20% off this week at ${venueName}. Reply STOP to opt out.`}
      />
    </Section>
  );
}
