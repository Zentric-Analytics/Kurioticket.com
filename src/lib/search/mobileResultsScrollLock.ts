/** Re-entrant, mobile-Safari-safe document lock for mobile Results overlays. */
type StickyHeaderSnapshot = {
  element: HTMLElement;
  top: number;
  left: number;
  properties: Array<{ name: string; value: string; priority: string }>;
};

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
  hotelHeader: StickyHeaderSnapshot | null;
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

function captureHotelHeader(): StickyHeaderSnapshot | null {
  // Scope this correction to standalone mobile-web Hotel Results. Other lock
  // consumers (Flights, Cars, Details, and desktop) retain their existing path.
  if (
    typeof window.matchMedia !== "function" ||
    !window.matchMedia("(max-width: 639px)").matches ||
    !document.querySelector("[data-mobile-web-hotel-results]")
  ) return null;

  const element = document.querySelector<HTMLElement>("[data-hotel-results-desktop-header]");
  if (!element || window.getComputedStyle(element).position !== "sticky") return null;
  const rect = element.getBoundingClientRect();
  if (rect.height === 0) return null;

  return {
    element,
    top: rect.top,
    left: rect.left,
    properties: ["position", "top", "bottom", "left", "right", "transition"].map(name => ({
      name,
      value: element.style.getPropertyValue(name),
      priority: element.style.getPropertyPriority(name),
    })),
  };
}

function preserveHotelHeader(header: StickyHeaderSnapshot | null) {
  if (!header) return;
  const { element } = header;
  // Root/body overflow changes the sticky scroll ancestor even with overflow-only
  // locking. Keep the real header in normal flow (no lost 72px spacer), then offset
  // it back to its measured viewport position in the same synchronous lock step.
  for (const [name, value] of Object.entries({
    position: "relative", top: "0px", bottom: "auto", left: "0px", right: "auto", transition: "none",
  })) element.style.setProperty(name, value, "important");
  const rect = element.getBoundingClientRect();
  element.style.setProperty("top", `${header.top - rect.top}px`, "important");
  element.style.setProperty("left", `${header.left - rect.left}px`, "important");
}

function restoreHotelHeader(header: StickyHeaderSnapshot | null) {
  if (!header) return;
  for (const { name, value, priority } of header.properties) {
    if (value) header.element.style.setProperty(name, value, priority);
    else header.element.style.removeProperty(name);
  }
}

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
    hotelHeader: captureHotelHeader(),
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
    // Most mobile Results overlays, including the Cars quick-filter sheets,
    // use the fixed-body strategy because it matches the proven Hotels behavior
    // on iOS Safari. The Cars full-filter surface can opt out when it needs
    // overflow-only locking; Edit Search and quick sheets use this fixed-body
    // path so their overlay presentation shares the same stable viewport model.
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
    preserveHotelHeader(snapshot.hotelHeader);
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
    restoreHotelHeader(original.hotelHeader);

    if (shouldRestoreScroll) {
      window.scrollTo({
        left: original.scrollX,
        top: original.scrollY,
        // Do not inherit the page-wide smooth scrolling during overlay cleanup.
        behavior: "instant",
      });
    }
  };
}
