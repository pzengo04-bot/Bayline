"use client";

import { useState } from "react";
import type { UtilizationGrid } from "@/lib/analytics";
import { formatHour } from "@/lib/format";

type Props = {
  grid: UtilizationGrid; // values 0–1 drive the shading
  emptyKeys: string[]; // "dayIndex-hour" cells to call out in the accent color
  block?: { dayIndex: number; startHour: number; endHour: number }; // outlined stretch
  emptyLegend: string; // e.g. "Under 15% booked"
  /** Screen-reader / tooltip label, e.g. "Tue 2pm: 6% of bays booked". */
  describe: (dayIndex: number, hourIndex: number) => string;
  /** Short readout under the grid, e.g. "6% booked". */
  readout: (dayIndex: number, hourIndex: number) => string;
};

/** Busy cells get darker ink; the emptiest slots are called out in the accent color. */
function cellStyle(value: number, isEmpty: boolean) {
  if (isEmpty) return { background: "var(--accent)" };
  return { background: `color-mix(in srgb, var(--ink) ${Math.round(8 + value * 82)}%, white)` };
}

/** Day-of-week × hour grid with a legend and a tap/hover readout. */
export function HeatmapGrid({ grid, emptyKeys, block, emptyLegend, describe, readout }: Props) {
  const [hovered, setHovered] = useState<{ d: number; i: number } | null>(null);
  const empty = new Set(emptyKeys);

  return (
    <>
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
              const inBlock = !!block && d === block.dayIndex && hour >= block.startHour && hour < block.endHour;
              const label = describe(d, i);
              return (
                <button
                  key={hour}
                  type="button"
                  aria-label={label}
                  title={label}
                  onMouseEnter={() => setHovered({ d, i })}
                  onFocus={() => setHovered({ d, i })}
                  onClick={() => setHovered({ d, i })}
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
            <span className="size-3 rounded-[3px] bg-accent" />
            {` ${emptyLegend}`}
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
            ? `${grid.rows[hovered.d].day} ${formatHour(grid.hours[hovered.i])} · ${readout(hovered.d, hovered.i)}`
            : "Tap a square for details"}
        </p>
      </div>
    </>
  );
}
