import type { CarOffer, CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";

export type SelectedCarFilters = Record<string, string[]>;
export type CarSort = "recommended" | "lowestTotal" | "topRated";
export type CarResultBadge = "Best value" | "Cheapest" | "Top rated";

export const getPrimaryCarOffer = (car: NormalizedCarResult): CarOffer | undefined =>
  [...car.offers].filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice >= 0)
    .sort((a, b) => a.totalPrice - b.totalPrice || a.pricePerDay - b.pricePerDay || a.id.localeCompare(b.id))[0];

const optionMatches: Record<string, (car: NormalizedCarResult) => boolean> = {
  smallCars: (car) => ["mini", "economy", "compact"].includes(car.category),
  mediumCars: (car) => ["intermediate", "full-size"].includes(car.category),
  suvs: (car) => car.category === "suv",
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

export function filterCarResults(results: NormalizedCarResult[], filters: SelectedCarFilters) {
  const groups = Object.values(filters).filter((options) => options.length);
  return results.filter((car) => groups.every((options) => options.some((option) => optionMatches[option]?.(car))));
}

// Kurioticket's transparent recommendation tie-breaker rewards practical rental terms.
function recommendedScore(car: NormalizedCarResult) {
  const offer = getPrimaryCarOffer(car);
  return car.recommendationScore * 1000 + (car.supplierRating ?? 0) * 10 +
    (offer?.freeCancellation ? 4 : 0) + (car.mileagePolicy === "unlimited" ? 3 : 0) +
    (car.pickupType === "airport-counter" ? 2 : car.pickupType === "city-location" ? 1 : 0);
}

export function sortCarResults(results: NormalizedCarResult[], sort: CarSort) {
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

export function buildCarDetailsHref(id: string, search: CarSearchParams) {
  const params = new URLSearchParams();
  Object.entries(search).forEach(([key, value]) => value && params.set(key, value));
  const query = params.toString();
  return `/cars/details/${encodeURIComponent(id)}${query ? `?${query}` : ""}`;
}
