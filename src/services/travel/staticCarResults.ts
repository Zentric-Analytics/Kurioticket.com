import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { calculateRentalDays } from "@/lib/cars/carResults";
import {
  staticCarCatalogue,
  getStaticCarId,
} from "@/services/travel/staticCarCatalogue";

function buildStaticComparisonFixtures<T extends { pricePerDay: number }>(
  offerFixtures: readonly T[],
): T[] {
  if (offerFixtures.length !== 1) return [...offerFixtures];
  const base = offerFixtures[0];
  const prices = [
    base.pricePerDay,
    Math.max(base.pricePerDay + 1, Math.round(base.pricePerDay * 1.05)),
    Math.max(base.pricePerDay + 2, Math.round(base.pricePerDay * 1.1)),
  ];
  return prices.map((pricePerDay) => ({ ...base, pricePerDay }));
}

export function buildStaticCarResults(
  search: CarSearchParams,
): NormalizedCarResult[] {
  const days = calculateRentalDays(search.pickupDate, search.dropoffDate);
  return staticCarCatalogue.map(({ offerFixtures, ...car }) => ({
    ...car,
    id: getStaticCarId(car.id),
    pickupLocation: search.pickupLocation,
    returnLocation: search.dropoffLocation || search.pickupLocation,
    requiredDocuments: [...car.requiredDocuments],
    includedItems: [...car.includedItems],
    importantInformation: [...car.importantInformation],
    offers: buildStaticComparisonFixtures(offerFixtures).map((fixture, index) => ({
      ...fixture,
      id: `${getStaticCarId(car.id)}-offer-${index + 1}`,
      bookingProviderName: "Kurioticket static fixture",
      rentalCompanyName: car.rentalCompanyName,
      currency: "USD",
      totalPrice: fixture.pricePerDay * days,
    })),
  }));
}
