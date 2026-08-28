import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { calculateRentalDays } from "@/lib/cars/carResults";
import {
  staticCarCatalogue,
  getStaticCarId,
} from "@/services/travel/staticCarCatalogue";

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
    offers: offerFixtures.map((fixture, index) => ({
      ...fixture,
      id: `${getStaticCarId(car.id)}-offer-${index + 1}`,
      bookingProviderName: "Kurioticket static fixture",
      rentalCompanyName: car.rentalCompanyName,
      currency: "USD",
      totalPrice: fixture.pricePerDay * days,
    })),
  }));
}
