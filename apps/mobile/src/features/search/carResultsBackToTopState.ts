/**
 * Pure scroll-state transitions for the native Cars result-list Back to top.
 * One scroll offset owns visibility in either direction. Suppress updates
 * only while an explicit animated return to zero is still in progress.
 */
// The web threshold is measured from the document origin, while native
// scrolls only its result list beneath persistent search and filter controls.
// Retain the earlier result-relative activation, rather than making native
// wait until more car cards have passed on screen.
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
