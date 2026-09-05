import type { HotelAmenityPresentationItem } from "../../../../../src/components/results/hotelAmenityPresentation";

export function nativeHotelAmenityLabel(item: HotelAmenityPresentationItem) {
  return item.translationKey === "hotelResults.filter.freeWifi"
    ? "Free Wi-Fi"
    : item.label;
}
