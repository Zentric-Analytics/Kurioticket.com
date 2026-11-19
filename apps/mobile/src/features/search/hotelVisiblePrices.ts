import type { HotelResult } from "../../api/travelApi";
import type { ExchangeRates } from "../currency/displayCurrency";
import { createHotelDisplayPrices, type HotelDisplayPriceSnapshot } from "./hotelDetailCurrency";

/** Price presentation follows the same sorted reveal window as the result list.
 * Full inventory remains available to filtering/sorting without eager Intl work. */
export function hotelVisiblePrices(results: readonly HotelResult[], limit: number, currency: string, rates: ExchangeRates) {
  const prices = new Map<string, HotelDisplayPriceSnapshot>();
  for (const result of results.slice(0, Math.max(0, Math.floor(limit)))) {
    if (Number.isFinite(result.pricePerNight) && Number.isFinite(result.totalPrice) && typeof result.currency === "string") {
      prices.set(result.id, createHotelDisplayPrices(result.pricePerNight!, result.totalPrice!, result.currency, currency, rates));
    }
  }
  return prices;
}
