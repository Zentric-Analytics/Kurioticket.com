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
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  nestedLayerOpen?: boolean;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  browserCanvasColor?: string;
};

/** Presentation-only shell used by mobile search editors on Results pages. */
export function MobileResultsEditSheet({
  open,
  title,
  children,
  onClose,
  nestedLayerOpen = false,
  footer,
  className,
  contentClassName,
  browserCanvasColor,
}: Props) {
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
    const releaseScrollLock = acquireMobileResultsScrollLock();
    return () => {
      releaseScrollLock();
      releaseCanvas();
    };
  }, [browserCanvasColor, open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      data-mobile-results-overlay-root
      data-mobile-results-edit-sheet
      className="mobile-results-overlay-root mobile-results-sheet-backdrop fixed inset-0 z-[10000] flex h-[100dvh] min-h-[100svh] w-screen items-end overflow-hidden overscroll-none bg-slate-950/35 motion-reduce:transition-none sm:hidden"
      onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn("mobile-results-sheet-surface flex max-h-[94dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-slate-200/80 bg-white shadow-[0_-12px_36px_rgba(15,23,42,0.18)] outline-none", className)}
      >
        <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 pb-2 pt-2">
          <div className="mx-auto flex min-h-11 w-full max-w-xl items-center justify-between gap-3">
            <h2 id={titleId} className="text-xl font-bold tracking-[-0.01em] text-slate-950">{title}</h2>
            <button type="button" aria-label={`Close ${title.toLocaleLowerCase()}`} onClick={close} className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4", footer && "pb-2", contentClassName)}>{children}</div>
        {footer ? <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
