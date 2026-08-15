import assert from "node:assert/strict";
import test from "node:test";
import { areDealsGuidedPlansMateriallyEqual, isDealsStagedLifecycleStorageKey, shouldAnnounceDealsCrossTabUpdate } from "./dealsGuidedJourneyLifecycle";
import { DEALS_STAGED_JOURNEY_STORAGE_KEY, DEALS_TRIP_PLAN_STORAGE_KEY } from "./dealsTripPlanStorage";
import { createDealsTripPlan, getDealsGuidedNextExpiryAt, replaceDealsHotelSelection } from "./dealsTripPlan";

const hotel = { id: "h", provider: "p", name: "Hotel", location: "City", checkIn: "2099-01-01", checkOut: "2099-01-02", sourcePrice: 1, sourceCurrency: "USD", resultReceivedAt: 10 };
const base = () => replaceDealsHotelSelection(createDealsTripPlan({ mode: "hotel-flight", searchFingerprint: "fp", resultsPath: "/packages/results" }, 10), hotel, 10);

test("only materially changed storage snapshots announce cross-tab activity", () => {
  const plan = base(); const changed = { ...plan, opened: { hotel: 12 } };
  assert.equal(areDealsGuidedPlansMateriallyEqual(plan, structuredClone(plan)), true);
  assert.equal(shouldAnnounceDealsCrossTabUpdate("storage", plan, structuredClone(plan)), false);
  assert.equal(shouldAnnounceDealsCrossTabUpdate("storage", plan, changed), true);
  for (const source of ["focus", "visibility", "deadline"] as const) assert.equal(shouldAnnounceDealsCrossTabUpdate(source, plan, changed), false);
});

test("scheduler chooses only a future deadline and cannot repeat a past zero-delay deadline", () => {
  const plan = { ...base(), expiresAt: 9_000_000 };
  const productExpiry = hotel.resultReceivedAt + 25 * 60 * 1000;
  assert.equal(getDealsGuidedNextExpiryAt(plan, productExpiry), plan.expiresAt);
  assert.equal(getDealsGuidedNextExpiryAt(plan, plan.expiresAt), null);
});

test("only the staged key reaches lifecycle snapshot classification", () => {
  assert.equal(isDealsStagedLifecycleStorageKey(DEALS_STAGED_JOURNEY_STORAGE_KEY), true);
  assert.equal(isDealsStagedLifecycleStorageKey(DEALS_TRIP_PLAN_STORAGE_KEY), false);
  assert.equal(isDealsStagedLifecycleStorageKey("unrelated"), false);
  assert.equal(isDealsStagedLifecycleStorageKey(null), false);
});

test("hook source keeps deadline local, focus and visibility rereads, and clears stale context timers", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../../components/results/deals/useDealsStagedJourneyLifecycle.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /setInterval|poll/i);
  assert.match(source, /window\.setTimeout\(\(\) => \{ const observedAt = Date\.now\(\); setNow\(observedAt\); deadlineRef\.current/);
  assert.doesNotMatch(source, /setTimeout\([\s\S]{0,180}readDealsStagedJourneyPlan/);
  assert.match(source, /const focus = \(\) => refresh\("focus"\)/);
  assert.match(source, /document\.visibilityState === "visible"/);
  assert.match(source, /window\.clearTimeout\(timer\)/);
  assert.match(source, /\[active, fingerprint, plan\]/);
});
