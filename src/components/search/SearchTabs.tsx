"use client";

import {
  useCallback,
  useEffect,
  type FormEvent,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  ArrowRightLeft,
  BedDouble,
  Calendar,
  ChevronDown,
  Minus,
  Plane,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import { useRouteProgress } from "@/components/layout/RouteProgress";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { HotelDestinationMobilePicker } from "@/components/search/HotelDestinationMobilePicker";
import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import { MobileAirportPicker } from "@/components/search/MobileAirportPicker";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  buildFlightRecentSearch,
  buildHotelRecentSearch,
  upsertRecentSearch,
} from "@/lib/recent-searches";
import {
  formatAirportLabel,
  type AirportOption,
} from "@/data/airports";
import { getHomeDiscoveryByRegion, homeDiscoveryByRegion } from "@/data/homeDiscovery";
import {
  applyDefaultOrigin,
  canApplyDefaultOrigin,
  markOriginManualInput,
  type OriginFieldState,
} from "@/lib/flights/defaultOrigin";

type TabMode =
  | "flights"
  | "hotels";

type TripType =
  | "round-trip"
  | "one-way"
  | "multi-city";

type SearchTabsProps = {
  t: Record<string, string>;
  compactHero?: boolean;
};

type PlacesApiResponse = {
  suggestions?: AirportOption[];
  defaultOriginAirport?: AirportOption | null;
  fallback?: boolean;
  source?: string;
};

type LocationApiResponse = {
  source?: "ipinfo-lite" | "fallback";
  countryCode?: string | null;
};

const normalizeSuggestionText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

const normalizeCountryHint = (value: string | null | undefined) => {
  const countryCode = value?.trim().toUpperCase() || "";
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : "";
};

const dedupeSuggestions = (suggestions: AirportOption[]) => {
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
};

const clampNumberInput = (
  value: string,
  min: number,
  max: number
) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(min);
  return String(
    Math.min(
      max,
      Math.max(
        min,
        parsed
      )
    )
  );
};

const normalizeCabinClass = (value: string) =>
  value === "premium-economy" || value === "business" || value === "first"
    ? value
    : "economy";

const allDiscoveryRoutes = [
  ...Object.values(homeDiscoveryByRegion).flat(),
  ...getHomeDiscoveryByRegion(),
];

const normalizeDestinationKey = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

const findDiscoveryImageForFlight = (originCode: string, destinationCode: string) => {
  const origin = originCode.trim().toUpperCase();
  const destination = destinationCode.trim().toUpperCase();
  const byRoute = allDiscoveryRoutes.find(
    (item) => item.originCode === origin && item.destinationCode === destination
  );
  if (byRoute) return byRoute;

  return allDiscoveryRoutes.find((item) => item.destinationCode === destination);
};

const findDiscoveryImageForHotel = (destination: string) => {
  const destinationKey = normalizeDestinationKey(destination);
  return allDiscoveryRoutes.find((item) => {
    const city = normalizeDestinationKey(item.destinationCity);
    const title = normalizeDestinationKey(item.title);
    return destinationKey === city || destinationKey.includes(city) || title.includes(destinationKey);
  });
};

export function SearchTabs({
  t,
  compactHero = false,
}: SearchTabsProps) {
  const router = useRouter();
  const { start: startRouteProgress } = useRouteProgress();

  const fromWrapRef =
    useRef<HTMLDivElement>(null);
  const fromInputRef =
    useRef<HTMLInputElement>(null);

  const toWrapRef =
    useRef<HTMLDivElement>(null);
  const toInputRef =
    useRef<HTMLInputElement>(null);
  const fromMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const toMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const dateWrapRef =
    useRef<HTMLDivElement>(null);
  const flightDatesLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelDestinationMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelDateWrapRef =
    useRef<HTMLDivElement>(null);
  const hotelDatesMobileLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelDatesPanelRef =
    useRef<HTMLDivElement>(null);
  const tripTypeWrapRef =
    useRef<HTMLDivElement>(null);
  const travelersWrapRef =
    useRef<HTMLDivElement>(null);
  const travelersLauncherRef =
    useRef<HTMLButtonElement>(null);
  const hotelGuestsRoomsWrapRef =
    useRef<HTMLDivElement>(null);
  const hotelGuestsRoomsMobileLauncherRef =
    useRef<HTMLButtonElement>(null);

  const [tab, setTab] =
    useState<TabMode>("flights");
  const [isFlightSubmitting, setIsFlightSubmitting] =
    useState(false);
  const [isHotelSubmitting, setIsHotelSubmitting] =
    useState(false);

  const [tripType, setTripType] =
    useState<TripType>(
      "round-trip"
    );
  const [tripTypeOpen, setTripTypeOpen] =
    useState(false);
  const [
    travelersMenuOpen,
    setTravelersMenuOpen,
  ] = useState(false);

  const [fromState, setFromState] =
    useState<OriginFieldState>({
      input: "",
      code: "",
      source: "empty",
      userInteracted: false,
    });
  const from = fromState.input;
  const fromCode = fromState.code;
  const [to, setTo] =
    useState("");
  const [toCode, setToCode] =
    useState("");

  const [fromOpen, setFromOpen] =
    useState(false);

  const [toOpen, setToOpen] =
    useState(false);
  const [activeMobileAirportPicker, setActiveMobileAirportPicker] =
    useState<"origin" | "destination" | null>(null);
  const [
    flightDatesOpen,
    setFlightDatesOpen,
  ] = useState(false);
  const [
    hotelDatesOpen,
    setHotelDatesOpen,
  ] = useState(false);
  const [hotelDestinationMobilePickerOpen, setHotelDestinationMobilePickerOpen] =
    useState(false);

  const [
    fromHighlight,
    setFromHighlight,
  ] = useState(0);

  const [
    toHighlight,
    setToHighlight,
  ] = useState(0);
  const [
    fromLiveSuggestions,
    setFromLiveSuggestions,
  ] = useState<AirportOption[]>(
    []
  );
  const [
    toLiveSuggestions,
    setToLiveSuggestions,
  ] = useState<AirportOption[]>(
    []
  );
  const [
    fromLoading,
    setFromLoading,
  ] = useState(false);
  const [toLoading, setToLoading] =
    useState(false);
  const [countryHint, setCountryHint] = useState("");

  const [
    departureDate,
    setDepartureDate,
  ] = useState("");

  const [
    returnDate,
    setReturnDate,
  ] = useState("");
  const [
    visibleMonthDate,
    setVisibleMonthDate,
  ] = useState(() => {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  });
  const [
    hotelVisibleMonthDate,
    setHotelVisibleMonthDate,
  ] = useState(() => {
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  });

  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [draftAdultCount, setDraftAdultCount] = useState(1);
  const [draftChildCount, setDraftChildCount] = useState(0);
  const [draftInfantCount, setDraftInfantCount] = useState(0);

  const [
    cabinClass,
    setCabinClass,
  ] = useState("economy");
  const [draftCabinClass, setDraftCabinClass] = useState("economy");
  const travelersDraftRef = useRef({
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "economy",
  });

  const [
    destination,
    setDestination,
  ] = useState("");

  const [checkIn, setCheckIn] =
    useState("");

  const [checkOut, setCheckOut] =
    useState("");

  const [hotelAdultCount, setHotelAdultCount] = useState(1);
  const [hotelChildCount, setHotelChildCount] = useState(0);

  const [rooms, setRooms] =
    useState("1");
  const [hotelPetFriendly, setHotelPetFriendly] = useState(false);
  const [hotelGuestsRoomsOpen, setHotelGuestsRoomsOpen] =
    useState(false);

  const wrapper = useMemo(
    () =>
      cn(
        "rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.10)]",
        (flightDatesOpen || hotelDatesOpen) &&
          "relative z-[200]",
        compactHero
          ? "p-1.5 sm:p-2"
          : "p-2"
      ),
    [compactHero, flightDatesOpen, hotelDatesOpen]
  );

  const fromQuery = from.trim();
  const toQuery = to.trim();
  const fromSuggestions = fromQuery.length >= 2 ? fromLiveSuggestions : [];
  const toSuggestions = toQuery.length >= 2 ? toLiveSuggestions : [];
  const isFromLoadingVisible = fromQuery.length >= 2 && fromLoading;
  const isToLoadingVisible = toQuery.length >= 2 && toLoading;
  const shouldShowFromSuggestionsPanel =
    fromOpen &&
    fromQuery.length >= 2 &&
    (fromLoading || fromSuggestions.length > 0 || !fromLoading);
  const shouldShowToSuggestionsPanel =
    toOpen &&
    toQuery.length >= 2 &&
    (toLoading || toSuggestions.length > 0 || !toLoading);

  const normalizePassengerDraft = useCallback((
    adults: number,
    children: number,
    infants: number
  ) => {
    const normalizedAdults = Math.max(1, Math.min(9, adults));
    const normalizedChildren = Math.max(
      0,
      Math.min(9 - normalizedAdults, children)
    );
    const normalizedInfants = Math.max(
      0,
      Math.min(
        normalizedAdults,
        Math.min(9 - normalizedAdults - normalizedChildren, infants)
      )
    );

    return {
      adults: normalizedAdults,
      children: normalizedChildren,
      infants: normalizedInfants,
    };
  }, []);

  const openTravelersMenu = useCallback(() => {
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizeCabinClass(cabinClass));
    setTravelersMenuOpen(true);
  }, [adultCount, childCount, infantCount, cabinClass]);

  const cancelTravelersDraft = useCallback(() => {
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizeCabinClass(cabinClass));
    setTravelersMenuOpen(false);
  }, [adultCount, childCount, infantCount, cabinClass]);

  const applyTravelersFromValues = useCallback((
    nextAdults: number,
    nextChildren: number,
    nextInfants: number,
    nextCabinClass: string
  ) => {
    const normalized = normalizePassengerDraft(
      nextAdults,
      nextChildren,
      nextInfants
    );
    setAdultCount(normalized.adults);
    setChildCount(normalized.children);
    setInfantCount(normalized.infants);
    setCabinClass(normalizeCabinClass(nextCabinClass));
    setTravelersMenuOpen(false);
  }, [normalizePassengerDraft]);

  const applyTravelersDraft = useCallback(() => {
    applyTravelersFromValues(
      draftAdultCount,
      draftChildCount,
      draftInfantCount,
      draftCabinClass
    );
  }, [applyTravelersFromValues, draftAdultCount, draftChildCount, draftInfantCount, draftCabinClass]);

  const buildPlacesUrl = useCallback((query: string, context: "origin" | "destination", requestDefault = false) => {
    const params = new URLSearchParams();
    if (query.length >= 2) params.set("q", query);
    if (requestDefault) params.set("default", "true");
    params.set("context", context);
    if (context === "origin" && countryHint) params.set("countryCode", countryHint);
    if (typeof navigator !== "undefined" && navigator.language) params.set("locale", navigator.language);

    return `/api/flights/places?${params.toString()}`;
  }, [countryHint]);

  useEffect(() => {
    const controller = new AbortController();

    const loadLocationCountryHint = async () => {
      try {
        const response = await fetch("/api/location", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as LocationApiResponse;
        const detectedCountryHint = payload.source === "ipinfo-lite"
          ? normalizeCountryHint(payload.countryCode)
          : "";
        setCountryHint(detectedCountryHint);
      } catch {
        // Leave airport country empty when IP country detection is unavailable.
      }
    };

    void loadLocationCountryHint();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!canApplyDefaultOrigin(fromState)) return;

    const controller = new AbortController();

    const loadDefaultOrigin = async () => {
      try {
        const response = await fetch(buildPlacesUrl("", "origin", true), {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as PlacesApiResponse;
        const defaultAirport = payload.defaultOriginAirport ?? null;
        setFromState((current) => applyDefaultOrigin(current, defaultAirport));
        if (Array.isArray(payload.suggestions)) {
          setFromLiveSuggestions(
            dedupeSuggestions(payload.suggestions)
              .filter((item) => !!item?.code && !!item?.city && !!item?.airport)
              .slice(0, 7),
          );
        }
      } catch {
        // The homepage search keeps its existing empty-origin behavior if defaults are unavailable.
      }
    };

    void loadDefaultOrigin();

    return () => controller.abort();
  }, [buildPlacesUrl, fromState]);

  useEffect(() => {
    const query = from.trim();
    if (query.length < 2) {
      return;
    }

    const controller =
      new AbortController();
    const timeoutId =
      window.setTimeout(
        async () => {
          setFromLoading(true);
          try {
            const response =
              await fetch(
                buildPlacesUrl(query, "origin"),
                {
                  signal:
                    controller.signal,
                  cache: "no-store",
                }
              );
            if (!response.ok) {
              throw new Error(
                "Failed to load suggestions"
              );
            }
            const payload =
              (await response.json()) as PlacesApiResponse;
            const suggestions = Array.isArray(
              payload.suggestions
            )
              ? dedupeSuggestions(payload.suggestions)
                  .filter(
                    (item) =>
                      !!item?.code &&
                      !!item?.city &&
                      !!item?.airport
                  )
                  .slice(0, 7)
              : [];
            setFromLiveSuggestions(
              suggestions
            );
          } catch {
            if (!controller.signal.aborted) {
              setFromLiveSuggestions(
                []
              );
            }
          } finally {
            if (!controller.signal.aborted) {
              setFromLoading(false);
            }
          }
        },
        300
      );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [from, buildPlacesUrl]);

  useEffect(() => {
    const query = to.trim();
    if (query.length < 2) {
      return;
    }

    const controller =
      new AbortController();
    const timeoutId =
      window.setTimeout(
        async () => {
          setToLoading(true);
          try {
            const response =
              await fetch(
                buildPlacesUrl(query, "destination"),
                {
                  signal:
                    controller.signal,
                  cache: "no-store",
                }
              );
            if (!response.ok) {
              throw new Error(
                "Failed to load suggestions"
              );
            }
            const payload =
              (await response.json()) as PlacesApiResponse;
            const suggestions = Array.isArray(
              payload.suggestions
            )
              ? dedupeSuggestions(payload.suggestions)
                  .filter(
                    (item) =>
                      !!item?.code &&
                      !!item?.city &&
                      !!item?.airport
                  )
                  .slice(0, 7)
              : [];
            setToLiveSuggestions(
              suggestions
            );
          } catch {
            if (!controller.signal.aborted) {
              setToLiveSuggestions(
                []
              );
            }
          } finally {
            if (!controller.signal.aborted) {
              setToLoading(false);
            }
          }
        },
        300
      );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [to, buildPlacesUrl]);

  useEffect(() => {
    travelersDraftRef.current = {
      adults: draftAdultCount,
      children: draftChildCount,
      infants: draftInfantCount,
      cabinClass: draftCabinClass,
    };
  }, [
    draftAdultCount,
    draftChildCount,
    draftInfantCount,
    draftCabinClass,
  ]);

  useEffect(() => {
    const onPointerDown = (
      event: MouseEvent
    ) => {
      const eventTarget = event.target as Node;
      if (
        eventTarget instanceof Element &&
        eventTarget.closest("[data-flight-mobile-picker-shell]")
      ) {
        return;
      }

      if (
        !fromWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setFromOpen(false);
      }

      if (
        !toWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setToOpen(false);
      }
      if (
        !dateWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setFlightDatesOpen(
          false
        );
      }
      if (
        !hotelDateWrapRef.current?.contains(
          eventTarget
        ) &&
        !hotelDatesPanelRef.current?.contains(
          eventTarget
        )
      ) {
        setHotelDatesOpen(false);
      }
      if (
        !tripTypeWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setTripTypeOpen(false);
      }
      if (
        !travelersWrapRef.current?.contains(
          eventTarget
        )
      ) {
        if (travelersMenuOpen) {
          const latestDraft = travelersDraftRef.current;
          applyTravelersFromValues(
            latestDraft.adults,
            latestDraft.children,
            latestDraft.infants,
            latestDraft.cabinClass
          );
        }
      }
      if (
        !hotelGuestsRoomsWrapRef.current?.contains(
          eventTarget
        )
      ) {
        setHotelGuestsRoomsOpen(false);
      }
    };
    const onEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setFlightDatesOpen(
          false
        );
        setHotelDatesOpen(false);
        setHotelDestinationMobilePickerOpen(false);
        setTripTypeOpen(false);
        if (travelersMenuOpen) {
          cancelTravelersDraft();
        }
        setHotelGuestsRoomsOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      onPointerDown
    );
    document.addEventListener(
      "keydown",
      onEscape
    );

    return () =>
      {
        document.removeEventListener(
          "mousedown",
          onPointerDown
        );
        document.removeEventListener(
          "keydown",
          onEscape
        );
      };
  }, [applyTravelersFromValues, cancelTravelersDraft, travelersMenuOpen]);


  const guests = String(hotelAdultCount + hotelChildCount);
  const hotelGuestsRoomsSummary = `${guests} ${Number(guests) === 1 ? t.guestSingular || "guest" : t.guestPlural || "guests"}, ${rooms} ${Number(rooms) === 1 ? t.roomSingular || "room" : t.roomPlural || "rooms"}`;

  const formatShortDate = (
    isoDate: string
  ) => {
    if (!isoDate) {
      return "";
    }

    const [year, month, day] =
      isoDate.split("-");

    if (
      !year ||
      !month ||
      !day
    ) {
      return "";
    }

    const parsedDate = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
        day: "numeric",
      }
    ).format(parsedDate);
  };

  const dateSummary = useMemo(
    () => {
      const departureSummary =
        formatShortDate(
          departureDate
        );
      const returnSummary =
        formatShortDate(returnDate);

      if (!departureSummary) {
        return t.travelDates || "Travel dates";
      }

      if (
        tripType ===
          "round-trip" &&
        returnSummary
      ) {
        return `${departureSummary} — ${returnSummary}`;
      }

      return departureSummary;
    },
    [
      departureDate,
      returnDate,
      tripType,
      t.travelDates,
    ]
  );

  const weekdays = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  const parseIsoDate = (
    value: string
  ) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] =
      value.split("-").map(Number);
    const parsed = new Date(
      year,
      month - 1,
      day
    );
    return Number.isNaN(
      parsed.getTime()
    ) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
      ? null
      : parsed;
  };

  const toIsoDate = (
    date: Date
  ) => {
    const year =
      date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const startOfLocalDay = (
    date: Date
  ) =>
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  const todayLocal =
    startOfLocalDay(
      new Date()
    );

  const isBeforeToday = (
    date: Date
  ) =>
    startOfLocalDay(
      date
    ).getTime() <
    todayLocal.getTime();

  // Flight date selection intentionally shares one enabled-day rule across
  // one-way and round-trip calendars: only past local days are disabled. When
  // selecting a round-trip return, a future date before departure resets the
  // departure and clears the return instead of creating an invalid range.
  const isSelectableFlightDate = (
    date: Date
  ) => !isBeforeToday(date);

  const addMonths = (
    date: Date,
    offset: number
  ) =>
    new Date(
      date.getFullYear(),
      date.getMonth() + offset,
      1
    );

  type MonthCell = {
    date: Date;
    isCurrentMonth: boolean;
  };

  const buildMonthCells = (
    monthDate: Date
  ) => {
    const firstDay =
      new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1
      );
    const startOffset =
      firstDay.getDay();
    const startDate = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1 - startOffset
    );
    return Array.from(
      { length: 42 },
      (_, index) => {
        const date =
          new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate() +
              index
          );

        return {
          date,
          isCurrentMonth:
            date.getMonth() ===
            monthDate.getMonth(),
        } satisfies MonthCell;
      }
    );
  };

  const departureParsed =
    parseIsoDate(
      departureDate
    );
  const returnParsed =
    parseIsoDate(returnDate);
  const isDepartureDateInvalid =
    !departureParsed ||
    isBeforeToday(departureParsed);
  const isReturnDateInvalid =
    tripType === "round-trip" &&
    (!returnParsed ||
      isBeforeToday(returnParsed) ||
      Boolean(departureParsed && returnParsed < departureParsed));

  const isValidFlightDate = (value: string) => {
    const parsed = parseIsoDate(value);
    return Boolean(parsed && !isBeforeToday(parsed));
  };

  const isFlightReturnRangeValid =
    tripType !== "round-trip" ||
    (isValidFlightDate(returnDate) &&
      isValidFlightDate(departureDate) &&
      returnDate >= departureDate);

  const onSelectDate = (
    date: Date
  ) => {
    if (!isSelectableFlightDate(date)) {
      return;
    }

    const selectedIso =
      toIsoDate(date);

    if (tripType === "one-way") {
      setDepartureDate(
        selectedIso
      );
      setReturnDate("");
      return;
    }

    if (
      !departureDate ||
      (departureDate &&
        returnDate)
    ) {
      setDepartureDate(
        selectedIso
      );
      setReturnDate("");
      return;
    }

    if (selectedIso < departureDate) {
      setDepartureDate(selectedIso);
      setReturnDate("");
      return;
    }

    setReturnDate(selectedIso);
  };

  const tripTypeLabel = (
    mode: TripType
  ) => {
    if (mode === "round-trip") {
      return (
        t.roundTrip ||
        t.tripRound ||
        t.roundTrip
      );
    }

    if (mode === "one-way") {
      return (
        t.oneWay ||
        t.tripOneWay ||
        t.oneWay
      );
    }

    return (
      t.multiCity ||
      t.tripMulti ||
      "Multi-city"
    );
  };

  const travelerCount = adultCount + childCount + infantCount;

  const hasActiveFlightSearch =
    from.trim() !== "" ||
    fromCode.trim() !== "" ||
    to.trim() !== "" ||
    toCode.trim() !== "" ||
    departureDate !== "" ||
    returnDate !== "" ||
    tripType !== "round-trip" ||
    adultCount !== 1 ||
    childCount !== 0 ||
    infantCount !== 0 ||
    cabinClass !== "economy";

  const normalizedCabinClass =
    normalizeCabinClass(cabinClass);
  const cabinClassLabel =
    normalizedCabinClass === "premium-economy"
      ? t.premiumEconomy || "Premium economy"
      : normalizedCabinClass === "business"
        ? t.business || "Business"
        : normalizedCabinClass === "first"
          ? t.first || "First"
          : t.economy || "Economy";

  const travelerSummary = useMemo(() => {
    const parts: string[] = [];

    if (adultCount > 0) {
      parts.push(`${adultCount} ${adultCount === 1 ? t.adultSingular || "adult" : t.adultPlural || "adults"}`);
    }
    if (childCount > 0) {
      parts.push(`${childCount} ${childCount === 1 ? t.childSingular || "child" : t.childPlural || "children"}`);
    }
    if (infantCount > 0) {
      parts.push(`${infantCount} ${infantCount === 1 ? t.infantSingular || "infant" : t.infantPlural || "infants"}`);
    }

    const baseSummary =
      parts.length > 0
        ? parts.join(", ")
        : `${travelerCount} ${travelerCount === 1 ? t.travelerSingular || "traveler" : t.travelerPlural || t.travelers || "travelers"}`;
    return `${baseSummary}, ${cabinClassLabel}`;
  }, [adultCount, childCount, infantCount, travelerCount, cabinClassLabel, t]);

  const onKeyNav = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    isFrom: boolean
  ) => {
    const list = isFrom
      ? fromSuggestions
      : toSuggestions;

    const active = isFrom
      ? fromHighlight
      : toHighlight;

    const setActive = isFrom
      ? setFromHighlight
      : setToHighlight;

    const setOpen = isFrom
      ? setFromOpen
      : setToOpen;

    if (!list.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setOpen(true);

      setActive(
        (active + 1) %
          list.length
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setOpen(true);

      setActive(
        (active - 1 + list.length) %
          list.length
      );
    }

    if (
      event.key === "Enter" &&
      (isFrom
        ? fromOpen
        : toOpen)
    ) {
      event.preventDefault();

      if (isFrom) {
        setFromState((current) => markOriginManualInput(
          current,
          formatAirportLabel(list[active]),
          list[active].code
        ));
      } else {
        setTo(
          formatAirportLabel(
            list[active]
          )
        );
        setToCode(
          list[active].code
        );
      }

      setOpen(false);
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const onSwapAirports = () => {
    const fromValue = from;
    const fromCanonicalCode = fromCode;

    setFromState({
      input: to,
      code: toCode,
      source: to.trim() ? "manual" : "empty",
      userInteracted: true,
    });
    setTo(fromValue);
    setToCode(fromCanonicalCode);
    setFromOpen(false);
    setToOpen(false);
  };

  const focusInputAfterClear = (input: HTMLInputElement | null) => {
    window.requestAnimationFrame(() => input?.focus());
  };

  const onClearOrigin = () => {
    setFromState((current) => markOriginManualInput(current, ""));
    setFromLoading(false);
    setFromLiveSuggestions([]);
    setFromOpen(false);
    setFromHighlight(0);
    if (!activeMobileAirportPicker) {
      focusInputAfterClear(fromInputRef.current);
    }
  };
  const onClearDestination = () => {
    setTo("");
    setToLoading(false);
    setToLiveSuggestions([]);
    setToCode("");
    setToOpen(false);
    setToHighlight(0);
    if (!activeMobileAirportPicker) {
      focusInputAfterClear(toInputRef.current);
    }
  };
  const onClearTravelDates = () => {
    setDepartureDate("");
    setReturnDate("");
    setFlightDatesOpen(false);
  };
  const onResetFlightSearch = () => {
    onClearOrigin();
    onClearDestination();
    onClearTravelDates();
    setTripType("round-trip");
    setAdultCount(1);
    setChildCount(0);
    setInfantCount(0);
    setDraftAdultCount(1);
    setDraftChildCount(0);
    setDraftInfantCount(0);
    setCabinClass("economy");
    setDraftCabinClass("economy");
    travelersDraftRef.current = { adults: 1, children: 0, infants: 0, cabinClass: "economy" };
    setTravelersMenuOpen(false);
    setTripTypeOpen(false);
  };

  const isFlightSearchDisabled =
    isFlightSubmitting ||
    !from.trim() ||
    !to.trim() ||
    !isValidFlightDate(departureDate) ||
    !isFlightReturnRangeValid;

  const onFlightSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      isFlightSearchDisabled ||
      isDepartureDateInvalid ||
      (tripType === "round-trip" && isReturnDateInvalid)
    ) {
      return;
    }
    const normalizedAdults = Math.max(1, Math.min(9, adultCount));
    const normalizedChildren = Math.max(0, Math.min(9 - normalizedAdults, childCount));
    const normalizedInfants = Math.max(0, Math.min(normalizedAdults, Math.min(9 - normalizedAdults - normalizedChildren, infantCount)));
    const normalizedTravelers = String(normalizedAdults + normalizedChildren + normalizedInfants);
    setAdultCount(normalizedAdults);
    setChildCount(normalizedChildren);
    setInfantCount(normalizedInfants);

    const normalizedCabinClass = normalizeCabinClass(cabinClass);
    const params =
      new URLSearchParams({
        tripType:
          tripType ===
          "one-way"
            ? "one-way"
            : "round-trip",
        origin:
          fromCode ||
          from.trim(),
        destination:
          toCode ||
          to.trim(),
        departureDate,
        adults: String(normalizedAdults),
        children: String(normalizedChildren),
        infants: String(normalizedInfants),
        travelers:
          normalizedTravelers,
        cabinClass: normalizedCabinClass,
      });

    if (
      tripType ===
        "round-trip" &&
      returnDate
    ) {
      params.set(
        "returnDate",
        returnDate
      );
    }

    const href = `/flights/results?${params.toString()}`;

    try {
      const matchedFlightImage = findDiscoveryImageForFlight(
        params.get("origin") ?? "",
        params.get("destination") ?? ""
      );
      upsertRecentSearch(
        buildFlightRecentSearch({
          tripType: (params.get("tripType") as "round-trip" | "one-way") ?? "round-trip",
          origin: params.get("origin") ?? "",
          destination: params.get("destination") ?? "",
          departureDate: params.get("departureDate") ?? "",
          returnDate: params.get("returnDate") ?? undefined,
          adults: Number(params.get("adults") ?? "1"),
          children: Number(params.get("children") ?? "0"),
          infants: Number(params.get("infants") ?? "0"),
          travelers: Number(params.get("travelers") ?? "1"),
          cabinClass: params.get("cabinClass") ?? "economy",
        }, matchedFlightImage ? { image: matchedFlightImage.image, imageAlt: matchedFlightImage.imageAlt } : undefined)
      );
    } catch {
      // best effort only
    }

    setIsFlightSubmitting(true);
    startRouteProgress();
    router.push(href);
  };

  const isHotelSearchDisabled =
    isHotelSubmitting ||
    !destination.trim() ||
    !checkIn ||
    !checkOut ||
    checkOut <= checkIn;

  const onHotelSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      isHotelSearchDisabled
    ) {
      return;
    }
    const normalizedGuests =
      clampNumberInput(
        guests,
        1,
        12
      );
    const normalizedRooms =
      clampNumberInput(
        rooms,
        1,
        6
      );
    setRooms(normalizedRooms);

    const params =
      new URLSearchParams({
        destination:
          destination.trim(),
        checkIn,
        checkOut,
        guests:
          normalizedGuests,
        rooms: normalizedRooms,
      });

    const href = `/hotels/results?${params.toString()}`;

    try {
      const matchedHotelImage = findDiscoveryImageForHotel(params.get("destination") ?? "");
      upsertRecentSearch(
        buildHotelRecentSearch({
          destination: params.get("destination") ?? "",
          checkIn: params.get("checkIn") ?? "",
          checkOut: params.get("checkOut") ?? "",
          guests: Number(params.get("guests") ?? "1"),
          rooms: Number(params.get("rooms") ?? "1"),
        }, matchedHotelImage ? { image: matchedHotelImage.image, imageAlt: matchedHotelImage.imageAlt } : undefined)
      );
    } catch {
      // best effort only
    }

    setIsHotelSubmitting(true);
    startRouteProgress();
    router.push(href);
  };

  const hotelDateSummary = useMemo(
    () => {
      const checkInSummary =
        formatShortDate(checkIn);
      const checkOutSummary =
        formatShortDate(checkOut);

      if (!checkInSummary) {
        return "Check-in — Check-out";
      }

      if (checkOutSummary) {
        return `${checkInSummary} — ${checkOutSummary}`;
      }

      return checkInSummary;
    },
    [checkIn, checkOut]
  );

  const checkInParsed =
    parseIsoDate(checkIn);
  const checkOutParsed =
    parseIsoDate(checkOut);

  const onSelectHotelDate = (
    date: Date
  ) => {
    if (isBeforeToday(date)) {
      return;
    }

    const selectedIso =
      toIsoDate(date);

    if (
      !checkIn ||
      (checkIn && checkOut)
    ) {
      setCheckIn(selectedIso);
      setCheckOut("");
      return;
    }

    if (selectedIso <= checkIn) {
      setCheckIn(selectedIso);
      setCheckOut("");
      return;
    }

    setCheckOut(selectedIso);
  };


  const renderFlightDateCalendar = () => (
    <>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setVisibleMonthDate((prev) => addMonths(prev, -1))}
          className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Prev
        </button>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setVisibleMonthDate((prev) => addMonths(prev, 1))}
          className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Next
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {[0, 1].map((monthOffset) => {
          const monthDate = addMonths(visibleMonthDate, monthOffset);
          const cells = buildMonthCells(monthDate);

          return (
            <div key={monthOffset}>
              <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                {monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
              <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
                {weekdays.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((cell) => {
                  const day = cell.date;
                  const iso = toIsoDate(day);
                  const isDeparture = iso === departureDate;
                  const isReturn = iso === returnDate;
                  const isDisabledDate = !isSelectableFlightDate(day);
                  const isInRange = !!(
                    departureParsed &&
                    returnParsed &&
                    !isDisabledDate &&
                    day > departureParsed &&
                    day < returnParsed
                  );

                  if (!cell.isCurrentMonth) {
                    return (
                      <span
                        key={`placeholder-${iso}`}
                        aria-hidden="true"
                        className="h-10 w-10 justify-self-center sm:h-11 sm:w-11"
                      />
                    );
                  }

                  return (
                    <button
                      key={iso}
                      type="button"
                      aria-label={`Select ${day.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}`}
                      onClick={() => {
                        if (isDisabledDate || !isSelectableFlightDate(day)) return;
                        onSelectDate(day);
                      }}
                      disabled={isDisabledDate}
                      aria-disabled={isDisabledDate}
                      className={cn(
                        "focus-ring flex h-10 w-10 items-center justify-center justify-self-center rounded-full text-base transition-colors disabled:cursor-not-allowed sm:h-11 sm:w-11",
                        isDisabledDate
                          ? "text-slate-300 hover:bg-transparent"
                          : "text-slate-900 hover:bg-indigo-50",
                        isInRange && "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100",
                        (isDeparture || isReturn) && "bg-indigo-700 text-white hover:bg-indigo-700"
                      )}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  const flightDatesFooter = (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => {
          setDepartureDate("");
          setReturnDate("");
        }}
        className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        {t.clear || "Clear"}
      </button>
      <button
        type="button"
        onClick={() => setFlightDatesOpen(false)}
        className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
      >
        {t.done || "Done"}
      </button>
    </div>
  );

  const renderTravelersCabinPicker = () => (
    <>
      <div className="divide-y divide-slate-200 rounded-2xl bg-white px-1 sm:rounded-none sm:bg-transparent sm:px-0">
        {[
          { key: "adults", label: t.adultPlural || "Adults", subtitle: "18+", count: draftAdultCount, min: 1 },
          { key: "children", label: t.childPlural || "Children", subtitle: "2–17", count: draftChildCount, min: 0 },
          { key: "infants", label: t.infantPlural || "Infants", subtitle: "Under 2", count: draftInfantCount, min: 0 },
        ].map((row) => {
          const draftTravelerCount = draftAdultCount + draftChildCount + draftInfantCount;
          const canDecrement = row.count > row.min;
          const canIncrement =
            draftTravelerCount < 9 &&
            (row.key !== "infants" || draftInfantCount < draftAdultCount);

          return (
            <div key={row.key} className="flex items-center justify-between py-4 first:pt-1 last:pb-1">
              <span>
                <span className="block text-sm font-semibold text-slate-900">{row.label}</span>
                <span className="block text-xs leading-5 text-slate-600">{row.subtitle}</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (row.key === "adults") {
                      const nextAdults = Math.max(1, draftAdultCount - 1);
                      setDraftAdultCount(nextAdults);
                      setDraftInfantCount((current) => Math.min(current, nextAdults));
                    }
                    if (row.key === "children") setDraftChildCount(Math.max(0, draftChildCount - 1));
                    if (row.key === "infants") setDraftInfantCount(Math.max(0, draftInfantCount - 1));
                  }}
                  disabled={!canDecrement}
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-7 text-center text-sm font-semibold text-slate-900">{row.count}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (row.key === "adults") {
                      if (draftTravelerCount >= 9) return;
                      setDraftAdultCount((current) => Math.min(9, current + 1));
                      return;
                    }
                    if (row.key === "children") {
                      if (draftTravelerCount >= 9) return;
                      setDraftChildCount((current) => Math.min(9, current + 1));
                      return;
                    }
                    if (row.key === "infants") {
                      if (draftTravelerCount >= 9 || draftInfantCount >= draftAdultCount) return;
                      setDraftInfantCount((current) => Math.min(draftAdultCount, current + 1));
                    }
                  }}
                  disabled={!canIncrement}
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-2xl border-t border-slate-200 bg-white pt-5 sm:rounded-none sm:bg-transparent">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide leading-4 text-slate-700">{t.cabinClass || "Cabin class"}</p>
        </div>
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
          {[["economy", t.economy || "Economy"], ["premium-economy", t.premiumEconomy || "Premium economy"], ["business", t.business || "Business"], ["first", t.first || "First"]].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDraftCabinClass(value)}
              className={cn(
                "focus-ring rounded-md border px-2 py-2 text-xs font-medium leading-4 text-center transition-colors sm:py-1 sm:text-xs",
                draftCabinClass === value
                  ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <>
      <section className={wrapper}>
      <div className="mb-2 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          onClick={() =>
            setTab("flights")
          }
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
            tab === "flights"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          )}
        >
          <Plane size={16} />
          {t.flights}
        </button>

        <button
          type="button"
          onClick={() =>
            setTab("hotels")
          }
          className={cn(
            "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
            tab === "hotels"
              ? "bg-white text-navy shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          )}
        >
          <BedDouble size={16} />
          {t.hotels}
        </button>
      </div>

      {tab === "flights" ? (
        <form
          onSubmit={
            onFlightSubmit
          }
          className="space-y-2"
        >
          <div className="flex items-center justify-between gap-2 px-1">
            <div
              ref={tripTypeWrapRef}
              className="relative inline-flex"
            >
              <button
                type="button"
                aria-expanded={
                  tripTypeOpen
                }
                aria-haspopup="listbox"
                onClick={() =>
                  setTripTypeOpen(
                    (
                      prevOpen
                    ) =>
                      !prevOpen
                  )
                }
                className="focus-ring inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
              >
                {tripTypeLabel(
                  tripType
                )}
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 text-slate-500 transition-transform",
                    tripTypeOpen &&
                      "rotate-180"
                  )}
                />
              </button>

              {tripTypeOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full z-30 mt-1 min-w-[210px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
                >
                  {(
                    [
                      "round-trip",
                      "one-way",
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setTripType(
                          mode
                        );
                        if (mode === "one-way") {
                          setReturnDate("");
                        } else if (
                          returnDate &&
                          (!isValidFlightDate(returnDate) ||
                            !isValidFlightDate(departureDate) ||
                            returnDate < departureDate)
                        ) {
                          setReturnDate("");
                        }
                        setTripTypeOpen(
                          false
                        );
                      }}
                      className={cn(
                        "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                        tripType ===
                          mode
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {tripTypeLabel(
                        mode
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled
                    className="mt-0.5 flex w-full cursor-not-allowed items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-slate-500"
                  >
                    Multi-city —
                    Use one-way or round-trip search
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] lg:gap-0">
              <div className="grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-stretch rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
              <div
                ref={fromWrapRef}
                className="relative min-h-[54px] px-0 py-0 pr-3"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.origin ||
                    "Origin"}
                </label>
                <div className="relative h-8">
                  <button
                    ref={fromMobileLauncherRef}
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={activeMobileAirportPicker === "origin"}
                    onClick={() => {
                      setFromOpen(false);
                      setToOpen(false);
                      setActiveMobileAirportPicker("origin");
                    }}
                    className="focus-ring flex h-full w-full min-w-0 items-center rounded-md border-0 bg-transparent py-0 pl-0 pr-11 text-left text-[16px] text-slate-900 outline-none transition-colors sm:hidden"
                  >
                    <span className={cn("truncate", !from.trim() && "text-slate-400")}>
                      {from.trim() || t.fromPlaceholder || "From?"}
                    </span>
                  </button>
                  <input
                    ref={fromInputRef}
                    type="text"
                    value={from}
                    onChange={(
                      event
                    ) => {
                      const nextValue = event.target.value;
                      setFromState((current) => markOriginManualInput(current, nextValue));
                      if (nextValue.trim().length < 2) {
                        setFromLoading(false);
                        setFromLiveSuggestions([]);
                      }
                      setFromOpen(
                        true
                      );
                      setFromHighlight(
                        0
                      );
                    }}
                    onClick={() =>
                      setFromOpen(
                        true
                      )
                    }
                    onFocus={() =>
                      setFromOpen(
                        true
                      )
                    }
                    onKeyDown={(
                      event
                    ) =>
                      onKeyNav(
                        event,
                        true
                      )
                    }
                    placeholder={t.fromPlaceholder || "From?"}
                    className="focus-ring hidden h-full w-full min-w-0 rounded-md border-0 bg-transparent py-0 pl-0 pr-11 text-[16px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 sm:block md:text-sm"
                  />
                  {from.trim() ? (
                    <button
                      type="button"
                      onClick={onClearOrigin}
                      onMouseDown={(event) => event.preventDefault()}
                      aria-label={t.clearOrigin || "Clear origin"}
                      className="focus-ring absolute right-0 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-95 sm:inline-flex sm:h-8 sm:w-8"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>
                {shouldShowFromSuggestionsPanel ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-50 hidden max-h-[min(50vh,280px)] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl sm:block">
                    {isFromLoadingVisible ? (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        {t.searchingAirportsAndCities || "Searching airports and cities…"}
                      </div>
                    ) : fromSuggestions.length ? fromSuggestions.map(
                      (
                        option,
                        index
                      ) => (
                        <button
                          key={`${option.code}-${option.airport}`}
                          type="button"
                          onClick={() => {
                            setFromState((current) => markOriginManualInput(
                              current,
                              formatAirportLabel(option),
                              option.code
                            ));
                            setFromOpen(
                              false
                            );
                          }}
                          className={cn(
                            "block w-full px-3 py-2 text-left transition-colors",
                            fromHighlight ===
                              index
                              ? "bg-slate-100"
                              : "hover:bg-slate-50"
                          )}
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {option.city} (
                            {option.code})
                          </p>
                          <p className="text-xs leading-5 text-slate-600">
                            {option.airport}
                            {option.country
                              ? ` · ${option.country}`
                              : ""}
                          </p>
                        </button>
                      )
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        {t.noMatchingAirportsOrCities || "No matching airports or cities"}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={onSwapAirports}
                  className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  aria-label={t.swapOriginDestination || "Swap origin and destination"}
                >
                  <ArrowRightLeft size={14} />
                </button>
              </div>

              <div
                ref={toWrapRef}
                className="relative min-h-[54px] px-0 py-0 pl-3"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.destination ||
                    t.destination}
                </label>
                <div className="relative h-8">
                  <button
                    ref={toMobileLauncherRef}
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={activeMobileAirportPicker === "destination"}
                    onClick={() => {
                      setFromOpen(false);
                      setToOpen(false);
                      setActiveMobileAirportPicker("destination");
                    }}
                    className="focus-ring flex h-full w-full min-w-0 items-center rounded-md border-0 bg-transparent py-0 pl-0 pr-11 text-left text-[16px] text-slate-900 outline-none transition-colors sm:hidden"
                  >
                    <span className={cn("truncate", !to.trim() && "text-slate-400")}>
                      {to.trim() || t.toPlaceholder || "To?"}
                    </span>
                  </button>
                  <input
                    ref={toInputRef}
                    type="text"
                    value={to}
                    onChange={(
                      event
                    ) => {
                      const nextValue = event.target.value;
                      setTo(nextValue);
                      if (nextValue.trim().length < 2) {
                        setToLoading(false);
                        setToLiveSuggestions([]);
                      }
                      setToCode("");
                      setToOpen(
                        true
                      );
                      setToHighlight(
                        0
                      );
                    }}
                    onFocus={() =>
                      setToOpen(true)
                    }
                    onKeyDown={(
                      event
                    ) =>
                      onKeyNav(
                        event,
                        false
                      )
                    }
                    placeholder={t.toPlaceholder || "To?"}
                    className="focus-ring hidden h-full w-full min-w-0 rounded-md border-0 bg-transparent py-0 pl-0 pr-11 text-[16px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 sm:block md:text-sm"
                  />
                  {to.trim() ? (
                    <button
                      type="button"
                      onClick={onClearDestination}
                      onMouseDown={(event) => event.preventDefault()}
                      aria-label={t.clearDestination || "Clear destination"}
                      className="focus-ring absolute right-0 top-1/2 z-30 hidden h-9 w-9 -translate-y-1/2 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-95 sm:inline-flex sm:h-8 sm:w-8"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>
                {shouldShowToSuggestionsPanel ? (
                  <div className="absolute left-0 top-[calc(100%+6px)] z-50 hidden max-h-[min(50vh,280px)] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl sm:block">
                    {isToLoadingVisible ? (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        {t.searchingAirportsAndCities || "Searching airports and cities…"}
                      </div>
                    ) : toSuggestions.length ? toSuggestions.map(
                      (
                        option,
                        index
                      ) => (
                        <button
                          key={`${option.code}-${option.airport}`}
                          type="button"
                          onClick={() => {
                            setTo(
                              formatAirportLabel(
                                option
                              )
                            );
                            setToCode(
                              option.code
                            );
                            setToOpen(
                              false
                            );
                          }}
                          className={cn(
                            "block w-full px-3 py-2 text-left transition-colors",
                            toHighlight ===
                              index
                              ? "bg-slate-100"
                              : "hover:bg-slate-50"
                          )}
                        >
                          <p className="text-sm font-medium text-slate-900">
                            {option.city} (
                            {option.code})
                          </p>
                          <p className="text-xs leading-5 text-slate-600">
                            {option.airport}
                            {option.country
                              ? ` · ${option.country}`
                              : ""}
                          </p>
                        </button>
                      )
                    ) : (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        {t.noMatchingAirportsOrCities || "No matching airports or cities"}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              </div>

              <div
                ref={dateWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.departureDate ||
                    t.travelDates || "Travel dates"}
                </label>
                <button
                  type="button"
                  ref={flightDatesLauncherRef}
                  onClick={() =>
                    setFlightDatesOpen(
                      (
                        prev
                      ) => !prev
                    )
                  }
                  aria-expanded={
                    flightDatesOpen
                  }
                  aria-haspopup="dialog"
                  aria-label={t.chooseTravelDates || "Choose travel dates"}
                  className="focus-ring flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 pr-8 text-left text-[16px] text-slate-900 outline-none transition-colors md:text-sm"
                >
                  <Calendar
                    size={16}
                    className="shrink-0 text-slate-500"
                  />
                  <span className="truncate">
                    {dateSummary}
                  </span>
                </button>
                {departureDate ? (
                  <button
                    type="button"
                    onClick={onClearTravelDates}
                    onMouseDown={(event) => event.preventDefault()}
                    aria-label={t.clearTravelDates || "Clear travel dates"}
                    className="focus-ring absolute right-2 top-6 inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                  >
                    <X size={14} />
                  </button>
                ) : null}

                {flightDatesOpen ? (
                  <>
                    <FlightMobilePickerShell
                      open={flightDatesOpen}
                      title={t.chooseTravelDates || "Choose travel dates"}
                      titleId="homepage-flight-dates-title"
                      launcherRef={flightDatesLauncherRef}
                      footer={flightDatesFooter}
                      onClose={() => setFlightDatesOpen(false)}
                      contentClassName="px-4 py-4"
                    >
                      {renderFlightDateCalendar()}
                    </FlightMobilePickerShell>
                    <div role="dialog" aria-label={t.chooseTravelDates || "Choose travel dates"} className="absolute left-0 top-[calc(100%+8px)] z-50 hidden w-[min(92vw,560px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.14)] sm:block">
                    <p className="mb-2.5 text-sm font-semibold text-slate-900">
                      {t.chooseTravelDates || "Choose travel dates"}
                    </p>
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        aria-label="Previous month"
                        onClick={() =>
                          setVisibleMonthDate(
                            (prev) =>
                              addMonths(
                                prev,
                                -1
                              )
                          )
                        }
                        className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        aria-label="Next month"
                        onClick={() =>
                          setVisibleMonthDate(
                            (prev) =>
                              addMonths(
                                prev,
                                1
                              )
                          )
                        }
                        className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                      {[0, 1].map(
                        (monthOffset) => {
                          const monthDate =
                            addMonths(
                              visibleMonthDate,
                              monthOffset
                            );
                          const cells =
                            buildMonthCells(
                              monthDate
                            );
                          return (
                            <div
                              key={monthOffset}
                            >
                              <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                                {monthDate.toLocaleDateString(
                                  "en-US",
                                  {
                                    month:
                                      "long",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                              <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
                                {weekdays.map(
                                  (
                                    weekday
                                  ) => (
                                    <span
                                      key={
                                        weekday
                                      }
                                    >
                                      {
                                        weekday
                                      }
                                    </span>
                                  )
                                )}
                              </div>
                              <div className="grid grid-cols-7 gap-1">
                                {cells.map(
                                  (
                                    cell
                                  ) => {
                                    const day =
                                      cell.date;
                                    const iso =
                                      toIsoDate(
                                        day
                                      );
                                    const isDeparture =
                                      iso ===
                                      departureDate;
                                    const isReturn =
                                      iso ===
                                      returnDate;
                                    const isDisabledDate =
                                      !isSelectableFlightDate(
                                        day
                                      );
                                    const isInRange =
                                      !!(
                                        departureParsed &&
                                        returnParsed &&
                                        !isDisabledDate &&
                                        day >
                                          departureParsed &&
                                        day <
                                          returnParsed
                                      );
                                    if (
                                      !cell.isCurrentMonth
                                    ) {
                                      return (
                                        <span
                                          key={`placeholder-${iso}`}
                                          aria-hidden="true"
                                          className="h-8 w-8 justify-self-center"
                                        />
                                      );
                                    }

                                    return (
                                      <button
                                        key={
                                          iso
                                        }
                                        type="button"
                                        aria-label={`Select ${day.toLocaleDateString(
                                          "en-US",
                                          {
                                            month:
                                              "long",
                                            day: "numeric",
                                            year: "numeric",
                                          }
                                        )}`}
                                        onClick={() => {
                                          if (
                                            isDisabledDate ||
                                            !isSelectableFlightDate(
                                              day
                                            )
                                          ) {
                                            return;
                                          }

                                          onSelectDate(
                                            day
                                          );
                                        }}
                                        disabled={
                                          isDisabledDate
                                        }
                                        aria-disabled={
                                          isDisabledDate
                                        }
                                        className={cn(
                                          "focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed",
                                          isDisabledDate
                                            ? "text-slate-300 hover:bg-transparent"
                                            : "text-slate-900 hover:bg-indigo-50",
                                          isInRange &&
                                            "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100",
                                          (isDeparture ||
                                            isReturn) &&
                                            "bg-indigo-700 text-white hover:bg-indigo-700"
                                        )}
                                      >
                                        {day.getDate()}
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDepartureDate(
                            ""
                          );
                          setReturnDate("");
                        }}
                        className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {t.clear || "Clear"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFlightDatesOpen(
                            false
                          )
                        }
                        className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                      >
                        {t.done || "Done"}
                      </button>
                    </div>
                  </div>
                  </>
                ) : null}
              </div>

              <div
                ref={travelersWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.travelers}
                </label>
                <button
                  type="button"
                  aria-expanded={
                    travelersMenuOpen
                  }
                  aria-haspopup="dialog"
                  ref={travelersLauncherRef}
                  onClick={() => {
                    if (travelersMenuOpen) {
                      cancelTravelersDraft();
                      return;
                    }
                    openTravelersMenu();
                  }}
                  className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] text-slate-900 outline-none transition-colors md:text-sm"
                >
                  <span className="block text-sm font-medium text-slate-900">
                      {
                        travelerSummary
                      }
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                      travelersMenuOpen &&
                        "rotate-180"
                    )}
                  />
                </button>
                {travelersMenuOpen ? (
                  <>
                    <FlightMobilePickerShell
                      open={travelersMenuOpen}
                      title={t.travelers}
                      titleId="homepage-flight-travelers-title"
                      launcherRef={travelersLauncherRef}
                      footer={
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={applyTravelersDraft}
                            className="focus-ring rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                          >
                            {t.done || "Done"}
                          </button>
                        </div>
                      }
                      onClose={cancelTravelersDraft}
                      contentClassName="px-4 py-5"
                    >
                      {renderTravelersCabinPicker()}
                    </FlightMobilePickerShell>
                    <div role="dialog" aria-label="Travelers and cabin" className="absolute left-0 top-[calc(100%+8px)] z-50 hidden w-[min(92vw,320px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.14)] sm:block">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Travelers
                    </h3>
                    <div className="mt-3 divide-y divide-slate-100">
                      {[
                        { key: "adults", label: t.adultPlural || "Adults", subtitle: "18+", count: draftAdultCount, min: 1 },
                        { key: "children", label: t.childPlural || "Children", subtitle: "2–17", count: draftChildCount, min: 0 },
                        { key: "infants", label: t.infantPlural || "Infants", subtitle: "Under 2", count: draftInfantCount, min: 0 },
                      ].map((row) => {
                        const draftTravelerCount = draftAdultCount + draftChildCount + draftInfantCount;
                        const canDecrement = row.count > row.min;
                        const canIncrement =
                          draftTravelerCount < 9 &&
                          (row.key !== "infants" || draftInfantCount < draftAdultCount);

                        return (
                          <div key={row.key} className="flex items-center justify-between py-3 first:pt-1 last:pb-1">
                            <span>
                              <span className="block text-sm font-semibold text-slate-900">{row.label}</span>
                              <span className="block text-xs leading-5 text-slate-600">{row.subtitle}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => { if (row.key === "adults") { const nextAdults = Math.max(1, draftAdultCount - 1); setDraftAdultCount(nextAdults); setDraftInfantCount((current) => Math.min(current, nextAdults)); } if (row.key === "children") setDraftChildCount(Math.max(0, draftChildCount - 1)); if (row.key === "infants") setDraftInfantCount(Math.max(0, draftInfantCount - 1)); }} disabled={!canDecrement} className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="min-w-7 text-center text-sm font-semibold text-slate-900">{row.count}</span>
                              <button type="button" onClick={() => { if (row.key === "adults") { if (draftTravelerCount >= 9) return; setDraftAdultCount((current) => Math.min(9, current + 1)); return; } if (row.key === "children") { if (draftTravelerCount >= 9) return; setDraftChildCount((current) => Math.min(9, current + 1)); return; } if (row.key === "infants") { if (draftTravelerCount >= 9 || draftInfantCount >= draftAdultCount) return; setDraftInfantCount((current) => Math.min(draftAdultCount, current + 1)); } }} disabled={!canIncrement} className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide leading-4 text-slate-700">{t.cabinClass || "Cabin class"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                        {[["economy", t.economy || "Economy"],["premium-economy", t.premiumEconomy || "Premium economy"],["business", t.business || "Business"],["first", t.first || "First"]].map(([value, label]) => (
                          <button key={value} type="button" onClick={() => setDraftCabinClass(value)} className={cn("focus-ring rounded-md border px-2 py-1 text-xs font-medium leading-4 transition-colors text-center sm:text-xs", draftCabinClass === value ? "border-indigo-400 bg-indigo-50 text-indigo-900" : "border-slate-300 text-slate-700 hover:bg-slate-50")}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
                      <button type="button" onClick={applyTravelersDraft} className="focus-ring rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600">{t.done || "Done"}</button>
                    </div>
                  </div>
                  </>
                ) : null}
              </div>
              <div className="sm:col-span-2 lg:col-span-1 lg:min-h-[54px] lg:self-stretch">
                <Button
                  type="submit"
                  disabled={
                    isFlightSearchDisabled
                  }
                  aria-busy={isFlightSubmitting}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 lg:h-full lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-600/20"
                >
                  {isFlightSubmitting
                    ? t.searchingFlights || "Searching flights..."
                    : t.search ||
                      t.search}
                </Button>
              </div>
            </div>
          </div>
          {hasActiveFlightSearch ? (
            <div className="grid w-full grid-cols-1 px-1 pt-0.5 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] lg:px-0">
              <div className="flex justify-end lg:col-start-4">
                <button
                  type="button"
                  onClick={onResetFlightSearch}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.clearAll || t.clear}
                </button>
              </div>
            </div>
          ) : null}

          <MobileAirportPicker
            open={activeMobileAirportPicker === "origin"}
            title={t.chooseOrigin || "Choose origin"}
            inputId="homepage-origin-picker-search"
            value={from}
            suggestions={fromSuggestions}
            isLoading={isFromLoadingVisible}
            launcherRef={fromMobileLauncherRef}
            onChange={(nextValue) => {
              setFromState((current) => markOriginManualInput(current, nextValue));
              if (nextValue.trim().length < 2) {
                setFromLoading(false);
                setFromLiveSuggestions([]);
              }
              setFromHighlight(0);
            }}
            onClear={() => {
              setFromState((current) => markOriginManualInput(current, ""));
              setFromLoading(false);
              setFromLiveSuggestions([]);
              setFromHighlight(0);
            }}
            onSelect={(option) => {
              setFromState((current) => markOriginManualInput(current, formatAirportLabel(option), option.code));
              setActiveMobileAirportPicker(null);
            }}
            onClose={() => setActiveMobileAirportPicker(null)}
          />
          <MobileAirportPicker
            open={activeMobileAirportPicker === "destination"}
            title={t.chooseDestination || "Choose destination"}
            inputId="homepage-destination-picker-search"
            value={to}
            suggestions={toSuggestions}
            isLoading={isToLoadingVisible}
            launcherRef={toMobileLauncherRef}
            onChange={(nextValue) => {
              setTo(nextValue);
              if (nextValue.trim().length < 2) {
                setToLoading(false);
                setToLiveSuggestions([]);
              }
              setToCode("");
              setToHighlight(0);
            }}
            onClear={() => {
              setTo("");
              setToLoading(false);
              setToLiveSuggestions([]);
              setToCode("");
              setToHighlight(0);
            }}
            onSelect={(option) => {
              setTo(formatAirportLabel(option));
              setToCode(option.code);
              setActiveMobileAirportPicker(null);
            }}
            onClose={() => setActiveMobileAirportPicker(null)}
          />
        </form>
      ) : (
        <form
          onSubmit={
            onHotelSubmit
          }
          className="space-y-1.5"
        >
          <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_112px] lg:gap-0">
              <div className="min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.destination ||
                    t.destination}
                </label>
                <button
                  ref={hotelDestinationMobileLauncherRef}
                  type="button"
                  onClick={() => {
                    setHotelDestinationMobilePickerOpen(true);
                    setHotelDatesOpen(false);
                    setHotelGuestsRoomsOpen(false);
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={hotelDestinationMobilePickerOpen}
                  aria-label={t.chooseHotelDestination || "Choose hotel destination"}
                  className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] text-slate-900 outline-none transition-colors sm:hidden"
                >
                  <span className={cn("truncate", !destination.trim() && "text-slate-400")}>
                    {destination.trim() || t.cityOrHotel || "City or hotel"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "shrink-0 text-slate-500 transition-transform",
                      hotelDestinationMobilePickerOpen && "rotate-180",
                    )}
                  />
                </button>
                <input
                  type="text"
                  value={
                    destination
                  }
                  onChange={(
                    event
                  ) =>
                    setDestination(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder={t.cityOrHotel || "City or hotel"}
                  className="focus-ring hidden h-8 w-full rounded-md border-0 bg-transparent px-0 text-[16px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 sm:block md:text-sm"
                  required
                />
              </div>
              <div
                ref={hotelDateWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.departureDate ||
                    t.travelDates || "Travel dates"}
                </label>
                <button
                  ref={hotelDatesMobileLauncherRef}
                  type="button"
                  onClick={() => {
                    setHotelDatesOpen((prev) => !prev);
                    setHotelDestinationMobilePickerOpen(false);
                    setHotelGuestsRoomsOpen(false);
                  }}
                  aria-expanded={
                    hotelDatesOpen
                  }
                  aria-haspopup="dialog"
                  aria-label={t.chooseTravelDates || "Choose travel dates"}
                  className="focus-ring flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] text-slate-900 outline-none transition-colors md:text-sm"
                >
                  <Calendar
                    size={16}
                    className="shrink-0 text-slate-500"
                  />
                  <span className="truncate">
                    {hotelDateSummary}
                  </span>
                </button>
                {hotelDatesOpen ? (
                  <>
                    <div ref={hotelDatesPanelRef} className="absolute left-0 top-[calc(100%+8px)] z-50 hidden w-[min(92vw,560px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_36px_rgba(15,23,42,0.14)] sm:block">
                    <p className="mb-2.5 text-sm font-semibold text-slate-900">
                      {t.chooseTravelDates || "Choose travel dates"}
                    </p>
                    <div className="mb-3 flex items-center justify-between">
                      <button
                        type="button"
                        aria-label="Previous month"
                        onClick={() =>
                          setHotelVisibleMonthDate(
                            (prev) =>
                              addMonths(
                                prev,
                                -1
                              )
                          )
                        }
                        className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Prev
                      </button>
                      <button
                        type="button"
                        aria-label="Next month"
                        onClick={() =>
                          setHotelVisibleMonthDate(
                            (prev) =>
                              addMonths(
                                prev,
                                1
                              )
                          )
                        }
                        className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                      {[0, 1].map(
                        (monthOffset) => {
                          const monthDate =
                            addMonths(
                              hotelVisibleMonthDate,
                              monthOffset
                            );
                          const cells =
                            buildMonthCells(
                              monthDate
                            );
                          return (
                            <div
                              key={monthOffset}
                            >
                              <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                                {monthDate.toLocaleDateString(
                                  "en-US",
                                  {
                                    month:
                                      "long",
                                    year: "numeric",
                                  }
                                )}
                              </p>
                              <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-600">
                                {weekdays.map(
                                  (
                                    weekday
                                  ) => (
                                    <span
                                      key={
                                        weekday
                                      }
                                    >
                                      {
                                        weekday
                                      }
                                    </span>
                                  )
                                )}
                              </div>
                              <div className="grid grid-cols-7 gap-1">
                                {cells.map(
                                  (
                                    cell
                                  ) => {
                                    const day =
                                      cell.date;
                                    const iso =
                                      toIsoDate(
                                        day
                                      );
                                    const isCheckIn =
                                      iso ===
                                      checkIn;
                                    const isCheckOut =
                                      iso ===
                                      checkOut;
                                    const isPastDate =
                                      isBeforeToday(
                                        day
                                      );
                                    const isDisabledDate =
                                      isPastDate;
                                    const isInRange =
                                      !!(
                                        checkInParsed &&
                                        checkOutParsed &&
                                        !isDisabledDate &&
                                        day >
                                          checkInParsed &&
                                        day <
                                          checkOutParsed
                                      );
                                    if (
                                      !cell.isCurrentMonth
                                    ) {
                                      return (
                                        <span
                                          key={`placeholder-${iso}`}
                                          aria-hidden="true"
                                          className="h-8 w-8 justify-self-center"
                                        />
                                      );
                                    }

                                    return (
                                      <button
                                        key={
                                          iso
                                        }
                                        type="button"
                                        aria-label={`Select ${day.toLocaleDateString(
                                          "en-US",
                                          {
                                            month:
                                              "long",
                                            day: "numeric",
                                            year: "numeric",
                                          }
                                        )}`}
                                        onClick={() =>
                                          onSelectHotelDate(
                                            day
                                          )
                                        }
                                        disabled={
                                          isDisabledDate
                                        }
                                        aria-disabled={
                                          isDisabledDate
                                        }
                                        className={cn(
                                          "focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed",
                                          isDisabledDate
                                            ? "text-slate-300 hover:bg-transparent"
                                            : "text-slate-900 hover:bg-indigo-50",
                                          isInRange &&
                                            "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100",
                                          (isCheckIn ||
                                            isCheckOut) &&
                                            "bg-indigo-700 text-white hover:bg-indigo-700"
                                        )}
                                      >
                                        {day.getDate()}
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckIn("");
                          setCheckOut("");
                        }}
                        className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {t.clear || "Clear"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHotelDatesOpen(
                            false
                          )
                        }
                        className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                      >
                        {t.done || "Done"}
                      </button>
                    </div>
                  </div>
                  </>
                ) : null}
              </div>
              <div
                ref={hotelGuestsRoomsWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.guests ||
                    "Guests"}
                </label>
                <button
                  ref={hotelGuestsRoomsMobileLauncherRef}
                  type="button"
                  onClick={() => {
                    setHotelGuestsRoomsOpen((prev) => !prev);
                    setHotelDestinationMobilePickerOpen(false);
                    setHotelDatesOpen(false);
                  }}
                  aria-expanded={
                    hotelGuestsRoomsOpen
                  }
                  aria-haspopup="dialog"
                  aria-label="Choose guests and rooms"
                  className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-left text-[16px] text-slate-900 outline-none transition-colors md:text-sm"
                >
                  <span className="truncate">
                    {hotelGuestsRoomsSummary}
                  </span>
                  <ChevronDown
                    size={16}
                    className={cn(
                      "shrink-0 text-slate-500 transition-transform",
                      hotelGuestsRoomsOpen && "rotate-180"
                    )}
                  />
                </button>
                {hotelGuestsRoomsOpen ? (
                  <div className="absolute left-0 top-[calc(100%+8px)] z-30 hidden w-[min(92vw,320px)] rounded-xl border border-slate-200 bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.14)] sm:block">
                    <div className="space-y-3">
                      {[
                        {
                          key: "adults",
                          label: "Adults",
                          value: hotelAdultCount,
                          min: 1,
                          max: 12 - hotelChildCount,
                          onDecrement: () =>
                            setHotelAdultCount((prev) =>
                              Math.max(1, prev - 1)
                            ),
                          onIncrement: () =>
                            setHotelAdultCount((prev) =>
                              Math.min(12 - hotelChildCount, prev + 1)
                            ),
                        },
                        {
                          key: "children",
                          label: "Children",
                          value: hotelChildCount,
                          min: 0,
                          max: 12 - hotelAdultCount,
                          onDecrement: () =>
                            setHotelChildCount((prev) =>
                              Math.max(0, prev - 1)
                            ),
                          onIncrement: () =>
                            setHotelChildCount((prev) =>
                              Math.min(12 - hotelAdultCount, prev + 1)
                            ),
                        },
                        {
                          key: "rooms",
                          label: "Rooms",
                          value: Number(rooms),
                          min: 1,
                          max: 6,
                          onDecrement: () =>
                            setRooms((prev) =>
                              String(
                                Math.max(
                                  1,
                                  Number(prev) - 1
                                )
                              )
                            ),
                          onIncrement: () =>
                            setRooms((prev) =>
                              String(
                                Math.min(
                                  6,
                                  Number(prev) + 1
                                )
                              )
                            ),
                        },
                      ].map((row) => {
                        const canDecrement = row.value > row.min;
                        const canIncrement = row.value < row.max;

                        return (
                          <div
                            key={row.key}
                            className="flex items-center justify-between gap-2.5"
                          >
                            <span className="text-sm font-semibold text-slate-900">
                              {row.label}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={row.onDecrement}
                                disabled={!canDecrement}
                                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="min-w-6 text-center text-sm font-semibold text-slate-900">
                                {row.value}
                              </span>
                              <button
                                type="button"
                                onClick={row.onIncrement}
                                disabled={!canIncrement}
                                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="border-t border-slate-200 pt-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Pet-friendly
                            </p>
                            <p className="pr-2 text-xs leading-5 text-slate-600">
                              Only show stays that allow pets
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={hotelPetFriendly}
                            aria-label="Toggle pet-friendly stays"
                            onClick={() =>
                              setHotelPetFriendly((prev) => !prev)
                            }
                            className={cn(
                              "focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
                              hotelPetFriendly
                                ? "border-indigo-600 bg-indigo-600"
                                : "border-slate-300 bg-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                                hotelPetFriendly
                                  ? "translate-x-5"
                                  : "translate-x-0.5"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="sm:col-span-2 lg:col-span-1 lg:min-h-[54px] lg:self-stretch">
                <Button
                  type="submit"
                  disabled={
                    isHotelSearchDisabled
                  }
                  aria-busy={isHotelSubmitting}
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 lg:h-full lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-600/20"
                >
                  {isHotelSubmitting
                    ? t.searchingHotels || "Searching hotels..."
                    : t.search ||
                      t.search}
                </Button>
              </div>
            </div>
          </div>

          <HotelDestinationMobilePicker
            open={hotelDestinationMobilePickerOpen}
            value={destination}
            titleId="homepage-hotel-mobile-destination-title"
            inputId="homepage-hotel-mobile-destination-input"
            launcherRef={hotelDestinationMobileLauncherRef}
            detectedCountryHint={countryHint}
            onChange={(nextDestination) => setDestination(nextDestination)}
            onClose={() => setHotelDestinationMobilePickerOpen(false)}
          />

          <HotelMobilePickerShell
            open={hotelDatesOpen}
            title={t.chooseTravelDates || "Choose travel dates"}
            titleId="homepage-hotel-mobile-dates-title"
            launcherRef={hotelDatesMobileLauncherRef}
            onClose={() => setHotelDatesOpen(false)}
            contentClassName="px-3 py-3"
            footer={
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCheckIn("");
                    setCheckOut("");
                  }}
                  className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {t.clear || "Clear"}
                </button>
                <button
                  type="button"
                  onClick={() => setHotelDatesOpen(false)}
                  className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  {t.done || "Done"}
                </button>
              </div>
            }
          >
            <div className="mx-auto flex w-full max-w-xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setHotelVisibleMonthDate((prev) => addMonths(prev, -1))}
                  className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setHotelVisibleMonthDate((prev) => addMonths(prev, 1))}
                  className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Next
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[0, 1].map((monthOffset) => {
                  const monthDate = addMonths(hotelVisibleMonthDate, monthOffset);
                  const cells = buildMonthCells(monthDate);

                  return (
                    <div key={monthOffset}>
                      <p className="mb-1 text-center text-sm font-black text-slate-900">
                        {monthDate.toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-500">
                        {weekdays.map((weekday) => (
                          <span key={weekday}>{weekday}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((cell) => {
                          const day = cell.date;
                          const iso = toIsoDate(day);
                          const isCheckIn = iso === checkIn;
                          const isCheckOut = iso === checkOut;
                          const isPastDate = isBeforeToday(day);
                          const isInvalidCheckOut = Boolean(checkIn && !checkOut && iso <= checkIn);
                          const isDisabledDate = isPastDate || isInvalidCheckOut;
                          const isInRange = Boolean(
                            checkInParsed &&
                              checkOutParsed &&
                              !isPastDate &&
                              day > checkInParsed &&
                              day < checkOutParsed,
                          );

                          if (!cell.isCurrentMonth) {
                            return (
                              <span
                                key={`homepage-mobile-placeholder-${iso}`}
                                aria-hidden="true"
                                className="h-8 w-8 justify-self-center min-[390px]:h-9 min-[390px]:w-9"
                              />
                            );
                          }

                          return (
                            <button
                              key={iso}
                              type="button"
                              aria-label={`Select ${day.toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric",
                              })}`}
                              onClick={() => onSelectHotelDate(day)}
                              disabled={isDisabledDate}
                              aria-disabled={isDisabledDate}
                              className={cn(
                                "focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm font-semibold transition-colors disabled:cursor-not-allowed min-[390px]:h-9 min-[390px]:w-9",
                                isDisabledDate
                                  ? "text-slate-300 hover:bg-transparent"
                                  : "text-slate-900 hover:bg-indigo-50",
                                isInRange && "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100",
                                (isCheckIn || isCheckOut) && "bg-indigo-700 text-white hover:bg-indigo-700",
                              )}
                            >
                              {day.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </HotelMobilePickerShell>

          <HotelMobilePickerShell
            open={hotelGuestsRoomsOpen}
            title="Guests and rooms"
            titleId="homepage-hotel-mobile-guests-title"
            launcherRef={hotelGuestsRoomsMobileLauncherRef}
            onClose={() => setHotelGuestsRoomsOpen(false)}
            footer={
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setHotelGuestsRoomsOpen(false)}
                  className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  {t.done || "Done"}
                </button>
              </div>
            }
          >
            <div className="mx-auto w-full max-w-xl space-y-4 rounded-2xl bg-white p-4 shadow-sm">
              {[
                {
                  key: "adults",
                  label: "Adults",
                  value: hotelAdultCount,
                  min: 1,
                  max: 12 - hotelChildCount,
                  onDecrement: () => setHotelAdultCount((prev) => Math.max(1, prev - 1)),
                  onIncrement: () =>
                    setHotelAdultCount((prev) => Math.min(12 - hotelChildCount, prev + 1)),
                },
                {
                  key: "children",
                  label: "Children",
                  value: hotelChildCount,
                  min: 0,
                  max: 12 - hotelAdultCount,
                  onDecrement: () => setHotelChildCount((prev) => Math.max(0, prev - 1)),
                  onIncrement: () =>
                    setHotelChildCount((prev) => Math.min(12 - hotelAdultCount, prev + 1)),
                },
                {
                  key: "rooms",
                  label: "Rooms",
                  value: Number(rooms),
                  min: 1,
                  max: 6,
                  onDecrement: () => setRooms((prev) => String(Math.max(1, Number(prev) - 1))),
                  onIncrement: () => setRooms((prev) => String(Math.min(6, Number(prev) + 1))),
                },
              ].map((row) => {
                const canDecrement = row.value > row.min;
                const canIncrement = row.value < row.max;

                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="text-sm font-bold text-slate-950">{row.label}</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={row.onDecrement}
                        disabled={!canDecrement}
                        className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="min-w-8 text-center text-base font-bold text-slate-950">
                        {row.value}
                      </span>
                      <button
                        type="button"
                        onClick={row.onIncrement}
                        disabled={!canIncrement}
                        className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-bold text-slate-950">Pet-friendly</p>
                  <p className="text-sm leading-5 text-slate-600">
                    Only show stays that allow pets
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={hotelPetFriendly}
                  aria-label="Toggle pet-friendly stays"
                  onClick={() => setHotelPetFriendly((prev) => !prev)}
                  className={cn(
                    "focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors",
                    hotelPetFriendly
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-slate-300 bg-slate-200",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform",
                      hotelPetFriendly ? "translate-x-5" : "translate-x-0.5",
                    )}
                  />
                </button>
              </div>
            </div>
          </HotelMobilePickerShell>
        </form>
      )}
      </section>
    </>
  );
}
