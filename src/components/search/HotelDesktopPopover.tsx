"use client";

import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import {
  calculateDesktopPopoverGeometry,
  type DesktopPopoverGeometry,
} from "@/components/search/desktopPopoverPosition";
import { cn } from "@/lib/utils";

const VIEWPORT_PADDING = 16;
const LAUNCHER_GAP = 10;

type HotelDesktopPopoverProps = {
  open: boolean;
  launcherRef: RefObject<HTMLElement | null>;
  preferredWidth: number;
  desiredHeight: number;
  onClose: () => void;
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  id?: string;
  role?: "dialog" | "listbox";
  ariaLabel?: string;
};

export function HotelDesktopPopover({
  open,
  launcherRef,
  preferredWidth,
  desiredHeight,
  onClose,
  children,
  align = "start",
  className,
  id,
  role = "dialog",
  ariaLabel,
}: HotelDesktopPopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [geometry, setGeometry] = useState<DesktopPopoverGeometry | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  const updateGeometry = useCallback(() => {
    const launcher = launcherRef.current;
    if (!launcher) return;
    const launcherRect = launcher.getBoundingClientRect();
    const outsideViewport =
      launcherRect.bottom <= VIEWPORT_PADDING ||
      launcherRect.top >= window.innerHeight - VIEWPORT_PADDING ||
      launcherRect.right <= VIEWPORT_PADDING ||
      launcherRect.left >= window.innerWidth - VIEWPORT_PADDING;
    if (outsideViewport) {
      onClose();
      return;
    }
    setGeometry(
      calculateDesktopPopoverGeometry({
        fieldRect: launcherRect,
        boundaryRect: launcherRect,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        viewportPadding: VIEWPORT_PADDING,
        gap: LAUNCHER_GAP,
        preferredWidth,
        desiredHeight,
        align,
      }),
    );
  }, [align, desiredHeight, launcherRef, onClose, preferredWidth]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 640px)");
    const handleChange = () => setIsDesktop(desktopQuery.matches);
    handleChange();
    desktopQuery.addEventListener("change", handleChange);
    return () => desktopQuery.removeEventListener("change", handleChange);
  }, []);

  useLayoutEffect(() => {
    if (!open || !isDesktop) {
      return;
    }
    updateGeometry();
    window.addEventListener("resize", updateGeometry);
    window.addEventListener("scroll", updateGeometry, true);
    return () => {
      window.removeEventListener("resize", updateGeometry);
      window.removeEventListener("scroll", updateGeometry, true);
    };
  }, [isDesktop, open, updateGeometry]);

  useEffect(() => {
    if (!open || !isDesktop) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        panelRef.current?.contains(target) ||
        launcherRef.current?.contains(target)
      )
        return;
      onClose();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isDesktop, launcherRef, onClose, open]);

  if (!open || !isDesktop || !geometry) return null;
  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      data-hotel-desktop-popover=""
      data-placement={geometry.placement}
      className={cn(
        "fixed z-[1100] overflow-y-auto overscroll-contain rounded-[10px] border border-[#DEE5ED] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]",
        className,
      )}
      style={{
        left: geometry.left,
        top: geometry.top,
        width: geometry.width,
        maxHeight: geometry.maxHeight,
        transform:
          geometry.placement === "above" ? "translateY(-100%)" : undefined,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
