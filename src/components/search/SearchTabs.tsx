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
  Plane,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
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
  const tripTypeWrapRef =
    useRef<HTMLDivElement>(null);

  const [tab, setTab] =
    useState<TabMode>("flights");

  const [tripType, setTripType] =
    useState<TripType>(
      "round-trip"
    );
  const [tripTypeOpen, setTripTypeOpen] =
    useState(false);

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
    travelers,
    setTravelers,
  ] = useState("1");

  const [
    cabinClass,
    setCabinClass,
  ] = useState("economy");

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

  const [rooms, setRooms] =
    useState("1");

  const wrapper = useMemo(
    () =>
      cn(
        "rounded-2xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.10)]",
        compactHero
          ? "p-1.5 sm:p-2"
          : "p-2"
      ),
    [compactHero]
  );

  const fromSuggestions = fromLiveSuggestions;
  const toSuggestions = toLiveSuggestions;

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
              ? payload.suggestions
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
              ? payload.suggestions
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
        const payload = (await response.json()) as { recommendedOrigin?: AirportOption | null };
        if (payload.recommendedOrigin && !hasUserEditedOrigin && !from.trim()) {
          setFrom(formatAirportLabel(payload.recommendedOrigin));
          setFromCode(payload.recommendedOrigin.code);
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
        !tripTypeWrapRef.current?.contains(
          event.target as Node
        )
      ) {
        setTripTypeOpen(false);
      }
    };
    const onEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === "Escape") {
        setFlightDatesOpen(
          false
        );
        setTripTypeOpen(false);
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
  }, []);

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
      (_, index) =>
        new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate() +
            index
        )
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
        travelers,
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

    router.push(
      `/flights/results?${params.toString()}`
    );
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

    const params =
      new URLSearchParams({
        destination:
          destination.trim(),
        checkIn,
        checkOut,
        guests: String(
          Math.min(
            12,
            Math.max(
              1,
              Number(guests || 1)
            )
          )
        ),
        rooms: String(
          Math.min(
            6,
            Math.max(
              1,
              Number(rooms || 1)
            )
          )
        ),
      });

    router.push(
      `/hotels/results?${params.toString()}`
    );
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
            "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
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
            "focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
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
          className="space-y-1.5"
        >
          <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] lg:gap-0">
              <div className="grid grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-stretch rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200">
              <div
                ref={fromWrapRef}
                className="relative min-h-[54px] px-0 py-0 pr-2"
              >
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
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
                  className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400"
                  required
                />
                {fromOpen ? (
                  <div className="absolute left-0 right-0 z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {from.trim().length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">Start typing a city or airport</div>
                    ) : fromLoading ? (
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
                          <p className="text-xs text-slate-500">
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
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
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
                  className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400"
                  required
                />
                {toOpen ? (
                  <div className="absolute left-0 right-0 z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {to.trim().length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">Start typing a city or airport</div>
                    ) : toLoading ? (
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
                          <p className="text-xs text-slate-500">
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
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
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
                  <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 w-full rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:right-auto sm:w-[min(92vw,620px)] sm:p-4">
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
                              <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
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
                                    day
                                  ) => {
                                    const iso =
                                      toIsoDate(
                                        day
                                      );
                                    const inCurrentMonth =
                                      day.getMonth() ===
                                      monthDate.getMonth();
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
                                            : inCurrentMonth
                                              ? "text-slate-900 hover:bg-indigo-50"
                                              : "text-slate-300 hover:bg-indigo-50",
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

              <div className="grid min-h-[54px] grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{t.travelers || "Travelers"}</label>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    value={
                      travelers
                    }
                    onChange={(
                      event
                    ) =>
                      setTravelers(
                        String(
                          Math.min(
                            9,
                            Math.max(
                              1,
                              Number(
                                event
                                  .target
                                  .value ||
                                  1
                              )
                            )
                          )
                        )
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.cabinClass ||
                      "Cabin class"}
                  </label>
                  <select
                    value={
                      cabinClass
                    }
                    onChange={(
                      event
                    ) =>
                      setCabinClass(
                        event
                          .target
                          .value
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm outline-none transition-colors"
                  >
                    <option value="economy">
                      Economy
                    </option>
                    <option value="premium-economy">
                      Premium
                      economy
                    </option>
                    <option value="business">
                      Business
                    </option>
                    <option value="first">
                      First
                    </option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-1">
                <Button
                  type="submit"
                  disabled={
                    isFlightSearchDisabled
                  }
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-950 to-violet-800 px-4 text-sm font-bold text-white shadow-md shadow-indigo-900/30 lg:h-[54px]"
                >
                  {t.search ||
                    "Search"}
                </Button>
              </div>
            </div>
          </div>
          <div className="pt-0.5 lg:px-1">
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
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900"
              >
                {tripTypeLabel(
                  tripType
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    "text-[10px] leading-none text-slate-500 transition-transform",
                    tripTypeOpen &&
                      "rotate-180"
                  )}
                >
                  ▾
                </span>
              </button>

              {tripTypeOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full z-30 mt-1 min-w-[190px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
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
                        "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-colors",
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
                    className="mt-0.5 flex w-full cursor-not-allowed items-center rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-400"
                  >
                    Multi-city —
                    Coming soon
                  </button>
                </div>
              )}
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
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_112px] lg:gap-0">
              <div className="min-h-[54px] rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
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
                  className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors placeholder:text-slate-400"
                  required
                />
              </div>
              <div className="grid min-h-[54px] grid-cols-1 gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-2 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.checkIn ||
                      "Check-in"}
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(
                      event
                    ) =>
                      setCheckIn(
                        event
                          .target
                          .value
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors"
                    required
                  />
                </div>
                <span className="hidden items-center text-slate-300 sm:flex">
                  —
                </span>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.checkOut ||
                      "Check-out"}
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    min={
                      checkIn ||
                      undefined
                    }
                    onChange={(
                      event
                    ) =>
                      setCheckOut(
                        event
                          .target
                          .value
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm text-slate-950 outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="grid min-h-[54px] grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.guests ||
                      "Guests"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={guests}
                    onChange={(
                      event
                    ) =>
                      setGuests(
                        String(
                          Math.min(
                            12,
                            Math.max(
                              1,
                              Number(
                                event
                                  .target
                                  .value ||
                                  1
                              )
                            )
                          )
                        )
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {t.rooms ||
                      "Rooms"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={rooms}
                    onChange={(
                      event
                    ) =>
                      setRooms(
                        String(
                          Math.min(
                            6,
                            Math.max(
                              1,
                              Number(
                                event
                                  .target
                                  .value ||
                                  1
                              )
                            )
                          )
                        )
                      )
                    }
                    className="focus-ring h-8 w-full rounded-md border-0 bg-transparent px-0 text-sm outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <Button
                  type="submit"
                  disabled={
                    isHotelSearchDisabled
                  }
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-950 to-violet-800 px-4 text-sm font-bold text-white shadow-md shadow-indigo-900/30 lg:h-[54px]"
                >
                  {t.search ||
                    "Search"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}
