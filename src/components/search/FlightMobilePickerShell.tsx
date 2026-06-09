"use client";

import {
  useEffect,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

type FlightMobilePickerShellProps = {
  open: boolean;
  title: string;
  titleId: string;
  launcherRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  className?: string;
  contentClassName?: string;
};

export function FlightMobilePickerShell({
  open,
  title,
  titleId,
  launcherRef,
  children,
  footer,
  onClose,
  className,
  contentClassName,
}: FlightMobilePickerShellProps) {
  const portalElement = typeof document === "undefined" ? null : document.body;

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const mobileQuery = window.matchMedia("(max-width: 639px)");
    if (!mobileQuery.matches) return;

    const launcherElement = launcherRef?.current;
    const bodyElement = document.body;
    const rootElement = document.documentElement;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      left: bodyElement.style.left,
      overflow: bodyElement.style.overflow,
      overscrollBehavior: bodyElement.style.overscrollBehavior,
      position: bodyElement.style.position,
      right: bodyElement.style.right,
      top: bodyElement.style.top,
      touchAction: bodyElement.style.touchAction,
      width: bodyElement.style.width,
    };
    const previousRootStyles = {
      height: rootElement.style.height,
      overflow: rootElement.style.overflow,
      overscrollBehavior: rootElement.style.overscrollBehavior,
    };

    bodyElement.style.left = "0";
    bodyElement.style.overflow = "hidden";
    bodyElement.style.overscrollBehavior = "none";
    bodyElement.style.position = "fixed";
    bodyElement.style.right = "0";
    bodyElement.style.top = `-${scrollY}px`;
    bodyElement.style.touchAction = "none";
    bodyElement.style.width = "100%";
    rootElement.style.height = "100%";
    rootElement.style.overflow = "hidden";
    rootElement.style.overscrollBehavior = "none";

    return () => {
      bodyElement.style.left = previousBodyStyles.left;
      bodyElement.style.overflow = previousBodyStyles.overflow;
      bodyElement.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
      bodyElement.style.position = previousBodyStyles.position;
      bodyElement.style.right = previousBodyStyles.right;
      bodyElement.style.top = previousBodyStyles.top;
      bodyElement.style.touchAction = previousBodyStyles.touchAction;
      bodyElement.style.width = previousBodyStyles.width;
      rootElement.style.height = previousRootStyles.height;
      rootElement.style.overflow = previousRootStyles.overflow;
      rootElement.style.overscrollBehavior = previousRootStyles.overscrollBehavior;
      window.scrollTo(0, scrollY);
      window.requestAnimationFrame(() => launcherElement?.focus());
    };
  }, [launcherRef, open]);

  if (!open || !portalElement) return null;

  return createPortal(
    <div
      data-flight-mobile-picker-shell
      className="fixed inset-0 z-[2147483647] h-[100dvh] w-screen max-w-full overflow-hidden bg-white sm:hidden"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
        className={cn(
          "fixed inset-0 flex h-[100dvh] min-h-0 w-screen max-w-full flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)]",
          className,
        )}
      >
        <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 pb-3 pt-3">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
            <h2 id={titleId} className="min-w-0 truncate text-base font-bold text-slate-950">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring min-h-10 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className={cn("min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-slate-50 px-4 py-4", contentClassName)}>
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto w-full max-w-xl">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>,
    portalElement,
  );
}
