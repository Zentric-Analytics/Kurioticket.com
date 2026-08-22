import assert from "node:assert/strict";
import test from "node:test";
import { attemptGuidedConfirmation } from "./dealsGuidedConfirmation";
import { attemptGuidedHandoffActivation, getDealsGuidedProducts } from "./dealsGuidedHandoff";
import { getDealsReviewItems, getDealsReviewStatus } from "./dealsReviewPresentation";
import { createDefaultDealsSearch, getIncludedProductList } from "./dealsSearchParams";
import { buildDealsSearchFingerprint, type DealsTripPlan, type DealsTripPlanProduct } from "./dealsTripPlan";
import { DEALS_STAGED_JOURNEY_STORAGE_KEY, DEALS_TRIP_PLAN_STORAGE_KEY, readDealsStagedJourneyPlan, writeDealsStagedJourneyPlan, type DealsTripPlanReadResult } from "./dealsTripPlanStorage";

const hotel = { id: "h", provider: "p", name: "Hotel", location: "City", checkIn: "2099-01-01", checkOut: "2099-01-02", sourcePrice: 10, sourceCurrency: "USD", resultReceivedAt: 100, detailsPath: "/hotels/details/h" };
const flight = { id: "f", provider: "p", airline: "Air", origin: "AAA", destination: "BBB", departure: "d", arrival: "a", duration: "1h", sourcePrice: 20, sourceCurrency: "USD", resultReceivedAt: 100, detailsPath: "/flights/details/f" };
const car = { id: "c", provider: "p", rentalCompany: "Cars", modelName: "Model", categoryLabel: "Compact", pickupLocation: "City", returnLocation: "City", pickupDate: "2099-01-01", pickupTime: "10:00", dropoffDate: "2099-01-02", dropoffTime: "10:00", sourcePrice: 30, sourceCurrency: "USD", resultReceivedAt: 100, detailsPath: "/cars/details/c?pickupLocation=City&dropoffLocation=City&pickupDate=2099-01-01&pickupTime=10%3A00&dropoffDate=2099-01-02&dropoffTime=10%3A00&driverAge=30" };
const selections = { hotel, flight, car };

function isolatedStorage() {
  const values = new Map<string, string>();
  const counts = { stagedRead: 0, stagedWrite: 0, stagedRemove: 0, legacyRead: 0, legacyWrite: 0, legacyRemove: 0 };
  const storage = {
    getItem(key: string) { if (key === DEALS_STAGED_JOURNEY_STORAGE_KEY) counts.stagedRead += 1; else if (key === DEALS_TRIP_PLAN_STORAGE_KEY) counts.legacyRead += 1; return values.get(key) ?? null; },
    setItem(key: string, value: string) { if (key === DEALS_STAGED_JOURNEY_STORAGE_KEY) counts.stagedWrite += 1; else if (key === DEALS_TRIP_PLAN_STORAGE_KEY) counts.legacyWrite += 1; values.set(key, value); },
    removeItem(key: string) { if (key === DEALS_STAGED_JOURNEY_STORAGE_KEY) counts.stagedRemove += 1; else if (key === DEALS_TRIP_PLAN_STORAGE_KEY) counts.legacyRemove += 1; values.delete(key); },
  };
  return { storage, counts };
}

for (const mode of ["hotel-flight", "hotel-car", "flight-car", "hotel-flight-car"] as const) test(`${mode} completes confirmations, Review, handoff, reload, and real storage isolation`, () => {
  const search = createDefaultDealsSearch(); search.mode = mode; const fingerprint = buildDealsSearchFingerprint(search);
  const { storage, counts } = isolatedStorage();
  const read = (fp: string, now: number): DealsTripPlanReadResult => readDealsStagedJourneyPlan(fp, now, storage);
  const write = (plan: DealsTripPlan) => writeDealsStagedJourneyPlan(plan, storage);
  const products = getIncludedProductList(mode) as DealsTripPlanProduct[];
  let rendered: DealsTripPlan | null = null;
  assert.equal(products[0], mode === "flight-car" ? "flight" : "hotel");
  for (const product of products) {
    const writesBefore = counts.stagedWrite;
    const result = attemptGuidedConfirmation({ product, selection: selections[product], renderedPlan: rendered, search, fingerprint, now: 100 + counts.stagedWrite, read, write });
    assert.equal(result.ok, true); if (!result.ok) return; rendered = result.plan;
    assert.equal(counts.stagedWrite, writesBefore + 1, "changed confirmation writes exactly once");
    const reload = read(fingerprint, 200); assert.equal(reload.status, "valid");
    const same = attemptGuidedConfirmation({ product, selection: selections[product], renderedPlan: rendered, search, fingerprint, now: 200, read, write });
    assert.equal(same.ok, true); if (same.ok) assert.equal(same.wrote, false); assert.equal(counts.stagedWrite, writesBefore + 1, "same selection writes zero times");
  }
  assert.ok(rendered); assert.deepEqual(getDealsReviewItems(rendered, search, 300, "en").map(item => item.product), products);
  assert.equal(getDealsReviewStatus(rendered, 300).canContinue, true); assert.deepEqual(getDealsGuidedProducts(rendered), products);
  for (const product of products) {
    const result = attemptGuidedHandoffActivation({ renderedPlan: rendered, product, search, fingerprint, now: 400 + counts.stagedWrite, locale: "en", read, write });
    assert.equal(result.ok, true); if (result.ok) { rendered = result.plan; assert.ok(rendered.opened[product]); }
  }
  const restored = read(fingerprint, 500); assert.equal(restored.status, "valid");
  if (restored.status === "valid") for (const product of products) assert.ok(restored.plan.opened[product]);
  assert.deepEqual({ read: counts.legacyRead, write: counts.legacyWrite, remove: counts.legacyRemove }, { read: 0, write: 0, remove: 0 });
  assert.equal(counts.stagedRemove, 0); assert.equal(Object.keys(rendered.opened).length, products.length);
  if (mode === "flight-car") { assert.match(rendered.flight?.detailsPath ?? "", /^\/flights\/details\/f$/); assert.match(rendered.car?.detailsPath ?? "", /^\/cars\/details\/c\?/); }
  assert.doesNotMatch("All booking-partner steps have been opened", /booked|paid/i);
});

test("scenario failures preserve staged state and never promote it to legacy", () => {
  const search = createDefaultDealsSearch(); search.mode = "hotel-flight"; const fingerprint = buildDealsSearchFingerprint(search);
  const { storage, counts } = isolatedStorage(); let confirmationWrites = 0;
  const mismatch = attemptGuidedConfirmation({ product: "hotel", selection: hotel, renderedPlan: null, search, fingerprint, now: 100, read: () => ({ status: "fingerprint_mismatch", plan: { version: 1, mode: "hotel-flight", searchFingerprint: "other", resultsPath: "/packages/results", createdAt: 1, updatedAt: 1, expiresAt: 1000, opened: {} } }), write: plan => { confirmationWrites += 1; return writeDealsStagedJourneyPlan(plan, storage); } });
  assert.equal(mismatch.ok, false); assert.equal(confirmationWrites, 0);
  const unavailable = attemptGuidedConfirmation({ product: "hotel", selection: hotel, renderedPlan: null, search, fingerprint, now: 100, read: () => ({ status: "storage_unavailable" }), write: plan => { confirmationWrites += 1; return writeDealsStagedJourneyPlan(plan, storage); } });
  assert.equal(unavailable.ok, false); assert.equal(confirmationWrites, 0);
  assert.deepEqual({ read: counts.legacyRead, write: counts.legacyWrite, remove: counts.legacyRemove }, { read: 0, write: 0, remove: 0 });
});
