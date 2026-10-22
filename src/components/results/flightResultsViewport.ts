import { observeWindowOffset } from "@tanstack/react-virtual";
import { flushSync } from "react-dom";

/** Only the mobile Flight list opts into this adapter. Nested pickers may
 * replace the fixed body's top offset, so keep the last unlocked coordinates
 * rather than interpreting any fixed-body window scroll as a user scroll. */
export function isResultsBodyFixed() {
  return document.body.style.position === "fixed";
}

export function observeFlightResultsWindowOffset(
  instance: Parameters<typeof observeWindowOffset>[0],
  callback: Parameters<typeof observeWindowOffset>[1],
  reconcileGeometry: () => void,
) {
  const win = instance.scrollElement;
  if (!win) return;
  let wasLocked = isResultsBodyFixed();
  const stop = observeWindowOffset(instance, (offset, scrolling) => {
    if (!isResultsBodyFixed()) callback(offset, scrolling);
  });
  const observer = new MutationObserver(() => {
    const locked = isResultsBodyFixed();
    if (wasLocked && !locked) {
      // Body styles and scrollTo have both been restored by this microtask.
      // Commit the origin and offset together before paint, even when the
      // browser coalesces the native restoration scroll event.
      flushSync(() => {
        reconcileGeometry();
        callback(win.scrollY, false);
      });
    }
    wasLocked = locked;
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ["style"] });
  return () => { observer.disconnect(); stop?.(); };
}
