"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import { ArrowLeft } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { cn } from "@/lib/utils";

export type FlightMobilePickerRequestClose = () => void;

type FlightMobilePickerShellProps = {
  open: boolean;
  title: string;
  titleId: string;
  launcherRef?: RefObject<HTMLElement | null>;
  children:
    | ReactNode
    | ((requestClose: FlightMobilePickerRequestClose) => ReactNode);
  footer?:
    | ReactNode
    | ((requestClose: FlightMobilePickerRequestClose) => ReactNode);
  onClose: () => void;
  className?: string;
  contentClassName?: string;
  pickerMarker?: "flight-date" | "traveler-cabin";
};

type ScrollLockSnapshot = {
  body: HTMLElement;
  root: HTMLElement;
  launcherElement: HTMLElement | null | undefined;
  scrollY: number;
  previousBodyStyles: {
    left: string;
    overflow: string;
    overscrollBehavior: string;
    position: string;
    right: string;
    top: string;
    touchAction: string;
    width: string;
  };
  previousRootStyles: {
    height: string;
    overflow: string;
    overscrollBehavior: string;
  };
};

const VIEWPORT_SETTLE_MS = 72;
const VIEWPORT_FALLBACK_MS = 320;

function waitForMobileViewportToSettle() {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const visualViewport = window.visualViewport;

    if (!visualViewport) {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.setTimeout(resolve, 80);
        });
      });
      return;
    }

    const viewport = visualViewport;

    let settledTimeout: number | undefined;
    let settled = false;
    let lastHeight = viewport.height;
    let lastOffsetTop = viewport.offsetTop;

    const cleanup = () => {
      viewport.removeEventListener("resize", handleViewportChange);
      viewport.removeEventListener("scroll", handleViewportChange);
      if (settledTimeout) window.clearTimeout(settledTimeout);
      if (fallbackTimeout) window.clearTimeout(fallbackTimeout);
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      window.requestAnimationFrame(() => resolve());
    };

    const scheduleSettle = () => {
      if (settledTimeout) window.clearTimeout(settledTimeout);
      settledTimeout = window.setTimeout(finish, VIEWPORT_SETTLE_MS);
    };

    function handleViewportChange() {
      const heightChanged = Math.abs(viewport.height - lastHeight) > 1;
      const offsetChanged = Math.abs(viewport.offsetTop - lastOffsetTop) > 1;

      if (heightChanged || offsetChanged) {
        lastHeight = viewport.height;
        lastOffsetTop = viewport.offsetTop;
      }

      scheduleSettle();
    }

    const fallbackTimeout = window.setTimeout(finish, VIEWPORT_FALLBACK_MS);

    viewport.addEventListener("resize", handleViewportChange, {
      passive: true,
    });
    viewport.addEventListener("scroll", handleViewportChange, {
      passive: true,
    });
    scheduleSettle();
  });
}

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
  pickerMarker,
}: FlightMobilePickerShellProps) {
  const { t } = useLocale();
  const [isClosing, setIsClosing] = useState(false);
  const closeInteractionRef = useRef<"keyboard" | "pointer">("pointer");
  const closePromiseRef = useRef<Promise<void> | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const scrollLockSnapshotRef = useRef<ScrollLockSnapshot | null>(null);
  const canRestoreScrollLockRef = useRef(false);
  const portalElement = typeof document === "undefined" ? null : document.body;

  const restoreScrollLock = useCallback((restoreFocus: boolean) => {
    if (typeof window === "undefined") return;

    const snapshot = scrollLockSnapshotRef.current;
    if (!snapshot) return;

    scrollLockSnapshotRef.current = null;
    snapshot.body.style.left = snapshot.previousBodyStyles.left;
    snapshot.body.style.overflow = snapshot.previousBodyStyles.overflow;
    snapshot.body.style.overscrollBehavior =
      snapshot.previousBodyStyles.overscrollBehavior;
    snapshot.body.style.position = snapshot.previousBodyStyles.position;
    snapshot.body.style.right = snapshot.previousBodyStyles.right;
    snapshot.body.style.top = snapshot.previousBodyStyles.top;
    snapshot.body.style.touchAction = snapshot.previousBodyStyles.touchAction;
    snapshot.body.style.width = snapshot.previousBodyStyles.width;
    snapshot.root.style.height = snapshot.previousRootStyles.height;
    snapshot.root.style.overflow = snapshot.previousRootStyles.overflow;
    snapshot.root.style.overscrollBehavior =
      snapshot.previousRootStyles.overscrollBehavior;
    window.scrollTo(0, snapshot.scrollY);

    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        snapshot.launcherElement?.focus({ preventScroll: true });
      });
    }
  }, []);

  const requestClose = useCallback(() => {
    if (closePromiseRef.current) return;

    if (typeof window === "undefined") {
      onClose();
      return;
    }

    const mobileQuery = window.matchMedia("(max-width: 639px)");

    if (!mobileQuery.matches) {
      onClose();
      return;
    }

    setIsClosing(true);

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      (!shellRef.current || shellRef.current.contains(activeElement))
    ) {
      activeElement.blur();
    }

    closePromiseRef.current = waitForMobileViewportToSettle().then(() => {
      canRestoreScrollLockRef.current = true;
      onClose();
      restoreScrollLock(closeInteractionRef.current === "keyboard");
    });
  }, [onClose, restoreScrollLock]);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsClosing(false);
      closePromiseRef.current = null;
      canRestoreScrollLockRef.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const mobileQuery = window.matchMedia("(max-width: 639px)");
    if (!mobileQuery.matches) return;

    const launcherElement = launcherRef?.current;
    const bodyElement = document.body;
    const rootElement = document.documentElement;
    const scrollY = window.scrollY;

    scrollLockSnapshotRef.current = {
      body: bodyElement,
      root: rootElement,
      launcherElement,
      scrollY,
      previousBodyStyles: {
        left: bodyElement.style.left,
        overflow: bodyElement.style.overflow,
        overscrollBehavior: bodyElement.style.overscrollBehavior,
        position: bodyElement.style.position,
        right: bodyElement.style.right,
        top: bodyElement.style.top,
        touchAction: bodyElement.style.touchAction,
        width: bodyElement.style.width,
      },
      previousRootStyles: {
        height: rootElement.style.height,
        overflow: rootElement.style.overflow,
        overscrollBehavior: rootElement.style.overscrollBehavior,
      },
    };

    const markPointerClose = () => {
      closeInteractionRef.current = "pointer";
    };
    const markKeyboardClose = () => {
      closeInteractionRef.current = "keyboard";
    };

    window.addEventListener("pointerdown", markPointerClose, { capture: true });
    window.addEventListener("touchstart", markPointerClose, {
      capture: true,
      passive: true,
    });
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

    const shellElement = shellRef.current;

    return () => {
      window.removeEventListener("pointerdown", markPointerClose, {
        capture: true,
      });
      window.removeEventListener("touchstart", markPointerClose, {
        capture: true,
      });
      window.removeEventListener("keydown", markKeyboardClose, {
        capture: true,
      });

      if (!canRestoreScrollLockRef.current) {
        const activeElement = document.activeElement;
        if (
          activeElement instanceof HTMLElement &&
          shellElement?.contains(activeElement)
        ) {
          activeElement.blur();
        }
      }

      restoreScrollLock(closeInteractionRef.current === "keyboard");
    };
  }, [launcherRef, open, restoreScrollLock]);

  if (!open || !portalElement) return null;

  // Render-prop children receive only the stable close helper for descendant event handlers.
  const renderedChildren =
    typeof children === "function"
      ? // eslint-disable-next-line react-hooks/refs
        children(requestClose)
      : children;
  const renderedFooter =
    typeof footer === "function"
      ? // eslint-disable-next-line react-hooks/refs
        footer(requestClose)
      : footer;

  return createPortal(
    <div
      ref={shellRef}
      data-flight-mobile-picker-shell
      data-mobile-flight-date-picker={
        pickerMarker === "flight-date" ? "true" : undefined
      }
      data-mobile-traveler-cabin-picker={
        pickerMarker === "traveler-cabin" ? "true" : undefined
      }
      data-closing={isClosing ? "true" : undefined}
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
            requestClose();
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
              onClick={requestClose}
              disabled={isClosing}
              className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-60"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t.back}
            </button>
            <h2
              id={titleId}
              className="min-w-0 truncate text-base font-bold text-slate-950"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              disabled={isClosing}
              className="focus-ring min-h-10 rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-60"
            >
              {t.cancel}
            </button>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-slate-50 px-4 py-4",
            contentClassName,
          )}
        >
          {renderedChildren}
        </div>

        {renderedFooter ? (
          <div className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto w-full max-w-xl">{renderedFooter}</div>
          </div>
        ) : null}
      </div>
    </div>,
    portalElement,
  );
}
