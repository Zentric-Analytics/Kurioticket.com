const OVERLAY_OPEN_ATTRIBUTE = "data-mobile-results-overlay-open";

let ownerCount = 0;

export type MobileResultsOverlayCanvasRelease = () => void;

/** Keeps the browser-owned root canvas dimmed for as long as any Results overlay owns it. */
export function acquireMobileResultsOverlayCanvas(): MobileResultsOverlayCanvasRelease {
  ownerCount += 1;
  document.documentElement.setAttribute(OVERLAY_OPEN_ATTRIBUTE, "");

  let released = false;
  return () => {
    if (released) return;
    released = true;
    ownerCount = Math.max(0, ownerCount - 1);
    if (ownerCount === 0) {
      document.documentElement.removeAttribute(OVERLAY_OPEN_ATTRIBUTE);
    }
  };
}
