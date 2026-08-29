export const PAGINATION_MIN_BUSY_MS = 140;
export const PAGINATION_REVEAL_MS = 150;

type ScrollTarget = { top?: number; element?: HTMLElement | null };

export function prefersReducedResultsMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Scrolls to a results anchor and resolves once scrolling has actually settled. */
export function scrollToResultsAndWait(
  target: ScrollTarget,
  { maximumWaitMs = 1600, settleMs = 90 }: { maximumWaitMs?: number; settleMs?: number } = {},
) {
  if (typeof window === "undefined") return Promise.resolve();

  const reducedMotion = prefersReducedResultsMotion();
  const startedAt = performance.now();

  if (target.element) {
    target.element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  } else {
    window.scrollTo({ top: Math.max(0, target.top ?? 0), behavior: reducedMotion ? "auto" : "smooth" });
  }

  if (reducedMotion) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let settleTimer = 0;
    let maximumTimer = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("scroll", scheduleSettle);
      window.removeEventListener("scrollend", finish);
      window.clearTimeout(settleTimer);
      window.clearTimeout(maximumTimer);
      const remaining = PAGINATION_MIN_BUSY_MS - (performance.now() - startedAt);
      if (remaining > 0) window.setTimeout(resolve, remaining);
      else resolve();
    };
    const scheduleSettle = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(finish, settleMs);
    };
    window.addEventListener("scroll", scheduleSettle, { passive: true });
    window.addEventListener("scrollend", finish, { once: true });
    maximumTimer = window.setTimeout(finish, maximumWaitMs);
    scheduleSettle();
  });
}
