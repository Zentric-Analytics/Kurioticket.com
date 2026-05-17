import { z } from "zod";

const futureDate = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), "Use a valid date.");

export const flightSearchSchema = z
  .object({
    tripType: z.enum(["round-trip", "one-way", "multi-city"]).default("round-trip"),
    origin: z.string().trim().min(3, "Enter a departure airport or city.").max(80),
    destination: z.string().trim().min(3, "Enter an arrival airport or city.").max(80),
    departureDate: futureDate,
    returnDate: z.string().optional(),
    travelers: z.coerce.number().int().min(1).max(9).default(1),
    cabinClass: z
      .enum(["economy", "premium-economy", "business", "first"])
      .default("economy"),
    sort: z.enum(["cheapest", "best", "fastest", "stops"]).optional(),
  })
  .refine((data) => data.tripType !== "round-trip" || Boolean(data.returnDate), {
    message: "Choose a return date for round trips.",
    path: ["returnDate"],
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

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(100, "Use 100 characters or fewer.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const signinSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  password: z.string().min(1, "Enter your password.").max(100),
});

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(255),
  password: passwordSchema,
});

export const supportTicketSchema = z.object({
  email: z.string().trim().email(),
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
