import type { CarOffer, LocationBoundCarSearchParams, NormalizedCarResult } from "@/lib/cars/types";

export type SelectedCarFilters = Record<string, string[]>;
export type CarSort = "recommended" | "lowestTotal" | "topRated";
export type CarResultBadge = "Best value" | "Cheapest" | "Top rated";

export const getPrimaryCarOffer = (car: NormalizedCarResult): CarOffer | undefined =>
  [...car.offers].filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice >= 0)
    .sort((a, b) => a.totalPrice - b.totalPrice || a.pricePerDay - b.pricePerDay || a.id.localeCompare(b.id))[0];

/** The details comparison intentionally has a simpler, stable price ordering. */
export const sortCarOffers = (offers: CarOffer[]) =>
  [...offers]
    .filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice >= 0)
    .sort((a, b) => a.totalPrice - b.totalPrice || a.id.localeCompare(b.id));

/** Mirrors the native details comparison: at most three real, distinct per-day offers. */
export const getComparisonCarOffers = (offers: CarOffer[], limit = 3): CarOffer[] => {
  const cappedLimit = Math.max(0, Math.floor(limit));
  if (!cappedLimit) return [];
  const seenPrices = new Set<string>();
  const selected: CarOffer[] = [];
  const sorted = [...offers]
    .filter(
      (offer) =>
        Number.isFinite(offer.totalPrice) &&
        offer.totalPrice >= 0 &&
        Number.isFinite(offer.pricePerDay) &&
        offer.pricePerDay >= 0,
    )
    .sort(
      (a, b) =>
        a.totalPrice - b.totalPrice ||
        a.pricePerDay - b.pricePerDay ||
        a.id.localeCompare(b.id),
    );
  for (const offer of sorted) {
    const priceKey = `${offer.currency}:${offer.pricePerDay}`;
    if (seenPrices.has(priceKey)) continue;
    seenPrices.add(priceKey);
    selected.push(offer);
    if (selected.length >= cappedLimit) break;
  }
  return selected;
};

export type CarPricePerDayResolver = (car: NormalizedCarResult) => number | undefined;

export const getPrimaryCarPricePerDay: CarPricePerDayResolver = (car) => {
  const price = getPrimaryCarOffer(car)?.pricePerDay;
  return typeof price === "number" && Number.isFinite(price) && price >= 0 ? price : undefined;
};

const dailyPriceOptionMatches: Record<string, (price: number) => boolean> = {
  daily0To49: (price) => price >= 0 && price < 50,
  daily50To99: (price) => price >= 50 && price < 100,
  daily100To149: (price) => price >= 100 && price < 150,
  daily150To199: (price) => price >= 150 && price < 200,
  daily200Plus: (price) => price >= 200,
};

const optionMatches: Record<string, (car: NormalizedCarResult) => boolean> = {
  smallCars: (car) => ["mini", "economy", "compact"].includes(car.category),
  mediumCars: (car) => ["intermediate", "full-size"].includes(car.category),
  suvs: (car) => car.category === "suv",
  luxuryCars: (car) => car.category === "luxury",
  vans: (car) => car.category === "van",
  automatic: (car) => car.transmission === "automatic",
  manual: (car) => car.transmission === "manual",
  seats4Plus: (car) => car.passengers >= 4,
  seats5Plus: (car) => car.passengers >= 5,
  seats7Plus: (car) => car.passengers >= 7,
  bags2Plus: (car) => car.bags >= 2,
  bags3Plus: (car) => car.bags >= 3,
  bags4Plus: (car) => car.bags >= 4,
  fullToFull: (car) => car.fuelPolicy === "full-to-full",
  sameToSame: (car) => car.fuelPolicy === "same-to-same",
  unlimitedMileage: (car) => car.mileagePolicy === "unlimited",
  limitedMileage: (car) => car.mileagePolicy === "limited",
  freeCancellation: (car) => car.offers.some((offer) => offer.freeCancellation),
  payAtPickup: (car) => car.offers.some((offer) => offer.payAtPickup),
  airportCounter: (car) => car.pickupType === "airport-counter",
  shuttlePickup: (car) => car.pickupType === "shuttle",
  cityLocation: (car) => car.pickupType === "city-location",
};

export const doesCarMatchFilterOption = (car: NormalizedCarResult, option: string, resolvePricePerDay: CarPricePerDayResolver = getPrimaryCarPricePerDay) => {
  const dailyPricePredicate = dailyPriceOptionMatches[option];
  if (dailyPricePredicate) {
    const price = resolvePricePerDay(car);
    return typeof price === "number" && Number.isFinite(price) && price >= 0 && dailyPricePredicate(price);
  }
  // Legacy required defaults must never turn unknown supplier data into a match.
  if (car.sandboxPresentation) {
    return car.sandboxPresentation.filterOptions?.includes(option) ?? false;
  }
  return optionMatches[option]?.(car) ?? false;
};

export function filterCarResults<T extends NormalizedCarResult>(results: T[], filters: SelectedCarFilters, resolvePricePerDay: CarPricePerDayResolver = getPrimaryCarPricePerDay): T[] {
  const groups = Object.values(filters).filter((options) => options.length);
  return results.filter((car) => groups.every((options) => options.some((option) => doesCarMatchFilterOption(car, option, resolvePricePerDay))));
}

// Kurioticket's transparent recommendation tie-breaker rewards practical rental terms.
function recommendedScore(car: NormalizedCarResult) {
  return car.recommendationScore * 1000 + (car.supplierRating ?? 0) * 10 +
    (doesCarMatchFilterOption(car, "freeCancellation") ? 4 : 0) + (doesCarMatchFilterOption(car, "unlimitedMileage") ? 3 : 0) +
    (doesCarMatchFilterOption(car, "airportCounter") ? 2 : doesCarMatchFilterOption(car, "cityLocation") ? 1 : 0);
}

export function sortCarResults<T extends NormalizedCarResult>(results: T[], sort: CarSort): T[] {
  const indexed = results.map((car, index) => ({ car, index }));
  return indexed.sort((a, b) => {
    const aOffer = getPrimaryCarOffer(a.car);
    const bOffer = getPrimaryCarOffer(b.car);
    const tie = a.car.id.localeCompare(b.car.id) || a.index - b.index;
    if (sort === "lowestTotal") return (aOffer?.totalPrice ?? Infinity) - (bOffer?.totalPrice ?? Infinity) || tie;
    if (sort === "topRated") return (b.car.supplierRating ?? -Infinity) - (a.car.supplierRating ?? -Infinity) || tie;
    return recommendedScore(b.car) - recommendedScore(a.car) ||
      (aOffer?.totalPrice ?? Infinity) - (bOffer?.totalPrice ?? Infinity) || tie;
  }).map(({ car }) => car);
}

/** Keep the strongest result from every successful provider visible before filling by rank. */
export function ensureCarProviderCoverage<T extends NormalizedCarResult>(ranked: T[]): T[] {
  const represented = new Set<T["inventorySource"]>();
  const leaders: T[] = [];
  const rest: T[] = [];
  for (const car of ranked) {
    if (!represented.has(car.inventorySource)) {
      represented.add(car.inventorySource);
      leaders.push(car);
    } else rest.push(car);
  }
  return [...leaders, ...rest];
}

export function assignCarBadges(results: NormalizedCarResult[]) {
  const assignments = new Map<string, CarResultBadge>();
  const candidates: Array<[CarResultBadge, NormalizedCarResult[]]> = [
    ["Cheapest", sortCarResults(results, "lowestTotal")],
    ["Top rated", sortCarResults(results, "topRated")],
    ["Best value", [...results].sort((a, b) => b.recommendationScore - a.recommendationScore || a.id.localeCompare(b.id))],
  ];
  for (const [badge, cars] of candidates) {
    const eligible = cars.find((car) => !assignments.has(car.id) && (badge !== "Top rated" || car.supplierRating !== undefined));
    if (eligible) assignments.set(eligible.id, badge);
  }
  return assignments;
}

export function calculateRentalDays(pickupDate: string, dropoffDate: string) {
  const pickup = Date.parse(`${pickupDate}T00:00:00Z`);
  const dropoff = Date.parse(`${dropoffDate}T00:00:00Z`);
  if (!Number.isFinite(pickup) || !Number.isFinite(dropoff)) return 1;
  return Math.max(Math.ceil((dropoff - pickup) / 86_400_000), 1);
}

export function carSearchUrlParams(search: LocationBoundCarSearchParams) {
  const params = new URLSearchParams();
  const scalarEntries = [
    ["pickupLocation", search.pickupLocation],
    ["dropoffLocation", search.dropoffLocation],
    ["pickupDate", search.pickupDate],
    ["pickupTime", search.pickupTime],
    ["dropoffDate", search.dropoffDate],
    ["dropoffTime", search.dropoffTime],
    ["driverAge", search.driverAge],
  ] as const;
  for (const [key, value] of scalarEntries) {
    if (value) params.set(key, value);
  }
  if (search.pickupLocationTarget) {
    params.set("pickupLocationTarget", JSON.stringify(search.pickupLocationTarget));
  }
  if (search.dropoffLocationTarget) {
    params.set("dropoffLocationTarget", JSON.stringify(search.dropoffLocationTarget));
  }
  return params;
}

export function buildCarDetailsHref(
  id: string,
  search: LocationBoundCarSearchParams,
) {
  const query = carSearchUrlParams(search).toString();
  return `/cars/details/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
}
