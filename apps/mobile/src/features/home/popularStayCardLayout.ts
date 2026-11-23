// Shared geometry for the portrait cards in Home's Popular destination stays
// rail and other vertical presentations that intentionally use that card family.
export const POPULAR_STAY_LAYOUT = {
  cardWidth: 276,
  minCardWidth: 260,
  maxCardWidth: 292,
  viewportReveal: 99,
  imageHeight: 288,
  ctaHeight: 72,
  gap: 16,
  radius: 16,
  sideInset: 16,
  nextCardVisible: 67,
} as const;

export function popularStayCardLayout(
  viewportWidth: number,
  availableWidth = Number.POSITIVE_INFINITY,
) {
  const width = Math.min(
    availableWidth,
    POPULAR_STAY_LAYOUT.maxCardWidth,
    Math.max(
      POPULAR_STAY_LAYOUT.minCardWidth,
      viewportWidth - POPULAR_STAY_LAYOUT.viewportReveal,
    ),
  );
  const imageHeight =
    width * (POPULAR_STAY_LAYOUT.imageHeight / POPULAR_STAY_LAYOUT.cardWidth);

  return {
    width,
    imageHeight,
    footerHeight: POPULAR_STAY_LAYOUT.ctaHeight,
    height: imageHeight + POPULAR_STAY_LAYOUT.ctaHeight,
  };
}
