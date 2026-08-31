import type { PublicHotelResult } from "@/lib/types";

import { buildHotelAmenityPresentation } from "./hotelAmenityPresentation";

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

const canonicalFacilityLabels: Record<string, string> = {
  wifi: "Wi-Fi",
  breakfast: "Breakfast",
  pool: "Pool",
  spa: "Spa",
  airportShuttle: "Airport shuttle",
  parking: "Parking",
  petFriendly: "Pet friendly",
  evCharging: "EV charging",
  fitness: "Fitness center",
  workspace: "Workspace",
  quietRooms: "Quiet rooms",
  frontDesk: "24-hour front desk",
  lateCheckIn: "Late check-in",
  kitchenette: "Kitchenette",
  bikeStorage: "Bike storage",
  courtyard: "Courtyard",
  lounge: "Lounge",
  restaurant: "Restaurant",
  airConditioning: "Air conditioning",
};

function getHotelFacilityItems(hotel: PublicHotelResult) {
  return buildHotelAmenityPresentation(
    hotel.amenities,
    hotel.amenities.length,
  );
}

function getFacilityValue(
  item: ReturnType<typeof buildHotelAmenityPresentation>[number],
) {
  return item.iconKey === "generic" ? item.key : item.iconKey;
}

function getFacilityLabel(
  item: ReturnType<typeof buildHotelAmenityPresentation>[number],
  t: (key: string) => string,
) {
  if (item.translationKey) return t(item.translationKey);
  if (item.iconKey !== "generic") {
    return canonicalFacilityLabels[item.iconKey] ?? item.label;
  }

  return item.label;
}

function getHotelFacilityValues(hotel: PublicHotelResult) {
  return new Set(getHotelFacilityItems(hotel).map(getFacilityValue));
}

export function buildHotelFacilityFilterOptions(
  hotels: PublicHotelResult[],
  t: (key: string) => string,
): FilterOption[] {
  const optionCounts = new Map<string, number>();
  const optionLabels = new Map<string, string>();

  hotels.forEach((hotel) => {
    const hotelValues = new Set<string>();

    getHotelFacilityItems(hotel).forEach((item) => {
      const value = getFacilityValue(item);
      hotelValues.add(value);
      if (!optionLabels.has(value)) {
        optionLabels.set(value, getFacilityLabel(item, t));
      }
    });

    hotelValues.forEach((value) => {
      optionCounts.set(value, (optionCounts.get(value) ?? 0) + 1);
    });
  });

  return Array.from(optionCounts.entries())
    .filter(([, count]) => count > 0)
    .map(([value, count]) => ({
      value,
      label: optionLabels.get(value) ?? value,
      count,
    }))
    .sort((first, second) => {
      const priority = ["petFriendly", "parking", "evCharging", "pool", "spa", "fitness"];
      const firstPriority = priority.indexOf(first.value);
      const secondPriority = priority.indexOf(second.value);
      if (firstPriority >= 0 || secondPriority >= 0) {
        if (firstPriority < 0) return 1;
        if (secondPriority < 0) return -1;
        return firstPriority - secondPriority;
      }
      return second.count - first.count || first.label.localeCompare(second.label);
    });
}

export function hotelMatchesFacilityFilters(
  hotel: PublicHotelResult,
  selectedValues: string[],
) {
  if (selectedValues.length === 0) return true;

  const hotelValues = getHotelFacilityValues(hotel);
  return selectedValues.some((value) => hotelValues.has(value));
}
