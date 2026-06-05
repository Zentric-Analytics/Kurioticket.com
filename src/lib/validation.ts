import { z } from "zod";

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

export const flightSearchSchema = z
  .object({
    tripType: z.enum(["round-trip", "one-way", "multi-city"]).default("round-trip"),
    origin: z.string().trim().min(3, "Enter a departure airport or city.").max(80),
    destination: z.string().trim().min(3, "Enter an arrival airport or city.").max(80),
    departureDate: futureDate,
    returnDate: z.preprocess(
      (value) => (value === "" ? undefined : value),
      futureDate.optional(),
    ),
    travelers: z.coerce.number().int().min(1).max(9).default(1),
    adults: z.coerce.number().int().min(1).max(9).optional(),
    children: z.coerce.number().int().min(0).max(8).optional(),
    infants: z.coerce.number().int().min(0).max(8).optional(),
    cabinClass: z
      .preprocess(
        (value) => (value === "premium-economy" ? "economy" : value),
        z.enum(["economy", "business", "first"]),
      )
      .catch("economy")
      .default("economy"),
    sort: z.enum(["cheapest", "best", "fastest", "stops"]).optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).catch("USD").default("USD"),
  })
  .transform((data) => {
    const adults = data.adults ?? data.travelers;
    const children = data.children ?? 0;
    const infants = data.infants ?? 0;
    return {
      ...data,
      adults,
      children,
      infants,
      travelers: adults + children + infants,
    };
  })
  .refine((data) => data.tripType !== "round-trip" || Boolean(data.returnDate), {
    message: "Choose a return date for round trips.",
    path: ["returnDate"],
  })
  .refine(
    (data) =>
      data.tripType !== "round-trip" ||
      !data.returnDate ||
      data.returnDate >= data.departureDate,
    {
      message: "Return date must be the same as or after departure.",
      path: ["returnDate"],
    },
  )
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
  category: z.string().trim().min(2).max(80),
  body: z.string().trim().min(20).max(4000),
  sourceContext: z.record(z.string(), z.unknown()).optional(),
});

export const priceAlertSchema = z.object({
  type: z.enum(["FLIGHT", "HOTEL"]),
  origin: z.string().trim().max(80).optional(),
  destination: z.string().trim().min(2).max(120),
  targetPrice: z.coerce.number().positive().optional(),
  currency: z.string().trim().length(3).default("USD"),
  query: z.record(z.string(), z.unknown()),
});
