/**
 * Pure scroll-state transitions for the native Cars result-list Back to top.
 * Keep scroll visibility direction-independent. Only suppress events while
 * the list is genuinely animating back toward offset zero.
 */
// The native list begins below the persistent search/filter header, unlike the web page.
// Reveal within the first result card instead of waiting for a second card.
export const CAR_BACK_TO_TOP_SCROLL_THRESHOLD = 320;

export type CarBackToTopScrollState = {
  offset: number;
  returning: boolean;
  visible: boolean;
};

export const INITIAL_CAR_BACK_TO_TOP_SCROLL_STATE: CarBackToTopScrollState = {
  offset: 0,
  returning: false,
  visible: false,
};

export function updateCarBackToTopScroll(
  previous: CarBackToTopScrollState,
  currentOffset: number,
): CarBackToTopScrollState {
  const offset = Number.isFinite(currentOffset) ? Math.max(0, currentOffset) : previous.offset;

  // Ignore the decreasing offsets from an animated return, not ordinary
  // downward scrolling. Release at the top OR when the movement reverses
  // (for example because a user interrupted the animation).
  const returning = previous.returning && offset > 1 && offset <= previous.offset + 1;
  return {
    offset,
    returning,
    visible: !returning && offset > CAR_BACK_TO_TOP_SCROLL_THRESHOLD,
  };
}

export function beginCarBackToTopReturn(
  previous: CarBackToTopScrollState,
): CarBackToTopScrollState {
  return {
    ...previous,
    // Calling scrollToOffset(0) while ALREADY at the top need not produce a
    // scroll event. Never leave the return guard armed in that situation.
    returning: previous.offset > 1,
    visible: false,
  };
}
