"use client";

import { useEffect } from "react";

const ROOT_ATTRIBUTE = "data-cars-results-mobile-scroll-boundary";
let activeBoundaryCount = 0;

export function CarsResultsMobileScrollBoundary() {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    activeBoundaryCount += 1;
    root.setAttribute(ROOT_ATTRIBUTE, "");
    body.setAttribute(ROOT_ATTRIBUTE, "");

    return () => {
      activeBoundaryCount = Math.max(0, activeBoundaryCount - 1);
      if (activeBoundaryCount > 0) return;

      root.removeAttribute(ROOT_ATTRIBUTE);
      body.removeAttribute(ROOT_ATTRIBUTE);
    };
  }, []);

  return null;
}
