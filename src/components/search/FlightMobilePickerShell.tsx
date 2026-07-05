"use client";

import {
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { ArrowLeft } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
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
  const { t } = useLocale();
  const closeInteractionRef = useRef<"keyboard" | "pointer">("pointer");
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

    const markPointerClose = () => {
      closeInteractionRef.current = "pointer";
    };
    const markKeyboardClose = () => {
      closeInteractionRef.current = "keyboard";
    };

    window.addEventListener("pointerdown", markPointerClose, { capture: true });
    window.addEventListener("touchstart", markPointerClose, { capture: true, passive: true });
    window.addEventListener("keydown", markKeyboardClose, { capture: true });

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

    let restoreTimeout: number | undefined;
    let settleTimeout: number | undefined;
    let didRestore = false;

    const waitForViewportToSettle = (callback: () => void) => {
      const visualViewport = window.visualViewport;

      if (!visualViewport) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(callback);
        });
        return;
      }

      let lastHeight = visualViewport.height;
      const cleanup = () => {
        visualViewport.removeEventListener("resize", handleResize);
        if (settleTimeout) window.clearTimeout(settleTimeout);
      };
      const finish = () => {
        if (didRestore) return;
        didRestore = true;
        cleanup();
        if (restoreTimeout) window.clearTimeout(restoreTimeout);
        window.requestAnimationFrame(callback);
      };
      const scheduleFinish = () => {
        if (settleTimeout) window.clearTimeout(settleTimeout);
        settleTimeout = window.setTimeout(finish, 48);
      };
      const handleResize = () => {
        if (Math.abs(visualViewport.height - lastHeight) > 1) {
          lastHeight = visualViewport.height;
          scheduleFinish();
        }
      };

      visualViewport.addEventListener("resize", handleResize, { passive: true });
      scheduleFinish();
      restoreTimeout = window.setTimeout(finish, 160);
    };

    return () => {
      window.removeEventListener("pointerdown", markPointerClose, { capture: true });
      window.removeEventListener("touchstart", markPointerClose, { capture: true });
      window.removeEventListener("keydown", markKeyboardClose, { capture: true });

      const shouldRestoreLauncherFocus = closeInteractionRef.current === "keyboard";
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }

      waitForViewportToSettle(() => {
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

        if (shouldRestoreLauncherFocus) {
          window.requestAnimationFrame(() => {
            launcherElement?.focus({ preventScroll: true });
          });
        }
      });
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
            closeInteractionRef.current = "keyboard";
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
              {t.back}
            </button>
            <h2 id={titleId} className="min-w-0 truncate text-base font-bold text-slate-950">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring min-h-10 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {t.cancel}
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
