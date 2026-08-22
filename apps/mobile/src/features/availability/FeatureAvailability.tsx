import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { FeatureAvailability } from "../../api/travelApi";
import { travelApi } from "../../api/travelApi";
import { getCachedFeatureAvailability, loadFeatureAvailability, safeFeatureAvailability } from "./featureAvailabilityModel";

type AvailabilityContext = { availability: FeatureAvailability; loading: boolean; refresh: () => Promise<void> };
const Context = createContext<AvailabilityContext>({ availability: safeFeatureAvailability, loading: true, refresh: async () => undefined });

export function FeatureAvailabilityProvider({ children }: { children: ReactNode }) {
  const [availability, setAvailability] = useState(getCachedFeatureAvailability() ?? safeFeatureAvailability);
  const [loading, setLoading] = useState(!getCachedFeatureAvailability());
  const refresh = useCallback(async () => { setLoading(true); const loaded = await loadFeatureAvailability(travelApi.featureAvailability); setAvailability(loaded.availability); setLoading(false); }, []);
  useEffect(() => { void refresh(); const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); }); return () => subscription.remove(); }, [refresh]);
  return <Context.Provider value={{ availability, loading, refresh }}>{children}</Context.Provider>;
}
export const useFeatureAvailability = () => useContext(Context);

export { isMobileProductAvailable } from "./featureAvailabilityModel";
