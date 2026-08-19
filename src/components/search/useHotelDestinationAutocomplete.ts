"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  HotelDestinationKind,
  HotelDestinationSuggestion,
} from "@/data/hotelDestinations";

type HotelDestinationsApiResponse = {
  suggestions?: HotelDestinationSuggestion[];
};

export const hotelDestinationKindLabels: Record<HotelDestinationKind, string> = {
  city: "City",
  district: "Area",
  landmark: "Landmark",
  "airport-area": "Airport area",
};

export const hotelDestinationKindTranslationKeys: Record<HotelDestinationKind, string> = {
  city: "hotelDestinationKind.city",
  district: "hotelDestinationKind.district",
  landmark: "hotelDestinationKind.landmark",
  "airport-area": "hotelDestinationKind.airport-area",
};

const normalizeCountryHint = (value: string | null | undefined) => {
  const countryCode = value?.trim().toUpperCase() || "";
  if (countryCode === "EU") return countryCode;
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : "";
};

type UseHotelDestinationAutocompleteOptions = {
  query: string;
  selectedCountryHint?: string | null;
  detectedCountryHint?: string | null;
  locale?: string;
};

export function useHotelDestinationAutocomplete({
  query,
  selectedCountryHint,
  detectedCountryHint,
  locale,
}: UseHotelDestinationAutocompleteOptions) {
  const [suggestions, setSuggestions] = useState<HotelDestinationSuggestion[]>([]);
  const [suggestionsCountryHint, setSuggestionsCountryHint] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const normalizedSelectedCountryHint = normalizeCountryHint(selectedCountryHint);
  const normalizedDetectedCountryHint = normalizedSelectedCountryHint
    ? ""
    : normalizeCountryHint(detectedCountryHint);
  const activeCountryHint =
    normalizedSelectedCountryHint || normalizedDetectedCountryHint;
  const trimmedQuery = query.trim();
  const visibleSuggestions = useMemo(
    () =>
      suggestionsCountryHint === activeCountryHint ? suggestions : [],
    [activeCountryHint, suggestions, suggestionsCountryHint],
  );
  const shouldShow =
    open &&
    trimmedQuery.length >= 1 &&
    (loading || visibleSuggestions.length > 0 || !loading);

  useEffect(() => {
    if (!open || trimmedQuery.length < 1) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmedQuery, limit: "8" });
        if (normalizedSelectedCountryHint) {
          params.set("countryCode", normalizedSelectedCountryHint);
        }
        if (normalizedDetectedCountryHint) {
          params.set("detectedCountryCode", normalizedDetectedCountryHint);
        }
        const requestLocale = locale ||
          (typeof navigator !== "undefined" ? navigator.language : "");
        if (requestLocale) params.set("locale", requestLocale);

        const response = await fetch(`/api/hotels/destinations?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to load hotel destinations");

        const payload = (await response.json()) as HotelDestinationsApiResponse;
        const nextSuggestions = Array.isArray(payload.suggestions)
          ? payload.suggestions
              .filter((suggestion) =>
                Boolean(
                  suggestion?.id &&
                    suggestion?.name &&
                    suggestion?.country &&
                    suggestion?.searchValue,
                ),
              )
              .slice(0, 8)
          : [];
        setSuggestions(nextSuggestions);
        setSuggestionsCountryHint(activeCountryHint);
        setHighlight(0);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSuggestionsCountryHint(activeCountryHint);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    activeCountryHint,
    locale,
    normalizedDetectedCountryHint,
    normalizedSelectedCountryHint,
    open,
    trimmedQuery,
  ]);

  const select = useCallback((suggestion: HotelDestinationSuggestion) => {
    setOpen(false);
    setHighlight(0);
    return suggestion.searchValue;
  }, []);

  const handleKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLInputElement>,
      onSelect: (suggestion: HotelDestinationSuggestion) => void,
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setOpen(true);
        if (visibleSuggestions.length) {
          setHighlight((current) => (current + 1) % visibleSuggestions.length);
        }
        return;
      }
      if (event.key === "ArrowUp" && visibleSuggestions.length) {
        event.preventDefault();
        setOpen(true);
        setHighlight(
          (current) =>
            (current - 1 + visibleSuggestions.length) % visibleSuggestions.length,
        );
        return;
      }
      if (event.key === "Enter" && open) {
        const highlightedSuggestion = visibleSuggestions[highlight];
        if (!highlightedSuggestion) return;
        event.preventDefault();
        onSelect(highlightedSuggestion);
      }
    },
    [highlight, open, visibleSuggestions],
  );

  return {
    handleKeyDown,
    highlight,
    loading,
    open,
    select,
    setHighlight,
    setOpen,
    shouldShow,
    suggestions: visibleSuggestions,
  };
}
