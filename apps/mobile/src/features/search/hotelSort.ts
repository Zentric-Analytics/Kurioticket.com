import type { HotelResult } from "../../api/travelApi";
import { convertAmount, type ExchangeRates } from "../currency/displayCurrency";
import { getHotelComparableReviewScore } from "../../../../../src/lib/hotels/hotelRatingSemantics";

export type HotelSortMode = "cheapest" | "bestValue" | "topRated";

export const defaultHotelSort: HotelSortMode = "cheapest";

export const hotelSortOptions: readonly { value: HotelSortMode; label: string; description: string }[] = [
  { value: "cheapest", label: "Cheapest", description: "Lowest comparable total stay price" },
  { value: "bestValue", label: "Best value", description: "Best value score first" },
  { value: "topRated", label: "Top rated", description: "Highest guest review score first" },
];

export function hotelSortLabel(mode: HotelSortMode) {
  return hotelSortOptions.find((option) => option.value === mode)?.label ?? "Cheapest";
}

export function sortHotelsForResults(
  hotels: HotelResult[],
  mode: HotelSortMode = defaultHotelSort,
  rates?: ExchangeRates,
) {
  if (mode === "bestValue" && !hotels.some(hasUsableValueScore)) return hotels.slice();

  return hotels
    .map((hotel, index) => ({ hotel, index }))
    .sort((first, second) => {
      if (mode === "cheapest") {
        return compareAvailablePrice(first.hotel, second.hotel, rates) || first.index - second.index;
      }

      if (mode === "topRated") {
        return compareNullableDescending(
          getHotelComparableReviewScore(first.hotel),
          getHotelComparableReviewScore(second.hotel),
        ) || sortableClassification(second.hotel) - sortableClassification(first.hotel)
          || sortablePrice(first.hotel, rates) - sortablePrice(second.hotel, rates)
          || first.index - second.index;
      }

      const firstScore = valueScore(first.hotel);
      const secondScore = valueScore(second.hotel);
      if (firstScore === null && secondScore === null) return first.index - second.index;
      if (firstScore === null) return 1;
      if (secondScore === null) return -1;
      return secondScore - firstScore
        || sortablePrice(first.hotel, rates) - sortablePrice(second.hotel, rates)
        || first.index - second.index;
    })
    .map(({ hotel }) => hotel);
}

function sortablePrice(hotel: HotelResult, rates?: ExchangeRates) {
  return comparableTotalUsd(hotel, rates) ?? Number.POSITIVE_INFINITY;
}

function comparableTotalUsd(hotel: HotelResult, rates?: ExchangeRates) {
  const currency = hotel.currency?.trim().toUpperCase();
  if (!hasValidPrice(hotel) || !currency) return null;
  const converted = convertAmount(hotel.totalPrice!, currency, "USD", rates ?? {});
  return converted !== null && converted > 0 ? converted : null;
}

function hasValidPrice(hotel: HotelResult) {
  return hotel.inventoryKind !== "discovery" && Boolean(hotel.currency?.trim())
    && Number.isFinite(hotel.pricePerNight) && hotel.pricePerNight > 0
    && Number.isFinite(hotel.totalPrice) && hotel.totalPrice > 0;
}

function compareAvailablePrice(first: HotelResult, second: HotelResult, rates?: ExchangeRates) {
  const firstTotal = comparableTotalUsd(first, rates);
  const secondTotal = comparableTotalUsd(second, rates);
  if (firstTotal === null && secondTotal === null) return 0;
  if (firstTotal === null) return 1;
  if (secondTotal === null) return -1;
  return firstTotal - secondTotal;
}

function compareNullableDescending(first: number | null, second: number | null) {
  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  return second - first;
}

function sortableClassification(hotel: HotelResult) {
  return hotel.classificationStars ?? Number.NEGATIVE_INFINITY;
}

function hasUsableValueScore(hotel: HotelResult) {
  return valueScore(hotel) !== null;
}

function valueScore(hotel: HotelResult) {
  return hasValidPrice(hotel) && Number.isFinite(hotel.valueScore) ? hotel.valueScore : null;
}
