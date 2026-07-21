export type HotelStarRating = 1 | 2 | 3 | 4 | 5;
export type HotelStarRatingSelection = 0 | HotelStarRating;

export const ALL_HOTEL_STAR_RATINGS = 0;

const HOTEL_STAR_RATING_COUNTS: HotelStarRating[] = [1, 2, 3, 4, 5];

export function getHotelStarRatingCategory(
  classificationStars: unknown,
): HotelStarRating | null {
  if (typeof classificationStars !== "number" || !Number.isFinite(classificationStars) || !Number.isInteger(classificationStars) || classificationStars < 1 || classificationStars > 5) {
    return null;
  }
  if (classificationStars === 1 || classificationStars === 2 || classificationStars === 3 || classificationStars === 4 || classificationStars === 5) return classificationStars;
  return null;
}

export function hotelMatchesStarRating(
  classificationStars: unknown,
  selection: HotelStarRatingSelection,
): boolean {
  if (selection === ALL_HOTEL_STAR_RATINGS) return true;

  return getHotelStarRatingCategory(classificationStars) === selection;
}

export function countHotelsByStarRating(
  hotels: readonly { classificationStars?: unknown }[],
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
    const category = getHotelStarRatingCategory(hotel.classificationStars);
    if (category !== null && HOTEL_STAR_RATING_COUNTS.includes(category)) {
      counts[category] += 1;
    }
  }

  return counts;
}
