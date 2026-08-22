"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

import { calculateDesktopPopoverGeometry } from "./desktopPopoverPosition";

export const carsDesktopPopoverClassName =
  "fixed z-[1100] hidden rounded-[10px] border border-[#DEE5ED] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)] sm:block";

export function useCarsDesktopPopover<T extends HTMLElement>({
  open,
  launcherRef,
  preferredWidth,
  desiredHeight,
  maxHeight,
  align = "start",
  providedPopoverRef,
  onLauncherOutOfView,
}: {
  open: boolean;
  launcherRef?: RefObject<T | null>;
  preferredWidth: number;
  desiredHeight: number;
  maxHeight?: number;
  align?: "start" | "center" | "end";
  providedPopoverRef?: RefObject<HTMLDivElement | null>;
  onLauncherOutOfView?: () => void;
}) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = providedPopoverRef ?? internalRef;
  const [style, setStyle] = useState<CSSProperties>();
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const onLauncherOutOfViewRef = useRef(onLauncherOutOfView);
  onLauncherOutOfViewRef.current = onLauncherOutOfView;

  useLayoutEffect(() => {
    if (!open || !launcherRef?.current) return;
    const update = () => {
      if (!launcherRef.current) return;
      const rect = launcherRef.current.getBoundingClientRect();
      const viewportPadding = 16;
      const launcherIsOutsideViewport =
        rect.bottom <= viewportPadding ||
        rect.top >= window.innerHeight - viewportPadding ||
        rect.right <= viewportPadding ||
        rect.left >= window.innerWidth - viewportPadding;
      if (launcherIsOutsideViewport) {
        onLauncherOutOfViewRef.current?.();
        return;
      }
      const placementHeight = Math.min(desiredHeight, maxHeight ?? desiredHeight);
      const geometry = calculateDesktopPopoverGeometry({
        fieldRect: rect,
        boundaryRect: rect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        viewportPadding,
        gap: 10,
        preferredWidth,
        desiredHeight: placementHeight,
        align,
      });
      setPlacement(geometry.placement);
      setStyle({
        left: geometry.left,
        top: geometry.top,
        width: geometry.width,
        maxHeight: Math.min(geometry.maxHeight, maxHeight ?? geometry.maxHeight),
        transform: geometry.placement === "above" ? "translateY(-100%)" : undefined,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(launcherRef.current);
    if (popoverRef.current) observer.observe(popoverRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [align, desiredHeight, launcherRef, maxHeight, open, popoverRef, preferredWidth]);

  return { placement, popoverRef, style };
}
