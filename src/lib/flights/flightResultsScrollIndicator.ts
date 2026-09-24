export type FlightResultsScrollIndicatorGeometryInput = {
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
  trackHeight: number;
};

export type FlightResultsScrollIndicatorGeometry = {
  thumbHeight: number;
  thumbOffset: number;
  scrollProgress: number;
  maxScroll: number;
  isScrollable: boolean;
};

export const FLIGHT_RESULTS_WEB_SCROLL_THUMB_MIN_HEIGHT = 22;
export const FLIGHT_RESULTS_WEB_SCROLL_THUMB_MAX_HEIGHT = 48;

const finiteNonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculateFlightResultsScrollIndicatorGeometry({
  scrollTop,
  scrollHeight,
  viewportHeight,
  trackHeight,
}: FlightResultsScrollIndicatorGeometryInput): FlightResultsScrollIndicatorGeometry {
  const safeScrollHeight = finiteNonNegative(scrollHeight);
  const safeViewportHeight = finiteNonNegative(viewportHeight);
  const safeTrackHeight = finiteNonNegative(trackHeight);
  const maxScroll = Math.max(0, safeScrollHeight - safeViewportHeight);
  const isScrollable = maxScroll > 0 && safeTrackHeight > 0;

  if (!isScrollable) {
    return {
      thumbHeight: 0,
      thumbOffset: 0,
      scrollProgress: 0,
      maxScroll,
      isScrollable: false,
    };
  }

  const lowerBound = Math.min(
    safeTrackHeight,
    FLIGHT_RESULTS_WEB_SCROLL_THUMB_MIN_HEIGHT,
  );
  const upperBound = Math.min(
    safeTrackHeight,
    Math.max(lowerBound, FLIGHT_RESULTS_WEB_SCROLL_THUMB_MAX_HEIGHT),
  );
  const proportionalHeight =
    safeScrollHeight > 0
      ? safeTrackHeight * (safeViewportHeight / safeScrollHeight)
      : 0;
  const thumbHeight = Math.min(
    upperBound,
    Math.max(lowerBound, finiteNonNegative(proportionalHeight)),
  );
  const clampedScrollTop = Math.min(maxScroll, finiteNonNegative(scrollTop));
  const scrollProgress = clampedScrollTop / maxScroll;
  const thumbOffset =
    scrollProgress * Math.max(0, safeTrackHeight - thumbHeight);

  return {
    thumbHeight,
    thumbOffset,
    scrollProgress,
    maxScroll,
    isScrollable: true,
  };
}
