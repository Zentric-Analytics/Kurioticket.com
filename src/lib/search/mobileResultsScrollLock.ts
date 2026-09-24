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

export type MobileResultsScrollLockOptions = {
  freezeBodyPosition?: boolean;
};

const activeLocks = new Set<symbol>();
let snapshot: InlineSnapshot | null = null;
let restoreScrollOnFinalRelease = true;
let fixedBodyPositionForActiveLock = true;

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

export function acquireMobileResultsScrollLock(
  { freezeBodyPosition = true }: MobileResultsScrollLockOptions = {},
): MobileResultsScrollLockRelease {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const token = Symbol("mobile-results-scroll-lock");
  activeLocks.add(token);

  if (activeLocks.size === 1) {
    snapshot = captureSnapshot();
    restoreScrollOnFinalRelease = true;
    fixedBodyPositionForActiveLock = freezeBodyPosition;

    const body = document.body;
    const root = document.documentElement;
    // Most mobile Results overlays still use the fixed-body strategy because
    // it is the broadest iOS Safari fallback. Cars filter/shortcut overlays can
    // opt out of body repositioning: their full-viewport scrim already owns
    // pointer input, so locking root/body overflow is sufficient and avoids the
    // visible jump caused by moving the body to -scrollY and restoring it.
    if (freezeBodyPosition) {
      body.style.left = `${-snapshot.scrollX}px`;
      body.style.position = "fixed";
      body.style.right = "0";
      body.style.top = `${-snapshot.scrollY}px`;
      body.style.width = "100%";
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
    if (!restoreScroll) restoreScrollOnFinalRelease = false;
    if (activeLocks.size !== 0 || !snapshot) return;

    const original = snapshot;
    const shouldRestoreScroll =
      restoreScrollOnFinalRelease && fixedBodyPositionForActiveLock;
    snapshot = null;
    restoreScrollOnFinalRelease = true;
    fixedBodyPositionForActiveLock = true;
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
