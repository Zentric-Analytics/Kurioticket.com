import assert from "node:assert/strict";
import test from "node:test";
import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { sortCarResults } from "@/lib/cars/carResults";
import { buildStaticCarResults } from "@/services/travel/staticCarResults";

const search: CarSearchParams = {
  pickupLocation: "BOS",
  dropoffLocation: "BOS",
  pickupDate: "2027-02-10",
  pickupTime: "10:00",
  dropoffDate: "2027-02-12",
  dropoffTime: "10:00",
  driverAge: "30",
};

const staticCars = buildStaticCarResults(search);

function kayakClone(): NormalizedCarResult {
  const base = staticCars[staticCars.length - 1];
  return {
    ...base,
    id: "kayak-sandbox:provider-coverage",
    inventorySource: "kayak-sandbox",
    recommendationScore: -100,
    supplierRating: undefined,
    sandboxPresentation: {
      specs: ["5 passengers", "2 bags", "4 doors", "Automatic"],
      pickupLabel: "Search pickup",
      filterOptions: ["automatic", "seats5Plus", "bags2Plus"],
    },
  };
}

test("recommended Cars ranking keeps the strongest result from every successful provider visible", () => {
  const kayak = kayakClone();
  const ranked = sortCarResults([...staticCars.slice(0, 8), kayak, ...staticCars.slice(8)], "recommended");
  assert.deepEqual(ranked.slice(0, 2).map((car) => car.inventorySource), ["kurioticket-static-cars", "kayak-sandbox"]);
  assert.equal(ranked.filter((car) => car.id === kayak.id).length, 1);
});

test("explicit Cars sorts preserve their price and rating semantics instead of forcing provider coverage", () => {
  const kayak = kayakClone();
  const all = [...staticCars, kayak];
  const lowest = sortCarResults(all, "lowestTotal");
  for (let index = 1; index < lowest.length; index += 1) {
    const previous = Math.min(...lowest[index - 1].offers.map((offer) => offer.totalPrice));
    const current = Math.min(...lowest[index].offers.map((offer) => offer.totalPrice));
    assert.ok(previous <= current);
  }
  const topRated = sortCarResults(all, "topRated");
  const ratings = topRated.map((car) => car.supplierRating ?? -Infinity);
  for (let index = 1; index < ratings.length; index += 1) assert.ok(ratings[index - 1] >= ratings[index]);
});
