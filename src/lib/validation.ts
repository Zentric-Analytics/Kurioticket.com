import { z } from "zod";

const futureDate = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Use a valid date.");

export const flightSearchSchema = z
  .object({
    tripType: z
      .enum(["round-trip", "one-way", "multi-city"])
      .default("round-trip"),
    origin: z
      .string()
      .trim()
      .min(3, "Enter a departure airport or city.")
      .max(80),
    destination: z
      .string()
      .trim()
      .min(3, "Enter an arrival airport or city.")
      .max(80),
    departureDate: futureDate,
    returnDate: z.string().optional(),
    travelers: z.coerce.number().int().min(1).max(9).default(1),
    cabinClass: z
      .enum([
        "economy",
        "premium-economy",
        "business",
        "first",
      ])
      .default("economy"),
    sort: z
      .enum([
        "cheapest",
        "best",
        "fastest",
        "stops",
      ])
      .optional(),
  })
  .refine(
    (data) =>
      data.tripType !== "round-trip" ||
      Boolean(data.returnDate),
    {
      message:
        "Choose a return date for round trips.",
      path: ["returnDate"],
    }
  );

export const hotelSearchSchema = z
  .object({
    destination: z
      .string()
      .trim()
      .min(2, "Enter a destination.")
      .max(120),
    checkIn: futureDate,
    checkOut: futureDate,
    guests: z.coerce.number().int().min(1).max(12).default(2),
    rooms: z.coerce.number().int().min(1).max(6).default(1),
    sort: z
      .enum([
        "cheapest",
        "best",
        "rating",
        "location",
      ])
      .optional(),
  })
  .refine(
    (data) =>
      new Date(data.checkOut) >
      new Date(data.checkIn),
    {
      message:
        "Check-out must be after check-in.",
      path: ["checkOut"],
    }
  );

const emailMessage = "Enter a valid email address.";
const passwordMessage =
  "Password must meet minimum requirements.";

const emailLocalPartPattern =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const emailDomainLabelPattern =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const emailTopLevelDomainPattern =
  /^[A-Za-z]{2,63}$/;

export function isStrictEmailAddress(
  value: string
) {
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

  if (
    !emailTopLevelDomainPattern.test(
      domainLabels[domainLabels.length - 1]
    )
  ) {
    return false;
  }

  return domainLabels.every((label) =>
    emailDomainLabelPattern.test(label)
  );
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
  password: z
    .string()
    .min(1, passwordMessage)
    .max(100, passwordMessage),
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

export const resetPasswordSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit reset code."),
  password: passwordSchema,
});

export const supportTicketSchema = z.object({
  email: emailSchema,
  subject: z.string().trim().min(4).max(160),
  category: z.string().trim().min(2).max(80),
  body: z.string().trim().min(20).max(4000),
  sourceContext: z
    .record(z.string(), z.unknown())
    .optional(),
});

export const priceAlertSchema = z.object({
  type: z.enum(["FLIGHT", "HOTEL"]),
  origin: z.string().trim().max(80).optional(),
  destination: z.string().trim().min(2).max(120),
  targetPrice: z.coerce.number().positive().optional(),
  currency: z.string().trim().length(3).default("USD"),
  query: z.record(z.string(), z.unknown()),
});