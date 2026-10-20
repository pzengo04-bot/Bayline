"use client";

import { useState } from "react";
import type { SlotBlock, UtilizationGrid } from "@/lib/analytics";
import { formatHour, formatHourRange, formatPercent } from "@/lib/format";
import { button } from "@/components/ui/styles";
import { Section } from "./Section";
import { SendOfferModal } from "./SendOfferModal";

type Props = {
  grid: UtilizationGrid;
  emptiest: SlotBlock;
  emptyKeys: string[];
  recipientCount: number;
  venueName: string;
};

/** Busy cells get darker ink; the emptiest slots are called out in the accent color. */
function cellStyle(value: number, isEmpty: boolean) {
  if (isEmpty) return { background: "var(--accent)" };
  return { background: `color-mix(in srgb, var(--ink) ${Math.round(8 + value * 82)}%, white)` };
}

export function UtilizationHeatmap({ grid, emptiest, emptyKeys, recipientCount, venueName }: Props) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<{ day: string; hour: number; value: number } | null>(null);
  const empty = new Set(emptyKeys);
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
      <div
        className="grid gap-[2px]"
        style={{ gridTemplateColumns: `2.25rem repeat(${grid.hours.length}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHovered(null)}
      >
        <div />
        {grid.hours.map((h, i) => (
          <div key={h} className="pb-1 text-center text-[10px] text-muted sm:text-[11px]">
            {/* Every other label on narrow screens keeps them from colliding */}
            <span className={i % 2 ? "hidden sm:inline" : ""}>{formatHour(h, true)}</span>
          </div>
        ))}
        {grid.rows.map((row, d) => (
          <div key={row.day} className="contents">
            <div className="flex items-center text-xs font-medium text-muted">{row.day}</div>
            {row.values.map((v, i) => {
              const hour = grid.hours[i];
              const isEmpty = empty.has(`${d}-${hour}`);
              const inBlock = d === emptiest.dayIndex && hour >= emptiest.startHour && hour < emptiest.endHour;
              const label = `${row.day} ${formatHour(hour)}: ${formatPercent(v)} of bays booked`;
              return (
                <button
                  key={hour}
                  type="button"
                  aria-label={label}
                  title={label}
                  onMouseEnter={() => setHovered({ day: row.day, hour, value: v })}
                  onFocus={() => setHovered({ day: row.day, hour, value: v })}
                  onClick={() => setHovered({ day: row.day, hour, value: v })}
                  className={`h-7 rounded-[4px] transition-transform hover:scale-110 hover:ring-2 hover:ring-ink/60 sm:h-8 ${
                    inBlock ? "ring-2 ring-inset ring-ink" : ""
                  }`}
                  style={cellStyle(v, isEmpty || inBlock)}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-accent" /> Under 15% booked
          </span>
          <span className="flex items-center gap-1.5">
            Empty
            <span
              className="h-3 w-14 rounded-[3px]"
              style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--ink) 8%, white), var(--ink))" }}
            />
            Full
          </span>
        </div>
        <p aria-live="polite" className="font-medium text-ink tabular-nums">
          {hovered
            ? `${hovered.day} ${formatHour(hovered.hour)} · ${formatPercent(hovered.value)} booked`
            : "Tap a square for details"}
        </p>
      </div>

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
