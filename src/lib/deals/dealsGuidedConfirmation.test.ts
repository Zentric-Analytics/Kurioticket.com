import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultDealsSearch,
  type DealsPackageMode,
} from "./dealsSearchParams";
import { attemptGuidedConfirmation } from "./dealsGuidedConfirmation";
import {
  createDealsTripPlan,
  type DealsTripPlan,
  type DealsTripPlanCar,
  type DealsTripPlanFlight,
  type DealsTripPlanHotel,
  type DealsTripPlanProduct,
} from "./dealsTripPlan";

const hotel: DealsTripPlanHotel = {
  id: "h",
  provider: "p",
  name: "Hotel",
  location: "City",
  checkIn: "2099-01-01",
  checkOut: "2099-01-02",
  sourcePrice: 1,
  sourceCurrency: "USD",
  resultReceivedAt: 10,
};
const flight: DealsTripPlanFlight = {
  id: "f",
  provider: "p",
  airline: "Air",
  origin: "AAA",
  destination: "BBB",
  departure: "d",
  arrival: "a",
  duration: "1h",
  sourcePrice: 1,
  sourceCurrency: "USD",
  resultReceivedAt: 10,
};
const car: DealsTripPlanCar = {
  id: "c",
  provider: "p",
  rentalCompany: "Rent",
  modelName: "Car",
  categoryLabel: "Compact",
  pickupLocation: "City",
  returnLocation: "City",
  pickupDate: "2099-01-01",
  pickupTime: "10:00",
  dropoffDate: "2099-01-02",
  dropoffTime: "10:00",
  sourcePrice: 1,
  sourceCurrency: "USD",
  resultReceivedAt: 10,
  detailsPath: "/cars/details/c",
};
const selections = { flight, hotel, car };
const search = (mode: DealsPackageMode) => {
  const value = createDefaultDealsSearch();
  value.mode = mode;
  return value;
};

function confirm(
  mode: DealsPackageMode,
  product: DealsTripPlanProduct,
  plan: DealsTripPlan | null,
  renderedPlan = plan,
) {
  let written: DealsTripPlan | null = null;
  const result = attemptGuidedConfirmation({
    product,
    selection: selections[product],
    renderedPlan,
    search: search(mode),
    fingerprint: "fp",
    now: 11,
    read: () => (plan ? { status: "valid", plan } : { status: "missing" }),
    write: (next) => {
      written = next;
      return true;
    },
  });
  return { result, written };
}

test("only the authoritative first product creates a missing plan", () => {
  assert.equal(confirm("hotel-flight", "flight", null).result.ok, true);
  const wrong = confirm("hotel-flight", "hotel", null).result;
  assert.equal(wrong.ok, false);
  if (!wrong.ok) assert.equal(wrong.failure, "plan-missing");
  assert.equal(confirm("hotel-car", "hotel", null).result.ok, true);
});

test("all package modes confirm sequentially without deleting upstream products", () => {
  const matrix = [
    ["hotel-flight", ["flight", "hotel"]],
    ["flight-car", ["flight", "car"]],
    ["hotel-car", ["hotel", "car"]],
    ["hotel-flight-car", ["flight", "hotel", "car"]],
  ] as const;
  for (const [mode, products] of matrix) {
    let plan: DealsTripPlan | null = null;
    for (const product of products) {
      const { result, written } = confirm(mode, product, plan);
      assert.equal(result.ok, true, `${mode}:${product}`);
      plan = written ?? (result.ok ? result.plan : null);
    }
    for (const product of products)
      assert.ok(plan?.[product], `${mode}:${product} remains`);
  }
});

test("changed upstream prerequisite blocks stale Hotel confirmation", () => {
  const base = createDealsTripPlan(
    {
      mode: "hotel-flight",
      searchFingerprint: "fp",
      resultsPath: "/packages/results",
    },
    10,
  );
  const rendered = { ...base, flight };
  const current = { ...rendered, flight: { ...flight, id: "changed" } };
  const result = confirm("hotel-flight", "hotel", current, rendered).result;
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.failure, "prerequisite-changed");
});

test("same selection performs no write and storage failures remain typed", () => {
  const plan = {
    ...createDealsTripPlan(
      {
        mode: "hotel-flight",
        searchFingerprint: "fp",
        resultsPath: "/packages/results",
      },
      10,
    ),
    flight,
  };
  const same = confirm("hotel-flight", "flight", plan).result;
  assert.deepEqual(same, { ok: true, plan, wrote: false });
  const unavailable = attemptGuidedConfirmation({
    product: "flight",
    selection: flight,
    renderedPlan: null,
    search: search("hotel-flight"),
    fingerprint: "fp",
    now: 11,
    read: () => ({ status: "storage_unavailable" }),
    write: () => true,
  });
  assert.equal(unavailable.ok, false);
  if (!unavailable.ok)
    assert.equal(unavailable.failure, "storage-read-unavailable");
});
