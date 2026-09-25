"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { acquireMobileResultsScrollLock } from "@/lib/search/mobileResultsScrollLock";
import { acquireMobileResultsOverlayCanvas } from "@/lib/search/mobileResultsOverlayCanvas";

type Props = {
  appearance?: "default" | "carsResultsEdit";
  placement?: "top" | "bottom";
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  nestedLayerOpen?: boolean;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  browserCanvasColor?: string;
  cleanBackdrop?: boolean;
  backdropClassName?: string;
  bottomSurfaceContinuation?: boolean;
  bottomSurfaceContinuationClassName?: string;
  smoothMotion?: boolean;
  closing?: boolean;
  isolatedBackdrop?: boolean;
  onCloseAnimationComplete?: () => void;
  freezeBodyPosition?: boolean;
};

/** Presentation-only shell used by mobile search editors on Results pages. */
export function MobileResultsEditSheet({
  appearance = "default",
  placement = "bottom",
  open,
  title,
  children,
  onClose,
  nestedLayerOpen = false,
  footer,
  className,
  contentClassName,
  browserCanvasColor,
  cleanBackdrop = false,
  backdropClassName,
  bottomSurfaceContinuation = false,
  bottomSurfaceContinuationClassName,
  smoothMotion = false,
  closing = false,
  isolatedBackdrop = false,
  onCloseAnimationComplete,
  freezeBodyPosition = true,
}: Props) {
  const carsResultsEdit = appearance === "carsResultsEdit";
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    if (nestedLayerOpen) return;
    onClose();
  }, [nestedLayerOpen, onClose]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      // Focus the dialog rather than a visible action. This establishes an
      // accessible focus boundary without painting a focus-visible ring for a
      // sheet that was opened by touch.
      dialogRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!nestedLayerOpen) close();
        return;
      }
      if (event.key !== "Tab" || nestedLayerOpen) return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [close, nestedLayerOpen, open]);

  useLayoutEffect(() => {
    if (!open) return;
    const releaseCanvas = acquireMobileResultsOverlayCanvas({
      canvasColor: browserCanvasColor,
    });
    const releaseScrollLock = acquireMobileResultsScrollLock({
      freezeBodyPosition,
    });
    return () => {
      releaseScrollLock();
      releaseCanvas();
    };
  }, [browserCanvasColor, freezeBodyPosition, open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      data-mobile-results-overlay-root
      data-mobile-results-edit-sheet
      className={cn(
        "mobile-results-overlay-root fixed inset-0 z-[10000] flex min-h-0 w-screen items-end overflow-visible overscroll-none motion-reduce:transition-none sm:hidden",
        !isolatedBackdrop && "mobile-results-sheet-backdrop bg-slate-950/35",
        placement === "top" && "items-start",
        !isolatedBackdrop && cleanBackdrop && "mobile-results-sheet-backdrop-clean",
        !isolatedBackdrop && closing && "mobile-results-sheet-backdrop-closing",
        carsResultsEdit && "mobile-results-sheet-cars-edit",
      )}
      onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      {isolatedBackdrop ? (
        <div
          aria-hidden="true"
          className={cn(
            "mobile-results-sheet-backdrop-layer pointer-events-none fixed inset-0 bg-slate-950/35",
            cleanBackdrop && "mobile-results-sheet-backdrop-clean",
            closing && "mobile-results-sheet-backdrop-layer-closing",
            backdropClassName,
            carsResultsEdit && "mobile-results-sheet-cars-edit-backdrop",
          )}
        />
      ) : null}
      <div
        className={cn(
          "mobile-results-sheet-surface relative flex min-h-0 flex-col",
          carsResultsEdit
            ? "mobile-results-sheet-cars-edit-surface mx-3 mb-3 max-h-[88dvh] w-[calc(100%_-_24px)]"
            : "max-h-[94dvh] w-full",
          placement === "top" && "origin-top [animation:none]",
          smoothMotion && "mobile-results-sheet-surface-smooth",
          closing && "mobile-results-sheet-surface-closing",
        )}
        onAnimationEnd={(event) => {
          if (
            closing &&
            event.target === event.currentTarget &&
            event.animationName === "mobile-results-sheet-surface-out"
          ) {
            onCloseAnimationComplete?.();
          }
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "relative z-10 flex min-h-0 w-full flex-col overflow-hidden outline-none",
            carsResultsEdit
              ? "rounded-[24px] border-0 bg-[#F5F7FB] shadow-none"
              : "rounded-t-[22px] border border-b-0 border-slate-200/80 bg-white shadow-[0_-12px_36px_rgba(15,23,42,0.18)]",
            placement === "top" && !carsResultsEdit && "rounded-t-none rounded-b-[22px] border-t-0 border-b pt-[env(safe-area-inset-top)]",
            className,
          )}
        >
          <div className={cn("shrink-0 border-b border-slate-200/80 bg-white px-4 pb-2 pt-2", carsResultsEdit && "border-b-0 bg-[#F5F7FB] px-2 py-0")}>
            <div className={cn("mx-auto flex min-h-11 w-full max-w-xl items-center justify-between gap-3", carsResultsEdit && "relative min-h-[52px] justify-center")}>
              <h2 id={titleId} className={cn("text-xl font-bold tracking-[-0.01em] text-slate-950", carsResultsEdit && "cars-results-edit-title pointer-events-none absolute inset-x-12 top-1/2 -translate-y-1/2 text-center text-[19px] font-semibold leading-[24px] tracking-normal")}>{title}</h2>
              <button type="button" aria-label={`Close ${title.toLocaleLowerCase()}`} onClick={close} className={cn("inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35", carsResultsEdit && "absolute right-0")}>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div
            className={cn(
              "mobile-results-sheet-content min-h-0 flex-1 overflow-y-auto overscroll-contain bg-inherit px-4 py-4",
              carsResultsEdit && "px-3 pt-2.5",
              footer && "pb-2",
              contentClassName,
            )}
            style={carsResultsEdit
              ? { paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))" }
              : undefined
            }
          >
            {children}
          </div>
          {footer ? <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">{footer}</div> : null}
        </div>
      </div>
      {bottomSurfaceContinuation ? (
        <div
          data-mobile-results-sheet-bottom-continuation
          aria-hidden="true"
          className={cn(
            "mobile-results-sheet-bottom-continuation pointer-events-none fixed inset-x-0 top-[calc(100dvh-1px)] z-20 bg-white",
            closing && "mobile-results-sheet-bottom-continuation-closing",
            bottomSurfaceContinuationClassName,
          )}
        />
      ) : null}
    </div>,
    document.body,
  );
}
