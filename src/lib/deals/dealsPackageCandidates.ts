import { getPrimaryCarOffer, sortCarResults } from "@/lib/cars/carResults";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { convertCurrencyAmount, type ExchangeRates } from "@/lib/currency/exchangeRates";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { getDealsProviderHandoff } from "./dealsProviderHandoff";
import { selectDealsFlightPreviews, selectDealsHotelPreviews } from "./dealsResultsPresentation";
import type { DealsPackageMode } from "./dealsSearchParams";

export type DealsPackageStrategy = "recommended" | "lowest-total" | "comfort" | "alternative";

export type DealsPackageCandidate = {
  id: string;
  strategy: DealsPackageStrategy;
  badgeKey: string;
  reasonKey?: string;
  flight?: PublicFlightResult;
  hotel?: PublicHotelResult;
  car?: NormalizedCarResult;
  estimatedTotal: number | null;
  displayCurrency: string;
  providerCount: number;
};

type Input = {
  mode: DealsPackageMode;
  flights: PublicFlightResult[];
  hotels: PublicHotelResult[];
  cars: NormalizedCarResult[];
  displayCurrency: string;
  rates: ExchangeRates;
};

const included = (mode: DealsPackageMode) => ({ flight: mode !== "hotel-car", hotel: mode !== "flight-car", car: mode !== "hotel-flight" });
const validFlight = (item: PublicFlightResult) => Number.isFinite(item.price) && item.price > 0 && Boolean(item.currency?.trim()) && getDealsProviderHandoff(item, "flight").available;
const validHotel = (item: PublicHotelResult) => item.inventoryKind !== "discovery" && Number.isFinite(item.totalPrice) && item.totalPrice > 0 && Boolean(item.currency?.trim()) && getDealsProviderHandoff(item, "hotel").available;
const validCar = (item: NormalizedCarResult) => { const offer = getPrimaryCarOffer(item); return Boolean(item.id.trim() && offer && Number.isFinite(offer.totalPrice) && offer.totalPrice > 0 && offer.currency.trim()); };

/** Builds a small, deterministic set of complete combinations from independently fetched inventory. */
export function buildDealsPackageCandidates({ mode, flights, hotels, cars, displayCurrency, rates }: Input): DealsPackageCandidate[] {
  const needs = included(mode);
  const flightOptions = selectDealsFlightPreviews(flights.filter(validFlight)).map(item => item.result);
  const hotelOptions = selectDealsHotelPreviews(hotels.filter(validHotel)).map(item => item.result);
  const carOptions = sortCarResults(cars.filter(validCar), "recommended").slice(0, 4);
  if ((needs.flight && !flightOptions.length) || (needs.hotel && !hotelOptions.length) || (needs.car && !carOptions.length)) return [];

  const strategies: DealsPackageStrategy[] = ["recommended", "lowest-total", "comfort", "alternative"];
  const pick = <T,>(items: T[], index: number) => items[index % items.length];
  const combinations = strategies.map((strategy, index) => ({
    strategy,
    flight: needs.flight ? pick(flightOptions, index) : undefined,
    hotel: needs.hotel ? pick(hotelOptions, index) : undefined,
    car: needs.car ? pick(carOptions, index) : undefined,
  }));
  const seen = new Set<string>();
  return combinations.flatMap(({ strategy, flight, hotel, car }) => {
    const id = [flight?.id, hotel?.id, car?.id].filter(Boolean).join("::");
    if (!id || seen.has(id)) return [];
    seen.add(id);
    const prices = [
      flight && { amount: flight.price, currency: flight.currency },
      hotel && { amount: hotel.totalPrice, currency: hotel.currency },
      car && (() => { const offer = getPrimaryCarOffer(car)!; return { amount: offer.totalPrice, currency: offer.currency }; })(),
    ].filter(Boolean) as Array<{ amount: number; currency: string }>;
    const converted = prices.map(price => convertCurrencyAmount(price.amount, price.currency, displayCurrency, rates));
    const estimatedTotal = converted.every((amount): amount is number => amount !== null) ? converted.reduce((sum, amount) => sum + amount, 0) : null;
    const providers = new Set([flight?.provider, hotel?.provider, car && (getPrimaryCarOffer(car)?.bookingProviderName || car.rentalCompanyName)].map(value => value?.trim()).filter(Boolean));
    return [{ id, strategy, badgeKey: `deals.results.package.${strategy}.badge`, reasonKey: `deals.results.package.${strategy}.reason`, flight, hotel, car, estimatedTotal, displayCurrency: displayCurrency.toUpperCase(), providerCount: providers.size }];
  }).slice(0, 3);
}
