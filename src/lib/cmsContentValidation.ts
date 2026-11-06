import { z } from "zod";
import { cmsOrderForStorage, CMS_DISPLAY_ORDER_MIN, CMS_DISPLAY_ORDER_MAX } from "@/lib/cmsOrderPresentation";
import type { CmsContentType } from "@/generated/prisma/enums";
import { imageRemotePatterns, matchesImagePattern } from "@/config/imagePatterns";

const printable = (max: number) =>
  z.string().trim().min(1).max(max).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Control characters are not allowed.");

// Paragraph fields allow line breaks, while labels retain one-line validation.
const paragraph = (max: number) => z.string().trim().min(1).max(max)
  .transform((value) => value.replace(/\r\n?/g, "\n"))
  .refine((value) => !/[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/.test(value), "Control characters are not allowed.");

const airportCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3}$/);
const countryCode = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/);
const safeImage = z.string().trim().max(2000).refine((value) => {
  if (value.startsWith("/images/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && imageRemotePatterns.some((pattern) => matchesImagePattern(url, pattern));
  } catch {
    return false;
  }
}, "Use an approved local image path or an image URL allowed by the application image configuration.");

export const cmsPayloadSchemas = {
  HOMEPAGE_DESTINATION: z.object({
    city: printable(120),
    country: printable(120),
    countryCode: countryCode.optional(),
    destinationCode: airportCode,
    originCode: airportCode,
    image: safeImage,
    imageAlt: printable(240),
  }).strict(),
  FLIGHT_ROUTE: z.object({
    title: printable(160),
    originCity: printable(120),
    originCode: airportCode,
    destinationCity: printable(120),
    destinationCode: airportCode,
    routeNote: paragraph(300),
    image: safeImage,
    imageAlt: printable(240),
  }).strict().refine((value) => value.originCode !== value.destinationCode, {
    message: "Origin and destination must be different.",
    path: ["destinationCode"],
  }),
  HOTEL_DESTINATION: z.object({
    name: printable(120),
    country: printable(120),
    countryCode,
    kind: z.enum(["city", "district", "landmark", "airport-area", "custom"]),
    searchValue: printable(160),
    canonicalId: printable(160),
    image: safeImage.optional(),
    imageAlt: printable(240).optional(),
  }).strict(),
  FAQ: z.object({
    question: printable(240),
    answer: paragraph(5000),
    category: printable(80).default("General"),
  }).strict(),
} satisfies Record<CmsContentType, z.ZodTypeAny>;


export const cmsSortOrderSchema = z.number().int().min(0).max(100000);
export const cmsFieldLimits: Record<string, number> = {
  city: 120, country: 120, countryCode: 2, originCode: 3, destinationCode: 3,
  title: 160, originCity: 120, destinationCity: 120, routeNote: 300,
  name: 120, searchValue: 160, canonicalId: 160, image: 2000, imageAlt: 240,
  question: 240, answer: 5000, category: 80,
};
export type CmsFieldErrors = Record<string, string[]>;

export function validateCmsEditor(type: CmsContentType, payload: unknown, order: string) {
  const parsed = cmsPayloadSchemas[type].safeParse(payload);
  const errors: CmsFieldErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "content");
      (errors[field] ??= []).push(issue.message);
    }
  }
  if (!order.trim() || !cmsSortOrderSchema.safeParse(cmsOrderForStorage(order)).success) {
    errors.sortOrder = [`Enter a whole number from ${CMS_DISPLAY_ORDER_MIN} to ${CMS_DISPLAY_ORDER_MAX}.`];
  }
  return errors;
}

export function readCmsFieldErrors(issues: unknown): CmsFieldErrors {
  if (!issues || typeof issues !== "object") return {};
  const raw = issues as { fieldErrors?: unknown; field?: unknown };
  if (typeof raw.field === "string") return { [raw.field]: ["Check this value and try again."] };
  if (!raw.fieldErrors || typeof raw.fieldErrors !== "object") return {};
  return Object.fromEntries(Object.entries(raw.fieldErrors).flatMap(([key, value]) =>
    Array.isArray(value) && value.every((entry) => typeof entry === "string") ? [[key, value]] : []));
}
