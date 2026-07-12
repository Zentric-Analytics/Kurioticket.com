export type HotelStarRating = 1 | 2 | 3 | 4 | 5;
export type HotelStarRatingSelection = 0 | HotelStarRating;

export const ALL_HOTEL_STAR_RATINGS = 0;

const HOTEL_STAR_RATING_COUNTS: HotelStarRating[] = [1, 2, 3, 4, 5];

export function getHotelStarRatingCategory(
  rating: unknown,
): HotelStarRating | null {
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) {
    return null;
  }

  return Math.min(Math.max(Math.floor(rating), 1), 5) as HotelStarRating;
}

export function hotelMatchesStarRating(
  rating: unknown,
  selection: HotelStarRatingSelection,
): boolean {
  if (selection === ALL_HOTEL_STAR_RATINGS) return true;

  return getHotelStarRatingCategory(rating) === selection;
}

export function countHotelsByStarRating(
  hotels: readonly { rating: unknown }[],
): Record<HotelStarRatingSelection, number> {
  const counts = {
    [ALL_HOTEL_STAR_RATINGS]: hotels.length,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  } satisfies Record<HotelStarRatingSelection, number>;

  for (const hotel of hotels) {
    const category = getHotelStarRatingCategory(hotel.rating);
    if (category !== null && HOTEL_STAR_RATING_COUNTS.includes(category)) {
      counts[category] += 1;
    }
  }

  return counts;
}
