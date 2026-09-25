"use client";

import { useEffect, useRef, useState } from "react";

import { calculateCarResultsScrollIndicatorGeometry } from "@/lib/cars/carResultsScrollIndicator";

const MOBILE_RESULTS_QUERY = "(max-width: 639px)";
const IDLE_FADE_DELAY_MS = 650;
const MIN_TRACK_HEIGHT_PX = 96;

export function CarsResultsScrollIndicator() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const geometryRef = useRef({
    scrollStart: 0,
    maxScroll: 0,
    thumbTravel: 0,
  });
  const animationFrameRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia(MOBILE_RESULTS_QUERY);
    const previousRouteMarker = root.getAttribute(
      "data-cars-results-scroll-indicator",
    );

    const setRouteMarker = () => {
      if (media.matches) root.setAttribute("data-cars-results-scroll-indicator", "");
      else root.removeAttribute("data-cars-results-scroll-indicator");
    };
    setRouteMarker();
    media.addEventListener("change", setRouteMarker);

    return () => {
      media.removeEventListener("change", setRouteMarker);
      if (previousRouteMarker === null)
        root.removeAttribute("data-cars-results-scroll-indicator");
      else
        root.setAttribute(
          "data-cars-results-scroll-indicator",
          previousRouteMarker,
        );
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_RESULTS_QUERY);
    const visualViewport = window.visualViewport;
    let resizeObserver: ResizeObserver | null = null;

    const updateThumbPosition = () => {
      animationFrameRef.current = null;
      const { scrollStart, maxScroll, thumbTravel } = geometryRef.current;
      const relativeScrollTop = Math.max(0, window.scrollY - scrollStart);
      const clampedScrollTop = Math.min(maxScroll, relativeScrollTop);
      const progress = maxScroll > 0 ? clampedScrollTop / maxScroll : 0;
      if (thumbRef.current)
        thumbRef.current.style.transform = `translate3d(0, ${progress * thumbTravel}px, 0)`;
    };

    const scheduleThumbPosition = () => {
      if (animationFrameRef.current === null)
        animationFrameRef.current = window.requestAnimationFrame(updateThumbPosition);
    };

    const resetGeometry = () => {
      geometryRef.current = {
        scrollStart: 0,
        maxScroll: 0,
        thumbTravel: 0,
      };
      setThumbHeight(0);
      setIsScrollable(false);
      setIsActive(false);
    };

    const measureGeometry = () => {
      const track = trackRef.current;
      if (!media.matches || !track) {
        resetGeometry();
        return;
      }

      const priceAlert = document.querySelector<HTMLElement>(
        "[data-cars-price-alert]",
      );
      const resultsRegion = document.querySelector<HTMLElement>(
        "[data-cars-results-scroll-region]",
      );
      if (!priceAlert || !resultsRegion) {
        resetGeometry();
        return;
      }

      resizeObserver?.observe(priceAlert);
      resizeObserver?.observe(resultsRegion);

      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const scrollY = window.scrollY;
      const scrollStart = Math.max(
        0,
        priceAlert.getBoundingClientRect().top + scrollY,
      );
      const regionBottom = Math.max(
        scrollStart,
        resultsRegion.getBoundingClientRect().bottom + scrollY,
      );
      const scrollEnd = Math.max(
        scrollStart,
        regionBottom - viewportHeight,
      );

      const maxTrackTop = Math.max(0, viewportHeight - MIN_TRACK_HEIGHT_PX);
      const trackTop = Math.min(scrollStart, maxTrackTop);
      track.style.top = `${trackTop}px`;

      const geometry = calculateCarResultsScrollIndicatorGeometry({
        scrollTop: scrollY,
        scrollStart,
        scrollEnd,
        trackHeight: track.clientHeight,
      });
      geometryRef.current = {
        scrollStart,
        maxScroll: geometry.maxScroll,
        thumbTravel: Math.max(0, track.clientHeight - geometry.thumbHeight),
      };
      setThumbHeight(geometry.thumbHeight);
      setIsScrollable(geometry.isScrollable);
      scheduleThumbPosition();
    };

    const showForScroll = () => {
      if (!media.matches || geometryRef.current.maxScroll <= 0) return;
      setIsActive(true);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setIsActive(false), IDLE_FADE_DELAY_MS);
      scheduleThumbPosition();
    };

    resizeObserver =
      "ResizeObserver" in window ? new ResizeObserver(measureGeometry) : null;
    resizeObserver?.observe(document.body);
    resizeObserver?.observe(document.documentElement);
    window.addEventListener("scroll", showForScroll, { passive: true });
    window.addEventListener("resize", measureGeometry);
    visualViewport?.addEventListener("resize", measureGeometry);
    media.addEventListener("change", measureGeometry);
    measureGeometry();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", showForScroll);
      window.removeEventListener("resize", measureGeometry);
      visualViewport?.removeEventListener("resize", measureGeometry);
      media.removeEventListener("change", measureGeometry);
      if (animationFrameRef.current !== null)
        window.cancelAnimationFrame(animationFrameRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={trackRef}
      data-cars-results-scroll-indicator
      aria-hidden="true"
      className="pointer-events-none fixed bottom-[max(calc(env(safe-area-inset-bottom)+8px),8px)] end-[max(calc(env(safe-area-inset-right)+3px),3px)] z-[95] w-[3px] sm:hidden"
    >
      <div
        ref={thumbRef}
        data-cars-results-scroll-thumb
        className={`w-full rounded-full bg-slate-700/55 opacity-0 shadow-[0_0_1px_rgba(255,255,255,0.55)] transition-opacity duration-200 motion-reduce:transition-none ${isScrollable && isActive ? "opacity-100" : ""}`}
        style={{ height: `${thumbHeight}px` }}
      />
    </div>
  );
}
