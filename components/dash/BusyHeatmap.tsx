import { formatHour, formatHourRange } from "@/lib/format";
import type { HeatmapRow } from "@/lib/insights";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type SlowCells = { days: number[]; start: number; end: number } | null;

/**
 * The slowest weekday stretch: the 3-hour window from findSlowWindow, plus a second weekday when the
 * same hours are nearly as quiet there (so 3 to 6 cells).
 */
export function slowCells(rows: HeatmapRow[], window: { dayIndex: number; startHour: number; endHour: number } | null): SlowCells {
  if (!window) return null;
  const sum = (d: number) =>
    rows.filter((r) => r.dow === d && r.hour >= window.startHour && r.hour < window.endHour).reduce((a, r) => a + r.visits, 0);
  const best = sum(window.dayIndex);
  const twin = [0, 1, 2, 3, 4]
    .filter((d) => d !== window.dayIndex)
    .map((d) => ({ d, n: sum(d) }))
    .sort((a, b) => a.n - b.n)[0];
  const days = twin && twin.n <= Math.max(best * 1.25, best + 1) ? [window.dayIndex, twin.d].sort() : [window.dayIndex];
  return { days, start: window.startHour, end: window.endHour };
}

export const slowLabel = (s: NonNullable<SlowCells>) => `${s.days.map((d) => DAYS[d]).join(" & ")}, ${formatHourRange(s.start, s.end)}`;

/** Rows Mon–Sun, a column per opening hour, cells shaded blue by visits; slow cells outlined orange. */
export function BusyHeatmap({ rows, hours, slow }: { rows: HeatmapRow[]; hours: number[]; slow: SlowCells }) {
  const counts = new Map(rows.map((r) => [`${r.dow}-${r.hour}`, r.visits]));
  const max = Math.max(1, ...rows.map((r) => r.visits));
  const isSlow = (d: number, h: number) => Boolean(slow && slow.days.includes(d) && h >= slow.start && h < slow.end);

  return (
    <div>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <table className="w-full min-w-[560px] border-separate border-spacing-[3px]">
          <thead>
            <tr>
              <th className="w-10" />
              {hours.map((h) => (
                <th key={h} scope="col" className="font-mono text-[10px] font-medium text-muted">
                  {formatHour(h, true)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day, d) => (
              <tr key={day}>
                <th scope="row" className="pr-1 text-left font-mono text-[11px] font-medium text-muted">
                  {day}
                </th>
                {hours.map((h) => {
                  const n = counts.get(`${d}-${h}`) ?? 0;
                  const pct = n ? Math.round(12 + (n / max) * 88) : 0;
                  return (
                    <td
                      key={h}
                      title={`${day} ${formatHour(h)}: ${n} visit${n === 1 ? "" : "s"}`}
                      className={`h-7 rounded-[5px] ${isSlow(d, h) ? "ring-[1.5px] ring-inset ring-orange" : ""}`}
                      style={{ background: n ? `color-mix(in srgb, #0297de ${pct}%, #111c24)` : "#111c24" }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          Fewer
          {[0, 30, 60, 100].map((p) => (
            <span key={p} className="size-3 rounded-[3px]" style={{ background: p ? `color-mix(in srgb, #0297de ${p}%, #111c24)` : "#111c24" }} />
          ))}
          More
        </span>
        {slow && (
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] ring-[1.5px] ring-inset ring-orange" />
            Slow hours
          </span>
        )}
      </div>
    </div>
  );
}
