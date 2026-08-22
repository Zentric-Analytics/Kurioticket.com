"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export const flightSearchFieldShellClassName =
  "homepage-no-decorative-focus homepage-keyboard-focus-within relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-400 sm:min-h-[58px] sm:rounded-none sm:border-0 sm:border-e sm:border-slate-200 sm:bg-white sm:px-4 sm:py-2 sm:shadow-none sm:hover:border-slate-200 lg:flex lg:flex-col lg:justify-center";
export const flightSearchFieldLabelClassName =
  "mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600 sm:text-[10px] sm:font-semibold sm:tracking-[0.10em] sm:text-slate-700";
export const flightSearchFieldValueButtonClassName =
  "focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md text-start text-[16px] font-medium text-slate-900 outline-none transition-colors sm:h-auto sm:min-h-7 sm:rounded-none sm:text-[15px] sm:font-medium sm:tracking-[-0.01em] sm:text-slate-950 sm:focus-visible:shadow-none";
export const flightDesktopPopoverSelector =
  "[data-standalone-flight-desktop-popover]";

type FlightAirportFieldControlProps = {
  label: string;
  value: string;
  placeholder: string;
  mobilePlaceholder: string;
  useMainFlightLandingMobilePresentation?: boolean;
  open: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  mobileLauncherRef: React.RefObject<HTMLButtonElement | null>;
  desktopSuggestions: React.ReactNode;
  className?: string;
  inputLabel?: string;
  onMobileOpen: () => void;
  onDesktopFocus: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

export const FlightAirportFieldControl = React.forwardRef<
  HTMLDivElement,
  FlightAirportFieldControlProps
>(function FlightAirportFieldControl(
  {
    label,
    value,
    placeholder,
    mobilePlaceholder,
    useMainFlightLandingMobilePresentation = false,
    open,
    inputRef,
    mobileLauncherRef,
    desktopSuggestions,
    className,
    inputLabel,
    onMobileOpen,
    onDesktopFocus,
    onChange,
    onKeyDown,
  },
  ref,
) {
  const suggestionsId = useId();
  return (
    <div ref={ref} data-multi-city-picker-anchor className={cn(flightSearchFieldShellClassName, className)}>
      <label className={flightSearchFieldLabelClassName}>{label}</label>
      <button
        ref={mobileLauncherRef}
        type="button"
        aria-label={inputLabel ?? label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={onMobileOpen}
        className={cn(flightSearchFieldValueButtonClassName, "sm:hidden")}
      >
        {useMainFlightLandingMobilePresentation ? (
          <span className="flex min-w-0 flex-1 items-center gap-2 sm:contents">
            <MapPin className="h-4 w-4 shrink-0 text-slate-500 sm:hidden" aria-hidden="true" />
            <span className={cn("truncate", !value && "text-slate-400")}>
              {value || mobilePlaceholder}
            </span>
          </span>
        ) : (
          <>
            <span className={cn("truncate", !value && "text-slate-400")}>
              {value || mobilePlaceholder || placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
          </>
        )}
      </button>
      <div className="relative hidden min-w-0 items-center gap-2 sm:flex">
        <MapPin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          aria-label={inputLabel ?? label}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={open ? suggestionsId : undefined}
          aria-expanded={open}
          value={value}
          onFocus={onDesktopFocus}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="h-7 min-w-0 flex-1 rounded-none border-0 bg-transparent pe-0 text-[15px] font-semibold tracking-[-0.01em] text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-500"
        />
      </div>
      <div id={suggestionsId}>{desktopSuggestions}</div>
    </div>
  );
});

type DesktopFlightPopoverProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  desiredWidth: number;
  align?: "start" | "end";
  placement?: "auto" | "above" | "below";
  offset?: number;
  maxHeight?: number | string;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
};

export function DesktopFlightPopover({
  open,
  anchorRef,
  desiredWidth,
  align = "start",
  placement = "auto",
  offset = 10,
  maxHeight,
  className,
  contentClassName,
  children,
}: DesktopFlightPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number | null;
    bottom: number | null;
    width: number;
    availableHeight: number;
  } | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(min-width: 640px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open || !isDesktop || typeof window === "undefined") return;
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return setPosition(null);
      const gutter = 16;
      const anchorRect = anchor.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const width = Math.min(desiredWidth, Math.max(0, viewportWidth - gutter * 2));
      const preferredLeft = align === "end" ? anchorRect.right - width : anchorRect.left;
      const left = Math.min(Math.max(gutter, preferredLeft), Math.max(gutter, viewportWidth - width - gutter));
      const viewportHeight = window.innerHeight;
      const measuredHeight = popoverRef.current?.getBoundingClientRect().height;
      const estimatedHeight = typeof maxHeight === "number" ? maxHeight : Math.min(520, viewportHeight * 0.72);
      const popoverHeight = Math.min(measuredHeight || estimatedHeight, viewportHeight - gutter * 2);
      const availableBelow = viewportHeight - anchorRect.bottom - offset - gutter;
      const availableAbove = anchorRect.top - offset - gutter;
      const openAbove = placement === "above" || (placement === "auto" && availableBelow < popoverHeight && availableAbove > availableBelow);
      const availableHeight = Math.max(160, openAbove ? availableAbove : availableBelow);
      setPosition({
        left,
        top: openAbove ? null : Math.max(gutter, anchorRect.bottom + offset),
        bottom: openAbove ? Math.max(gutter, viewportHeight - anchorRect.top + offset) : null,
        width,
        availableHeight,
      });
    };
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    if (popoverRef.current) observer?.observe(popoverRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, anchorRef, desiredWidth, isDesktop, maxHeight, offset, open, placement]);

  if (!open || !isDesktop || !position || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={popoverRef}
      data-standalone-flight-desktop-popover
      className={cn("fixed z-[1000] overflow-y-auto overscroll-contain", contentClassName)}
      style={{
        left: position.left,
        top: position.top ?? undefined,
        bottom: position.bottom ?? undefined,
        width: position.width,
        maxHeight: typeof maxHeight === "number" ? `${Math.min(maxHeight, position.availableHeight)}px` : maxHeight || `${position.availableHeight}px`,
      }}
    >
      <div className={cn("bg-white", className)}>{children}</div>
    </div>,
    document.body,
  );
}
