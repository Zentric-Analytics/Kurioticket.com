import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { FeatureAvailability } from "../../api/travelApi";
import { travelApi } from "../../api/travelApi";
import { beginAvailabilityRefresh, finishAvailabilityRefresh, initialAvailabilityLifecycleState, loadFeatureAvailability, safeFeatureAvailability, type AvailabilityLifecycleState } from "./featureAvailabilityModel";

type AvailabilityContext = {
  availability: FeatureAvailability;
  initializing: boolean;
  refreshing: boolean;
  /** Backward-compatible alias. Background refreshes are deliberately not loading. */
  loading: boolean;
  refresh: () => Promise<void>;
};
const Context = createContext<AvailabilityContext>({ availability: safeFeatureAvailability, initializing: true, refreshing: false, loading: true, refresh: async () => undefined });

export function FeatureAvailabilityProvider({ children }: { children: ReactNode }) {
  const [lifecycle, setLifecycle] = useState<AvailabilityLifecycleState>(initialAvailabilityLifecycleState);
  const lifecycleRef = useRef(lifecycle);
  const inFlight = useRef<Promise<void> | null>(null);
  const mounted = useRef(true);
  const previousAppState = useRef(AppState.currentState);
  lifecycleRef.current = lifecycle;

  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const background = !lifecycleRef.current.initializing;
    setLifecycle((current) => beginAvailabilityRefresh(current));
    const request = loadFeatureAvailability(travelApi.featureAvailability, Date.now(), background)
      .then((loaded) => {
        if (mounted.current) setLifecycle((current) => finishAvailabilityRefresh(current, loaded.availability));
      })
      .finally(() => {
        if (inFlight.current === request) inFlight.current = null;
      });
    inFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      const previous = previousAppState.current;
      previousAppState.current = state;
      if (state === "active" && previous !== "active") void refresh();
    });
    return () => { mounted.current = false; subscription.remove(); };
  }, [refresh]);

  return <Context.Provider value={{
    availability: lifecycle.availability,
    initializing: lifecycle.initializing,
    refreshing: lifecycle.refreshing,
    loading: lifecycle.initializing,
    refresh,
  }}>{children}</Context.Provider>;
}
export const useFeatureAvailability = () => useContext(Context);

export { isMobileProductAvailable } from "./featureAvailabilityModel";
