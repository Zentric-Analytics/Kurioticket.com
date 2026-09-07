import type { CarResult, MobilePriceAlert } from "../../api/travelApi";
import { supportedCurrencies } from "../../config/supportedCurrencies";
import type { SearchPlan } from "./travelSearchModel";

const supported = new Set(supportedCurrencies.map(({ code }) => code));
const text = (value: unknown) => String(value ?? "").trim().toLowerCase();
const fields = ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"] as const;

export function carAlertPresentation(plan: SearchPlan | undefined, results: CarResult[]) {
  const comparable = plan ? results.flatMap((result) => result.offers).filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice > 0 && supported.has(offer.currency.trim().toUpperCase())) : [];
  const currencies = [...new Set(comparable.map((offer) => offer.currency.trim().toUpperCase()))];
  return { visible: Boolean(plan) && comparable.length > 0, comparable, currencies, enabled: currencies.length > 0 };
}

export function buildCarPriceAlertPayload(plan: SearchPlan, targetPrice: number, currency: string) {
  const payload = plan.payload;
  const pickupLocation = String(payload.pickupLocation).trim();
  const query = { pickupLocation, dropoffLocation: String(payload.dropoffLocation || pickupLocation).trim(), pickupDate: String(payload.pickupDate), pickupTime: String(payload.pickupTime), dropoffDate: String(payload.dropoffDate), dropoffTime: String(payload.dropoffTime), driverAge: String(payload.driverAge) };
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!supported.has(normalizedCurrency)) throw new Error("Unsupported alert currency.");
  return { type: "CAR" as const, origin: query.pickupLocation, destination: query.dropoffLocation, targetPrice, mode: "TARGET" as const, currency: normalizedCurrency, query };
}

export function carPriceAlertMatchesPlan(alert: MobilePriceAlert, plan: SearchPlan) {
  if (alert.type !== "CAR") return false;
  const expected = buildCarPriceAlertPayload(plan, 1, "USD").query;
  return fields.every((field) => text(alert.query[field]) === text(expected[field]));
}

export function matchingCarPriceAlert(alerts: MobilePriceAlert[], plan: SearchPlan) {
  const matches = alerts.filter((alert) => carPriceAlertMatchesPlan(alert, plan));
  return matches.find(({ status }) => status === "ACTIVE") ?? matches.find(({ status }) => status === "PAUSED");
}
