"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { usePathname } from "next/navigation";

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

  const [active, setActive] =
    useState(false);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  const value = useMemo(
    () => ({
      start: () => setActive(true),
    }),
    []
  );

  return (
    <RouteProgressContext.Provider value={value}>
      {active ? (
        <div className="fixed inset-x-0 top-0 z-[70] h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 animate-pulse" />
      ) : null}

      {children}
    </RouteProgressContext.Provider>
  );
}

export function useRouteProgress() {
  return useContext(RouteProgressContext);
}