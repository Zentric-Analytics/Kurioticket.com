import { convertCurrencyAmount, type ExchangeRates } from "@/lib/currency/exchangeRates";
import type { NormalizedHotelResult, PublicHotelResult } from "@/lib/types";

type HotelResult = NormalizedHotelResult | PublicHotelResult;

export type PricedHotelResult = HotelResult & {
  inventoryKind?: "bookable";
  pricePerNight: number;
  totalPrice: number;
  currency: string;
};

export function getHotelPriceDetails(hotel: HotelResult | null | undefined) {
  if (!hotel || hotel.inventoryKind === "discovery") return null;

  const pricePerNight = "pricePerNight" in hotel ? hotel.pricePerNight : undefined;
  const totalPrice = "totalPrice" in hotel ? hotel.totalPrice : undefined;
  const currency = "currency" in hotel ? hotel.currency?.trim().toUpperCase() : "";

  if (
    typeof pricePerNight !== "number" ||
    !Number.isFinite(pricePerNight) ||
    pricePerNight <= 0 ||
    typeof totalPrice !== "number" ||
    !Number.isFinite(totalPrice) ||
    totalPrice <= 0 ||
    !currency
  ) {
    return null;
  }

  return { pricePerNight, totalPrice, currency };
}

export function hasHotelPrice(hotel: HotelResult | null | undefined): hotel is PricedHotelResult {
  return getHotelPriceDetails(hotel) !== null;
}

export function getComparableHotelTotalUsd(
  hotel: HotelResult | null | undefined,
  rates?: ExchangeRates,
) {
  const price = getHotelPriceDetails(hotel);
  if (!price) return null;

  const converted = convertCurrencyAmount(price.totalPrice, price.currency, "USD", rates);
  return converted !== null && converted > 0 ? converted : null;
}

export function compareHotelsByAvailablePrice(
  first: HotelResult,
  second: HotelResult,
  rates?: ExchangeRates,
) {
  const firstTotal = getComparableHotelTotalUsd(first, rates);
  const secondTotal = getComparableHotelTotalUsd(second, rates);

  if (firstTotal === null && secondTotal === null) return 0;
  if (firstTotal === null) return 1;
  if (secondTotal === null) return -1;

  return firstTotal - secondTotal;
}

export function getLowestPricedHotelId(
  hotels: HotelResult[],
  rates?: ExchangeRates,
) {
  let lowestId: string | null = null;
  let lowestTotal: number | null = null;

  for (const hotel of hotels) {
    const total = getComparableHotelTotalUsd(hotel, rates);
    if (total === null) continue;
    if (lowestTotal === null || total < lowestTotal) {
      lowestTotal = total;
      lowestId = hotel.id;
    }
  }

  return lowestId;
}
