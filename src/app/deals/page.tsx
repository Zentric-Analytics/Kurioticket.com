"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown, Minus, Plus, X } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";

type PackageMode =
  | "hotel-flight"
  | "hotel-flight-car"
  | "flight-car"
  | "hotel-car";
type CabinClass = "economy" | "business" | "first";

const packageModes: Array<{
  value: PackageMode;
  label: string;
  includesFlight: boolean;
  includesHotel: boolean;
  includesCar: boolean;
}> = [
  {
    value: "hotel-flight",
    label: "Hotel + Flight",
    includesFlight: true,
    includesHotel: true,
    includesCar: false,
  },
  {
    value: "hotel-flight-car",
    label: "Hotel + Flight + Car",
    includesFlight: true,
    includesHotel: true,
    includesCar: true,
  },
  {
    value: "flight-car",
    label: "Flight + Car",
    includesFlight: true,
    includesHotel: false,
    includesCar: true,
  },
  {
    value: "hotel-car",
    label: "Hotel + Car",
    includesFlight: false,
    includesHotel: true,
    includesCar: true,
  },
];

const dealsHeroImage =
  "https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?auto=format&fit=crop&w=1200&q=80";

const cabinClasses: Array<{ value: CabinClass; label: string }> = [
  { value: "economy", label: "Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First" },
];

const destinationIdeas = [
  {
    city: "Tokyo",
    country: "Japan",
    destinationQuery: "Tokyo",
    image:
      "https://images.pexels.com/photos/31344755/pexels-photo-31344755.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Tokyo skyline with dense high-rise buildings in daylight",
  },
  {
    city: "London",
    country: "United Kingdom",
    destinationQuery: "London",
    image:
      "https://images.pexels.com/photos/33843218/pexels-photo-33843218.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Tower Bridge and the River Thames in London under a blue sky",
  },
  {
    city: "Paris",
    country: "France",
    destinationQuery: "Paris",
    image:
      "https://images.pexels.com/photos/2082103/pexels-photo-2082103.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Eiffel Tower and the Seine River in Paris at golden hour",
  },
  {
    city: "Dubai",
    country: "United Arab Emirates",
    destinationQuery: "Dubai",
    image:
      "https://images.pexels.com/photos/21765772/pexels-photo-21765772.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "Dubai skyline with the Burj Khalifa rising above skyscrapers",
  },
  {
    city: "Cancun",
    country: "Mexico",
    destinationQuery: "Cancun",
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Cancun beach with white sand and turquoise water",
  },
  {
    city: "Rome",
    country: "Italy",
    destinationQuery: "Rome",
    image:
      "https://images.pexels.com/photos/1701595/pexels-photo-1701595.jpeg?auto=compress&cs=tinysrgb&w=1200",
    imageAlt: "The Colosseum in Rome beneath a clear blue sky",
  },
];

const copy = {
  en: {
    title: "Find travel deals for your next trip",
    subtitle: "Search flights, stays, and cars together in one place.",
    modeLegend: "Choose package type",
    origin: "Where from?",
    destination: "Where to?",
    dates: "Travel dates",
    dateDialog: "Choose travel dates",
    departDate: "Departure",
    returnDate: "Return",
    travelersRooms: "Travelers / rooms",
    adults: "Adults",
    children: "Children",
    rooms: "Rooms",
    driverAge: "Driver age",
    cabinClass: "Cabin class",
    clear: "Clear",
    clearAll: "Clear all",
    clearOrigin: "Clear origin",
    clearDestination: "Clear destination",
    done: "Done",
    next: "Next",
    previous: "Prev",
    search: "Search",
    errors: {
      origin: "Enter a departure city or airport.",
      destination: "Enter a destination.",
      startDate: "Choose a start date.",
      endDate: "Choose an end date.",
      dateOrder: "End date must be after start date.",
      adults: "At least one adult is required.",
      children: "Children cannot be below zero.",
      rooms: "At least one room is required.",
      guests: "At least one guest is required.",
    },
    destinationIdeasTitle: "Places to start your deal search",
    destinationIdeasSubtitle:
      "Choose a destination idea, then compare provider results when you continue.",
  },
  fr: {
    title: "Trouvez des offres voyage pour votre prochain trajet",
    subtitle:
      "Recherchez vols, séjours et voitures ensemble, puis comparez les résultats des fournisseurs lorsque vous continuez.",
    modeLegend: "Choisir le type de forfait",
    origin: "D’où partez-vous?",
    destination: "Où allez-vous?",
    dates: "Dates du voyage",
    dateDialog: "Choisir les dates du voyage",
    departDate: "Départ",
    returnDate: "Retour",
    travelersRooms: "Voyageurs / chambres",
    adults: "Adultes",
    children: "Enfants",
    rooms: "Chambres",
    driverAge: "Âge du conducteur",
    cabinClass: "Classe cabine",
    clear: "Effacer",
    clearAll: "Tout effacer",
    clearOrigin: "Effacer le point de départ",
    clearDestination: "Effacer la destination",
    done: "Terminé",
    next: "Suiv.",
    previous: "Préc.",
    search: "Rechercher",
    errors: {
      origin: "Entrez une ville ou un aéroport de départ.",
      destination: "Entrez une destination.",
      startDate: "Choisissez une date de début.",
      endDate: "Choisissez une date de fin.",
      dateOrder: "La date de fin doit suivre la date de début.",
      adults: "Au moins un adulte est requis.",
      children: "Le nombre d’enfants ne peut pas être négatif.",
      rooms: "Au moins une chambre est requise.",
      guests: "Au moins un voyageur est requis.",
    },
    destinationIdeasTitle: "Places to start your deal search",
    destinationIdeasSubtitle:
      "Choose a destination idea, then compare provider results when you continue.",
  },
};

const parseIsoDate = (value: string) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsedDate = new Date(year, month - 1, day);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return toIsoDate(nextDate);
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
const todayLocal = () => startOfLocalDay(new Date());
const isBeforeToday = (date: Date) =>
  startOfLocalDay(date).getTime() < todayLocal().getTime();
const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const buildMonthCells = (monthDate: Date) => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const startDate = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1 - startOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + index,
    );

    return {
      date,
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
};

const formatShortDate = (value: string) => {
  const parsedDate = parseIsoDate(value);
  if (!parsedDate) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsedDate);
};

const clampCount = (value: number, minimum: number, maximum: number) => {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
};

export default function DealsPage() {
  const { locale } = useLocale();
  const router = useRouter();
  const { start: startRouteProgress } = useRouteProgress();
  const lang = locale.startsWith("fr") ? "fr" : "en";
  const dictionary = copy[lang];
  const [packageMode, setPackageMode] = useState<PackageMode>("hotel-flight");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [driverAge, setDriverAge] = useState(30);
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");
  const [datesOpen, setDatesOpen] = useState(false);
  const [travelersOpen, setTravelersOpen] = useState(false);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const datesWrapperRef = useRef<HTMLDivElement>(null);
  const travelersWrapperRef = useRef<HTMLDivElement>(null);

  const selectedMode =
    packageModes.find((mode) => mode.value === packageMode) ?? packageModes[0];
  const includesFlight = selectedMode.includesFlight;
  const includesHotel = selectedMode.includesHotel;
  const includesCar = selectedMode.includesCar;
  const checkInParsed = parseIsoDate(startDate);
  const checkOutParsed = parseIsoDate(endDate);

  const dateSummary = useMemo(() => {
    const formattedStart = formatShortDate(startDate);
    const formattedEnd = formatShortDate(endDate);

    if (!formattedStart) {
      return includesFlight ? "Departure — Return" : "Check-in — Check-out";
    }

    return formattedEnd
      ? `${formattedStart} — ${formattedEnd}`
      : formattedStart;
  }, [endDate, includesFlight, startDate]);

  const travelersSummary = useMemo(() => {
    const normalizedAdults = clampCount(adults, 1, 12);
    const normalizedChildren = clampCount(children, 0, 12 - normalizedAdults);
    const travelerCount = normalizedAdults + normalizedChildren;
    const travelerLabel = travelerCount === 1 ? "traveler" : "travelers";
    const cabinLabel =
      cabinClasses.find((cabin) => cabin.value === cabinClass)?.label ??
      "Economy";

    if (includesHotel && includesFlight) {
      const normalizedRooms = clampCount(rooms, 1, 6);
      return `${travelerCount} ${travelerLabel}, ${normalizedRooms} ${normalizedRooms === 1 ? "room" : "rooms"}`;
    }

    if (includesHotel) {
      const normalizedRooms = clampCount(rooms, 1, 6);
      return `${travelerCount} ${travelerLabel}, ${normalizedRooms} ${normalizedRooms === 1 ? "room" : "rooms"}`;
    }

    return includesFlight
      ? `${travelerCount} ${travelerLabel}, ${cabinLabel}`
      : `${travelerCount} ${travelerLabel}`;
  }, [adults, cabinClass, children, includesFlight, includesHotel, rooms]);

  const hasActiveDealsSearch =
    packageMode !== "hotel-flight" ||
    origin.trim() !== "" ||
    destination.trim() !== "" ||
    startDate !== "" ||
    endDate !== "" ||
    adults !== 1 ||
    children !== 0 ||
    rooms !== 1 ||
    cabinClass !== "economy" ||
    driverAge !== 30 ||
    error !== "" ||
    datesOpen ||
    travelersOpen;

  const destinationIdeaHref = useMemo(() => {
    const baseDate = new Date();
    const defaultCheckIn = addDays(baseDate, 21);
    const defaultCheckOut = addDays(baseDate, 24);

    return (destinationQuery: string) =>
      `/hotels/results?${new URLSearchParams({
        destination: destinationQuery,
        checkIn: defaultCheckIn,
        checkOut: defaultCheckOut,
        guests: "2",
        rooms: "1",
      }).toString()}`;
  }, []);

  const destinationIdeaCards = useMemo(
    () =>
      destinationIdeas.map((idea) => ({
        ...idea,
        href: destinationIdeaHref(idea.destinationQuery),
      })),
    [destinationIdeaHref],
  );

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) return;

      if (!datesWrapperRef.current?.contains(target)) {
        setDatesOpen(false);
      }

      if (!travelersWrapperRef.current?.contains(target)) {
        setTravelersOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setDatesOpen(false);
      setTravelersOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleModeChange = (mode: PackageMode) => {
    setPackageMode(mode);
    setDatesOpen(false);
    setTravelersOpen(false);
    setError("");
  };

  const handleToggleDates = () => {
    setDatesOpen((previousOpen) => {
      const nextOpen = !previousOpen;
      if (nextOpen) setTravelersOpen(false);
      return nextOpen;
    });
  };

  const handleToggleTravelers = () => {
    setTravelersOpen((previousOpen) => {
      const nextOpen = !previousOpen;
      if (nextOpen) setDatesOpen(false);
      return nextOpen;
    });
  };

  const handleResetSearch = () => {
    setPackageMode("hotel-flight");
    setOrigin("");
    setDestination("");
    setStartDate("");
    setEndDate("");
    setAdults(1);
    setChildren(0);
    setRooms(1);
    setDriverAge(30);
    setCabinClass("economy");
    setDatesOpen(false);
    setTravelersOpen(false);
    setError("");
  };

  const handleSelectDate = (date: Date) => {
    if (isBeforeToday(date)) return;

    const selectedIso = toIsoDate(date);

    if (!startDate || (startDate && endDate)) {
      setStartDate(selectedIso);
      setEndDate("");
      setError("");
      return;
    }

    if (selectedIso <= startDate) {
      setStartDate(selectedIso);
      setEndDate("");
      setError("");
      return;
    }

    setEndDate(selectedIso);
    setError("");
  };

  const adjustAdults = (offset: number) => {
    setAdults((current) => clampCount(current + offset, 1, 12 - children));
  };

  const adjustChildren = (offset: number) => {
    setChildren((current) => clampCount(current + offset, 0, 12 - adults));
  };

  const adjustRooms = (offset: number) => {
    setRooms((current) => clampCount(current + offset, 1, 6));
  };

  const adjustDriverAge = (offset: number) => {
    setDriverAge((current) => clampCount(current + offset, 18, 99));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedOrigin = origin.trim();
    const trimmedDestination = destination.trim();
    const normalizedAdults = clampCount(adults, 1, 12);
    const normalizedChildren = clampCount(children, 0, 12 - normalizedAdults);
    const normalizedRooms = clampCount(rooms, 1, 6);
    const normalizedDriverAge = clampCount(driverAge, 18, 99);

    setAdults(normalizedAdults);
    setChildren(normalizedChildren);
    setRooms(normalizedRooms);
    setDriverAge(normalizedDriverAge);

    if (includesFlight && !trimmedOrigin) {
      setError(dictionary.errors.origin);
      return;
    }

    if (!trimmedDestination) {
      setError(dictionary.errors.destination);
      return;
    }

    if (!startDate) {
      setError(dictionary.errors.startDate);
      return;
    }

    if (!endDate) {
      setError(dictionary.errors.endDate);
      return;
    }

    if (endDate <= startDate) {
      setError(dictionary.errors.dateOrder);
      return;
    }

    if (normalizedAdults < 1) {
      setError(dictionary.errors.adults);
      return;
    }

    if (normalizedChildren < 0) {
      setError(dictionary.errors.children);
      return;
    }

    if (!includesFlight && normalizedAdults + normalizedChildren < 1) {
      setError(dictionary.errors.guests);
      return;
    }

    if (includesHotel && normalizedRooms < 1) {
      setError(dictionary.errors.rooms);
      return;
    }

    setError("");

    if (includesFlight) {
      const travelers = normalizedAdults + normalizedChildren;
      const params = new URLSearchParams({
        tripType: "round-trip",
        origin: trimmedOrigin,
        destination: trimmedDestination,
        departureDate: startDate,
        returnDate: endDate,
        adults: String(normalizedAdults),
        children: String(normalizedChildren),
        infants: "0",
        travelers: String(travelers),
        cabinClass,
      });

      setIsSubmitting(true);
      startRouteProgress();
      router.push(`/flights/results?${params.toString()}`);
      return;
    }

    const guests = normalizedAdults + normalizedChildren;
    const params = new URLSearchParams({
      destination: trimmedDestination,
      checkIn: startDate,
      checkOut: endDate,
      guests: String(guests),
      rooms: String(normalizedRooms),
    });

    setIsSubmitting(true);
    startRouteProgress();
    router.push(`/hotels/results?${params.toString()}`);
  };

  const countRows = [
    {
      key: "adults",
      label: dictionary.adults,
      value: clampCount(adults, 1, 12 - children),
      min: 1,
      max: 12 - children,
      onDecrement: () => adjustAdults(-1),
      onIncrement: () => adjustAdults(1),
    },
    {
      key: "children",
      label: dictionary.children,
      value: clampCount(children, 0, 12 - adults),
      min: 0,
      max: 12 - adults,
      onDecrement: () => adjustChildren(-1),
      onIncrement: () => adjustChildren(1),
    },
    ...(includesHotel
      ? [
          {
            key: "rooms",
            label: dictionary.rooms,
            value: clampCount(rooms, 1, 6),
            min: 1,
            max: 6,
            onDecrement: () => adjustRooms(-1),
            onIncrement: () => adjustRooms(1),
          },
        ]
      : []),
    ...(includesCar
      ? [
          {
            key: "driverAge",
            label: dictionary.driverAge,
            value: clampCount(driverAge, 18, 99),
            min: 18,
            max: 99,
            onDecrement: () => adjustDriverAge(-1),
            onIncrement: () => adjustDriverAge(1),
          },
        ]
      : []),
  ];

  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-slate-50 pb-12">
        <section className="relative overflow-visible border-b border-slate-200/80 bg-[#f8f7ff] pb-14 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:pb-20">
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={dealsHeroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-[center_52%]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(248,250,252,0.98)_0%,rgba(248,250,252,0.94)_40%,rgba(238,242,255,0.76)_68%,rgba(238,242,255,0.36)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-slate-50 via-slate-50/85 to-transparent" />
          </div>

          <div className="page-shell relative z-10 pt-10 sm:pt-14">
            <div className="max-w-[1040px]">
              <h1 className="max-w-none text-balance text-3xl font-semibold leading-[1.12] tracking-[-0.015em] text-slate-800 sm:text-4xl lg:whitespace-nowrap lg:text-4xl lg:leading-[1.08]">
                {dictionary.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-slate-700">
                {dictionary.subtitle}
              </p>
            </div>
          </div>

          <div className="page-shell relative z-20 pt-8 sm:pt-10">
            <div className="mx-auto w-full max-w-[1040px] space-y-3">
              <div className="px-1">
                <fieldset
                  className="min-w-0"
                  aria-label={dictionary.modeLegend}
                >
                  <legend className="sr-only">{dictionary.modeLegend}</legend>
                  <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                    {packageModes.map((mode) => (
                      <label
                        key={mode.value}
                        className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-2 text-sm font-extrabold shadow-sm backdrop-blur transition focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 ${
                          packageMode === mode.value
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-white/80 bg-white/80 text-slate-700 hover:border-indigo-300 hover:bg-white"
                        }`}
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="packageMode"
                          value={mode.value}
                          checked={packageMode === mode.value}
                          onChange={() => handleModeChange(mode.value)}
                        />
                        {mode.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="overflow-visible rounded-2xl border border-white/70 bg-white/90 p-1 shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur-md">
                  <div
                    className={`grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:gap-0 ${
                      includesFlight
                        ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,1.35fr)_minmax(0,1.3fr)_112px]"
                        : "lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.45fr)_minmax(0,1.3fr)_112px]"
                    }`}
                  >
                    {includesFlight ? (
                      <div className="min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:rounded-s-xl lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                        <label
                          htmlFor="package-origin"
                          className="mb-1 block text-xs font-semibold uppercase leading-4 [letter-spacing:0.025em] text-slate-600"
                        >
                          {dictionary.origin}
                        </label>
                        <div className="relative">
                          <input
                            ref={originInputRef}
                            id="package-origin"
                            value={origin}
                            onChange={(event) => setOrigin(event.target.value)}
                            placeholder="City or airport"
                            className="h-8 w-full rounded-md border-0 bg-transparent px-0 pr-9 text-[16px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 md:text-sm"
                            autoComplete="address-level2"
                            required={includesFlight}
                          />
                          {origin ? (
                            <button
                              type="button"
                              aria-label={dictionary.clearOrigin}
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={() => {
                                setOrigin("");
                                setError("");
                                originInputRef.current?.focus();
                              }}
                              className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div
                      className={`min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0 ${
                        includesFlight ? "" : "lg:rounded-s-xl"
                      }`}
                    >
                      <label
                        htmlFor="package-destination"
                        className="mb-1 block text-xs font-semibold uppercase leading-4 [letter-spacing:0.025em] text-slate-600"
                      >
                        {dictionary.destination}
                      </label>
                      <div className="relative">
                        <input
                          ref={destinationInputRef}
                          id="package-destination"
                          value={destination}
                          onChange={(event) =>
                            setDestination(event.target.value)
                          }
                          placeholder="City, airport, or area"
                          className="h-8 w-full rounded-md border-0 bg-transparent px-0 pr-9 text-[16px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 md:text-sm"
                          autoComplete="address-level2"
                          required
                        />
                        {destination ? (
                          <button
                            type="button"
                            aria-label={dictionary.clearDestination}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={() => {
                              setDestination("");
                              setError("");
                              destinationInputRef.current?.focus();
                            }}
                            className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div
                      ref={datesWrapperRef}
                      className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
                    >
                      <span className="mb-1 block text-xs font-semibold uppercase leading-4 [letter-spacing:0.025em] text-slate-600">
                        {dictionary.dates}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleDates}
                        aria-expanded={datesOpen}
                        aria-haspopup="dialog"
                        aria-label={dictionary.dateDialog}
                        className="flex h-8 w-full items-center gap-2 rounded-md border-0 bg-transparent px-0 text-start text-[16px] text-slate-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 md:text-sm"
                      >
                        <Calendar
                          size={16}
                          className="shrink-0 text-slate-500"
                        />
                        <span className="truncate">{dateSummary}</span>
                      </button>
                      {datesOpen ? (
                        <div className="absolute inset-x-0 top-[calc(100%+10px)] z-[200] w-full rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)] sm:inset-inline-end-auto sm:w-[min(92vw,620px)] sm:p-4">
                          <p className="mb-3 text-base font-semibold text-slate-900">
                            {dictionary.dateDialog}
                          </p>
                          <div className="mb-3 flex items-center justify-between">
                            <button
                              type="button"
                              aria-label={dictionary.previous}
                              onClick={() =>
                                setVisibleMonthDate((previousMonth) =>
                                  addMonths(previousMonth, -1),
                                )
                              }
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                            >
                              {dictionary.previous}
                            </button>
                            <button
                              type="button"
                              aria-label={dictionary.next}
                              onClick={() =>
                                setVisibleMonthDate((previousMonth) =>
                                  addMonths(previousMonth, 1),
                                )
                              }
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                            >
                              {dictionary.next}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                            {[0, 1].map((monthOffset) => {
                              const monthDate = addMonths(
                                visibleMonthDate,
                                monthOffset,
                              );
                              const cells = buildMonthCells(monthDate);

                              return (
                                <div key={monthOffset}>
                                  <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                                    {monthDate.toLocaleDateString("en-US", {
                                      month: "long",
                                      year: "numeric",
                                    })}
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
                                      const isStart = iso === startDate;
                                      const isEnd = iso === endDate;
                                      const isPastDate = isBeforeToday(day);
                                      const isInRange = !!(
                                        checkInParsed &&
                                        checkOutParsed &&
                                        !isPastDate &&
                                        day > checkInParsed &&
                                        day < checkOutParsed
                                      );

                                      if (!cell.isCurrentMonth) {
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
                                          key={iso}
                                          type="button"
                                          aria-label={`Select ${day.toLocaleDateString(
                                            "en-US",
                                            {
                                              month: "long",
                                              day: "numeric",
                                              year: "numeric",
                                            },
                                          )}`}
                                          onClick={() => handleSelectDate(day)}
                                          disabled={isPastDate}
                                          className={`flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed ${
                                            isPastDate
                                              ? "text-slate-300 hover:bg-transparent"
                                              : "text-slate-900 hover:bg-indigo-50"
                                          } ${isInRange ? "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100" : ""} ${
                                            isStart || isEnd
                                              ? "bg-indigo-700 text-white hover:bg-indigo-700"
                                              : ""
                                          }`}
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
                          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setStartDate("");
                                setEndDate("");
                              }}
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                            >
                              {dictionary.clear}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDatesOpen(false)}
                              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                            >
                              {dictionary.done}
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div
                      ref={travelersWrapperRef}
                      className="relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
                    >
                      <span className="mb-1 block text-xs font-semibold uppercase leading-4 [letter-spacing:0.025em] text-slate-600">
                        {dictionary.travelersRooms}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleTravelers}
                        aria-expanded={travelersOpen}
                        aria-haspopup="dialog"
                        aria-label={dictionary.travelersRooms}
                        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent px-0 text-start text-[16px] text-slate-900 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 md:text-sm"
                      >
                        <span className="truncate">{travelersSummary}</span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 text-slate-500 transition-transform ${travelersOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {travelersOpen ? (
                        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-[200] w-[calc(100vw-24px)] max-w-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(15,23,42,0.14)] max-sm:max-h-[min(70vh,420px)] sm:inset-inline-end-auto sm:w-[min(92vw,360px)]">
                          <div className="space-y-4">
                            {countRows.map((row) => {
                              const canDecrement = row.value > row.min;
                              const canIncrement = row.value < row.max;

                              return (
                                <div
                                  key={row.key}
                                  className="flex items-center justify-between gap-4"
                                >
                                  <span className="text-sm font-semibold text-slate-900">
                                    {row.label}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={row.onDecrement}
                                      disabled={!canDecrement}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="min-w-7 text-center text-sm font-semibold text-slate-900">
                                      {row.value}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={row.onIncrement}
                                      disabled={!canIncrement}
                                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {includesFlight ? (
                              <div className="border-t border-slate-200 pt-4">
                                <label
                                  className="block text-sm font-semibold text-slate-900"
                                  htmlFor="package-cabin-class"
                                >
                                  {dictionary.cabinClass}
                                </label>
                                <select
                                  id="package-cabin-class"
                                  value={cabinClass}
                                  onChange={(event) =>
                                    setCabinClass(
                                      event.target.value as CabinClass,
                                    )
                                  }
                                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                >
                                  {cabinClasses.map((cabin) => (
                                    <option
                                      key={cabin.value}
                                      value={cabin.value}
                                    >
                                      {cabin.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}

                            <div className="border-t border-slate-200 pt-4">
                              <button
                                type="button"
                                onClick={() => setTravelersOpen(false)}
                                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                              >
                                {dictionary.done}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex min-h-[54px] items-stretch rounded-xl border border-slate-300 bg-white p-1.5 lg:rounded-none lg:rounded-e-xl lg:border-0">
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-indigo-900/20 transition hover:from-indigo-500 hover:to-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-75"
                        disabled={isSubmitting}
                        aria-busy={isSubmitting}
                      >
                        {isSubmitting
                          ? includesFlight
                            ? "Searching flights..."
                            : "Searching hotels..."
                          : dictionary.search}
                      </button>
                    </div>
                  </div>
                </div>

                {hasActiveDealsSearch ? (
                  <div className="flex justify-end px-1">
                    <button
                      type="button"
                      onClick={handleResetSearch}
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      {dictionary.clearAll}
                    </button>
                  </div>
                ) : null}

                <div className="min-h-6" aria-live="polite">
                  {error ? (
                    <p
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700"
                      role="alert"
                    >
                      {error}
                    </p>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="page-shell pt-12 sm:pt-16 lg:pt-20">
          <div className="border-t border-slate-200/80 pt-8 sm:pt-10">
            <div className="max-w-2xl">
              <h2 className="text-xl font-extrabold [letter-spacing:-0.025em] text-slate-950 sm:text-2xl">
                {dictionary.destinationIdeasTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {dictionary.destinationIdeasSubtitle}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {destinationIdeaCards.map((idea) => (
                <Link
                  key={idea.city}
                  href={idea.href}
                  aria-label={`Search trip ideas for ${idea.city}, ${idea.country}`}
                  className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-950/5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-950/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <Image
                      src={idea.image}
                      alt={idea.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 50vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3.5 sm:p-4">
                    <p className="text-sm font-extrabold text-slate-950 sm:text-base">
                      {idea.city}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {idea.country}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
