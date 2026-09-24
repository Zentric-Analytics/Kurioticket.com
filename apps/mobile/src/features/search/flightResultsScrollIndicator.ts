export const FLIGHT_RESULTS_SCROLL_INDICATOR_TRACK_TOP = 56;
export const FLIGHT_RESULTS_SCROLL_INDICATOR_RIGHT = 3;
export const FLIGHT_RESULTS_SCROLL_THUMB_MIN_HEIGHT = 22;
export const FLIGHT_RESULTS_SCROLL_THUMB_MAX_HEIGHT = 48;

export type FlightResultsScrollIndicatorGeometry = {
  visible: boolean;
  trackHeight: number;
  thumbHeight: number;
  thumbTravel: number;
  scrollRange: number;
};

export function flightResultsScrollIndicatorGeometry({
  viewportHeight,
  contentHeight,
  bottomInset,
}: {
  viewportHeight: number;
  contentHeight: number;
  bottomInset: number;
}): FlightResultsScrollIndicatorGeometry {
  const safeViewportHeight = Number.isFinite(viewportHeight) ? Math.max(0, viewportHeight) : 0;
  const safeContentHeight = Number.isFinite(contentHeight) ? Math.max(0, contentHeight) : 0;
  const safeBottomInset = Number.isFinite(bottomInset) ? Math.max(0, bottomInset) : 0;
  const trackHeight = Math.max(
    0,
    safeViewportHeight - FLIGHT_RESULTS_SCROLL_INDICATOR_TRACK_TOP - safeBottomInset,
  );
  const scrollRange = Math.max(0, safeContentHeight - safeViewportHeight);

  if (
    scrollRange <= 0
    || safeContentHeight <= 0
    || trackHeight <= FLIGHT_RESULTS_SCROLL_THUMB_MIN_HEIGHT
  ) {
    return {
      visible: false,
      trackHeight,
      thumbHeight: 0,
      thumbTravel: 0,
      scrollRange,
    };
  }

  const proportionalThumbHeight = trackHeight * (safeViewportHeight / safeContentHeight);
  const thumbHeight = Math.min(
    FLIGHT_RESULTS_SCROLL_THUMB_MAX_HEIGHT,
    Math.max(FLIGHT_RESULTS_SCROLL_THUMB_MIN_HEIGHT, proportionalThumbHeight),
  );

  return {
    visible: true,
    trackHeight,
    thumbHeight,
    thumbTravel: Math.max(0, trackHeight - thumbHeight),
    scrollRange,
  };
}
