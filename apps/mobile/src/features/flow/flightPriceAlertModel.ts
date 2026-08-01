import type { FlightResult } from "../../api/travelApi";
import type { SearchPlan } from "./travelSearchModel";
import { supportedCurrencies } from "../../../../../src/lib/region/supportedRegions";

export const MAX_PRICE_ALERT_TARGET = 9999999999.99;
const supported = new Set(supportedCurrencies.map(({ code }) => code));
export type CanonicalCabin = "economy" | "premium-economy" | "business" | "first";

export function availableFlightAlertCurrencies(results: FlightResult[]) {
  return [...new Set(results.map(({ currency }) => currency.trim().toUpperCase()).filter((code) => /^[A-Z]{3}$/.test(code) && supported.has(code)))];
}

export function parseTargetPrice(draft: string): { value?: number; error?: string } {
  const text = draft.trim();
  if (!text) return { error: "Enter a target price." };
  if (text.includes(",") || !/^\d+(?:\.\d{1,2})?$/.test(text)) return { error: "Enter a number with no more than two decimal places." };
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) return { error: "Target price must be greater than zero." };
  if (value > MAX_PRICE_ALERT_TARGET) return { error: `Target price must not exceed ${MAX_PRICE_ALERT_TARGET}.` };
  return { value };
}

export function buildFlightPriceAlertPayload(plan: SearchPlan, targetPrice: number, currency: string) {
  const query = plan.payload;
  const cabinClass = String(query.cabinClass) as CanonicalCabin;
  const adults = Number(query.adults); const children = Number(query.children); const infants = Number(query.infants);
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!supported.has(normalizedCurrency)) throw new Error("Unsupported alert currency.");
  return {
    type: "FLIGHT" as const,
    origin: String(query.origin), destination: String(query.destination), targetPrice, currency: normalizedCurrency,
    query: {
      tripType: query.tripType as "round-trip" | "one-way", origin: String(query.origin), destination: String(query.destination),
      departureDate: String(query.departureDate), ...(query.tripType === "round-trip" ? { returnDate: String(query.returnDate) } : {}),
      adults, children, infants, travelers: adults + children + infants, cabinClass, currency: normalizedCurrency,
    },
  };
}
