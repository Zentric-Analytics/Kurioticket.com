"use client";

import { useLayoutEffect, useRef } from "react";

export function CarsResultsMobileSafeArea() {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const probe = probeRef.current;
    if (!surface || !probe) return undefined;

    let frozenHeight = 0;
    let animationFrame = 0;

    const captureLargestInset = () => {
      animationFrame = 0;
      const measuredHeight = Math.ceil(probe.getBoundingClientRect().height);
      if (!Number.isFinite(measuredHeight) || measuredHeight <= frozenHeight) {
        return;
      }

      frozenHeight = measuredHeight;
      surface.style.height = `${measuredHeight}px`;
    };

    const scheduleCapture = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(captureLargestInset);
    };

    const resetForOrientation = () => {
      frozenHeight = 0;
      surface.style.removeProperty("height");
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
        ref={surfaceRef}
        data-cars-results-mobile-safe-area
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[env(safe-area-inset-top)] bg-white sm:hidden"
      />
    </>
  );
}
