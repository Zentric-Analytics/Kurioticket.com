import assert from "node:assert/strict";
import test from "node:test";
import {
  assignCarBadges,
  buildCarDetailsHref,
  calculateRentalDays,
  ensureCarProviderCoverage,
  filterCarResults,
  getPrimaryCarOffer,
  getComparisonCarOffers,
  doesCarMatchFilterOption,
  sortCarOffers,
  sortCarResults,
} from "@/lib/cars/carResults";
import type { CarSearchParams } from "@/lib/cars/types";
import { buildStaticCarResults } from "@/services/travel/staticCarResults";
import { staticCarCatalogue } from "@/services/travel/staticCarCatalogue";
import {
  fuelPolicyLabels,
  pickupTypeLabels,
} from "@/components/results/carDetails/helpers";
import { getCarDetails } from "@/services/travel/carAggregator";
const search: CarSearchParams = {
  pickupLocation: "A",
  dropoffLocation: "B",
  pickupDate: "2026-08-01",
  pickupTime: "10:00",
  dropoffDate: "2026-08-04",
  dropoffTime: "12:00",
  driverAge: "30",
};
const cars = buildStaticCarResults(search);
test("sandbox placeholder pickup does not improve shared recommendation order", () => {
  const base = { ...cars[0], recommendationScore: 0, supplierRating: undefined };
  const unknown = { ...base, id: "z-unknown", pickupType: "city-location" as const, sandboxPresentation: { specs: [], pickupLabel: "Unknown", filterOptions: [] } };
  const neutral = { ...unknown, id: "a-neutral", pickupType: "shuttle" as const };
  assert.deepEqual(sortCarResults([unknown, neutral], "recommended").map(car => car.id), ["a-neutral", "z-unknown"]);
});
test("recommended results visibly represent every successful car provider", () => {
  const kayak = { ...cars[2], id: "kayak-test", inventorySource: "kayak-sandbox" as const };
  const covered = ensureCarProviderCoverage([...cars.slice(0, 5), kayak, ...cars.slice(5)]);
  assert.deepEqual(covered.slice(0, 2).map(car => car.inventorySource), ["kurioticket-static-cars", "kayak-sandbox"]);
  assert.equal(covered.length, cars.length + 1);
});
const expectations: Record<string, (c: (typeof cars)[number]) => boolean> = {
  daily0To49: (c) => { const price = getPrimaryCarOffer(c)?.pricePerDay ?? Infinity; return price >= 0 && price < 50; },
  daily50To99: (c) => { const price = getPrimaryCarOffer(c)?.pricePerDay ?? Infinity; return price >= 50 && price < 100; },
  daily100To149: (c) => { const price = getPrimaryCarOffer(c)?.pricePerDay ?? Infinity; return price >= 100 && price < 150; },
  daily150To199: (c) => { const price = getPrimaryCarOffer(c)?.pricePerDay ?? Infinity; return price >= 150 && price < 200; },
  daily200Plus: (c) => (getPrimaryCarOffer(c)?.pricePerDay ?? -Infinity) >= 200,
  smallCars: (c) => ["mini", "economy", "compact"].includes(c.category),
  mediumCars: (c) => ["intermediate", "full-size"].includes(c.category),
  suvs: (c) => c.category === "suv",
  luxuryCars: (c) => c.category === "luxury",
  vans: (c) => c.category === "van",
  automatic: (c) => c.transmission === "automatic",
  manual: (c) => c.transmission === "manual",
  seats4Plus: (c) => c.passengers >= 4,
  seats5Plus: (c) => c.passengers >= 5,
  seats7Plus: (c) => c.passengers >= 7,
  bags2Plus: (c) => c.bags >= 2,
  bags3Plus: (c) => c.bags >= 3,
  bags4Plus: (c) => c.bags >= 4,
  fullToFull: (c) => c.fuelPolicy === "full-to-full",
  sameToSame: (c) => c.fuelPolicy === "same-to-same",
  unlimitedMileage: (c) => c.mileagePolicy === "unlimited",
  limitedMileage: (c) => c.mileagePolicy === "limited",
  freeCancellation: (c) => c.offers.some((o) => o.freeCancellation),
  payAtPickup: (c) => c.offers.some((o) => o.payAtPickup),
  airportCounter: (c) => c.pickupType === "airport-counter",
  shuttlePickup: (c) => c.pickupType === "shuttle",
  cityLocation: (c) => c.pickupType === "city-location",
};
for (const [option, predicate] of Object.entries(expectations))
  test(`filter ${option}`, () => {
    const output = filterCarResults(cars, { group: [option] });
    if (!option.startsWith("daily")) assert.ok(output.length);
    assert.ok(output.every(predicate));
  });
test("daily price ranges cover every finite non-negative boundary exactly once", () => {
  const options = ["daily0To49", "daily50To99", "daily100To149", "daily150To199", "daily200Plus"];
  const boundaries = [
    [0, "daily0To49"], [49.99, "daily0To49"],
    [50, "daily50To99"], [99.99, "daily50To99"],
    [100, "daily100To149"], [149.99, "daily100To149"],
    [150, "daily150To199"], [199.99, "daily150To199"],
    [200, "daily200Plus"],
  ] as const;
  for (const [price, expected] of boundaries) {
    const matches = options.filter((option) => doesCarMatchFilterOption(cars[0], option, () => price));
    assert.deepEqual(matches, [expected]);
  }
  for (const price of [-1, Infinity, -Infinity, Number.NaN])
    assert.equal(options.some((option) => doesCarMatchFilterOption(cars[0], option, () => price)), false);
});
test("daily price filtering resolves the authoritative primary offer rather than total price", () => {
  const primary = getPrimaryCarOffer(cars[0]);
  assert.ok(primary);
  const result = { ...cars[0], offers: cars[0].offers.map((offer) => offer.id === primary.id ? { ...offer, pricePerDay: 42, totalPrice: 175 } : { ...offer, pricePerDay: 250, totalPrice: 1_000 }) };
  assert.equal(getPrimaryCarOffer(result)?.id, primary.id);
  assert.deepEqual(filterCarResults([result], { pricePerDay: ["daily0To49"] }), [result]);
  assert.deepEqual(filterCarResults([result], { pricePerDay: ["daily200Plus"] }), []);
});
test("filters use OR within and AND across groups and clearing restores source", () => {
  const or = filterCarResults(cars, { transmission: ["automatic", "manual"] });
  assert.equal(or.length, cars.length);
  const and = filterCarResults(cars, {
    transmission: ["manual"],
    vehicleType: ["suvs"],
  });
  assert.ok(
    and.every((c) => c.transmission === "manual" && c.category === "suv"),
  );
  assert.deepEqual(filterCarResults(cars, {}), cars);
});
for (const sort of ["recommended", "lowestTotal", "topRated"] as const)
  test(`sort ${sort} is deterministic without mutation`, () => {
    const snapshot = cars.map((c) => c.id);
    assert.deepEqual(sortCarResults(cars, sort), sortCarResults(cars, sort));
    assert.deepEqual(
      cars.map((c) => c.id),
      snapshot,
    );
  });
test("badges identify distinct leaders", () => {
  const b = assignCarBadges(cars);
  assert.equal(new Set(b.keys()).size, b.size);
  assert.ok([...b.values()].includes("Cheapest"));
  assert.ok([...b.values()].includes("Top rated"));
  assert.ok([...b.values()].includes("Best value"));
});
test("pricing duration and catalogue are deterministic and immutable", () => {
  const snapshot = JSON.stringify(staticCarCatalogue);
  assert.equal(calculateRentalDays("2026-08-01", "2026-08-04"), 3);
  assert.equal(calculateRentalDays("2026-08-01", "2026-08-01"), 1);
  assert.deepEqual(buildStaticCarResults(search), cars);
  assert.equal(cars[0].offers.length, 3);
  assert.equal(cars[0].offers[0].pricePerDay, staticCarCatalogue[0].offerFixtures[0].pricePerDay);
  assert.equal(new Set(cars[0].offers.map((offer) => offer.pricePerDay)).size, 3);
  assert.ok(cars[0].offers.every((offer) => offer.totalPrice === offer.pricePerDay * 3));
  assert.equal(JSON.stringify(staticCarCatalogue), snapshot);
});
test("detail href preserves search context", () => {
  const href = buildCarDetailsHref("demo car", search);
  for (const [key, value] of Object.entries(search))
    assert.equal(
      new URL(href, "https://example.test").searchParams.get(key),
      value,
    );
  assert.match(href, /\/cars\/details\/demo%20car/);
});
test("details offers sort by total then stable id and primary defaults safely", () => {
  const source = [...cars[0].offers].reverse();
  const sorted = sortCarOffers(source);
  assert.deepEqual(sorted, sortCarOffers(source));
  assert.ok(
    sorted.every(
      (offer, index) =>
        index === 0 || sorted[index - 1].totalPrice <= offer.totalPrice,
    ),
  );
  assert.equal(getPrimaryCarOffer({ ...cars[0], offers: [] }), undefined);
  assert.equal(getPrimaryCarOffer(cars[0])?.id, sorted[0].id);
});
test("comparison offers mirror native compact deal selection without fabricating prices", () => {
  const source = [...cars[0].offers].reverse();
  const duplicate = {
    ...source[0],
    id: `${source[0].id}-duplicate-price`,
    totalPrice: source[0].totalPrice + 50,
  };
  const comparison = getComparisonCarOffers([...source, duplicate]);
  assert.equal(comparison.length, 3);
  assert.equal(new Set(comparison.map((offer) => `${offer.currency}:${offer.pricePerDay}`)).size, 3);
  assert.ok(
    comparison.every(
      (offer, index) =>
        index === 0 || comparison[index - 1].totalPrice <= offer.totalPrice,
    ),
  );
  assert.deepEqual(getComparisonCarOffers(source, 0), []);
  assert.equal(getComparisonCarOffers(source, 2).length, 2);
});
test("selecting another offer provides different summary data", () => {
  const first = cars[0].offers[0];
  const offers = sortCarOffers([
    first,
    {
      ...first,
      id: `${first.id}-alternate`,
      bookingProviderName: "Alternate provider",
      totalPrice: first.totalPrice + 10,
    },
  ]);
  const selected = offers.find((offer) => offer.id === offers[1].id);
  assert.equal(selected?.bookingProviderName, "Alternate provider");
  assert.notEqual(selected?.id, offers[0].id);
});
test("details labels use approved user-facing copy", () => {
  assert.equal(fuelPolicyLabels["full-to-full"], "Full-to-full");
  assert.equal(fuelPolicyLabels["same-to-same"], "Same-to-same");
  assert.equal(pickupTypeLabels["airport-counter"], "Airport counter");
  assert.equal(pickupTypeLabels["meet-and-greet"], "Meet and greet");
});
test("exactly 30 unique static vehicles retain three valid distinct offers", () => {
  assert.equal(cars.length, 30);
  assert.equal(new Set(cars.map((car) => car.id)).size, 30);
  assert.equal(new Set(cars.map((car) => car.modelName)).size, 30);
  for (const car of cars) {
    assert.equal(car.offers.length, 3);
    assert.equal(new Set(car.offers.map((offer) => offer.pricePerDay)).size, 3);
    assert.ok(
      car.offers.every(
        (offer) => offer.totalPrice >= 0 && offer.pricePerDay >= 0,
      ),
    );
  }
  assert.ok(
    cars.some((car) => car.offers.some((offer) => offer.freeCancellation)),
  );
  assert.ok(
    cars.some((car) => car.offers.every((offer) => !offer.freeCancellation)),
  );
});
test("static catalogue details require a known exact id", async () => {
  assert.equal(await getCarDetails("not-a-known-id", search), null);
  assert.equal((await getCarDetails(cars[0].id, search))?.id, cars[0].id);
});
