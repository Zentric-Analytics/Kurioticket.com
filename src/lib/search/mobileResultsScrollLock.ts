/**
 * Re-entrant document lock for mobile Results overlays.
 *
 * The document remains at its real scroll position: changing body positioning is
 * deliberately avoided because fixed-body locks make mobile visual viewports jump.
 */
type InlineSnapshot = {
  body: Pick<CSSStyleDeclaration, "overflow" | "overscrollBehavior" | "paddingRight" | "touchAction" | "scrollbarGutter">;
  root: Pick<CSSStyleDeclaration, "overflow" | "overscrollBehavior" | "touchAction" | "scrollbarGutter">;
  scrollX: number;
  scrollY: number;
};

export type MobileResultsScrollLockRelease = (options?: {
  restoreScroll?: boolean;
}) => void;

const activeLocks = new Set<symbol>();
let snapshot: InlineSnapshot | null = null;

function captureSnapshot(): InlineSnapshot {
  const body = document.body.style;
  const root = document.documentElement.style;
  return {
    body: {
      overflow: body.overflow,
      overscrollBehavior: body.overscrollBehavior,
      paddingRight: body.paddingRight,
      touchAction: body.touchAction,
      scrollbarGutter: body.scrollbarGutter,
    },
    root: {
      overflow: root.overflow,
      overscrollBehavior: root.overscrollBehavior,
      touchAction: root.touchAction,
      scrollbarGutter: root.scrollbarGutter,
    },
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

export function acquireMobileResultsScrollLock(): MobileResultsScrollLockRelease {
  if (typeof window === "undefined") return () => undefined;

  const token = Symbol("mobile-results-scroll-lock");
  activeLocks.add(token);

  if (activeLocks.size === 1) {
    snapshot = captureSnapshot();
    const body = document.body;
    const root = document.documentElement;
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);

    if (scrollbarWidth > 0) {
      const padding = window.getComputedStyle(body).paddingRight || "0px";
      body.style.paddingRight = `calc(${padding} + ${scrollbarWidth}px)`;
    }
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
  }

  let released = false;
  return ({ restoreScroll = true } = {}) => {
    if (released) return;
    released = true;
    activeLocks.delete(token);
    if (activeLocks.size !== 0 || !snapshot) return;

    const original = snapshot;
    snapshot = null;
    Object.assign(document.body.style, original.body);
    Object.assign(document.documentElement.style, original.root);

    if (
      restoreScroll &&
      (Math.abs(window.scrollX - original.scrollX) > 1 ||
        Math.abs(window.scrollY - original.scrollY) > 1)
    ) {
      window.scrollTo({
        left: original.scrollX,
        top: original.scrollY,
        behavior: "auto",
      });
    }
  };
}

