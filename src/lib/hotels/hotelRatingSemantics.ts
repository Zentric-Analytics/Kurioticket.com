import type {
  HotelClassificationStars,
  HotelReviewScale,
  PublicHotelResult,
} from "@/lib/types";

export type HotelReviewBand =
  | "exceptional"
  | "veryGood"
  | "good"
  | "pleasant"
  | "reviewScore";

export function normalizeHotelClassificationStars(value: unknown): HotelClassificationStars | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > 5) return undefined;
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) return value;
  return undefined;
}

export function normalizeHotelReviewScale(value: unknown): HotelReviewScale | undefined {
  return value === 5 || value === 10 ? value : undefined;
}

export function normalizeHotelReviewScore(score: unknown, scale: unknown): number | undefined {
  const normalizedScale = normalizeHotelReviewScale(scale);
  if (normalizedScale === undefined || typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > normalizedScale) return undefined;
  return score;
}

export function normalizeHotelReviewCount(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.floor(value);
}

export function normalizeHotelReviewSource(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized && normalized.length <= 120 ? normalized : undefined;
}

export function getHotelReviewBand(score: unknown, scale: unknown = 10): HotelReviewBand | null {
  const normalizedScale = normalizeHotelReviewScale(scale);
  const normalizedScore = normalizeHotelReviewScore(score, normalizedScale);
  if (normalizedScale === undefined || normalizedScore === undefined) return null;
  const proportion = normalizedScore / normalizedScale;
  if (proportion >= 0.9) return "exceptional";
  if (proportion >= 0.8) return "veryGood";
  if (proportion >= 0.7) return "good";
  if (proportion >= 0.6) return "pleasant";
  return "reviewScore";
}

export function getHotelComparableReviewScore(
  hotel: Pick<PublicHotelResult, "reviewScore" | "reviewScale">,
): number | null {
  const score = normalizeHotelReviewScore(hotel.reviewScore, hotel.reviewScale);
  const scale = normalizeHotelReviewScale(hotel.reviewScale);
  return score === undefined || scale === undefined ? null : (score / scale) * 10;
}
