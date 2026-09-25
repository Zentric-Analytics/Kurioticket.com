"use client";

import { useCallback, useEffect, useRef } from "react";

const INTENT_THRESHOLD_PX = 2;
const MAX_MOMENTUM_VELOCITY_PX_MS = 1.5;
const MIN_MOMENTUM_VELOCITY_PX_MS = 0.02;
const MOMENTUM_DECELERATION = 0.95;

export type FareInformationGestureAxis = "pending" | "horizontal" | "vertical";

export function fareInformationGestureAxis(
  currentAxis: FareInformationGestureAxis,
  deltaX: number,
  deltaY: number,
  threshold = INTENT_THRESHOLD_PX,
): FareInformationGestureAxis {
  if (currentAxis !== "pending") return currentAxis;

  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  if (Math.max(absX, absY) < threshold) return "pending";
  return absX > absY ? "horizontal" : "vertical";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function attachFareInformationTouchRail(element: HTMLElement) {
  let touchIdentifier: number | null = null;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startPageY = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocityX = 0;
  let axis: FareInformationGestureAxis = "pending";
  let suppressNextClick = false;
  let momentumFrame: number | null = null;

  const cancelMomentum = () => {
    if (momentumFrame !== null) cancelAnimationFrame(momentumFrame);
    momentumFrame = null;
  };

  const reset = () => {
    touchIdentifier = null;
    axis = "pending";
    velocityX = 0;
  };

  const matchingTouch = (touches: TouchList) => {
    if (touchIdentifier === null) return null;
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches.item(index);
      if (touch?.identifier === touchIdentifier) return touch;
    }
    return null;
  };

  const onTouchStart = (event: TouchEvent) => {
    if (touchIdentifier !== null || event.touches.length !== 1) return;
    const touch = event.touches.item(0);
    if (!touch) return;

    cancelMomentum();
    // Do not let a prior pan suppress a later, intentional tap if the browser
    // chose not to synthesize a click for the pan.
    suppressNextClick = false;
    touchIdentifier = touch.identifier;
    startX = touch.clientX;
    startY = touch.clientY;
    startScrollLeft = element.scrollLeft;
    startPageY = window.scrollY;
    lastX = touch.clientX;
    lastTime = event.timeStamp;
    velocityX = 0;
    axis = "pending";
  };

  const onTouchMove = (event: TouchEvent) => {
    const touch = matchingTouch(event.touches);
    if (!touch) return;

    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    axis = fareInformationGestureAxis(axis, deltaX, deltaY);
    if (axis === "pending") return;

    // A meaningful pan in either direction must not become a tab activation.
    suppressNextClick = true;
    if (axis === "vertical") return;

    event.preventDefault();
    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    element.scrollLeft = clamp(startScrollLeft - deltaX, 0, maxScrollLeft);

    // Safari can move the document during its first, still-undecided touchmove.
    // Return it to the gesture's origin as soon as horizontal intent wins.
    if (window.scrollY !== startPageY) window.scrollTo(window.scrollX, startPageY);

    const elapsed = Math.max(1, event.timeStamp - lastTime);
    velocityX = clamp(
      (lastX - touch.clientX) / elapsed,
      -MAX_MOMENTUM_VELOCITY_PX_MS,
      MAX_MOMENTUM_VELOCITY_PX_MS,
    );
    lastX = touch.clientX;
    lastTime = event.timeStamp;
  };

  const startMomentum = () => {
    if (
      Math.abs(velocityX) < MIN_MOMENTUM_VELOCITY_PX_MS
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) return;

    let previousTime = performance.now();
    const step = (time: number) => {
      const elapsed = Math.min(32, time - previousTime);
      previousTime = time;
      const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
      const nextScrollLeft = clamp(element.scrollLeft + velocityX * elapsed, 0, maxScrollLeft);
      const reachedEdge = nextScrollLeft === element.scrollLeft;
      element.scrollLeft = nextScrollLeft;
      velocityX *= MOMENTUM_DECELERATION ** (elapsed / 16.67);

      if (!reachedEdge && Math.abs(velocityX) >= MIN_MOMENTUM_VELOCITY_PX_MS) {
        momentumFrame = requestAnimationFrame(step);
      } else {
        momentumFrame = null;
      }
    };
    momentumFrame = requestAnimationFrame(step);
  };

  const finishTouch = (event: TouchEvent, cancelled: boolean) => {
    if (touchIdentifier === null || matchingTouch(event.changedTouches) === null) return;
    if (axis === "horizontal" && !cancelled) startMomentum();
    reset();
  };

  const onTouchEnd = (event: TouchEvent) => finishTouch(event, false);
  const onTouchCancel = (event: TouchEvent) => finishTouch(event, true);
  const onClickCapture = (event: MouseEvent) => {
    if (!suppressNextClick) return;
    suppressNextClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  element.addEventListener("touchstart", onTouchStart, { passive: true });
  element.addEventListener("touchmove", onTouchMove, { passive: false });
  element.addEventListener("touchend", onTouchEnd);
  element.addEventListener("touchcancel", onTouchCancel);
  element.addEventListener("click", onClickCapture, true);

  return () => {
    cancelMomentum();
    element.removeEventListener("touchstart", onTouchStart);
    element.removeEventListener("touchmove", onTouchMove);
    element.removeEventListener("touchend", onTouchEnd);
    element.removeEventListener("touchcancel", onTouchCancel);
    element.removeEventListener("click", onClickCapture, true);
  };
}

export function useFareInformationTouchRailRef<T extends HTMLElement>() {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    [],
  );

  return useCallback((element: T | null) => {
    cleanupRef.current?.();
    cleanupRef.current = element ? attachFareInformationTouchRail(element) : null;
  }, []);
}
