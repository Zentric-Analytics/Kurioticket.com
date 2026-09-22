/** Re-entrant, mobile-Safari-safe document lock for mobile Results overlays. */
type InlineSnapshot = {
  body: Pick<
    CSSStyleDeclaration,
    | "left"
    | "overflow"
    | "overscrollBehavior"
    | "position"
    | "right"
    | "top"
    | "width"
  >;
  root: Pick<CSSStyleDeclaration, "overflow" | "overscrollBehavior">;
  scrollX: number;
  scrollY: number;
};

export type MobileResultsScrollLockRelease = (options?: {
  restoreScroll?: boolean;
}) => void;

const activeLocks = new Set<symbol>();
let snapshot: InlineSnapshot | null = null;
let restoreScrollOnFinalRelease = true;

function captureSnapshot(): InlineSnapshot {
  const body = document.body.style;
  const root = document.documentElement.style;
  return {
    body: {
      left: body.left,
      overflow: body.overflow,
      overscrollBehavior: body.overscrollBehavior,
      position: body.position,
      right: body.right,
      top: body.top,
      width: body.width,
    },
    root: {
      overflow: root.overflow,
      overscrollBehavior: root.overscrollBehavior,
    },
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

export function acquireMobileResultsScrollLock(): MobileResultsScrollLockRelease {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const token = Symbol("mobile-results-scroll-lock");
  activeLocks.add(token);

  if (activeLocks.size === 1) {
    snapshot = captureSnapshot();
    restoreScrollOnFinalRelease = true;

    const body = document.body;
    const root = document.documentElement;
    // Fixing the body at the inverse scroll offset freezes the rendered page on
    // iOS Safari without fighting scroll events. The root overflow lock closes
    // the remaining document scroller, while descendants such as the Edit
    // Search sheet retain their own overflow scrolling. Do not set touch-action
    // on body/root: an ancestor value of `none` also disables sheet panning.
    body.style.left = `${-snapshot.scrollX}px`;
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.position = "fixed";
    body.style.right = "0";
    body.style.top = `${-snapshot.scrollY}px`;
    body.style.width = "100%";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
  }

  let released = false;
  return ({ restoreScroll = true } = {}) => {
    if (released) return;
    released = true;
    activeLocks.delete(token);
    if (!restoreScroll) restoreScrollOnFinalRelease = false;
    if (activeLocks.size !== 0 || !snapshot) return;

    const original = snapshot;
    const shouldRestoreScroll = restoreScrollOnFinalRelease;
    snapshot = null;
    restoreScrollOnFinalRelease = true;
    Object.assign(document.body.style, original.body);
    Object.assign(document.documentElement.style, original.root);

    if (shouldRestoreScroll) {
      window.scrollTo({
        left: original.scrollX,
        top: original.scrollY,
        behavior: "auto",
      });
    }
  };
}
