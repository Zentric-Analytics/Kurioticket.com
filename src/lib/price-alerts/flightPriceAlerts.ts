import { z } from "zod";

import { supportedCurrencies } from "@/lib/region/supportedRegions";

export const MAX_PRICE_ALERT_TARGET = 9999999999.99;

const supportedCurrencyCodes = new Set(supportedCurrencies.map((currency) => currency.code));
const airportCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,8}$/);
const isoDateSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/);
const tripTypeSchema = z.enum(["round-trip", "one-way"]);
const cabinClassSchema = z.enum(["economy", "premium-economy", "business", "first"]);
const travelerCountSchema = z.coerce.number().int().min(0).max(9);

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function normalizeCurrency(value: string) {
  return value.trim().toUpperCase();
}

export const canonicalFlightPriceAlertQuerySchema = z
  .object({
    tripType: tripTypeSchema,
    origin: airportCodeSchema,
    destination: airportCodeSchema,
    departureDate: isoDateSchema,
    returnDate: isoDateSchema.optional(),
    adults: travelerCountSchema,
    children: travelerCountSchema,
    infants: travelerCountSchema,
    travelers: travelerCountSchema.optional(),
    cabinClass: cabinClassSchema,
    currency: z.string().trim().length(3).transform(normalizeCurrency),
  })
  .superRefine((value, context) => {
    const departureDate = parseIsoDate(value.departureDate);
    const returnDate = value.returnDate ? parseIsoDate(value.returnDate) : null;

    if (!departureDate) {
      context.addIssue({ code: "custom", path: ["departureDate"], message: "Invalid departure date." });
    }

    if (value.returnDate && !returnDate) {
      context.addIssue({ code: "custom", path: ["returnDate"], message: "Invalid return date." });
    }

    if (value.tripType === "round-trip" && !value.returnDate) {
      context.addIssue({ code: "custom", path: ["returnDate"], message: "Return date is required for round trips." });
    }

    if (value.tripType === "one-way" && value.returnDate) {
      context.addIssue({ code: "custom", path: ["returnDate"], message: "One-way trips cannot include a return date." });
    }

    if (departureDate && returnDate && returnDate < departureDate) {
      context.addIssue({ code: "custom", path: ["returnDate"], message: "Return date must be after departure date." });
    }

    if (value.adults < 1) {
      context.addIssue({ code: "custom", path: ["adults"], message: "At least one adult is required." });
    }

    const travelers = value.travelers ?? value.adults + value.children + value.infants;
    if (travelers !== value.adults + value.children + value.infants) {
      context.addIssue({ code: "custom", path: ["travelers"], message: "Traveler count must match passengers." });
    }

    if (value.infants > value.adults) {
      context.addIssue({ code: "custom", path: ["infants"], message: "Infants cannot exceed adults." });
    }

    if (!supportedCurrencyCodes.has(value.currency)) {
      context.addIssue({ code: "custom", path: ["currency"], message: "Unsupported currency." });
    }
  })
  .transform((value) => ({
    tripType: value.tripType,
    origin: value.origin,
    destination: value.destination,
    departureDate: value.departureDate,
    ...(value.tripType === "round-trip" && value.returnDate ? { returnDate: value.returnDate } : {}),
    adults: value.adults,
    children: value.children,
    infants: value.infants,
    travelers: value.travelers ?? value.adults + value.children + value.infants,
    cabinClass: value.cabinClass,
    currency: value.currency,
  }));

export type CanonicalFlightPriceAlertQuery = z.infer<typeof canonicalFlightPriceAlertQuerySchema>;

export const priceAlertTargetSchema = z.coerce
  .number()
  .finite()
  .positive()
  .max(MAX_PRICE_ALERT_TARGET)
  .refine((value) => Number.isInteger(Number(value.toFixed(3)) * 100), "Target price supports up to two decimals.");

export function buildCanonicalFlightPriceAlertQuery(input: unknown) {
  return canonicalFlightPriceAlertQuerySchema.safeParse(input);
}

export function buildFlightPriceAlertPayload(input: {
  origin: string;
  destination: string;
  targetPrice: number;
  currency: string;
  query: unknown;
}) {
  const query = canonicalFlightPriceAlertQuerySchema.parse(input.query);
  const targetPrice = priceAlertTargetSchema.parse(input.targetPrice);
  const currency = normalizeCurrency(input.currency);

  if (currency !== query.currency) {
    throw new Error("Currency must match the flight search currency.");
  }

  if (input.origin.trim().toUpperCase() !== query.origin || input.destination.trim().toUpperCase() !== query.destination) {
    throw new Error("Route must match the flight search query.");
  }

  return {
    type: "FLIGHT" as const,
    origin: query.origin,
    destination: query.destination,
    targetPrice,
    currency,
    query,
  };
}

export function buildAutomaticFlightPriceAlertPayload(input: {
  origin: string;
  destination: string;
  baselinePrice: number;
  currency: string;
  query: unknown;
}) {
  const currency = normalizeCurrency(input.currency);
  const rawQuery = input.query && typeof input.query === "object" && !Array.isArray(input.query)
    ? input.query as Record<string, unknown>
    : {};
  const query = canonicalFlightPriceAlertQuerySchema.parse({ ...rawQuery, currency });
  const baselinePrice = z.number().finite().positive().parse(input.baselinePrice);

  if (input.origin.trim().toUpperCase() !== query.origin || input.destination.trim().toUpperCase() !== query.destination) {
    throw new Error("Route must match the flight search query.");
  }

  return {
    type: "FLIGHT" as const,
    origin: query.origin,
    destination: query.destination,
    baselinePrice,
    mode: "AUTOMATIC" as const,
    currency,
    query,
  };
}

type FlightBaselineResult = { price: number; currency: string; provider?: string; searchPolicy?: { source?: string; bookable?: boolean } };

/** Selects a real provider fare without comparing unlike currencies as raw numbers. */
export function selectAutomaticFlightBaseline<T extends FlightBaselineResult>(results: readonly T[], preferredCurrency?: string) {
  const eligible = results.filter((result) => Number.isFinite(result.price) && result.price > 0
    && supportedCurrencyCodes.has(normalizeCurrency(result.currency))
    && result.provider !== "KAYAK sandbox"
    && result.searchPolicy?.source !== "kayak-sandbox"
    && result.searchPolicy?.bookable !== false);
  const preferred = preferredCurrency ? normalizeCurrency(preferredCurrency) : "";
  const currency = eligible.find((result) => normalizeCurrency(result.currency) === preferred)?.currency
    ?? eligible[0]?.currency;
  if (!currency) return null;
  const normalizedCurrency = normalizeCurrency(currency);
  return eligible
    .filter((result) => normalizeCurrency(result.currency) === normalizedCurrency)
    .reduce<T | null>((lowest, result) => !lowest || result.price < lowest.price ? result : lowest, null);
}

export type MatchableFlightPriceAlert = {
  type: string;
  mode?: "AUTOMATIC" | "TARGET";
  status: string;
  query: unknown;
};

const flightSearchIdentityFields = ["origin", "destination", "departureDate", "returnDate", "tripType", "cabinClass", "adults", "children", "infants", "travelers"] as const;

export function automaticFlightPriceAlertMatchesQuery(alert: MatchableFlightPriceAlert, query: unknown) {
  if (alert.type !== "FLIGHT" || alert.mode !== "AUTOMATIC") return false;
  const expected = canonicalFlightPriceAlertQuerySchema.safeParse(query);
  const actual = canonicalFlightPriceAlertQuerySchema.safeParse(alert.query);
  return expected.success && actual.success && flightSearchIdentityFields.every((field) =>
    String(actual.data[field] ?? "").toLowerCase() === String(expected.data[field] ?? "").toLowerCase());
}

export function matchingAutomaticFlightPriceAlert<T extends MatchableFlightPriceAlert>(alerts: T[], query: unknown) {
  const matches = alerts.filter((alert) => automaticFlightPriceAlertMatchesQuery(alert, query));
  return matches.find(({ status }) => status === "ACTIVE") ?? matches.find(({ status }) => status === "PAUSED");
}

export function flightPriceAlertDuplicateKey(input: {
  origin: string | null;
  destination: string;
  targetPrice: { toString(): string } | string | number | null;
  mode?: "AUTOMATIC" | "TARGET";
  currency: string | null;
  query: unknown;
}) {
  const parsed = canonicalFlightPriceAlertQuerySchema.safeParse(input.query);
  const mode = input.mode ?? "TARGET";
  if (!parsed.success || (mode === "TARGET" && input.targetPrice === null)) return null;
  const price = input.targetPrice === null ? Number.NaN : Number(input.targetPrice.toString());
  if (mode === "TARGET" && !Number.isFinite(price)) return null;

  return [
    parsed.data.origin,
    parsed.data.destination,
    parsed.data.departureDate,
    parsed.data.returnDate ?? "",
    parsed.data.tripType,
    parsed.data.cabinClass,
    parsed.data.adults,
    parsed.data.children,
    parsed.data.infants,
    parsed.data.travelers,
    (input.currency || parsed.data.currency).toUpperCase(),
    mode,
    mode === "TARGET" ? price.toFixed(2) : "automatic",
  ].join("|");
}
