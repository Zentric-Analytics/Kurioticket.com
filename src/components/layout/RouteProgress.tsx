"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  usePathname,
  useSearchParams,
} from "next/navigation";

type RouteProgressContextValue = {
  start: () => void;
};

const RouteProgressContext =
  createContext<RouteProgressContextValue>({
    start: () => {},
  });

export function RouteProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [pendingRouteKey, setPendingRouteKey] =
    useState<string | null>(null);

  const active =
    pendingRouteKey === routeKey;

  useEffect(() => {
    if (!pendingRouteKey || pendingRouteKey === routeKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPendingRouteKey(null);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [pendingRouteKey, routeKey]);

  const value = useMemo(
    () => ({
      start: () =>
        setPendingRouteKey(routeKey),
    }),
    [routeKey]
  );

  return (
    <RouteProgressContext.Provider value={value}>
      {active ? (
        <>
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden bg-[#004BB8]/10"
            aria-hidden="true"
          >
            <div className="h-full w-full origin-left bg-gradient-to-r from-[#004BB8] via-[#004BB8] to-[#5CB6B2] animate-pulse motion-reduce:animate-none" />
          </div>
          <span
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            Loading the next page.
          </span>
        </>
      ) : null}

      {children}
    </RouteProgressContext.Provider>
  );
}

export function useRouteProgress() {
  return useContext(RouteProgressContext);
}
