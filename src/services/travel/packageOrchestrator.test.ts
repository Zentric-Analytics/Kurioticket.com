import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch, getIncludedProductList, type DealsPackageMode, type DealsProduct } from "@/lib/deals/dealsSearchParams";
import { searchPackage, type PackageComponent } from "./packageOrchestrator";

test("all four package modes preserve every declared component", () => {
  const modes: DealsPackageMode[] = ["hotel-flight", "flight-car", "hotel-car", "hotel-flight-car"];
  const expected = { "hotel-flight": ["hotel", "flight"], "flight-car": ["flight", "car"], "hotel-car": ["hotel", "car"], "hotel-flight-car": ["hotel", "flight", "car"] };
  for (const mode of modes) assert.deepEqual(getIncludedProductList(mode), expected[mode]);
  assert.equal(createDefaultDealsSearch().mode, "hotel-flight");
});

test("canonical package response reserves offers for real bundle providers", async () => {
  const source = await import("node:fs/promises").then((fs) => fs.readFile("src/services/travel/packageOrchestrator.ts", "utf8"));
  assert.match(source, /packageOffers: \[\]/);
  assert.doesNotMatch(source, /discount|savings|combinedPrice/i);
});

const component = (product: DealsProduct, status: PackageComponent["status"] = "success"): PackageComponent => ({ status, results: status === "success" ? [{ id: product }] : [], warnings: [], source: `canonical-${product}`, requestId: product });
const complete = (mode: DealsPackageMode) => {
  const search = createDefaultDealsSearch();
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const later = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  return { ...search, mode, flightOriginCode: "LOS", flightDestinationCode: "LHR", flightDepartureDate: tomorrow, flightReturnDate: later, hotelDestination: "London", hotelCheckIn: tomorrow, hotelCheckOut: later, carPickupLocation: "London", carPickupDate: tomorrow, carReturnDate: later };
};

for (const mode of ["hotel-flight", "flight-car", "hotel-car", "hotel-flight-car"] as const) {
  test(`${mode} orchestrates exactly its canonical products`, async () => {
    const called: DealsProduct[] = [];
    const overrides = Object.fromEntries((["flight", "hotel", "car"] as const).map((product) => [product, async () => { called.push(product); return component(product); }]));
    const response = await searchPackage(complete(mode), "test", overrides);
    assert.deepEqual(called.sort(), getIncludedProductList(mode).sort());
    assert.deepEqual(Object.keys(response.components).sort(), getIncludedProductList(mode).sort());
    assert.equal(response.status, "success");
    assert.deepEqual(response.packageOffers, []);
  });
}

test("a failed component produces a truthful partial response without discarding success", async () => {
  const response = await searchPackage(complete("hotel-flight"), "test", {
    flight: async () => component("flight"),
    hotel: async () => { throw new Error("provider unavailable"); },
  });
  assert.equal(response.status, "partial");
  assert.equal(response.components.flight?.results.length, 1);
  assert.equal(response.components.hotel?.status, "unavailable");
  assert.deepEqual(response.packageOffers, []);
});
