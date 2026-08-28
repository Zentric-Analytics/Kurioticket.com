"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  launcherRef?: RefObject<HTMLElement | null>;
  nestedLayerOpen?: boolean;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  /** Set false when the domain owner already provides an equivalent scroll lock. */
  lockBodyScroll?: boolean;
};

/** Presentation-only shell used by mobile search editors on Results pages. */
export function MobileResultsEditSheet({
  open,
  title,
  children,
  onClose,
  launcherRef,
  nestedLayerOpen = false,
  footer,
  className,
  contentClassName,
  lockBodyScroll = true,
}: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [entered, setEntered] = useState(false);

  const close = useCallback(() => {
    if (nestedLayerOpen) return;
    setEntered(false);
    onClose();
  }, [nestedLayerOpen, onClose]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      setEntered(true);
      closeRef.current?.focus({ preventScroll: true });
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

  useEffect(() => {
    if (!open) return;
    const launcher = launcherRef?.current;
    return () => launcher?.focus({ preventScroll: true });
  }, [launcherRef, open]);

  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    const body = document.body;
    const root = document.documentElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const bodyStyle = body.getAttribute("style");
    const rootStyle = root.getAttribute("style");
    Object.assign(body.style, { position: "fixed", inset: "0", top: `-${scrollY}px`, left: `-${scrollX}px`, overflow: "hidden", width: "100%", overscrollBehavior: "none" });
    Object.assign(root.style, { overflow: "hidden", overscrollBehavior: "none" });
    return () => {
      if (bodyStyle === null) body.removeAttribute("style"); else body.setAttribute("style", bodyStyle);
      if (rootStyle === null) root.removeAttribute("style"); else root.setAttribute("style", rootStyle);
      window.scrollTo(scrollX, scrollY);
    };
  }, [lockBodyScroll, open]);

  if (!open) return null;
  return (
    <div
      data-mobile-results-edit-sheet
      className={cn("fixed inset-0 z-[10000] flex items-end bg-slate-950/35 transition-opacity duration-200 motion-reduce:transition-none sm:hidden", entered ? "opacity-100" : "opacity-0")}
      onPointerDown={(event) => { if (event.target === event.currentTarget) close(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn("flex max-h-[94dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-[22px] bg-slate-50 shadow-[0_-12px_36px_rgba(15,23,42,0.18)] transition-transform duration-200 ease-out motion-reduce:transition-none", entered ? "translate-y-0" : "translate-y-full", className)}
      >
        <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 pb-2 pt-2">
          <div className="mx-auto flex min-h-11 w-full max-w-xl items-center justify-between gap-3">
            <h2 id={titleId} className="text-xl font-bold tracking-[-0.01em] text-slate-950">{title}</h2>
            <button ref={closeRef} type="button" aria-label={`Close ${title.toLocaleLowerCase()}`} onClick={close} className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4", footer && "pb-2", contentClassName)}>{children}</div>
        {footer ? <div className="shrink-0 border-t border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">{footer}</div> : null}
      </div>
    </div>
  );
}
