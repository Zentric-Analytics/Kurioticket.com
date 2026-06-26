import { formatAirportLabel, type AirportOption } from "@/data/airports";
import { getCityAwareOriginAirports, type OriginSuggestionLocation } from "@/lib/flights/originAirportSuggestions";

export type OriginValueSource = "empty" | "manual" | "url" | "saved" | "maxmind-default";

export type OriginFieldState = {
  input: string;
  code: string;
  source: OriginValueSource;
  userInteracted: boolean;
};

export type OriginDefaultCandidate = {
  airport: AirportOption | null;
  suggestions: AirportOption[];
};

export const getDefaultOriginAirport = (
  location: OriginSuggestionLocation | null | undefined,
  limit = 8,
): OriginDefaultCandidate => {
  const suggestions = getCityAwareOriginAirports(location, limit);

  return {
    airport: suggestions[0] ?? null,
    suggestions,
  };
};

export const canApplyDefaultOrigin = (state: OriginFieldState) =>
  !state.userInteracted &&
  state.source === "empty" &&
  state.input.trim().length === 0 &&
  state.code.trim().length === 0;

export const applyDefaultOrigin = (
  state: OriginFieldState,
  airport: AirportOption | null | undefined,
  locale?: string | null,
): OriginFieldState => {
  if (!airport || !canApplyDefaultOrigin(state)) return state;

  return {
    input: formatAirportLabel(airport, locale),
    code: airport.code,
    source: "maxmind-default",
    userInteracted: false,
  };
};

export const markOriginManualInput = (
  state: OriginFieldState,
  input: string,
  code = "",
): OriginFieldState => ({
  input,
  code,
  source: "manual",
  userInteracted: true,
});

export const markOriginFromUrl = (origin: string): OriginFieldState => ({
  input: origin,
  code: origin,
  source: origin.trim() ? "url" : "empty",
  userInteracted: false,
});
