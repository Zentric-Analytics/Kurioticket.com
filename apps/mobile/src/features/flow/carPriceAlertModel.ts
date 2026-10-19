import type { CarResult, MobilePriceAlert } from "../../api/travelApi";
import { supportedCurrencies } from "../../config/supportedCurrencies";
import type { SearchPlan } from "./travelSearchModel";
import type { CarPriceAlertOfferScope } from "../../../../../src/lib/price-alerts/carPriceAlerts";

const supported = new Set(supportedCurrencies.map(({ code }) => code));
const text = (value: unknown) => String(value ?? "").trim().toLowerCase();
const fields = ["pickupLocation", "dropoffLocation", "pickupDate", "pickupTime", "dropoffDate", "dropoffTime", "driverAge"] as const;

export function carAlertPresentation(plan: SearchPlan | undefined, results: CarResult[]) {
  const comparable = plan ? results.flatMap((result) => result.offers).filter((offer) => Number.isFinite(offer.totalPrice) && offer.totalPrice > 0 && supported.has(offer.currency.trim().toUpperCase())) : [];
  const currencies = [...new Set(comparable.map((offer) => offer.currency.trim().toUpperCase()))];
  const baselineOffer = comparable.slice().sort((left, right) => left.totalPrice - right.totalPrice)[0];
  return { visible: Boolean(plan) && comparable.length > 0, comparable, currencies, baselineOffer, enabled: Boolean(baselineOffer) };
}

export function buildAutomaticCarPriceAlertPayload(plan: SearchPlan, baselinePrice: number, currency: string, offer?: CarPriceAlertOfferScope) {
  const payload = plan.payload;
  const pickupLocation = String(payload.pickupLocation).trim();
  const query = { pickupLocation, dropoffLocation: String(payload.dropoffLocation || pickupLocation).trim(), pickupDate: String(payload.pickupDate), pickupTime: String(payload.pickupTime), dropoffDate: String(payload.dropoffDate), dropoffTime: String(payload.dropoffTime), driverAge: String(payload.driverAge), ...(offer ? { offer } : {}) };
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!supported.has(normalizedCurrency)) throw new Error("Unsupported alert currency.");
  if (!Number.isFinite(baselinePrice) || baselinePrice <= 0) throw new Error("A valid rental total is required.");
  return { type: "CAR" as const, origin: query.pickupLocation, destination: query.dropoffLocation, mode: "AUTOMATIC" as const, baselinePrice, currency: normalizedCurrency, query };
}

export function carPriceAlertMatchesPlan(alert: MobilePriceAlert, plan: SearchPlan, offer?: CarPriceAlertOfferScope) {
  if (alert.type !== "CAR") return false;
  const expected = buildAutomaticCarPriceAlertPayload(plan, 1, "USD").query;
  const alertOffer = alert.query.offer;
  if (Boolean(offer) !== Boolean(alertOffer)) return false;
  if (offer && (typeof alertOffer !== "object" || !alertOffer || Array.isArray(alertOffer) ||
    !["resultId", "offerId", "providerName"].every((field) => text((alertOffer as Record<string, unknown>)[field]) === text(offer[field as keyof CarPriceAlertOfferScope])))) return false;
  return fields.every((field) => text(alert.query[field]) === text(expected[field]));
}

export function matchingCarPriceAlert(alerts: MobilePriceAlert[], plan: SearchPlan, offer?: CarPriceAlertOfferScope) {
  const matches = alerts.filter((alert) => alert.mode === "AUTOMATIC" && carPriceAlertMatchesPlan(alert, plan, offer));
  return matches.find(({ status }) => status === "ACTIVE") ?? matches.find(({ status }) => status === "PAUSED");
}
