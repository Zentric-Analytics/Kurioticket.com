export type CarResultsScrollIndicatorGeometryInput = {
  scrollTop: number;
  scrollStart: number;
  scrollEnd: number;
  trackHeight: number;
  minThumbHeight?: number;
};

export type CarResultsScrollIndicatorGeometry = {
  thumbHeight: number;
  thumbOffset: number;
  scrollProgress: number;
  maxScroll: number;
  isScrollable: boolean;
};

const finiteNonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

export function calculateCarResultsScrollIndicatorGeometry({
  scrollTop,
  scrollStart,
  scrollEnd,
  trackHeight,
  minThumbHeight = 24,
}: CarResultsScrollIndicatorGeometryInput): CarResultsScrollIndicatorGeometry {
  const safeScrollTop = finiteNonNegative(scrollTop);
  const safeScrollStart = finiteNonNegative(scrollStart);
  const safeScrollEnd = Math.max(
    safeScrollStart,
    finiteNonNegative(scrollEnd),
  );
  const safeTrackHeight = finiteNonNegative(trackHeight);
  const maxScroll = Math.max(0, safeScrollEnd - safeScrollStart);
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
    finiteNonNegative(minThumbHeight),
  );
  const representedContentHeight = safeTrackHeight + maxScroll;
  const proportionalHeight =
    representedContentHeight > 0
      ? safeTrackHeight * (safeTrackHeight / representedContentHeight)
      : 0;
  const thumbHeight = Math.min(
    safeTrackHeight,
    Math.max(lowerBound, finiteNonNegative(proportionalHeight)),
  );
  const relativeScrollTop = Math.max(0, safeScrollTop - safeScrollStart);
  const clampedScrollTop = Math.min(maxScroll, relativeScrollTop);
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
