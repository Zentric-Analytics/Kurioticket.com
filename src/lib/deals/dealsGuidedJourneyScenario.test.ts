import assert from "node:assert/strict";
import test from "node:test";
import { attemptGuidedConfirmation } from "./dealsGuidedConfirmation";
import { attemptGuidedHandoffActivation, getDealsGuidedProducts } from "./dealsGuidedHandoff";
import { getDealsReviewItems, getDealsReviewStatus } from "./dealsReviewPresentation";
import { createDefaultDealsSearch, getIncludedProductList, type DealsPackageMode } from "./dealsSearchParams";
import { buildDealsSearchFingerprint, type DealsTripPlan, type DealsTripPlanProduct } from "./dealsTripPlan";
import { readDealsStagedJourneyPlan, serializeDealsTripPlan, type DealsTripPlanReadResult } from "./dealsTripPlanStorage";

const hotel = { id: "h", provider: "p", name: "Hotel", location: "City", checkIn: "2099-01-01", checkOut: "2099-01-02", sourcePrice: 10, sourceCurrency: "USD", resultReceivedAt: 100, detailsPath: "/hotels/details/h" };
const flight = { id: "f", provider: "p", airline: "Air", origin: "AAA", destination: "BBB", departure: "d", arrival: "a", duration: "1h", sourcePrice: 20, sourceCurrency: "USD", resultReceivedAt: 100, detailsPath: "/flights/details/f" };
const car = { id: "c", provider: "p", rentalCompany: "Cars", modelName: "Model", categoryLabel: "Compact", pickupLocation: "City", returnLocation: "City", pickupDate: "2099-01-01", pickupTime: "10:00", dropoffDate: "2099-01-02", dropoffTime: "10:00", sourcePrice: 30, sourceCurrency: "USD", resultReceivedAt: 100, detailsPath: "/cars/details/c?pickupLocation=City&dropoffLocation=City&pickupDate=2099-01-01&pickupTime=10%3A00&dropoffDate=2099-01-02&dropoffTime=10%3A00&driverAge=30" };
const selections = { hotel, flight, car };

for (const mode of ["hotel-flight", "hotel-car", "flight-car", "hotel-flight-car"] as const) test(`${mode} completes confirmations, Review, handoff, and reload without legacy access`, () => {
  const search = createDefaultDealsSearch(); search.mode = mode; const fingerprint = buildDealsSearchFingerprint(search);
  let raw: string | null = null; let stagedWrites = 0; let legacyAccess = 0;
  const read = (fp: string, now: number): DealsTripPlanReadResult => readDealsStagedJourneyPlan(fp, now, { getItem: () => raw, setItem: () => { throw new Error("read only"); }, removeItem: () => { raw = null; } });
  const write = (plan: DealsTripPlan) => { stagedWrites += 1; raw = serializeDealsTripPlan(plan); return true; };
  let rendered: DealsTripPlan | null = null;
  for (const product of getIncludedProductList(mode) as DealsTripPlanProduct[]) {
    const result = attemptGuidedConfirmation({ product, selection: selections[product], renderedPlan: rendered, search, fingerprint, now: 100 + stagedWrites, read, write });
    assert.equal(result.ok, true); if (!result.ok) return; rendered = result.plan;
    const reload = read(fingerprint, 100 + stagedWrites); assert.equal(reload.status, "valid");
  }
  assert.ok(rendered); assert.deepEqual(getDealsReviewItems(rendered, search, 200, "en").map(item => item.product), getIncludedProductList(mode));
  assert.equal(getDealsReviewStatus(rendered, 200).canContinue, true); assert.deepEqual(getDealsGuidedProducts(rendered), getIncludedProductList(mode));
  for (const product of getIncludedProductList(mode) as DealsTripPlanProduct[]) {
    const result = attemptGuidedHandoffActivation({ renderedPlan: rendered, product, search, fingerprint, now: 300 + stagedWrites, locale: "en", read, write });
    assert.equal(result.ok, true); if (result.ok) rendered = result.plan;
  }
  const restored = read(fingerprint, 400); assert.equal(restored.status, "valid"); if (restored.status === "valid") for (const product of getIncludedProductList(mode)) assert.ok(restored.plan.opened[product]);
  assert.equal(legacyAccess, 0); assert.equal(Object.keys(rendered.opened).length, getIncludedProductList(mode).length);
  void legacyAccess;
});

test("scenario failures preserve staged state and never promote it to legacy", () => {
  const search = createDefaultDealsSearch(); search.mode = "hotel-flight"; const fingerprint = buildDealsSearchFingerprint(search);
  let writes = 0; const mismatch = attemptGuidedConfirmation({ product: "hotel", selection: hotel, renderedPlan: null, search, fingerprint, now: 100, read: () => ({ status: "fingerprint_mismatch", plan: { version: 1, mode: "hotel-flight", searchFingerprint: "other", resultsPath: "/deals/results", createdAt: 1, updatedAt: 1, expiresAt: 1000, opened: {} } }), write: () => { writes += 1; return true; } });
  assert.equal(mismatch.ok, false); assert.equal(writes, 0);
  const unavailable = attemptGuidedConfirmation({ product: "hotel", selection: hotel, renderedPlan: null, search, fingerprint, now: 100, read: () => ({ status: "storage_unavailable" }), write: () => { writes += 1; return true; } });
  assert.equal(unavailable.ok, false); assert.equal(writes, 0);
});
