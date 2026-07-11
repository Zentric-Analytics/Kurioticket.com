export type CarouselDirection = "ltr" | "rtl";

export type CarouselScrollMetrics = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  direction?: CarouselDirection | string;
};

export type CarouselScrollState = {
  logicalScrollLeft: number;
  maxScrollLeft: number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
};

export type CarouselArrowRenderState = {
  canScrollToPrevious: boolean;
  canScrollToNext: boolean;
  shouldRenderPreviousArrow: boolean;
};

const DEFAULT_SCROLL_TOLERANCE = 2;

export function getLogicalCarouselScrollState(
  metrics: CarouselScrollMetrics,
  tolerance = DEFAULT_SCROLL_TOLERANCE,
): CarouselScrollState {
  const maxScrollLeft = Math.max(0, metrics.scrollWidth - metrics.clientWidth);
  const safeTolerance = Math.max(0, tolerance);
  const rawScrollLeft = Number.isFinite(metrics.scrollLeft) ? metrics.scrollLeft : 0;
  const logicalScrollLeft = clamp(
    metrics.direction === "rtl"
      ? normalizeRtlScrollLeft(rawScrollLeft, maxScrollLeft)
      : rawScrollLeft,
    0,
    maxScrollLeft,
  );

  return {
    logicalScrollLeft,
    maxScrollLeft,
    canScrollLeft: logicalScrollLeft > safeTolerance,
    canScrollRight: maxScrollLeft - logicalScrollLeft > safeTolerance,
  };
}

export function getCarouselArrowRenderState(
  scrollState: CarouselScrollState,
  hasAdvancedWithNextArrow: boolean,
): CarouselArrowRenderState {
  return {
    canScrollToPrevious: scrollState.canScrollLeft,
    canScrollToNext: scrollState.canScrollRight,
    shouldRenderPreviousArrow:
      hasAdvancedWithNextArrow && scrollState.canScrollLeft,
  };
}

export function hasCarouselAdvancedForward(
  before: CarouselScrollState,
  after: CarouselScrollState,
  tolerance = DEFAULT_SCROLL_TOLERANCE,
) {
  return after.logicalScrollLeft - before.logicalScrollLeft > Math.max(0, tolerance);
}

export function getCarouselStartScrollLeft(direction: CarouselDirection | string | undefined, maxScrollLeft: number) {
  if (direction !== "rtl") return 0;
  return maxScrollLeft;
}

function normalizeRtlScrollLeft(scrollLeft: number, maxScrollLeft: number) {
  if (maxScrollLeft <= 0) return 0;
  if (scrollLeft < 0) return Math.abs(scrollLeft);
  return maxScrollLeft - scrollLeft;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
