export type HotelReviewBand =
  | "exceptional"
  | "veryGood"
  | "good"
  | "pleasant"
  | "reviewScore";

export function getHotelReviewBand(score: unknown): HotelReviewBand | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score < 0 || score > 10) return null;

  if (score >= 9) return "exceptional";
  if (score >= 8) return "veryGood";
  if (score >= 7) return "good";
  if (score >= 6) return "pleasant";

  return "reviewScore";
}

export function getHotelReviewCount(count: unknown): number | null {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return null;
  }

  return Math.floor(count);
}
