import type { CarSearchParams, NormalizedCarResult } from "@/lib/cars/types";
import { calculateRentalDays } from "@/lib/cars/carResults";
import { demoCarCatalog, getDemoCarId } from "@/services/travel/demoCarCatalog";

export function buildDemoCarResults(search: CarSearchParams): NormalizedCarResult[] {
  const days = calculateRentalDays(search.pickupDate, search.dropoffDate);
  return demoCarCatalog.map(({ dailyPrices, ...car }) => ({
    ...car,
    id: getDemoCarId(car.id),
    pickupLocation: search.pickupLocation,
    returnLocation: search.dropoffLocation || search.pickupLocation,
    requiredDocuments: [...car.requiredDocuments],
    includedItems: [...car.includedItems],
    importantInformation: [...car.importantInformation],
    offers: dailyPrices.map((pricePerDay, index) => ({
      id: `${getDemoCarId(car.id)}-offer-${index + 1}`,
      bookingProviderName: index ? "Sample Journey Desk" : "Kurioticket Demo Desk",
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
