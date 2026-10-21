// Slow-hours finder. Usage: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";

const { findSlowWindow } = await import("../../lib/slow-hours.ts");

// Busy evenings every day, a little lunch trade, dead weekday afternoons; never open before 10 or after 23.
function week() {
  const rows = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 10; hour < 23; hour++) {
      let visits = hour >= 17 ? 12 : hour >= 12 && hour < 14 ? 4 : 2;
      if (dow === 1 && hour >= 14 && hour < 17) visits = 0; // Tuesday 2–5pm: empty
      if (dow >= 5) visits += 6;
      rows.push({ dow, hour, visits });
    }
  }
  return rows;
}

test("finds the empty weekday stretch, even when its hours have zero visits", () => {
  const w = findSlowWindow(week());
  assert.equal(w.label, "Tuesday 2–5pm");
  assert.equal(w.share, 0);
});

test("never suggests hours the venue is closed", () => {
  const w = findSlowWindow(week());
  assert.ok(w.startHour >= 10 && w.endHour <= 23);
});

test("respects opening hours when set", () => {
  const w = findSlowWindow(week(), { openHour: 17, closeHour: 23 });
  assert.ok(w.startHour >= 17 && w.endHour <= 23, w.label);
});

test("weekdays only, and nothing when there's too little data", () => {
  assert.ok(findSlowWindow(week()).dayIndex < 5);
  assert.equal(findSlowWindow([{ dow: 1, hour: 14, visits: 3 }]), null);
});
