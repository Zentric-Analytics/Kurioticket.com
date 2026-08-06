import assert from "node:assert/strict";
import test from "node:test";
import { areDealsGuidedPlansMateriallyEqual, shouldAnnounceDealsCrossTabUpdate } from "./dealsGuidedJourneyLifecycle";
import { createDealsTripPlan, getDealsGuidedNextExpiryAt, replaceDealsHotelSelection } from "./dealsTripPlan";

const hotel = { id: "h", provider: "p", name: "Hotel", location: "City", checkIn: "2099-01-01", checkOut: "2099-01-02", sourcePrice: 1, sourceCurrency: "USD", resultReceivedAt: 10 };
const base = () => replaceDealsHotelSelection(createDealsTripPlan({ mode: "hotel-flight", searchFingerprint: "fp", resultsPath: "/deals/results" }, 10), hotel, 10);

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
