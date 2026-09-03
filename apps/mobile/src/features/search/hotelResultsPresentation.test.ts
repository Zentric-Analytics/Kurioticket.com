import assert from "node:assert/strict";
import test from "node:test";
import { buildHotelFilterOptions, emptyHotelFilters } from "./hotelFilters";
import { buildHotelFilterChips, hasGoogleMapsDiscovery } from "./hotelResultsPresentation";

test("Hotel filter chips remove only their own criterion", () => {
  const filters = { ...emptyHotelFilters(), propertyNameQuery: "Harbour", starRatings: [4, 5] as (4 | 5)[], propertyTypes: ["hotel"] };
  const options = buildHotelFilterOptions([], "Lisbon");
  options.propertyTypes = [{ value: "hotel", label: "Hotel", count: 3 }];
  const chips = buildHotelFilterChips(filters, options);
  assert.deepEqual(chips.map(chip => chip.label), ["Property: Harbour", "4 stars", "5 stars", "Property type: Hotel"]);
  const withoutFourStars = chips.find(chip => chip.key === "star-4")!.remove(filters);
  assert.deepEqual(withoutFourStars.starRatings, [5]);
  assert.equal(withoutFourStars.propertyNameQuery, "Harbour");
  assert.deepEqual(withoutFourStars.propertyTypes, ["hotel"]);
});

test("Google Maps page attribution is exact and conditional", () => {
  assert.equal(hasGoogleMapsDiscovery([{ provider: "Google Maps" }]), true);
  assert.equal(hasGoogleMapsDiscovery([{ provider: "google maps" }, { provider: "Other" }]), false);
});
