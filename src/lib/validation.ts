import { z } from "zod";
import { buildFlightPriceAlertPayload } from "@/lib/price-alerts/flightPriceAlerts";
import { MULTI_CITY_MAX_LEGS, MULTI_CITY_MIN_LEGS, projectSearchLegs } from "@/lib/flights/flightSearchJourney";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDateValue(value: string) {
  if (!isoDatePattern.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function isTodayOrFutureDate(value: string) {
  const date = parseIsoDateValue(value);
  if (!date) return false;

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  return date >= startOfToday;
}

const futureDate = z
  .string()
  .min(1)
  .refine(isTodayOrFutureDate, "Choose today or a future date.");

const flightLegSchema = z.object({
  origin: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3}$/, "Choose a valid departure airport."),
  destination: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3}$/, "Choose a valid arrival airport."),
  departureDate: futureDate,
}).refine((leg) => leg.origin !== leg.destination, {
  message: "Departure and arrival airports must be different.",
  path: ["destination"],
});

export const flightSearchSchema = z
  .object({
    tripType: z.enum(["round-trip", "one-way", "multi-city"]).default("round-trip"),
    legs: z.array(flightLegSchema).max(MULTI_CITY_MAX_LEGS).optional(),
    origin: z.string().trim().min(3, "Enter a departure airport or city.").max(80).optional(),
    destination: z.string().trim().min(3, "Enter an arrival airport or city.").max(80).optional(),
    departureDate: futureDate.optional(),
    returnDate: z.preprocess(
      (value) => (value === "" ? undefined : value),
      futureDate.optional(),
    ),
    travelers: z.coerce.number().int().min(1).max(9).default(1),
    adults: z.coerce.number().int().min(1).max(9).optional(),
    children: z.coerce.number().int().min(0).max(8).optional(),
    infants: z.coerce.number().int().min(0).max(8).optional(),
    cabinClass: z.enum(["economy", "premium-economy", "business", "first"]).default("economy"),
    sort: z.enum(["cheapest", "best", "fastest", "stops"]).optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).catch("USD").default("USD"),
  })
  .transform((data) => {
    const adults = data.adults ?? data.travelers;
    const children = data.children ?? 0;
    const infants = data.infants ?? 0;
    const legacyLegs = data.origin && data.destination && data.departureDate
      ? [{ origin: data.origin.toUpperCase(), destination: data.destination.toUpperCase(), departureDate: data.departureDate }]
      : [];
    if (data.tripType === "round-trip" && legacyLegs[0] && data.returnDate) {
      legacyLegs.push({ origin: legacyLegs[0].destination, destination: legacyLegs[0].origin, departureDate: data.returnDate });
    }
    const legs = data.legs?.length ? data.legs : legacyLegs;
    return {
      ...data,
      ...projectSearchLegs(data.tripType, legs),
      adults,
      children,
      infants,
      travelers: adults + children + infants,
    };
  })
  .superRefine((data, context) => {
    const legs = data.legs;
    const expectedCount = data.tripType === "one-way" ? 1 : data.tripType === "round-trip" ? 2 : null;
    if (expectedCount !== null && legs.length !== expectedCount) {
      context.addIssue({ code: "custom", message: `${data.tripType} requires exactly ${expectedCount} flight${expectedCount === 1 ? "" : "s"}.`, path: ["legs"] });
    }
    if (data.tripType === "multi-city" && legs.length < MULTI_CITY_MIN_LEGS) {
      context.addIssue({ code: "custom", message: "Multi-city search requires at least two flights.", path: ["legs"] });
    }
    if (data.tripType === "round-trip" && legs.length === 2 &&
      (legs[1].origin !== legs[0].destination || legs[1].destination !== legs[0].origin)) {
      context.addIssue({ code: "custom", message: "Round-trip flights must return to the original airport.", path: ["legs", 1] });
    }
    legs.forEach((leg, index) => {
      if (index > 0 && leg.departureDate < legs[index - 1].departureDate) {
        context.addIssue({ code: "custom", message: "Flights must be in chronological order.", path: ["legs", index, "departureDate"] });
      }
    });
  })
  .refine((data) => data.infants <= data.adults, {
    message: "Infants on lap cannot exceed adults.",
    path: ["infants"],
  })
  .refine((data) => data.travelers <= 9, {
    message: "A maximum of 9 travelers is supported.",
    path: ["travelers"],
  });

export const hotelSearchSchema = z
  .object({
    destination: z.string().trim().min(2, "Enter a destination.").max(120),
    checkIn: futureDate,
    checkOut: futureDate,
    guests: z.coerce.number().int().min(1).max(12).default(2),
    rooms: z.coerce.number().int().min(1).max(6).default(1),
    sort: z.enum(["cheapest", "best", "rating", "location"]).optional(),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out must be after check-in.",
    path: ["checkOut"],
  });

const emailMessage = "Enter a valid email address.";
const passwordMessage = "Password must meet minimum requirements.";
const emailLocalPartPattern = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const emailDomainLabelPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const emailTopLevelDomainPattern = /^[A-Za-z]{2,63}$/;

export function isStrictEmailAddress(value: string) {
  if (value !== value.trim()) return false;
  if (value.length < 3 || value.length > 254) return false;
  if (!/^[\x00-\x7F]+$/.test(value)) return false;
  if (/\s/.test(value)) return false;
  if (value.includes("..")) return false;

  const parts = value.split("@");
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;
  if (!localPart || !domain) return false;
  if (localPart.length > 64) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".")) return false;
  if (!emailLocalPartPattern.test(localPart)) return false;

  if (domain.length > 253) return false;
  if (domain.startsWith(".") || domain.endsWith(".")) return false;

  const domainLabels = domain.split(".");
  if (domainLabels.length < 2) return false;
  if (!emailTopLevelDomainPattern.test(domainLabels[domainLabels.length - 1])) return false;

  return domainLabels.every((label) => emailDomainLabelPattern.test(label));
}

export const emailSchema = z
  .string()
  .min(1, emailMessage)
  .max(254, emailMessage)
  .refine(isStrictEmailAddress, emailMessage)
  .transform((email) => email.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, passwordMessage)
  .max(100, passwordMessage)
  .regex(/[A-Za-z]/, passwordMessage)
  .regex(/[0-9]/, passwordMessage);

export const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, passwordMessage).max(100, passwordMessage),
});

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Unable to create account right now.")
    .max(120, "Unable to create account right now."),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "Reset token is required."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, passwordMessage),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const supportTicketSchema = z.object({
  email: emailSchema,
  subject: z.string().trim().min(4).max(160),
  category: z.enum(["search-help", "price-alerts", "redirect", "account"]),
  body: z.string().trim().min(20).max(4000),
  sourceContext: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const adminSupportReplySchema = z.object({
  body: z.string().trim().min(2).max(4000),
});

export const adminSupportStatusSchema = z.object({
  status: z.enum(["OPEN", "WAITING_ON_USER", "WAITING_ON_TEAM", "RESOLVED", "CLOSED"]),
});

export const newsletterSubscribeSchema = z.object({
  email: emailSchema,
  source: z.string().trim().min(1).max(80).optional(),
  locale: z.string().trim().min(2).max(20).optional(),
  regionCode: z.string().trim().min(2).max(16).optional(),
});

const hotelPriceAlertSchema = z.object({
  type: z.literal("HOTEL"),
  origin: z.string().trim().max(80).optional(),
  destination: z.string().trim().min(2).max(120),
  targetPrice: z.coerce.number().positive().optional(),
  mode: z.enum(["AUTOMATIC", "TARGET"]).default("TARGET"),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("USD"),
  query: z.record(z.string(), z.unknown()),
});

const flightPriceAlertSchema = z.object({
  type: z.literal("FLIGHT"),
  origin: z.string().trim().min(1),
  destination: z.string().trim().min(1),
  targetPrice: z.coerce.number().positive().optional(),
  mode: z.enum(["AUTOMATIC", "TARGET"]).default("TARGET"),
  currency: z.string().trim().length(3),
  query: z.record(z.string(), z.unknown()),
}).transform((value, context) => {
  try {
    if (value.mode === "TARGET") {
      if (value.targetPrice === undefined) throw new Error("Target price is required for target alerts.");
      return { ...buildFlightPriceAlertPayload({ ...value, targetPrice: value.targetPrice }), mode: value.mode };
    }
    const targetValidated = buildFlightPriceAlertPayload({ ...value, targetPrice: 1 });
    return { ...targetValidated, targetPrice: undefined, mode: value.mode };
  } catch (error) {
    context.addIssue({
      code: "custom",
      path: ["query"],
      message: error instanceof Error ? error.message : "Invalid flight price alert.",
    });
    return z.NEVER;
  }
});

export const priceAlertSchema = z.discriminatedUnion("type", [
  flightPriceAlertSchema,
  hotelPriceAlertSchema,
]);
