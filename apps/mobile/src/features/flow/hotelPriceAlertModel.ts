import type { HotelResult, MobilePriceAlert } from "../../api/travelApi";
import { supportedCurrencies } from "../../config/supportedCurrencies";
import type { SearchPlan } from "./travelSearchModel";

const supported = new Set(supportedCurrencies.map(({ code }) => code));
const text = (value: unknown) => String(value ?? "").trim().toLowerCase();

export function hotelAlertPresentation(product: "flight" | "hotel" | "car", plan: SearchPlan | undefined, results: HotelResult[]) {
  const comparable = product === "hotel" && plan ? results.filter((result) => Number.isFinite(result.totalPrice) && (result.totalPrice ?? 0) > 0 && supported.has(String(result.currency).toUpperCase())) : [];
  const currencies = [...new Set(comparable.map((result) => String(result.currency).toUpperCase()))];
  return { visible: product === "hotel" && Boolean(plan), comparable, currencies, enabled: currencies.length > 0 };
}

export function buildHotelPriceAlertPayload(plan: SearchPlan, targetPrice: number, currency: string) {
  const query = plan.payload;
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!supported.has(normalizedCurrency)) throw new Error("Unsupported alert currency.");
  return {
    type: "HOTEL" as const,
    destination: String(query.destination),
    targetPrice,
    mode: "TARGET" as const,
    currency: normalizedCurrency,
    query: { destination: String(query.destination), checkIn: String(query.checkIn), checkOut: String(query.checkOut), guests: Number(query.guests), rooms: Number(query.rooms) },
  };
}

export function hotelPriceAlertMatchesPlan(alert: MobilePriceAlert, plan: SearchPlan) {
  if (alert.type !== "HOTEL") return false;
  const expected = buildHotelPriceAlertPayload(plan, 1, "USD").query;
  const textFields = ["destination", "checkIn", "checkOut"] as const;
  const countFields = ["guests", "rooms"] as const;
  return textFields.every((field) => text(alert.query[field]) === text(expected[field]))
    && countFields.every((field) => Number(alert.query[field]) === Number(expected[field]));
}

export function matchingHotelPriceAlert(alerts: MobilePriceAlert[], plan: SearchPlan) {
  const matches = alerts.filter((alert) => hotelPriceAlertMatchesPlan(alert, plan));
  return matches.find(({ status }) => status === "ACTIVE") ?? matches.find(({ status }) => status === "PAUSED");
}
