import { normalizeHotelReviewCount } from "@/lib/hotels/hotelRatingSemantics";

export { getHotelReviewBand, type HotelReviewBand } from "@/lib/hotels/hotelRatingSemantics";

/** Compatibility wrapper for the legacy presentation API. */
export function getHotelReviewCount(value: unknown): number | null {
  return normalizeHotelReviewCount(value) ?? null;
}
