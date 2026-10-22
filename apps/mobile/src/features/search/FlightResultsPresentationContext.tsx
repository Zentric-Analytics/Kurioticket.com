import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAppTheme } from "../../theme/AppTheme";
import { resolveFlightResultsTheme, resolveFlightResultsUi } from "./flightResultsPresentation";

const FlightResultsPresentation = createContext(false);
export function FlightResultsPresentationProvider({ children }: { children: ReactNode }) {
  return <FlightResultsPresentation.Provider value>{children}</FlightResultsPresentation.Provider>;
}
export function useFlightResultsTheme() {
  const parent = useAppTheme();
  const isFlightResults = useContext(FlightResultsPresentation);
  return useMemo(() => ({ ...parent, isFlightResults, theme: resolveFlightResultsTheme(parent.theme, isFlightResults) }), [parent, isFlightResults]);
}
export function useFlightResultsUi<T extends { blue: string; navy: string; muted: string; border: string; pale: string }>(base: T) {
  const { theme, isFlightResults } = useFlightResultsTheme();
  return useMemo(() => resolveFlightResultsUi(base, isFlightResults, theme.dark), [base, isFlightResults, theme.dark]);
}
