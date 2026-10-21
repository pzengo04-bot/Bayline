// The weekday 3-hour stretch with the smallest share of visits. An hour counts as "open" if the venue
// gets visits at that hour on any day (or it's inside the optional opening hours), so we never suggest
// times it's closed, but a dead Tuesday afternoon still counts as quiet rather than closed.

import { DAY_NAMES } from "./analytics";
import { formatHourRange } from "./format";
import type { HeatmapRow } from "./insights";

export const FULL_DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export type SlowWindow = { dayIndex: number; day: string; shortDay: string; startHour: number; endHour: number; share: number; label: string };

export function findSlowWindow(
  rows: HeatmapRow[],
  opts: { openHour?: number | null; closeHour?: number | null; length?: number; minVisits?: number } = {},
): SlowWindow | null {
  const length = opts.length ?? 3;
  const total = rows.reduce((sum, r) => sum + r.visits, 0);
  if (total < (opts.minVisits ?? 20)) return null;
  const counts = new Map(rows.map((r) => [`${r.dow}-${r.hour}`, r.visits]));
  const hasHours = opts.openHour != null && opts.closeHour != null;
  const open = hasHours ? opts.openHour! : 0;
  const close = hasHours ? opts.closeHour! : 24;
  const busyAnyDay = new Set(rows.filter((r) => r.visits > 0).map((r) => r.hour));
  const isOpen = (hour: number) => (hasHours ? hour >= open && hour < close : busyAnyDay.has(hour));

  let best: SlowWindow | null = null;
  for (let d = 0; d < 5; d++) {
    for (let h = open; h + length <= close; h++) {
      if (!Array.from({ length }, (_, i) => isOpen(h + i)).every(Boolean)) continue;
      const hours = Array.from({ length }, (_, i) => counts.get(`${d}-${h + i}`) ?? 0);
      const share = hours.reduce((a, b) => a + b, 0) / total;
      if (!best || share < best.share) {
        best = {
          dayIndex: d,
          day: FULL_DAY_NAMES[d],
          shortDay: DAY_NAMES[d],
          startHour: h,
          endHour: h + length,
          share,
          label: `${FULL_DAY_NAMES[d]} ${formatHourRange(h, h + length)}`,
        };
      }
    }
  }
  return best;
}
