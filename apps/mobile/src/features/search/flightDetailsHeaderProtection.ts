const FLIGHT_DETAILS_ITINERARY_OVERLAP = 104;
const FLIGHT_DETAILS_CONTROL_TOP_OFFSET = 8;
const FLIGHT_DETAILS_CONTROL_HEIGHT = 44;
const FLIGHT_DETAILS_CONTROL_BOTTOM_SPACING = 12;

export function flightDetailsHeaderProtectionGeometry(topInset: number, heroHeight: number) {
  const protectedHeight = topInset + FLIGHT_DETAILS_CONTROL_TOP_OFFSET + FLIGHT_DETAILS_CONTROL_HEIGHT + FLIGHT_DETAILS_CONTROL_BOTTOM_SPACING;
  return {
    protectedHeight,
    threshold: Math.max(0, heroHeight - FLIGHT_DETAILS_ITINERARY_OVERLAP - protectedHeight),
  };
}
