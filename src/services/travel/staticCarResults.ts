import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { calculateRentalDays } from "@/lib/cars/carResults";
import { staticCarCatalogue, getStaticCarId } from "@/services/travel/staticCarCatalogue";

export function buildStaticCarResults(search: CarSearchParams): NormalizedCarResult[] {
  const days = calculateRentalDays(search.pickupDate, search.dropoffDate);
  return staticCarCatalogue.map(({ dailyPrices, ...car }) => ({
    ...car,
    id: getStaticCarId(car.id),
    pickupLocation: search.pickupLocation,
    returnLocation: search.dropoffLocation || search.pickupLocation,
    requiredDocuments: [...car.requiredDocuments],
    includedItems: [...car.includedItems],
    importantInformation: [...car.importantInformation],
    offers: dailyPrices.map((pricePerDay, index) => ({
      id: `${getStaticCarId(car.id)}-offer-${index + 1}`,
      bookingProviderName: index ? "Journey Desk" : "Kurioticket Desk",
      rentalCompanyName: car.rentalCompanyName,
      currency: "USD",
      pricePerDay,
      totalPrice: pricePerDay * days,
      taxesAndFeesIncluded: index % 2 === 0,
      payAtPickup: (dailyPrices.length + index) % 2 === 1,
      freeCancellation: index === 0 && car.recommendationScore >= 75,
    })),
  }));
}
