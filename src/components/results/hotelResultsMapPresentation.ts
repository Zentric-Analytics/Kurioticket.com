export type HotelResultsMapPosition = Readonly<{
  xPercent: number;
  yPercent: number;
}>;

const DEMO_HOTEL_MAP_POSITIONS: Readonly<
  Record<string, HotelResultsMapPosition>
> = {
  "demo-catalog-harborline-city": {
    xPercent: 46,
    yPercent: 44,
  },
  "demo-catalog-linen-house": {
    xPercent: 28,
    yPercent: 28,
  },
  "demo-catalog-station-inn": {
    xPercent: 78,
    yPercent: 22,
  },
  "demo-catalog-riverside-loom": {
    xPercent: 56,
    yPercent: 73,
  },
  "demo-catalog-atlas-arcade": {
    xPercent: 68,
    yPercent: 48,
  },
  "demo-catalog-gallery-court": {
    xPercent: 24,
    yPercent: 62,
  },
  "demo-catalog-wayfarer-yard": {
    xPercent: 82,
    yPercent: 72,
  },
};

export function getHotelResultsMapPosition(
  hotelId: string,
): HotelResultsMapPosition | null {
  return DEMO_HOTEL_MAP_POSITIONS[hotelId] || null;
}
