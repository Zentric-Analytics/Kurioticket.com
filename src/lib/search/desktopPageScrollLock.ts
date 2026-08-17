export type DesktopPageScrollLock = {
  restore: () => void;
};

/**
 * Prevent desktop page scrolling without changing the body's positioning or
 * reconstructing the scroll offset. Fixed-body locks are useful on mobile,
 * but they produce a visible unlock jump when sticky desktop UI remeasures.
 */
export function lockDesktopPageScroll(): DesktopPageScrollLock {
  const bodyElement = document.body;
  const rootElement = document.documentElement;
  const previousBodyStyles = {
    overflow: bodyElement.style.overflow,
    overscrollBehavior: bodyElement.style.overscrollBehavior,
  };
  const previousRootStyles = {
    overflow: rootElement.style.overflow,
    overscrollBehavior: rootElement.style.overscrollBehavior,
    scrollbarGutter: rootElement.style.scrollbarGutter,
  };
  let restored = false;

  rootElement.style.scrollbarGutter = "stable";
  rootElement.style.overflow = "hidden";
  rootElement.style.overscrollBehavior = "none";
  bodyElement.style.overflow = "hidden";
  bodyElement.style.overscrollBehavior = "none";

  return {
    restore: () => {
      if (restored) return;
      restored = true;
      bodyElement.style.overflow = previousBodyStyles.overflow;
      bodyElement.style.overscrollBehavior =
        previousBodyStyles.overscrollBehavior;
      rootElement.style.overflow = previousRootStyles.overflow;
      rootElement.style.overscrollBehavior =
        previousRootStyles.overscrollBehavior;
      rootElement.style.scrollbarGutter = previousRootStyles.scrollbarGutter;
    },
  };
}
