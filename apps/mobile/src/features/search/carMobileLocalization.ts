import { getTranslations } from "@/lib/i18n";
import { translations as enTranslations } from "@/lib/i18n/en";
import type { CarResult } from "../../api/travelApi";
import { mobileLocales } from "../../localization/mobileLocalizationCatalog";

const interpolate = (value: string, params?: Record<string, string | number>) => {
  if (!params) return value;
  return Object.entries(params).reduce((text, [key, replacement]) => text.replaceAll(`{${key}}`, String(replacement)), value);
};

export const carIntlLocale = (locale: string) => {
  const normalized = locale.trim().toLowerCase();
  return mobileLocales.find((option) => option.code === normalized || option.intl.toLowerCase() === normalized)?.intl ?? "en-US";
};

export function carText(locale: string, key: string, fallback: string, params?: Record<string, string | number>) {
  const dictionary = getTranslations(locale);
  return interpolate(dictionary[key] ?? enTranslations[key] ?? fallback, params);
}

export function carFormatDate(locale: string, value: string, options: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return value;
  return new Intl.DateTimeFormat(carIntlLocale(locale), { ...options, timeZone: "UTC" }).format(date);
}

export function carFormatTime(locale: string, value: string) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return value;
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(carIntlLocale(locale), { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2000, 0, 1, hour, minute)));
}

export const carYearsOld = (locale: string, age: number) => {
  const number = new Intl.NumberFormat(carIntlLocale(locale)).format(age);
  return `${number} ${carText(locale, "carsResults.yearsOld", "years old")}`;
};

export const carCountLabel = (locale: string, count: number) => carText(locale, "carsResults.resultsCount", "{count} cars", {
  count: new Intl.NumberFormat(carIntlLocale(locale)).format(count),
});

export const carCategoryLabel = (locale: string, result: Pick<CarResult, "category" | "categoryLabel">) => {
  const keyByCategory: Record<string, string> = {
    mini: "carsResults.smallCars",
    economy: "carsTripStyle.economy.title",
    compact: "carsResults.smallCars",
    intermediate: "carsResults.mediumCars",
    "full-size": "carsResults.mediumCars",
    suv: "carsTripStyle.suv.title",
    luxury: "carsTripStyle.luxury.title",
    van: "carsTripStyle.van.title",
  };
  const key = keyByCategory[result.category];
  return key ? carText(locale, key, result.categoryLabel) : result.categoryLabel;
};

export const carPickupTypeLabel = (locale: string, type: CarResult["pickupType"]) => ({
  "airport-counter": carText(locale, "carsResults.airportCounter", "Airport counter"),
  shuttle: carText(locale, "carsResults.shuttlePickup", "Shuttle pickup"),
  "city-location": carText(locale, "carsResults.cityLocation", "City location"),
  "meet-and-greet": carText(locale, "carsResults.pickupLocationType", "Meet and greet"),
})[type];

export const carFuelPolicyLabel = (locale: string, policy: CarResult["fuelPolicy"]) => policy === "full-to-full"
  ? carText(locale, "carsResults.fullToFull", "Full-to-full")
  : policy === "same-to-same"
    ? carText(locale, "carsResults.sameToSame", "Same-to-same")
    : carText(locale, "carsResults.fuelPolicy", "Fuel policy");

export const carMileageLabel = (locale: string, car: Pick<CarResult, "mileagePolicy" | "limitedMileageKm">) => car.mileagePolicy === "unlimited"
  ? carText(locale, "carDetails.unlimitedMileage", "Unlimited mileage")
  : `${car.limitedMileageKm ?? "—"} km ${carText(locale, "carDetails.includedShort", "included")}`;
