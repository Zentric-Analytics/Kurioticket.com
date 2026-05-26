"use client";

import {
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
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  buildFlightRecentSearch,
  buildHotelRecentSearch,
  upsertRecentSearch,
} from "@/lib/recent-searches";
import { RecentSearches } from "@/components/search/RecentSearches";
import {
  formatAirportLabel,
  type AirportOption,
} from "@/data/airports";

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
  fallback?: boolean;
  source?: string;
};

type RecommendedOrigin = AirportOption & {
  confidence?: number;
};

const normalizeSuggestionText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();

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
  value === "business" || value === "first"
    ? value
    : "economy";

export function SearchTabs({
  t,
  compactHero = false,
}: SearchTabsProps) {
  const router = useRouter();

  const fromWrapRef =
    useRef<HTMLDivElement>(null);

  const toWrapRef =
    useRef<HTMLDivElement>(null);
  const dateWrapRef =
    useRef<HTMLDivElement>(null);
  const hotelDateWrapRef =
    useRef<HTMLDivElement>(null);
  const tripTypeWrapRef =
    useRef<HTMLDivElement>(null);
  const travelersWrapRef =
    useRef<HTMLDivElement>(null);
  const hotelGuestsRoomsWrapRef =
    useRef<HTMLDivElement>(null);

  const [tab, setTab] =
    useState<TabMode>("flights");

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

  const [from, setFrom] =
    useState("");
  const [fromCode, setFromCode] =
    useState("");
  const [hasUserEditedOrigin, setHasUserEditedOrigin] = useState(false);
  const [originPrefillAttempted, setOriginPrefillAttempted] = useState(false);

  const [to, setTo] =
    useState("");
  const [toCode, setToCode] =
    useState("");

  const [fromOpen, setFromOpen] =
    useState(false);

  const [toOpen, setToOpen] =
    useState(false);
  const [
    flightDatesOpen,
    setFlightDatesOpen,
  ] = useState(false);
  const [
    hotelDatesOpen,
    setHotelDatesOpen,
  ] = useState(false);

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

  const [guests, setGuests] =
    useState("1");
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

  const fromSuggestions = fromLiveSuggestions;
  const toSuggestions = toLiveSuggestions;
  const fromQuery = from.trim();
  const toQuery = to.trim();
  const shouldShowFromSuggestionsPanel =
    fromOpen &&
    fromQuery.length >= 2 &&
    (fromLoading || fromSuggestions.length > 0 || !fromLoading);
  const shouldShowToSuggestionsPanel =
    toOpen &&
    toQuery.length >= 2 &&
    (toLoading || toSuggestions.length > 0 || !toLoading);
  const normalizePassengerDraft = (
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
  };

  const openTravelersMenu = () => {
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizeCabinClass(cabinClass));
    setTravelersMenuOpen(true);
  };

  const cancelTravelersDraft = () => {
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClass(normalizeCabinClass(cabinClass));
    setTravelersMenuOpen(false);
  };

  const applyTravelersFromValues = (
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
  };

  const applyTravelersDraft = () => {
    applyTravelersFromValues(
      draftAdultCount,
      draftChildCount,
      draftInfantCount,
      draftCabinClass
    );
  };

  const buildPlacesUrl = (query: string, context: "origin" | "destination") => {
    const params = new URLSearchParams();
    if (query.length >= 2) params.set("q", query);
    params.set("context", context);
    if (countryHint) params.set("countryCode", countryHint);
    if (typeof navigator !== "undefined" && navigator.language) params.set("locale", navigator.language);


    return `/api/flights/places?${params.toString()}`;
  };


  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const language = navigator.language || "";
    const parts = language.split("-");
    if (parts.length > 1 && /^[A-Za-z]{2}$/.test(parts[1])) {
      setCountryHint(parts[1].toUpperCase());
    }
  }, []);


  useEffect(() => {
    const query = from.trim();
    if (query.length < 2) {
      setFromLoading(false);
      setFromLiveSuggestions([]);
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
  }, [from, countryHint]);

  useEffect(() => {
    const query = to.trim();
    if (query.length < 2) {
      setToLoading(false);
      setToLiveSuggestions([]);
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
  }, [to, countryHint]);

  useEffect(() => {
    if (originPrefillAttempted || hasUserEditedOrigin || from.trim()) return;

    const controller = new AbortController();

    const loadRecommendedOrigin = async () => {
      try {
        const response = await fetch(buildPlacesUrl("", "origin") + "&defaultOrigin=true", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { recommendedOrigin?: RecommendedOrigin | null };
        const recommended = payload.recommendedOrigin;
        if (recommended && (recommended.confidence ?? 0) >= 0.7 && !hasUserEditedOrigin && !from.trim()) {
          setFrom(formatAirportLabel(recommended));
          setFromCode(recommended.code);
        }
      } catch {
        // no-op
      } finally {
        if (!controller.signal.aborted) {
          setOriginPrefillAttempted(true);
        }
      }
    };

    void loadRecommendedOrigin();

    return () => controller.abort();
  }, [originPrefillAttempted, hasUserEditedOrigin, from, countryHint]);

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
      if (
        !fromWrapRef.current?.contains(
          event.target as Node
        )
      ) {
        setFromOpen(false);
      }

      if (
        !toWrapRef.current?.contains(
          event.target as Node
        )
      ) {
        setToOpen(false);
      }
      if (
        !dateWrapRef.current?.contains(
          event.target as Node
        )
      ) {
        setFlightDatesOpen(
          false
        );
      }
      if (
        !hotelDateWrapRef.current?.contains(
          event.target as Node
        )
      ) {
        setHotelDatesOpen(false);
      }
      if (
        !tripTypeWrapRef.current?.contains(
          event.target as Node
        )
      ) {
        setTripTypeOpen(false);
      }
      if (
        !travelersWrapRef.current?.contains(
          event.target as Node
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
          event.target as Node
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
  }, [travelersMenuOpen, adultCount, childCount, infantCount, cabinClass]);

  const hotelGuestsRoomsSummary = `${guests} ${Number(guests) === 1 ? "guest" : "guests"}, ${rooms} ${Number(rooms) === 1 ? "room" : "rooms"}`;

  useEffect(() => {
    const normalizedAdults = Math.max(1, Math.min(12, hotelAdultCount));
    const maxChildrenAllowed = Math.max(0, 12 - normalizedAdults);
    const normalizedChildren = Math.max(0, Math.min(maxChildrenAllowed, hotelChildCount));
    const totalGuests = normalizedAdults + normalizedChildren;

    if (normalizedAdults !== hotelAdultCount) {
      setHotelAdultCount(normalizedAdults);
      return;
    }

    if (normalizedChildren !== hotelChildCount) {
      setHotelChildCount(normalizedChildren);
      return;
    }

    const nextGuests = String(totalGuests);
    if (guests !== nextGuests) {
      setGuests(nextGuests);
    }
  }, [hotelAdultCount, hotelChildCount, guests]);

  useEffect(() => {
    const normalizedTotalGuests = Number(clampNumberInput(guests, 1, 12));
    const currentTotal = hotelAdultCount + hotelChildCount;
    if (normalizedTotalGuests === currentTotal) {
      return;
    }

    const nextAdults = Math.max(1, Math.min(hotelAdultCount, normalizedTotalGuests));
    const nextChildren = Math.max(0, normalizedTotalGuests - nextAdults);
    setHotelAdultCount(nextAdults);
    setHotelChildCount(nextChildren);
  }, [guests, hotelAdultCount, hotelChildCount]);

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
        return "Travel dates";
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
    if (!value) return null;
    const [year, month, day] =
      value.split("-");
    if (
      !year ||
      !month ||
      !day
    ) {
      return null;
    }
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
    return Number.isNaN(
      parsed.getTime()
    )
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

  const onSelectDate = (
    date: Date
  ) => {
    if (isBeforeToday(date)) {
      return;
    }

    const selectedIso =
      toIsoDate(date);

    if (tripType === "one-way") {
      setDepartureDate(
        selectedIso
      );
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
      setDepartureDate(
        selectedIso
      );
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
        t.tripRound ||
        "Round-trip"
      );
    }

    if (mode === "one-way") {
      return (
        t.tripOneWay ||
        "One-way"
      );
    }

    return (
      t.tripMulti ||
      "Multi-city"
    );
  };

  const travelerCount = adultCount + childCount + infantCount;

  const normalizedCabinClass =
    normalizeCabinClass(cabinClass);
  const cabinClassLabel =
    normalizedCabinClass ===
    "business"
      ? "Business"
      : normalizedCabinClass ===
          "first"
        ? "First"
        : "Economy";

  const travelerSummary = useMemo(() => {
    const parts: string[] = [];

    if (adultCount > 0) {
      parts.push(`${adultCount} ${adultCount === 1 ? "adult" : "adults"}`);
    }
    if (childCount > 0) {
      parts.push(`${childCount} ${childCount === 1 ? "child" : "children"}`);
    }
    if (infantCount > 0) {
      parts.push(`${infantCount} ${infantCount === 1 ? "infant" : "infants"}`);
    }

    const baseSummary = parts.length > 0 ? parts.join(", ") : `${travelerCount} travelers`;
    return `${baseSummary}, ${cabinClassLabel}`;
  }, [adultCount, childCount, infantCount, travelerCount, cabinClassLabel]);

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

    const setValue = isFrom
      ? setFrom
      : setTo;

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

      setValue(
        formatAirportLabel(
          list[active]
        )
      );
      if (isFrom) {
        setFromCode(
          list[active].code
        );
      } else {
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

    setFrom(to);
    setFromCode(toCode);
    setTo(fromValue);
    setToCode(fromCanonicalCode);
    setFromOpen(false);
    setToOpen(false);
  };

  const isFlightSearchDisabled =
    !from.trim() ||
    !to.trim() ||
    !departureDate ||
    (tripType ===
      "round-trip" &&
      !returnDate);

  const onFlightSubmit = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      isFlightSearchDisabled
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
        cabinClass,
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
        })
      );
    } catch {
      // best effort only
    }

    router.push(href);
  };

  const isHotelSearchDisabled =
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
    setGuests(normalizedGuests);
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
      upsertRecentSearch(
        buildHotelRecentSearch({
          destination: params.get("destination") ?? "",
          checkIn: params.get("checkIn") ?? "",
          checkOut: params.get("checkOut") ?? "",
          guests: Number(params.get("guests") ?? "1"),
          rooms: Number(params.get("rooms") ?? "1"),
        })
      );
    } catch {
      // best effort only
    }

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

  return (
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
          {t.flights ||
            "Flights"}
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
          {t.hotels ||
            "Hotels"}
        </button>
      </div>

      {tab === "flights" ? (
        <form
          onSubmit={
            onFlightSubmit
          }
          className="space-y-2"
        >
          <div className="px-1">
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
                    Coming soon
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] lg:gap-0">
              <div className="grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-stretch rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200">
              <div
                ref={fromWrapRef}
                className="relative min-h-[54px] px-0 py-0 pr-2"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.origin ||
                    "Origin"}
                </label>
                <input
                  type="text"
                  value={from}
                  onChange={(
                    event
                  ) => {
                    setHasUserEditedOrigin(true);
                    setFrom(
                      event
                        .target
                        .value
                    );
                    setFromCode("");
                    setFromOpen(
                      true
                    );
                    setFromHighlight(
                      0
                    );
                  }}
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
                  placeholder="From?"
                  className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-500"
                  required
                />
                {shouldShowFromSuggestionsPanel ? (
                  <div className="absolute left-0 right-0 z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {fromLoading ? (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        Searching airports and cities…
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
                            setFrom(
                              formatAirportLabel(
                                option
                              )
                            );
                            setFromCode(
                              option.code
                            );
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
                        No matching airports or cities
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={onSwapAirports}
                  className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
                  aria-label="Swap origin and destination"
                >
                  <ArrowRightLeft size={14} />
                </button>
              </div>

              <div
                ref={toWrapRef}
                className="relative min-h-[54px] px-0 py-0 pl-2"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.destination ||
                    "Destination"}
                </label>
                <input
                  type="text"
                  value={to}
                  onChange={(
                    event
                  ) => {
                    setTo(
                      event.target
                        .value
                    );
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
                  placeholder="To?"
                  className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-500"
                  required
                />
                {shouldShowToSuggestionsPanel ? (
                  <div className="absolute left-0 right-0 z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {toLoading ? (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        Searching airports and cities…
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
                        No matching airports or cities
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
              </div>

              <div
                ref={dateWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.departureDate ||
                    "Travel dates"}
                </label>
                <button
                  type="button"
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
                  aria-label="Choose travel dates"
                  className="focus-ring flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-left text-sm text-slate-950 outline-none transition-colors"
                >
                  <Calendar
                    size={16}
                    className="shrink-0 text-slate-500"
                  />
                  <span className="truncate">
                    {dateSummary}
                  </span>
                </button>

                {flightDatesOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[200] w-full rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:right-auto sm:w-[min(92vw,620px)] sm:p-4">
                    <p className="mb-3 text-base font-semibold text-slate-900">
                      Choose travel dates
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
                                    const isPastDate =
                                      isBeforeToday(
                                        day
                                      );
                                    const isInRange =
                                      !!(
                                        departureParsed &&
                                        returnParsed &&
                                        !isPastDate &&
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
                                        onClick={() =>
                                          onSelectDate(
                                            day
                                          )
                                        }
                                        disabled={
                                          isPastDate
                                        }
                                        className={cn(
                                          "focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed",
                                          isPastDate
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
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
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
                        Clear
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
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                ref={travelersWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.travelers ||
                    "Travelers"}
                </label>
                <button
                  type="button"
                  aria-expanded={
                    travelersMenuOpen
                  }
                  aria-haspopup="dialog"
                  onClick={() => {
                    if (travelersMenuOpen) {
                      cancelTravelersDraft();
                      return;
                    }
                    openTravelersMenu();
                  }}
                  className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-left text-sm text-slate-950 outline-none transition-colors"
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
                  <div className="absolute left-1/2 top-full z-50 mt-2 w-[min(92vw,320px)] max-w-[330px] max-h-[70vh] overflow-y-auto -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg shadow-slate-900/10 sm:p-3 lg:left-auto lg:right-0 lg:w-[350px] lg:max-h-none lg:translate-x-0 lg:overflow-visible">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">
                        Travelers
                      </p>
                      <button type="button" onClick={cancelTravelersDraft} aria-label="Close passenger selector" className="focus-ring inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 text-sm leading-none text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">×</button>
                    </div>
                    <div className="mt-1.5 divide-y divide-slate-200">
                      {[
                        { key: "adults", label: "Adults", subtitle: "18+", count: draftAdultCount, min: 1 },
                        { key: "children", label: "Children", subtitle: "2–17", count: draftChildCount, min: 0 },
                        { key: "infants", label: "Infants", subtitle: "Under 2", count: draftInfantCount, min: 0 },
                      ].map((row) => {
                        const draftTravelerCount = draftAdultCount + draftChildCount + draftInfantCount;
                        const canDecrement = row.count > row.min;
                        const canIncrement =
                          draftTravelerCount < 9 &&
                          (row.key !== "infants" || draftInfantCount < draftAdultCount);

                        return (
                          <div key={row.key} className="flex items-center justify-between py-2 first:pt-1 last:pb-1">
                            <span>
                              <span className="block text-sm font-semibold text-slate-900">{row.label}</span>
                              <span className="block text-xs leading-5 text-slate-600">{row.subtitle}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => { if (row.key === "adults") { const nextAdults = Math.max(1, draftAdultCount - 1); setDraftAdultCount(nextAdults); setDraftInfantCount((current) => Math.min(current, nextAdults)); } if (row.key === "children") setDraftChildCount(Math.max(0, draftChildCount - 1)); if (row.key === "infants") setDraftInfantCount(Math.max(0, draftInfantCount - 1)); }} disabled={!canDecrement} className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                              <span className="min-w-7 text-center text-sm font-semibold text-slate-900">{row.count}</span>
                              <button type="button" onClick={() => { if (row.key === "adults") { if (draftTravelerCount >= 9) return; setDraftAdultCount((current) => Math.min(9, current + 1)); return; } if (row.key === "children") { if (draftTravelerCount >= 9) return; setDraftChildCount((current) => Math.min(9, current + 1)); return; } if (row.key === "infants") { if (draftTravelerCount >= 9 || draftInfantCount >= draftAdultCount) return; setDraftInfantCount((current) => Math.min(draftAdultCount, current + 1)); } }} disabled={!canIncrement} className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 border-t border-slate-200 pt-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide leading-4 text-slate-700">Cabin Class</p>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {[["economy", "Economy"],["business", "Business"],["first", "First"]].map(([value, label]) => (
                          <button key={value} type="button" onClick={() => setDraftCabinClass(value)} className={cn("focus-ring rounded-md border px-2 py-1 text-xs font-medium leading-4 transition-colors text-center sm:text-xs", draftCabinClass === value ? "border-indigo-400 bg-indigo-50 text-indigo-900" : "border-slate-300 text-slate-700 hover:bg-slate-50")}>{label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-200 pt-2">
                      <button type="button" onClick={applyTravelersDraft} className="focus-ring rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600">Done</button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="sm:col-span-2 lg:col-span-1 lg:min-h-[54px] lg:self-stretch">
                <Button
                  type="submit"
                  disabled={
                    isFlightSearchDisabled
                  }
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-950 to-violet-800 px-4 text-sm font-bold text-white shadow-md shadow-indigo-900/30 lg:h-full lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-900/30"
                >
                  {t.search ||
                    "Search"}
                </Button>
              </div>
            </div>
          </div>
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
              <div className="min-h-[54px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.destination ||
                    "Destination"}
                </label>
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
                  placeholder="City or hotel"
                  className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-500"
                  required
                />
              </div>
              <div
                ref={hotelDateWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.departureDate ||
                    "Travel dates"}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setHotelDatesOpen(
                      (
                        prev
                      ) => !prev
                    )
                  }
                  aria-expanded={
                    hotelDatesOpen
                  }
                  aria-haspopup="dialog"
                  aria-label="Choose travel dates"
                  className="focus-ring flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-left text-sm text-slate-950 outline-none transition-colors"
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
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[200] w-full rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:right-auto sm:w-[min(92vw,620px)] sm:p-4">
                    <p className="mb-3 text-base font-semibold text-slate-900">
                      Choose travel dates
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
                                    const isInRange =
                                      !!(
                                        checkInParsed &&
                                        checkOutParsed &&
                                        !isPastDate &&
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
                                          isPastDate
                                        }
                                        className={cn(
                                          "focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed",
                                          isPastDate
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
                        Clear
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
                        Done
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div
                ref={hotelGuestsRoomsWrapRef}
                className="relative min-h-[54px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200"
              >
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide leading-4 text-slate-600">
                  {t.guests ||
                    "Guests"}
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setHotelGuestsRoomsOpen(
                      (prev) => !prev
                    )
                  }
                  aria-expanded={
                    hotelGuestsRoomsOpen
                  }
                  aria-haspopup="dialog"
                  aria-label="Choose guests and rooms"
                  className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-left text-sm text-slate-950 outline-none transition-colors"
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
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 w-[calc(100vw-24px)] max-w-[330px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-[0_14px_32px_rgba(15,23,42,0.14)] max-sm:max-h-[min(70vh,360px)] sm:right-auto sm:w-[min(92vw,320px)] sm:max-w-[320px]">
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
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-950 to-violet-800 px-4 text-sm font-bold text-white shadow-md shadow-indigo-900/30 lg:h-full lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-900/30"
                >
                  {t.search ||
                    "Search"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      <RecentSearches />
    </section>
  );
}
