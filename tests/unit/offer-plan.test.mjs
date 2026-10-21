// Offer recipient rules. Usage: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";

const { planOffer } = await import("../../lib/offer-plan.ts");

const now = Date.parse("2026-10-21T12:00:00Z");
const daysAgo = (d) => new Date(now - d * 86_400_000).toISOString();
const c = (name, label, { apple = true, google = false, lastOffer = null } = {}) => ({
  id: name, name, label, serial: name, apple, google, lastOfferAt: lastOffer,
});
const customers = [
  c("slip-card", "slipping"),
  c("slip-nocard", "slipping", { apple: false }),
  c("slip-recent", "slipping", { lastOffer: daysAgo(3) }),
  c("slip-old-offer", "slipping", { lastOffer: daysAgo(8) }),
  c("vip", "vip", { google: true, apple: false }),
  c("regular", "regular"),
  c("new", "new"),
  c("guest", "demo_guest", { lastOffer: daysAgo(0) }),
];
const names = (list) => list.map((x) => x.name).sort();

test("slipping audience: card holders only, weekly limit applies", () => {
  const p = planOffer({ is_demo: false, offer_cooldown_days: 7 }, customers.filter((x) => x.label !== "demo_guest"), "slipping", now);
  assert.equal(p.matched, 4);
  assert.deepEqual(names(p.deliver), ["slip-card", "slip-old-offer"]);
  assert.deepEqual(names(p.noCard), ["slip-nocard"]);
  assert.deepEqual(names(p.cooldown), ["slip-recent"]);
});

test("regulars audience includes VIPs (Google-only card counts as a card)", () => {
  const p = planOffer({ is_demo: false, offer_cooldown_days: 7 }, customers, "regulars", now);
  assert.ok(names(p.deliver).includes("vip") && names(p.deliver).includes("regular"));
  assert.ok(!names(p.deliver).includes("new"));
});

test("demo venue: guests are in every audience and the weekly limit is off", () => {
  const p = planOffer({ is_demo: true, offer_cooldown_days: 7 }, customers, "slipping", now);
  assert.ok(names(p.deliver).includes("guest"), "guest included despite an offer today");
  assert.ok(names(p.deliver).includes("slip-recent"), "no weekly limit on the demo venue");
  const g = planOffer({ is_demo: true, offer_cooldown_days: 7 }, customers, "demo_guests", now);
  assert.deepEqual(names(g.deliver), ["guest"]);
});

test("limit boundary: an offer exactly at the cutoff no longer blocks", () => {
  const p = planOffer({ is_demo: false, offer_cooldown_days: 7 }, [c("edge", "slipping", { lastOffer: daysAgo(7) })], "slipping", now);
  assert.deepEqual(names(p.deliver), ["edge"]);
});
