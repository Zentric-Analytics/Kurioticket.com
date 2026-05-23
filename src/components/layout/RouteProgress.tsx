"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type RouteProgressContextValue = { start: () => void };
const RouteProgressContext = createContext<RouteProgressContextValue>({ start: () => {} });

export function RouteProgressProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(false);
  }, [pathname]);

  const value = useMemo(() => ({ start: () => setActive(true) }), []);

  return (
    <RouteProgressContext.Provider value={value}>
      <div className={`pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 bg-indigo-500/75 transition-opacity duration-150 ${active ? "opacity-100" : "opacity-0"}`} />
      {children}
    </RouteProgressContext.Provider>
  );
}

export function useRouteProgress() {
  return useContext(RouteProgressContext);
}
