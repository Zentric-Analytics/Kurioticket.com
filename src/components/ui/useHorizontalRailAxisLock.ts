"use client";

import { useCallback, useEffect, useRef } from "react";

const AXIS_LOCK_THRESHOLD_PX = 6;
const MOMENTUM_WINDOW_MS = 120;
const MAX_MOMENTUM_PX = 180;

type GestureAxis = "pending" | "horizontal" | "vertical";

export function horizontalRailGestureAxis(
  deltaX: number,
  deltaY: number,
  threshold = AXIS_LOCK_THRESHOLD_PX,
): GestureAxis {
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (Math.max(absX, absY) < threshold) return "pending";
  return absX > absY ? "horizontal" : "vertical";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function attachHorizontalRailAxisLock(element: HTMLElement) {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocityX = 0;
  let axis: GestureAxis = "pending";
  let dragged = false;
  let suppressNextClick = false;

  const reset = () => {
    pointerId = null;
    axis = "pending";
    dragged = false;
    velocityX = 0;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = element.scrollLeft;
    lastX = event.clientX;
    lastTime = event.timeStamp;
    velocityX = 0;
    axis = "pending";
    dragged = false;
  };

  const onPointerMove = (event: PointerEvent) => {
    if (pointerId !== event.pointerId) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (axis === "pending") {
      axis = horizontalRailGestureAxis(deltaX, deltaY);
      if (axis === "pending") return;
      if (axis === "vertical") return;
      try {
        element.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is only an enhancement; the drag remains usable without it.
      }
    }

    if (axis !== "horizontal") return;

    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    element.scrollLeft = clamp(startScrollLeft - deltaX, 0, maxScrollLeft);
    dragged = true;

    const elapsed = Math.max(1, event.timeStamp - lastTime);
    velocityX = (event.clientX - lastX) / elapsed;
    lastX = event.clientX;
    lastTime = event.timeStamp;
  };

  const finishHorizontalGesture = (event: PointerEvent, cancelled = false) => {
    if (pointerId !== event.pointerId) return;

    if (axis === "horizontal") {
      suppressNextClick = dragged;
      if (!cancelled && Math.abs(velocityX) > 0.05) {
        const momentum = clamp(
          -velocityX * MOMENTUM_WINDOW_MS,
          -MAX_MOMENTUM_PX,
          MAX_MOMENTUM_PX,
        );
        element.scrollBy({
          left: momentum,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
      }
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId);
      }
    }

    reset();
  };

  const onPointerUp = (event: PointerEvent) =>
    finishHorizontalGesture(event, false);
  const onPointerCancel = (event: PointerEvent) =>
    finishHorizontalGesture(event, true);
  const onClickCapture = (event: MouseEvent) => {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerCancel);
  element.addEventListener("click", onClickCapture, true);

  return () => {
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onPointerCancel);
    element.removeEventListener("click", onClickCapture, true);
  };
}

export function useHorizontalRailAxisLockRef<T extends HTMLElement>(
  forwardedRef?: { current: T | null },
) {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    [],
  );

  return useCallback(
    (element: T | null) => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      if (forwardedRef) forwardedRef.current = element;
      if (element) cleanupRef.current = attachHorizontalRailAxisLock(element);
    },
    [forwardedRef],
  );
}
