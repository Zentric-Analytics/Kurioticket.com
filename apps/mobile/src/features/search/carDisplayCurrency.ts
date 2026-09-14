import type { CarResult } from "../../api/travelApi";
import { convertAmount, displayPrice, formatCurrency, type ExchangeRates } from "../currency/displayCurrency";
import { doesCarMatchFilterOption, type CarSort, type SelectedCarFilters } from "@/lib/cars/carResults";

export const CAR_PRICE_FILTER_USD_BANDS = { lower: 100, upper: 150 } as const;

export function carDisplayAmount(amount: number, sourceCurrency: string, displayCurrency: string, rates: ExchangeRates) {
  return convertAmount(amount, sourceCurrency, displayCurrency, rates) ?? (sourceCurrency.toUpperCase() === displayCurrency.toUpperCase() ? amount : null);
}

export function carDisplayPrice(amount: number, sourceCurrency: string, displayCurrency: string, rates: ExchangeRates) {
  return displayPrice(amount, sourceCurrency, displayCurrency, rates);
}

export function primaryCarOfferForDisplay(car: CarResult, displayCurrency: string, rates: ExchangeRates) {
  const valid = car.offers.filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice >= 0);
  return [...valid].sort((a, b) => {
    const aDisplay = carDisplayAmount(a.totalPrice, a.currency, displayCurrency, rates);
    const bDisplay = carDisplayAmount(b.totalPrice, b.currency, displayCurrency, rates);
    if (aDisplay !== null && bDisplay !== null) return aDisplay - bDisplay || a.id.localeCompare(b.id);
    if (aDisplay !== null) return -1;
    if (bDisplay !== null) return 1;
    if (a.currency.toUpperCase() === b.currency.toUpperCase()) return a.totalPrice - b.totalPrice || a.id.localeCompare(b.id);
    return a.id.localeCompare(b.id);
  })[0];
}

export function carDisplayThresholds(displayCurrency: string, rates: ExchangeRates) {
  const lower = carDisplayAmount(CAR_PRICE_FILTER_USD_BANDS.lower, "USD", displayCurrency, rates);
  const upper = carDisplayAmount(CAR_PRICE_FILTER_USD_BANDS.upper, "USD", displayCurrency, rates);
  return {
    lower: lower ?? CAR_PRICE_FILTER_USD_BANDS.lower,
    upper: upper ?? CAR_PRICE_FILTER_USD_BANDS.upper,
    currency: lower !== null && upper !== null ? displayCurrency.toUpperCase() : "USD",
  };
}

export function carPriceFilterLabels(displayCurrency: string, rates: ExchangeRates) {
  const { lower, upper, currency } = carDisplayThresholds(displayCurrency, rates);
  return {
    totalUnder100: `Under ${formatCurrency(lower, currency)} total`,
    total100To149: `${formatCurrency(lower, currency)}–${formatCurrency(upper, currency)} total`,
    total150Plus: `${formatCurrency(upper, currency)}+ total`,
  };
}

function matchesDisplayPriceOption(car: CarResult, option: string, displayCurrency: string, rates: ExchangeRates) {
  const offer = primaryCarOfferForDisplay(car, displayCurrency, rates);
  if (!offer) return false;
  const total = carDisplayAmount(offer.totalPrice, offer.currency, displayCurrency, rates);
  if (total === null) return false;
  const { lower, upper } = carDisplayThresholds(displayCurrency, rates);
  if (option === "totalUnder100") return total < lower;
  if (option === "total100To149") return total >= lower && total < upper;
  if (option === "total150Plus") return total >= upper;
  return false;
}

export function doesCarMatchDisplayFilterOption(car: CarResult, option: string, displayCurrency: string, rates: ExchangeRates) {
  return option.startsWith("total")
    ? matchesDisplayPriceOption(car, option, displayCurrency, rates)
    : doesCarMatchFilterOption(car, option);
}

export function filterCarResultsForDisplayCurrency(results: CarResult[], filters: SelectedCarFilters, displayCurrency: string, rates: ExchangeRates) {
  const groups = Object.values(filters).filter((options) => options.length);
  return results.filter((car) => groups.every((options) => options.some((option) => doesCarMatchDisplayFilterOption(car, option, displayCurrency, rates))));
}

function recommendedScore(car: CarResult) {
  return car.recommendationScore * 1000 + (car.supplierRating ?? 0) * 10 +
    (doesCarMatchFilterOption(car, "freeCancellation") ? 4 : 0) +
    (doesCarMatchFilterOption(car, "unlimitedMileage") ? 3 : 0) +
    (doesCarMatchFilterOption(car, "airportCounter") ? 2 : doesCarMatchFilterOption(car, "cityLocation") ? 1 : 0);
}

export function sortCarResultsForDisplayCurrency(results: CarResult[], sort: CarSort, displayCurrency: string, rates: ExchangeRates) {
  const indexed = results.map((car, index) => ({ car, index }));
  return indexed.sort((a, b) => {
    const aOffer = primaryCarOfferForDisplay(a.car, displayCurrency, rates);
    const bOffer = primaryCarOfferForDisplay(b.car, displayCurrency, rates);
    const aTotal = aOffer ? carDisplayAmount(aOffer.totalPrice, aOffer.currency, displayCurrency, rates) : null;
    const bTotal = bOffer ? carDisplayAmount(bOffer.totalPrice, bOffer.currency, displayCurrency, rates) : null;
    const displayTie = (aTotal ?? Infinity) - (bTotal ?? Infinity);
    const stableTie = a.car.id.localeCompare(b.car.id) || a.index - b.index;
    if (sort === "lowestTotal") return displayTie || stableTie;
    if (sort === "topRated") return (b.car.supplierRating ?? -Infinity) - (a.car.supplierRating ?? -Infinity) || stableTie;
    return recommendedScore(b.car) - recommendedScore(a.car) || displayTie || stableTie;
  }).map(({ car }) => car);
}
