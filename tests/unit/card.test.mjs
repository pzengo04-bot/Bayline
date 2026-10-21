// Card v3 wording and rules: milestone position, the strip's one line, offer short text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { milestoneAt } from "../../lib/rewards.ts";
import { stripLine, withArticle } from "../../lib/wallet/strip.ts";
import { cardFront, offerShort, rewardsSummary } from "../../lib/wallet/pass-content.ts";

const stamps = (n, extra = {}) => ({ reward_type: "stamps", reward_text: "free bay hour", stamps: n, stamps_needed: 10, points: 0, points_needed: 0, ...extra });

test("milestone position defaults to halfway and stays before the main reward", () => {
  assert.equal(milestoneAt("stamps", 10), 5);
  assert.equal(milestoneAt("stamps", 9), 4, "rounded down");
  assert.equal(milestoneAt("stamps", 10, 9), 9);
  assert.equal(milestoneAt("stamps", 10, 12), 9, "never at or past the goal");
  assert.equal(milestoneAt("stamps", 10, 1), 2, "stamp 2 at the earliest");
  assert.equal(milestoneAt("stamps", 3), 2);
  assert.equal(milestoneAt("stamps", 2), null, "no room on a 2-stamp card");
  assert.equal(milestoneAt("points", 300), 150);
  assert.equal(milestoneAt("points", 300, 1), 1);
});

test("strip line: progress toward the next reward, then offers, then ready rewards", () => {
  const pitcher = (ready = false) => ({ at: 5, text: "free pitcher", ready });
  assert.equal(stripLine({ progress: stamps(1) }).text, "9 more visits to a free bay hour");
  assert.equal(stripLine({ progress: stamps(1, { milestone: pitcher() }) }).text, "4 more visits to a free pitcher");
  assert.equal(stripLine({ progress: stamps(4, { milestone: pitcher() }) }).text, "1 more visit to a free pitcher");
  assert.equal(stripLine({ progress: stamps(6, { milestone: pitcher() }) }).text, "4 more visits to a free bay hour", "milestone passed");
  assert.deepEqual(stripLine({ progress: stamps(7), offerShort: "Bonus stamp this week" }), { kind: "offer", text: "Bonus stamp this week" });
  assert.equal(stripLine({ progress: stamps(5, { milestone: pitcher(true) }), offerShort: "x" }).text, "Free pitcher ready! Show staff");
  assert.equal(stripLine({ progress: stamps(10, { reward_ready: true, milestone: pitcher(true) }) }).text, "Free bay hour ready! Show staff");
  assert.equal(
    stripLine({ progress: { reward_type: "points", reward_text: "free cage", stamps: 0, stamps_needed: 0, points: 180, points_needed: 300 } }).text,
    "120 more points to a free cage",
  );
});

test("articles and front fields", () => {
  assert.equal(withArticle("Free pitcher"), "a free pitcher");
  assert.equal(withArticle("extra hour"), "an extra hour");
  assert.equal(withArticle("2 free drinks"), "2 free drinks");
  assert.equal(withArticle("VIP pass"), "a VIP pass");
  const v = { reward_text: "free bay hour" };
  assert.deepEqual(cardFront(v, stamps(3)).fields, [{ key: "reward", label: "REWARD", value: "Free bay hour" }]);
  assert.equal(cardFront(v, stamps(3, { milestone: { at: 5, text: "free pitcher", ready: false } })).fields[0].value, "Free pitcher");
  assert.equal(cardFront(v, stamps(10, { reward_ready: true })).fields[0].value, "Free bay hour", "ready text lives in the strip only");
  assert.equal(cardFront(v, stamps(5, { milestone: { at: 5, text: "free pitcher", ready: true } })).fields[0].value, "Free pitcher");
  assert.deepEqual(cardFront(v, stamps(3), { short: "Bonus stamp" }).fields[1], { key: "offer", label: "OFFER", value: "Bonus stamp" });
  assert.equal(rewardsSummary(v, stamps(3, { milestone: { at: 5, text: "free pitcher", ready: false } })), "Free pitcher at stamp 5 · Free bay hour at stamp 10");
});

test("offer short text: the venue's line, else the first sentence, max 40 characters", () => {
  assert.equal(offerShort({ text: "Long text", short: "Bonus stamp", expires_at: "" }), "Bonus stamp");
  assert.equal(offerShort({ text: "Half-price bays today! Come by after 2pm.", expires_at: "" }), "Half-price bays today!");
  const long = offerShort({ text: "We miss you at Bayline Demo and we would love to see you again soon", expires_at: "" });
  assert.ok(long.length <= 40 && long.endsWith("…"), long);
});


test("pass model: alerts ride on always-present back fields, icons default by business type", async () => {
  const { passModel } = await import("../../lib/wallet/pass-model.ts");
  const { stampIconFor } = await import("../../lib/wallet/stamp-icons.ts");
  const base = {
    customer_id: "c", serial: "5028d3c8-1004-4451-80d5-360c7f24f151", first_name: "Mia", apple_auth_token: "", updated_at: "",
    venue: { id: "v", name: "Corner Coffee", slug: "c", logo_url: null, card_bg: "#000000", card_fg: "#ffffff", card_accent: "#ffcc00", pass_message: null, reward_type: "stamps", reward_text: "free drink", type: "cafe" },
    progress: stamps(3, { reward_text: "free drink", stamps_needed: 8 }),
  };
  const quiet = passModel(base, { hasLogo: false });
  assert.equal(quiet.logoText, "Corner Coffee");
  assert.equal(quiet.strip.icon, "coffee");
  assert.ok(quiet.back.every((f) => !f.changeMessage), "no alerts for a plain stamp");
  assert.deepEqual(quiet.header, [{ key: "member_name", label: "MEMBER", value: "Mia" }]);

  const ready = passModel({ ...base, progress: stamps(8, { reward_text: "free drink", stamps_needed: 8, reward_ready: true }) }, { hasLogo: false });
  const status = ready.back.find((f) => f.key === "status");
  assert.equal(status.value, "Free drink ready! Show staff");
  assert.equal(status.changeMessage, "%@");
  assert.equal(ready.fields[0].value, "Free drink");

  const offer = passModel({ ...base, offer: { text: "Half-price lattes today!", short: null, sent_at: "", expires_at: "2030-01-01T00:00:00Z" } }, { hasLogo: false });
  assert.equal(offer.back.find((f) => f.key === "offer").changeMessage, "%@");
  assert.equal(offer.fields[1].value, "Half-price lattes today!");

  assert.equal(stampIconFor({ type: "golf_sim" }), "golf");
  assert.equal(stampIconFor({ type: "barbershop", stamp_icon: "star" }), "star");
  assert.equal(stampIconFor({ type: "unknown" }), "check");
});
