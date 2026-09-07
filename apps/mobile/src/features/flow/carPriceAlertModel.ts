import type { CarResult, MobilePriceAlert } from "../../api/travelApi";
import { supportedCurrencies } from "../../config/supportedCurrencies";
import type { SearchPlan } from "./travelSearchModel";

const supported = new Set(supportedCurrencies.map(({ code }) => code));
const text = (value: unknown) => String(value ?? "").trim().toLowerCase();
const fields = ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"] as const;

export function carAlertPresentation(product: "flight" | "hotel" | "car", plan: SearchPlan | undefined, results: CarResult[]) {
  const comparable = product === "car" && plan ? results.flatMap((result) => result.offers.filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice > 0 && supported.has(String(offer.currency).toUpperCase()))) : [];
  const currencies = [...new Set(comparable.map((offer) => offer.currency.toUpperCase()))];
  return { visible: product === "car" && Boolean(plan), comparable, currencies, enabled: currencies.length > 0 };
}

export function buildCarPriceAlertPayload(plan: SearchPlan, targetPrice: number, currency: string) {
  const source = plan.payload; const pickupLocation = String(source.pickupLocation).trim();
  const query = { pickupLocation, dropoffLocation: String(source.dropoffLocation || pickupLocation).trim(), pickupDate: String(source.pickupDate), pickupTime: String(source.pickupTime), dropoffDate: String(source.dropoffDate), dropoffTime: String(source.dropoffTime), driverAge: String(source.driverAge) };
  return { type: "CAR" as const, origin: query.pickupLocation, destination: query.dropoffLocation, targetPrice, mode: "TARGET" as const, currency: currency.trim().toUpperCase(), query };
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
