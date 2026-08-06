import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import { attemptGuidedConfirmation } from "./dealsGuidedConfirmation";
import { createDealsTripPlan, replaceDealsHotelSelection, type DealsTripPlanFlight, type DealsTripPlanHotel } from "./dealsTripPlan";

const hotel: DealsTripPlanHotel = { id: "h", provider: "p", name: "Hotel", location: "City", checkIn: "2099-01-01", checkOut: "2099-01-02", sourcePrice: 1, sourceCurrency: "USD", resultReceivedAt: 10 };
const flight: DealsTripPlanFlight = { id: "f", provider: "p", airline: "Air", origin: "AAA", destination: "BBB", departure: "d", arrival: "a", duration: "1h", sourcePrice: 1, sourceCurrency: "USD", resultReceivedAt: 10 };
const search = () => { const value = createDefaultDealsSearch(); value.mode = "hotel-flight"; return value; };

test("first confirmation creates and persists one guided plan", () => {
  let writes = 0; const result = attemptGuidedConfirmation({ product: "hotel", selection: hotel, renderedPlan: null, search: search(), fingerprint: "fp", now: 10, read: () => ({ status: "missing" }), write: () => { writes += 1; return true; } });
  assert.equal(result.ok, true); assert.equal(writes, 1); if (result.ok) assert.equal(result.plan.hotel?.id, "h");
});

test("same selection rereads and performs no write", () => {
  const plan = replaceDealsHotelSelection(createDealsTripPlan({ mode: "hotel-flight", searchFingerprint: "fp", resultsPath: "/deals/results" }, 10), hotel, 10); let writes = 0;
  const result = attemptGuidedConfirmation({ product: "hotel", selection: { ...hotel, resultReceivedAt: 99 }, renderedPlan: plan, search: search(), fingerprint: "fp", now: 11, read: () => ({ status: "valid", plan }), write: () => { writes += 1; return true; } });
  assert.deepEqual(result, { ok: true, plan, wrote: false }); assert.equal(writes, 0);
});

test("changed upstream prerequisite blocks stale downstream confirmation", () => {
  const rendered = replaceDealsHotelSelection(createDealsTripPlan({ mode: "hotel-flight", searchFingerprint: "fp", resultsPath: "/deals/results" }, 10), hotel, 10);
  const current = { ...rendered, hotel: { ...hotel, id: "new" } }; let writes = 0;
  const result = attemptGuidedConfirmation({ product: "flight", selection: flight, renderedPlan: rendered, search: search(), fingerprint: "fp", now: 11, read: () => ({ status: "valid", plan: current }), write: () => { writes += 1; return true; } });
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.failure, "prerequisite-changed"); assert.equal(writes, 0);
});

test("mismatch and failed persistence never overwrite visible storage", () => {
  const plan = createDealsTripPlan({ mode: "hotel-flight", searchFingerprint: "other", resultsPath: "/deals/results" }, 10); let writes = 0;
  const mismatch = attemptGuidedConfirmation({ product: "hotel", selection: hotel, renderedPlan: null, search: search(), fingerprint: "fp", now: 11, read: () => ({ status: "fingerprint_mismatch", plan }), write: () => { writes += 1; return true; } });
  assert.equal(mismatch.ok, false); assert.equal(writes, 0);
  const own = { ...plan, searchFingerprint: "fp" };
  const failed = attemptGuidedConfirmation({ product: "hotel", selection: hotel, renderedPlan: own, search: search(), fingerprint: "fp", now: 11, read: () => ({ status: "valid", plan: own }), write: () => { writes += 1; return false; } });
  assert.equal(failed.ok, false); if (!failed.ok) assert.equal(failed.failure, "persistence-failed"); assert.equal(writes, 1);
});
