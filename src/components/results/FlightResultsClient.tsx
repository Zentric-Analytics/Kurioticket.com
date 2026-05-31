"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  Minus,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { FlightCard } from "@/components/results/FlightCard";
import { Button } from "@/components/ui/Button";
import { FlightCardSkeleton } from "@/components/ui/Skeleton";
import { useRegion } from "@/components/region/RegionProvider";
import { airports, type AirportOption } from "@/data/airports";
import { getHomeDiscoveryByRegion } from "@/data/homeDiscovery";
import { buildDiscoveryLink } from "@/lib/home/buildDiscoveryLinks";
import type { PublicFlightResult, SortMode } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const loadingMessages = [
  "Searching airlines...",
  "Comparing prices...",
  "Checking best-value routes...",
  "Finding cheaper options...",
  "Analyzing layover quality...",
  "Comparing baggage-inclusive fares...",
];

type CabinClassValue = "economy" | "premium-economy" | "business" | "first";

const cabinClassOptions: Array<{ label: string; value: CabinClassValue }> = [
  { label: "Economy", value: "economy" },
  { label: "Premium Economy", value: "premium-economy" },
  { label: "Business", value: "business" },
  { label: "First", value: "first" },
];

type PlacesApiResponse = {
  suggestions?: AirportOption[];
};

export function FlightResultsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { selectedOption } = useRegion();
  const selectedCurrency = selectedOption.currency;
  const discoveryCards = useMemo(
    () => getHomeDiscoveryByRegion(selectedOption.code).slice(0, 8),
    [selectedOption.code]
  );

  const [sort] = useState<SortMode>(
    (params.get("sort") as SortMode) || "cheapest"
  );
  const [results, setResults] = useState<PublicFlightResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [maxStops, setMaxStops] = useState(3);
  const [tripTypeInput, setTripTypeInput] = useState(
    params.get("tripType") || "round-trip"
  );
  const [originInput, setOriginInput] = useState(params.get("origin") || "");
  const [destinationInput, setDestinationInput] = useState(
    params.get("destination") || ""
  );
  const [originCode, setOriginCode] = useState(params.get("origin") || "");
  const [destinationCode, setDestinationCode] = useState(
    params.get("destination") || ""
  );
  const [departureDateInput, setDepartureDateInput] = useState(
    params.get("departureDate") || ""
  );
  const [returnDateInput, setReturnDateInput] = useState(
    params.get("returnDate") || ""
  );
  const [adultCount, setAdultCount] = useState(() => {
    const adultsParam = params.get("adults");
    const travelersParam = params.get("travelers");
    const value = Number(adultsParam ?? travelersParam ?? 1);

    return Number.isFinite(value) ? Math.max(1, value) : 1;
  });
  const [childCount, setChildCount] = useState(() => {
    const value = Number(params.get("children") || 0);

    return Number.isFinite(value) ? Math.max(0, value) : 0;
  });
  const [infantCount, setInfantCount] = useState(() => {
    const value = Number(params.get("infants") || 0);

    return Number.isFinite(value) ? Math.max(0, value) : 0;
  });
  const [cabinClassInput, setCabinClassInput] = useState<CabinClassValue>(
    (params.get("cabinClass") as CabinClassValue) || "economy"
  );
  const [activeSuggest, setActiveSuggest] = useState<
    "origin" | "destination" | null
  >(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [activeDatePicker, setActiveDatePicker] = useState<
    "departure" | "return" | null
  >(null);
  const [datePickerPosition, setDatePickerPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date())
  );
  const [travelerPopoverOpen, setTravelerPopoverOpen] = useState(false);
  const [travelerPopoverPosition, setTravelerPopoverPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [countryHint, setCountryHint] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<AirportOption[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<AirportOption[]>([]);

  const originWrapRef = useRef<HTMLDivElement | null>(null);
  const destinationWrapRef = useRef<HTMLDivElement | null>(null);
  const departureWrapRef = useRef<HTMLDivElement | null>(null);
  const returnWrapRef = useRef<HTMLDivElement | null>(null);
  const travelerCabinWrapRef = useRef<HTMLDivElement | null>(null);

  const originFallbackSuggestions = useMemo(
    () => filterAirportOptions(originInput),
    [originInput]
  );
  const destinationFallbackSuggestions = useMemo(
    () => filterAirportOptions(destinationInput),
    [destinationInput]
  );
  const resolvedOriginSuggestions =
    originSuggestions.length > 0 ? originSuggestions : originFallbackSuggestions;
  const resolvedDestinationSuggestions =
    destinationSuggestions.length > 0
      ? destinationSuggestions
      : destinationFallbackSuggestions;

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const language = navigator.language || "";
    const parts = language.split("-");
    if (parts.length > 1 && /^[A-Za-z]{2}$/.test(parts[1])) {
      setCountryHint(parts[1].toUpperCase());
    }
  }, []);

  useEffect(() => {
    const query = originInput.trim();
    if (query.length < 2) {
      setOriginSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(buildPlacesUrl(query, "origin", countryHint), {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Failed to load origin suggestions");
        const payload = (await response.json()) as PlacesApiResponse;
        const suggestions = Array.isArray(payload.suggestions)
          ? dedupeSuggestions(payload.suggestions)
              .filter((item) => !!item?.code && !!item?.city && !!item?.airport)
              .slice(0, 7)
          : [];
        setOriginSuggestions(suggestions);
      } catch {
        if (!controller.signal.aborted) setOriginSuggestions([]);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [originInput, countryHint]);

  useEffect(() => {
    const query = destinationInput.trim();
    if (query.length < 2) {
      setDestinationSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          buildPlacesUrl(query, "destination", countryHint),
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );
        if (!response.ok) throw new Error("Failed to load destination suggestions");
        const payload = (await response.json()) as PlacesApiResponse;
        const suggestions = Array.isArray(payload.suggestions)
          ? dedupeSuggestions(payload.suggestions)
              .filter((item) => !!item?.code && !!item?.city && !!item?.airport)
              .slice(0, 7)
          : [];
        setDestinationSuggestions(suggestions);
      } catch {
        if (!controller.signal.aborted) setDestinationSuggestions([]);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [destinationInput, countryHint]);

  const isFormDirty =
    Boolean(originInput.trim()) ||
    Boolean(destinationInput.trim()) ||
    Boolean(departureDateInput) ||
    Boolean(returnDateInput) ||
    tripTypeInput !== "round-trip" ||
    adultCount !== 1 ||
    childCount !== 0 ||
    infantCount !== 0 ||
    cabinClassInput !== "economy";

  const body = useMemo(() => {
    const origin = params.get("origin")?.trim() || "";
    const destination = params.get("destination")?.trim() || "";
    const departureDate = params.get("departureDate")?.trim() || "";
    const tripType = params.get("tripType") || "round-trip";
    const returnDate = params.get("returnDate")?.trim() || "";
    const hasSearch = Boolean(
      origin &&
        destination &&
        departureDate &&
        (tripType !== "round-trip" || returnDate)
    );

    if (!hasSearch) return null;

    const adultsParam = Number(params.get("adults"));
    const childrenParam = Number(params.get("children"));
    const infantsParam = Number(params.get("infants"));
    const legacyTravelers = Number(params.get("travelers") || 1);
    const adults = Number.isFinite(adultsParam)
      ? Math.max(1, adultsParam)
      : Math.max(1, legacyTravelers);
    const children = Number.isFinite(childrenParam)
      ? Math.max(0, childrenParam)
      : 0;
    const infants = Number.isFinite(infantsParam)
      ? Math.max(0, infantsParam)
      : 0;
    const travelers = adults + children + infants;

    return {
      tripType,
      origin,
      destination,
      departureDate,
      returnDate,
      adults,
      children,
      infants,
      travelers,
      cabinClass: params.get("cabinClass") || "economy",
      sort,
      currency: selectedCurrency,
    };
  }, [params, sort, selectedCurrency]);

  useEffect(() => {
    if (!body) return;

    let active = true;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");

      fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Unable to search flights.");
          }

          return data as { results: PublicFlightResult[]; warnings?: string[] };
        })
        .then((data) => {
          if (!active) return;

          setResults(data.results);
          setMaxPrice(
            Math.max(
              500,
              Math.ceil(
                Math.max(...data.results.map((flight) => flight.price), 500) /
                  100
              ) * 100
            )
          );
        })
        .catch((searchError) => {
          if (!active) return;

          setError(
            searchError instanceof Error
              ? searchError.message
              : "Unable to search flights."
          );
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [body]);

  useEffect(() => {
    if (!loading) return;

    const id = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessages.length);
    }, 1100);

    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    function updateDropdownPosition(target: "origin" | "destination") {
      const viewportPadding = 16;
      const preferredWidth = 520;
      const wrap =
        target === "origin" ? originWrapRef.current : destinationWrapRef.current;
      const input = wrap?.querySelector("input");

      if (!input) return;

      const rect = input.getBoundingClientRect();
      const width = Math.min(
        preferredWidth,
        window.innerWidth - viewportPadding * 2
      );
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - width - viewportPadding)
      );
      const top = rect.bottom + 8;

      setDropdownPosition({ top, left, width });
    }

    if (activeSuggest) updateDropdownPosition(activeSuggest);

    function handleViewportChange() {
      if (!activeSuggest) return;

      updateDropdownPosition(activeSuggest);
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const dropdown = document.getElementById("flight-airport-suggestions");
      const clickedDropdown = dropdown?.contains(target);

      if (
        !clickedDropdown &&
        activeSuggest === "origin" &&
        originWrapRef.current &&
        !originWrapRef.current.contains(target)
      ) {
        setActiveSuggest(null);
        setDropdownPosition(null);
      }

      if (
        !clickedDropdown &&
        activeSuggest === "destination" &&
        destinationWrapRef.current &&
        !destinationWrapRef.current.contains(target)
      ) {
        setActiveSuggest(null);
        setDropdownPosition(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeSuggest]);

  useEffect(() => {
    function updateDatePickerPosition(target: "departure" | "return") {
      const viewportPadding = 16;
      const preferredWidth = 720;
      const wrap =
        target === "departure"
          ? departureWrapRef.current
          : returnWrapRef.current ?? departureWrapRef.current;
      const trigger = wrap?.querySelector("button");

      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(
        preferredWidth,
        window.innerWidth - viewportPadding * 2
      );
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - width - viewportPadding)
      );
      const top = rect.bottom + 8;

      setDatePickerPosition({ top, left, width });
    }

    if (activeDatePicker) updateDatePickerPosition(activeDatePicker);

    function handleViewportChange() {
      if (!activeDatePicker) return;

      updateDatePickerPosition(activeDatePicker);
    }

    function handleClose(event: MouseEvent) {
      const target = event.target as Node;
      const popover = document.getElementById("flight-date-picker-popover");
      const clickedPopover = popover?.contains(target);
      const clickedDeparture = departureWrapRef.current?.contains(target);
      const clickedReturn = returnWrapRef.current?.contains(target);

      if (!clickedPopover && !clickedDeparture && !clickedReturn) {
        setActiveDatePicker(null);
        setDatePickerPosition(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveDatePicker(null);
        setDatePickerPosition(null);
      }
    }

    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeDatePicker]);

  useEffect(() => {
    function updateTravelerPopoverPosition() {
      const viewportPadding = 16;
      const preferredWidth = 520;
      const trigger = travelerCabinWrapRef.current?.querySelector("button");

      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(
        preferredWidth,
        window.innerWidth - viewportPadding * 2
      );
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - width - viewportPadding)
      );
      const top = rect.bottom + 8;

      setTravelerPopoverPosition({ top, left, width });
    }

    if (travelerPopoverOpen) updateTravelerPopoverPosition();

    function handleViewportChange() {
      if (!travelerPopoverOpen) return;

      updateTravelerPopoverPosition();
    }

    function handleClose(event: MouseEvent) {
      const target = event.target as Node;
      const popover = document.getElementById("flight-traveler-cabin-popover");
      const clickedPopover = popover?.contains(target);
      const clickedTrigger = travelerCabinWrapRef.current?.contains(target);

      if (!clickedPopover && !clickedTrigger) {
        setTravelerPopoverOpen(false);
        setTravelerPopoverPosition(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setTravelerPopoverOpen(false);
        setTravelerPopoverPosition(null);
      }
    }

    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [travelerPopoverOpen]);

  function handleCompactSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextOrigin = originCode || originInput.trim();
    const nextDestination = destinationCode || destinationInput.trim();
    const nextDepartureDate = departureDateInput.trim();
    const nextReturnDate = returnDateInput.trim();

    if (
      !nextOrigin ||
      !nextDestination ||
      !nextDepartureDate ||
      (tripTypeInput === "round-trip" && !nextReturnDate)
    ) {
      return;
    }

    const adults = Math.min(9, Math.max(1, adultCount));
    const children = Math.min(9 - adults, Math.max(0, childCount));
    const infants = Math.min(
      adults,
      9 - adults - children,
      Math.max(0, infantCount)
    );
    const travelers = adults + children + infants;

    if (
      adults !== adultCount ||
      children !== childCount ||
      infants !== infantCount
    ) {
      setAdultCount(adults);
      setChildCount(children);
      setInfantCount(infants);
    }

    const nextParams = new URLSearchParams({
      tripType: tripTypeInput,
      origin: nextOrigin,
      destination: nextDestination,
      departureDate: nextDepartureDate,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      travelers: String(travelers),
      cabinClass: cabinClassInput,
    });

    if (tripTypeInput === "round-trip" && nextReturnDate) {
      nextParams.set("returnDate", nextReturnDate);
    }

    router.push(`/flights/results?${nextParams.toString()}`);
  }

  const filtered = results.filter(
    (flight) => flight.price <= maxPrice && flight.stops <= maxStops
  );

  if (!body) {
    return (
      <main className="flex-1 bg-[radial-gradient(circle_at_top,_#eef4ff_0%,_#f8fafd_42%,_#f2f6fc_100%)] pb-8 pt-6 sm:pt-8 lg:pt-8">
        <section className="page-shell">
            <form
              className="mx-auto mt-0 w-full max-w-5xl space-y-1.5"
              onSubmit={(event) => {
                event.preventDefault();

                    if (
                      !departureDateInput ||
                      (tripTypeInput === "round-trip" && !returnDateInput)
                    ) {
                      return;
                    }

                    const formData = new FormData(event.currentTarget);
                    const nextParams = new URLSearchParams({
                      tripType: tripTypeInput,
                      origin:
                        originCode ||
                        originInput.trim() ||
                        String(formData.get("origin") || ""),
                      destination:
                        destinationCode ||
                        destinationInput.trim() ||
                        String(formData.get("destination") || ""),
                      departureDate:
                        departureDateInput ||
                        String(formData.get("departureDate") || ""),
                      returnDate:
                        returnDateInput ||
                        String(formData.get("returnDate") || ""),
                      adults: String(adultCount),
                      children: String(childCount),
                      infants: String(infantCount),
                      travelers: String(adultCount + childCount + infantCount),
                      cabinClass: cabinClassInput,
                    });

                    router.push(`/flights/results?${nextParams.toString()}`);
              }}
            >
                  <input
                    type="hidden"
                    name="departureDate"
                    value={departureDateInput}
                  />
                  <input
                    type="hidden"
                    name="returnDate"
                    value={returnDateInput}
                  />
                  <input type="hidden" name="adults" value={String(adultCount)} />
                  <input
                    type="hidden"
                    name="children"
                    value={String(childCount)}
                  />
                  <input
                    type="hidden"
                    name="infants"
                    value={String(infantCount)}
                  />
                  <input
                    type="hidden"
                    name="travelers"
                    value={String(adultCount + childCount + infantCount)}
                  />
                  <input
                    type="hidden"
                    name="cabinClass"
                    value={cabinClassInput}
                  />

                  <div className="text-center">
                    <h1 className="mx-auto text-balance text-[clamp(1.8rem,7vw,3rem)] font-semibold tracking-tight text-slate-900 sm:whitespace-nowrap">
                      Find millions of cheap flights
                    </h1>
                    <p className="mx-auto mt-3 max-w-2xl text-balance text-center text-base leading-7 text-slate-700 whitespace-normal sm:text-lg sm:whitespace-nowrap">
                      Compare fares and lock in the best route in a few taps.
                    </p>
                  </div>

                  {isFormDirty ? (
                    <div className="mt-1 flex justify-end">
                      <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setOriginInput("");
                        setOriginCode("");
                        setDestinationInput("");
                        setDestinationCode("");
                        setDepartureDateInput("");
                        setReturnDateInput("");
                        setAdultCount(1);
                        setChildCount(0);
                        setInfantCount(0);
                        setCabinClassInput("economy");
                        setTripTypeInput("round-trip");
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                        setActiveDatePicker(null);
                        setDatePickerPosition(null);
                        setTravelerPopoverOpen(false);
                        setTravelerPopoverPosition(null);
                      }}
                      className="focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                        <X size={12} />
                        Clear all
                      </button>
                    </div>
                  ) : null}

                  <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] lg:gap-0">
                    <div className="grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-stretch rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                    <div className="relative min-h-[54px] px-0 py-0 pr-2" ref={originWrapRef}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600" htmlFor="origin">
                        Origin
                      </label>
                      <input
                        id="origin"
                        name="origin"
                        required
                        value={originInput}
                        onFocus={() => {
                          if (originInput.trim().length >= 2) setActiveSuggest("origin");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setActiveSuggest(null);
                            setDropdownPosition(null);
                          }
                        }}
                        onChange={(event) => {
                          setOriginInput(event.target.value);
                          setOriginCode("");
                          if (event.target.value.trim().length >= 2) {
                            setActiveSuggest("origin");
                          } else {
                            setActiveSuggest(null);
                            setDropdownPosition(null);
                          }
                        }}
                        placeholder="From?"
                        autoComplete="off"
                        className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 pr-8 text-[16px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 md:text-sm"
                      />
                      {originInput ? (
                        <button
                          type="button"
                          aria-label="Clear origin"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setOriginInput("");
                            setOriginCode("");
                            setActiveSuggest(null);
                            setDropdownPosition(null);
                          }}
                          className="focus-ring absolute right-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X size={14} />
                        </button>
                      ) : null}

                      {activeSuggest === "origin" && dropdownPosition ? (
                        <SuggestionList
                          id="flight-airport-suggestions"
                          position={dropdownPosition}
                          suggestions={resolvedOriginSuggestions}
                          onSelect={(value) => {
                            setOriginInput(value);
                            setOriginCode(value);
                            setActiveSuggest(null);
                            setDropdownPosition(null);
                          }}
                        />
                      ) : null}
                    </div>

                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        aria-label="Swap origin and destination"
                        onClick={() => {
                          const currentOrigin = originInput;
                          const currentOriginCode = originCode;

                          setOriginInput(destinationInput);
                          setOriginCode(destinationCode);
                          setDestinationInput(currentOrigin);
                          setDestinationCode(currentOriginCode);
                        }}
                        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                    </div>

                    <div className="relative min-h-[54px] px-0 py-0 pl-2" ref={destinationWrapRef}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600" htmlFor="destination">
                        Destination
                      </label>
                      <input
                        id="destination"
                        name="destination"
                        required
                        value={destinationInput}
                        onFocus={() => {
                          if (destinationInput.trim().length >= 2) {
                            setActiveSuggest("destination");
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setActiveSuggest(null);
                            setDropdownPosition(null);
                          }
                        }}
                        onChange={(event) => {
                          setDestinationInput(event.target.value);
                          setDestinationCode("");
                          if (event.target.value.trim().length >= 2) {
                            setActiveSuggest("destination");
                          } else {
                            setActiveSuggest(null);
                            setDropdownPosition(null);
                          }
                        }}
                        placeholder="To?"
                        autoComplete="off"
                        className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 pr-8 text-[16px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 md:text-sm"
                      />
                      {destinationInput ? (
                        <button
                          type="button"
                          aria-label="Clear destination"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDestinationInput("");
                            setDestinationCode("");
                            setActiveSuggest(null);
                            setDropdownPosition(null);
                          }}
                          className="focus-ring absolute right-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X size={14} />
                        </button>
                      ) : null}

                      {activeSuggest === "destination" && dropdownPosition ? (
                        <SuggestionList
                          id="flight-airport-suggestions"
                          position={dropdownPosition}
                          suggestions={resolvedDestinationSuggestions}
                          onSelect={(value) => {
                            setDestinationInput(value);
                            setDestinationCode(value);
                            setActiveSuggest(null);
                            setDropdownPosition(null);
                          }}
                        />
                      ) : null}
                    </div>
                    </div>

                    <div className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0" ref={departureWrapRef}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                        Travel dates
                      </label>
                      <button
                        type="button"
                        aria-label="Travel dates"
                        onClick={() => setActiveDatePicker("departure")}
                        className="focus-ring flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 pr-8 text-left text-[16px] text-slate-900 outline-none transition-colors md:text-sm"
                      >
                        <Calendar size={16} className="shrink-0 text-slate-500" />
                        <span className="truncate">
                          {departureDateInput
                            ? tripTypeInput === "round-trip" && returnDateInput
                              ? `${formatDateLabel(departureDateInput)} — ${formatDateLabel(returnDateInput)}`
                              : formatDateLabel(departureDateInput)
                            : "Travel dates"}
                        </span>
                      </button>
                      {departureDateInput || returnDateInput ? (
                        <button
                          type="button"
                          aria-label="Clear travel dates"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setDepartureDateInput("");
                            setReturnDateInput("");
                            setActiveDatePicker(null);
                            setDatePickerPosition(null);
                          }}
                          className="focus-ring absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </div>

                    <div className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0" ref={travelerCabinWrapRef}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">Travelers</label>
                      <button
                        type="button"
                        aria-label="Travelers and cabin class"
                        onClick={() => {
                          setTravelerPopoverOpen((current) => {
                            const next = !current;

                            if (!next) setTravelerPopoverPosition(null);

                            return next;
                          });
                        }}
                        className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] text-slate-900 outline-none transition-colors md:text-sm"
                      >
                        <span className="block text-sm font-medium text-slate-900">{buildTravelerCabinSummary(
                          adultCount,
                          childCount,
                          infantCount,
                          cabinClassInput
                        )}</span>
                        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", travelerPopoverOpen && "rotate-180")} />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center lg:hidden">
                      <div className="relative inline-flex items-center">
                        <select
                          id="tripTypeMobile"
                          name="tripTypeMobile"
                          value={tripTypeInput}
                          onChange={(event) => {
                            const nextTripType = event.target.value;
                            setTripTypeInput(nextTripType);
                            if (nextTripType !== "round-trip") {
                              setReturnDateInput("");
                              if (activeDatePicker === "return") {
                                setActiveDatePicker(null);
                                setDatePickerPosition(null);
                              }
                            }
                          }}
                          className="min-h-10 appearance-none border-0 bg-transparent py-1 pl-0 pr-6 text-base font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-0"
                        >
                          <option value="round-trip">Round-trip</option>
                          <option value="one-way">One-way</option>
                        </select>
                        <ChevronDown
                          size={14}
                          className="pointer-events-none absolute right-0 text-slate-500"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-950 to-violet-800 px-4 text-sm font-bold text-white shadow-md shadow-indigo-900/30 sm:mt-3 lg:mt-0 lg:h-auto lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-900/30"
                    >
                      Search
                    </Button>
                  </div>
                </div>
                <div className="mt-1 hidden items-center lg:flex lg:pl-1">
                  <div className="relative inline-flex items-center">
                    <select
                      id="tripType"
                      name="tripType"
                      value={tripTypeInput}
                      onChange={(event) => {
                        const nextTripType = event.target.value;
                        setTripTypeInput(nextTripType);
                        if (nextTripType !== "round-trip") {
                          setReturnDateInput("");
                          if (activeDatePicker === "return") {
                            setActiveDatePicker(null);
                            setDatePickerPosition(null);
                          }
                        }
                      }}
                      className="min-h-10 appearance-none border-0 bg-transparent py-1 pl-0 pr-6 text-base font-medium text-slate-700 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-0"
                    >
                      <option value="round-trip">Round-trip</option>
                      <option value="one-way">One-way</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-0 text-slate-500"
                    />
                  </div>
                </div>
            </form>

                {activeDatePicker && datePickerPosition ? (
                  <DatePickerPopover
                    position={datePickerPosition}
                    month={calendarMonth}
                    departureValue={departureDateInput}
                    returnValue={returnDateInput}
                    activePicker={activeDatePicker}
                    onMonthChange={setCalendarMonth}
                    onSelect={(date) => {
                      if (isBeforeToday(date)) return;

                      const value = formatDateValue(date);

                      if (activeDatePicker === "departure") {
                        setDepartureDateInput(value);

                        if (tripTypeInput === "round-trip") {
                          setActiveDatePicker("return");
                        } else {
                          setActiveDatePicker(null);
                          setDatePickerPosition(null);
                        }

                        return;
                      }

                      setReturnDateInput(value);
                      setActiveDatePicker(null);
                      setDatePickerPosition(null);
                    }}
                    onClear={() => {
                      if (activeDatePicker === "departure") {
                        setDepartureDateInput("");
                      }

                      if (activeDatePicker === "return") {
                        setReturnDateInput("");
                      }
                    }}
                    onToday={() => {
                      const today = new Date();
                      const value = formatDateValue(today);

                      if (activeDatePicker === "departure") {
                        setDepartureDateInput(value);

                        if (tripTypeInput === "round-trip") {
                          setActiveDatePicker("return");
                          return;
                        }
                      } else {
                        setReturnDateInput(value);
                      }

                      setActiveDatePicker(null);
                      setDatePickerPosition(null);
                    }}
                  />
                ) : null}

                {travelerPopoverOpen && travelerPopoverPosition ? (
                  <TravelerCabinPopover
                    position={travelerPopoverPosition}
                    adultCount={adultCount}
                    childCount={childCount}
                    infantCount={infantCount}
                    cabinClass={cabinClassInput}
                    onAdultChange={(nextValue) => {
                      const nextAdultCount = Math.min(
                        9,
                        Math.max(1, nextValue)
                      );

                      setAdultCount(nextAdultCount);
                      setInfantCount((current) =>
                        Math.min(current, nextAdultCount)
                      );
                    }}
                    onChildChange={(nextValue) => {
                      setChildCount(Math.min(9, Math.max(0, nextValue)));
                    }}
                    onInfantChange={(nextValue) => {
                      setInfantCount(
                        Math.min(adultCount, Math.max(0, nextValue))
                      );
                    }}
                    onCabinClassChange={setCabinClassInput}
                  />
                ) : null}
          <div className="mt-8">
            <section className="rounded-[2rem] border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                    Curioticket picks
                  </p>
                  <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                    Discover destinations
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 sm:text-base">
                    Explore curated flight ideas based on your region.
                  </p>
                </div>
                <p className="max-w-sm text-sm leading-6 text-slate-500">
                  These routes are planning prompts from Curioticket discovery,
                  with searches opened using flexible future dates.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {discoveryCards.map((item) => (
                  <Link
                    key={item.id}
                    href={buildDiscoveryLink(item)}
                    aria-label={`Search ${item.originCode} to ${item.destinationCode}`}
                    className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    <article className="flex h-full flex-col">
                      <div className="relative h-44 overflow-hidden bg-slate-200">
                        <Image
                          src={item.image}
                          alt={item.imageAlt}
                          fill
                          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-transparent" />
                        <div className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-xs font-black tracking-[0.16em] text-slate-950 shadow-sm">
                          {item.originCode} → {item.destinationCode}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col p-4 text-white">
                        <h3 className="text-lg font-black leading-tight">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-300">
                          {item.originCity} to {item.destinationCity}
                        </p>
                        <p className="mt-3 flex-1 text-sm leading-6 text-slate-300">
                          {item.routeNote}
                        </p>
                        <span className="mt-4 inline-flex items-center justify-between rounded-full bg-white px-4 py-2 text-sm font-black text-slate-950 transition group-hover:bg-indigo-50">
                          Search this route
                          <ArrowRightLeft size={15} className="text-indigo-600" />
                        </span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#f6f8fb] pb-8 pt-6 sm:pt-8 lg:pt-8">
      <div className="page-shell grid gap-6 py-6 lg:grid-cols-[300px_1fr]">
        <section className="lg:col-span-2">
          <form
            onSubmit={handleCompactSearchSubmit}
            className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_28px_rgba(15,23,42,0.08)] sm:p-2.5"
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
              <div className="grid grid-cols-2 gap-0.5 rounded-xl bg-slate-100 p-0.5 lg:w-[172px] lg:shrink-0">
                {[
                  { label: "Round-trip", value: "round-trip" },
                  { label: "One-way", value: "one-way" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={tripTypeInput === option.value}
                    onClick={() => {
                      setTripTypeInput(option.value);

                      if (option.value !== "round-trip") {
                        setReturnDateInput("");

                        if (activeDatePicker === "return") {
                          setActiveDatePicker(null);
                          setDatePickerPosition(null);
                        }
                      }
                    }}
                    className={cn(
                      "focus-ring h-8 rounded-lg px-2 text-[11px] font-black transition",
                      tripTypeInput === option.value
                        ? "bg-white text-indigo-950 shadow-sm"
                        : "text-slate-600 hover:text-slate-950"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.88fr)_minmax(0,0.88fr)_minmax(0,1fr)] lg:gap-1">
                <div
                  ref={originWrapRef}
                  className="relative rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 transition focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/15"
                >
                  <label
                    className="block text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-500"
                    htmlFor="results-origin"
                  >
                    From
                  </label>
                  <input
                    id="results-origin"
                    name="origin"
                    required
                    value={originInput}
                    onFocus={() => {
                      if (originInput.trim().length >= 2) setActiveSuggest("origin");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }
                    }}
                    onChange={(event) => {
                      setOriginInput(event.target.value);
                      setOriginCode("");

                      if (event.target.value.trim().length >= 2) {
                        setActiveSuggest("origin");
                      } else {
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }
                    }}
                    placeholder="City or airport"
                    autoComplete="off"
                    className="mt-0.5 h-6 w-full border-0 bg-transparent p-0 text-[16px] font-bold text-slate-950 outline-none placeholder:text-slate-400 md:text-[13px]"
                  />

                  {activeSuggest === "origin" && dropdownPosition ? (
                    <SuggestionList
                      id="flight-airport-suggestions"
                      position={dropdownPosition}
                      suggestions={resolvedOriginSuggestions}
                      onSelect={(value) => {
                        setOriginInput(value);
                        setOriginCode(value);
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }}
                    />
                  ) : null}
                </div>

                <div
                  ref={destinationWrapRef}
                  className="relative rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 transition focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/15"
                >
                  <label
                    className="block text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-500"
                    htmlFor="results-destination"
                  >
                    To
                  </label>
                  <input
                    id="results-destination"
                    name="destination"
                    required
                    value={destinationInput}
                    onFocus={() => {
                      if (destinationInput.trim().length >= 2) {
                        setActiveSuggest("destination");
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }
                    }}
                    onChange={(event) => {
                      setDestinationInput(event.target.value);
                      setDestinationCode("");

                      if (event.target.value.trim().length >= 2) {
                        setActiveSuggest("destination");
                      } else {
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }
                    }}
                    placeholder="City or airport"
                    autoComplete="off"
                    className="mt-0.5 h-6 w-full border-0 bg-transparent p-0 text-[16px] font-bold text-slate-950 outline-none placeholder:text-slate-400 md:text-[13px]"
                  />

                  {activeSuggest === "destination" && dropdownPosition ? (
                    <SuggestionList
                      id="flight-airport-suggestions"
                      position={dropdownPosition}
                      suggestions={resolvedDestinationSuggestions}
                      onSelect={(value) => {
                        setDestinationInput(value);
                        setDestinationCode(value);
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }}
                    />
                  ) : null}
                </div>

                <div ref={departureWrapRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDatePicker("departure");
                      setDatePickerPosition(null);
                    }}
                    className="focus-ring flex h-full min-h-[48px] w-full items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-700" />
                    <span className="min-w-0">
                      <span className="block text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-500">
                        Depart
                      </span>
                      <span className="block truncate text-[13px] font-bold text-slate-950">
                        {departureDateInput
                          ? formatDateLabel(departureDateInput)
                          : "Choose date"}
                      </span>
                    </span>
                  </button>
                </div>

                {tripTypeInput === "round-trip" ? (
                  <div ref={returnWrapRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDatePicker("return");
                        setDatePickerPosition(null);
                      }}
                      className="focus-ring flex h-full min-h-[48px] w-full items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left transition hover:border-slate-300 hover:bg-white"
                    >
                      <Calendar className="h-3.5 w-3.5 shrink-0 text-indigo-700" />
                      <span className="min-w-0">
                        <span className="block text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-500">
                          Return
                        </span>
                        <span className="block truncate text-[13px] font-bold text-slate-950">
                          {returnDateInput
                            ? formatDateLabel(returnDateInput)
                            : "Choose date"}
                        </span>
                      </span>
                    </button>
                  </div>
                ) : null}

                <div
                  ref={travelerCabinWrapRef}
                  className={cn(
                    tripTypeInput !== "round-trip" ? "lg:col-span-2" : ""
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setTravelerPopoverOpen(true);
                      setTravelerPopoverPosition(null);
                    }}
                    className="focus-ring flex h-full min-h-[48px] w-full items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <span className="min-w-0">
                      <span className="block text-[0.6rem] font-black uppercase tracking-[0.14em] text-slate-500">
                        Travelers
                      </span>
                      <span className="block truncate text-[13px] font-bold text-slate-950">
                        {buildTravelerCabinSummary(
                          adultCount,
                          childCount,
                          infantCount,
                          cabinClassInput
                        )}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-10 w-full rounded-xl bg-gradient-to-r from-indigo-950 to-violet-800 px-5 text-sm font-black text-white shadow-md shadow-indigo-950/20 lg:h-[48px] lg:w-auto lg:min-w-[112px]"
              >
                Search
              </Button>
            </div>
          </form>

          {activeDatePicker && datePickerPosition ? (
            <DatePickerPopover
              position={datePickerPosition}
              month={calendarMonth}
              departureValue={departureDateInput}
              returnValue={returnDateInput}
              activePicker={activeDatePicker}
              onMonthChange={setCalendarMonth}
              onSelect={(date) => {
                if (isBeforeToday(date)) return;

                const value = formatDateValue(date);

                if (activeDatePicker === "departure") {
                  setDepartureDateInput(value);

                  if (tripTypeInput === "round-trip") {
                    setActiveDatePicker("return");
                  } else {
                    setActiveDatePicker(null);
                    setDatePickerPosition(null);
                  }

                  return;
                }

                setReturnDateInput(value);
                setActiveDatePicker(null);
                setDatePickerPosition(null);
              }}
              onClear={() => {
                if (activeDatePicker === "departure") {
                  setDepartureDateInput("");
                }

                if (activeDatePicker === "return") {
                  setReturnDateInput("");
                }
              }}
              onToday={() => {
                const today = new Date();
                const value = formatDateValue(today);

                if (activeDatePicker === "departure") {
                  setDepartureDateInput(value);

                  if (tripTypeInput === "round-trip") {
                    setActiveDatePicker("return");
                    return;
                  }
                } else {
                  setReturnDateInput(value);
                }

                setActiveDatePicker(null);
                setDatePickerPosition(null);
              }}
            />
          ) : null}

          {travelerPopoverOpen && travelerPopoverPosition ? (
            <TravelerCabinPopover
              position={travelerPopoverPosition}
              adultCount={adultCount}
              childCount={childCount}
              infantCount={infantCount}
              cabinClass={cabinClassInput}
              onAdultChange={(nextValue) => {
                const nextAdultCount = Math.min(9, Math.max(1, nextValue));

                setAdultCount(nextAdultCount);
                setChildCount((current) =>
                  Math.min(current, 9 - nextAdultCount)
                );
                setInfantCount((current) =>
                  Math.min(current, nextAdultCount, 9 - nextAdultCount)
                );
              }}
              onChildChange={(nextValue) => {
                const nextChildCount = Math.min(
                  9 - adultCount,
                  Math.max(0, nextValue)
                );

                setChildCount(nextChildCount);
                setInfantCount((current) =>
                  Math.min(current, 9 - adultCount - nextChildCount)
                );
              }}
              onInfantChange={(nextValue) => {
                setInfantCount(
                  Math.min(
                    adultCount,
                    9 - adultCount - childCount,
                    Math.max(0, nextValue)
                  )
                );
              }}
              onCabinClassChange={setCabinClassInput}
            />
          ) : null}
        </section>

        <aside className="hidden lg:block">
          <Filters
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            maxStops={maxStops}
            setMaxStops={setMaxStops}
            currency={selectedCurrency}
          />
        </aside>

        <section className="min-w-0 space-y-5">
          {loading ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-teal/20 bg-white p-5 text-sm font-bold text-teal-dark shadow-sm">
                {loadingMessages[messageIndex]}
              </div>
              <FlightCardSkeleton />
              <FlightCardSkeleton />
              <FlightCardSkeleton />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-danger/30 bg-red-50 p-5 text-danger">
              {error}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-navy">
                  {filtered.length} option{filtered.length === 1 ? "" : "s"}{" "}
                  found
                </p>
                <Button
                  variant="secondary"
                  className="h-10 w-full rounded-xl border-slate-300 text-sm font-bold transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 sm:w-auto lg:hidden"
                  onClick={() => setFiltersOpen(true)}
                >
                  <SlidersHorizontal size={17} />
                  Filters
                </Button>
              </div>

              {filtered.length ? (
                filtered.map((flight) => (
                  <FlightCard key={flight.id} flight={flight} />
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-muted shadow-sm">
                  No flights match these filters. Widen your price or stops
                  range to see more live options.
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-navy/40 lg:hidden",
          filtersOpen ? "block" : "hidden"
        )}
        onClick={() => setFiltersOpen(false)}
      />

      <aside
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 max-h-[86dvh] overflow-auto rounded-t-2xl bg-white p-5 shadow-xl transition-transform lg:hidden",
          filtersOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-navy">Filters</h2>
          <Button
            variant="ghost"
            className="h-10 w-10 px-0"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>

        <Filters
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          maxStops={maxStops}
          setMaxStops={setMaxStops}
          currency={selectedCurrency}
        />
      </aside>
    </main>
  );
}

function filterAirportOptions(query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return airports.slice(0, 8);

  return airports
    .filter((item) => {
      const haystack =
        `${item.city} ${item.airport} ${item.code} ${item.country || ""}`.toLowerCase();

      return haystack.includes(normalized);
    })
    .slice(0, 8);
}

function buildPlacesUrl(
  query: string,
  context: "origin" | "destination",
  countryHint: string
) {
  const params = new URLSearchParams();
  if (query.length >= 2) params.set("q", query);
  params.set("context", context);
  if (countryHint) params.set("countryCode", countryHint);
  if (typeof navigator !== "undefined" && navigator.language) {
    params.set("locale", navigator.language);
  }

  return `/api/flights/places?${params.toString()}`;
}

function normalizeSuggestionText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

function dedupeSuggestions(suggestions: AirportOption[]) {
  const seenCodes = new Set<string>();
  const seenNames = new Set<string>();
  const deduped: AirportOption[] = [];

  for (const suggestion of suggestions) {
    const codeKey = suggestion.code.trim().toUpperCase();
    if (!codeKey || seenCodes.has(codeKey)) continue;

    const nameKey = `${normalizeSuggestionText(suggestion.city)}|${normalizeSuggestionText(suggestion.airport)}`;
    if (seenNames.has(nameKey)) continue;

    seenCodes.add(codeKey);
    seenNames.add(nameKey);
    deduped.push(suggestion);
  }

  return deduped;
}

function airportInputValue(item: AirportOption) {
  return item.code;
}

function addDays(date: Date, amount: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);

  return nextDate;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildMonthDays(month: Date): Array<Date | null> {
  const firstDay = startOfMonth(month);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0
  ).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}


function isBeforeToday(date: Date): boolean {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return date < startOfToday;
}

function isSameDateValue(date: Date, value: string): boolean {
  return Boolean(value) && formatDateValue(date) === value;
}

function cabinClassLabel(value: string) {
  return cabinClassOptions.find((option) => option.value === value)?.label || "Economy";
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildTravelerCabinSummary(
  adults: number,
  children: number,
  infants: number,
  cabinClass: string
) {
  const parts = [pluralize(adults, "adult", "adults")];

  if (children > 0) {
    parts.push(pluralize(children, "child", "children"));
  }

  if (infants > 0) {
    parts.push(pluralize(infants, "infant", "infants"));
  }

  parts.push(cabinClassLabel(cabinClass));

  return parts.join(", ");
}

function DatePickerPopover({
  position,
  month,
  departureValue,
  returnValue,
  activePicker,
  onMonthChange,
  onSelect,
  onClear,
  onToday,
}: {
  position: { top: number; left: number; width: number };
  month: Date;
  departureValue: string;
  returnValue: string;
  activePicker: "departure" | "return";
  onMonthChange: (month: Date) => void;
  onSelect: (date: Date) => void;
  onClear: () => void;
  onToday: () => void;
}) {
  const leftMonth = startOfMonth(month);
  const rightMonth = addMonths(leftMonth, 1);
  const today = new Date();
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const renderMonth = (renderedMonth: Date) => (
    <div className="min-w-0">
      <p className="mb-2 text-center text-sm font-bold text-slate-900">
        {renderedMonth.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })}
      </p>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
        {weekdays.map((day) => (
          <span key={`${renderedMonth.toISOString()}-${day}`}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {buildMonthDays(renderedMonth).map((date, index) => {
          if (!date) {
            return (
              <span
                key={`${renderedMonth.toISOString()}-blank-${index}`}
                className="h-9"
              />
            );
          }

          const selectedDeparture = isSameDateValue(date, departureValue);
          const selectedReturn = isSameDateValue(date, returnValue);
          const isToday = isSameDateValue(date, formatDateValue(today));
          const disabledPastDate = isBeforeToday(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={disabledPastDate}
              aria-disabled={disabledPastDate}
              onClick={() => {
                if (disabledPastDate) return;
                onSelect(date);
              }}
              className={cn(
                "h-9 rounded-md text-xs font-semibold transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 sm:h-10 sm:text-sm",
                selectedDeparture || selectedReturn
                  ? "bg-[#0a66c2] text-white hover:bg-[#085aa9] focus:bg-[#085aa9]"
                  : disabledPastDate
                  ? "cursor-not-allowed text-slate-300 hover:bg-transparent"
                  : "text-slate-800",
                isToday && !(selectedDeparture || selectedReturn) && !disabledPastDate
                  ? "ring-1 ring-slate-300"
                  : ""
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      id="flight-date-picker-popover"
      role="dialog"
      aria-label={
        activePicker === "departure"
          ? "Select departure date"
          : "Select return date"
      }
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className="w-full max-w-[min(620px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 sm:text-sm"
          onClick={() => onMonthChange(addMonths(leftMonth, -1))}
        >
          Prev
        </button>

        <button
          type="button"
          aria-label="Next month"
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 sm:text-sm"
          onClick={() => onMonthChange(addMonths(leftMonth, 1))}
        >
          Next
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {renderMonth(leftMonth)}
        <div className="hidden md:block">{renderMonth(rightMonth)}</div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
        <button
          type="button"
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 sm:text-sm"
          onClick={onClear}
        >
          Clear
        </button>

        <button
          type="button"
          className="min-h-11 rounded-xl bg-[#0a66c2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#085aa9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1"
          onClick={onToday}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function TravelerCabinPopover({
  position,
  adultCount,
  childCount,
  infantCount,
  cabinClass,
  onAdultChange,
  onChildChange,
  onInfantChange,
  onCabinClassChange,
}: {
  position: { top: number; left: number; width: number };
  adultCount: number;
  childCount: number;
  infantCount: number;
  cabinClass: CabinClassValue;
  onAdultChange: (value: number) => void;
  onChildChange: (value: number) => void;
  onInfantChange: (value: number) => void;
  onCabinClassChange: (value: CabinClassValue) => void;
}) {
  return (
    <div
      id="flight-traveler-cabin-popover"
      role="dialog"
      aria-label="Travelers and cabin class"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className="w-full max-w-[min(350px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10"
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Travelers</h3>

        <div className="mt-3 divide-y divide-slate-100">
          <CounterRow
            label="Adults"
            description="18+"
            value={adultCount}
            min={1}
            max={9}
            onChange={onAdultChange}
          />

          <CounterRow
            label="Children"
            description="0–17"
            value={childCount}
            min={0}
            max={9}
            onChange={onChildChange}
          />

          <CounterRow
            label="Infants on lap"
            description="Under 2"
            value={infantCount}
            min={0}
            max={adultCount}
            onChange={onInfantChange}
          />
        </div>
      </div>

      <div className="mt-2 border-t border-slate-200 pt-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide leading-4 text-slate-700">Cabin Class</h3>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {cabinClassOptions.map((option) => {
            const selected = option.value === cabinClass;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onCabinClassChange(option.value)}
                className={cn(
                  "focus-ring rounded-md border px-2 py-1 text-xs font-medium leading-4 transition-colors text-center",
                  selected
                    ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CounterRow({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const decrementDisabled = value <= min;
  const incrementDisabled = value >= max;

  return (
    <div className="flex min-h-10 items-center justify-between gap-3 py-2.5">
      <div>
        <p className="text-sm font-bold text-slate-950">{label}</p>
        <p className="text-xs font-semibold text-slate-500">{description}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={decrementDisabled}
          onClick={() => onChange(value - 1)}
          className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <span className="min-w-7 text-center text-sm font-semibold text-slate-900">
          {value}
        </span>

        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={incrementDisabled}
          onClick={() => onChange(value + 1)}
          className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SuggestionList({
  id,
  suggestions,
  onSelect,
  position,
}: {
  id: string;
  suggestions: AirportOption[];
  onSelect: (value: string) => void;
  position: { top: number; left: number; width: number };
}) {
  return (
    <div
      id={id}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999,
      }}
      className="w-full max-h-[min(42dvh,270px)] overflow-auto rounded-xl border border-slate-200 bg-white py-0.5 shadow-xl md:max-h-[220px]"
    >
      {suggestions.length ? (
        suggestions.map((item) => (
          <button
            key={`${item.code}-${item.airport}`}
            type="button"
            onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
            onClick={() => onSelect(airportInputValue(item))}
            className="block w-full px-3 py-1.5 text-left transition-colors hover:bg-slate-50"
          >
            <p className="text-[13px] font-medium text-slate-900">{item.city} ({item.code})</p>
            <p className="text-[11px] leading-4 text-slate-600">{item.airport}{item.country ? ` · ${item.country}` : ""}</p>
          </button>
        ))
      ) : (
        <p className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-500">
          No matching airports found
        </p>
      )}
    </div>
  );
}

function Filters({
  maxPrice,
  setMaxPrice,
  maxStops,
  setMaxStops,
  currency,
}: {
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  maxStops: number;
  setMaxStops: (value: number) => void;
  currency: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-navy">Refine Results</h2>
          <p className="mt-1 text-xs font-semibold text-muted">
            Keep the shortlist calm and decision-ready.
          </p>
        </div>
        <SlidersHorizontal className="text-teal" size={21} />
      </div>

      <div className="mt-6 grid gap-6">
        <label className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
            Price up to{" "}
            <span className="font-mono text-navy">
              {formatCurrency(maxPrice, currency)}
            </span>
          </span>
          <input
            className="w-full cursor-pointer accent-indigo-600 focus-visible:outline-none"
            type="range"
            min={100}
            max={2000}
            step={25}
            value={maxPrice}
            onChange={(event) => setMaxPrice(Number(event.target.value))}
          />
        </label>

        <label className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
            Stops up to{" "}
            <span className="font-mono text-navy">{maxStops}</span>
          </span>
          <input
            className="w-full cursor-pointer accent-indigo-600 focus-visible:outline-none"
            type="range"
            min={0}
            max={3}
            step={1}
            value={maxStops}
            onChange={(event) => setMaxStops(Number(event.target.value))}
          />
        </label>

        <div className="grid gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm font-semibold text-muted">
          <label className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-100">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40" defaultChecked />
            Baggage included where available
          </label>

          <label className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-100">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40" />
            Evening departures
          </label>

          <label className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-slate-100">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 accent-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40" />
            Low-risk connections
          </label>
        </div>
      </div>
    </div>
  );
}
