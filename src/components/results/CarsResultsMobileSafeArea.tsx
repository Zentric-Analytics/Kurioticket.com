"use client";

import { useLayoutEffect, useRef } from "react";

const CARS_RESULTS_SAFE_AREA_PROPERTY = "--cars-results-safe-area-top";

export function CarsResultsMobileSafeArea() {
  const probeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe) return undefined;

    const root = document.documentElement;
    const previousInlineValue = root.style.getPropertyValue(
      CARS_RESULTS_SAFE_AREA_PROPERTY,
    );
    let frozenHeight = 0;
    let animationFrame = 0;

    const captureLargestInset = () => {
      animationFrame = 0;
      const measuredHeight = Math.ceil(probe.getBoundingClientRect().height);
      if (!Number.isFinite(measuredHeight) || measuredHeight <= frozenHeight) {
        return;
      }

      frozenHeight = measuredHeight;
      root.style.setProperty(
        CARS_RESULTS_SAFE_AREA_PROPERTY,
        `${measuredHeight}px`,
      );
    };

    const scheduleCapture = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(captureLargestInset);
    };

    const resetForOrientation = () => {
      frozenHeight = 0;
      root.style.removeProperty(CARS_RESULTS_SAFE_AREA_PROPERTY);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = window.requestAnimationFrame(captureLargestInset);
      });
    };

    captureLargestInset();
    scheduleCapture();

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(captureLargestInset);
    resizeObserver?.observe(probe);

    window.addEventListener("resize", scheduleCapture);
    window.addEventListener("orientationchange", resetForOrientation);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", scheduleCapture);
      window.removeEventListener("orientationchange", resetForOrientation);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (previousInlineValue) {
        root.style.setProperty(
          CARS_RESULTS_SAFE_AREA_PROPERTY,
          previousInlineValue,
        );
      } else {
        root.style.removeProperty(CARS_RESULTS_SAFE_AREA_PROPERTY);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={probeRef}
        data-cars-results-mobile-safe-area-probe
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[env(safe-area-inset-top)] opacity-0 sm:hidden"
      />
      <div
        data-cars-results-mobile-safe-area
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[var(--cars-results-safe-area-top)] bg-white sm:hidden"
      />
    </>
  );
}
