"use client";

import Image from "next/image";
import Link from "next/link";
import type {
  Dispatch,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  SetStateAction,
} from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  Heart,
  Minus,
  SquarePen,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { FlightCard } from "@/components/results/FlightCard";
import { MobileAirportPicker } from "@/components/search/MobileAirportPicker";
import { Button } from "@/components/ui/Button";
import { FlightCardSkeleton } from "@/components/ui/Skeleton";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { airports, type AirportOption } from "@/data/airports";
import {
  getHomeDiscoveryByRegion,
  homeDiscoveryByRegion,
  type HomeDiscoveryItem,
} from "@/data/homeDiscovery";
import { buildDiscoveryLink } from "@/lib/home/buildDiscoveryLinks";
import { translateHomeDiscoveryCopy } from "@/lib/i18n/homeDiscovery";
import {
  clearRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  type RecentSearchEntry,
} from "@/lib/recent-searches";
import {
  readSavedTripIds,
  toggleSavedTripId,
  writeSavedTripIds,
} from "@/lib/saved-trips-local";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import type { PublicFlightResult, SortMode } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";
import { translations as enTranslations } from "@/lib/i18n/en";

const resultStackClass = "w-full max-w-[680px] lg:ms-4 xl:ms-6";
const desktopFilterStickyTopClass =
  "lg:sticky lg:top-[7.25rem] lg:max-h-[calc(100vh-8.5rem)] lg:overflow-y-auto lg:overscroll-contain";

const filterQueryParamKeys = [
  "fPrice",
  "fTakeoff",
  "fLanding",
  "fDuration",
  "fStop",
  "fAirline",
  "fAirport",
  "fQuality",
  "fBaggage",
  "fFlexible",
] as const;

const loadingMessageKeys = [
  "searchingAirlines",
  "comparingPrices",
  "checkingValueFocusedRoutes",
  "findingLowerPricedOptions",
  "analyzingLayoverQuality",
  "comparingBaggageInclusiveFares",
];

type CabinClassValue = "economy" | "business" | "first";

const cabinClassOptions: Array<{ labelKey: string; value: CabinClassValue }> = [
  { labelKey: "economy", value: "economy" },
  { labelKey: "business", value: "business" },
  { labelKey: "first", value: "first" },
];

const normalizeCabinClassValue = (
  value: string | null | undefined,
): CabinClassValue =>
  value === "business" || value === "first" ? value : "economy";

const normalizeFlightResultsCalendarLocale = (
  locale: string | null | undefined,
) => {
  const normalized =
    locale?.trim().replace("_", "-").toLowerCase() ?? "";

  if (normalized === "fr" || normalized.startsWith("fr-")) {
    return "fr-FR";
  }

  if (normalized === "es" || normalized.startsWith("es-")) {
    return "es-ES";
  }

  if (normalized === "de" || normalized.startsWith("de-")) {
    return "de-DE";
  }

  if (normalized === "it" || normalized.startsWith("it-")) {
    return "it-IT";
  }

  if (normalized === "nl" || normalized.startsWith("nl-")) {
    return "nl-NL";
  }

  if (normalized === "pt" || normalized === "pt-br") {
    return "pt-BR";
  }

  if (normalized === "pt-pt") {
    return "pt-PT";
  }

  if (normalized === "ar" || normalized.startsWith("ar-")) {
    return "ar";
  }

  if (
    normalized === "zh" ||
    normalized === "zh-cn" ||
    normalized === "zh-hans" ||
    normalized.startsWith("zh-hans-")
  ) {
    return "zh-CN";
  }

  if (normalized === "ja" || normalized.startsWith("ja-")) {
    return "ja-JP";
  }

  return "en-US";
};

function getFlightFaqItems(t: (key: string) => string): Array<{ question: string; answer: string }> {
  return [
    {
      question: t("flightFaqBestTimeQuestion"),
      answer: t("flightFaqBestTimeAnswer"),
    },
    {
      question: t("flightFaqBeforeBookingQuestion"),
      answer: t("flightFaqBeforeBookingAnswer"),
    },
    {
      question: t("flightFaqFlexibleFareQuestion"),
      answer: t("flightFaqFlexibleFareAnswer"),
    },
    {
      question: t("flightFaqNonstopQuestion"),
      answer: t("flightFaqNonstopAnswer"),
    },
    {
      question: t("flightFaqBaggageQuestion"),
      answer: t("flightFaqBaggageAnswer"),
    },
    {
      question: t("flightFaqChangeCancelQuestion"),
      answer: t("flightFaqChangeCancelAnswer"),
    },
    {
      question: t("flightFaqInternationalQuestion"),
      answer: t("flightFaqInternationalAnswer"),
    },
  ];
}

type PlacesApiResponse = {
  suggestions?: AirportOption[];
};

const allDiscoveryItems = [
  ...Object.values(homeDiscoveryByRegion).flat(),
  ...getHomeDiscoveryByRegion(),
];

const discoveryById = new Map<string, HomeDiscoveryItem>(
  allDiscoveryItems.map((item) => [item.id, item]),
);

const beachVacationKeywords = [
  "beach",
  "beaches",
  "beachfront",
  "cancun",
  "caribbean",
  "coast",
  "coastal",
  "coastline",
  "coastlines",
  "faro",
  "honolulu",
  "island",
  "islands",
  "miami",
  "oahu",
  "ocean",
  "pacific",
  "palm",
  "palms",
  "puerto vallarta",
  "resort",
  "san diego",
  "san juan",
  "seaside",
  "shoreline",
  "sunshine",
  "sunny",
  "surf",
  "tropical",
  "turquoise",
  "waves",
  "white sand",
];

const beachDestinationKeywords = [
  "algarve",
  "bali",
  "cancun",
  "cape town",
  "faro",
  "honolulu",
  "miami",
  "puerto vallarta",
  "san diego",
  "san juan",
  "sydney",
  "zanzibar",
];

type BeachVacationVisual = { image: string; imageAlt: string };

const beachVacationVisualsByDestinationCode: Record<
  string,
  BeachVacationVisual
> = {
  CUN: {
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Bright Cancun beach with white sand and turquoise water",
  },
  HNL: {
    image:
      "https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Sunny Waikiki beach and clear Pacific water in Honolulu",
  },
  SJU: {
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Turquoise Caribbean shoreline with palms",
  },
  DPS: {
    image:
      "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Sunny Bali coastline with tropical ocean views",
  },
  ZNZ: {
    image:
      "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Zanzibar beach with palm trees and turquoise water",
  },
  PVR: {
    image:
      "https://images.unsplash.com/photo-1665039400840-b6b2a5786fef?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Puerto Vallarta coastline with bright Pacific water",
  },
  FAO: {
    image:
      "https://images.unsplash.com/photo-1530845640344-3fcbe6f1db9f?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Sunny Algarve cliffs and beach near Faro",
  },
  CPT: {
    image:
      "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Cape Town coastline with ocean and mountains",
  },
  SYD: {
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Bright ocean beach with turquoise water",
  },
  SAN: {
    image:
      "https://images.unsplash.com/photo-1577083552431-6e5fd01988f1?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Sunny San Diego coastline and blue ocean",
  },
  MIA: {
    image:
      "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?auto=format&fit=crop&w=1200&q=90",
    imageAlt: "Bright Miami coast and Biscayne Bay waterfront",
  },
};

function getBeachVacationVisual(item: HomeDiscoveryItem): BeachVacationVisual {
  return (
    beachVacationVisualsByDestinationCode[item.destinationCode] ?? {
      image: item.image,
      imageAlt: item.imageAlt,
    }
  );
}

const cityBeachImageKeywords = [
  "at dusk",
  "buildings",
  "city and",
  "cityscape",
  "colonial buildings",
  "downtown",
  "market streets",
  "night",
  "skyline-only",
  "skyline",
  "street",
  "streets",
  "tower",
  "towers",
];

const cityBeachRouteKeywords = [
  "business",
  "city break",
  "city transit",
  "city weekends",
  "conference",
  "conferences",
  "downtown",
  "food districts",
  "market streets",
  "neon",
  "night markets",
  "startup",
  "startups",
  "tech",
  "urban food",
];

function getBeachVacationScore(item: HomeDiscoveryItem) {
  const searchableText = [
    item.title,
    item.destinationCity,
    item.routeNote,
    item.imageAlt,
  ]
    .join(" ")
    .toLowerCase();
  const imageText = getBeachVacationVisual(item).imageAlt.toLowerCase();
  const routeText = [item.title, item.routeNote].join(" ").toLowerCase();

  let score = 0;
  let imageScore = 0;
  let routeScore = 0;

  for (const keyword of beachVacationKeywords) {
    if (searchableText.includes(keyword)) score += 2;
    if (routeText.includes(keyword)) routeScore += 2;
    if (imageText.includes(keyword)) {
      score += 4;
      imageScore += 4;
    }
  }

  for (const keyword of beachDestinationKeywords) {
    if (searchableText.includes(keyword)) {
      score += 3;
      routeScore += 1;
    }
  }

  for (const keyword of cityBeachImageKeywords) {
    if (imageText.includes(keyword)) {
      score -= 9;
      imageScore -= 9;
    }
  }

  for (const keyword of cityBeachRouteKeywords) {
    if (routeText.includes(keyword)) score -= 4;
  }

  if (imageScore < 5 || routeScore < 3) return 0;

  return score;
}

function getBeachVacationCards(regionCode: string, excludedIds: Set<string>) {
  const selectedCards: HomeDiscoveryItem[] = [];
  const selectedIds = new Set<string>();
  const selectedDestinationCities = new Set<string>();

  function getSortedBeachCandidates(items: HomeDiscoveryItem[]) {
    return items
      .map((item, index) => ({
        item,
        index,
        score: getBeachVacationScore(item),
      }))
      .filter(({ score }) => score >= 6)
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map(({ item }) => item);
  }

  function addCards(items: HomeDiscoveryItem[], avoidExcludedCards: boolean) {
    for (const item of getSortedBeachCandidates(items)) {
      if (selectedCards.length >= 6) return;
      if (selectedIds.has(item.id)) continue;
      if (selectedDestinationCities.has(item.destinationCity.toLowerCase())) {
        continue;
      }
      if (avoidExcludedCards && excludedIds.has(item.id)) continue;

      selectedCards.push(item);
      selectedIds.add(item.id);
      selectedDestinationCities.add(item.destinationCity.toLowerCase());
    }
  }

  addCards(getHomeDiscoveryByRegion(regionCode), true);
  addCards(allDiscoveryItems, true);
  addCards(getHomeDiscoveryByRegion(regionCode), false);
  addCards(allDiscoveryItems, false);

  return selectedCards;
}

function RecentSearchCard({
  entry,
  onRemove,
}: {
  entry: RecentSearchEntry;
  onRemove: (id: string) => void;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const cardContent = (
    <>
      <div className="relative h-full min-h-[112px] w-20 shrink-0 overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-600 to-sky-400 sm:w-24">
        {entry.image ? (
          <img
            src={entry.image}
            alt={entry.imageAlt || entry.label}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col justify-between p-3 text-white">
            <p className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-white/75">
              Kurioticket
            </p>
            <ArrowRightLeft className="h-6 w-6 text-white/55" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
        <span className="absolute bottom-2 start-2 rounded-full bg-white/95 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-900 shadow-sm">
          {entry.type === "flight" ? t("flights") : t("hotels")}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3 pe-11">
        <div className="min-w-0">
          <p className="line-clamp-1 text-[0.95rem] font-bold leading-snug text-slate-950">
            {entry.label}
          </p>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-600">
            {entry.subtitle}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/75 px-2.5 py-1 text-xs font-bold text-slate-700 transition group-hover:border-indigo-200 group-hover:bg-indigo-50 group-hover:text-indigo-700 group-focus-visible:border-indigo-200 group-focus-visible:bg-indigo-50 group-focus-visible:text-indigo-700">
          {t("searchAgain")}
          <ArrowRightLeft size={13} />
        </span>
      </div>
    </>
  );

  const cardClassName =
    "focus-ring group flex h-full min-h-[112px] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-none backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white/90";

  return (
    <article className="relative min-w-[260px] max-w-[286px] flex-1 snap-start sm:min-w-[280px] md:min-w-[250px] md:flex-none lg:min-w-[260px]">
      {entry.href ? (
        <Link href={entry.href} className={cardClassName}>
          {cardContent}
        </Link>
      ) : (
        <div className={cardClassName}>{cardContent}</div>
      )}

      <button
        type="button"
        aria-label={t("removeRecentSearch").replace("{{label}}", entry.label)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove(entry.id);
        }}
        className="focus-ring absolute end-2.5 top-2.5 inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-500 shadow-sm transition hover:bg-white hover:text-rose-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}

function SavedRouteCard({
  item,
  onHeartToggle,
}: {
  item: HomeDiscoveryItem;
  onHeartToggle: (
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
  ) => void;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const copy = translateHomeDiscoveryCopy(dictionary, item);

  return (
    <article className="group relative min-w-[250px] snap-start overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl sm:min-w-[280px] md:min-w-0">
      <Link
        href={buildDiscoveryLink(item)}
        aria-label={`${t("explore")} ${item.originCode} ${t("to").toLowerCase()} ${item.destinationCode}`}
        className="focus-ring flex h-full flex-col"
      >
        <div className="relative h-32 overflow-hidden bg-slate-200">
          <Image
            src={item.image}
            alt={item.imageAlt}
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 640px) 280px, 250px"
            className="object-cover transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
          <span className="absolute bottom-3 start-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.65rem] font-black tracking-[0.14em] text-slate-950 shadow-sm">
            {item.originCode} → {item.destinationCode}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-1 pe-8 text-base font-black leading-tight text-slate-950">
            {copy.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {item.originCity} {t("to").toLowerCase()} {item.destinationCity}
          </p>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-slate-600">
            {copy.routeNote}
          </p>
          <span className="mt-4 inline-flex items-center justify-between rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white transition group-hover:bg-indigo-700 group-focus-visible:bg-indigo-700">
            {t("exploreRoute")}
            <ArrowRightLeft size={14} />
          </span>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`${t("remove")} ${copy.title}`}
        aria-pressed="true"
        onClick={(event) => onHeartToggle(event, item.id)}
        className="focus-ring absolute end-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/90 bg-rose-500/95 text-white shadow-sm shadow-rose-950/15 backdrop-blur transition hover:bg-rose-600"
      >
        <Heart className="h-4 w-4 fill-current" />
      </button>
    </article>
  );
}

function FlightBookingFaqSection() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <section aria-labelledby="flight-booking-faq-heading" className="mt-8">
      <div className="max-w-3xl">
        <h2
          id="flight-booking-faq-heading"
          className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl"
        >
          {t("flightBookingFaqs")}
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600 sm:text-base">
          {t("flightBookingFaqIntro")}
        </p>
      </div>

      <FaqAccordion
        items={getFlightFaqItems(t)}
        columns="three"
        compact
        className="mt-4"
      />
    </section>
  );
}

export function FlightResultsClient() {
  const { t: dictionary, locale } = useLocale();
  const t = useCallback(
    (key: string) => dictionary[key] ?? enTranslations[key] ?? "",
    [dictionary],
  );
  const calendarLocale = useMemo(
    () => normalizeFlightResultsCalendarLocale(locale),
    [locale],
  );
  const airportPickerLabels = useMemo(
    () => ({
      clear: dictionary.clear ?? enTranslations.clear ?? "",
      done: dictionary.done ?? enTranslations.done ?? "",
      chooseOrigin: dictionary.chooseOrigin ?? enTranslations.chooseOrigin ?? "",
      clearOrigin: dictionary.clearOrigin ?? enTranslations.clearOrigin ?? "",
      clearDestination: dictionary.clearDestination ?? enTranslations.clearDestination ?? "",
      searchAirportsAndCities: dictionary.searchAirportsAndCities ?? enTranslations.searchAirportsAndCities ?? "",
      searchAirportsOrCities: dictionary.searchAirportsOrCities ?? enTranslations.searchAirportsOrCities ?? "",
      startTypingCityOrAirport: dictionary.startTypingCityOrAirport ?? enTranslations.startTypingCityOrAirport ?? "",
      searchingAirportsAndCities: dictionary.searchingAirportsAndCities ?? enTranslations.searchingAirportsAndCities ?? "",
      noMatchingAirportsOrCities: dictionary.noMatchingAirportsOrCities ?? enTranslations.noMatchingAirportsOrCities ?? "",
    }),
    [dictionary],
  );
  const params = useSearchParams();
  const router = useRouter();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const selectedCurrency = selectedOption.currency;
  const initialDateSafeParams = normalizeFlightDateSearchParams(params);
  const discoveryCards = useMemo(
    () => getHomeDiscoveryByRegion(selectedOption.code).slice(0, 4),
    [selectedOption.code],
  );
  const beachVacationCards = useMemo(() => {
    const discoveryCardIds = new Set(discoveryCards.map((item) => item.id));

    return getBeachVacationCards(selectedOption.code, discoveryCardIds);
  }, [discoveryCards, selectedOption.code]);
  const routeInspirationCards = useMemo(() => {
    const excludedIds = new Set([
      ...discoveryCards.map((item) => item.id),
      ...beachVacationCards.map((item) => item.id),
    ]);
    const selectedCards: HomeDiscoveryItem[] = [];
    const selectedIds = new Set<string>();

    function addCards(items: HomeDiscoveryItem[]) {
      for (const item of items) {
        if (selectedCards.length >= 8) return;
        if (excludedIds.has(item.id) || selectedIds.has(item.id)) continue;

        selectedCards.push(item);
        selectedIds.add(item.id);
      }
    }

    const regionalCards = getHomeDiscoveryByRegion(selectedOption.code);

    addCards(regionalCards.slice(4));
    addCards(regionalCards);

    return selectedCards;
  }, [beachVacationCards, discoveryCards, selectedOption.code]);

  const [sortMode, setSortMode] = useState<SortMode>(
    (params.get("sort") as SortMode) || "cheapest",
  );
  const [results, setResults] = useState<PublicFlightResult[]>([]);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterApplying, setFilterApplying] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0);
  const [timeFilterMode, setTimeFilterMode] = useState<"takeoff" | "landing">(
    "takeoff",
  );
  const [maxTakeoffMinutes, setMaxTakeoffMinutes] = useState<number | null>(
    null,
  );
  const [maxLandingMinutes, setMaxLandingMinutes] = useState<number | null>(
    null,
  );
  const [maxDurationMinutes, setMaxDurationMinutes] = useState<number | null>(
    null,
  );
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedAirports, setSelectedAirports] = useState<string[]>([]);
  const [selectedFlightQuality, setSelectedFlightQuality] = useState<string[]>(
    [],
  );
  const [baggageIncludedOnly, setBaggageIncludedOnly] = useState(true);
  const [flexibleOnly, setFlexibleOnly] = useState(false);
  const [tripTypeInput, setTripTypeInput] = useState(
    initialDateSafeParams.get("tripType") || "round-trip",
  );
  const [tripTypeMenuOpen, setTripTypeMenuOpen] = useState(false);
  const [originInput, setOriginInput] = useState(params.get("origin") || "");
  const [destinationInput, setDestinationInput] = useState(
    params.get("destination") || "",
  );
  const [originCode, setOriginCode] = useState(params.get("origin") || "");
  const [destinationCode, setDestinationCode] = useState(
    params.get("destination") || "",
  );
  const [departureDateInput, setDepartureDateInput] = useState(
    initialDateSafeParams.get("departureDate") || "",
  );
  const [returnDateInput, setReturnDateInput] = useState(
    initialDateSafeParams.get("returnDate") || "",
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
  const [cabinClassInput, setCabinClassInput] = useState<CabinClassValue>(() =>
    normalizeCabinClassValue(params.get("cabinClass")),
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
    startOfMonth(new Date()),
  );
  const [travelerPopoverOpen, setTravelerPopoverOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activeMobileAirportPicker, setActiveMobileAirportPicker] = useState<
    "origin" | "destination" | null
  >(null);
  const [isSearchBarCompact, setIsSearchBarCompact] = useState(false);
  const [isSearchExpandedWhileSticky, setIsSearchExpandedWhileSticky] =
    useState(false);
  const [hasInteractedWithExpandedSearch, setHasInteractedWithExpandedSearch] =
    useState(false);
  const [travelerPopoverPosition, setTravelerPopoverPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [countryHint, setCountryHint] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<AirportOption[]>(
    [],
  );
  const [originSuggestionsLoading, setOriginSuggestionsLoading] =
    useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    AirportOption[]
  >([]);
  const [destinationSuggestionsLoading, setDestinationSuggestionsLoading] =
    useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);
  const [savedTripIds, setSavedTripIds] = useState<string[]>([]);

  const tripTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const originInputRef = useRef<HTMLInputElement | null>(null);
  const destinationInputRef = useRef<HTMLInputElement | null>(null);
  const mobileOriginLauncherRef = useRef<HTMLButtonElement | null>(null);
  const mobileDestinationLauncherRef = useRef<HTMLButtonElement | null>(null);
  const originWrapRef = useRef<HTMLDivElement | null>(null);
  const destinationWrapRef = useRef<HTMLDivElement | null>(null);
  const departureWrapRef = useRef<HTMLDivElement | null>(null);
  const returnWrapRef = useRef<HTMLDivElement | null>(null);
  const travelerCabinWrapRef = useRef<HTMLDivElement | null>(null);
  const stickySentinelRef = useRef<HTMLDivElement | null>(null);
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const expandedSearchScrollYRef = useRef(0);
  const filterApplyingTimeoutRef = useRef<number | null>(null);
  const filtersHydratedFromUrlRef = useRef(false);
  const hydratedFilterQueryStringRef = useRef<string | null>(null);
  const lastWrittenFilterQueryStringRef = useRef<string | null>(null);
  const mobileSearchScrollLockRef = useRef<{ restore: () => void } | null>(
    null,
  );
  const queryString = params.toString();
  const searchQueryString = getSearchQueryString(params);

  const originFallbackSuggestions = useMemo(
    () => filterAirportOptions(originInput),
    [originInput],
  );
  const destinationFallbackSuggestions = useMemo(
    () => filterAirportOptions(destinationInput),
    [destinationInput],
  );
  const resolvedOriginSuggestions =
    originSuggestions.length > 0
      ? originSuggestions
      : originFallbackSuggestions;
  const resolvedDestinationSuggestions =
    destinationSuggestions.length > 0
      ? destinationSuggestions
      : destinationFallbackSuggestions;
  const mobileTripTypeSummary =
    tripTypeInput === "one-way" ? t("oneWay") : t("roundTrip");
  const mobileOriginSummary = (originCode || originInput || t("origin")).trim();
  const mobileDestinationSummary = (
    destinationCode ||
    destinationInput ||
    t("destination")
  ).trim();
  const mobileRouteSummary = `${mobileOriginSummary} → ${mobileDestinationSummary}`;
  const mobileDateSummary = departureDateInput
    ? tripTypeInput === "round-trip" && returnDateInput
      ? `${formatCompactDateLabel(departureDateInput, calendarLocale)} – ${formatCompactDateLabel(returnDateInput, calendarLocale)}`
      : formatCompactDateLabel(departureDateInput, calendarLocale)
    : t("travelDates");
  const mobileTravelerTotal = Math.max(
    1,
    adultCount + childCount + infantCount,
  );
  const mobileTravelerSummary =
    mobileTravelerTotal === 1 && adultCount === 1
      ? `1 ${t("adultSingular")}`
      : `${mobileTravelerTotal} ${t("travelerPlural")}`;
  const travelerCabinSummary = buildTravelerCabinSummary(
    adultCount,
    childCount,
    infantCount,
    cabinClassInput,
    t,
  );
  const showCompactSearchSummary =
    isSearchBarCompact && !isSearchExpandedWhileSticky;
  const isExpandedStickySearchActive =
    isSearchBarCompact && isSearchExpandedWhileSticky;
  const canAutoCollapseExpandedSearch =
    isExpandedStickySearchActive &&
    !hasInteractedWithExpandedSearch &&
    !tripTypeMenuOpen &&
    !activeSuggest &&
    !activeDatePicker &&
    !travelerPopoverOpen;
  const savedRoutes = useMemo(
    () =>
      savedTripIds
        .map((id) => discoveryById.get(id))
        .filter((item): item is HomeDiscoveryItem => Boolean(item)),
    [savedTripIds],
  );

  const markExpandedSearchInteraction = useCallback(() => {
    if (isExpandedStickySearchActive) {
      setHasInteractedWithExpandedSearch(true);
    }
  }, [isExpandedStickySearchActive]);

  const expandStickySearch = useCallback(() => {
    expandedSearchScrollYRef.current = window.scrollY;
    setHasInteractedWithExpandedSearch(false);
    setIsSearchExpandedWhileSticky(true);
  }, []);

  const collapseStickySearch = useCallback(() => {
    setIsSearchExpandedWhileSticky(false);
    setHasInteractedWithExpandedSearch(false);
    setTripTypeMenuOpen(false);
    setActiveSuggest(null);
    setDropdownPosition(null);
    setActiveDatePicker(null);
    setDatePickerPosition(null);
    setTravelerPopoverOpen(false);
    setTravelerPopoverPosition(null);
  }, [
    setActiveDatePicker,
    setActiveSuggest,
    setDatePickerPosition,
    setDropdownPosition,
    setTravelerPopoverOpen,
    setTravelerPopoverPosition,
    setTripTypeMenuOpen,
  ]);

  useEffect(() => {
    const sentinel = stickySentinelRef.current;

    if (!sentinel) {
      return undefined;
    }

    let animationFrame = 0;

    const applyCompactState = (shouldCompact: boolean) => {
      setIsSearchBarCompact(shouldCompact);

      if (!shouldCompact) {
        setIsSearchExpandedWhileSticky(false);
        setHasInteractedWithExpandedSearch(false);
      }
    };

    const updateFromSentinelPosition = () => {
      applyCompactState(sentinel.getBoundingClientRect().bottom <= 0);
    };

    const schedulePositionUpdate = () => {
      if (animationFrame) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateFromSentinelPosition();
      });
    };

    updateFromSentinelPosition();

    if (typeof IntersectionObserver === "undefined") {
      window.addEventListener("scroll", schedulePositionUpdate, {
        passive: true,
      });
      window.addEventListener("resize", schedulePositionUpdate);

      return () => {
        window.removeEventListener("scroll", schedulePositionUpdate);
        window.removeEventListener("resize", schedulePositionUpdate);
        if (animationFrame) {
          window.cancelAnimationFrame(animationFrame);
        }
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        applyCompactState(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    window.addEventListener("scroll", schedulePositionUpdate, {
      passive: true,
    });
    window.addEventListener("resize", schedulePositionUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedulePositionUpdate);
      window.removeEventListener("resize", schedulePositionUpdate);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  useEffect(() => {
    if (!canAutoCollapseExpandedSearch) {
      return undefined;
    }

    let animationFrame = 0;

    const onScroll = () => {
      if (animationFrame) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        const focusedElement = document.activeElement;
        const isFocusInsideSearch = Boolean(
          focusedElement && searchFormRef.current?.contains(focusedElement),
        );
        const hasContinuedScrolling =
          Math.abs(window.scrollY - expandedSearchScrollYRef.current) > 16;

        if (hasContinuedScrolling && !isFocusInsideSearch) {
          collapseStickySearch();
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [canAutoCollapseExpandedSearch, collapseStickySearch]);

  useEffect(() => {
    if (!canAutoCollapseExpandedSearch) {
      return undefined;
    }

    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (searchFormRef.current?.contains(target)) return;

      collapseStickySearch();
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [canAutoCollapseExpandedSearch, collapseStickySearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrates client-only localStorage-backed recent searches after mount.
    setRecentSearches(readRecentSearches());
    setSavedTripIds(readSavedTripIds());
  }, []);

  useEffect(() => {
    return () => {
      if (filterApplyingTimeoutRef.current !== null) {
        window.clearTimeout(filterApplyingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const releaseExistingLock = () => {
      mobileSearchScrollLockRef.current?.restore();
      mobileSearchScrollLockRef.current = null;
    };

    if (!mobileSearchOpen || typeof window === "undefined") {
      releaseExistingLock();
      return releaseExistingLock;
    }

    const mobileQuery = window.matchMedia("(max-width: 639px)");

    if (!mobileQuery.matches) {
      releaseExistingLock();
      return releaseExistingLock;
    }

    const bodyElement = document.body;
    const rootElement = document.documentElement;
    const scrollY = window.scrollY;
    const previousBodyStyles = {
      left: bodyElement.style.left,
      overflow: bodyElement.style.overflow,
      overscrollBehavior: bodyElement.style.overscrollBehavior,
      position: bodyElement.style.position,
      right: bodyElement.style.right,
      top: bodyElement.style.top,
      touchAction: bodyElement.style.touchAction,
      width: bodyElement.style.width,
    };
    const previousRootStyles = {
      overflow: rootElement.style.overflow,
      overscrollBehavior: rootElement.style.overscrollBehavior,
    };

    bodyElement.style.left = "0";
    bodyElement.style.overflow = "hidden";
    bodyElement.style.overscrollBehavior = "none";
    bodyElement.style.position = "fixed";
    bodyElement.style.right = "0";
    bodyElement.style.top = `-${scrollY}px`;
    bodyElement.style.touchAction = "none";
    bodyElement.style.width = "100%";
    rootElement.style.overflow = "hidden";
    rootElement.style.overscrollBehavior = "none";

    mobileSearchScrollLockRef.current = {
      restore: () => {
        bodyElement.style.left = previousBodyStyles.left;
        bodyElement.style.overflow = previousBodyStyles.overflow;
        bodyElement.style.overscrollBehavior = previousBodyStyles.overscrollBehavior;
        bodyElement.style.position = previousBodyStyles.position;
        bodyElement.style.right = previousBodyStyles.right;
        bodyElement.style.top = previousBodyStyles.top;
        bodyElement.style.touchAction = previousBodyStyles.touchAction;
        bodyElement.style.width = previousBodyStyles.width;
        rootElement.style.overflow = previousRootStyles.overflow;
        rootElement.style.overscrollBehavior =
          previousRootStyles.overscrollBehavior;
        window.scrollTo(0, scrollY);
      },
    };

    return releaseExistingLock;
  }, [mobileSearchOpen]);

  function triggerFilterApplying() {
    setFilterApplying(true);

    if (filterApplyingTimeoutRef.current !== null) {
      window.clearTimeout(filterApplyingTimeoutRef.current);
    }

    filterApplyingTimeoutRef.current = window.setTimeout(() => {
      setFilterApplying(false);
      filterApplyingTimeoutRef.current = null;
    }, 700);
  }

  function handleRemoveRecentSearch(id: string) {
    setRecentSearches(removeRecentSearch(id));
  }

  function handleClearRecentSearches() {
    clearRecentSearches();
    setRecentSearches([]);
  }

  function handleTripTypeChange(nextTripType: string) {
    markExpandedSearchInteraction();

    const normalizedTripType =
      nextTripType === "one-way" ? "one-way" : "round-trip";

    setTripTypeInput(normalizedTripType);
    setTripTypeMenuOpen(false);

    if (normalizedTripType === "one-way") {
      setReturnDateInput("");

      if (activeDatePicker === "return") {
        setActiveDatePicker(null);
        setDatePickerPosition(null);
      }

      return;
    }

    if (
      returnDateInput &&
      (!isValidFutureOrTodayDateValue(returnDateInput) ||
        (departureDateInput &&
          isDateValueBefore(returnDateInput, departureDateInput)))
    ) {
      setReturnDateInput("");
    }
  }

  function closeFlightSearchPopovers() {
    setActiveMobileAirportPicker(null);
    setActiveSuggest(null);
    setDropdownPosition(null);
    setActiveDatePicker(null);
    setDatePickerPosition(null);
    setTravelerPopoverOpen(false);
    setTravelerPopoverPosition(null);
    setTripTypeMenuOpen(false);
  }

  function closeMobileSearchDrawer() {
    closeFlightSearchPopovers();
    setMobileSearchOpen(false);
  }

  function openMobileSearchDrawer() {
    setFiltersOpen(false);
    closeFlightSearchPopovers();
    setMobileSearchOpen(true);
  }

  function focusOriginInput() {
    window.requestAnimationFrame(() => originInputRef.current?.focus());
  }

  function focusDestinationInput() {
    window.requestAnimationFrame(() => destinationInputRef.current?.focus());
  }

  function clearOriginField() {
    markExpandedSearchInteraction();
    setOriginInput("");
    setOriginCode("");
    setOriginSuggestions([]);
    setOriginSuggestionsLoading(false);
    closeFlightSearchPopovers();
    if (!activeMobileAirportPicker) focusOriginInput();
  }

  function clearDestinationField() {
    markExpandedSearchInteraction();
    setDestinationInput("");
    setDestinationCode("");
    setDestinationSuggestions([]);
    setDestinationSuggestionsLoading(false);
    closeFlightSearchPopovers();
    if (!activeMobileAirportPicker) focusDestinationInput();
  }

  function handleSavedRouteToggle(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSavedTripIds((current) => {
      const next = toggleSavedTripId(current, itemId);
      writeSavedTripIds(next);
      return next;
    });
  }

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const language = navigator.language || "";
    const parts = language.split("-");
    if (parts.length > 1 && /^[A-Za-z]{2}$/.test(parts[1])) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Initializes a browser-only locale hint after mount.
      setCountryHint(parts[1].toUpperCase());
    }
  }, []);

  useEffect(() => {
    const searchValues = new URLSearchParams(searchQueryString);
    const normalizedSearchValues =
      normalizeFlightDateSearchParams(searchValues);

    if (normalizedSearchValues.toString() !== searchValues.toString()) {
      const nextQuery = normalizedSearchValues.toString();
      router.replace(
        nextQuery ? `/flights/results?${nextQuery}` : "/flights",
        {
          scroll: false,
        },
      );
      return;
    }

    const nextTripType = normalizedSearchValues.get("tripType") || "round-trip";
    const nextOrigin = normalizedSearchValues.get("origin")?.trim() || "";
    const nextDestination =
      normalizedSearchValues.get("destination")?.trim() || "";
    const nextDepartureDate =
      normalizedSearchValues.get("departureDate")?.trim() || "";
    const nextReturnDate =
      normalizedSearchValues.get("returnDate")?.trim() || "";
    const adultsParam = Number(normalizedSearchValues.get("adults"));
    const childrenParam = Number(normalizedSearchValues.get("children"));
    const infantsParam = Number(normalizedSearchValues.get("infants"));
    const legacyTravelers = Number(
      normalizedSearchValues.get("travelers") || 1,
    );
    const nextAdults = Number.isFinite(adultsParam)
      ? Math.max(1, adultsParam)
      : Math.max(1, legacyTravelers);
    const nextChildren = Number.isFinite(childrenParam)
      ? Math.max(0, childrenParam)
      : 0;
    const nextInfants = Number.isFinite(infantsParam)
      ? Math.max(0, infantsParam)
      : 0;
    const nextCabinClass = normalizeCabinClassValue(
      normalizedSearchValues.get("cabinClass"),
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keeps the editable search form in sync with URL-backed result searches.
    setTripTypeInput(nextTripType);
    setOriginInput(nextOrigin);
    setOriginCode(nextOrigin);
    setDestinationInput(nextDestination);
    setDestinationCode(nextDestination);
    setDepartureDateInput(nextDepartureDate);
    setReturnDateInput(nextTripType === "round-trip" ? nextReturnDate : "");
    if (isValidFutureOrTodayDateValue(nextDepartureDate)) {
      setCalendarMonth(
        startOfMonth(parseDateValue(nextDepartureDate) ?? new Date()),
      );
    }
    setAdultCount(Math.min(9, nextAdults));
    setChildCount(Math.min(8, nextChildren));
    setInfantCount(Math.min(Math.min(9, nextAdults), nextInfants));
    setCabinClassInput(nextCabinClass);
    closeFlightSearchPopovers();
  }, [router, searchQueryString]);

  useEffect(() => {
    const query = originInput.trim();
    if (query.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clears stale suggestions when the search query becomes too short.
      setOriginSuggestions([]);
      setOriginSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setOriginSuggestionsLoading(true);
      try {
        const response = await fetch(
          buildPlacesUrl(query, "origin", countryHint),
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
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
      } finally {
        if (!controller.signal.aborted) setOriginSuggestionsLoading(false);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clears stale suggestions when the search query becomes too short.
      setDestinationSuggestions([]);
      setDestinationSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setDestinationSuggestionsLoading(true);
      try {
        const response = await fetch(
          buildPlacesUrl(query, "destination", countryHint),
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok)
          throw new Error("Failed to load destination suggestions");
        const payload = (await response.json()) as PlacesApiResponse;
        const suggestions = Array.isArray(payload.suggestions)
          ? dedupeSuggestions(payload.suggestions)
              .filter((item) => !!item?.code && !!item?.city && !!item?.airport)
              .slice(0, 7)
          : [];
        setDestinationSuggestions(suggestions);
      } catch {
        if (!controller.signal.aborted) setDestinationSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setDestinationSuggestionsLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [destinationInput, countryHint]);

  const body = useMemo(() => {
    const searchParams = normalizeFlightDateSearchParams(
      new URLSearchParams(searchQueryString),
    );
    const origin = searchParams.get("origin")?.trim() || "";
    const destination = searchParams.get("destination")?.trim() || "";
    const departureDate = searchParams.get("departureDate")?.trim() || "";
    const tripType = searchParams.get("tripType") || "round-trip";
    const returnDate = searchParams.get("returnDate")?.trim() || "";
    const hasValidDepartureDate = isValidFutureOrTodayDateValue(departureDate);
    const hasValidReturnDate =
      tripType !== "round-trip" ||
      (isValidFutureOrTodayDateValue(returnDate) &&
        !isDateValueBefore(returnDate, departureDate));
    const hasSearch = Boolean(
      origin &&
      destination &&
      departureDate &&
      hasValidDepartureDate &&
      hasValidReturnDate,
    );

    if (!hasSearch) return null;

    const adultsParam = Number(searchParams.get("adults"));
    const childrenParam = Number(searchParams.get("children"));
    const infantsParam = Number(searchParams.get("infants"));
    const legacyTravelers = Number(searchParams.get("travelers") || 1);
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
      returnDate: tripType === "round-trip" ? returnDate : "",
      adults,
      children,
      infants,
      travelers,
      cabinClass: searchParams.get("cabinClass") || "economy",
      sort: (searchParams.get("sort") as SortMode) || "cheapest",
      currency: selectedCurrency,
    };
  }, [searchQueryString, selectedCurrency]);

  useEffect(() => {
    if (!body) return;

    let active = true;

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setWarnings([]);

      fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(async (response) => {
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error ||
                dictionary.unableToSearchFlights ||
                enTranslations.unableToSearchFlights ||
                "Unable to search flights.",
            );
          }

          return data as { results: PublicFlightResult[]; warnings?: string[] };
        })
        .then((data) => {
          if (!active) return;

          setResults(data.results);
          setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
        })
        .catch((searchError) => {
          if (!active) return;

          setError(
            searchError instanceof Error
              ? t(searchError.message) || searchError.message
              : dictionary.unableToSearchFlights ||
                enTranslations.unableToSearchFlights ||
                "Unable to search flights.",
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
  }, [body, dictionary.unableToSearchFlights, t]);

  useEffect(() => {
    if (!loading) return;

    const id = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % loadingMessageKeys.length);
    }, 1100);

    return () => window.clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!tripTypeMenuOpen) return;

    function handleClose(event: MouseEvent) {
      const target = event.target as Node;

      if (tripTypeMenuRef.current?.contains(target)) return;

      setTripTypeMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setTripTypeMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [tripTypeMenuOpen]);

  useEffect(() => {
    function updateDropdownPosition(target: "origin" | "destination") {
      const viewportPadding = 16;
      const preferredWidth = 380;
      const wrap =
        target === "origin"
          ? originWrapRef.current
          : destinationWrapRef.current;
      const input = wrap?.querySelector("input");

      if (!input) return;

      const rect = input.getBoundingClientRect();
      const width = Math.min(
        preferredWidth,
        window.innerWidth - viewportPadding * 2,
      );
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - width - viewportPadding),
      );
      const top = rect.bottom + 8;

      setDropdownPosition({ top, left, width });
    }

    const useInlineMobileSuggestions =
      mobileSearchOpen && window.matchMedia("(max-width: 639px)").matches;

    if (activeSuggest && !useInlineMobileSuggestions) {
      updateDropdownPosition(activeSuggest);
    }

    function handleViewportChange() {
      if (!activeSuggest) return;

      if (useInlineMobileSuggestions) {
        setDropdownPosition(null);
        return;
      }

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
  }, [activeSuggest, mobileSearchOpen]);

  useEffect(() => {
    function updateDatePickerPosition(target: "departure" | "return") {
      const viewportPadding = 16;
      const preferredWidth = 620;
      const wrap =
        target === "departure"
          ? departureWrapRef.current
          : (returnWrapRef.current ?? departureWrapRef.current);
      const trigger = wrap?.querySelector("button");

      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(
        preferredWidth,
        window.innerWidth - viewportPadding * 2,
      );
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - width - viewportPadding),
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
      const preferredWidth = 360;
      const trigger = travelerCabinWrapRef.current?.querySelector("button");

      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(
        preferredWidth,
        window.innerWidth - viewportPadding * 2,
      );
      const left = Math.max(
        viewportPadding,
        Math.min(rect.left, window.innerWidth - width - viewportPadding),
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

  function handleSwapLocations() {
    markExpandedSearchInteraction();

    const currentOriginInput = originInput;
    const currentOriginCode = originCode;

    setOriginInput(destinationInput);
    setOriginCode(destinationCode);
    setDestinationInput(currentOriginInput);
    setDestinationCode(currentOriginCode);
    setActiveSuggest(null);
    setDropdownPosition(null);
  }

  function applyFlightDateSelection(date: Date) {
    if (!activeDatePicker) return;

    markExpandedSearchInteraction();

    const nextDateState = getNextFlightDateSelection({
      activePicker: activeDatePicker,
      date,
      departureDate: departureDateInput,
      returnDate: returnDateInput,
      tripType: tripTypeInput,
    });

    if (!nextDateState) return;

    setDepartureDateInput(nextDateState.departureDate);
    setReturnDateInput(nextDateState.returnDate);

    if (nextDateState.activePicker) {
      setActiveDatePicker(nextDateState.activePicker);
      return;
    }

    setActiveDatePicker(null);
    setDatePickerPosition(null);
  }

  function handleCompactSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextOrigin = originCode || originInput.trim();
    const nextDestination = destinationCode || destinationInput.trim();
    const nextDepartureDate = departureDateInput.trim();
    const nextReturnDate = returnDateInput.trim();
    const hasValidDepartureDate =
      isValidFutureOrTodayDateValue(nextDepartureDate);
    const hasValidReturnDate =
      tripTypeInput !== "round-trip" ||
      (isValidFutureOrTodayDateValue(nextReturnDate) &&
        !isDateValueBefore(nextReturnDate, nextDepartureDate));

    if (
      !nextOrigin ||
      !nextDestination ||
      !hasValidDepartureDate ||
      !hasValidReturnDate
    ) {
      return;
    }

    const adults = Math.min(9, Math.max(1, adultCount));
    const children = Math.min(9 - adults, Math.max(0, childCount));
    const infants = Math.min(
      adults,
      9 - adults - children,
      Math.max(0, infantCount),
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

    closeMobileSearchDrawer();
    router.push(`/flights/results?${nextParams.toString()}`);
  }

  const priceLabelCurrency = useMemo(
    () => getUniformResultCurrency(results),
    [results],
  );

  const mixedProviderCurrenciesLabel =
    dictionary.mixedProviderCurrencies ?? enTranslations.mixedProviderCurrencies ?? "";

  const formatResultPriceLabel = useMemo(
    () =>
      (amount: number, sourceCurrency = priceLabelCurrency) =>
        sourceCurrency
          ? formatDisplayPrice({
              amount,
              sourceCurrency,
              displayCurrency: selectedCurrency,
              convertUsdEstimate: true,
              rates: currencyRates.rates,
              isFallbackRate: currencyRates.isFallback,
            }).formatted
          : mixedProviderCurrenciesLabel,
    [
      currencyRates.isFallback,
      currencyRates.rates,
      priceLabelCurrency,
      selectedCurrency,
      mixedProviderCurrenciesLabel,
    ],
  );

  const buildSummaryDetails = (
    flight: PublicFlightResult | null,
    mode: SortMode,
  ) => {
    if (!flight) return null;

    const price = formatResultPriceLabel(flight.price, flight.currency);
    const duration = formatDurationFromMinutes(flight.durationMinutes);
    const stops = formatStopsLabel(flight.stops, t);
    const airlineOrProvider = flight.airlineName || flight.provider;
    const departure = formatTime(flight.departureTime);
    const primary =
      mode === "fastest"
        ? `${duration} · ${price}`
        : mode === "best"
          ? `${price} · ${duration}`
          : price;
    const context = [airlineOrProvider, duration, stops]
      .filter(Boolean)
      .join(" · ");

    return {
      primary,
      context,
      departure: t("departs").includes("{{time}}")
        ? t("departs").replace("{{time}}", departure)
        : `${t("departs")} ${departure}`,
    };
  };

  const stopOptions = useMemo(() => {
    const buckets = new Map<
      string,
      { count: number; minPrice: number; currencies: Set<string> }
    >();

    results.forEach((flight) => {
      const bucket = getStopBucket(flight.stops);
      const current = buckets.get(bucket) ?? {
        count: 0,
        minPrice: Number.POSITIVE_INFINITY,
        currencies: new Set<string>(),
      };
      const currencies = new Set(current.currencies);

      if (flight.currency) {
        currencies.add(flight.currency.toUpperCase());
      }

      buckets.set(bucket, {
        count: current.count + 1,
        minPrice:
          Number.isFinite(flight.price) && flight.price > 0
            ? Math.min(current.minPrice, flight.price)
            : current.minPrice,
        currencies,
      });
    });

    return Array.from(buckets, ([value, data]) => ({
      value,
      label: stopLabel(value, t),
      count: data.count,
      secondaryLabel: formatOptionsFound(data.count, t),
      rightLabel: Number.isFinite(data.minPrice)
        ? formatResultPriceLabel(
            data.minPrice,
            data.currencies.size === 1 ? Array.from(data.currencies)[0] : null,
          )
        : undefined,
    })).sort(
      (first, second) =>
        stopBucketSortValue(first.value) - stopBucketSortValue(second.value),
    );
  }, [formatResultPriceLabel, results, t]);

  const airlineOptions = useMemo(
    () =>
      buildCountOptions(results.map((flight) => flight.airlineName)).slice(
        0,
        8,
      ),
    [results],
  );

  const airportOptions = useMemo(() => {
    const airportsForResults = results.flatMap((flight) => [
      flight.originAirport,
      flight.destinationAirport,
      ...flight.layovers.map((layover) => layover.airport),
    ]);

    return buildCountOptions(airportsForResults).slice(0, 8);
  }, [results]);

  const flightQualityOptions = useMemo(
    () =>
      flightQualityDefinitions
        .map((option) => ({
          ...option,
          label: t(option.labelKey),
          count: results.filter((flight) =>
            flightHasQualityOption(flight, option.value),
          ).length,
        }))
        .filter((option) => option.count > 0),
    [results, t],
  );

  const priceBounds = useMemo(() => {
    const prices = results
      .map((flight) => flight.price)
      .filter((price) => Number.isFinite(price));

    if (!prices.length) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [results]);

  const timeBounds = useMemo(() => {
    const departureMinutes = results
      .map((flight) => getTimeMinutes(flight.departureTime))
      .filter((value): value is number => value !== null);

    const arrivalMinutes = results
      .map((flight) => getTimeMinutes(flight.arrivalTime))
      .filter((value): value is number => value !== null);

    return {
      takeoff: departureMinutes.length
        ? {
            min: Math.min(...departureMinutes),
            max: Math.max(...departureMinutes),
          }
        : null,
      landing: arrivalMinutes.length
        ? {
            min: Math.min(...arrivalMinutes),
            max: Math.max(...arrivalMinutes),
          }
        : null,
    };
  }, [results]);

  const durationBounds = useMemo(() => {
    const durations = results
      .map((flight) => flight.durationMinutes)
      .filter((duration) => Number.isFinite(duration) && duration > 0);

    if (!durations.length) {
      return null;
    }

    return {
      min: Math.floor(Math.min(...durations)),
      max: Math.ceil(Math.max(...durations)),
    };
  }, [results]);

  useEffect(() => {
    if (loading) return;

    if (lastWrittenFilterQueryStringRef.current === queryString) {
      lastWrittenFilterQueryStringRef.current = null;
      hydratedFilterQueryStringRef.current = queryString;
      filtersHydratedFromUrlRef.current = true;
      return;
    }

    const filterParams = new URLSearchParams(queryString);
    const allowedStops = new Set(stopOptions.map((option) => option.value));
    const allowedAirlines = new Set(
      airlineOptions.map((option) => option.value),
    );
    const allowedAirports = new Set(
      airportOptions.map((option) => option.value),
    );
    const allowedQuality = new Set(
      flightQualityOptions.map((option) => option.value),
    );
    const nextMaxPrice =
      parseBoundedFilterNumber(
        filterParams.get("fPrice"),
        priceBounds.min,
        priceBounds.max,
      ) ?? priceBounds.max;
    const nextMaxTakeoffMinutes =
      parseBoundedFilterNumber(
        filterParams.get("fTakeoff"),
        timeBounds.takeoff?.min ?? null,
        timeBounds.takeoff?.max ?? null,
      ) ??
      timeBounds.takeoff?.max ??
      null;
    const nextMaxLandingMinutes =
      parseBoundedFilterNumber(
        filterParams.get("fLanding"),
        timeBounds.landing?.min ?? null,
        timeBounds.landing?.max ?? null,
      ) ??
      timeBounds.landing?.max ??
      null;
    const nextMaxDurationMinutes =
      parseBoundedFilterNumber(
        filterParams.get("fDuration"),
        durationBounds?.min ?? null,
        durationBounds?.max ?? null,
      ) ??
      durationBounds?.max ??
      null;
    const nextSelectedStops = readFilterList(
      filterParams,
      "fStop",
      allowedStops,
    );
    const nextSelectedAirlines = readFilterList(
      filterParams,
      "fAirline",
      allowedAirlines,
    );
    const nextSelectedAirports = readFilterList(
      filterParams,
      "fAirport",
      allowedAirports,
    );
    const nextSelectedFlightQuality = readFilterList(
      filterParams,
      "fQuality",
      allowedQuality,
    );
    const nextBaggageIncludedOnly = filterParams.get("fBaggage") !== "0";
    const nextFlexibleOnly = filterParams.get("fFlexible") === "1";

    setMaxPrice((current) =>
      current === nextMaxPrice ? current : nextMaxPrice,
    );
    setMaxTakeoffMinutes((current) =>
      current === nextMaxTakeoffMinutes ? current : nextMaxTakeoffMinutes,
    );
    setMaxLandingMinutes((current) =>
      current === nextMaxLandingMinutes ? current : nextMaxLandingMinutes,
    );
    setMaxDurationMinutes((current) =>
      current === nextMaxDurationMinutes ? current : nextMaxDurationMinutes,
    );
    setSelectedStops((current) =>
      areStringArraysEqual(current, nextSelectedStops)
        ? current
        : nextSelectedStops,
    );
    setSelectedAirlines((current) =>
      areStringArraysEqual(current, nextSelectedAirlines)
        ? current
        : nextSelectedAirlines,
    );
    setSelectedAirports((current) =>
      areStringArraysEqual(current, nextSelectedAirports)
        ? current
        : nextSelectedAirports,
    );
    setSelectedFlightQuality((current) =>
      areStringArraysEqual(current, nextSelectedFlightQuality)
        ? current
        : nextSelectedFlightQuality,
    );
    setBaggageIncludedOnly((current) =>
      current === nextBaggageIncludedOnly ? current : nextBaggageIncludedOnly,
    );
    setFlexibleOnly((current) =>
      current === nextFlexibleOnly ? current : nextFlexibleOnly,
    );
    hydratedFilterQueryStringRef.current = queryString;
    filtersHydratedFromUrlRef.current = true;
  }, [
    airlineOptions,
    airportOptions,
    durationBounds?.max,
    durationBounds?.min,
    flightQualityOptions,
    loading,
    priceBounds.max,
    priceBounds.min,
    queryString,
    stopOptions,
    timeBounds.landing?.max,
    timeBounds.landing?.min,
    timeBounds.takeoff?.max,
    timeBounds.takeoff?.min,
  ]);

  useEffect(() => {
    if (
      !filtersHydratedFromUrlRef.current ||
      hydratedFilterQueryStringRef.current !== queryString ||
      loading
    ) {
      return;
    }

    const currentParams = new URLSearchParams(queryString);
    const nextParams = new URLSearchParams(queryString);

    clearFilterSearchParams(nextParams);

    if (priceBounds.max > 0 && maxPrice > 0 && maxPrice < priceBounds.max) {
      nextParams.set("fPrice", String(Math.round(maxPrice)));
    }

    if (
      timeBounds.takeoff &&
      maxTakeoffMinutes !== null &&
      maxTakeoffMinutes < timeBounds.takeoff.max
    ) {
      nextParams.set("fTakeoff", String(Math.round(maxTakeoffMinutes)));
    }

    if (
      timeBounds.landing &&
      maxLandingMinutes !== null &&
      maxLandingMinutes < timeBounds.landing.max
    ) {
      nextParams.set("fLanding", String(Math.round(maxLandingMinutes)));
    }

    if (
      durationBounds &&
      maxDurationMinutes !== null &&
      maxDurationMinutes < durationBounds.max
    ) {
      nextParams.set("fDuration", String(Math.round(maxDurationMinutes)));
    }

    appendFilterList(nextParams, "fStop", selectedStops);
    appendFilterList(nextParams, "fAirline", selectedAirlines);
    appendFilterList(nextParams, "fAirport", selectedAirports);
    appendFilterList(nextParams, "fQuality", selectedFlightQuality);

    if (!baggageIncludedOnly) {
      nextParams.set("fBaggage", "0");
    }

    if (flexibleOnly) {
      nextParams.set("fFlexible", "1");
    }

    if (nextParams.toString() === currentParams.toString()) return;

    const nextQuery = nextParams.toString();
    lastWrittenFilterQueryStringRef.current = nextQuery;
    router.replace(
      nextQuery ? `/flights/results?${nextQuery}` : "/flights",
      {
        scroll: false,
      },
    );
  }, [
    baggageIncludedOnly,
    durationBounds,
    flexibleOnly,
    loading,
    maxDurationMinutes,
    maxLandingMinutes,
    maxPrice,
    maxTakeoffMinutes,
    priceBounds.max,
    queryString,
    router,
    selectedAirlines,
    selectedAirports,
    selectedFlightQuality,
    selectedStops,
    timeBounds.landing,
    timeBounds.takeoff,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (priceBounds.max > 0 && maxPrice > 0 && maxPrice < priceBounds.max) {
      count += 1;
    }

    if (
      timeBounds.takeoff &&
      maxTakeoffMinutes !== null &&
      maxTakeoffMinutes < timeBounds.takeoff.max
    ) {
      count += 1;
    }

    if (
      timeBounds.landing &&
      maxLandingMinutes !== null &&
      maxLandingMinutes < timeBounds.landing.max
    ) {
      count += 1;
    }

    if (
      durationBounds &&
      maxDurationMinutes !== null &&
      maxDurationMinutes < durationBounds.max
    ) {
      count += 1;
    }

    count += selectedStops.length;
    count += selectedAirlines.length;
    count += selectedAirports.length;
    count += selectedFlightQuality.length;

    if (flexibleOnly) {
      count += 1;
    }

    return count;
  }, [
    durationBounds,
    flexibleOnly,
    maxDurationMinutes,
    maxLandingMinutes,
    maxPrice,
    maxTakeoffMinutes,
    priceBounds.max,
    selectedAirlines.length,
    selectedAirports.length,
    selectedFlightQuality.length,
    selectedStops.length,
    timeBounds.landing,
    timeBounds.takeoff,
  ]);

  const activeFilterLabel = `${t("activeFilterCount").replace("{{count}}", String(activeFilterCount))}`;

  const filtered = useMemo(
    () =>
      results.filter((flight) => {
        const matchesPrice = flight.price <= maxPrice;
        const matchesSelectedStops =
          selectedStops.length === 0 ||
          selectedStops.includes(getStopBucket(flight.stops));
        const matchesAirline =
          selectedAirlines.length === 0 ||
          selectedAirlines.includes(flight.airlineName);
        const matchesAirport =
          selectedAirports.length === 0 ||
          selectedAirports.some((airport) =>
            flightMatchesAirport(flight, airport),
          );
        const matchesBaggage =
          !baggageIncludedOnly || hasBaggageIncluded(flight);
        const matchesFlexibility = !flexibleOnly || hasFlexibleTerms(flight);
        const matchesFlightQuality =
          selectedFlightQuality.length === 0 ||
          selectedFlightQuality.every((option) =>
            flightHasQualityOption(flight, option),
          );
        const departureMinutes = getTimeMinutes(flight.departureTime);
        const arrivalMinutes = getTimeMinutes(flight.arrivalTime);
        const matchesTakeoffTime =
          maxTakeoffMinutes === null ||
          departureMinutes === null ||
          departureMinutes <= maxTakeoffMinutes;
        const matchesLandingTime =
          maxLandingMinutes === null ||
          arrivalMinutes === null ||
          arrivalMinutes <= maxLandingMinutes;
        const matchesDuration =
          maxDurationMinutes === null ||
          !Number.isFinite(flight.durationMinutes) ||
          flight.durationMinutes <= maxDurationMinutes;

        return (
          matchesPrice &&
          matchesSelectedStops &&
          matchesAirline &&
          matchesAirport &&
          matchesBaggage &&
          matchesFlexibility &&
          matchesFlightQuality &&
          matchesTakeoffTime &&
          matchesLandingTime &&
          matchesDuration
        );
      }),
    [
      baggageIncludedOnly,
      flexibleOnly,
      maxDurationMinutes,
      maxLandingMinutes,
      maxPrice,
      maxTakeoffMinutes,
      results,
      selectedAirlines,
      selectedAirports,
      selectedFlightQuality,
      selectedStops,
    ],
  );

  const sortedResults = useMemo(() => {
    const nextResults = [...filtered];

    nextResults.sort((first, second) => {
      if (sortMode === "cheapest") {
        return first.price - second.price;
      }

      if (sortMode === "fastest") {
        return first.durationMinutes - second.durationMinutes;
      }

      if (sortMode === "stops") {
        return first.stops - second.stops || first.price - second.price;
      }

      const firstBestScore =
        first.valueScore +
        first.travelConfidenceScore +
        first.comfortScore -
        first.riskScore;

      const secondBestScore =
        second.valueScore +
        second.travelConfidenceScore +
        second.comfortScore -
        second.riskScore;

      return secondBestScore - firstBestScore || first.price - second.price;
    });

    return nextResults;
  }, [filtered, sortMode]);

  const sortSummaries = useMemo(() => {
    if (!filtered.length) {
      return {
        cheapest: null,
        best: null,
        fastest: null,
      };
    }

    const cheapest = [...filtered].sort((a, b) => a.price - b.price)[0];
    const fastest = [...filtered].sort(
      (a, b) => a.durationMinutes - b.durationMinutes,
    )[0];
    const best = [...filtered].sort((a, b) => {
      const aScore =
        a.valueScore + a.travelConfidenceScore + a.comfortScore - a.riskScore;
      const bScore =
        b.valueScore + b.travelConfidenceScore + b.comfortScore - b.riskScore;

      return bScore - aScore || a.price - b.price;
    })[0];

    return {
      cheapest,
      best,
      fastest,
    };
  }, [filtered]);

  if (!body) {
    return (
      <main className="flex-1 bg-[radial-gradient(circle_at_top,_#eef4ff_0%,_#f8fafd_42%,_#f2f6fc_100%)] pb-8 pt-4 sm:pt-8 lg:pt-8">
        <section className="page-shell">
          <form
            className="mx-auto mt-0 w-full max-w-5xl space-y-3 sm:space-y-2"
            onSubmit={(event) => {
              event.preventDefault();

              const nextDepartureDate = departureDateInput.trim();
              const nextReturnDate = returnDateInput.trim();
              const hasValidDepartureDate =
                isValidFutureOrTodayDateValue(nextDepartureDate);
              const hasValidReturnDate =
                tripTypeInput !== "round-trip" ||
                (isValidFutureOrTodayDateValue(nextReturnDate) &&
                  !isDateValueBefore(nextReturnDate, nextDepartureDate));

              if (!hasValidDepartureDate || !hasValidReturnDate) {
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
                departureDate: nextDepartureDate,
                adults: String(adultCount),
                children: String(childCount),
                infants: String(infantCount),
                travelers: String(adultCount + childCount + infantCount),
                cabinClass: cabinClassInput,
              });

              if (tripTypeInput === "round-trip" && nextReturnDate) {
                nextParams.set("returnDate", nextReturnDate);
              }

              router.push(`/flights/results?${nextParams.toString()}`);
            }}
          >
            <input
              type="hidden"
              name="departureDate"
              value={departureDateInput}
            />
            <input type="hidden" name="returnDate" value={returnDateInput} />
            <input type="hidden" name="adults" value={String(adultCount)} />
            <input type="hidden" name="children" value={String(childCount)} />
            <input type="hidden" name="infants" value={String(infantCount)} />
            <input
              type="hidden"
              name="travelers"
              value={String(adultCount + childCount + infantCount)}
            />
            <input type="hidden" name="cabinClass" value={cabinClassInput} />

            <div className="text-center">
              <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <h1 className="mx-auto w-max whitespace-nowrap text-[1.35rem] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[clamp(1.9rem,5vw,2.75rem)]">
                  {t("compareAvailableFlightOptions")}
                </h1>
              </div>
              <div className="mx-auto mt-1.5 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mt-3">
                <p className="mx-auto w-max whitespace-nowrap text-center text-[11px] leading-5 text-slate-600 sm:text-base sm:leading-6">
                  {t("flightResultsHeroSubtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-1 sm:px-1">
              <div ref={tripTypeMenuRef} className="relative inline-flex">
                <button
                  type="button"
                  aria-expanded={tripTypeMenuOpen}
                  aria-haspopup="listbox"
                  onClick={() => {
                    setActiveSuggest(null);
                    setDropdownPosition(null);
                    setActiveDatePicker(null);
                    setDatePickerPosition(null);
                    setTravelerPopoverOpen(false);
                    setTravelerPopoverPosition(null);
                    setTripTypeMenuOpen((open) => !open);
                  }}
                  className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:text-slate-950 sm:h-auto sm:rounded-md sm:border-0 sm:bg-transparent sm:px-1 sm:text-sm sm:font-medium sm:shadow-none"
                >
                  {tripTypeInput === "one-way" ? t("oneWay") : t("roundTrip")}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 text-slate-500 transition-transform",
                      tripTypeMenuOpen && "rotate-180",
                    )}
                  />
                </button>

                {tripTypeMenuOpen ? (
                  <div
                    role="listbox"
                    aria-label={t("tripType")}
                    className="absolute start-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={tripTypeInput === "round-trip"}
                      onClick={() => handleTripTypeChange("round-trip")}
                      className={cn(
                        "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-start text-sm font-medium transition-colors",
                        tripTypeInput === "round-trip"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {t("roundTrip")}
                    </button>
                    <button
                      type="button"
                      role="option"
                      aria-selected={tripTypeInput === "one-way"}
                      onClick={() => handleTripTypeChange("one-way")}
                      className={cn(
                        "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-start text-sm font-medium transition-colors",
                        tripTypeInput === "one-way"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {t("oneWay")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="overflow-visible rounded-[1.65rem] border border-white/70 bg-white/90 p-2.5 shadow-[0_18px_44px_rgba(79,70,229,0.16)] ring-1 ring-indigo-100/80 backdrop-blur sm:rounded-2xl sm:border-slate-200 sm:bg-white sm:p-1 sm:shadow-[0_10px_28px_rgba(15,23,42,0.10)] sm:ring-0">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-1.5 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] lg:gap-0">
                <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)] items-stretch rounded-[1.35rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-3 py-1.5 shadow-sm transition-colors hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 sm:grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] sm:rounded-xl sm:border-slate-300 sm:bg-white sm:px-3 sm:py-1.5 sm:shadow-none sm:hover:border-slate-400 sm:focus-within:ring-indigo-500/40 lg:col-span-1 lg:rounded-none lg:rounded-s-xl lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                  <div
                    className="relative min-h-[48px] px-0 py-0 pe-2 sm:min-h-[54px]"
                    ref={originWrapRef}
                  >
                    <label
                      className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] leading-4 text-slate-500 sm:mb-1 sm:text-xs sm:font-semibold sm:tracking-wide sm:text-slate-600"
                      htmlFor="origin"
                    >
                      {t("origin")}
                    </label>
                    <input
                      id="origin"
                      ref={originInputRef}
                      name="origin"
                      required
                      value={originInput}
                      onFocus={() => {
                        if (originInput.trim().length >= 2)
                          setActiveSuggest("origin");
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
                      placeholder={t("fromPlaceholder")}
                      autoComplete="off"
                      className="focus-ring h-7 w-full rounded-md border-0 bg-transparent px-0 pe-8 text-[16px] font-semibold text-slate-950 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 sm:h-8 sm:font-normal md:text-sm"
                    />
                    {originInput ? (
                      <button
                        type="button"
                        aria-label={t("clearOrigin")}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          clearOriginField();
                        }}
                        className="focus-ring absolute end-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
                      aria-label={t("swapOriginDestination")}
                      onClick={handleSwapLocations}
                      className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50 text-indigo-700 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-100 hover:text-indigo-900 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 sm:border-slate-300 sm:bg-white sm:text-slate-600 sm:shadow-none sm:hover:border-slate-400 sm:hover:bg-slate-50 sm:hover:text-slate-900"
                    >
                      <ArrowRightLeft size={14} />
                    </button>
                  </div>

                  <div
                    className="relative min-h-[48px] px-0 py-0 ps-2 sm:min-h-[54px]"
                    ref={destinationWrapRef}
                  >
                    <label
                      className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] leading-4 text-slate-500 sm:mb-1 sm:text-xs sm:font-semibold sm:tracking-wide sm:text-slate-600"
                      htmlFor="destination"
                    >
                      {t("destination")}
                    </label>
                    <input
                      id="destination"
                      ref={destinationInputRef}
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
                      placeholder={t("toPlaceholder")}
                      autoComplete="off"
                      className="focus-ring h-7 w-full rounded-md border-0 bg-transparent px-0 pe-8 text-[16px] font-semibold text-slate-950 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 sm:h-8 sm:font-normal md:text-sm"
                    />
                    {destinationInput ? (
                      <button
                        type="button"
                        aria-label={t("clearDestination")}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          clearDestinationField();
                        }}
                        className="focus-ring absolute end-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
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

                <div
                  className="relative min-h-[50px] rounded-[1.25rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-3 py-1.5 shadow-sm transition-colors hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 sm:min-h-[54px] sm:rounded-xl sm:border-slate-300 sm:bg-white sm:shadow-none sm:hover:border-slate-400 sm:focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
                  ref={departureWrapRef}
                >
                  <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] leading-4 text-slate-500 sm:mb-1 sm:text-xs sm:font-semibold sm:tracking-wide sm:text-slate-600">
                    {t("travelDates")}
                  </label>
                  <button
                    type="button"
                    aria-label={t("travelDates")}
                    onClick={() => setActiveDatePicker("departure")}
                    className="focus-ring flex h-7 w-full items-center gap-1.5 rounded-md border-0 bg-transparent px-0 pe-7 text-start text-[15px] font-semibold text-slate-950 outline-none transition-colors sm:h-8 sm:gap-2 sm:pe-8 sm:text-[16px] sm:font-normal md:text-sm"
                  >
                    <Calendar size={16} className="shrink-0 text-slate-500" />
                    <span className="truncate">
                      {departureDateInput
                        ? tripTypeInput === "round-trip" && returnDateInput
                          ? `${formatCompactDateLabel(departureDateInput, calendarLocale)} — ${formatCompactDateLabel(returnDateInput, calendarLocale)}`
                          : formatDateLabel(departureDateInput, calendarLocale)
                        : t("travelDates")}
                    </span>
                  </button>
                  {departureDateInput || returnDateInput ? (
                    <button
                      type="button"
                      aria-label={t("clearTravelDates")}
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
                      className="focus-ring absolute end-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                <div
                  className="relative min-h-[50px] rounded-[1.25rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-3 py-1.5 shadow-sm transition-colors hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 sm:min-h-[54px] sm:rounded-xl sm:border-slate-300 sm:bg-white sm:shadow-none sm:hover:border-slate-400 sm:focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
                  ref={travelerCabinWrapRef}
                >
                  <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] leading-4 text-slate-500 sm:mb-1 sm:text-xs sm:font-semibold sm:tracking-wide sm:text-slate-600">
                    {t("travelers")}
                  </label>
                  <button
                    type="button"
                    aria-label={t("travelersAndCabinClass")}
                    onClick={() => {
                      setTravelerPopoverOpen((current) => {
                        const next = !current;

                        if (!next) setTravelerPopoverPosition(null);

                        return next;
                      });
                    }}
                    className="focus-ring flex h-7 w-full items-center justify-between gap-1.5 rounded-md border-0 bg-transparent px-0 text-start text-[15px] font-semibold text-slate-950 outline-none transition-colors sm:h-8 sm:gap-2 sm:text-[16px] sm:font-normal md:text-sm"
                  >
                    <span className="block truncate text-[15px] font-semibold text-slate-950 sm:text-sm sm:font-medium sm:text-slate-900">
                      {buildTravelerCabinSummary(
                        adultCount,
                        childCount,
                        infantCount,
                        cabinClassInput,
                        t,
                        locale,
                      )}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                        travelerPopoverOpen && "rotate-180",
                      )}
                    />
                  </button>
                </div>
                <div className="col-span-2 lg:col-span-1 lg:min-h-[54px] lg:self-stretch">
                  <Button
                    type="submit"
                    className="h-[50px] w-full rounded-[1.25rem] bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white shadow-[0_14px_28px_rgba(79,70,229,0.28)] transition-transform active:scale-[0.99] sm:h-12 sm:rounded-xl sm:bg-gradient-to-r sm:from-indigo-700 sm:to-violet-600 sm:shadow-md sm:shadow-indigo-700/20 lg:h-full lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-e-xl lg:border lg:border-s-0 lg:border-indigo-600/20"
                  >
                    {t("search")}
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {activeDatePicker && datePickerPosition ? (
            <DatePickerPopover
              position={datePickerPosition}
              onClose={() => {
                setActiveDatePicker(null);
                setDatePickerPosition(null);
              }}
              month={calendarMonth}
              departureValue={departureDateInput}
              returnValue={returnDateInput}
              activePicker={activeDatePicker}
              tripType={tripTypeInput}
              onMonthChange={setCalendarMonth}
              onSelect={applyFlightDateSelection}
              onClear={() => {
                if (activeDatePicker === "departure") {
                  setDepartureDateInput("");
                  setReturnDateInput("");
                }

                if (activeDatePicker === "return") {
                  setReturnDateInput("");
                }
              }}
              onToday={() => applyFlightDateSelection(new Date())}
            />
          ) : null}

          {travelerPopoverOpen && travelerPopoverPosition ? (
            <TravelerCabinPopover
              position={travelerPopoverPosition}
              onClose={() => {
                setTravelerPopoverOpen(false);
                setTravelerPopoverPosition(null);
              }}
              adultCount={adultCount}
              childCount={childCount}
              infantCount={infantCount}
              cabinClass={cabinClassInput}
              onAdultChange={(nextValue) => {
                const nextAdultCount = Math.min(9, Math.max(1, nextValue));

                setAdultCount(nextAdultCount);
                setInfantCount((current) => Math.min(current, nextAdultCount));
              }}
              onChildChange={(nextValue) => {
                setChildCount(Math.min(9, Math.max(0, nextValue)));
              }}
              onInfantChange={(nextValue) => {
                setInfantCount(Math.min(adultCount, Math.max(0, nextValue)));
              }}
              onCabinClassChange={setCabinClassInput}
            />
          ) : null}

          {recentSearches.length > 0 ? (
            <section className="mx-auto mt-5 w-full max-w-6xl px-1">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">
                    {t("quickResumeLatestSearches")}
                  </p>
                  <h2 className="mt-0.5 text-base font-bold tracking-tight text-slate-950 sm:text-lg">
                    {t("quickRoutesFromLatestSearches")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleClearRecentSearches}
                  className="focus-ring inline-flex min-h-9 shrink-0 items-center justify-center rounded-full px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-white/70 hover:text-rose-700"
                >
                  {t("clearAll")}
                </button>
              </div>

              <div className="mt-3 flex snap-x gap-2.5 overflow-x-auto pb-1.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {recentSearches.slice(0, 4).map((entry) => (
                  <RecentSearchCard
                    key={entry.id}
                    entry={entry}
                    onRemove={handleRemoveRecentSearch}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {savedRoutes.length > 0 ? (
            <section className="mx-auto mt-7 w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-rose-600">
                    {t("savedRoutes")} ❤️
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {t("savedRoutes")}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-base">
                    {t("savedRoutesOnDevice")}
                  </p>
                </div>
                <p className="max-w-xs text-sm leading-6 text-slate-500">
                  {t("quickResumeLatestSearchesBody")}
                </p>
              </div>

              <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-1.5 [scrollbar-width:none] [-ms-overflow-style:none] md:grid md:grid-cols-3 md:overflow-visible lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
                {savedRoutes.slice(0, 8).map((item) => (
                  <SavedRouteCard
                    key={item.id}
                    item={item}
                    onHeartToggle={handleSavedRouteToggle}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-8 space-y-8">
            <section>
              <div className="mb-4 sm:max-w-3xl">
                <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <h2 className="w-max whitespace-nowrap text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                    {t("discoverDestinationsFromRegion")}
                  </h2>
                </div>
                <div className="mt-1.5 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <p className="w-max whitespace-nowrap text-xs font-normal leading-6 text-slate-600 sm:text-base">
                    {t("discoverDestinationsFromRegionBody")}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5 lg:p-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-5">
                  {discoveryCards.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={buildDiscoveryLink(item)}
                      aria-label={`${t("explore")} ${item.originCode} ${t("to").toLowerCase()} ${item.destinationCode}`}
                      className="group w-full overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_14px_30px_rgba(15,23,42,0.085)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      <article className="flex h-full flex-col">
                        <div className="relative h-36 overflow-hidden bg-slate-100 sm:h-40 lg:h-56">
                          <Image
                            src={item.image}
                            alt={item.imageAlt}
                            fill
                            priority={false}
                            sizes="(min-width: 1024px) 25vw, 100vw"
                            className="object-cover saturate-[1.08] transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
                          />
                        </div>
                        <div className="bg-white px-4 py-3.5 sm:px-5 sm:py-4">
                          <h3 className="line-clamp-1 text-base font-semibold leading-tight text-slate-900 sm:text-lg">
                            {item.destinationCity}
                          </h3>
                          <p className="mt-1 line-clamp-1 text-sm font-medium leading-5 text-slate-600">
                            {item.originCity} → {item.destinationCity}
                          </p>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            {routeInspirationCards.length > 0 ? (
              <section>
                <div className="mb-4 flex flex-col gap-2 sm:max-w-3xl">
                  <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <h2 className="w-max whitespace-nowrap text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                      {t("moreFlightRoutesToExplore")}
                    </h2>
                  </div>
                  <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <p className="w-max whitespace-nowrap text-xs font-normal leading-6 text-slate-600 sm:text-base">
                      {t("moreFlightRoutesToExploreBody")}
                    </p>
                  </div>
                </div>

                <div className="border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5 lg:p-6">
                  <div className="max-w-full overflow-x-auto overflow-y-hidden pb-2 [scrollbar-width:none] [-ms-overflow-style:none] sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                    <div className="grid grid-flow-col grid-rows-3 auto-cols-[9.5rem] gap-3 sm:grid-flow-row sm:grid-rows-none sm:auto-cols-auto sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-5">
                      {routeInspirationCards.map((item) => (
                        <Link
                          key={item.id}
                          href={buildDiscoveryLink(item)}
                          aria-label={`${t("explore")} ${item.originCode} ${t("to").toLowerCase()} ${item.destinationCode}`}
                          className="group rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-[0_8px_22px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:p-3"
                        >
                          <article className="flex h-full flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                            <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-16 sm:w-16 lg:h-[4.5rem] lg:w-[4.5rem]">
                              <Image
                                src={item.image}
                                alt={item.imageAlt}
                                fill
                                priority={false}
                                sizes="(min-width: 1024px) 72px, (min-width: 640px) 64px, 9.5rem"
                                className="object-cover saturate-[1.05] transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
                              />
                            </div>
                            <div className="min-w-0">
                              <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-900 sm:text-base sm:leading-6">
                                {item.originCity} → {item.destinationCity}
                              </h3>
                              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                                {item.originCode} → {item.destinationCode}
                              </p>
                            </div>
                          </article>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-4 sm:max-w-3xl">
                <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <h2 className="w-max whitespace-nowrap text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                    {t("beachVacations")}
                  </h2>
                </div>
                <div className="mt-1.5 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <p className="w-max whitespace-nowrap text-xs font-normal leading-6 text-slate-600 sm:text-base">
                    {t("beachVacationsBody")}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200/80 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5 lg:p-6">
                <div className="max-w-full overflow-x-auto overflow-y-hidden pb-3 [scrollbar-width:none] [-ms-overflow-style:none] sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden">
                  <div className="grid min-w-max grid-cols-4 grid-rows-2 gap-4 px-1 pt-1 sm:min-w-0 sm:w-auto sm:grid-rows-none sm:grid-cols-3 sm:px-0 sm:pt-0 sm:[grid-template-columns:repeat(3,minmax(0,1fr))] lg:grid-cols-4 lg:gap-5 lg:[grid-template-columns:repeat(4,minmax(0,1fr))] xl:gap-6">
                    {beachVacationCards.slice(0, 6).map((item) => {
                      const beachVisual = getBeachVacationVisual(item);

                      return (
                        <Link
                          key={item.id}
                          href={buildDiscoveryLink(item)}
                          aria-label={`${t("explore")} ${item.originCode} ${t("to").toLowerCase()} ${item.destinationCode}`}
                          className="group w-[10rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_14px_30px_rgba(15,23,42,0.085)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:w-auto"
                        >
                          <article className="flex h-full flex-col">
                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-sky-50 sm:aspect-auto sm:h-32 lg:h-40">
                              <Image
                                src={beachVisual.image}
                                alt={beachVisual.imageAlt}
                                fill
                                priority={false}
                                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 10rem"
                                className="object-cover brightness-[1.05] saturate-[1.12] transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
                              />
                            </div>
                            <div className="bg-white px-4 py-3.5">
                              <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 sm:line-clamp-1">
                                {item.destinationCity}
                              </h3>
                              <p className="mt-1 line-clamp-1 text-sm font-medium leading-5 text-slate-600">
                                {item.originCode} → {item.destinationCode}
                              </p>
                            </div>
                          </article>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <FlightBookingFaqSection />
          </div>
        </section>
      </main>
    );
  }

  function renderCompactSearchPopovers(
    placement: "mobile" | "desktop" = "desktop",
  ) {
    const useMobileSheet = placement === "mobile";
    return (
      <>
        {activeDatePicker && (useMobileSheet || datePickerPosition) ? (
          <DatePickerPopover
            position={datePickerPosition ?? { top: 0, left: 0, width: 0 }}
            mobileSheet={useMobileSheet}
            onClose={() => {
              setActiveDatePicker(null);
              setDatePickerPosition(null);
            }}
            month={calendarMonth}
            departureValue={departureDateInput}
            returnValue={returnDateInput}
            activePicker={activeDatePicker}
            tripType={tripTypeInput}
            onMonthChange={setCalendarMonth}
            onSelect={applyFlightDateSelection}
            onClear={() => {
              if (activeDatePicker === "departure") {
                setDepartureDateInput("");
                setReturnDateInput("");
              }

              if (activeDatePicker === "return") {
                setReturnDateInput("");
              }
            }}
            onToday={() => {
              setActiveDatePicker(null);
              setDatePickerPosition(null);
            }}
          />
        ) : null}

        {travelerPopoverOpen && (useMobileSheet || travelerPopoverPosition) ? (
          <TravelerCabinPopover
            position={travelerPopoverPosition ?? { top: 0, left: 0, width: 0 }}
            mobileSheet={useMobileSheet}
            onClose={() => {
              setTravelerPopoverOpen(false);
              setTravelerPopoverPosition(null);
            }}
            adultCount={adultCount}
            childCount={childCount}
            infantCount={infantCount}
            cabinClass={cabinClassInput}
            onAdultChange={(nextValue) => {
              const nextAdultCount = Math.min(9, Math.max(1, nextValue));

              setAdultCount(nextAdultCount);
              setChildCount((current) => Math.min(current, 9 - nextAdultCount));
              setInfantCount((current) =>
                Math.min(current, nextAdultCount, 9 - nextAdultCount),
              );
            }}
            onChildChange={(nextValue) => {
              const nextChildCount = Math.min(
                9 - adultCount,
                Math.max(0, nextValue),
              );

              setChildCount(nextChildCount);
              setInfantCount((current) =>
                Math.min(current, 9 - adultCount - nextChildCount),
              );
            }}
            onInfantChange={(nextValue) => {
              setInfantCount(
                Math.min(
                  adultCount,
                  9 - adultCount - childCount,
                  Math.max(0, nextValue),
                ),
              );
            }}
            onCabinClassChange={setCabinClassInput}
          />
        ) : null}
      </>
    );
  }

  function renderCompactSearchForm(placement: "mobile" | "desktop") {
    if (placement === "mobile") {
      const mobileFieldClass =
        "rounded-3xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm shadow-slate-900/[0.03] transition-colors focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10";
      const mobileLabelClass =
        "mb-1.5 block text-[0.68rem] font-black uppercase leading-4 tracking-[0.16em] text-slate-500";
      const mobileTripTypeOptions = [
        { labelKey: "roundTrip", value: "round-trip" },
        { labelKey: "oneWay", value: "one-way" },
      ];

      return (
        <form
          onSubmit={handleCompactSearchSubmit}
          className="flex h-full min-h-0 w-full min-w-0 flex-col bg-slate-50"
        >
          <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 pb-3 pt-[calc(0.85rem+env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight text-slate-950">
                {t("editFlightSearch")}
              </h2>

              <button
                type="button"
                aria-label={t("closeSearchForm")}
                onClick={closeMobileSearchDrawer}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
              >
                ×
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
              <div ref={originWrapRef}>
                <button
                  ref={mobileOriginLauncherRef}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={activeMobileAirportPicker === "origin"}
                  onClick={() => {
                    closeFlightSearchPopovers();
                    setActiveMobileAirportPicker("origin");
                  }}
                  className={cn(
                    mobileFieldClass,
                    "flex min-h-[68px] w-full items-center justify-between gap-3 text-start",
                  )}
                >
                  <span className="min-w-0">
                    <span className={mobileLabelClass}>{t("origin")}</span>
                    <span className="block truncate text-base font-bold leading-5 text-slate-950">
                      {originInput.trim() || t("fromPlaceholder")}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                </button>
              </div>

              <div ref={destinationWrapRef}>
                <button
                  ref={mobileDestinationLauncherRef}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={activeMobileAirportPicker === "destination"}
                  onClick={() => {
                    closeFlightSearchPopovers();
                    setActiveMobileAirportPicker("destination");
                  }}
                  className={cn(
                    mobileFieldClass,
                    "flex min-h-[68px] w-full items-center justify-between gap-3 text-start",
                  )}
                >
                  <span className="min-w-0">
                    <span className={mobileLabelClass}>{t("destination")}</span>
                    <span className="block truncate text-base font-bold leading-5 text-slate-950">
                      {destinationInput.trim() || t("toPlaceholder")}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                </button>
              </div>

              <div ref={departureWrapRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTripTypeMenuOpen(false);
                    setActiveSuggest(null);
                    setDropdownPosition(null);
                    setTravelerPopoverOpen(false);
                    setTravelerPopoverPosition(null);
                    setActiveDatePicker("departure");
                    setDatePickerPosition(null);
                  }}
                  className={cn(
                    mobileFieldClass,
                    "flex min-h-[68px] w-full items-center gap-3 text-start",
                  )}
                >
                  <Calendar className="h-5 w-5 shrink-0 text-indigo-700" />
                  <span className="min-w-0">
                    <span className={mobileLabelClass}>{t("travelDates")}</span>
                    <span className="block truncate text-base font-bold leading-5 text-slate-950">
                      {departureDateInput
                        ? tripTypeInput === "round-trip" && returnDateInput
                          ? `${formatCompactDateLabel(departureDateInput, calendarLocale)} – ${formatCompactDateLabel(returnDateInput, calendarLocale)}`
                          : formatDateLabel(departureDateInput, calendarLocale)
                        : t("travelDates")}
                    </span>
                  </span>
                </button>
              </div>

              <div ref={travelerCabinWrapRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTripTypeMenuOpen(false);
                    setActiveSuggest(null);
                    setDropdownPosition(null);
                    setActiveDatePicker(null);
                    setDatePickerPosition(null);
                    setTravelerPopoverOpen(true);
                    setTravelerPopoverPosition(null);
                  }}
                  className={cn(
                    mobileFieldClass,
                    "flex min-h-[68px] w-full items-center justify-between gap-3 text-start",
                  )}
                >
                  <span className="min-w-0">
                    <span className={mobileLabelClass}>{t("travelersAndCabin")}</span>
                    <span className="block truncate text-base font-bold leading-5 text-slate-950">
                      {buildTravelerCabinSummary(
                        adultCount,
                        childCount,
                        infantCount,
                        cabinClassInput,
                        t,
                      )}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-1.5 shadow-sm shadow-slate-900/[0.03]">
                <span className="mb-2 block px-2 text-[0.68rem] font-black uppercase leading-4 tracking-[0.16em] text-slate-500">
                  {t("tripType")}
                </span>
                <div
                  className="grid grid-cols-2 gap-1.5"
                  role="group"
                  aria-label={t("tripType")}
                >
                  {mobileTripTypeOptions.map((option) => {
                    const selected = tripTypeInput === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => handleTripTypeChange(option.value)}
                        className={cn(
                          "focus-ring min-h-11 rounded-2xl px-3 py-2 text-sm font-black transition-colors",
                          selected
                            ? "bg-slate-950 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                        )}
                      >
                        {t(option.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                className="mt-1 h-[52px] w-full rounded-2xl bg-gradient-to-r from-indigo-700 to-violet-600 text-base font-bold text-white shadow-lg shadow-indigo-700/20 ring-1 ring-indigo-500/20"
              >
                {t("search")}
              </Button>
            </div>
          </div>
        </form>
      );
    }
    if (placement === "desktop" && showCompactSearchSummary) {
      return (
        <div className="mx-auto w-full min-w-0 max-w-[54rem] sm:block">
          <div className="overflow-visible rounded-sm border border-slate-300 bg-white p-1 shadow-[0_8px_22px_rgba(15,23,42,0.12)]">
            <button
              type="button"
              aria-label={t("editFlightSearch")}
              onClick={expandStickySearch}
              className="group focus-ring flex w-full min-w-0 flex-col gap-2 rounded-[2px] bg-white px-3 py-2.5 text-start transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
            >
              <span className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
                  <ArrowRightLeft
                    className="h-4 w-4 shrink-0 text-violet-600"
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    <span className="min-w-0 truncate">
                      {mobileOriginSummary}
                    </span>
                    <span
                      className="shrink-0 text-slate-400"
                      aria-hidden="true"
                    >
                      →
                    </span>
                    <span className="min-w-0 truncate">
                      {mobileDestinationSummary}
                    </span>
                  </span>
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-slate-600">
                  {mobileTripTypeSummary}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-slate-600">
                  {mobileDateSummary}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-slate-600">
                  {travelerCabinSummary}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-[2px] border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700 shadow-sm transition group-hover:border-indigo-200 group-hover:bg-white sm:self-center">
                <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
                {t("edit")}
              </span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <form
        ref={placement === "desktop" ? searchFormRef : undefined}
        onSubmit={handleCompactSearchSubmit}
        onChangeCapture={markExpandedSearchInteraction}
        className={cn(
          "mx-auto w-full min-w-0 max-w-full sm:max-w-5xl",
          placement === "desktop" && "hidden sm:block",
        )}
      >
        <div className="flex flex-col gap-0">
          <div className="flex items-center justify-between sm:hidden">
            <span className="text-sm font-semibold text-slate-500">
              {t("editSearch")}
            </span>
            <button
              type="button"
              aria-label={t("closeSearchForm")}
              onClick={closeMobileSearchDrawer}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              ×
            </button>
          </div>

          <div
            className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]"
          >
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[132px_minmax(0,2.35fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] lg:gap-0">
              <div ref={tripTypeMenuRef} className="relative">
                <button
                  type="button"
                  aria-expanded={tripTypeMenuOpen}
                  aria-haspopup="listbox"
                  onClick={() => {
                    setActiveSuggest(null);
                    setDropdownPosition(null);
                    setActiveDatePicker(null);
                    setDatePickerPosition(null);
                    setTravelerPopoverOpen(false);
                    setTravelerPopoverPosition(null);
                    setTripTypeMenuOpen((open) => !open);
                  }}
                  className="focus-ring flex h-full min-h-[54px] w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-start transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 lg:rounded-none lg:rounded-s-xl lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">
                      {t("tripType")}
                    </span>
                    <span className="block truncate text-sm font-semibold text-slate-950">
                      {tripTypeInput === "one-way" ? t("oneWay") : t("roundTrip")}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 shrink-0 text-slate-500 transition-transform",
                      tripTypeMenuOpen && "rotate-180",
                    )}
                  />
                </button>

                {tripTypeMenuOpen ? (
                  <div
                    role="listbox"
                    aria-label={t("tripType")}
                    className="absolute start-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected={tripTypeInput === "round-trip"}
                      onClick={() => handleTripTypeChange("round-trip")}
                      className={cn(
                        "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-start text-sm font-medium transition-colors",
                        tripTypeInput === "round-trip"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {t("roundTrip")}
                    </button>

                    <button
                      type="button"
                      role="option"
                      aria-selected={tripTypeInput === "one-way"}
                      onClick={() => handleTripTypeChange("one-way")}
                      className={cn(
                        "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-start text-sm font-medium transition-colors",
                        tripTypeInput === "one-way"
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {t("oneWay")}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-stretch rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                <div
                  ref={originWrapRef}
                  className="relative min-h-[54px] px-0 py-0 pe-3"
                >
                  <label
                    className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600"
                    htmlFor="results-origin"
                  >
                    {t("origin")}
                  </label>
                  <input
                    id="results-origin"
                    ref={originInputRef}
                    name="origin"
                    required
                    value={originInput}
                    onFocus={() => {
                      setTripTypeMenuOpen(false);
                      setActiveDatePicker(null);
                      setDatePickerPosition(null);
                      setTravelerPopoverOpen(false);
                      setTravelerPopoverPosition(null);
                      if (originInput.trim().length >= 2)
                        setActiveSuggest("origin");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }
                    }}
                    onChange={(event) => {
                      setTripTypeMenuOpen(false);
                      setActiveDatePicker(null);
                      setDatePickerPosition(null);
                      setTravelerPopoverOpen(false);
                      setTravelerPopoverPosition(null);
                      setOriginInput(event.target.value);
                      setOriginCode("");

                      if (event.target.value.trim().length >= 2) {
                        setActiveSuggest("origin");
                      } else {
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }
                    }}
                    placeholder={t("fromPlaceholder")}
                    autoComplete="off"
                    className="h-8 w-full border-0 bg-transparent p-0 pe-7 text-[16px] font-semibold text-slate-950 outline-none placeholder:text-slate-400 md:text-sm"
                  />

                  {originInput ? (
                    <button
                      type="button"
                      aria-label={t("clearOrigin")}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        clearOriginField();
                      }}
                      className="focus-ring absolute end-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X size={14} />
                    </button>
                  ) : null}

                  {activeSuggest === "origin" ? (
                    <SuggestionList
                      id="flight-airport-suggestions"
                      alignToField
                      suggestions={resolvedOriginSuggestions}
                      onSelect={(value) => {
                        markExpandedSearchInteraction();
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
                    aria-label={t("swapOriginDestination")}
                    onClick={handleSwapLocations}
                    className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                  >
                    <ArrowRightLeft size={14} />
                  </button>
                </div>

                <div
                  ref={destinationWrapRef}
                  className="relative min-h-[54px] px-0 py-0 ps-3"
                >
                  <label
                    className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600"
                    htmlFor="results-destination"
                  >
                    {t("destination")}
                  </label>
                  <input
                    id="results-destination"
                    ref={destinationInputRef}
                    name="destination"
                    required
                    value={destinationInput}
                    onFocus={() => {
                      setTripTypeMenuOpen(false);
                      setActiveDatePicker(null);
                      setDatePickerPosition(null);
                      setTravelerPopoverOpen(false);
                      setTravelerPopoverPosition(null);
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
                      setTripTypeMenuOpen(false);
                      setActiveDatePicker(null);
                      setDatePickerPosition(null);
                      setTravelerPopoverOpen(false);
                      setTravelerPopoverPosition(null);
                      setDestinationInput(event.target.value);
                      setDestinationCode("");

                      if (event.target.value.trim().length >= 2) {
                        setActiveSuggest("destination");
                      } else {
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }
                    }}
                    placeholder={t("toPlaceholder")}
                    autoComplete="off"
                    className="h-8 w-full border-0 bg-transparent p-0 pe-7 text-[16px] font-semibold text-slate-950 outline-none placeholder:text-slate-400 md:text-sm"
                  />

                  {destinationInput ? (
                    <button
                      type="button"
                      aria-label={t("clearDestination")}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        clearDestinationField();
                      }}
                      className="focus-ring absolute end-0 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      <X size={14} />
                    </button>
                  ) : null}

                  {activeSuggest === "destination" ? (
                    <SuggestionList
                      id="flight-airport-suggestions"
                      alignToField
                      suggestions={resolvedDestinationSuggestions}
                      onSelect={(value) => {
                        markExpandedSearchInteraction();
                        setDestinationInput(value);
                        setDestinationCode(value);
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                      }}
                    />
                  ) : null}
                </div>
              </div>

              <div ref={departureWrapRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTripTypeMenuOpen(false);
                    setActiveSuggest(null);
                    setDropdownPosition(null);
                    setTravelerPopoverOpen(false);
                    setTravelerPopoverPosition(null);
                    setActiveDatePicker("departure");
                    setDatePickerPosition(null);
                  }}
                  className="focus-ring flex h-full min-h-[54px] w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-start transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200"
                >
                  <Calendar className="h-4 w-4 shrink-0 text-indigo-700" />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">
                      {t("travelDates")}
                    </span>
                    <span className="block truncate text-sm font-semibold text-slate-950">
                      {departureDateInput
                        ? tripTypeInput === "round-trip" && returnDateInput
                          ? `${formatCompactDateLabel(departureDateInput, calendarLocale)} – ${formatCompactDateLabel(returnDateInput, calendarLocale)}`
                          : formatDateLabel(departureDateInput, calendarLocale)
                        : t("travelDates")}
                    </span>
                  </span>
                </button>

                {activeDatePicker ? (
                  <DatePickerPopover
                    alignToField="right"
                    position={datePickerPosition ?? { top: 0, left: 0, width: 0 }}
                    onClose={() => {
                      setActiveDatePicker(null);
                      setDatePickerPosition(null);
                    }}
                    month={calendarMonth}
                    departureValue={departureDateInput}
                    returnValue={returnDateInput}
                    activePicker={activeDatePicker}
                    tripType={tripTypeInput}
                    onMonthChange={setCalendarMonth}
                    onSelect={applyFlightDateSelection}
                    onClear={() => {
                      markExpandedSearchInteraction();
                      if (activeDatePicker === "departure") {
                        setDepartureDateInput("");
                        setReturnDateInput("");
                      }

                      if (activeDatePicker === "return") {
                        setReturnDateInput("");
                      }
                    }}
                    onToday={() => {
                      setActiveDatePicker(null);
                      setDatePickerPosition(null);
                    }}
                  />
                ) : null}
              </div>

              <div ref={travelerCabinWrapRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTripTypeMenuOpen(false);
                    setActiveSuggest(null);
                    setDropdownPosition(null);
                    setActiveDatePicker(null);
                    setDatePickerPosition(null);
                    setTravelerPopoverOpen(true);
                    setTravelerPopoverPosition(null);
                  }}
                  className="focus-ring flex h-full min-h-[54px] w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-start transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">
                      {t("travelers")}
                    </span>
                    <span className="block truncate text-sm font-semibold text-slate-950">
                      {buildTravelerCabinSummary(
                        adultCount,
                        childCount,
                        infantCount,
                        cabinClassInput,
                        t,
                      )}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                </button>

                {travelerPopoverOpen ? (
                  <TravelerCabinPopover
                    alignToField="right"
                    position={travelerPopoverPosition ?? { top: 0, left: 0, width: 0 }}
                    onClose={() => {
                      setTravelerPopoverOpen(false);
                      setTravelerPopoverPosition(null);
                    }}
                    adultCount={adultCount}
                    childCount={childCount}
                    infantCount={infantCount}
                    cabinClass={cabinClassInput}
                    onAdultChange={(nextValue) => {
                      markExpandedSearchInteraction();
                      const nextAdultCount = Math.min(9, Math.max(1, nextValue));

                      setAdultCount(nextAdultCount);
                      setChildCount((current) => Math.min(current, 9 - nextAdultCount));
                      setInfantCount((current) =>
                        Math.min(current, nextAdultCount, 9 - nextAdultCount),
                      );
                    }}
                    onChildChange={(nextValue) => {
                      markExpandedSearchInteraction();
                      const nextChildCount = Math.min(
                        9 - adultCount,
                        Math.max(0, nextValue),
                      );

                      setChildCount(nextChildCount);
                      setInfantCount((current) =>
                        Math.min(current, 9 - adultCount - nextChildCount),
                      );
                    }}
                    onInfantChange={(nextValue) => {
                      markExpandedSearchInteraction();
                      setInfantCount(
                        Math.min(
                          adultCount,
                          9 - adultCount - childCount,
                          Math.max(0, nextValue),
                        ),
                      );
                    }}
                    onCabinClassChange={(nextValue) => {
                      markExpandedSearchInteraction();
                      setCabinClassInput(nextValue);
                    }}
                  />
                ) : null}
              </div>

              <Button
                type="submit"
                className="h-full min-h-[54px] w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-700/20 ring-1 ring-indigo-500/20 lg:min-w-[112px] lg:rounded-s-none lg:rounded-e-xl"
              >
                {t("search")}
              </Button>
            </div>
          </div>
        </div>
      </form>
    );
  }

  function renderMobileControlsRow() {
    return (
      <div className="mx-auto flex w-full max-w-3xl min-w-0 items-stretch gap-2.5">
        <Button
          type="button"
          variant="secondary"
          aria-label={
            activeFilterCount > 0
              ? t("openFiltersWithCount").replace("{{count}}", activeFilterLabel)
              : t("openFilters")
          }
          className="relative h-16 w-[72px] shrink-0 rounded-md border border-slate-200/90 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:text-slate-900 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          onClick={() => setFiltersOpen(true)}
        >
          <span className="flex flex-col items-center justify-center gap-1 leading-none">
            <SlidersHorizontal size={17} strokeWidth={2.3} />
            <span>{t("filters")}</span>
          </span>
          {activeFilterCount > 0 ? (
            <span className="absolute end-1.5 top-1.5 inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-indigo-50 px-1.5 text-[11px] font-semibold leading-none text-indigo-700 shadow-sm ring-2 ring-white">
              {activeFilterCount}
            </span>
          ) : null}
        </Button>

        <button
          type="button"
          onClick={openMobileSearchDrawer}
          className="flex h-16 min-w-0 max-w-full flex-1 items-center justify-between gap-3 overflow-hidden rounded-md border border-slate-200/90 bg-white px-4 py-0 text-start shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        >
          <span className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
            <span className="block truncate text-[16px] font-bold leading-5 text-slate-950">
              {mobileRouteSummary}
            </span>
            <span className="mt-1 block truncate text-[12px] font-semibold leading-4 text-slate-600">
              {mobileTripTypeSummary} · {mobileDateSummary} ·{" "}
              {mobileTravelerSummary}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
          >
            <SquarePen size={16} strokeWidth={2.1} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <main className="flex-1 bg-[#f6f8fb] pb-8">
      <div
        className={cn(
          "sticky top-0 z-50 border-b border-slate-200/70 bg-[#f6f8fb]/95 px-4 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)] backdrop-blur sm:hidden",
          mobileSearchOpen && "hidden",
        )}
      >
        {renderMobileControlsRow()}
      </div>

      <div
        className={cn(
          "fixed inset-0 z-[10000] min-h-[100dvh] overflow-hidden bg-slate-50 sm:hidden",
          mobileSearchOpen ? "block" : "hidden",
        )}
      >
        {mobileSearchOpen ? renderCompactSearchForm("mobile") : null}
      </div>

      {mobileSearchOpen ? renderCompactSearchPopovers("mobile") : null}

      {mobileSearchOpen ? (
        <>
          <MobileAirportPicker
            open={activeMobileAirportPicker === "origin"}
            title={t("chooseOrigin")}
            inputId="results-mobile-origin-picker-search"
            value={originInput}
            suggestions={originSuggestions}
            isLoading={originSuggestionsLoading}
            launcherRef={mobileOriginLauncherRef}
            labels={airportPickerLabels}
            onChange={(nextValue) => {
              setOriginInput(nextValue);
              setOriginCode("");
              if (nextValue.trim().length < 2) {
                setOriginSuggestions([]);
                setOriginSuggestionsLoading(false);
              }
            }}
            onClear={() => {
              setOriginInput("");
              setOriginCode("");
              setOriginSuggestions([]);
              setOriginSuggestionsLoading(false);
            }}
            onSelect={(option) => {
              setOriginInput(option.code);
              setOriginCode(option.code);
              setActiveMobileAirportPicker(null);
            }}
            onClose={() => setActiveMobileAirportPicker(null)}
          />
          <MobileAirportPicker
            open={activeMobileAirportPicker === "destination"}
            title={t("chooseDestination")}
            inputId="results-mobile-destination-picker-search"
            value={destinationInput}
            suggestions={destinationSuggestions}
            isLoading={destinationSuggestionsLoading}
            launcherRef={mobileDestinationLauncherRef}
            labels={airportPickerLabels}
            onChange={(nextValue) => {
              setDestinationInput(nextValue);
              setDestinationCode("");
              if (nextValue.trim().length < 2) {
                setDestinationSuggestions([]);
                setDestinationSuggestionsLoading(false);
              }
            }}
            onClear={() => {
              setDestinationInput("");
              setDestinationCode("");
              setDestinationSuggestions([]);
              setDestinationSuggestionsLoading(false);
            }}
            onSelect={(option) => {
              setDestinationInput(option.code);
              setDestinationCode(option.code);
              setActiveMobileAirportPicker(null);
            }}
            onClose={() => setActiveMobileAirportPicker(null)}
          />
        </>
      ) : null}

      <div ref={stickySentinelRef} className="h-px" aria-hidden="true" />
      <section
        className={cn(
          "sticky top-0 z-40 hidden border-b border-slate-200/80 bg-[#f6f8fb]/95 backdrop-blur transition-[padding,box-shadow] duration-200 sm:block",
          showCompactSearchSummary
            ? "py-1.5 shadow-[0_3px_12px_rgba(15,23,42,0.05)]"
            : "py-3 shadow-sm shadow-slate-900/5",
        )}
      >
        <div className="page-shell">
          {!mobileSearchOpen ? renderCompactSearchForm("desktop") : null}
        </div>
      </section>

      <div className="page-shell grid gap-4 pb-5 pt-4 sm:pt-5 lg:grid-cols-[232px_minmax(0,1fr)]">
        <aside className={cn("hidden lg:block", desktopFilterStickyTopClass)}>
          <Filters
            layout="desktop"
            activeFilterCount={activeFilterCount}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            priceBounds={priceBounds}
            priceLabelCurrency={priceLabelCurrency}
            selectedCurrency={selectedCurrency}
            timeFilterMode={timeFilterMode}
            setTimeFilterMode={setTimeFilterMode}
            timeBounds={timeBounds}
            maxTakeoffMinutes={maxTakeoffMinutes}
            setMaxTakeoffMinutes={setMaxTakeoffMinutes}
            maxLandingMinutes={maxLandingMinutes}
            setMaxLandingMinutes={setMaxLandingMinutes}
            durationBounds={durationBounds}
            maxDurationMinutes={maxDurationMinutes}
            setMaxDurationMinutes={setMaxDurationMinutes}
            stopOptions={stopOptions}
            selectedStops={selectedStops}
            setSelectedStops={setSelectedStops}
            airlineOptions={airlineOptions}
            selectedAirlines={selectedAirlines}
            setSelectedAirlines={setSelectedAirlines}
            airportOptions={airportOptions}
            selectedAirports={selectedAirports}
            setSelectedAirports={setSelectedAirports}
            flightQualityOptions={flightQualityOptions}
            selectedFlightQuality={selectedFlightQuality}
            setSelectedFlightQuality={setSelectedFlightQuality}
            baggageIncludedOnly={baggageIncludedOnly}
            setBaggageIncludedOnly={setBaggageIncludedOnly}
            flexibleOnly={flexibleOnly}
            setFlexibleOnly={setFlexibleOnly}
            onFilterChange={triggerFilterApplying}
          />
        </aside>

        <section className="min-w-0 space-y-4">
          {loading ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-teal/20 bg-white p-5 text-sm font-bold text-teal-dark shadow-sm">
                {t(loadingMessageKeys[messageIndex])}
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
            <div className={cn(resultStackClass, "space-y-4")}>
              <div className="w-full">
                <div className="hidden auto-rows-fr grid-cols-3 gap-2 sm:grid">
                  <SummarySortButton
                    label={t("cheapest")}
                    details={buildSummaryDetails(
                      sortSummaries.cheapest,
                      "cheapest",
                    )}
                    active={sortMode === "cheapest"}
                    onClick={() => {
                      triggerFilterApplying();
                      setSortMode("cheapest");
                    }}
                  />

                  <SummarySortButton
                    label={t("best")}
                    details={buildSummaryDetails(sortSummaries.best, "best")}
                    active={sortMode === "best"}
                    onClick={() => {
                      triggerFilterApplying();
                      setSortMode("best");
                    }}
                  />

                  <SummarySortButton
                    label={t("quickest")}
                    details={buildSummaryDetails(
                      sortSummaries.fastest,
                      "fastest",
                    )}
                    active={sortMode === "fastest"}
                    onClick={() => {
                      triggerFilterApplying();
                      setSortMode("fastest");
                    }}
                  />
                </div>

                <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:hidden">
                  <SummarySortButton
                    label={t("cheapest")}
                    details={buildSummaryDetails(
                      sortSummaries.cheapest,
                      "cheapest",
                    )}
                    active={sortMode === "cheapest"}
                    mobile
                    onClick={() => {
                      triggerFilterApplying();
                      setSortMode("cheapest");
                    }}
                  />

                  <SummarySortButton
                    label={t("best")}
                    details={buildSummaryDetails(sortSummaries.best, "best")}
                    active={sortMode === "best"}
                    mobile
                    onClick={() => {
                      triggerFilterApplying();
                      setSortMode("best");
                    }}
                  />

                  <SummarySortButton
                    label={t("quickest")}
                    details={buildSummaryDetails(
                      sortSummaries.fastest,
                      "fastest",
                    )}
                    active={sortMode === "fastest"}
                    mobile
                    onClick={() => {
                      triggerFilterApplying();
                      setSortMode("fastest");
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3 sm:hidden">
                <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-navy">
                    {formatResultsFound(sortedResults.length, t)}
                  </p>
                </div>
              </div>

              <div className="hidden w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-navy">
                  {formatResultsFound(sortedResults.length, t)}
                </p>

                <Button
                  variant="secondary"
                  className="h-10 rounded-xl border-slate-300 text-sm font-bold transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 lg:hidden"
                  onClick={() => setFiltersOpen(true)}
                >
                  <SlidersHorizontal size={17} />
                  {activeFilterCount > 0
                    ? t("filtersWithCount").replace("{{count}}", String(activeFilterCount))
                    : t("filters")}
                </Button>
              </div>

              {warnings.length > 0 ? (
                <div
                  className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900 shadow-sm"
                  role="status"
                >
                  {t("limitedProviderChecks")}
                </div>
              ) : null}

              {filterApplying ? (
                <div className="space-y-3">
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-indigo-100 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm"
                  >
                    {t("updatingResults")}
                  </div>
                  <FlightCardSkeleton />
                  <FlightCardSkeleton />
                </div>
              ) : sortedResults.length ? (
                sortedResults.map((flight, index) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    isAccented={index % 2 === 0}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-muted shadow-sm">
                  {t("noFlightsMatchFilters")}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-50 bg-navy/40 lg:hidden",
          filtersOpen ? "block" : "hidden",
        )}
        onClick={() => setFiltersOpen(false)}
      />

      <aside
        className={cn(
          "fixed bottom-0 start-0 end-0 z-50 flex max-h-[86dvh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl transition-transform lg:hidden",
          filtersOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex-1 overflow-auto p-5 pb-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t("filters")}
              </h2>
              {activeFilterCount > 0 ? (
                <p className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  {activeFilterLabel}
                </p>
              ) : null}
            </div>
            <Button
              variant="ghost"
              className="h-10 w-10 px-0"
              aria-label={t("closeFilters")}
              onClick={() => setFiltersOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>

          <Filters
            layout="mobile"
            activeFilterCount={activeFilterCount}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            priceBounds={priceBounds}
            priceLabelCurrency={priceLabelCurrency}
            selectedCurrency={selectedCurrency}
            timeFilterMode={timeFilterMode}
            setTimeFilterMode={setTimeFilterMode}
            timeBounds={timeBounds}
            maxTakeoffMinutes={maxTakeoffMinutes}
            setMaxTakeoffMinutes={setMaxTakeoffMinutes}
            maxLandingMinutes={maxLandingMinutes}
            setMaxLandingMinutes={setMaxLandingMinutes}
            durationBounds={durationBounds}
            maxDurationMinutes={maxDurationMinutes}
            setMaxDurationMinutes={setMaxDurationMinutes}
            stopOptions={stopOptions}
            selectedStops={selectedStops}
            setSelectedStops={setSelectedStops}
            airlineOptions={airlineOptions}
            selectedAirlines={selectedAirlines}
            setSelectedAirlines={setSelectedAirlines}
            airportOptions={airportOptions}
            selectedAirports={selectedAirports}
            setSelectedAirports={setSelectedAirports}
            flightQualityOptions={flightQualityOptions}
            selectedFlightQuality={selectedFlightQuality}
            setSelectedFlightQuality={setSelectedFlightQuality}
            baggageIncludedOnly={baggageIncludedOnly}
            setBaggageIncludedOnly={setBaggageIncludedOnly}
            flexibleOnly={flexibleOnly}
            setFlexibleOnly={setFlexibleOnly}
            onFilterChange={triggerFilterApplying}
          />
        </div>

        <div className="border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 text-base font-bold text-white shadow-lg shadow-indigo-700/20"
            onClick={() => {
              triggerFilterApplying();
              setFiltersOpen(false);
            }}
          >
            {t("done")}
          </Button>
        </div>
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
  countryHint: string,
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
  return value.normalize("NFKD").replace(/\p{M}/gu, "").trim().toLowerCase();
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

function getUniformResultCurrency(results: PublicFlightResult[]) {
  const currencies = new Set(
    results.map((result) => result.currency?.toUpperCase()).filter(Boolean),
  );

  if (currencies.size === 1) {
    return Array.from(currencies)[0];
  }

  return null;
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

function formatDateLabel(value: string, locale = "en-US"): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCompactDateLabel(value: string, locale = "en-US"): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function parseDateValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime()) || formatDateValue(date) !== value) {
    return null;
  }

  return date;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isDateValueBefore(value: string, comparisonValue: string): boolean {
  const date = parseDateValue(value);
  const comparisonDate = parseDateValue(comparisonValue);

  if (!date || !comparisonDate) return false;

  return startOfLocalDay(date) < startOfLocalDay(comparisonDate);
}

function isPastLocalDate(date: Date): boolean {
  const today = new Date();

  return startOfLocalDay(date) < startOfLocalDay(today);
}

function isValidFutureOrTodayDateValue(value: string): boolean {
  const date = parseDateValue(value);

  if (!date) return false;

  return !isPastLocalDate(date);
}

function isSelectableFlightDate(date: Date): boolean {
  return !isPastLocalDate(date);
}

type FlightDateSelectionState = {
  activePicker: "departure" | "return";
  date: Date;
  departureDate: string;
  returnDate: string;
  tripType: string;
};

function getNextFlightDateSelection({
  activePicker,
  date,
  departureDate,
  returnDate,
  tripType,
}: FlightDateSelectionState): {
  activePicker: "return" | null;
  departureDate: string;
  returnDate: string;
} | null {
  if (!isSelectableFlightDate(date)) return null;

  const value = formatDateValue(date);

  if (tripType !== "round-trip" || activePicker === "departure") {
    return {
      activePicker: tripType === "round-trip" ? "return" : null,
      departureDate: value,
      returnDate:
        tripType === "round-trip" &&
        returnDate &&
        isValidFutureOrTodayDateValue(returnDate) &&
        !isDateValueBefore(returnDate, value)
          ? returnDate
          : "",
    };
  }

  if (!departureDate || !isValidFutureOrTodayDateValue(departureDate)) {
    return {
      activePicker: "return",
      departureDate: value,
      returnDate: "",
    };
  }

  if (isDateValueBefore(value, departureDate)) {
    return {
      activePicker: "return",
      departureDate: value,
      returnDate: "",
    };
  }

  return {
    activePicker: null,
    departureDate,
    returnDate: value,
  };
}

function normalizeFlightDateSearchParams(
  params: Pick<URLSearchParams, "get" | "toString">,
) {
  const nextParams = new URLSearchParams(params.toString());
  const tripType = nextParams.get("tripType") || "round-trip";
  const departureDate = nextParams.get("departureDate")?.trim() || "";
  const returnDate = nextParams.get("returnDate")?.trim() || "";

  if (departureDate && !isValidFutureOrTodayDateValue(departureDate)) {
    nextParams.delete("departureDate");
    nextParams.delete("returnDate");
    return nextParams;
  }

  if (tripType !== "round-trip") {
    nextParams.delete("returnDate");
    return nextParams;
  }

  if (
    returnDate &&
    (!isValidFutureOrTodayDateValue(returnDate) ||
      (departureDate && isDateValueBefore(returnDate, departureDate)))
  ) {
    nextParams.delete("returnDate");
  }

  return nextParams;
}

function clearFilterSearchParams(params: URLSearchParams) {
  for (const key of filterQueryParamKeys) {
    params.delete(key);
  }
}

function getSearchQueryString(params: Pick<URLSearchParams, "toString">) {
  const searchParams = new URLSearchParams(params.toString());
  clearFilterSearchParams(searchParams);

  return searchParams.toString();
}

function parseBoundedFilterNumber(
  value: string | null,
  min: number | null,
  max: number | null,
) {
  if (!value || min === null || max === null || max <= min) return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;

  return parsed;
}

function isSafeFilterValue(value: string) {
  return value.length > 0 && value.length <= 120;
}

function readFilterList(
  params: URLSearchParams,
  key: string,
  allowedValues: Set<string>,
) {
  const values = params
    .getAll(key)
    .map((value) => value.trim())
    .filter(isSafeFilterValue);

  const uniqueValues = Array.from(new Set(values));

  if (!allowedValues.size) return uniqueValues.slice(0, 30);

  return uniqueValues.filter((value) => allowedValues.has(value)).slice(0, 30);
}

function appendFilterList(
  params: URLSearchParams,
  key: string,
  values: string[],
) {
  for (const value of Array.from(new Set(values)).filter(isSafeFilterValue)) {
    params.append(key, value);
  }
}

function areStringArraysEqual(first: string[], second: string[]) {
  if (first.length !== second.length) return false;

  return first.every((value, index) => value === second[index]);
}

function buildMonthDays(month: Date): Array<Date | null> {
  const firstDay = startOfMonth(month);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
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

function isSameDateValue(date: Date, value: string): boolean {
  return Boolean(value) && formatDateValue(date) === value;
}

function cabinClassLabel(value: string, t: (key: string) => string) {
  const option = cabinClassOptions.find((item) => item.value === value);
  return option ? t(option.labelKey) : t("economy");
}

function pluralize(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function pluralizeArabicTraveler(
  count: number,
  singular: string,
  plural: string,
) {
  if (count === 1) return `${singular} واحد`;

  return `${count} ${plural}`;
}

function buildTravelerCabinSummary(
  adults: number,
  children: number,
  infants: number,
  cabinClass: string,
  t: (key: string) => string,
  locale?: string,
) {
  const isArabic = locale === "ar";
  const formatTravelerCount = isArabic ? pluralizeArabicTraveler : pluralize;
  const joiner = isArabic ? "، " : ", ";
  const parts = [
    formatTravelerCount(adults, t("adultSingular"), t("adultPlural")),
  ];

  if (children > 0) {
    parts.push(
      formatTravelerCount(children, t("childSingular"), t("childPlural")),
    );
  }

  if (infants > 0) {
    parts.push(
      formatTravelerCount(infants, t("infantSingular"), t("infantPlural")),
    );
  }

  parts.push(cabinClassLabel(cabinClass, t));

  return parts.join(joiner);
}

function DatePickerPopover({
  position,
  mobileSheet = false,
  alignToField,
  month,
  departureValue,
  returnValue,
  activePicker,
  tripType,
  onMonthChange,
  onSelect,
  onClear,
  onToday,
  onClose,
}: {
  position: { top: number; left: number; width: number };
  mobileSheet?: boolean;
  alignToField?: "left" | "right";
  month: Date;
  departureValue: string;
  returnValue: string;
  activePicker: "departure" | "return";
  tripType: string;
  onMonthChange: (month: Date) => void;
  onSelect: (date: Date) => void;
  onClear: () => void;
  onToday: () => void;
  onClose: () => void;
}) {
  const { t: dictionary, locale } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const calendarLocale = normalizeFlightResultsCalendarLocale(locale);
  const leftMonth = startOfMonth(month);
  const rightMonth = addMonths(leftMonth, 1);
  const today = new Date();
  const weekdays = [
    t("weekdayMon"),
    t("weekdayTue"),
    t("weekdayWed"),
    t("weekdayThu"),
    t("weekdayFri"),
    t("weekdaySat"),
    t("weekdaySun"),
  ];

  const dialogStyle = mobileSheet
    ? ({
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        zIndex: 10020,
      } as const)
    : alignToField
      ? ({
          position: "absolute",
          top: "calc(100% + 0.5rem)",
          ...(alignToField === "right" ? { right: 0 } : { left: 0 }),
          width: "min(560px, calc(100vw - 2rem))",
          zIndex: 70,
        } as const)
      : ({
          position: "fixed",
          top: position.top,
          left: position.left,
          width: position.width,
          zIndex: 9999,
        } as const);

  const renderMonth = (renderedMonth: Date) => (
    <div className="min-w-0">
      <p className="mb-2 text-center text-sm font-bold text-slate-900">
        {new Intl.DateTimeFormat(calendarLocale, {
          month: "long",
          year: "numeric",
        }).format(renderedMonth)}
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
                className={mobileSheet ? "h-9" : "h-8"}
              />
            );
          }

          const selectedDeparture = isSameDateValue(date, departureValue);
          const selectedReturn = isSameDateValue(date, returnValue);
          const isToday = isSameDateValue(date, formatDateValue(today));
          // Flight calendars use one shared rule for enabled days: only past
          // local days are disabled. In round-trip return mode, future dates
          // before departure stay enabled and reset the departure date instead
          // of trapping the user in an invalid return-only state.
          const disabledDate = !isSelectableFlightDate(date);

          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={disabledDate}
              aria-disabled={disabledDate}
              onClick={() => {
                if (disabledDate || !isSelectableFlightDate(date)) return;
                onSelect(date);
              }}
              className={cn(
                mobileSheet ? "h-9 rounded-md text-xs font-semibold transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 sm:h-10 sm:text-sm" : "h-8 rounded-md text-xs font-semibold transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500",
                selectedDeparture || selectedReturn
                  ? "bg-[#0a66c2] text-white hover:bg-[#085aa9] focus:bg-[#085aa9]"
                  : disabledDate
                    ? "cursor-not-allowed text-slate-300 hover:bg-transparent"
                    : "text-slate-800",
                isToday &&
                  !(selectedDeparture || selectedReturn) &&
                  !disabledDate
                  ? "ring-1 ring-slate-300"
                  : "",
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
      aria-modal={mobileSheet ? "true" : undefined}
      aria-label={
        tripType !== "round-trip" || activePicker === "departure"
          ? t("selectDepartureDate")
          : t("selectReturnDate")
      }
      style={dialogStyle}
      className={cn(
        "w-full border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]",
        mobileSheet
          ? "flex h-[100dvh] min-h-0 max-w-full flex-col overflow-y-auto overscroll-contain rounded-none p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]"
          : "max-w-[min(560px,calc(100vw-2rem))] rounded-2xl p-3",
      )}
    >
      {mobileSheet ? (
        <div className="mb-3 flex shrink-0 items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {t("travelDates")}
            </p>
            <h3 className="text-base font-bold text-slate-950">
              {tripType !== "round-trip" || activePicker === "departure"
                ? t("selectDeparture")
                : t("selectReturn")}
            </h3>
          </div>
          <button
            type="button"
            aria-label={t("closeDatePicker")}
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="mb-3 flex shrink-0 items-center justify-between">
        <button
          type="button"
          aria-label={t("previousMonth")}
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 sm:text-sm"
          onClick={() => onMonthChange(addMonths(leftMonth, -1))}
        >
          {t("previousShort")}
        </button>

        <button
          type="button"
          aria-label={t("nextMonth")}
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 sm:text-sm"
          onClick={() => onMonthChange(addMonths(leftMonth, 1))}
        >
          {t("nextShort")}
        </button>
      </div>

      <div className={cn("min-h-0 flex-1 grid gap-3", mobileSheet ? "overflow-visible md:grid-cols-2" : "md:grid-cols-2")}>
        {renderMonth(leftMonth)}
        <div className={cn(mobileSheet ? "block" : "hidden md:block")}>{renderMonth(rightMonth)}</div>
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white pt-3">
        <button
          type="button"
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 sm:text-sm"
          onClick={onClear}
        >
          {t("clear")}
        </button>

        <button
          type="button"
          className="min-h-11 rounded-xl bg-[#0a66c2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#085aa9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1"
          onClick={onToday}
        >
          {t("done")}
        </button>
      </div>
    </div>
  );
}

function TravelerCabinPopover({
  position,
  mobileSheet = false,
  alignToField,
  adultCount,
  childCount,
  infantCount,
  cabinClass,
  onAdultChange,
  onChildChange,
  onInfantChange,
  onCabinClassChange,
  onClose,
}: {
  position: { top: number; left: number; width: number };
  mobileSheet?: boolean;
  alignToField?: "left" | "right";
  adultCount: number;
  childCount: number;
  infantCount: number;
  cabinClass: CabinClassValue;
  onAdultChange: (value: number) => void;
  onChildChange: (value: number) => void;
  onInfantChange: (value: number) => void;
  onCabinClassChange: (value: CabinClassValue) => void;
  onClose: () => void;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const dialogStyle = mobileSheet
    ? ({
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        zIndex: 10020,
      } as const)
    : alignToField
      ? ({
          position: "absolute",
          top: "calc(100% + 0.5rem)",
          ...(alignToField === "right" ? { right: 0 } : { left: 0 }),
          width: "min(320px, calc(100vw - 2rem))",
          zIndex: 70,
        } as const)
      : ({
          position: "fixed",
          top: position.top,
          left: position.left,
          width: position.width,
          zIndex: 9999,
        } as const);

  return (
    <div
      id="flight-traveler-cabin-popover"
      role="dialog"
      aria-modal={mobileSheet ? "true" : undefined}
      aria-label={t("travelersAndCabinClass")}
      style={dialogStyle}
      className={cn(
        "w-full border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]",
        mobileSheet
          ? "flex h-[100dvh] min-h-0 max-w-full flex-col overflow-hidden rounded-none pt-[env(safe-area-inset-top)]"
          : "max-w-[min(320px,calc(100vw-2rem))] rounded-2xl p-3",
      )}
    >
      {mobileSheet ? (
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {t("travelers")}
            </p>
            <h3 className="text-base font-bold text-slate-950">
              {t("travelersAndCabin")}
            </h3>
          </div>
          <button
            type="button"
            aria-label={t("closeTravelersAndCabinSelector")}
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          >
            ×
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          mobileSheet
            ? "min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4"
            : "",
        )}
      >
        <div>
          {!mobileSheet ? (
            <h3 className="text-sm font-semibold text-slate-900">{t("travelers")}</h3>
          ) : null}

          <div className="mt-3 divide-y divide-slate-100">
            <CounterRow
              label={t("adultPlural")}
              description="18+"
              value={adultCount}
              min={1}
              max={9}
              onChange={onAdultChange}
            />

            <CounterRow
              label={t("childPlural")}
              description={t("childAgeRange")}
              value={childCount}
              min={0}
              max={9}
              onChange={onChildChange}
            />

            <CounterRow
              label={t("infantsOnLap")}
              description={t("under2")}
              value={infantCount}
              min={0}
              max={adultCount}
              onChange={onInfantChange}
            />
          </div>
        </div>

        <div className="mt-2 border-t border-slate-200 pt-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide leading-4 text-slate-700">
            {t("cabinClass")}
          </h3>
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
                    "focus-ring min-h-11 rounded-xl border px-3 py-2 text-sm font-bold leading-4 text-center transition-colors",
                    selected
                      ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                      : "border-slate-300 text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {t(option.labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {mobileSheet ? (
        <div className="shrink-0 border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 w-full rounded-xl bg-[#0a66c2] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#085aa9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1"
          >
            {t("done")}
          </button>
        </div>
      ) : null}
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
  alignToField = false,
}: {
  id: string;
  suggestions: AirportOption[];
  onSelect: (value: string) => void;
  position?: { top: number; left: number; width: number };
  alignToField?: boolean;
}) {
  return (
    <div
      id={id}
      style={
        alignToField
          ? {
              position: "absolute",
              top: "calc(100% + 0.5rem)",
              left: 0,
              width: "min(380px, calc(100vw - 2rem))",
              zIndex: 70,
            }
          : {
              position: "fixed",
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              width: position?.width ?? 0,
              zIndex: 9999,
            }
      }
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
            className="block w-full px-3 py-1.5 text-start transition-colors hover:bg-slate-50"
          >
            <p className="text-[13px] font-medium text-slate-900">
              {item.city} ({item.code})
            </p>
            <p className="text-[11px] leading-4 text-slate-600">
              {item.airport}
              {item.country ? ` · ${item.country}` : ""}
            </p>
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

type FilterOption = {
  value: string;
  label: string;
  count: number;
  secondaryLabel?: string;
  rightLabel?: string;
};

type TimeFilterMode = "takeoff" | "landing";

type TimeBounds = {
  takeoff: { min: number; max: number } | null;
  landing: { min: number; max: number } | null;
};

const flightQualityDefinitions = [
  { value: "wifi", labelKey: "wifi" },
  { value: "power", labelKey: "powerOutlets" },
  { value: "entertainment", labelKey: "entertainment" },
  { value: "comfort", labelKey: "betterComfort" },
];

function getTimeMinutes(value: string) {
  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.getHours() * 60 + date.getMinutes();
  }

  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hours < 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  return hours * 60 + minutes;
}

function formatTimeFromMinutes(value: number, locale = "en-US") {
  const normalized = Math.max(0, Math.min(1439, value));
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const date = new Date(2000, 0, 1, hours24, minutes);

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDurationFromMinutes(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
}

function formatOptionsFound(count: number, t: (key: string) => string) {
  const key = count === 1 ? "optionFound" : "optionsFound";
  return t(key).replace("{{count}}", String(count));
}

function formatResultsFound(count: number, t: (key: string) => string) {
  const key = count === 1 ? "resultFound" : "resultsFound";
  return t(key).replace("{{count}}", String(count));
}

function getStopBucket(stops: number) {
  return stops >= 2 ? "2+" : String(stops);
}

function stopLabel(bucket: string, t: (key: string) => string) {
  if (bucket === "0") return t("nonstop");
  if (bucket === "1") return t("oneStop");
  return t("twoPlusStops");
}

function stopBucketSortValue(bucket: string) {
  return bucket === "2+" ? 2 : Number(bucket);
}

function hasBaggageIncluded(flight: PublicFlightResult) {
  return /included|carry-on|checked/i.test(flight.baggageInfo || "");
}

function hasFlexibleTerms(flight: PublicFlightResult) {
  return /refundable|changes allowed|change allowed|flexible/i.test(
    flight.refundInfo || "",
  );
}

function getFlightQualityText(flight: PublicFlightResult) {
  return [
    ...flight.badges,
    ...flight.recommendationReasons,
    flight.baggageInfo,
    flight.refundInfo,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function flightHasQualityOption(flight: PublicFlightResult, option: string) {
  const text = getFlightQualityText(flight);

  if (option === "wifi") {
    return /\bwi[-\s]?fi\b|internet|connectivity/i.test(text);
  }

  if (option === "power") {
    return /power|outlet|charging|charger|usb/i.test(text);
  }

  if (option === "entertainment") {
    return /entertainment|screen|tv|movie|movies|media/i.test(text);
  }

  if (option === "comfort") {
    return (
      (Number.isFinite(flight.comfortScore) && flight.comfortScore >= 70) ||
      /comfort|legroom|seat pitch|extra space/i.test(text)
    );
  }

  return false;
}

function flightMatchesAirport(flight: PublicFlightResult, airport: string) {
  return (
    flight.originAirport === airport ||
    flight.destinationAirport === airport ||
    flight.layovers.some((layover) => layover.airport === airport)
  );
}

function buildCountOptions(values: string[]): FilterOption[] {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    const normalized = value.trim();

    if (!normalized) return;

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  return Array.from(counts, ([value, count]) => ({
    value,
    label: value,
    count,
  })).sort((first, second) => {
    if (second.count !== first.count) return second.count - first.count;

    return first.label.localeCompare(second.label);
  });
}

function toggleFilterValue(
  value: string,
  setter: Dispatch<SetStateAction<string[]>>,
) {
  setter((current) =>
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value],
  );
}

function Filters({
  layout,
  activeFilterCount,
  maxPrice,
  setMaxPrice,
  priceBounds,
  priceLabelCurrency,
  selectedCurrency,
  timeFilterMode,
  setTimeFilterMode,
  timeBounds,
  maxTakeoffMinutes,
  setMaxTakeoffMinutes,
  maxLandingMinutes,
  setMaxLandingMinutes,
  durationBounds,
  maxDurationMinutes,
  setMaxDurationMinutes,
  stopOptions,
  selectedStops,
  setSelectedStops,
  airlineOptions,
  selectedAirlines,
  setSelectedAirlines,
  airportOptions,
  selectedAirports,
  setSelectedAirports,
  flightQualityOptions,
  selectedFlightQuality,
  setSelectedFlightQuality,
  baggageIncludedOnly,
  setBaggageIncludedOnly,
  flexibleOnly,
  setFlexibleOnly,
  onFilterChange,
}: {
  layout: "desktop" | "mobile";
  activeFilterCount: number;
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  priceBounds: { min: number; max: number };
  priceLabelCurrency: string | null;
  selectedCurrency: string;
  timeFilterMode: TimeFilterMode;
  setTimeFilterMode: Dispatch<SetStateAction<TimeFilterMode>>;
  timeBounds: TimeBounds;
  maxTakeoffMinutes: number | null;
  setMaxTakeoffMinutes: (value: number | null) => void;
  maxLandingMinutes: number | null;
  setMaxLandingMinutes: (value: number | null) => void;
  durationBounds: { min: number; max: number } | null;
  maxDurationMinutes: number | null;
  setMaxDurationMinutes: (value: number | null) => void;
  stopOptions: FilterOption[];
  selectedStops: string[];
  setSelectedStops: Dispatch<SetStateAction<string[]>>;
  airlineOptions: FilterOption[];
  selectedAirlines: string[];
  setSelectedAirlines: Dispatch<SetStateAction<string[]>>;
  airportOptions: FilterOption[];
  selectedAirports: string[];
  setSelectedAirports: Dispatch<SetStateAction<string[]>>;
  flightQualityOptions: FilterOption[];
  selectedFlightQuality: string[];
  setSelectedFlightQuality: Dispatch<SetStateAction<string[]>>;
  baggageIncludedOnly: boolean;
  setBaggageIncludedOnly: (value: boolean) => void;
  flexibleOnly: boolean;
  setFlexibleOnly: (value: boolean) => void;
  onFilterChange: () => void;
}) {
  const { t: dictionary, locale } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const calendarLocale = normalizeFlightResultsCalendarLocale(locale);
  const currencyRates = useCurrencyRates();
  const filterRangeClass =
    "h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gradient-to-r [&::-webkit-slider-runnable-track]:from-indigo-600 [&::-webkit-slider-runnable-track]:to-violet-500 [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-slate-200 [&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-violet-600 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-violet-600 [&::-moz-range-thumb]:shadow-md";
  const formatFilterPrice = (amount: number) =>
    priceLabelCurrency
      ? formatDisplayPrice({
          amount,
          sourceCurrency: priceLabelCurrency,
          displayCurrency: selectedCurrency,
          convertUsdEstimate: true,
          rates: currencyRates.rates,
          isFallbackRate: currencyRates.isFallback,
        }).formatted
      : t("mixedProviderCurrencies");

  return (
    <div
      className={cn(
        "bg-white",
        layout === "desktop" &&
          "rounded-2xl border border-slate-200/80 shadow-sm shadow-slate-900/[0.04]",
      )}
    >
      <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-3 py-3">
        <div>
          <h2 className="text-base font-semibold text-white/95">{t("filterBy")}</h2>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-white/70">
              {t("activeFilterCount").replace("{{count}}", String(activeFilterCount))}
            </span>
          ) : null}
          <SlidersHorizontal className="text-white/90" size={18} />
        </div>
      </div>

      <div className="space-y-4 bg-white px-3 py-3">
        <section>
          {layout === "desktop" ? (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">{t("price")}</h3>
            </div>
          ) : (
            <div className="mb-1.5 flex items-center justify-between gap-3 text-sm font-semibold leading-5 text-slate-800">
              <span>{t("price")}</span>
              <span className="shrink-0 text-xs font-medium text-navy">
                {priceBounds.max
                  ? priceLabelCurrency
                    ? `${formatFilterPrice(priceBounds.min)} - ${formatFilterPrice(
                        Math.min(maxPrice, priceBounds.max),
                      )}`
                    : t("mixedProviderCurrencies")
                  : t("loadingPrices")}
              </span>
            </div>
          )}
          <input
            className={filterRangeClass}
            type="range"
            min={priceBounds.min || 0}
            max={priceBounds.max || 0}
            step={25}
            value={priceBounds.max ? Math.min(maxPrice, priceBounds.max) : 0}
            disabled={!priceBounds.max}
            onChange={(event) => {
              onFilterChange();
              setMaxPrice(Number(event.target.value));
            }}
          />
          <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500">
            <span>
              {priceBounds.max && priceLabelCurrency
                ? formatFilterPrice(priceBounds.min)
                : "—"}
            </span>
            <span>
              {priceBounds.max && priceLabelCurrency
                ? formatFilterPrice(priceBounds.max)
                : "—"}
            </span>
          </div>
        </section>

        <FilterSection title={t("times")}>
          <div className="grid grid-cols-2 border-b border-slate-200/70">
            <button
              type="button"
              onClick={() => setTimeFilterMode("takeoff")}
              className={cn(
                "border-b-2 px-2 pb-1.5 pt-1 text-sm font-medium transition",
                timeFilterMode === "takeoff"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-600 hover:text-slate-900",
              )}
            >
              {t("takeoff")}
            </button>
            <button
              type="button"
              onClick={() => setTimeFilterMode("landing")}
              className={cn(
                "border-b-2 px-2 pb-1.5 pt-1 text-sm font-medium transition",
                timeFilterMode === "landing"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-600 hover:text-slate-900",
              )}
            >
              {t("landing")}
            </button>
          </div>

          {timeFilterMode === "takeoff" ? (
            <div className="mt-2">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>{t("takeoffTimeFromOrigin")}</span>
                <span className="font-mono text-navy">
                  {timeBounds.takeoff && maxTakeoffMinutes !== null
                    ? formatTimeFromMinutes(maxTakeoffMinutes, calendarLocale)
                    : t("loading")}
                </span>
              </div>
              <input
                className={filterRangeClass}
                type="range"
                min={timeBounds.takeoff?.min ?? 0}
                max={timeBounds.takeoff?.max ?? 0}
                step={15}
                value={maxTakeoffMinutes ?? timeBounds.takeoff?.max ?? 0}
                disabled={!timeBounds.takeoff}
                onChange={(event) => {
                  onFilterChange();
                  setMaxTakeoffMinutes(Number(event.target.value));
                }}
              />
              <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500">
                <span>
                  {timeBounds.takeoff
                    ? formatTimeFromMinutes(timeBounds.takeoff.min, calendarLocale)
                    : "—"}
                </span>
                <span>
                  {timeBounds.takeoff
                    ? formatTimeFromMinutes(timeBounds.takeoff.max, calendarLocale)
                    : "—"}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600">
                <span>{t("landingTimeAtDestination")}</span>
                <span className="font-mono text-navy">
                  {timeBounds.landing && maxLandingMinutes !== null
                    ? formatTimeFromMinutes(maxLandingMinutes, calendarLocale)
                    : t("loading")}
                </span>
              </div>
              <input
                className={filterRangeClass}
                type="range"
                min={timeBounds.landing?.min ?? 0}
                max={timeBounds.landing?.max ?? 0}
                step={15}
                value={maxLandingMinutes ?? timeBounds.landing?.max ?? 0}
                disabled={!timeBounds.landing}
                onChange={(event) => {
                  onFilterChange();
                  setMaxLandingMinutes(Number(event.target.value));
                }}
              />
              <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500">
                <span>
                  {timeBounds.landing
                    ? formatTimeFromMinutes(timeBounds.landing.min, calendarLocale)
                    : "—"}
                </span>
                <span>
                  {timeBounds.landing
                    ? formatTimeFromMinutes(timeBounds.landing.max, calendarLocale)
                    : "—"}
                </span>
              </div>
            </div>
          )}
        </FilterSection>

        <FilterSection title={t("duration")}>
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600">
            <span>{t("totalTripTime")}</span>
            <span className="font-mono text-navy">
              {durationBounds && maxDurationMinutes !== null
                ? formatDurationFromMinutes(maxDurationMinutes)
                : t("loading")}
            </span>
          </div>

          <input
            className={filterRangeClass}
            type="range"
            min={durationBounds?.min ?? 0}
            max={durationBounds?.max ?? 0}
            step={15}
            value={maxDurationMinutes ?? durationBounds?.max ?? 0}
            disabled={!durationBounds}
            onChange={(event) => {
              onFilterChange();
              setMaxDurationMinutes(Number(event.target.value));
            }}
          />

          <div className="mt-1.5 flex justify-between text-[11px] font-medium text-slate-500">
            <span>
              {durationBounds
                ? formatDurationFromMinutes(durationBounds.min)
                : "—"}
            </span>
            <span>
              {durationBounds
                ? formatDurationFromMinutes(durationBounds.max)
                : "—"}
            </span>
          </div>
        </FilterSection>

        {flightQualityOptions.length ? (
          <FilterSection title={t("flightQuality")}>
            {flightQualityOptions.map((option) => (
              <FilterOptionRow
                key={option.value}
                label={option.label}
                count={option.count}
                checked={selectedFlightQuality.includes(option.value)}
                onChange={() => {
                  onFilterChange();
                  toggleFilterValue(option.value, setSelectedFlightQuality);
                }}
              />
            ))}
          </FilterSection>
        ) : null}

        <FilterSection
          title={t("stops")}
          emptyText={t("stopsAppearAfterResultsLoad")}
        >
          {stopOptions.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              count={option.count}
              secondaryLabel={option.secondaryLabel}
              rightLabel={option.rightLabel}
              checked={selectedStops.includes(option.value)}
              onChange={() => {
                onFilterChange();
                toggleFilterValue(option.value, setSelectedStops);
              }}
            />
          ))}
        </FilterSection>

        <FilterSection
          title={t("airlines")}
          emptyText={t("airlinesAppearAfterResultsLoad")}
        >
          {airlineOptions.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              count={option.count}
              checked={selectedAirlines.includes(option.value)}
              onChange={() => {
                onFilterChange();
                toggleFilterValue(option.value, setSelectedAirlines);
              }}
            />
          ))}
        </FilterSection>

        <FilterSection
          title={t("airports")}
          emptyText={t("airportsAppearAfterResultsLoad")}
        >
          {airportOptions.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              count={option.count}
              checked={selectedAirports.includes(option.value)}
              onChange={() => {
                onFilterChange();
                toggleFilterValue(option.value, setSelectedAirports);
              }}
            />
          ))}
        </FilterSection>

        <FilterSection title={t("amenities")}>
          <FilterOptionRow
            label={t("baggageIncluded")}
            checked={baggageIncludedOnly}
            onChange={() => {
              onFilterChange();
              setBaggageIncludedOnly(!baggageIncludedOnly);
            }}
          />
          <FilterOptionRow
            label={t("flexibleRefundable")}
            checked={flexibleOnly}
            onChange={() => {
              onFilterChange();
              setFlexibleOnly(!flexibleOnly);
            }}
          />
        </FilterSection>
      </div>
    </div>
  );
}

function SummarySortButton({
  label,
  details,
  active,
  mobile = false,
  onClick,
}: {
  label: string;
  details: {
    primary: string;
    context: string;
    departure: string;
  } | null;
  active: boolean;
  mobile?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border text-start transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30",
        mobile
          ? "min-w-[178px] snap-start px-3 py-2.5"
          : "min-h-[104px] px-3.5 py-3",
        active
          ? "border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/80 text-slate-800 shadow-sm shadow-indigo-900/[0.04] ring-1 ring-indigo-100/80"
          : "border-slate-200/80 bg-white text-slate-600 hover:border-indigo-200/80 hover:bg-slate-50/80 hover:shadow-sm hover:shadow-slate-900/[0.03]",
      )}
    >
      <span
        className={cn(
          "inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
          active
            ? "bg-indigo-100 text-indigo-700"
            : "bg-slate-100 text-slate-500",
        )}
      >
        {label}
      </span>
      <span className="mt-2 block truncate text-lg font-semibold leading-6 tracking-[-0.02em] text-slate-800 sm:text-base sm:leading-6 lg:text-lg">
        {details?.primary ?? "—"}
      </span>
      {details ? (
        <span className="mt-1.5 flex min-h-0 flex-1 flex-col justify-end gap-1">
          <span className="block truncate text-xs font-medium leading-4 text-slate-600">
            {details.context}
          </span>
          <span className="block truncate text-[11px] font-normal leading-4 text-slate-500">
            {details.departure}
          </span>
        </span>
      ) : null}
    </button>
  );
}

function formatStopsLabel(stops: number, t: (key: string) => string) {
  if (stops === 0) return t("nonstop");
  return stops === 1
    ? t("oneStop")
    : t("stopCount").replace("{{count}}", String(stops));
}

function FilterSection({
  title,
  emptyText,
  children,
}: {
  title: string;
  emptyText?: string;
  children: ReactNode;
}) {
  const hasOptions =
    Boolean(children) && (!Array.isArray(children) || children.length > 0);

  return (
    <section className="border-t border-slate-200/70 pt-3 first:border-t-0 first:pt-0">
      <h3 className="mb-1.5 text-sm font-semibold leading-5 text-slate-800">
        {title}
      </h3>
      <div className="grid gap-1">
        {hasOptions ? (
          children
        ) : (
          <p className="py-1 text-xs font-normal text-slate-500">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

function FilterOptionRow({
  label,
  count,
  secondaryLabel,
  rightLabel,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  secondaryLabel?: string;
  rightLabel?: string;
  checked: boolean;
  onChange: () => void;
}) {
  const trailingLabel =
    rightLabel ?? (typeof count === "number" ? String(count) : null);

  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1.5 text-sm font-medium text-slate-700 transition hover:text-slate-950">
      <span className="flex min-w-0 items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          checked={checked}
          onChange={onChange}
        />
        <span className="min-w-0">
          <span className="block truncate">{label}</span>
          {secondaryLabel ? (
            <span className="block text-xs font-medium text-slate-500">
              {secondaryLabel}
            </span>
          ) : null}
        </span>
      </span>
      {trailingLabel ? (
        <span className="shrink-0 text-xs font-medium text-slate-500">
          {trailingLabel}
        </span>
      ) : null}
    </label>
  );
}
