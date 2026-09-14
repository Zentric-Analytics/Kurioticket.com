import type { CarFilterGroup, CarFilterOption } from "@/lib/cars/carFilterPresentation";
import type { ExchangeRates } from "../currency/displayCurrency";
import { carPriceFilterLabels } from "./carDisplayCurrency";
import { carText } from "./carMobileLocalization";

type FilterCopy = { filters: string; allCars: string; applied: string; clearAll: string; close: string; show: string; car: string; cars: string; updatingFilters: string; groups: Record<string, string>; options: Record<string, string> };

const groupKeys: Record<string, string> = {
  totalPrice: "carsResults.total",
  vehicleType: "carsResults.vehicleType",
  transmission: "carsResults.transmission",
  seats: "carsResults.seats",
  bags: "carsResults.bags",
  fuelPolicy: "carsResults.fuelPolicy",
  mileagePolicy: "carsResults.mileagePolicy",
  cancellation: "carsResults.cancellation",
  pickupLocationType: "carsResults.pickupLocationType",
};

const optionKeys: Record<string, string> = {
  smallCars: "carsResults.smallCars", mediumCars: "carsResults.mediumCars", suvs: "carsResults.suvs", luxuryCars: "carsTripStyle.luxury.title", vans: "carsTripStyle.van.title",
  automatic: "carsResults.automatic", manual: "carsResults.manual", seats4Plus: "carsResults.seats4Plus", seats5Plus: "carsResults.seats5Plus", seats7Plus: "carsResults.seats7Plus",
  bags2Plus: "carsResults.bags2Plus", bags3Plus: "carsResults.bags3Plus", bags4Plus: "carsResults.bags4Plus", fullToFull: "carsResults.fullToFull", sameToSame: "carsResults.sameToSame",
  unlimitedMileage: "carsResults.unlimitedMileage", limitedMileage: "carsResults.limitedMileage", freeCancellation: "carsResults.freeCancellation", payAtPickup: "carsResults.payAtPickup",
  airportCounter: "carsResults.airportCounter", shuttlePickup: "carsResults.shuttlePickup", cityLocation: "carsResults.cityLocation",
};

const fallbackGroups: Record<string, string> = { totalPrice: "Total price", vehicleType: "Vehicle type", transmission: "Transmission", seats: "Seats", bags: "Bags", fuelPolicy: "Fuel policy", mileagePolicy: "Mileage", cancellation: "Booking flexibility", pickupLocationType: "Pickup location type" };
const fallbackOptions: Record<string, string> = { smallCars: "Small cars", mediumCars: "Medium cars", suvs: "SUVs", luxuryCars: "Luxury cars", vans: "Vans", automatic: "Automatic", manual: "Manual", seats4Plus: "4+ seats", seats5Plus: "5+ seats", seats7Plus: "7+ seats", bags2Plus: "2+ bags", bags3Plus: "3+ bags", bags4Plus: "4+ bags", fullToFull: "Full to full", sameToSame: "Same to same", unlimitedMileage: "Unlimited mileage", limitedMileage: "Limited mileage", freeCancellation: "Free cancellation", payAtPickup: "Pay at pickup", airportCounter: "Airport counter", shuttlePickup: "Shuttle pickup", cityLocation: "City location" };

export const carFilterCopy = (locale: string, displayCurrency = "USD", rates: ExchangeRates = {}): FilterCopy => {
  const priceLabels = carPriceFilterLabels(displayCurrency, rates);
  const groups = Object.fromEntries(Object.entries(groupKeys).map(([id, key]) => [id, carText(locale, key, fallbackGroups[id] ?? id)]));
  const options = Object.fromEntries(Object.entries(optionKeys).map(([id, key]) => [id, carText(locale, key, fallbackOptions[id] ?? id)]));
  return {
    filters: carText(locale, "carsResults.filterBy", "Filters"),
    allCars: carText(locale, "carsResults.carResultsAria", "All cars shown"),
    applied: carText(locale, "carsResults.activeFilterCount", "{count} active").replace("{count}", "").trim(),
    clearAll: carText(locale, "clearAll", "Clear all"),
    close: carText(locale, "carsResults.closeFilters", "Close car filters"),
    show: carText(locale, "show", "Show"),
    car: carText(locale, "cars", "car"),
    cars: carText(locale, "cars", "cars"),
    updatingFilters: carText(locale, "carsResults.loading.preparingResults", "Updating filters…"),
    groups,
    options: { ...options, ...priceLabels },
  };
};
export const carFilterGroupLabel = (copy: FilterCopy, group: CarFilterGroup) => copy.groups[group.id] ?? group.title ?? group.titleKey;
export const carFilterOptionLabel = (copy: FilterCopy, option: CarFilterOption) => copy.options[option.id] ?? option.label ?? option.labelKey;
