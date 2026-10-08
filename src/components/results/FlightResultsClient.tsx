"use client";

import Image from "next/image";
import Link from "next/link";
import type {
  Dispatch,
  FormEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRightLeft,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Check,
  ChevronDown,
  Heart,
  MapPin,
  Minus,
  SquarePen,
  Users,
  UserRound,
  Plus,
  SlidersHorizontal,
  Search,
  X,
} from "lucide-react";
import {
  getCenteredRailScrollLeft,
  isHorizontallyVisibleWithinContainer,
} from "@/components/results/mobileNearbyFareRail";

import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { FlightCard } from "@/components/results/FlightCard";
import { useKayakResults } from "./KayakResultsContext";
import { resultActionHref } from "@/lib/travel/resultAction";
import { CombinedSearchEmpty } from "./CombinedSearchEmpty";
import { kayakFlightCardModel } from "./kayakCardModels";
import { KayakResultCard } from "./KayakResultCard";
import { nearbyFarePrice } from "@/components/results/nearbyFarePrice";
import { DesktopFlightFilters } from "@/components/results/DesktopFlightFilters";
import { FlightPriceAlertControl } from "@/components/results/FlightPriceAlertControl";
import { FlightResultsScrollIndicator } from "@/components/results/FlightResultsScrollIndicator";
import { MobileFlightResultsState } from "@/components/results/MobileFlightResultsState";
import {
  MobileFlightFiltersSheet,
  mobileFlightLegKey,
  type MobileJourneyTimeMaximums,
} from "@/components/results/MobileFlightFiltersSheet";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { FlightEditSearchDrawer, type FlightEditSearchValue } from "@/components/search/FlightEditSearchDrawer";
import { acquireMobileResultsScrollLock, type MobileResultsScrollLockRelease } from "@/lib/search/mobileResultsScrollLock";
import { getOverlayActivationModality, restoreOverlayLauncherFocus, type OverlayActivationModality } from "@/lib/search/mobileResultsOverlayFocus";
import {
  activeFlightFilterCount as countAuthoritativeFlightFilters,
  flightAirportEndpoints,
  flightJourneyDurationMinutes,
  flightMatchesFilters,
  flightStopBucket,
  hasStructuredBaggage,
  hasStructuredFlexibility,
  matchingFlightCount,
  type FlightFilterState,
} from "@/lib/flights/flightFilters";
import { getLocationFieldDisplay } from "@/lib/search/locationFieldDisplay";
import { MultiCityFlightEditor } from "@/components/search/MultiCityFlightEditor";
import { Button } from "@/components/ui/Button";
import { FlightCardSkeleton } from "@/components/ui/Skeleton";
import { PAGINATION_REVEAL_MS, prefersReducedResultsMotion, scrollToResultsAndWait } from "@/lib/results/paginationTransition";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import {
  airports,
  getLocalizedAirportCountryName,
  getLocalizedCityName,
  type AirportOption,
} from "@/data/airports";
import {
  getHomeDiscoveryByRegion,
  homeDiscoveryByRegion,
  type HomeDiscoveryItem,
} from "@/data/homeDiscovery";
import { buildDiscoveryLink } from "@/lib/home/buildDiscoveryLinks";
import {
  formatHomeDiscoveryRoute,
  translateHomeDiscoveryCity,
  translateHomeDiscoveryCopy,
} from "@/lib/i18n/homeDiscovery";
import {
  buildFlightRecentSearch,
  clearBackendRecentSearches,
  clearRecentSearches,
  deleteBackendRecentSearch,
  fetchBackendRecentSearches,
  readRecentSearches,
  removeRecentSearch,
  syncBackendRecentSearch,
  upsertRecentSearch,
  type RecentSearchEntry,
} from "@/lib/recent-searches";
import {
  hasAirlineFilterSearchParam,
  normalizePreferredAirlineFilterValues,
  type TravelPreferencesAirlinePayload,
} from "@/lib/flights/preferredAirlineFilters";
import {
  buildFlightResultsSearchKey,
  readFlightResultsSessionSnapshotForRefresh,
  writeFlightResultsSessionSnapshot,
} from "@/lib/flights/flightResultsSessionCache";
import {
  buildFlightPaginationItems,
  clampFlightResultsPage,
  FLIGHT_RESULTS_PAGE_SIZE,
  getFlightResultsPageCount,
  paginateFlightResults,
} from "@/lib/flights/flightResultsPagination";
import { getResultsDisplayRange } from "@/lib/results/resultsDisplayRange";
import { isFlightResultsPreparing } from "@/components/results/flightResultsReadiness";
import {
  readSavedItemIds,
  toggleSavedItemId,
  writeSavedItemIds,
} from "@/lib/saved-items-local";
import {
  deleteBackendDiscovery,
  fetchBackendSavedDiscoveries,
  getSavedDiscoveryLocalId,
  saveBackendDiscovery,
  type SavedDiscoveryDisplayDetails,
  type SavedDiscoveryFlightSearch,
} from "@/lib/saved-items-api";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import {
  compareFlightPrices,
  getComparableFlightPrice,
  getComparableFlightPriceBounds,
  getLowestComparableFlightFare,
} from "@/lib/flights/flightResultPrices";
import type { FlightSearchLeg, PublicFlightResult, SortMode } from "@/lib/types";
import {
  appendFlightLegParams,
  MULTI_CITY_MAX_LEGS,
  MULTI_CITY_MIN_LEGS,
  parseFlightLegParams,
  projectSearchLegs,
} from "@/lib/flights/flightSearchJourney";
import { cn, getItineraryDateKey } from "@/lib/utils";
import { shouldRenderFlightQualityFilter } from "@/lib/flights/desktopCompactFilter";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  formatFlightsDateSummary,
  formatFlightsMonthHeading,
  formatFlightsWeekdays,
  normalizeFlightsCalendarLocale,
} from "@/lib/flights/dateFormatting";

const resultStackClass = "w-full min-w-0";
export const FLIGHT_BACK_TO_TOP_SCROLL_THRESHOLD = 320;

const desktopFlightStickyFilterTop = 88;
const desktopFlightResultsScrollOffset = desktopFlightStickyFilterTop + 16;


type StickyFlightPopularFilterGroup =
  | "stops"
  | "airlines"
  | "airports"
  | "quality";

type StickyFlightPopularFilterOption = {
  value: string;
  label: string;
  count: number;
};

function StickyFlightPopularFilters({
  t,
  stopOptions,
  airlineOptions,
  airportOptions,
  flightQualityOptions,
  renderFlightQualityFilter,
  selectedStops,
  selectedAirlines,
  selectedAirports,
  selectedFlightQuality,
  onToggle,
}: {
  t: (key: string) => string;
  stopOptions: StickyFlightPopularFilterOption[];
  airlineOptions: StickyFlightPopularFilterOption[];
  airportOptions: StickyFlightPopularFilterOption[];
  flightQualityOptions: StickyFlightPopularFilterOption[];
  renderFlightQualityFilter: boolean;
  selectedStops: string[];
  selectedAirlines: string[];
  selectedAirports: string[];
  selectedFlightQuality: string[];
  onToggle: (group: StickyFlightPopularFilterGroup, value: string) => void;
}) {
  const groups: Array<{
    group: StickyFlightPopularFilterGroup;
    options: StickyFlightPopularFilterOption[];
    selected: string[];
    limit: number;
  }> = [
    { group: "stops", options: stopOptions, selected: selectedStops, limit: 3 },
    {
      group: "airlines",
      options: airlineOptions,
      selected: selectedAirlines,
      limit: 5,
    },
    {
      group: "airports",
      options: airportOptions,
      selected: selectedAirports,
      limit: 2,
    },
    {
      group: "quality",
      options: renderFlightQualityFilter ? flightQualityOptions : [],
      selected: selectedFlightQuality,
      limit: 2,
    },
  ];

  const popularFilters = groups
    .flatMap(({ group, options, selected, limit }) =>
      [...options]
        .sort(
          (first, second) =>
            second.count - first.count ||
            first.label.localeCompare(second.label),
        )
        .slice(0, limit)
        .map((option) => ({
          key: `${group}-${option.value}`,
          group,
          value: option.value,
          label: option.label,
          count: option.count,
          selected: selected.includes(option.value),
        })),
    )
    .sort(
      (first, second) =>
        second.count - first.count ||
        first.label.localeCompare(second.label),
    );

  if (!popularFilters.length) return null;

  return (
    <section
      data-flight-sticky-popular-filters
      aria-label={t("hotelResults.popularFilters")}
      className="sticky top-[88px] z-10 mt-3 max-h-[calc(100vh-100px)] overflow-y-auto rounded-lg border border-[#CFD9E5] bg-white px-3 py-3 shadow-[0_4px_16px_-12px_rgba(15,23,42,0.35)]"
    >
      <h2 className="mb-1.5 text-[13px] font-bold leading-5 text-[#142033]">
        {t("hotelResults.popularFilters")}
      </h2>
      <div className="space-y-0.5">
        {popularFilters.map((filter) => (
          <label
            key={filter.key}
            className="flex min-h-7 cursor-pointer items-center gap-2 rounded px-0.5 text-[12px] font-normal leading-4 text-[#142033] hover:bg-slate-50"
          >
            <input
              type="checkbox"
              checked={filter.selected}
              onChange={() => onToggle(filter.group, filter.value)}
              className="h-4 w-4 shrink-0 cursor-pointer accent-[#004BB8]"
            />
            <span className="min-w-0 flex-1 truncate" title={filter.label}>
              {filter.label}
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {filter.count}
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

type MobileShortcutSheet = "sort" | "airlines" | "stops" | "airports";
type NearbyFareState =
  | { date: string; status: "idle" }
  | { date: string; status: "loading" }
  | {
      date: string;
      status: "success";
      amount: number;
      currency: string;
      fetchedAt: number;
    }
  | { date: string; status: "unavailable"; fetchedAt: number }
  | { date: string; status: "error"; message?: string; fetchedAt?: number };

type NearbyFareRequest = {
  controller: AbortController;
  promise: Promise<void>;
};

const nearbyFareRangeSize = 10;
const nearbyFareVisibleCount = 7;
const nearbyFareDaysBeforeAnchor = 4;
const nearbyFareCenteredVisibleStart = Math.max(
  0,
  Math.min(
    nearbyFareDaysBeforeAnchor - Math.floor(nearbyFareVisibleCount / 2),
    nearbyFareRangeSize - nearbyFareVisibleCount,
  ),
);
const nearbyFareRequestConcurrency = 4;
const nearbyFareCacheTtlMs = 10 * 60 * 1000;


type MobileOverlayCloseOptions = {
  restoreFocus?: boolean;
};

const scrollWindowToPageTop = () => {
  if (typeof window === "undefined") return;

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto",
  });
};

type CompactFilterSectionId =
  | "price"
  | "times"
  | "duration"
  | "quality"
  | "stops"
  | "airlines"
  | "airports"
  | "amenities"
  | null;

const filterQueryParamKeys = [
  "fPrice",
  "fTakeoff",
  "fLanding",
  "fDuration",
  "fStop",
  "fAirline",
  "fAirport",
  "fFromAirport",
  "fToAirport",
  "fQuality",
  "fBaggage",
  "fFlexible",
] as const;

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

const normalizeFlightResultsCalendarLocale = normalizeFlightsCalendarLocale;

function getFlightFaqItems(
  t: (key: string) => string,
): Array<{ question: string; answer: string }> {
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

type BeachVacationVisual = { image: string; imageAltKey?: string };

const beachVacationVisualsByDestinationCode: Record<
  string,
  BeachVacationVisual
> = {
  CUN: {
    image:
      "https://images.unsplash.com/photo-1552074284-5e88ef1aef18?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.CUN.alt",
  },
  HNL: {
    image:
      "https://images.unsplash.com/photo-1507878866276-a947ef722fee?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.HNL.alt",
  },
  SJU: {
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.SJU.alt",
  },
  DPS: {
    image:
      "https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.DPS.alt",
  },
  ZNZ: {
    image:
      "https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.ZNZ.alt",
  },
  PVR: {
    image:
      "https://images.unsplash.com/photo-1665039400840-b6b2a5786fef?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.PVR.alt",
  },
  FAO: {
    image:
      "https://images.unsplash.com/photo-1530845640344-3fcbe6f1db9f?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.FAO.alt",
  },
  CPT: {
    image:
      "https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.CPT.alt",
  },
  SYD: {
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.SYD.alt",
  },
  SAN: {
    image:
      "https://images.unsplash.com/photo-1577083552431-6e5fd01988f1?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.SAN.alt",
  },
  MIA: {
    image:
      "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?auto=format&fit=crop&w=1200&q=90",
    imageAltKey: "flightResults.beachVisual.MIA.alt",
  },
};

function getBeachVacationVisual(item: HomeDiscoveryItem): BeachVacationVisual {
  return (
    beachVacationVisualsByDestinationCode[item.destinationCode] ?? {
      image: item.image,
    }
  );
}

function getBeachVacationVisualAlt(
  item: HomeDiscoveryItem,
  visual: BeachVacationVisual,
  t: (key: string) => string,
) {
  return visual.imageAltKey ? t(visual.imageAltKey) : item.imageAlt;
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
  const imageText = [item.destinationCity, item.destinationCode, item.imageAlt]
    .join(" ")
    .toLowerCase();
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
      <div className="relative h-full min-h-[112px] w-20 shrink-0 overflow-hidden bg-gradient-to-br from-[#004BB8] via-[#004BB8] to-[#5CB6B2] sm:w-24">
        {entry.image ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Recent search thumbnails can be external saved-search data and preserve the existing lightweight card contract. */}
            <img
            src={entry.image}
            alt={entry.imageAlt || entry.label}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
          />
          </>
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
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/75 px-2.5 py-1 text-xs font-bold text-slate-700 transition group-hover:border-[#004BB8]/25 group-hover:bg-[#004BB8]/8 group-hover:text-[#004BB8] group-focus-visible:border-[#004BB8]/25 group-focus-visible:bg-[#004BB8]/8 group-focus-visible:text-[#004BB8]">
          {t("searchAgain")}
          <ArrowRightLeft size={13} />
        </span>
      </div>
    </>
  );

  const cardClassName =
    "focus-ring group flex h-full min-h-[112px] overflow-hidden rounded-2xl border border-slate-200/70 bg-white/70 shadow-none backdrop-blur transition hover:-translate-y-0.5 hover:border-[#004BB8]/25 hover:bg-white/90";

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
    display?: SavedDiscoveryDisplayDetails,
  ) => void;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const copy = translateHomeDiscoveryCopy(dictionary, item);
  const originCity = translateHomeDiscoveryCity(dictionary, item.originCity);
  const destinationCity = translateHomeDiscoveryCity(
    dictionary,
    item.destinationCity,
  );
  const routeLabel = formatHomeDiscoveryRoute(
    dictionary,
    originCity,
    destinationCity,
  );

  return (
    <article className="group relative min-w-[250px] snap-start overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#004BB8]/25 hover:shadow-xl sm:min-w-[280px] md:min-w-0">
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
            {routeLabel}
          </p>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-slate-600">
            {copy.routeNote}
          </p>
          <span className="mt-4 inline-flex items-center justify-between rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white transition group-hover:bg-[#004BB8] group-focus-visible:bg-[#004BB8]">
            {t("exploreRoute")}
            <ArrowRightLeft size={14} />
          </span>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`${t("remove")} ${copy.title}`}
        aria-pressed="true"
        onClick={(event) =>
          onHeartToggle(event, item.id, {
            title: copy.title,
            route: `${item.originCode} → ${item.destinationCode}`,
            note: copy.routeNote,
            originCode: item.originCode,
            destinationCode: item.destinationCode,
            originCity,
            destinationCity,
            image: item.image,
            imageAlt: item.imageAlt,
            href: buildDiscoveryLink(item),
            search: {
              tripType: "one-way",
              cabinClass: "economy",
              travelerCount: 1,
            },
          })
        }
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

export type FlightResultsPresentationMode = "standalone" | "deals-guided";

function FlightResultsPagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (totalPages <= 1) return null;
  const items = buildFlightPaginationItems(currentPage, totalPages);
  const mobileItems = buildFlightPaginationItems(currentPage, totalPages, true);

  const renderItems = (pageItems: typeof items) => pageItems.map((item, index) => item === "ellipsis" ? (
    <span key={`ellipsis-${index}`} className="flight-pagination-ellipsis" aria-hidden="true">…</span>
  ) : (
    <button
      key={item}
      type="button"
      aria-label={`Go to flight results page ${item}`}
      aria-current={item === currentPage ? "page" : undefined}
      disabled={disabled}
      onClick={() => onPageChange(item)}
      className="flight-pagination-control"
    >
      {item}
    </button>
  ));

  return (
    <nav
      aria-label="Flight results pages"
      className="flight-results-pagination mb-6 mt-6 flex min-w-0 items-center justify-center"
    >
      <button type="button" aria-label="Previous flight results page" disabled={disabled || currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="flight-pagination-control">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="hidden items-center gap-1 sm:flex">{renderItems(items)}</span>
      <span className="flex min-w-0 items-center sm:hidden">{renderItems(mobileItems)}</span>
      <button type="button" aria-label="Next flight results page" disabled={disabled || currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)} className="flight-pagination-control">
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export type FlightResultsSearchInput = {
  tripType: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  travelers: number;
  cabinClass: string;
  currency?: string;
};

export type FlightResultsClientProps = {
  presentationMode?: FlightResultsPresentationMode;
  searchInput?: FlightResultsSearchInput;
  buildDetailsHref?: (flight: PublicFlightResult) => string | null;
  actionLabel?: string;
  actionAriaLabel?: (flight: PublicFlightResult) => string;
  onSelectFlight?: (flight: PublicFlightResult) => void;
  externalResultsHeader?: boolean;
};

const searchInputToParams = (input: FlightResultsSearchInput) => {
  const params = new URLSearchParams({
    tripType: input.tripType,
    origin: input.origin,
    destination: input.destination,
    departureDate: input.departureDate,
    adults: String(input.adults),
    children: String(input.children),
    infants: String(input.infants),
    travelers: String(input.travelers),
    cabinClass: input.cabinClass,
  });
  if (input.tripType === "round-trip" && input.returnDate) params.set("returnDate", input.returnDate);
  if (input.currency) params.set("currency", input.currency);
  return params;
};

export function FlightResultsClient({ presentationMode = "standalone", searchInput, buildDetailsHref, actionLabel, actionAriaLabel, onSelectFlight, externalResultsHeader = false }: FlightResultsClientProps = {}) {
  const { t: dictionary, locale } = useLocale();
  const t = useCallback(
    (key: string) => dictionary[key] ?? enTranslations[key] ?? "",
    [dictionary],
  );
  const calendarLocale = useMemo(
    () => normalizeFlightResultsCalendarLocale(locale),
    [locale],
  );
  const weekdays = useMemo(
    () => formatFlightsWeekdays(calendarLocale),
    [calendarLocale],
  );
  const airportPickerLabels = useMemo(
    () => ({
      clear: dictionary.clear ?? enTranslations.clear ?? "",
      done: dictionary.done ?? enTranslations.done ?? "",
      chooseOrigin:
        dictionary.chooseOrigin ?? enTranslations.chooseOrigin ?? "",
      clearOrigin: dictionary.clearOrigin ?? enTranslations.clearOrigin ?? "",
      clearDestination:
        dictionary.clearDestination ?? enTranslations.clearDestination ?? "",
      searchAirportsAndCities:
        dictionary.searchAirportsAndCities ??
        enTranslations.searchAirportsAndCities ??
        "",
      searchAirportsOrCities:
        dictionary.searchAirportsOrCities ??
        enTranslations.searchAirportsOrCities ??
        "",
      startTypingCityOrAirport:
        dictionary.startTypingCityOrAirport ??
        enTranslations.startTypingCityOrAirport ??
        "",
      searchingAirportsAndCities:
        dictionary.searchingAirportsAndCities ??
        enTranslations.searchingAirportsAndCities ??
        "",
      noMatchingAirportsOrCities:
        dictionary.noMatchingAirportsOrCities ??
        enTranslations.noMatchingAirportsOrCities ??
        "",
    }),
    [dictionary],
  );
  const urlParams = useSearchParams();
  const router = useRouter();
  const guidedMode = presentationMode === "deals-guided";
  const params = useMemo(() => searchInput ? searchInputToParams(searchInput) : new URLSearchParams(urlParams.toString()), [searchInput, urlParams]);
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const selectedCurrency = searchInput?.currency ?? selectedOption.currency;
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
  const [guidedResultsPage, setGuidedResultsPage] = useState(1);
  const [standaloneResultsPage, setStandaloneResultsPage] = useState(() =>
    Math.max(1, Number(urlParams.get("page")) || 1),
  );
  const [desktopSortOpen, setDesktopSortOpen] = useState(false);
  const desktopSortRef = useRef<HTMLDivElement | null>(null);
  const desktopSortButtonRef = useRef<HTMLButtonElement | null>(null);
  const [providerResults, setResults] = useState<PublicFlightResult[]>([]);
  const kayak = useKayakResults();
  const results = useMemo(() => guidedMode || kayak?.vertical !== "flights" ? providerResults : [
    ...providerResults, ...kayak.offers.map(offer => kayakFlightCardModel(offer, kayak.criteria)).filter((flight): flight is PublicFlightResult => flight !== null),
  ],[guidedMode,kayak,providerResults]);
  const activeFlightSearchKeyRef = useRef<string>("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [backgroundRefreshing, setBackgroundRefreshing] = useState(false);
  const [filtersReadySearchKey, setFiltersReadySearchKey] = useState<
    string | null
  >(null);
  const [mainInventoryRetryGeneration, setMainInventoryRetryGeneration] = useState(0);
  const userInitiatedRetryRef = useRef(false);
  const loadingFocusRef = useRef<HTMLDivElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const mobileResultsPageTopRef = useRef<HTMLDivElement | null>(null);
  const paginationListRef = useRef<HTMLDivElement | null>(null);
  const [paginationPendingPage, setPaginationPendingPage] = useState<number | null>(null);
  const [paginationCommitting, setPaginationCommitting] = useState(false);
  const [paginationMinHeight, setPaginationMinHeight] = useState<number | null>(null);
  const [paginationRevealing, setPaginationRevealing] = useState(false);
  const errorHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const emptyHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mobileShortcutSheet, setMobileShortcutSheet] = useState<MobileShortcutSheet | null>(null);

  const [mobileDraftSort, setMobileDraftSort] = useState<SortMode>(sortMode);
  const [mobileDraftAirlines, setMobileDraftAirlines] = useState<string[]>([]);
  const [mobileDraftStops, setMobileDraftStops] = useState<string[]>([]);
  const [mobileDraftFromAirports, setMobileDraftFromAirports] = useState<string[]>([]);
  const [mobileDraftToAirports, setMobileDraftToAirports] = useState<string[]>([]);
  const [mobileAirlineSearch, setMobileAirlineSearch] = useState("");
  const [mobileShowAllAirlines, setMobileShowAllAirlines] = useState(false);
  const mobileShortcutLauncherRef = useRef<HTMLButtonElement | null>(null);
  const mobileShortcutSheetRef = useRef<HTMLElement | null>(null);
  const mobileShortcutSheetCloseRef = useRef<HTMLButtonElement | null>(null);
  const mobileShortcutScrollLockRef = useRef<MobileResultsScrollLockRelease | null>(null);
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
  const [mobileJourneyTimeMaximums, setMobileJourneyTimeMaximums] =
    useState<MobileJourneyTimeMaximums>({});
  const [maxDurationMinutes, setMaxDurationMinutes] = useState<number | null>(
    null,
  );
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedAirports, setSelectedAirports] = useState<string[]>([]);
  const [selectedFromAirports, setSelectedFromAirports] = useState<string[]>([]);
  const [selectedToAirports, setSelectedToAirports] = useState<string[]>([]);
  const [selectedFlightQuality, setSelectedFlightQuality] = useState<string[]>(
    [],
  );
  const [baggageIncludedOnly, setBaggageIncludedOnly] = useState(false);
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
  const nearbyFareCacheRef = useRef(new Map<string, NearbyFareState>());
  const nearbyFareRequestsRef = useRef(new Map<string, NearbyFareRequest>());
  const nearbyFareGenerationRef = useRef(0);
  const mobileNearbyFareRailRef = useRef<HTMLDivElement>(null);
  const mobileSelectedNearbyFareRef = useRef<HTMLButtonElement>(null);
  const alignedMobileNearbyFareSearchRef = useRef<string | null>(null);
  const [nearbyFares, setNearbyFares] = useState<NearbyFareState[]>([]);
  const [nearbyFareVisibleStart, setNearbyFareVisibleStart] = useState(
    nearbyFareCenteredVisibleStart,
  );
  const [returnDateInput, setReturnDateInput] = useState(
    initialDateSafeParams.get("returnDate") || "",
  );
  const [multiCityLegs, setMultiCityLegs] = useState<FlightSearchLeg[]>(() =>
    initialDateSafeParams.get("tripType") === "multi-city"
      ? parseFlightLegParams(params)
      : [],
  );
  const [multiCityAirportsValid, setMultiCityAirportsValid] = useState(false);
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
  const [activeDesktopSearchSurface, setActiveDesktopSearchSurface] = useState<
    "full" | "sticky" | null
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
  const [draftMobileDepartureDate, setDraftMobileDepartureDate] =
    useState(departureDateInput);
  const [draftMobileReturnDate, setDraftMobileReturnDate] =
    useState(returnDateInput);
  const [draftAdultCount, setDraftAdultCount] = useState(adultCount);
  const [draftChildCount, setDraftChildCount] = useState(childCount);
  const [draftInfantCount, setDraftInfantCount] = useState(infantCount);
  const [draftCabinClassInput, setDraftCabinClassInput] =
    useState<CabinClassValue>(cabinClassInput);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activeMobileAirportPicker, setActiveMobileAirportPicker] = useState<
    "origin" | "destination" | null
  >(null);
  const mobileSearchScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchScrollTopRef = useRef(0);
  const pendingMobileDatePickerRef = useRef<"departure" | "return" | null>(
    null,
  );
  const mobileDatePickerTransitionFrameRef = useRef<number | null>(null);
  const mobileDatePickerTransitionTimeoutRef = useRef<number | null>(null);
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);
  const [isSearchExpandedWhileSticky, setIsSearchExpandedWhileSticky] =
    useState(false);
  const [activeStickySearchTarget, setActiveStickySearchTarget] = useState<
    "trip" | "origin" | "destination" | "dates" | "return" | "travelers" | null
  >(null);
  const [desktopNavSearchTarget, setDesktopNavSearchTarget] =
    useState<HTMLElement | null>(null);
  const [mobileNavSummaryTarget, setMobileNavSummaryTarget] =
    useState<HTMLElement | null>(null);
  const [mobileNavFiltersTarget, setMobileNavFiltersTarget] =
    useState<HTMLElement | null>(null);
  const [desktopSearchPopoverFrame, setDesktopSearchPopoverFrame] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [travelerPopoverPosition, setTravelerPopoverPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [countryHint, setCountryHint] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<AirportOption[]>(
    [],
  );
  const [, setOriginSuggestionsLoading] =
    useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    AirportOption[]
  >([]);
  const [, setDestinationSuggestionsLoading] =
    useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);
  const { status: sessionStatus } = useSession();
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [backendSavedItemIds, setBackendSavedItemIds] = useState<
    Record<string, string>
  >({});
  const [savedItemError, setSavedItemError] = useState("");

  const refreshBackendRecentSearches = useCallback(
    async (signal?: AbortSignal) => {
      const result = await fetchBackendRecentSearches(signal);
      if (signal?.aborted || !result.ok || !result.items) return;

      setRecentSearches(result.items);
    },
    [],
  );

  const tripTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const originInputRef = useRef<HTMLInputElement | null>(null);
  const destinationInputRef = useRef<HTMLInputElement | null>(null);
  const mobileOriginLauncherRef = useRef<HTMLButtonElement | null>(null);
  const mobileDestinationLauncherRef = useRef<HTMLButtonElement | null>(null);
  const originWrapRef = useRef<HTMLDivElement | null>(null);
  const destinationWrapRef = useRef<HTMLDivElement | null>(null);
  const stickyOriginWrapRef = useRef<HTMLDivElement | null>(null);
  const stickyDestinationWrapRef = useRef<HTMLDivElement | null>(null);
  const stickyDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const stickyTravelerButtonRef = useRef<HTMLButtonElement | null>(null);
  const departureWrapRef = useRef<HTMLDivElement | null>(null);
  const returnWrapRef = useRef<HTMLDivElement | null>(null);
  const travelerCabinWrapRef = useRef<HTMLDivElement | null>(null);
  const stickySentinelRef = useRef<HTMLDivElement | null>(null);
  const stickySearchPopoutRef = useRef<HTMLFormElement | null>(null);
  const stickySearchLauncherRef = useRef<HTMLElement | null>(null);
  const stickySearchRestoreTargetRef = useRef<
    "trip" | "origin" | "destination" | "dates" | "return" | "travelers" | null
  >(null);
  const pendingStickySearchTargetRef = useRef<
    "trip" | "origin" | "destination" | "dates" | "return" | "travelers" | null
  >(null);
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const expandedSearchScrollYRef = useRef(0);
  const filterApplyingTimeoutRef = useRef<number | null>(null);
  const filtersHydratedFromUrlRef = useRef(false);
  const hydratedFilterQueryStringRef = useRef<string | null>(null);
  const lastWrittenFilterQueryStringRef = useRef<string | null>(null);
  const travelPreferencesRequestedRef = useRef(false);
  const preferredAirlineDefaultResolvedRef = useRef(false);
  const preferredAirlineDefaultAppliedRef = useRef(false);
  const mobileFiltersScrollLockRef = useRef<MobileResultsScrollLockRelease | null>(null);
  const mobileSearchLauncherRef = useRef<HTMLElement | null>(null);
  const mobileFiltersLauncherRef = useRef<HTMLElement | null>(null);
  const mobileFiltersDialogRef = useRef<HTMLElement | null>(null);
  const mobileFiltersCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileSearchModalityRef = useRef<OverlayActivationModality>("programmatic");
  const mobileFiltersModalityRef = useRef<OverlayActivationModality>("programmatic");
  const shouldRestoreMobileSearchFocusRef = useRef(true);
  const shouldRestoreMobileFiltersFocusRef = useRef(true);
  const shouldScrollToTopAfterFilterApplyRef = useRef(false);
  const stickySearchPanelOpenRef = useRef(false);
  const queryString = params.toString();
  const searchQueryString = getSearchQueryString(params);
  const [preferredAirlineDefaults, setPreferredAirlineDefaults] = useState<
    string[] | null
  >(null);

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
    tripTypeInput === "multi-city" ? t("multiCity") : tripTypeInput === "one-way" ? t("oneWay") : t("roundTrip");
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
  const mobileFlightPriceAlertQuery = useMemo(
    () => tripTypeInput === "multi-city" ? null : {
      tripType: tripTypeInput === "one-way" ? "one-way" : "round-trip",
      origin: originCode || originInput.trim().toUpperCase(),
      destination: destinationCode || destinationInput.trim().toUpperCase(),
      departureDate: departureDateInput,
      ...(tripTypeInput === "round-trip" ? { returnDate: returnDateInput } : {}),
      adults: adultCount,
      children: childCount,
      infants: infantCount,
      travelers: adultCount + childCount + infantCount,
      cabinClass: cabinClassInput,
      currency: selectedCurrency,
    },
    [adultCount, cabinClassInput, childCount, departureDateInput, destinationCode, destinationInput, infantCount, originCode, originInput, returnDateInput, selectedCurrency, tripTypeInput],
  );
  const mobileCabinClassSummary = cabinClassLabel(cabinClassInput, t);
  const mobileSearchSummaryLabel = `${mobileRouteSummary} · ${mobileTripTypeSummary} · ${mobileDateSummary} · ${mobileTravelerSummary} · ${mobileCabinClassSummary}`;
  const travelerCabinSummary = buildTravelerCabinSummary(
    adultCount,
    childCount,
    infantCount,
    cabinClassInput,
    t,
  );
  const shouldRenderDesktopFullSearchForm = false;
  const shouldShowDesktopCompactSummary = true;
  const showFullSearchForm = isSearchExpandedWhileSticky;
  const showCompactSearchSummary = !isSearchExpandedWhileSticky;
  const savedRoutes = useMemo(
    () =>
      savedItemIds
        .map((id) => discoveryById.get(id))
        .filter((item): item is HomeDiscoveryItem => Boolean(item)),
    [savedItemIds],
  );

  const markExpandedSearchInteraction = useCallback(() => {}, []);

  const expandStickySearch = useCallback(() => {
    const currentScrollY = window.scrollY;
    expandedSearchScrollYRef.current = currentScrollY;
    setIsSearchExpandedWhileSticky(true);
  }, []);

  const updateDesktopSearchPopoverFrame = useCallback(
    (compactForm?: HTMLElement | null) => {
      if (typeof window === "undefined" || window.innerWidth < 1024) {
        setDesktopSearchPopoverFrame(null);
        return false;
      }

      const resolvedCompactForm =
        compactForm ??
        document.querySelector<HTMLElement>(
          "[data-flight-results-nav-search-form]",
        );
      if (!resolvedCompactForm) {
        setDesktopSearchPopoverFrame(null);
        return false;
      }

      const rect = resolvedCompactForm.getBoundingClientRect();
      const viewportGutter = 16;
      const availableWidth = Math.max(
        0,
        window.innerWidth - viewportGutter * 2,
      );
      const width = Math.min(rect.width, availableWidth);
      const left = Math.min(
        Math.max(viewportGutter, rect.left),
        Math.max(viewportGutter, window.innerWidth - viewportGutter - width),
      );

      setDesktopSearchPopoverFrame({
        top: rect.bottom,
        left,
        width,
      });
      return true;
    },
    [],
  );

  const openStickySearchEditor = useCallback(
    (
      launcher: HTMLElement,
      target: "trip" | "origin" | "destination" | "dates" | "return" | "travelers",
    ) => {
      stickySearchLauncherRef.current = launcher;
      const compactForm = launcher.closest<HTMLElement>(
        "[data-flight-results-nav-search-form]",
      );
      updateDesktopSearchPopoverFrame(compactForm);
      const resolvedTarget =
        tripTypeInput === "multi-city" &&
        (target === "origin" ||
          target === "destination" ||
          target === "dates" ||
          target === "return")
          ? "trip"
          : target;
      stickySearchRestoreTargetRef.current = resolvedTarget;
      pendingStickySearchTargetRef.current =
        resolvedTarget === "trip" ? null : resolvedTarget;
      const currentScrollY = window.scrollY;
      expandedSearchScrollYRef.current = currentScrollY;
      stickySearchPanelOpenRef.current = true;
      setIsSearchExpandedWhileSticky(true);
      setActiveStickySearchTarget(resolvedTarget);
      setActiveDesktopSearchSurface("sticky");
      setTripTypeMenuOpen(false);
      setActiveSuggest(
        resolvedTarget === "origin" && originInput.trim().length >= 2
          ? "origin"
          : resolvedTarget === "destination" &&
              destinationInput.trim().length >= 2
            ? "destination"
            : null,
      );
      setDropdownPosition(null);
      setActiveDatePicker(
        resolvedTarget === "dates"
          ? "departure"
          : resolvedTarget === "return"
            ? "return"
            : null,
      );
      setDatePickerPosition(null);
      setTravelerPopoverOpen(resolvedTarget === "travelers");
      setTravelerPopoverPosition(null);
    },
    [
      destinationInput,
      originInput,
      setActiveDatePicker,
      setActiveSuggest,
      setDatePickerPosition,
      setDropdownPosition,
      setTravelerPopoverOpen,
      setTravelerPopoverPosition,
      setTripTypeMenuOpen,
      tripTypeInput,
      updateDesktopSearchPopoverFrame,
    ],
  );

  const isStickySearchPanelOpen = isSearchExpandedWhileSticky;

  useEffect(() => {
    if (guidedMode || typeof window === "undefined") return undefined;
    const update = () =>
      setShowBackToTop(window.scrollY >= FLIGHT_BACK_TO_TOP_SCROLL_THRESHOLD);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [guidedMode]);

  useEffect(() => {
    if (guidedMode || typeof window === "undefined") return undefined;

    let frame = 0;

    const syncResultsHeaderTargets = () => {
      frame = window.requestAnimationFrame(() => {
        const nextDesktopTarget = document.querySelector<HTMLElement>(
          "[data-flight-results-nav-search]",
        );
        const nextMobileSummaryTarget = document.querySelector<HTMLElement>(
          "[data-flight-results-mobile-nav-summary]",
        );
        const nextMobileFiltersTarget = document.querySelector<HTMLElement>(
          "[data-flight-results-mobile-nav-filters]",
        );

        setDesktopNavSearchTarget((current) =>
          current === nextDesktopTarget ? current : nextDesktopTarget,
        );
        setMobileNavSummaryTarget((current) =>
          current === nextMobileSummaryTarget ? current : nextMobileSummaryTarget,
        );
        setMobileNavFiltersTarget((current) =>
          current === nextMobileFiltersTarget ? current : nextMobileFiltersTarget,
        );
      });
    };

    syncResultsHeaderTargets();

    const observer = new MutationObserver(syncResultsHeaderTargets);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [guidedMode]);

  useEffect(() => {
    stickySearchPanelOpenRef.current = isStickySearchPanelOpen;
  }, [isStickySearchPanelOpen]);

  const collapseStickySearch = useCallback(
    (_options: { restoreScroll?: boolean } = {}) => {
      stickySearchPanelOpenRef.current = false;
      setIsSearchExpandedWhileSticky(false);
      setActiveStickySearchTarget(null);
      setTripTypeMenuOpen(false);
      setActiveSuggest(null);
      setDropdownPosition(null);
      setActiveDatePicker(null);
      setDatePickerPosition(null);
      setTravelerPopoverOpen(false);
      setTravelerPopoverPosition(null);
      setActiveDesktopSearchSurface(null);
      setDesktopSearchPopoverFrame(null);

      window.requestAnimationFrame(() => {
        const restoreTarget = stickySearchRestoreTargetRef.current;

        if (restoreTarget === "origin" || restoreTarget === "destination") {
          stickySearchRestoreTargetRef.current = null;
          return;
        }

        const selector =
          restoreTarget === "trip"
            ? "[data-flight-results-header-trip]"
            : restoreTarget === "dates" || restoreTarget === "return"
              ? "[data-flight-results-header-dates]"
              : restoreTarget === "travelers"
                ? "[data-flight-results-header-travelers]"
                : null;
        const mountedLauncher = selector
          ? document.querySelector<HTMLElement>(selector)
          : null;

        (mountedLauncher ?? stickySearchLauncherRef.current)?.focus();
        stickySearchRestoreTargetRef.current = null;
      });
    },
    [
      setActiveDatePicker,
      setActiveSuggest,
      setDatePickerPosition,
      setDropdownPosition,
      setTravelerPopoverOpen,
      setTravelerPopoverPosition,
      setTripTypeMenuOpen,
    ],
  );

  useEffect(() => {
    if (!isStickySearchPanelOpen || typeof window === "undefined") {
      return undefined;
    }

    let animationFrame = 0;
    const refreshAnchoredFrame = () => {
      if (animationFrame) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;

        if (window.innerWidth < 1024) {
          collapseStickySearch();
          return;
        }

        const compactForm = document.querySelector<HTMLElement>(
          "[data-flight-results-nav-search-form]",
        );
        if (!updateDesktopSearchPopoverFrame(compactForm)) {
          collapseStickySearch();
        }
      });
    };

    window.addEventListener("resize", refreshAnchoredFrame);
    window.visualViewport?.addEventListener("resize", refreshAnchoredFrame);

    return () => {
      window.removeEventListener("resize", refreshAnchoredFrame);
      window.visualViewport?.removeEventListener("resize", refreshAnchoredFrame);
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [
    collapseStickySearch,
    isStickySearchPanelOpen,
    updateDesktopSearchPopoverFrame,
  ]);

  useEffect(() => {
    if (!isStickySearchPanelOpen) {
      return undefined;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const pendingTarget = pendingStickySearchTargetRef.current;
      pendingStickySearchTargetRef.current = null;

      if (pendingTarget === "origin") {
        stickyOriginWrapRef.current
          ?.querySelector<HTMLInputElement>("input")
          ?.focus({ preventScroll: true });
        return;
      }

      if (pendingTarget === "destination") {
        stickyDestinationWrapRef.current
          ?.querySelector<HTMLInputElement>("input")
          ?.focus({ preventScroll: true });
        return;
      }

      if (pendingTarget === "dates" || pendingTarget === "return") {
        stickyDateButtonRef.current?.focus({ preventScroll: true });
        return;
      }

      if (pendingTarget === "travelers") {
        stickyTravelerButtonRef.current?.focus({ preventScroll: true });
        return;
      }

      stickySearchLauncherRef.current?.focus({ preventScroll: true });
    });

    const handleStickyPanelPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const panel = stickySearchPopoutRef.current;
      const compactBar = document.querySelector<HTMLElement>(
        "[data-flight-results-nav-search-form]",
      );
      const datePickerPopover = document.getElementById(
        "flight-date-picker-popover",
      );
      const travelerPopover = document.getElementById(
        "flight-traveler-cabin-popover",
      );
      const airportSuggestions = document.getElementById(
        "flight-airport-suggestions",
      );
      const stickyOriginSuggestions = document.getElementById(
        "sticky-flight-origin-suggestions",
      );
      const stickyDestinationSuggestions = document.getElementById(
        "sticky-flight-destination-suggestions",
      );

      if (panel?.contains(target)) return;
      if (compactBar?.contains(target)) return;
      if (datePickerPopover?.contains(target)) return;
      if (travelerPopover?.contains(target)) return;
      if (airportSuggestions?.contains(target)) return;
      if (stickyOriginSuggestions?.contains(target)) return;
      if (stickyDestinationSuggestions?.contains(target)) return;
      if (stickyOriginWrapRef.current?.contains(target)) return;
      if (stickyDestinationWrapRef.current?.contains(target)) return;

      collapseStickySearch();
    };

    const handleStickyPanelKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (activeSuggest) {
        setActiveSuggest(null);
        setDropdownPosition(null);
        return;
      }

      if (activeDatePicker) {
        setActiveDatePicker(null);
        setDatePickerPosition(null);
        return;
      }

      if (travelerPopoverOpen) {
        setTravelerPopoverOpen(false);
        setTravelerPopoverPosition(null);
        return;
      }

      if (tripTypeMenuOpen) {
        collapseStickySearch();
        return;
      }

      collapseStickySearch();
    };

    document.addEventListener("mousedown", handleStickyPanelPointerDown);
    document.addEventListener("keydown", handleStickyPanelKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("mousedown", handleStickyPanelPointerDown);
      document.removeEventListener("keydown", handleStickyPanelKeyDown);
    };
  }, [
    activeDatePicker,
    activeSuggest,
    collapseStickySearch,
    isStickySearchPanelOpen,
    travelerPopoverOpen,
    tripTypeMenuOpen,
  ]);

  useEffect(() => {
    if (loading) {
      return undefined;
    }

    let animationFrame = 0;
    const sentinel = stickySentinelRef.current;

    const applyCompactState = (shouldCompact: boolean) => {
      setIsSearchCollapsed(shouldCompact);

      if (!shouldCompact) {
        setIsSearchExpandedWhileSticky(false);
      }
    };

    const updateFromSentinelPosition = () => {
      if (stickySearchPanelOpenRef.current) return;

      const searchFormRect = searchFormRef.current?.getBoundingClientRect();

      if (searchFormRect) {
        applyCompactState(searchFormRect.bottom <= 16);
        return;
      }

      const currentSentinel = stickySentinelRef.current;

      if (!currentSentinel) {
        applyCompactState(false);
        return;
      }

      const sentinelRect = currentSentinel.getBoundingClientRect();
      const sentinelScrollTop = sentinelRect.top + window.scrollY;
      const hasPassedStickyTrigger =
        window.scrollY > Math.max(16, sentinelScrollTop + 72);

      applyCompactState(hasPassedStickyTrigger);
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
      () => {
        updateFromSentinelPosition();
      },
      { threshold: 0 },
    );

    if (sentinel) {
      observer.observe(sentinel);
    }

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
  }, [loading]);

  const refreshBackendSavedItems = useCallback(async (signal?: AbortSignal) => {
    const result = await fetchBackendSavedDiscoveries(signal);
    if (!result.ok || !result.items) return;

    const backendIds: Record<string, string> = {};
    const localIds = result.items.map((item) => {
      const localId = getSavedDiscoveryLocalId(item);
      backendIds[localId] = item.id;
      return localId;
    });

    setBackendSavedItemIds(backendIds);
    setSavedItemIds(localIds);
  }, []);

  useEffect(() => {
    if (guidedMode) return;
    if (sessionStatus === "loading") return;

    if (sessionStatus === "authenticated") {
      const controller = new AbortController();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clears any logged-out device searches before hydrating account-backed recent searches.
      setRecentSearches([]);
      const timeoutId = window.setTimeout(() => {
        void refreshBackendRecentSearches(controller.signal);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
        controller.abort();
      };
    }

    const timeoutId = window.setTimeout(() => {
      setRecentSearches(readRecentSearches());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [guidedMode, refreshBackendRecentSearches, sessionStatus]);

  useEffect(() => {
    if (guidedMode) {
      const timer = window.setTimeout(() => {
        setBackendSavedItemIds({});
        setSavedItemIds([]);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    if (sessionStatus === "loading") return;

    if (sessionStatus === "authenticated") {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        void refreshBackendSavedItems(controller.signal);
      }, 0);
      return () => {
        window.clearTimeout(timeoutId);
        controller.abort();
      };
    }

    const timeoutId = window.setTimeout(() => {
      setBackendSavedItemIds({});
      setSavedItemIds(readSavedItemIds());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [guidedMode, refreshBackendSavedItems, sessionStatus]);

  useEffect(() => {
    return () => {
      if (filterApplyingTimeoutRef.current !== null) {
        window.clearTimeout(filterApplyingTimeoutRef.current);
      }

      if (mobileDatePickerTransitionFrameRef.current !== null) {
        window.cancelAnimationFrame(mobileDatePickerTransitionFrameRef.current);
      }

      if (mobileDatePickerTransitionTimeoutRef.current !== null) {
        window.clearTimeout(mobileDatePickerTransitionTimeoutRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (
      typeof window === "undefined" ||
      !("scrollRestoration" in window.history)
    ) {
      return undefined;
    }

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const navigationEntry = window.performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;
    const isHistoryTraversal = navigationEntry?.type === "back_forward";

    if (!isHistoryTraversal) {
      scrollWindowToPageTop();
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;

      const currentNavigationEntry = window.performance.getEntriesByType(
        "navigation",
      )[0] as PerformanceNavigationTiming | undefined;

      if (currentNavigationEntry?.type !== "back_forward") {
        scrollWindowToPageTop();
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  const closeMobileShortcutSheet = useCallback((restoreFocus = true) => {
    setMobileShortcutSheet(null);
    if (restoreFocus) window.requestAnimationFrame(() => mobileShortcutLauncherRef.current?.focus({ preventScroll: true }));
  }, []);

  useLayoutEffect(() => {
    if (!mobileShortcutSheet) return;
    mobileShortcutScrollLockRef.current ??= acquireMobileResultsScrollLock();
    const focusFrame = window.requestAnimationFrame(() => mobileShortcutSheetCloseRef.current?.focus({ preventScroll: true }));
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileShortcutSheet();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(mobileShortcutSheetRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []).filter((element) => element.offsetParent !== null);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      mobileShortcutScrollLockRef.current?.();
      mobileShortcutScrollLockRef.current = null;
    };
  }, [closeMobileShortcutSheet, mobileShortcutSheet]);


  useLayoutEffect(() => {
    if (!mobileSearchOpen) return;

    return () => {
      const launcher = mobileSearchLauncherRef.current;
      const shouldRestoreFocus = shouldRestoreMobileSearchFocusRef.current;

      shouldRestoreMobileSearchFocusRef.current = true;

      if (shouldRestoreFocus) restoreOverlayLauncherFocus(launcher, mobileSearchModalityRef.current);
    };
  }, [mobileSearchOpen]);

  useLayoutEffect(() => {
    const releaseExistingLock = () => {
      const launcher = mobileFiltersLauncherRef.current;
      const shouldRestoreFocus = shouldRestoreMobileFiltersFocusRef.current;

      mobileFiltersScrollLockRef.current?.();
      mobileFiltersScrollLockRef.current = null;
      shouldRestoreMobileFiltersFocusRef.current = true;

      if (shouldRestoreFocus) restoreOverlayLauncherFocus(launcher, mobileFiltersModalityRef.current);
    };

    if (!filtersOpen || typeof window === "undefined") {
      releaseExistingLock();
      return releaseExistingLock;
    }

    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    if (!mobileQuery.matches) {
      closeMobileFiltersDrawer({ restoreFocus: false });
      releaseExistingLock();
      return releaseExistingLock;
    }

    mobileFiltersScrollLockRef.current ??= acquireMobileResultsScrollLock();

    const focusFrame = window.requestAnimationFrame(() => {
      mobileFiltersCloseButtonRef.current?.focus({ preventScroll: true });
    });

    const getFocusableDrawerControls = () =>
      Array.from(
        mobileFiltersDialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.offsetParent !== null);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileFiltersDrawer();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableControls = getFocusableDrawerControls();
      if (focusableControls.length === 0) return;

      const firstControl = focusableControls[0];
      const lastControl = focusableControls[focusableControls.length - 1];

      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus({ preventScroll: true });
      }
    };

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        closeMobileFiltersDrawer({ restoreFocus: false });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    mobileQuery.addEventListener("change", handleViewportChange);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      mobileQuery.removeEventListener("change", handleViewportChange);
      releaseExistingLock();
    };
  }, [filtersOpen]);

  useLayoutEffect(() => {
    if (filtersOpen || !shouldScrollToTopAfterFilterApplyRef.current) return;

    shouldScrollToTopAfterFilterApplyRef.current = false;
    scrollWindowToPageTop();
  }, [filtersOpen, queryString]);

  const triggerFilterApplying = useCallback(() => {
    setFilterApplying(true);

    if (filterApplyingTimeoutRef.current !== null) {
      window.clearTimeout(filterApplyingTimeoutRef.current);
    }

    filterApplyingTimeoutRef.current = window.setTimeout(() => {
      setFilterApplying(false);
      filterApplyingTimeoutRef.current = null;
    }, 700);
  }, [setFilterApplying]);

  function handleRemoveRecentSearch(id: string) {
    if (sessionStatus === "authenticated") {
      setRecentSearches((current) =>
        current.filter((entry) => entry.id !== id),
      );
      void deleteBackendRecentSearch(id);
      return;
    }

    setRecentSearches(removeRecentSearch(id));
  }

  function handleClearRecentSearches() {
    setRecentSearches([]);

    if (sessionStatus === "authenticated") {
      void clearBackendRecentSearches();
      return;
    }

    clearRecentSearches();
  }

  function handleTripTypeChange(nextTripType: string) {
    markExpandedSearchInteraction();

    if (nextTripType === "multi-city") {
      if (multiCityLegs.length === 0) {
        const firstLeg = {
          origin: originCode || originInput.trim().toUpperCase(),
          destination: destinationCode || destinationInput.trim().toUpperCase(),
          departureDate: departureDateInput,
        };
        const projectedLegs = [
          firstLeg,
          tripTypeInput === "round-trip" && returnDateInput
            ? {
                origin: firstLeg.destination,
                destination: firstLeg.origin,
                departureDate: returnDateInput,
              }
            : {
                origin: firstLeg.destination,
                destination: "",
                departureDate: departureDateInput,
              },
        ];
        const projection = projectSearchLegs("multi-city", projectedLegs);
        setMultiCityLegs(projection.legs);
      }
      setTripTypeInput("multi-city");
      closeFlightSearchPopovers();
      return;
    }

    const normalizedTripType =
      nextTripType === "one-way" ? "one-way" : "round-trip";

    if (tripTypeInput === "multi-city" && multiCityLegs.length > 0) {
      const projection = projectSearchLegs(normalizedTripType, multiCityLegs);
      setOriginInput(projection.origin);
      setOriginCode(projection.origin);
      setDestinationInput(projection.destination);
      setDestinationCode(projection.destination);
      setDepartureDateInput(projection.departureDate);
      setReturnDateInput(projection.returnDate ?? "");
    } else if (normalizedTripType === "one-way") {
      setReturnDateInput("");
    }

    setTripTypeInput(normalizedTripType);
    setTripTypeMenuOpen(false);

    if (normalizedTripType === "one-way") {
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

  function handleMobileTripTypeChange(nextTripType: string) {
    markExpandedSearchInteraction();
    setTripTypeMenuOpen(false);

    if (nextTripType === "multi-city") {
      if (multiCityLegs.length === 0) {
        const firstLeg = {
          origin: originCode || originInput.trim().toUpperCase(),
          destination:
            destinationCode || destinationInput.trim().toUpperCase(),
          departureDate: departureDateInput,
        };
        const projectedLegs = [
          firstLeg,
          tripTypeInput === "round-trip" && returnDateInput
            ? {
                origin: firstLeg.destination,
                destination: firstLeg.origin,
                departureDate: returnDateInput,
              }
            : {
                origin: firstLeg.destination,
                destination: "",
                departureDate: departureDateInput,
              },
        ];
        const projection = projectSearchLegs("multi-city", projectedLegs);
        setMultiCityLegs(projection.legs);
      }
      setTripTypeInput("multi-city");
      closeFlightSearchPopovers();
      return;
    }

    const normalizedTripType =
      nextTripType === "one-way" ? "one-way" : "round-trip";
    if (tripTypeInput === "multi-city" && multiCityLegs.length > 0) {
      const projection = projectSearchLegs(normalizedTripType, multiCityLegs);
      setOriginInput(projection.origin);
      setOriginCode(projection.origin);
      setDestinationInput(projection.destination);
      setDestinationCode(projection.destination);
      setDepartureDateInput(projection.departureDate);
      setReturnDateInput(projection.returnDate ?? "");
    } else if (normalizedTripType === "one-way") {
      setReturnDateInput("");
    }
    setTripTypeInput(normalizedTripType);
    closeFlightSearchPopovers();
  }

  function rememberMobileSearchScrollPosition() {
    mobileSearchScrollTopRef.current =
      mobileSearchScrollRef.current?.scrollTop ?? 0;
  }

  function restoreMobileSearchScrollPosition() {
    window.requestAnimationFrame(() => {
      const scroller = mobileSearchScrollRef.current;
      if (!scroller) return;
      scroller.scrollTo({
        top: mobileSearchScrollTopRef.current,
        behavior: "instant",
      });
    });
  }

  function closeMobileDatePicker() {
    setDraftMobileDepartureDate(departureDateInput);
    setDraftMobileReturnDate(returnDateInput);
    setActiveDatePicker(null);
    setDatePickerPosition(null);

    if (activeDesktopSearchSurface === "sticky") {
      collapseStickySearch({ restoreScroll: false });
      return;
    }

    restoreMobileSearchScrollPosition();
  }

  function openMobileDatePicker() {
    rememberMobileSearchScrollPosition();
    setDraftMobileDepartureDate(departureDateInput);
    setDraftMobileReturnDate(returnDateInput);
    setActiveDatePicker("departure");
    setDatePickerPosition(null);
  }

  function getMissingMobileDatePicker() {
    if (!departureDateInput.trim()) return "departure";

    if (tripTypeInput === "round-trip" && !returnDateInput.trim()) {
      return "return";
    }

    return null;
  }

  function clearPendingMobileDatePickerTransition() {
    pendingMobileDatePickerRef.current = null;

    if (mobileDatePickerTransitionFrameRef.current !== null) {
      window.cancelAnimationFrame(mobileDatePickerTransitionFrameRef.current);
      mobileDatePickerTransitionFrameRef.current = null;
    }

    if (mobileDatePickerTransitionTimeoutRef.current !== null) {
      window.clearTimeout(mobileDatePickerTransitionTimeoutRef.current);
      mobileDatePickerTransitionTimeoutRef.current = null;
    }
  }

  function openPendingMobileDatePickerAfterAirportClose() {
    const nextPicker = pendingMobileDatePickerRef.current;
    if (!nextPicker) return;

    pendingMobileDatePickerRef.current = null;

    if (mobileDatePickerTransitionFrameRef.current !== null) {
      window.cancelAnimationFrame(mobileDatePickerTransitionFrameRef.current);
    }

    if (mobileDatePickerTransitionTimeoutRef.current !== null) {
      window.clearTimeout(mobileDatePickerTransitionTimeoutRef.current);
      mobileDatePickerTransitionTimeoutRef.current = null;
    }

    mobileDatePickerTransitionFrameRef.current = window.requestAnimationFrame(
      () => {
        mobileDatePickerTransitionFrameRef.current = null;
        mobileDatePickerTransitionTimeoutRef.current = window.setTimeout(() => {
          mobileDatePickerTransitionTimeoutRef.current = null;
          restoreMobileSearchScrollPosition();
          setActiveDatePicker(nextPicker);
          setDatePickerPosition(null);
        }, 16);
      },
    );
  }

  function closeMobileAirportPicker() {
    setActiveMobileAirportPicker(null);
    openPendingMobileDatePickerAfterAirportClose();
  }

  function closeMobileTravelerPopover() {
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClassInput(cabinClassInput);
    setTravelerPopoverOpen(false);
    setTravelerPopoverPosition(null);
    restoreMobileSearchScrollPosition();
  }

  function openMobileTravelerPopover() {
    rememberMobileSearchScrollPosition();
    setDraftAdultCount(adultCount);
    setDraftChildCount(childCount);
    setDraftInfantCount(infantCount);
    setDraftCabinClassInput(cabinClassInput);
    setTravelerPopoverOpen(true);
    setTravelerPopoverPosition(null);
  }

  function commitMobileTravelerPopover() {
    const adults = Math.min(9, Math.max(1, draftAdultCount));
    const children = Math.min(9 - adults, Math.max(0, draftChildCount));
    const infants = Math.min(
      adults,
      9 - adults - children,
      Math.max(0, draftInfantCount),
    );

    setAdultCount(adults);
    setChildCount(children);
    setInfantCount(infants);
    setCabinClassInput(draftCabinClassInput);
    setTravelerPopoverOpen(false);
    setTravelerPopoverPosition(null);
    restoreMobileSearchScrollPosition();
  }

  function closeFlightSearchPopovers() {
    clearPendingMobileDatePickerTransition();
    setActiveMobileAirportPicker(null);
    setActiveSuggest(null);
    setDropdownPosition(null);
    setActiveDatePicker(null);
    setDatePickerPosition(null);
    setTravelerPopoverOpen(false);
    setTravelerPopoverPosition(null);
    setTripTypeMenuOpen(false);
  }

  function closeMobileSearchDrawer({
    restoreFocus = true,
  }: MobileOverlayCloseOptions = {}) {
    closeFlightSearchPopovers();
    shouldRestoreMobileSearchFocusRef.current = restoreFocus;
    setMobileSearchOpen(false);
  }

  function closeMobileFiltersDrawer({
    restoreFocus = true,
  }: MobileOverlayCloseOptions = {}) {
    shouldRestoreMobileFiltersFocusRef.current = restoreFocus;
    setFiltersOpen(false);
  }

  function openMobileSearchDrawer(launcher?: HTMLElement | null, modality: OverlayActivationModality = "programmatic") {
    mobileSearchLauncherRef.current = launcher ?? null;
    mobileSearchModalityRef.current = modality;
    closeMobileFiltersDrawer({ restoreFocus: false });
    closeFlightSearchPopovers();
    setMobileSearchOpen(true);
  }

  function openMobileFiltersDrawer(launcher?: HTMLElement | null, modality: OverlayActivationModality = "programmatic") {
    mobileFiltersLauncherRef.current = launcher ?? null;
    mobileFiltersModalityRef.current = modality;
    closeMobileShortcutSheet(false);
    setFiltersOpen(true);
  }

  function focusOriginInput() {
    window.requestAnimationFrame(() => originInputRef.current?.focus());
  }

  function focusDestinationInput() {
    window.requestAnimationFrame(() => destinationInputRef.current?.focus());
  }



  function getCurrentFlightSearchForSavedItem(): SavedDiscoveryFlightSearch | undefined {
    if (!body) return undefined;
    // The legacy saved-discovery contract cannot restore intermediate multi-city legs.
    // Keep it unavailable until that persistent model becomes leg-aware.
    if (body.tripType === "multi-city") return undefined;
    const tripType = body.tripType === "one-way" ? "one-way" : "round-trip";
    const cabinClass = body.cabinClass === "business" || body.cabinClass === "first" ? body.cabinClass : "economy";
    if (!body.origin || !body.destination || !body.departureDate) return undefined;
    if (tripType === "round-trip" && !body.returnDate) return undefined;
    return {
      tripType,
      origin: body.origin,
      destination: body.destination,
      departureDate: body.departureDate,
      returnDate: tripType === "round-trip" ? body.returnDate : null,
      adults: body.adults,
      children: body.children,
      infants: body.infants,
      travelers: body.travelers,
      cabinClass,
      currency: body.currency,
    };
  }

  async function handleSavedRouteToggle(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
    display?: SavedDiscoveryDisplayDetails,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (sessionStatus !== "authenticated") {
      setSavedItemError("");
      setSavedItemIds((current) => {
        const next = toggleSavedItemId(current, itemId);
        writeSavedItemIds(next);
        return next;
      });
      return;
    }

    if (savedItemIds.includes(itemId)) {
      const backendId = backendSavedItemIds[itemId];
      if (!backendId) {
        await refreshBackendSavedItems();
        return;
      }

      const result = await deleteBackendDiscovery(backendId);
      if (result.ok) {
        setSavedItemError("");
        setSavedItemIds((current) => current.filter((id) => id !== itemId));
        setBackendSavedItemIds((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
      } else {
        setSavedItemError(
          result.error ?? "Unable to update saved items right now.",
        );
        await refreshBackendSavedItems();
      }
      return;
    }

    const result = await saveBackendDiscovery(itemId, display, getCurrentFlightSearchForSavedItem());
    if (result.ok || result.duplicate) {
      setSavedItemError("");
      await refreshBackendSavedItems();
    } else {
      setSavedItemError(result.error ?? "Unable to save item right now.");
    }
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
    if (guidedMode) return;
    const searchValues = new URLSearchParams(searchQueryString);
    const normalizedSearchValues =
      normalizeFlightDateSearchParams(searchValues);

    if (normalizedSearchValues.toString() !== searchValues.toString()) {
      const nextQuery = normalizedSearchValues.toString();
      router.replace(nextQuery ? `/flights/results?${nextQuery}` : "/flights", {
        scroll: false,
      });
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
    if (nextTripType === "multi-city") {
      setMultiCityLegs(parseFlightLegParams(normalizedSearchValues));
    }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Existing URL sync closes transient popovers after search params change.
  }, [guidedMode, router, searchQueryString]);

  useEffect(() => {
    if (guidedMode) return;
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
  }, [guidedMode, originInput, countryHint]);

  useEffect(() => {
    if (guidedMode) return;
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
  }, [guidedMode, destinationInput, countryHint]);

  const body = useMemo(() => {
    const searchParams = normalizeFlightDateSearchParams(
      new URLSearchParams(searchQueryString),
    );
    const origin = searchParams.get("origin")?.trim() || "";
    const destination = searchParams.get("destination")?.trim() || "";
    const departureDate = searchParams.get("departureDate")?.trim() || "";
    const tripType = searchParams.get("tripType") || "round-trip";
    const legs = tripType === "multi-city" ? parseFlightLegParams(searchParams) : undefined;
    const returnDate = searchParams.get("returnDate")?.trim() || "";
    const hasValidDepartureDate = isValidFutureOrTodayDateValue(departureDate);
    const hasValidReturnDate =
      tripType !== "round-trip" ||
      (isValidFutureOrTodayDateValue(returnDate) &&
        !isDateValueBefore(returnDate, departureDate));
    const hasSearch = tripType === "multi-city"
      ? Boolean(legs && legs.length >= 2 && legs.every((leg, index) => leg.origin && leg.destination && leg.origin !== leg.destination && isValidFutureOrTodayDateValue(leg.departureDate) && (index === 0 || leg.departureDate >= legs[index - 1].departureDate)))
      : Boolean(origin && destination && departureDate && hasValidDepartureDate && hasValidReturnDate);

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
      ...(legs ? { legs } : {}),
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
  const currentFlightSearchKey = useMemo(
    () => (body ? buildFlightResultsSearchKey(body) : ""),
    [body],
  );

  useEffect(() => {
    if (!body) {
      activeFlightSearchKeyRef.current = "";
      const resetTimer = window.setTimeout(() => {
        setResults([]);
        setBackgroundRefreshing(false);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    let active = true;
    let controller: AbortController | null = null;
    const searchKey = buildFlightResultsSearchKey(body);
    activeFlightSearchKeyRef.current = searchKey;

    const timer = window.setTimeout(() => {
      if (!active || activeFlightSearchKeyRef.current !== searchKey) return;
      setFiltersReadySearchKey(null);

      const shouldBypassSnapshot = userInitiatedRetryRef.current && guidedMode;
      const snapshotState = shouldBypassSnapshot
        ? null
        : readFlightResultsSessionSnapshotForRefresh(searchKey);
      const snapshot = snapshotState?.snapshot;
      const refreshingStaleSnapshot = Boolean(snapshot && !snapshotState?.isFresh);
      if (snapshot) {
        if (!active || activeFlightSearchKeyRef.current !== searchKey) return;
        setResults(
          filterResultsByRequestedOutboundDate(
            snapshot.results,
            body.departureDate,
          ),
        );
        setError("");
        // Fresh snapshots can render immediately. A stale snapshot is retained
        // as a fallback, but keep the blocking Results loader visible until the
        // refresh settles so the page cannot expose a changing scroll extent.
        setLoading(refreshingStaleSnapshot);
        setBackgroundRefreshing(refreshingStaleSnapshot);
        if (!refreshingStaleSnapshot) return;
      } else {
        setResults([]);
        setLoading(true);
        setBackgroundRefreshing(false);
        if (userInitiatedRetryRef.current) {
          window.setTimeout(() => loadingFocusRef.current?.focus({ preventScroll: true }), 0);
        }
        setError("");
      }

      controller = new AbortController();
      fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
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

          return data as { results: PublicFlightResult[]; warnings?: string[]; resultsCacheValidUntil?: number };
        })
        .then((data) => {
          if (!active || activeFlightSearchKeyRef.current !== searchKey) return;

          const filteredResults = filterResultsByRequestedOutboundDate(
            data.results,
            body.departureDate,
          );
          const warnings = Array.isArray(data.warnings) ? data.warnings : [];
          if (typeof data.resultsCacheValidUntil === "number") {
            writeFlightResultsSessionSnapshot(
              searchKey,
              filteredResults,
              warnings,
              data.resultsCacheValidUntil,
            );
          }
          setResults(filteredResults);
        })
        .catch((searchError) => {
          if (controller?.signal.aborted || !active || activeFlightSearchKeyRef.current !== searchKey) return;

          if (!refreshingStaleSnapshot) {
            setError(
              searchError instanceof Error
                ? t(searchError.message) || searchError.message
                : dictionary.unableToSearchFlights ||
                    enTranslations.unableToSearchFlights ||
                    "Unable to search flights.",
            );
          }
        })
        .finally(() => {
          if (active && activeFlightSearchKeyRef.current === searchKey) {
            setLoading(false);
            setBackgroundRefreshing(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [body, dictionary.unableToSearchFlights, guidedMode, mainInventoryRetryGeneration, t]);

  const retryMainInventorySearch = useCallback(() => {
    userInitiatedRetryRef.current = true;
    setError("");
    setResults([]);
    setLoading(true);
    setBackgroundRefreshing(false);
    setFiltersReadySearchKey(null);
    setMainInventoryRetryGeneration((generation) => generation + 1);
  }, []);

  useEffect(() => {
    if (!desktopSortOpen) return;

    function handleClose(event: MouseEvent) {
      const target = event.target as Node;
      if (desktopSortRef.current?.contains(target)) return;
      setDesktopSortOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDesktopSortOpen(false);
        desktopSortButtonRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleClose);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClose);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [desktopSortOpen]);

  useEffect(() => {
    const generation = nearbyFareGenerationRef.current + 1;
    nearbyFareGenerationRef.current = generation;

    const activeRequests = nearbyFareRequestsRef.current;
    activeRequests.forEach((request) => request.controller.abort());
    activeRequests.clear();

    if (guidedMode) {
      nearbyFareCacheRef.current.clear();
      const timer = window.setTimeout(() => {
        setNearbyFares([]);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    if (!body?.departureDate) {
      const timer = window.setTimeout(() => setNearbyFares([]), 0);
      return () => window.clearTimeout(timer);
    }

    const centerDate = parseDateValue(body.departureDate);
    if (!centerDate) {
      const timer = window.setTimeout(() => setNearbyFares([]), 0);
      return () => window.clearTimeout(timer);
    }

    let active = true;
    const dates = getNearbyFareDateRange(getNearbyFareWindowStart(centerDate));
    const fetchedAt = Date.now();
    const currentFare = getLowestComparableFlightFare(
      providerResults,
      selectedCurrency,
      currencyRates.rates,
    );
    const selectedKey = getNearbyFareCacheKey(body, body.departureDate);

    if (currentFare) {
      nearbyFareCacheRef.current.set(selectedKey, {
        date: body.departureDate,
        status: "success",
        amount: currentFare.price,
        currency: currentFare.currency,
        fetchedAt,
      });
    }

    const nextFares = dates.map((date) => {
      const cached = getFreshNearbyFareCacheEntry(
        nearbyFareCacheRef.current,
        getNearbyFareCacheKey(body, date),
      );

      return cached ?? { date, status: "loading" as const };
    });

    const syncTimer = window.setTimeout(() => {
      if (active && nearbyFareGenerationRef.current === generation) {
        setNearbyFares(nextFares);
      }
    }, 0);

    const selectedIndex = dates.indexOf(body.departureDate);
    const prioritizedDates = [...dates]
      .sort((left, right) => {
        const leftDistance = Math.abs(dates.indexOf(left) - selectedIndex);
        const rightDistance = Math.abs(dates.indexOf(right) - selectedIndex);
        return leftDistance - rightDistance;
      })
      .filter(
        (date) =>
          !getFreshNearbyFareCacheEntry(
            nearbyFareCacheRef.current,
            getNearbyFareCacheKey(body, date),
          ),
      );

    async function fetchFareForDate(date: string) {
      if (!body || !active || nearbyFareGenerationRef.current !== generation)
        return;

      const key = getNearbyFareCacheKey(body, date);
      const existing = nearbyFareRequestsRef.current.get(key);
      if (existing) {
        await existing.promise;
        return;
      }

      const controller = new AbortController();
      const fareBody = buildNearbyFareSearchBody(body, date);
      const promise = fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fareBody),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("nearby-fare-search-failed");
          const data = (await response.json()) as {
            results?: PublicFlightResult[];
          };
          const fare = getLowestComparableFlightFare(
            data.results ?? [],
            selectedCurrency,
            currencyRates.rates,
          );
          const state: NearbyFareState = fare
            ? {
                date,
                status: "success",
                amount: fare.price,
                currency: fare.currency,
                fetchedAt: Date.now(),
              }
            : { date, status: "unavailable", fetchedAt: Date.now() };

          if (!active || nearbyFareGenerationRef.current !== generation) return;

          nearbyFareCacheRef.current.set(key, state);
          setNearbyFares((current) =>
            current.map((item) => (item.date === date ? state : item)),
          );
        })
        .catch((error) => {
          if (
            controller.signal.aborted ||
            !active ||
            nearbyFareGenerationRef.current !== generation
          )
            return;

          const state: NearbyFareState = {
            date,
            status: "error",
            message: error instanceof Error ? error.message : undefined,
            fetchedAt: Date.now(),
          };
          nearbyFareCacheRef.current.set(key, state);
          setNearbyFares((current) =>
            current.map((item) => (item.date === date ? state : item)),
          );
        })
        .finally(() => {
          if (
            nearbyFareRequestsRef.current.get(key)?.controller === controller
          ) {
            nearbyFareRequestsRef.current.delete(key);
          }
        });

      nearbyFareRequestsRef.current.set(key, { controller, promise });
      await promise;
    }

    async function runQueue() {
      let nextIndex = 0;
      const workers = Array.from(
        {
          length: Math.min(
            nearbyFareRequestConcurrency,
            prioritizedDates.length,
          ),
        },
        async () => {
          while (active && nearbyFareGenerationRef.current === generation) {
            const date = prioritizedDates[nextIndex];
            nextIndex += 1;
            if (!date) break;
            await fetchFareForDate(date);
          }
        },
      );

      await Promise.all(workers);
    }

    void runQueue();

    return () => {
      active = false;
      window.clearTimeout(syncTimer);
      activeRequests.forEach((request) => request.controller.abort());
      activeRequests.clear();
    };
  }, [body, currencyRates.rates, guidedMode, providerResults, selectedCurrency]);

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
      const useStickyWrap = activeDesktopSearchSurface === "sticky";
      const preferredWidth = useStickyWrap ? 560 : 380;
      const wrap =
        target === "origin"
          ? useStickyWrap
            ? stickyOriginWrapRef.current
            : originWrapRef.current
          : useStickyWrap
            ? stickyDestinationWrapRef.current
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
      const dropdowns = [
        document.getElementById("flight-airport-suggestions"),
        document.getElementById("sticky-flight-origin-suggestions"),
        document.getElementById("sticky-flight-destination-suggestions"),
      ];
      const clickedDropdown = dropdowns.some((dropdown) =>
        dropdown?.contains(target),
      );
      const originWrap =
        activeDesktopSearchSurface === "sticky"
          ? stickyOriginWrapRef.current
          : originWrapRef.current;
      const destinationWrap =
        activeDesktopSearchSurface === "sticky"
          ? stickyDestinationWrapRef.current
          : destinationWrapRef.current;

      if (
        !clickedDropdown &&
        activeSuggest === "origin" &&
        originWrap &&
        !originWrap.contains(target)
      ) {
        setActiveSuggest(null);
        setDropdownPosition(null);
      }

      if (
        !clickedDropdown &&
        activeSuggest === "destination" &&
        destinationWrap &&
        !destinationWrap.contains(target)
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
  }, [activeDesktopSearchSurface, activeSuggest, mobileSearchOpen]);

  useEffect(() => {
    function updateDatePickerPosition(target: "departure" | "return") {
      const viewportPadding = 16;
      const useStickyTrigger = activeDesktopSearchSurface === "sticky";
      const preferredWidth = useStickyTrigger ? 780 : 620;
      const wrap =
        target === "departure"
          ? departureWrapRef.current
          : (returnWrapRef.current ?? departureWrapRef.current);
      const trigger = useStickyTrigger
        ? stickyDateButtonRef.current
        : wrap?.querySelector("button");

      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(
        preferredWidth,
        window.innerWidth - viewportPadding * 2,
      );
      const preferredLeft = useStickyTrigger
        ? rect.left + rect.width / 2 - width / 2
        : rect.left;
      const left = Math.max(
        viewportPadding,
        Math.min(
          preferredLeft,
          window.innerWidth - width - viewportPadding,
        ),
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
      const mobilePopover = document.querySelector(
        "[data-mobile-flight-date-picker]",
      );
      const clickedPopover =
        popover?.contains(target) || mobilePopover?.contains(target);
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
  }, [activeDatePicker, activeDesktopSearchSurface]);

  useEffect(() => {
    function updateTravelerPopoverPosition() {
      const viewportPadding = 16;
      const useStickyTrigger = activeDesktopSearchSurface === "sticky";
      const preferredWidth = useStickyTrigger ? 480 : 360;
      const trigger = useStickyTrigger
        ? stickyTravelerButtonRef.current
        : travelerCabinWrapRef.current?.querySelector("button");

      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const width = Math.min(
        preferredWidth,
        window.innerWidth - viewportPadding * 2,
      );
      const preferredLeft = useStickyTrigger ? rect.right - width : rect.left;
      const left = Math.max(
        viewportPadding,
        Math.min(
          preferredLeft,
          window.innerWidth - width - viewportPadding,
        ),
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
      const mobilePopover = document.querySelector(
        "[data-mobile-traveler-cabin-picker]",
      );
      const clickedPopover =
        popover?.contains(target) || mobilePopover?.contains(target);
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
  }, [activeDesktopSearchSurface, travelerPopoverOpen]);

  function handleSwapLocations() {
    markExpandedSearchInteraction();

    if (tripTypeInput === "multi-city") {
      setMultiCityLegs((currentLegs) =>
        currentLegs.map((leg, index) =>
          index === 0
            ? {
                ...leg,
                origin: leg.destination,
                destination: leg.origin,
              }
            : leg,
        ),
      );
      return;
    }

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
    restoreMobileSearchScrollPosition();
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

    const hasValidMultiCitySearch =
      multiCityLegs.length >= MULTI_CITY_MIN_LEGS &&
      multiCityLegs.length <= MULTI_CITY_MAX_LEGS &&
      multiCityAirportsValid &&
      multiCityLegs.every(
        (leg, index) =>
          /^[A-Z0-9]{3}$/.test(leg.origin) &&
          /^[A-Z0-9]{3}$/.test(leg.destination) &&
          leg.origin !== leg.destination &&
          isValidFutureOrTodayDateValue(leg.departureDate) &&
          (index === 0 ||
            leg.departureDate >= multiCityLegs[index - 1].departureDate),
      );

    if (tripTypeInput === "multi-city" && !hasValidMultiCitySearch) return;

    if (
      tripTypeInput !== "multi-city" &&
      (!nextOrigin ||
        !nextDestination ||
        !hasValidDepartureDate ||
        !hasValidReturnDate)
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

    const projection =
      tripTypeInput === "multi-city"
        ? projectSearchLegs("multi-city", multiCityLegs)
        : null;
    const nextParams = new URLSearchParams({
      tripType: tripTypeInput,
      origin: projection?.origin ?? nextOrigin,
      destination: projection?.destination ?? nextDestination,
      departureDate: projection?.departureDate ?? nextDepartureDate,
      adults: String(adults),
      children: String(children),
      infants: String(infants),
      travelers: String(travelers),
      cabinClass: cabinClassInput,
    });

    if (tripTypeInput === "multi-city") {
      nextParams.set("currency", selectedCurrency);
      appendFlightLegParams(nextParams, multiCityLegs);
    }

    if (tripTypeInput === "round-trip" && nextReturnDate) {
      nextParams.set("returnDate", nextReturnDate);
    }

    if (tripTypeInput !== "multi-city") try {
      const recentSearch = buildFlightRecentSearch({
        tripType: tripTypeInput === "one-way" ? "one-way" : "round-trip",
        origin: nextOrigin,
        destination: nextDestination,
        departureDate: nextDepartureDate,
        returnDate: tripTypeInput === "round-trip" ? nextReturnDate : undefined,
        adults,
        children,
        infants,
        travelers,
        cabinClass: cabinClassInput,
      });
      if (sessionStatus === "authenticated") {
        void syncBackendRecentSearch(recentSearch);
      } else {
        upsertRecentSearch(recentSearch);
      }
    } catch {
      // best effort only
    }

    const shouldCloseMobileDrawer = mobileSearchOpen;
    const shouldCloseStickyPopout = stickySearchPanelOpenRef.current;

    if (shouldCloseMobileDrawer) {
      closeMobileSearchDrawer({ restoreFocus: false });
    }

    if (shouldCloseStickyPopout) {
      collapseStickySearch({ restoreScroll: false });
    }

    router.push(`/flights/results?${nextParams.toString()}`, { scroll: true });
  }

  const priceLabelCurrency = selectedCurrency;

  const mixedProviderCurrenciesLabel =
    dictionary.mixedProviderCurrencies ??
    enTranslations.mixedProviderCurrencies ??
    "";

  const formatResultPriceLabel = useMemo(
    () =>
      (amount: number, sourceCurrency = priceLabelCurrency) =>
        sourceCurrency
          ? formatDisplayPrice({
              amount,
              sourceCurrency,
              displayCurrency: selectedCurrency,
              convertSourceEstimate: true,
              useFlightResultSymbols: true,
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



  useEffect(() => {
    if (!body?.departureDate) return;

    const departureDate = parseDateValue(body.departureDate);
    if (!departureDate) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset the window when the searched date changes.
    setNearbyFareVisibleStart(nearbyFareCenteredVisibleStart);
  }, [body?.departureDate]);

  const navigateNearbyFareWindow = useCallback(
    (direction: "previous" | "next") => {
      setNearbyFareVisibleStart((current) =>
        Math.max(
          0,
          Math.min(
            current + (direction === "previous" ? -1 : 1),
            nearbyFareRangeSize - nearbyFareVisibleCount,
          ),
        ),
      );
    },
    [],
  );

  const sortOptions = useMemo(
    () => [
      { value: "best" as SortMode, label: t("best") },
      { value: "cheapest" as SortMode, label: t("cheapest") },
      { value: "fastest" as SortMode, label: t("quickest") },
    ],
    [t],
  );
  const selectedSortLabel =
    sortOptions.find((option) => option.value === sortMode)?.label ??
    t("cheapest");

  const cheaperNearbyFare = useMemo(() => {
    const selectedFare = nearbyFares.find((fare) => fare.date === body?.departureDate && fare.status === "success");
    if (!selectedFare || selectedFare.status !== "success") return null;
    const selectedDisplay = formatDisplayPrice({ amount: selectedFare.amount, sourceCurrency: selectedFare.currency, displayCurrency: selectedCurrency, convertSourceEstimate: true, useFlightResultSymbols: true, rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback });
    const candidates = nearbyFares.flatMap((fare) => {
      if (fare.status !== "success" || fare.date === selectedFare.date) return [];
      const display = formatDisplayPrice({ amount: fare.amount, sourceCurrency: fare.currency, displayCurrency: selectedCurrency, convertSourceEstimate: true, useFlightResultSymbols: true, rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback });
      return display.amount < selectedDisplay.amount ? [{ date: fare.date, amount: display.amount }] : [];
    }).sort((first, second) => first.amount - second.amount);
    const cheapest = candidates[0];
    if (!cheapest) return null;
    const savings = formatDisplayPrice({ amount: selectedDisplay.amount - cheapest.amount, sourceCurrency: selectedCurrency, displayCurrency: selectedCurrency, convertSourceEstimate: false, useFlightResultSymbols: true, rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback }).formatted;
    return { date: cheapest.date, savings };
  }, [body?.departureDate, currencyRates.isFallback, currencyRates.rates, nearbyFares, selectedCurrency]);

  const handleNearbyFareDateSelect = useCallback(
    (date: string) => {
      if (guidedMode) return;
      if (!body || date === body.departureDate) return;

      const nextParams = new URLSearchParams(queryString);
      const currentDepartureDate = nextParams.get("departureDate") ?? body.departureDate;
      const currentReturnDate = nextParams.get("returnDate") ?? body.returnDate ?? "";
      nextParams.set("departureDate", date);

      if (nextParams.get("tripType") === "round-trip" && currentReturnDate) {
        const adjustedReturnDate = preserveRoundTripDuration(
          currentDepartureDate,
          currentReturnDate,
          date,
        );

        if (adjustedReturnDate) {
          nextParams.set("returnDate", adjustedReturnDate);
          setReturnDateInput(adjustedReturnDate);
        } else if (isDateValueBefore(currentReturnDate, date)) {
          nextParams.set("returnDate", date);
          setReturnDateInput(date);
        }
      }

      setDepartureDateInput(date);
      triggerFilterApplying();
      router.push(`/flights/results?${nextParams.toString()}`, {
        scroll: true,
      });
    },
    [body, guidedMode, queryString, router, triggerFilterApplying],
  );

  const stopOptions = useMemo(() => {
    const buckets = new Map<
      string,
      { count: number; minPrice: number }
    >();

    results.forEach((flight) => {
      const bucket = flightStopBucket(flight);
      const current = buckets.get(bucket) ?? {
        count: 0,
        minPrice: Number.POSITIVE_INFINITY,
      };
      const comparablePrice = getComparableFlightPrice(flight, selectedCurrency, currencyRates.rates);

      buckets.set(bucket, {
        count: current.count + 1,
        minPrice:
          comparablePrice && comparablePrice.amount > 0
            ? Math.min(current.minPrice, comparablePrice.amount)
            : current.minPrice,
      });
    });

    return Array.from(buckets, ([value, data]) => ({
      value,
      label: stopLabel(value, t),
      count: data.count,
      secondaryLabel: formatOptionsFound(data.count, t),
      rightLabel: Number.isFinite(data.minPrice)
        ? formatResultPriceLabel(data.minPrice, selectedCurrency)
        : undefined,
    })).sort(
      (first, second) =>
        stopBucketSortValue(first.value) - stopBucketSortValue(second.value),
    );
  }, [currencyRates.rates, formatResultPriceLabel, results, selectedCurrency, t]);

  const airlineOptions = useMemo(() => {
    const counts = new Map<string, number>();

    results.forEach((flight) => {
      const airlineName = flight.airlineName.trim();

      if (!airlineName) return;

      counts.set(airlineName, (counts.get(airlineName) ?? 0) + 1);
    });

    return Array.from(counts, ([value, count]) => ({
      value,
      label: value,
      count,
    }))
      .sort((first, second) => {
        if (second.count !== first.count) return second.count - first.count;

        return first.label.localeCompare(second.label);
      })
      .slice(0, 8);
  }, [results]);

  const mobileAirlineOptions = useMemo(() => {
    const counts = new Map<string, number>();
    results.forEach((flight) => {
      const name = flight.airlineName.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return Array.from(counts, ([value, count]) => ({ value, label: value, count }))
      .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
  }, [results]);

  const mobileFromAirportOptions = useMemo(
    () => buildCountOptions(results.flatMap((flight) => flightAirportEndpoints(flight).fromAirports)),
    [results],
  );
  const mobileToAirportOptions = useMemo(
    () => buildCountOptions(results.flatMap((flight) => flightAirportEndpoints(flight).toAirports)),
    [results],
  );

  useEffect(() => {
    if (guidedMode) {
      preferredAirlineDefaultResolvedRef.current = true;
      return;
    }
    if (sessionStatus === "loading") return;

    if (sessionStatus !== "authenticated") {
      preferredAirlineDefaultResolvedRef.current = true;
      return;
    }

    if (travelPreferencesRequestedRef.current) return;
    travelPreferencesRequestedRef.current = true;

    const controller = new AbortController();

    const loadPreferredAirlineDefaults = async () => {
      try {
        const response = await fetch("/api/account/travel-preferences", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload =
          (await response.json()) as TravelPreferencesAirlinePayload;
        setPreferredAirlineDefaults(
          Array.isArray(payload.preferences?.preferredAirlines)
            ? payload.preferences.preferredAirlines
            : [],
        );
      } catch {
        // Flight results keep today's behavior if travel preferences are unavailable.
      } finally {
        if (!controller.signal.aborted) {
          preferredAirlineDefaultResolvedRef.current = true;
        }
      }
    };

    void loadPreferredAirlineDefaults();

    return () => controller.abort();
  }, [guidedMode, sessionStatus]);

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

  const renderFlightQualityFilter = shouldRenderFlightQualityFilter({
    loading,
    optionCount: flightQualityOptions.length,
  });

  const priceBounds = useMemo(() => {
    return getComparableFlightPriceBounds(results, selectedCurrency, currencyRates.rates);
  }, [currencyRates.rates, results, selectedCurrency]);

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
      .map(flightJourneyDurationMinutes)
      .filter((duration): duration is number => duration !== null && duration > 0);

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
    if (
      !currentFlightSearchKey ||
      activeFlightSearchKeyRef.current !== currentFlightSearchKey
    ) {
      return;
    }

    if (lastWrittenFilterQueryStringRef.current === queryString) {
      lastWrittenFilterQueryStringRef.current = null;
      hydratedFilterQueryStringRef.current = queryString;
      filtersHydratedFromUrlRef.current = true;
      setFiltersReadySearchKey(currentFlightSearchKey);
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
      renderFlightQualityFilter
        ? flightQualityOptions.map((option) => option.value)
        : [],
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
    const allowedFromAirports = new Set(mobileFromAirportOptions.map((option) => option.value));
    const allowedToAirports = new Set(mobileToAirportOptions.map((option) => option.value));
    const nextSelectedFromAirports = readFilterList(
      filterParams,
      "fFromAirport",
      allowedFromAirports,
    );
    const nextSelectedToAirports = readFilterList(
      filterParams,
      "fToAirport",
      allowedToAirports,
    );
    // Keep legacy/desktop fAirport as an undirected endpoint restriction.
    // Directional mobile filters use only fFromAirport / fToAirport.
    const nextSelectedFlightQuality = readFilterList(
      filterParams,
      "fQuality",
      allowedQuality,
    );
    const nextBaggageIncludedOnly = filterParams.get("fBaggage") === "1";
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
    setSelectedFromAirports((current) =>
      areStringArraysEqual(current, nextSelectedFromAirports)
        ? current
        : nextSelectedFromAirports,
    );
    setSelectedToAirports((current) =>
      areStringArraysEqual(current, nextSelectedToAirports)
        ? current
        : nextSelectedToAirports,
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
    setFiltersReadySearchKey(currentFlightSearchKey);
  }, [
    airlineOptions,
    airportOptions,
    mobileFromAirportOptions,
    mobileToAirportOptions,
    durationBounds?.max,
    durationBounds?.min,
    flightQualityOptions,
    currentFlightSearchKey,
    loading,
    renderFlightQualityFilter,
    priceBounds.max,
    priceBounds.min,
    queryString,
    stopOptions,
    timeBounds.landing?.max,
    timeBounds.landing?.min,
    timeBounds.takeoff?.max,
    timeBounds.takeoff?.min,
  ]);

  const resultsUiPreparing = isFlightResultsPreparing({
    loading,
    error,
    currentSearchKey: currentFlightSearchKey,
    filtersReadySearchKey,
  }) || (!guidedMode && kayak?.vertical === "flights" && kayak.status === "loading");

  useEffect(() => {
    if (!resultsUiPreparing || !isStickySearchPanelOpen) return;

    pendingStickySearchTargetRef.current = null;
    collapseStickySearch({ restoreScroll: false });
  }, [collapseStickySearch, isStickySearchPanelOpen, resultsUiPreparing]);

  useEffect(() => {
    if (
      loading ||
      sessionStatus !== "authenticated" ||
      preferredAirlineDefaultAppliedRef.current ||
      !preferredAirlineDefaultResolvedRef.current ||
      !filtersHydratedFromUrlRef.current ||
      hydratedFilterQueryStringRef.current !== queryString
    ) {
      return;
    }

    preferredAirlineDefaultAppliedRef.current = true;

    if (hasAirlineFilterSearchParam(new URLSearchParams(queryString))) return;
    if (selectedAirlines.length > 0) return;

    const nextSelectedAirlines = normalizePreferredAirlineFilterValues(
      preferredAirlineDefaults,
      airlineOptions.map((option) => option.value),
    );
    if (nextSelectedAirlines.length === 0) return;

    const applyPreferredAirlinesId = window.setTimeout(() => {
      setSelectedAirlines(nextSelectedAirlines);
    }, 0);

    return () => window.clearTimeout(applyPreferredAirlinesId);
  }, [
    airlineOptions,
    loading,
    preferredAirlineDefaults,
    queryString,
    selectedAirlines.length,
    sessionStatus,
  ]);

  useEffect(() => {
    if (guidedMode) return;
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
    appendFilterList(nextParams, "fFromAirport", selectedFromAirports);
    appendFilterList(nextParams, "fToAirport", selectedToAirports);
    if (renderFlightQualityFilter) {
      appendFilterList(nextParams, "fQuality", selectedFlightQuality);
    }

    if (baggageIncludedOnly) {
      nextParams.set("fBaggage", "1");
    }

    if (flexibleOnly) {
      nextParams.set("fFlexible", "1");
    }

    if (nextParams.toString() === currentParams.toString()) return;

    const nextQuery = nextParams.toString();
    lastWrittenFilterQueryStringRef.current = nextQuery;
    router.replace(nextQuery ? `/flights/results?${nextQuery}` : "/flights", {
      scroll: false,
    });
  }, [
    baggageIncludedOnly,
    durationBounds,
    flexibleOnly,
    guidedMode,
    loading,
    maxDurationMinutes,
    maxLandingMinutes,
    maxPrice,
    maxTakeoffMinutes,
    priceBounds.max,
    queryString,
    renderFlightQualityFilter,
    router,
    selectedAirlines,
    selectedAirports,
    selectedFromAirports,
    selectedToAirports,
    selectedFlightQuality,
    selectedStops,
    timeBounds.landing,
    timeBounds.takeoff,
  ]);

  const authoritativeFilterState = useMemo<FlightFilterState>(() => ({
    maximumPrice: priceBounds.max > 0 && maxPrice > 0 && maxPrice < priceBounds.max ? maxPrice : null,
    maximumTakeoff: timeBounds.takeoff && maxTakeoffMinutes !== null && maxTakeoffMinutes < timeBounds.takeoff.max ? maxTakeoffMinutes : null,
    maximumLanding: timeBounds.landing && maxLandingMinutes !== null && maxLandingMinutes < timeBounds.landing.max ? maxLandingMinutes : null,
    maximumDuration: durationBounds && maxDurationMinutes !== null && maxDurationMinutes < durationBounds.max ? maxDurationMinutes : null,
    stops: selectedStops,
    airlines: selectedAirlines,
    airports: selectedAirports,
    fromAirports: selectedFromAirports,
    toAirports: selectedToAirports,
    journeyTimeMaximums: mobileJourneyTimeMaximums,
    baggageIncluded: baggageIncludedOnly,
    flexible: flexibleOnly,
    quality: renderFlightQualityFilter ? selectedFlightQuality : [],
  }), [
    baggageIncludedOnly,
    durationBounds,
    flexibleOnly,
    maxDurationMinutes,
    maxLandingMinutes,
    maxPrice,
    maxTakeoffMinutes,
    mobileJourneyTimeMaximums,
    priceBounds.max,
    renderFlightQualityFilter,
    selectedAirlines,
    selectedAirports,
    selectedFromAirports,
    selectedToAirports,
    selectedFlightQuality,
    selectedStops,
    timeBounds.landing,
    timeBounds.takeoff,
  ]);
  const activeFilterCount = useMemo(
    () => countAuthoritativeFlightFilters(authoritativeFilterState),
    [authoritativeFilterState],
  );

  const activeFilterLabel = t("activeFilterCount").replace(
    "{{count}}",
    String(activeFilterCount),
  );
  const flightResultsTopRef = useRef<HTMLDivElement | null>(null);

  const renderDesktopFlightFilters = () => (
    <DesktopFlightFilters
      idPrefix="desktop-flight-filter-primary"
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
      renderFlightQualityFilter={renderFlightQualityFilter}
      selectedFlightQuality={selectedFlightQuality}
      setSelectedFlightQuality={setSelectedFlightQuality}
      baggageIncludedOnly={baggageIncludedOnly}
      setBaggageIncludedOnly={setBaggageIncludedOnly}
      flexibleOnly={flexibleOnly}
      setFlexibleOnly={setFlexibleOnly}
      onFilterChange={triggerFilterApplying}
      onFilterCommit={handleUserFilterCommit}
      onClear={clearFlightFilters}
      originCode={originCode}
      destinationCode={destinationCode}
    />
  );
  const scrollToFlightResultsTop = useCallback(() => {
    if (typeof window === "undefined") return;

    const target = flightResultsTopRef.current;
    if (!target) return;

    const stickyClearance = desktopFlightResultsScrollOffset;
    const top =
      target.getBoundingClientRect().top + window.scrollY - stickyClearance;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, []);

  const handleUserFilterCommit = useCallback(() => {
    setGuidedResultsPage(1);
    if (!guidedMode) {
      setStandaloneResultsPage(1);
      const nextParams = new URLSearchParams(urlParams.toString());
      nextParams.delete("page");
      window.history.replaceState(
        window.history.state,
        "",
        `/flights/results?${nextParams.toString()}`,
      );
    }
    triggerFilterApplying();
    scrollToFlightResultsTop();
  }, [guidedMode, scrollToFlightResultsTop, triggerFilterApplying, urlParams]);

  const clearFlightFilters = () => {
    handleUserFilterCommit();
    setMaxPrice(priceBounds.max);
    setMaxTakeoffMinutes(timeBounds.takeoff?.max ?? null);
    setMaxLandingMinutes(timeBounds.landing?.max ?? null);
    setMaxDurationMinutes(durationBounds?.max ?? null);
    setSelectedStops([]);
    setSelectedAirlines([]);
    setSelectedAirports([]);
    setSelectedFromAirports([]);
    setSelectedToAirports([]);
    setSelectedFlightQuality([]);
    setBaggageIncludedOnly(false);
    setFlexibleOnly(false);
    setMobileJourneyTimeMaximums({});
  };

  const flightMatchContext = useMemo(() => ({
    priceValue: (flight: PublicFlightResult) => getComparableFlightPrice(
      flight,
      selectedCurrency,
      currencyRates.rates,
    )?.amount ?? null,
    qualityMatches: flightHasQualityOption,
  }), [currencyRates.rates, selectedCurrency]);
  const filtered = useMemo(
    () => results.filter((flight) => flightMatchesFilters(flight, authoritativeFilterState, flightMatchContext)),
    [authoritativeFilterState, flightMatchContext, results],
  );

  const sortedResults = useMemo(() => {
    const nextResults = [...filtered];

    nextResults.sort((first, second) => {
      if (sortMode === "cheapest") {
        return compareFlightPrices(first, second, selectedCurrency, currencyRates.rates);
      }

      if (sortMode === "fastest") {
        return (flightJourneyDurationMinutes(first) ?? Number.POSITIVE_INFINITY) -
          (flightJourneyDurationMinutes(second) ?? Number.POSITIVE_INFINITY);
      }

      if (sortMode === "stops") {
        return first.stops - second.stops || compareFlightPrices(first, second, selectedCurrency, currencyRates.rates);
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

      return secondBestScore - firstBestScore || compareFlightPrices(first, second, selectedCurrency, currencyRates.rates);
    });

    return nextResults;
  }, [currencyRates.rates, filtered, selectedCurrency, sortMode]);

  const totalResultPages = getFlightResultsPageCount(sortedResults.length);
  const requestedResultsPage = guidedMode
    ? guidedResultsPage
    : standaloneResultsPage;
  const validResultsPage = clampFlightResultsPage(requestedResultsPage, totalResultPages);
  const visibleResults = useMemo(
    () => paginateFlightResults(sortedResults, validResultsPage),
    [sortedResults, validResultsPage],
  );
  const resultsDisplayRange = getResultsDisplayRange({
    currentPage: validResultsPage,
    pageSize: FLIGHT_RESULTS_PAGE_SIZE,
    totalResults: sortedResults.length,
  });

  const toggleStickyFlightPopularFilter = useCallback(
    (
      group: "stops" | "airlines" | "airports" | "quality",
      value: string,
    ) => {
      const toggle = (
        setter: Dispatch<SetStateAction<string[]>>,
      ) =>
        setter((current) =>
          current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value],
        );

      if (group === "stops") toggle(setSelectedStops);
      else if (group === "airlines") toggle(setSelectedAirlines);
      else if (group === "airports") toggle(setSelectedAirports);
      else toggle(setSelectedFlightQuality);

      handleUserFilterCommit();
    },
    [handleUserFilterCommit],
  );

  useEffect(() => {
    if (guidedMode) return;
    const pageFromUrl = Math.max(1, Number(urlParams.get("page")) || 1);
    const syncPageFromExternalUrl = () => setStandaloneResultsPage(pageFromUrl);
    const frame = window.requestAnimationFrame(syncPageFromExternalUrl);
    return () => window.cancelAnimationFrame(frame);
  }, [guidedMode, urlParams]);

  const alignSelectedMobileFare = useCallback((forceVisibilityCheck = false) => {
    if (!body?.departureDate) return false;
    const alignmentIdentity = `${buildFlightResultsSearchKey(body)}:${body.departureDate}`;
    if (!forceVisibilityCheck && alignedMobileNearbyFareSearchRef.current === alignmentIdentity) return true;

    const rail = mobileNearbyFareRailRef.current;
    const selectedCell = mobileSelectedNearbyFareRef.current;
    if (!rail || !selectedCell?.isConnected || rail.clientWidth <= 0 || rail.scrollWidth <= 0 || selectedCell.offsetWidth <= 0) return false;

    const railRect = rail.getBoundingClientRect();
    const selectedRect = selectedCell.getBoundingClientRect();
    if (forceVisibilityCheck && isHorizontallyVisibleWithinContainer(selectedRect, railRect)) {
      alignedMobileNearbyFareSearchRef.current = alignmentIdentity;
      return true;
    }
    const selectedLeftWithinRail = selectedRect.left - railRect.left + rail.scrollLeft;
    rail.scrollTo({
      left: getCenteredRailScrollLeft({
        selectedLeftWithinRail,
        selectedWidth: selectedCell.offsetWidth,
        railWidth: rail.clientWidth,
        scrollWidth: rail.scrollWidth,
      }),
      behavior: "auto",
    });
    alignedMobileNearbyFareSearchRef.current = alignmentIdentity;
    return true;
  }, [body]);

  useLayoutEffect(() => {
    if (!body?.departureDate || nearbyFares.length === 0) return;
    let frame: number | null = null;
    let attemptsRemaining = 6;
    const attemptAlignment = () => {
      if (alignSelectedMobileFare()) return;
      if (attemptsRemaining <= 0) return;
      attemptsRemaining -= 1;
      frame = window.requestAnimationFrame(attemptAlignment);
    };
    attemptAlignment();
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [alignSelectedMobileFare, body?.departureDate, nearbyFares]);

  useEffect(() => {
    if (!body?.departureDate || nearbyFares.length === 0) return;
    let frame: number | null = null;
    const refreshAlignment = () => {
      if (document.visibilityState === "hidden") return;
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = null;
        alignSelectedMobileFare(true);
      });
    };
    const handleVisibilityChange = () => refreshAlignment();
    const rail = mobileNearbyFareRailRef.current;
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(refreshAlignment);
    if (rail) observer?.observe(rail);
    window.addEventListener("pageshow", refreshAlignment);
    window.addEventListener("resize", refreshAlignment);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("pageshow", refreshAlignment);
      window.removeEventListener("resize", refreshAlignment);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [alignSelectedMobileFare, body?.departureDate, nearbyFares.length]);

  const changeResultsPage = useCallback(async (nextPage: number) => {
    const page = clampFlightResultsPage(nextPage, totalResultPages);
    if (page === validResultsPage || paginationPendingPage !== null) return;
    setPaginationMinHeight(paginationListRef.current?.getBoundingClientRect().height ?? null);
    setPaginationPendingPage(page);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const mobileViewport = window.matchMedia("(max-width: 639px)").matches;
    const target = mobileViewport
      ? mobileResultsPageTopRef.current
      : flightResultsTopRef.current;
    const topOffset = mobileViewport
      ? (document.querySelector<HTMLElement>("[data-app-header]")?.getBoundingClientRect().height ?? 72) + 4
      : desktopFlightResultsScrollOffset;
    const top = target
      ? target.getBoundingClientRect().top + window.scrollY - topOffset
      : 0;
    await scrollToResultsAndWait({ top });
    setPaginationCommitting(true);
    if (guidedMode) {
      setGuidedResultsPage(page);
    } else {
      setStandaloneResultsPage(page);
      const nextParams = new URLSearchParams(urlParams.toString());
      if (page === 1) nextParams.delete("page");
      else nextParams.set("page", String(page));
      window.history.replaceState(
        window.history.state,
        "",
        `/flights/results?${nextParams.toString()}`,
      );
    }
  }, [guidedMode, paginationPendingPage, totalResultPages, urlParams, validResultsPage]);

  useEffect(() => {
    if (!paginationCommitting || paginationPendingPage !== validResultsPage) return;
    let secondFrame: number | null = null;
    const frame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        setPaginationPendingPage(null);
        setPaginationCommitting(false);
        setPaginationMinHeight(null);
        resultsHeadingRef.current?.focus({ preventScroll: true });
        if (!prefersReducedResultsMotion()) {
          setPaginationRevealing(true);
          window.setTimeout(
            () => setPaginationRevealing(false),
            PAGINATION_REVEAL_MS,
          );
        }
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
    };
  }, [paginationCommitting, paginationPendingPage, validResultsPage]);


  useEffect(() => {
    if (resultsUiPreparing || !userInitiatedRetryRef.current) return;

    const focusTimer = window.setTimeout(() => {
      if (error) {
        errorHeadingRef.current?.focus({ preventScroll: true });
      } else if (sortedResults.length > 0) {
        resultsHeadingRef.current?.focus({ preventScroll: true });
      } else {
        emptyHeadingRef.current?.focus({ preventScroll: true });
      }
      userInitiatedRetryRef.current = false;
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [error, resultsUiPreparing, sortedResults.length]);

  const sortSummaries = useMemo(() => {
    if (!filtered.length) {
      return {
        cheapest: null,
        best: null,
        fastest: null,
      };
    }

    const cheapest = [...filtered].sort((a, b) =>
      compareFlightPrices(a, b, selectedCurrency, currencyRates.rates)
    )[0];
    const fastest = filtered.filter(flight => Number.isFinite(flight.durationMinutes)).sort(
      (a, b) => a.durationMinutes - b.durationMinutes,
    )[0];
    const best = [...filtered].sort((a, b) => {
      const aScore =
        a.valueScore + a.travelConfidenceScore + a.comfortScore - a.riskScore;
      const bScore =
        b.valueScore + b.travelConfidenceScore + b.comfortScore - b.riskScore;

      return bScore - aScore || compareFlightPrices(a, b, selectedCurrency, currencyRates.rates);
    })[0];

    return {
      cheapest,
      best,
      fastest,
    };
  }, [currencyRates.rates, filtered, selectedCurrency]);

  const resultBadgeByFlightId = useMemo(() => {
    const badges = new Map<string, "best" | "fastest" | "cheapest">();

    if (sortSummaries.cheapest) {
      badges.set(sortSummaries.cheapest.id, "cheapest");
    }

    if (sortSummaries.fastest) {
      badges.set(sortSummaries.fastest.id, "fastest");
    }

    if (sortSummaries.best) {
      badges.set(sortSummaries.best.id, "best");
    }

    return badges;
  }, [sortSummaries]);

  if (!body) {
    return (
      <main className="flex-1 bg-[#F3F6FA] pb-8 pt-4 sm:pt-8 lg:bg-white lg:pt-8">
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
              const nextOrigin =
                originCode ||
                originInput.trim() ||
                String(formData.get("origin") || "");
              const nextDestination =
                destinationCode ||
                destinationInput.trim() ||
                String(formData.get("destination") || "");
              const travelers = adultCount + childCount + infantCount;
              const nextParams = new URLSearchParams({
                tripType: tripTypeInput,
                origin: nextOrigin,
                destination: nextDestination,
                departureDate: nextDepartureDate,
                adults: String(adultCount),
                children: String(childCount),
                infants: String(infantCount),
                travelers: String(travelers),
                cabinClass: cabinClassInput,
              });

              if (tripTypeInput === "round-trip" && nextReturnDate) {
                nextParams.set("returnDate", nextReturnDate);
              }

              try {
                const recentSearch = buildFlightRecentSearch({
                  tripType:
                    tripTypeInput === "one-way" ? "one-way" : "round-trip",
                  origin: nextOrigin,
                  destination: nextDestination,
                  departureDate: nextDepartureDate,
                  returnDate:
                    tripTypeInput === "round-trip" ? nextReturnDate : undefined,
                  adults: adultCount,
                  children: childCount,
                  infants: infantCount,
                  travelers,
                  cabinClass: cabinClassInput,
                });
                if (sessionStatus === "authenticated") {
                  void syncBackendRecentSearch(recentSearch);
                } else {
                  upsertRecentSearch(recentSearch);
                }
              } catch {
                // best effort only
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
                  {tripTypeInput === "multi-city" ? t("multiCity") : tripTypeInput === "one-way" ? t("oneWay") : t("roundTrip")}
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
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => handleTripTypeChange("multi-city")}
                      className="focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-start text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      {t("multiCity")}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {tripTypeInput === "multi-city" ? (
              <button
                type="button"
                onClick={() => router.push(`/flights?${searchQueryString}`)}
                className="focus-ring min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#004BB8] shadow-sm hover:bg-blue-50"
              >
                {t("editFlightSearch")} · {t("multiCity")}
              </button>
            ) : null}
            <div className={cn("overflow-visible rounded-[1.65rem] border border-white/70 bg-white/90 p-2.5 shadow-[0_18px_44px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/[0.03] backdrop-blur sm:rounded-none sm:border-slate-200 sm:bg-white sm:p-1.5 sm:shadow-none sm:ring-0 lg:p-1", tripTypeInput === "multi-city" && "hidden")}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-1.5 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_116px] lg:gap-0">
                <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_34px_minmax(0,1fr)] items-stretch rounded-[1.35rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-3 py-1.5 shadow-sm transition-colors hover:border-slate-300 focus-within:border-[#004BB8] focus-within:ring-2 focus-within:ring-[#004BB8]/25 sm:grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] sm:rounded-xl sm:border-slate-300 sm:bg-white sm:px-3 sm:py-1.5 sm:shadow-none sm:hover:border-slate-400 sm:focus-within:ring-[#004BB8]/25 lg:col-span-1 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                  <div
                    className="relative min-h-[48px] px-0 py-0 pe-2 sm:min-h-[54px]"
                    ref={originWrapRef}
                  >
                    <label
                      className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] leading-4 text-slate-500 sm:mb-1.5 sm:text-[11px] sm:font-bold sm:tracking-[0.12em] sm:text-slate-500"
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
                      className="focus-ring h-7 w-full rounded-md border-0 bg-transparent px-0 pe-8 text-[16px] font-semibold text-slate-950 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 sm:h-8 sm:font-medium md:text-sm"
                    />

                    {activeSuggest === "origin" && dropdownPosition ? (
                      <SuggestionList
                        id="flight-airport-suggestions"
                        position={dropdownPosition}
                        suggestions={resolvedOriginSuggestions}
                        locale={locale}
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
                      className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#004BB8]/10 bg-[#004BB8]/8 text-[#004BB8] shadow-sm transition-colors hover:border-[#004BB8]/25 hover:bg-[#004BB8]/10 hover:text-[#021C2B] focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 sm:border-slate-300 sm:bg-white sm:text-slate-600 sm:shadow-none sm:hover:border-slate-400 sm:hover:bg-slate-50 sm:hover:text-slate-900"
                    >
                      <ArrowRightLeft size={14} />
                    </button>
                  </div>

                  <div
                    className="relative min-h-[48px] px-0 py-0 ps-2 sm:min-h-[54px]"
                    ref={destinationWrapRef}
                  >
                    <label
                      className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] leading-4 text-slate-500 sm:mb-1.5 sm:text-[11px] sm:font-bold sm:tracking-[0.12em] sm:text-slate-500"
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
                      className="focus-ring h-7 w-full rounded-md border-0 bg-transparent px-0 pe-8 text-[16px] font-semibold text-slate-950 outline-none transition-colors placeholder:font-medium placeholder:text-slate-400 sm:h-8 sm:font-medium md:text-sm"
                    />

                    {activeSuggest === "destination" && dropdownPosition ? (
                      <SuggestionList
                        id="flight-airport-suggestions"
                        position={dropdownPosition}
                        suggestions={resolvedDestinationSuggestions}
                        locale={locale}
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
                  className="relative min-h-[50px] rounded-[1.25rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-3 py-1.5 shadow-sm transition-colors hover:border-slate-300 focus-within:border-[#004BB8] focus-within:ring-2 focus-within:ring-[#004BB8]/25 sm:min-h-[54px] sm:rounded-xl sm:border-slate-300 sm:bg-white sm:shadow-none sm:hover:border-slate-400 sm:focus-within:ring-[#004BB8]/25 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
                  ref={departureWrapRef}
                >
                  <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] leading-4 text-slate-500 sm:mb-1.5 sm:text-[11px] sm:font-bold sm:tracking-[0.12em] sm:text-slate-500">
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
                  className="relative min-h-[50px] rounded-[1.25rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 px-3 py-1.5 shadow-sm transition-colors hover:border-slate-300 focus-within:border-[#004BB8] focus-within:ring-2 focus-within:ring-[#004BB8]/25 sm:min-h-[54px] sm:rounded-xl sm:border-slate-300 sm:bg-white sm:shadow-none sm:hover:border-slate-400 sm:focus-within:ring-[#004BB8]/25 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0"
                  ref={travelerCabinWrapRef}
                >
                  <label className="mb-0.5 block text-[10px] font-bold uppercase tracking-[0.16em] leading-4 text-slate-500 sm:mb-1.5 sm:text-[11px] sm:font-bold sm:tracking-[0.12em] sm:text-slate-500">
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
                        "h-4 w-4 shrink-0 text-[#071A48] transition-transform",
                        travelerPopoverOpen && "rotate-180",
                      )}
                    />
                  </button>
                </div>
                <div className="col-span-2 lg:col-span-1 lg:min-h-[54px] lg:self-stretch">
                  <Button
                    type="submit"
                    className="h-[50px] w-full rounded-[1.25rem] bg-[#004BB8] px-4 text-sm font-bold text-white shadow-[0_14px_28px_rgba(2,28,43,0.14)] transition hover:bg-[#021C2B] hover:shadow-[0_16px_30px_rgba(0,75,184,0.22)] active:scale-[0.99] active:bg-[#021C2B] sm:h-12 sm:rounded-xl sm:shadow-[0_12px_24px_rgba(0,75,184,0.18)] lg:h-full lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:border lg:border-s-0 lg:border-[#004BB8]/20"
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
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#064CF7]">
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
                      className="group w-full overflow-hidden rounded-[1.25rem] border border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-[#004BB8]/25 hover:shadow-[0_14px_30px_rgba(15,23,42,0.085)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2"
                    >
                      <article className="flex h-full flex-col">
                        <div className="relative h-36 overflow-hidden bg-slate-100 sm:h-32 lg:h-44">
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
                            {translateHomeDiscoveryCity(
                              dictionary,
                              item.destinationCity,
                            )}
                          </h3>
                          <p className="mt-1 line-clamp-1 text-sm font-medium leading-5 text-slate-600">
                            {formatHomeDiscoveryRoute(
                              dictionary,
                              translateHomeDiscoveryCity(
                                dictionary,
                                item.originCity,
                              ),
                              translateHomeDiscoveryCity(
                                dictionary,
                                item.destinationCity,
                              ),
                            )}
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
                          className="group rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-[0_8px_22px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#004BB8]/25 hover:shadow-[0_14px_28px_rgba(15,23,42,0.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2 sm:p-3"
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
                                {formatHomeDiscoveryRoute(
                                  dictionary,
                                  translateHomeDiscoveryCity(
                                    dictionary,
                                    item.originCity,
                                  ),
                                  translateHomeDiscoveryCity(
                                    dictionary,
                                    item.destinationCity,
                                  ),
                                )}
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
                          className="group w-[10rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-[#004BB8]/25 hover:shadow-[0_14px_30px_rgba(15,23,42,0.085)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2 sm:w-auto"
                        >
                          <article className="flex h-full flex-col">
                            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#004BB8]/8 sm:aspect-auto sm:h-24 lg:h-[7.5rem]">
                              <Image
                                src={beachVisual.image}
                                alt={getBeachVacationVisualAlt(
                                  item,
                                  beachVisual,
                                  t,
                                )}
                                fill
                                priority={false}
                                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 10rem"
                                className="object-cover brightness-[1.05] saturate-[1.12] transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
                              />
                            </div>
                            <div className="bg-white px-3 py-2.5">
                              <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 sm:line-clamp-1">
                                {translateHomeDiscoveryCity(
                                  dictionary,
                                  item.destinationCity,
                                )}
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

  function renderDesktopHeaderSearchBar() {
    const getCompactCityLabel = (
      code: string,
      input: string,
      fallback: string,
    ) => {
      const normalizedCode = (code || input).trim().toUpperCase();
      const matchedAirport = [
        ...airports,
        ...originSuggestions,
        ...destinationSuggestions,
      ].find((airport) => airport.code.toUpperCase() === normalizedCode);

      if (matchedAirport) {
        return getLocalizedCityName(matchedAirport.city, locale);
      }

      return input.trim() || code.trim() || fallback;
    };
    const firstMultiCityLeg = multiCityLegs[0];
    const compactOriginLabel =
      tripTypeInput === "multi-city" && firstMultiCityLeg
        ? getCompactCityLabel("", firstMultiCityLeg.origin, mobileOriginSummary)
        : getCompactCityLabel(originCode, originInput, t("origin"));
    const compactDestinationLabel =
      tripTypeInput === "multi-city" && firstMultiCityLeg
        ? getCompactCityLabel(
            "",
            firstMultiCityLeg.destination,
            mobileDestinationSummary,
          )
        : getCompactCityLabel(
            destinationCode,
            destinationInput,
            t("destination"),
          );
    const compactDepartureDate =
      tripTypeInput === "multi-city" && firstMultiCityLeg
        ? firstMultiCityLeg.departureDate
        : departureDateInput;
    const departureSummary = compactDepartureDate
      ? formatDesktopHeaderDateLabel(compactDepartureDate, calendarLocale)
      : t("departure");
    const dateSummary =
      tripTypeInput === "round-trip"
        ? compactDepartureDate && returnDateInput
          ? `${formatDesktopHeaderDateLabel(compactDepartureDate, calendarLocale)} – ${formatDesktopHeaderDateLabel(returnDateInput, calendarLocale)}`
          : departureSummary
        : departureSummary;
    const tripTypeOptions = [
      { label: t("roundTrip"), value: "round-trip" },
      { label: t("oneWay"), value: "one-way" },
      { label: t("multiCity"), value: "multi-city" },
    ];
    const fieldClass =
      "focus-ring flex h-[40px] min-w-0 items-center rounded-[8px] border border-[#D8E1EC] bg-[#F8FAFC] px-2.5 text-start text-[#142033] transition-colors hover:border-[#C4CFDC] hover:bg-[#F3F6FA]";
    const selectorClass = cn(fieldClass, "w-full justify-start gap-1 px-2");
    const valueClass =
      "min-w-0 truncate text-[12px] font-semibold leading-[17px] text-[#142033]";
    const headerGridClass =
      tripTypeInput === "round-trip"
        ? "max-w-[588px] grid-cols-[96px_minmax(0,1fr)_minmax(138px,150px)_50px_40px] xl:w-fit xl:max-w-none xl:grid-cols-[104px_270px_150px_56px_40px]"
        : "max-w-[554px] grid-cols-[96px_minmax(0,1fr)_104px_50px_40px] xl:w-fit xl:max-w-none xl:grid-cols-[104px_270px_104px_56px_40px]";
    const tripMenuOpen =
      isStickySearchPanelOpen &&
      activeStickySearchTarget === "trip" &&
      tripTypeMenuOpen;

    return (
      <form
        onSubmit={handleCompactSearchSubmit}
        data-flight-results-nav-search-form
        className={cn(
          "mx-auto grid h-[40px] w-full max-w-full items-center gap-1 overflow-visible",
          headerGridClass,
        )}
      >
        <div className="relative min-w-0">
          <button
            type="button"
            data-flight-results-header-trip
            aria-haspopup="listbox"
            aria-expanded={tripMenuOpen}
            aria-label={t("tripType")}
            onClick={(event) => {
              if (tripMenuOpen) {
                collapseStickySearch({ restoreScroll: false });
                return;
              }
              openStickySearchEditor(event.currentTarget, "trip");
              setTripTypeMenuOpen(true);
            }}
            className={selectorClass}
          >
            <span className={valueClass}>{mobileTripTypeSummary}</span>
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
          </button>

          {tripMenuOpen ? (
            <div
              role="listbox"
              aria-label={t("tripType")}
              className="pointer-events-auto absolute left-0 top-[calc(100%+0.5rem)] z-[140] min-w-[210px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[16px] border border-[#D8E1EC] bg-white p-2 shadow-[0_20px_48px_-20px_rgba(15,23,42,0.32)] ring-1 ring-slate-950/[0.025]"
            >
              {tripTypeOptions.map((option) => {
                const selected = tripTypeInput === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      "pointer-events-auto flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold leading-5 transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25",
                      selected
                        ? "bg-[#F0F6FF] text-[#004BB8] shadow-[inset_0_0_0_1px_rgba(0,75,184,0.06)]"
                        : "text-[#172033] hover:bg-[#F7F9FC] hover:text-[#07133B]",
                    )}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleTripTypeChange(option.value);
                      setTripTypeMenuOpen(false);
                      if (option.value === "multi-city") {
                        stickySearchPanelOpenRef.current = true;
                        setIsSearchExpandedWhileSticky(true);
                        setActiveStickySearchTarget("trip");
                        setActiveDesktopSearchSurface("sticky");
                        return;
                      }
                      collapseStickySearch({ restoreScroll: false });
                    }}
                  >
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      selected ? "bg-white text-[#004BB8] shadow-sm" : "text-transparent",
                    )}>
                      {selected ? (
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4"
                          strokeWidth={2.25}
                        />
                      ) : null}
                    </span>
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div
          data-flight-results-compact-route
          className="relative grid h-[40px] min-w-0 grid-cols-[minmax(56px,1fr)_36px_minmax(56px,1fr)] items-center overflow-visible rounded-[8px] border border-[#D8E1EC] bg-[#F8FAFC] transition-colors hover:border-[#C4CFDC] hover:bg-[#F3F6FA]"
        >
          <div
            ref={stickyOriginWrapRef}
            className="relative flex h-full min-w-0 items-center transition-colors focus-within:bg-[#F3F6FA]"
          >
            <input
              id="sticky-results-origin"
              data-flight-results-header-origin
              name="origin"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="sticky-flight-origin-suggestions"
              required
              value={
                isStickySearchPanelOpen &&
                activeStickySearchTarget === "origin"
                  ? originInput
                  : compactOriginLabel
              }
              aria-label={`${t("editFlightSearch")}: ${compactOriginLabel}`}
              aria-expanded={
                isStickySearchPanelOpen &&
                activeStickySearchTarget === "origin" &&
                activeSuggest === "origin"
              }
              onFocus={(event) => {
                const input = event.currentTarget;
                const enteringOrigin =
                  !isStickySearchPanelOpen ||
                  activeStickySearchTarget !== "origin";
                if (
                  originCode &&
                  originInput.trim().toUpperCase() ===
                    originCode.trim().toUpperCase()
                ) {
                  setOriginInput(compactOriginLabel);
                }
                openStickySearchEditor(input, "origin");
                if (enteringOrigin) {
                  window.requestAnimationFrame(() => {
                    input.select();
                  });
                }
              }}
              onClick={(event) => {
                if (
                  !isStickySearchPanelOpen ||
                  activeStickySearchTarget !== "origin"
                ) {
                  openStickySearchEditor(event.currentTarget, "origin");
                }
              }}
              onBlur={(event) => {
                const nextFocus = event.relatedTarget;
                if (
                  nextFocus instanceof Node &&
                  event.currentTarget.parentElement?.contains(nextFocus)
                ) {
                  return;
                }
                if (activeSuggest === "origin") {
                  setActiveSuggest(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" && activeSuggest === "origin") {
                  const firstSuggestion = document.querySelector<HTMLButtonElement>(
                    '#sticky-flight-origin-suggestions [role="option"]',
                  );
                  if (firstSuggestion) {
                    event.preventDefault();
                    firstSuggestion.focus();
                  }
                  return;
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.currentTarget.blur();
                  collapseStickySearch({ restoreScroll: false });
                }
              }}
              onChange={(event) => {
                setOriginInput(event.target.value);
                setOriginCode("");
                setActiveSuggest(
                  event.target.value.trim().length >= 2 ? "origin" : null,
                );
              }}
              placeholder={t("fromPlaceholder")}
              autoComplete="off"
              className={cn("flight-results-nav-route-input box-border h-full w-full min-w-0 border-0 bg-transparent pl-2 text-left outline-none placeholder:text-slate-400", isStickySearchPanelOpen && activeStickySearchTarget === "origin" && originInput.trim() ? "pr-7" : "pr-2")}
            />
            {isStickySearchPanelOpen &&
            activeStickySearchTarget === "origin" &&
            originInput.trim() ? (
              <button
                type="button"
                data-flight-results-header-origin-clear
                aria-label={t("clearOrigin")}
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
                  window.requestAnimationFrame(() => {
                    stickyOriginWrapRef.current
                      ?.querySelector<HTMLInputElement>("input")
                      ?.focus({ preventScroll: true });
                  });
                }}
                className="focus-ring absolute right-1 top-1/2 z-[2] inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            {isStickySearchPanelOpen &&
            activeStickySearchTarget === "origin" &&
            activeSuggest === "origin" &&
            activeDesktopSearchSurface === "sticky" ? (
              <SuggestionList
                id="sticky-flight-origin-suggestions"
                alignToField
                keyboardNavigation
                suggestions={resolvedOriginSuggestions}
                locale={locale}
                onSelect={(value) => {
                  markExpandedSearchInteraction();
                  setOriginInput(getCompactCityLabel(value, value, value));
                  setOriginCode(value);
                  setActiveSuggest(null);
                  setDropdownPosition(null);
                  window.requestAnimationFrame(() => {
                    stickyDestinationWrapRef.current
                      ?.querySelector<HTMLInputElement>("input")
                      ?.focus({ preventScroll: true });
                  });
                }}
              />
            ) : null}
          </div>

          <div data-flight-results-swap-slot className="flex h-full min-h-0 flex-col items-center">
            <span data-flight-results-swap-divider aria-hidden="true" className="pointer-events-none w-px flex-1 bg-[#D8E1EC]" />
            <button
              type="button"
              data-flight-results-header-swap
              aria-label={t("swapOriginDestination")}
              onClick={handleSwapLocations}
              className="focus-ring relative z-[1] inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#D8E1EC] bg-white text-[#142033] shadow-[0_2px_6px_rgba(15,23,42,0.12)] transition hover:bg-[#F3F6FA] hover:text-[#004BB8]"
            >
              <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span data-flight-results-swap-divider aria-hidden="true" className="pointer-events-none w-px flex-1 bg-[#D8E1EC]" />
          </div>

          <div
            ref={stickyDestinationWrapRef}
            className="relative flex h-full min-w-0 items-center transition-colors focus-within:bg-[#F3F6FA]"
          >
            <input
              id="sticky-results-destination"
              data-flight-results-header-destination
              name="destination"
              role="combobox"
              aria-autocomplete="list"
              aria-controls="sticky-flight-destination-suggestions"
              required
              value={
                isStickySearchPanelOpen &&
                activeStickySearchTarget === "destination"
                  ? destinationInput
                  : compactDestinationLabel
              }
              aria-label={`${t("editFlightSearch")}: ${compactDestinationLabel}`}
              aria-expanded={
                isStickySearchPanelOpen &&
                activeStickySearchTarget === "destination" &&
                activeSuggest === "destination"
              }
              onFocus={(event) => {
                const input = event.currentTarget;
                const enteringDestination =
                  !isStickySearchPanelOpen ||
                  activeStickySearchTarget !== "destination";
                if (
                  destinationCode &&
                  destinationInput.trim().toUpperCase() ===
                    destinationCode.trim().toUpperCase()
                ) {
                  setDestinationInput(compactDestinationLabel);
                }
                openStickySearchEditor(input, "destination");
                if (enteringDestination) {
                  window.requestAnimationFrame(() => {
                    input.select();
                  });
                }
              }}
              onClick={(event) => {
                if (
                  !isStickySearchPanelOpen ||
                  activeStickySearchTarget !== "destination"
                ) {
                  openStickySearchEditor(event.currentTarget, "destination");
                }
              }}
              onBlur={(event) => {
                const nextFocus = event.relatedTarget;
                if (
                  nextFocus instanceof Node &&
                  event.currentTarget.parentElement?.contains(nextFocus)
                ) {
                  return;
                }
                if (activeSuggest === "destination") {
                  setActiveSuggest(null);
                }
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "ArrowDown" &&
                  activeSuggest === "destination"
                ) {
                  const firstSuggestion = document.querySelector<HTMLButtonElement>(
                    '#sticky-flight-destination-suggestions [role="option"]',
                  );
                  if (firstSuggestion) {
                    event.preventDefault();
                    firstSuggestion.focus();
                  }
                  return;
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.currentTarget.blur();
                  collapseStickySearch({ restoreScroll: false });
                }
              }}
              onChange={(event) => {
                setDestinationInput(event.target.value);
                setDestinationCode("");
                setActiveSuggest(
                  event.target.value.trim().length >= 2
                    ? "destination"
                    : null,
                );
              }}
              placeholder={t("toPlaceholder")}
              autoComplete="off"
              className={cn("flight-results-nav-route-input box-border h-full w-full min-w-0 border-0 bg-transparent pl-2 text-left outline-none placeholder:text-slate-400", isStickySearchPanelOpen && activeStickySearchTarget === "destination" && destinationInput.trim() ? "pr-7" : "pr-2")}
            />
            {isStickySearchPanelOpen &&
            activeStickySearchTarget === "destination" &&
            destinationInput.trim() ? (
              <button
                type="button"
                data-flight-results-header-destination-clear
                aria-label={t("clearDestination")}
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
                  window.requestAnimationFrame(() => {
                    stickyDestinationWrapRef.current
                      ?.querySelector<HTMLInputElement>("input")
                      ?.focus({ preventScroll: true });
                  });
                }}
                className="focus-ring absolute right-1 top-1/2 z-[2] inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
            {isStickySearchPanelOpen &&
            activeStickySearchTarget === "destination" &&
            activeSuggest === "destination" &&
            activeDesktopSearchSurface === "sticky" ? (
              <SuggestionList
                id="sticky-flight-destination-suggestions"
                alignToField
                keyboardNavigation
                suggestions={resolvedDestinationSuggestions}
                locale={locale}
                onSelect={(value) => {
                  markExpandedSearchInteraction();
                  setDestinationInput(getCompactCityLabel(value, value, value));
                  setDestinationCode(value);
                  setActiveSuggest(null);
                  setDropdownPosition(null);
                  collapseStickySearch({ restoreScroll: false });
                }}
              />
            ) : null}
          </div>
        </div>

        <div className="relative min-w-0">
          <button
            ref={stickyDateButtonRef}
            type="button"
            data-flight-results-header-dates
            aria-haspopup="dialog"
            aria-expanded={
              isStickySearchPanelOpen &&
              activeStickySearchTarget === "dates" &&
              Boolean(activeDatePicker)
            }
            aria-label={`${t("editFlightSearch")}: ${dateSummary}`}
            onClick={(event) => openStickySearchEditor(event.currentTarget, "dates")}
            className={cn(fieldClass, "w-full justify-center px-1.5")}
          >
            <span className={valueClass}>{dateSummary}</span>
          </button>

          {isStickySearchPanelOpen &&
          activeStickySearchTarget === "dates" &&
          activeDatePicker &&
          activeDesktopSearchSurface === "sticky" ? (
            <DatePickerPopover
              prominentDesktop
              alignToField="left"
              launcherRef={stickyDateButtonRef}
              position={{ top: 0, left: 0, width: 0 }}
              onClose={() => {
                collapseStickySearch({ restoreScroll: false });
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
                } else {
                  setReturnDateInput("");
                }
              }}
              onToday={() => {
                collapseStickySearch({ restoreScroll: false });
              }}
            />
          ) : null}
        </div>

        <div className="relative min-w-0">
          <button
            ref={stickyTravelerButtonRef}
            type="button"
            data-flight-results-header-travelers
            aria-haspopup="dialog"
            aria-expanded={
              isStickySearchPanelOpen &&
              activeStickySearchTarget === "travelers" &&
              travelerPopoverOpen
            }
            aria-label={`${t("editFlightSearch")}: ${travelerCabinSummary}`}
            onClick={(event) => openStickySearchEditor(event.currentTarget, "travelers")}
            className={cn(selectorClass, "gap-0.5 px-1")}
          >
            <UserRound className="h-4 w-4 shrink-0 text-[#142033]" aria-hidden="true" />
            <span className={valueClass}>{mobileTravelerTotal}</span>
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
          </button>

          {isStickySearchPanelOpen &&
          activeStickySearchTarget === "travelers" &&
          travelerPopoverOpen &&
          activeDesktopSearchSurface === "sticky" ? (
            <TravelerCabinPopover
              prominentDesktop
              alignToField="right"
              launcherRef={stickyTravelerButtonRef}
              position={{ top: 0, left: 0, width: 0 }}
              onClose={() => {
                collapseStickySearch({ restoreScroll: false });
              }}
              adultCount={adultCount}
              childCount={childCount}
              infantCount={infantCount}
              cabinClass={cabinClassInput}
              onAdultChange={(nextValue) => {
                markExpandedSearchInteraction();
                const nextAdultCount = Math.min(9, Math.max(1, nextValue));
                setAdultCount(nextAdultCount);
                setChildCount((current) =>
                  Math.min(current, 9 - nextAdultCount),
                );
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

        <button
          type="submit"
          aria-label={t("search")}
          className="focus-ring inline-flex h-[40px] w-[40px] items-center justify-center rounded-[9px] bg-[#004BB8] text-white transition hover:bg-[#003F9C]"
        >
          <Search className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </form>
    );
  }

  function renderStickySearchPopoutOverlay() {
    const shouldShowMultiCityAccordion =
      isStickySearchPanelOpen &&
      activeStickySearchTarget === "trip" &&
      tripTypeInput === "multi-city" &&
      !tripTypeMenuOpen;

    if (!shouldShowMultiCityAccordion) return null;

    return (
      <div
        data-flight-search-anchored-backdrop
        className="fixed inset-x-0 bottom-0 z-[110] bg-transparent"
        style={{ top: desktopSearchPopoverFrame?.top ?? 88 }}
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            collapseStickySearch();
          }
        }}
      >
        <div
          data-flight-search-anchored-popout
          className="fixed"
          style={
            desktopSearchPopoverFrame
              ? {
                  top: desktopSearchPopoverFrame.top,
                  left: desktopSearchPopoverFrame.left,
                  width: desktopSearchPopoverFrame.width,
                }
              : {
                  top: 88,
                  left: 16,
                  width: "calc(100vw - 32px)",
                }
          }
        >
          <form
            ref={stickySearchPopoutRef}
            role="region"
            aria-label={t("editFlightSearch")}
            onSubmit={handleCompactSearchSubmit}
            onChangeCapture={markExpandedSearchInteraction}
            className="w-full"
          >
            <div
              data-sticky-multicity-editor
              className="pointer-events-auto mt-1 overflow-y-auto overscroll-contain rounded-[12px] border border-[#D8E1EC] bg-[#F8FAFC] p-3 shadow-[0_12px_26px_-18px_rgba(15,23,42,0.28)]"
              style={{
                maxHeight: `calc(100dvh - ${(desktopSearchPopoverFrame?.top ?? 88) + 12}px)`,
              }}
            >
              <MultiCityFlightEditor
                legs={multiCityLegs}
                onChange={setMultiCityLegs}
                minimumDate={formatDateValue(new Date())}
                presentation="results"
                onAirportValidityChange={setMultiCityAirportsValid}
              />
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderCompactSearchForm(placement: "mobile" | "desktop") {
    if (
      placement === "desktop" &&
      shouldShowDesktopCompactSummary &&
      showCompactSearchSummary
    ) {
      return (
        <div className="mx-auto w-full min-w-0 max-w-5xl sm:block">
          <div className="overflow-visible border border-slate-200/90 bg-white p-0 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/[0.02]">
            <button
              type="button"
              aria-label={t("editFlightSearch")}
              onClick={expandStickySearch}
              className="group focus-ring flex min-h-11 w-full min-w-0 items-center justify-between gap-3 bg-white px-4 py-2 text-start transition hover:bg-slate-50"
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-sm text-slate-700">
                <span className="shrink-0 font-semibold text-slate-900">
                  {mobileTripTypeSummary}
                </span>
                <span className="shrink-0 text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="flex min-w-0 shrink items-center gap-2 font-semibold text-slate-900">
                  <ArrowRightLeft
                    className="h-4 w-4 shrink-0 text-[#5CB6B2]"
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{mobileOriginSummary}</span>
                    <span
                      className="shrink-0 text-slate-400"
                      aria-hidden="true"
                    >
                      →
                    </span>
                    <span className="truncate">{mobileDestinationSummary}</span>
                  </span>
                </span>
                <span className="shrink-0 text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="min-w-0 truncate font-medium">
                  {mobileDateSummary}
                </span>
                <span className="shrink-0 text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span className="hidden min-w-0 truncate font-medium lg:block">
                  {travelerCabinSummary}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#004BB8] shadow-none transition group-hover:border-[#004BB8]/25 group-hover:bg-white">
                <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
                {t("edit")}
              </span>
            </button>
          </div>
        </div>
      );
    }

    if (
      placement === "desktop" &&
      !shouldRenderDesktopFullSearchForm &&
      !showFullSearchForm
    ) {
      return null;
    }

    if (placement === "desktop" && tripTypeInput === "multi-city") {
      if (isStickySearchPanelOpen) return null;

      return (
        <div className="mx-auto hidden w-full min-w-0 max-w-5xl sm:block">
          <div
            data-desktop-trip-selector
            role="radiogroup"
            aria-label={t("tripType")}
            className="hidden min-h-9 items-center gap-7 px-2 sm:flex lg:gap-10"
          >
            {[
              { label: t("roundTrip"), value: "round-trip" },
              { label: t("oneWay"), value: "one-way" },
              { label: t("multiCity"), value: "multi-city" },
            ].map((option) => {
              const selected = tripTypeInput === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => handleTripTypeChange(option.value)}
                  className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-sm font-medium text-slate-800 transition-colors hover:text-[#075EE8] focus-visible:ring-2 focus-visible:ring-[#075EE8]/30"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                      selected ? "border-[#075EE8]" : "border-slate-300",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        selected ? "bg-[#075EE8]" : "bg-transparent",
                      )}
                    />
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>

          <form
            ref={searchFormRef}
            className="mt-3 rounded-[1.15rem] border border-slate-200/90 bg-white p-4 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.58)] ring-1 ring-slate-950/[0.025]"
            onSubmit={handleCompactSearchSubmit}
            onChangeCapture={markExpandedSearchInteraction}
          >
            <MultiCityFlightEditor
              legs={multiCityLegs}
              onChange={setMultiCityLegs}
              minimumDate={formatDateValue(new Date())}
              presentation="results"
              onAirportValidityChange={setMultiCityAirportsValid}
            />
            <div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-200 pt-4">
              <div
                ref={travelerCabinWrapRef}
                className="relative min-w-0 flex-1"
              >
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {t("travelers")}
                </label>
                <button
                  type="button"
                  aria-label={t("travelersAndCabinClass")}
                  aria-expanded={travelerPopoverOpen}
                  onClick={() => {
                    setTravelerPopoverOpen((current) => {
                      const next = !current;
                      if (!next) setTravelerPopoverPosition(null);
                      return next;
                    });
                  }}
                  className="flight-results-edit-value focus-ring flex min-h-[66px] w-full items-center justify-between gap-2 rounded-[13px] border border-[#E7ECF5] bg-white px-3 text-start transition hover:border-[#E7ECF5]"
                >
                  <span className="min-w-0 truncate">{travelerCabinSummary}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-[#071A48] transition-transform",
                      travelerPopoverOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
              </div>
              <Button
                type="submit"
                className="min-h-11 shrink-0 px-6"
              >
                {t("search")}
              </Button>
            </div>
          </form>

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
        </div>
      );
    }

    if (tripTypeInput === "multi-city") {
      return (
        <div className="mx-auto w-full min-w-0 max-w-5xl">
          <button
            type="button"
            onClick={() => router.push(`/flights?${searchQueryString}`)}
            className="focus-ring min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#004BB8] shadow-sm hover:bg-blue-50"
          >
            {t("editFlightSearch")} · {t("multiCity")}
          </button>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "mx-auto w-full min-w-0 max-w-full sm:max-w-5xl",
          placement === "desktop" && "hidden sm:block",
        )}
      >
        <div className={cn("flex flex-col gap-0", placement === "desktop" && "gap-3")}>
          {placement === "desktop" ? (
            <div
              data-desktop-trip-selector
              role="radiogroup"
              aria-label={t("tripType")}
              className="hidden min-h-9 items-center gap-7 px-2 sm:flex lg:gap-10"
            >
              {[
                { label: t("roundTrip"), value: "round-trip" },
                { label: t("oneWay"), value: "one-way" },
                { label: t("multiCity"), value: "multi-city" },
              ].map((option) => {
                const selected = tripTypeInput === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleTripTypeChange(option.value)}
                    className="focus-ring inline-flex min-h-9 items-center gap-2 rounded-md px-1 text-sm font-medium text-slate-800 transition-colors hover:text-[#075EE8] focus-visible:ring-2 focus-visible:ring-[#075EE8]/30"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                        selected ? "border-[#075EE8]" : "border-slate-300",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          selected ? "bg-[#075EE8]" : "bg-transparent",
                        )}
                      />
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          <form
            ref={placement === "desktop" ? searchFormRef : undefined}
            onSubmit={handleCompactSearchSubmit}
            onChangeCapture={markExpandedSearchInteraction}
          >
            <div className="flex items-center justify-between sm:hidden">
              <span className="text-sm font-semibold text-slate-500">
                {t("editSearch")}
              </span>
              <button
                type="button"
                aria-label={t("closeEditSearch")}
                onClick={() => closeMobileSearchDrawer()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
              >
                ×
              </button>
            </div>

            <div
              className={cn(
                "relative overflow-visible rounded-[1.15rem] border border-slate-200/90 bg-white p-1.5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.58)] ring-1 ring-slate-950/[0.025] backdrop-blur-md sm:rounded-[1.15rem]",
                placement === "desktop" && "sm:bg-white sm:backdrop-blur-none",
              )}
            >
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.75fr)_minmax(0,1.3fr)_minmax(0,1.37fr)_116px] lg:gap-0">
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)] items-stretch rounded-[0.9rem] border border-slate-200/85 bg-gradient-to-b from-white to-slate-50/35 transition-colors hover:border-slate-300/90 focus-within:border-[#004BB8]/55 focus-within:ring-2 focus-within:ring-[#004BB8]/15 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200/85 lg:bg-transparent lg:hover:border-slate-200/85 lg:focus-within:border-slate-200/85 lg:focus-within:ring-0">
                  <div
                    ref={originWrapRef}
                    className="relative flex min-h-[58px] flex-col justify-center px-3.5 py-2.5 pe-2 lg:px-4 lg:pe-3"
                  >
                    <label
                      className="mb-1.5 block text-[0.66rem] font-semibold uppercase leading-3 tracking-[0.13em] text-slate-500"
                      htmlFor="results-origin"
                    >
                      {t("origin")}
                    </label>
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-700" />
                      <input
                      id="results-origin"
                      ref={originInputRef}
                      name="origin"
                      required
                      value={originInput}
                      onFocus={() => {
                        setActiveDesktopSearchSurface("full");
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
                      className="flight-results-edit-value h-6 min-w-0 flex-1 border-0 bg-transparent p-0 pe-7 outline-none placeholder:font-medium placeholder:text-slate-400"
                      />
                    </div>
                    {getLocationFieldDisplay(originInput).secondary ? (
                      <span className="block truncate ps-6 text-[10px] font-medium leading-3 text-slate-600">
                        {getLocationFieldDisplay(originInput).secondary}
                      </span>
                    ) : null}

                    {activeSuggest === "origin" &&
                    activeDesktopSearchSurface !== "sticky" ? (
                      <SuggestionList
                        id="flight-airport-suggestions"
                        alignToField
                        suggestions={resolvedOriginSuggestions}
                        locale={locale}
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
                      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-[0_8px_18px_-14px_rgba(15,23,42,0.75)] transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
                    >
                      <ArrowRightLeft
                        className="h-4 w-4"
                        strokeWidth={2.1}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <div
                    ref={destinationWrapRef}
                    className="relative flex min-h-[58px] flex-col justify-center px-3.5 py-2.5 ps-2 lg:px-4 lg:ps-3"
                  >
                    <label
                      className="mb-1.5 block text-[0.66rem] font-semibold uppercase leading-3 tracking-[0.13em] text-slate-500"
                      htmlFor="results-destination"
                    >
                      {t("destination")}
                    </label>
                    <div className="flex min-w-0 items-center gap-2">
                      <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-700" />
                      <input
                      id="results-destination"
                      ref={destinationInputRef}
                      name="destination"
                      required
                      value={destinationInput}
                      onFocus={() => {
                        setActiveDesktopSearchSurface("full");
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
                      className="flight-results-edit-value h-6 min-w-0 flex-1 border-0 bg-transparent p-0 pe-7 outline-none placeholder:font-medium placeholder:text-slate-400"
                      />
                    </div>
                    {getLocationFieldDisplay(destinationInput).secondary ? (
                      <span className="block truncate ps-6 text-[10px] font-medium leading-3 text-slate-600">
                        {getLocationFieldDisplay(destinationInput).secondary}
                      </span>
                    ) : null}

                    {activeSuggest === "destination" &&
                    activeDesktopSearchSurface !== "sticky" ? (
                      <SuggestionList
                        id="flight-airport-suggestions"
                        alignToField
                        suggestions={resolvedDestinationSuggestions}
                        locale={locale}
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
                      setActiveDesktopSearchSurface("full");
                      setTripTypeMenuOpen(false);
                      setActiveSuggest(null);
                      setDropdownPosition(null);
                      setTravelerPopoverOpen(false);
                      setTravelerPopoverPosition(null);
                      setActiveDatePicker("departure");
                      setDatePickerPosition(null);
                    }}
                    className="focus-ring flex h-full min-h-[58px] w-full items-center rounded-[0.9rem] border border-slate-200/85 bg-gradient-to-b from-white to-slate-50/35 px-4 py-2.5 text-start transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200/85 lg:bg-transparent lg:hover:border-slate-200/85"
                  >
                    <span className="min-w-0">
                      <span className="mb-1.5 block text-[0.66rem] font-semibold uppercase leading-3 tracking-[0.13em] text-slate-500">
                        {t("travelDates")}
                      </span>
                      <span className="flight-results-edit-value flex min-w-0 items-center gap-2">
                        <Calendar aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600" />
                        <span className="truncate">
                          {departureDateInput
                            ? tripTypeInput === "round-trip" && returnDateInput
                              ? `${formatCompactDateLabel(departureDateInput, calendarLocale)} – ${formatCompactDateLabel(returnDateInput, calendarLocale)}`
                              : formatDateLabel(
                                  departureDateInput,
                                  calendarLocale,
                                )
                            : t("travelDates")}
                        </span>
                      </span>
                    </span>
                  </button>

                  {activeDatePicker &&
                  activeDesktopSearchSurface !== "sticky" ? (
                    <DatePickerPopover
                      alignToField="right"
                      position={
                        datePickerPosition ?? { top: 0, left: 0, width: 0 }
                      }
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
                      setActiveDesktopSearchSurface("full");
                      setTripTypeMenuOpen(false);
                      setActiveSuggest(null);
                      setDropdownPosition(null);
                      setActiveDatePicker(null);
                      setDatePickerPosition(null);
                      setTravelerPopoverOpen(true);
                      setTravelerPopoverPosition(null);
                    }}
                    className="focus-ring flex h-full min-h-[58px] w-full items-center justify-between gap-2.5 rounded-[0.9rem] border border-slate-200/85 bg-gradient-to-b from-white to-slate-50/35 px-4 py-2.5 text-start transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200/85 lg:bg-transparent lg:hover:border-slate-200/85"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="mb-1.5 block text-[0.66rem] font-semibold uppercase leading-3 tracking-[0.13em] text-slate-500">
                        {t("travelers")}
                      </span>
                      <span className="flight-results-edit-value flex min-w-0 items-center gap-2">
                        <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-600" />
                        <span className="truncate">
                          {buildTravelerCabinSummary(
                            adultCount,
                            childCount,
                            infantCount,
                            cabinClassInput,
                            t,
                            locale,
                          )}
                        </span>
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-700" />
                  </button>

                  {travelerPopoverOpen &&
                  activeDesktopSearchSurface !== "sticky" ? (
                    <TravelerCabinPopover
                      alignToField="right"
                      position={
                        travelerPopoverPosition ?? { top: 0, left: 0, width: 0 }
                      }
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
                        const nextAdultCount = Math.min(
                          9,
                          Math.max(1, nextValue),
                        );

                        setAdultCount(nextAdultCount);
                        setChildCount((current) =>
                          Math.min(current, 9 - nextAdultCount),
                        );
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
                  className="h-full min-h-[58px] w-full rounded-[0.9rem] bg-[#004BB8] px-5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(2,28,43,0.14)] ring-1 ring-[#004BB8]/12 hover:bg-[#021C2B] lg:min-w-[116px] lg:rounded-[0.8rem]"
                >
                  {t("search")}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderMobileSortResultsRow() {
    const mobileSortOptions: Array<{ label: string; description: string; value: SortMode }> = [
      { label: "Best", description: "Best balance of price and journey time", value: "best" },
      { label: "Cheapest", description: "Lowest total price", value: "cheapest" },
      { label: "Fastest", description: "Shortest journey time", value: "fastest" },
    ];
    const activeSortOption = mobileSortOptions.find((option) => option.value === sortMode) ?? mobileSortOptions[0];
    const shortcutButtonClass =
      "group inline-flex min-h-11 min-w-11 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/35";
    const shortcutChipClass =
      "inline-flex h-9 items-center gap-1 rounded-[9px] border px-2 text-[13px] font-semibold transition";
    const menuItemClass =
      "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-transparent bg-transparent px-0 text-left text-[14px] font-normal text-slate-800 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30";

    const openSheet = (sheet: MobileShortcutSheet, launcher: HTMLButtonElement) => {
      mobileShortcutLauncherRef.current = launcher;
      setMobileDraftSort(sortMode);
      setMobileDraftAirlines(selectedAirlines);
      setMobileDraftStops(selectedStops);
      setMobileDraftFromAirports(selectedFromAirports);
      setMobileDraftToAirports(selectedToAirports);
      setMobileAirlineSearch("");
      setMobileShowAllAirlines(false);
      setMobileShortcutSheet(sheet);
    };

    const clearShortcutFilter = (sheet: Exclude<MobileShortcutSheet, "sort">) => {
      triggerFilterApplying();
      if (sheet === "airlines") setSelectedAirlines([]);
      if (sheet === "stops") setSelectedStops([]);
      if (sheet === "airports") {
        setSelectedFromAirports([]);
        setSelectedToAirports([]);
      }
      handleUserFilterCommit();
    };

    const renderTrigger = (
      sheet: MobileShortcutSheet,
      label: string,
      selectedCount = 0,
    ) => {
      const selected = sheet !== "sort" && selectedCount > 0;

      return (
        <div className="group inline-flex min-h-11 min-w-11 shrink-0 items-center">
          <span
            className={cn(
              shortcutChipClass,
              "relative overflow-hidden p-0",
              selected
                ? "border-[#142033] bg-[#142033] text-white"
                : "border-[#D8E1EC] bg-white text-[#142033] group-hover:bg-slate-50",
            )}
          >
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={mobileShortcutSheet === sheet}
              aria-pressed={selected}
              className={cn(
                "focus-ring inline-flex h-full min-w-0 items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/35",
                selected ? "pl-2 pr-6" : "px-2",
              )}
              onClick={(event) => {
                event.stopPropagation();
                openSheet(sheet, event.currentTarget);
              }}
            >
              <span className="max-w-[11rem] truncate">{label}</span>
              {!selected ? (
                <ChevronDown
                  aria-hidden="true"
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    mobileShortcutSheet === sheet && "rotate-180",
                  )}
                />
              ) : null}
            </button>
            {selected ? (
              <button
                type="button"
                aria-label={`Clear ${label} filter`}
                className="focus-ring absolute right-0.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                onClick={(event) => {
                  event.stopPropagation();
                  clearShortcutFilter(sheet as Exclude<MobileShortcutSheet, "sort">);
                }}
              >
                <X className="h-3 w-3" strokeWidth={2.1} aria-hidden="true" />
              </button>
            ) : null}
          </span>
        </div>
      );
    };

    const toggleDraft = (value: string, values: string[], setValues: Dispatch<SetStateAction<string[]>>) =>
      setValues(values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value]);

    const draftFilterState: FlightFilterState = {
      ...authoritativeFilterState,
      airlines: mobileShortcutSheet === "airlines" ? mobileDraftAirlines : authoritativeFilterState.airlines,
      stops: mobileShortcutSheet === "stops" ? mobileDraftStops : authoritativeFilterState.stops,
      fromAirports: mobileShortcutSheet === "airports" ? mobileDraftFromAirports : authoritativeFilterState.fromAirports,
      toAirports: mobileShortcutSheet === "airports" ? mobileDraftToAirports : authoritativeFilterState.toAirports,
    };
    const draftMatches = matchingFlightCount(results, draftFilterState, flightMatchContext);

    const applySheet = () => {
      if (mobileShortcutSheet === "sort") setSortMode(mobileDraftSort);
      if (mobileShortcutSheet === "airlines") setSelectedAirlines(mobileDraftAirlines);
      if (mobileShortcutSheet === "stops") setSelectedStops(mobileDraftStops);
      if (mobileShortcutSheet === "airports") {
        setSelectedFromAirports(mobileDraftFromAirports);
        setSelectedToAirports(mobileDraftToAirports);
      }
      triggerFilterApplying();
      handleUserFilterCommit();
      closeMobileShortcutSheet();
    };

    const resetSheet = () => {
      if (mobileShortcutSheet === "sort") setMobileDraftSort("best");
      if (mobileShortcutSheet === "airlines") setMobileDraftAirlines([]);
      if (mobileShortcutSheet === "stops") setMobileDraftStops([]);
      if (mobileShortcutSheet === "airports") {
        setMobileDraftFromAirports([]);
        setMobileDraftToAirports([]);
      }
    };

    const filteredAirlines = airlineOptions.filter((option) => !mobileAirlineSearch.trim() || option.label.toLowerCase().includes(mobileAirlineSearch.trim().toLowerCase()) || mobileDraftAirlines.includes(option.value));
    const visibleAirlines = mobileAirlineSearch.trim() || mobileShowAllAirlines ? filteredAirlines : filteredAirlines.slice(0, 5);
    const fromAirportOptions = mobileFromAirportOptions;
    const toAirportOptions = mobileToAirportOptions;
    const sheetTitle = mobileShortcutSheet === "sort" ? "Sort" : mobileShortcutSheet === "airlines" ? "Airlines" : mobileShortcutSheet === "stops" ? "Stops" : "Airports";

    const renderSortChoice = (
      label: string,
      description: string,
      selected: boolean,
      onClick: () => void,
    ) => (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onClick}
        className={cn(menuItemClass, "min-h-12 text-[13px] leading-[18px]")}
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="font-semibold">{label}</span>
          <span className="text-xs text-slate-500">{description}</span>
        </span>
        {selected ? <Check className="h-4 w-4 text-[#004BB8]" aria-hidden="true" /> : null}
      </button>
    );

    const renderFilterChoice = (
      label: string,
      count: number | undefined,
      selected: boolean,
      onClick: () => void,
    ) => (
      <button
        type="button"
        role="checkbox"
        aria-checked={selected}
        className={menuItemClass}
        onClick={onClick}
      >
        <span className="flex min-w-0 items-center gap-[10px]">
          <span
            aria-hidden="true"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300"
          >
            {selected ? <Check className="h-4 w-4 text-[#004BB8]" aria-hidden="true" /> : null}
          </span>
          <span className={cn("min-w-0 truncate", selected && "font-semibold text-[#07133B]")}>{label}</span>
        </span>
        {count !== undefined ? (
          <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span>{count}</span>
          </span>
        ) : null}
      </button>
    );

    const sheet = mobileShortcutSheet && typeof document !== "undefined" ? createPortal(
      <div
        data-flight-quick-sheet-backdrop
        className="fixed inset-0 z-[10020] flex items-end sm:hidden"
        role="presentation"
        onMouseDown={() => closeMobileShortcutSheet()}
      >
        <div
          aria-hidden="true"
          data-flight-quick-sheet-scrim
          className="mobile-results-sheet-backdrop-layer pointer-events-none fixed inset-0 bg-[rgba(8,18,35,0.52)]"
        />
        <section
          data-flight-quick-sheet
          ref={mobileShortcutSheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-flight-quick-sheet-title"
          className="max-h-[min(76dvh,620px)] mx-3 mb-3 w-[calc(100%-24px)] overflow-hidden rounded-[24px] bg-[#F2F4F8] shadow-none mobile-results-sheet-surface mobile-results-sheet-surface-smooth"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="relative flex min-h-16 items-center justify-center bg-[#F2F4F8] px-16 py-3">
            <h2
              id="mobile-flight-quick-sheet-title"
              className="text-base font-semibold text-slate-950"
            >
              {sheetTitle}
            </h2>
            <button
              ref={mobileShortcutSheetCloseRef}
              type="button"
              aria-label={`Close ${sheetTitle.toLowerCase()} selector`}
              onClick={() => closeMobileShortcutSheet()}
              className="absolute right-3 inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div
            className={cn(
              "max-h-[calc(min(76dvh,620px)-9rem)] overflow-y-auto overscroll-contain bg-[#F2F4F8] px-6",
              mobileShortcutSheet === "sort" ? "space-y-1 px-10 py-6" : "space-y-2 py-4",
            )}
          >
            {mobileShortcutSheet === "sort"
              ? mobileSortOptions.map((option) => (
                  <div key={option.value}>
                    {renderSortChoice(
                      option.label,
                      option.description,
                      mobileDraftSort === option.value,
                      () => setMobileDraftSort(option.value),
                    )}
                  </div>
                ))
              : null}

            {mobileShortcutSheet === "airlines" ? (
              <div>
                <label className="sr-only" htmlFor="mobile-flight-airline-search">
                  Search airlines
                </label>
                <input
                  id="mobile-flight-airline-search"
                  type="search"
                  value={mobileAirlineSearch}
                  onChange={(event) => setMobileAirlineSearch(event.target.value)}
                  placeholder="Search airlines"
                  className="mb-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20"
                />
                <div className="space-y-0.5">
                  {visibleAirlines.map((option) => (
                    <div key={option.value}>
                      {renderFilterChoice(
                        option.label,
                        matchingFlightCount(results, { ...draftFilterState, airlines: [option.value] }, flightMatchContext),
                        mobileDraftAirlines.includes(option.value),
                        () =>
                          toggleDraft(
                            option.value,
                            mobileDraftAirlines,
                            setMobileDraftAirlines,
                          ),
                      )}
                    </div>
                  ))}
                </div>
                {!mobileAirlineSearch.trim() && airlineOptions.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => setMobileShowAllAirlines((current) => !current)}
                    className="mt-2 text-xs font-semibold text-[#004BB8] transition-colors hover:text-[#021C2B]"
                  >
                    {mobileShowAllAirlines ? "Show less" : `Show more (${Math.max(0, airlineOptions.length - 5)})`}
                  </button>
                ) : null}
              </div>
            ) : null}

            {mobileShortcutSheet === "stops" ? (
              <div className="space-y-0.5">
                {stopOptions.map((option) => (
                  <div key={option.value}>
                    {renderFilterChoice(
                      option.label,
                      matchingFlightCount(results, { ...draftFilterState, stops: [option.value] }, flightMatchContext),
                      mobileDraftStops.includes(option.value),
                      () =>
                        toggleDraft(
                          option.value,
                          mobileDraftStops,
                          setMobileDraftStops,
                        ),
                    )}
                  </div>
                ))}
              </div>
            ) : null}

            {mobileShortcutSheet === "airports" ? (
              <div>
                <h3 className="flex min-h-11 items-center text-lg font-semibold leading-6 text-slate-950">
                  From
                </h3>
                <div className="space-y-0.5">
                  {fromAirportOptions.map((option) => (
                    <div key={`from-${option.value}`}>
                      {renderFilterChoice(
                        option.label,
                        matchingFlightCount(results, { ...draftFilterState, fromAirports: [option.value] }, flightMatchContext),
                        mobileDraftFromAirports.includes(option.value),
                        () =>
                          toggleDraft(
                            option.value,
                            mobileDraftFromAirports,
                            setMobileDraftFromAirports,
                          ),
                      )}
                    </div>
                  ))}
                </div>
                <h3 className="mt-3 flex min-h-11 items-center text-lg font-semibold leading-6 text-slate-950">
                  To
                </h3>
                <div className="space-y-0.5">
                  {toAirportOptions.map((option) => (
                    <div key={`to-${option.value}`}>
                      {renderFilterChoice(
                        option.label,
                        matchingFlightCount(results, { ...draftFilterState, toAirports: [option.value] }, flightMatchContext),
                        mobileDraftToAirports.includes(option.value),
                        () =>
                          toggleDraft(
                            option.value,
                            mobileDraftToAirports,
                            setMobileDraftToAirports,
                          ),
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <footer
            data-flight-quick-sheet-footer
            className="flex items-center justify-between gap-3 bg-[#F2F4F8] px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"
          >
            <button
              type="button"
              onClick={resetSheet}
              className="h-11 w-[32%] shrink-0 rounded-lg border border-[#D8DEE8] bg-[#F2F4F8] px-4 text-sm font-semibold text-slate-700"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={applySheet}
              disabled={mobileShortcutSheet !== "sort" && draftMatches === 0}
              aria-disabled={mobileShortcutSheet !== "sort" && draftMatches === 0}
              className="h-11 w-[32%] shrink-0 rounded-lg bg-[#004BB8] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              Apply
            </button>
          </footer>
        </section>
      </div>,
      document.body,
    ) : null;

    return (
      <>
        <div
          data-mobile-flight-shortcuts
          className="scrollbar-hide flex w-full min-w-0 flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain px-3 [scroll-padding-inline:0.75rem] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden"
        >
          {renderFloatingFilterButton(shortcutButtonClass)}
          {renderTrigger("sort", activeSortOption.label)}
          {renderTrigger("airlines", "Airlines", selectedAirlines.length)}
          {renderTrigger("stops", "Stops", selectedStops.length)}
          {renderTrigger("airports", "Airports", selectedFromAirports.length + selectedToAirports.length)}
        </div>
        {sheet}
      </>
    );
  }

  function renderFloatingFilterButton(className?: string) {
    const label =
      activeFilterCount > 0
        ? t("openFiltersWithCount").replace("{{count}}", activeFilterLabel)
        : t("openFilters");

    const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
      openMobileFiltersDrawer(event.currentTarget, getOverlayActivationModality(event));
    };

    return (
      <button
        type="button"
        aria-label={label}
        className={className}
        onClick={handleClick}
      >
        <span
          className={cn(
            "inline-flex h-9 items-center gap-1 rounded-[9px] border px-2 text-[13px] font-semibold transition",
            activeFilterCount > 0
              ? "border-[#142033] bg-white text-[#142033]"
              : "border-[#D8E1EC] bg-white text-[#142033] group-hover:bg-slate-50",
          )}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          <span>Filter</span>
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#142033]">
              {activeFilterCount}
            </span>
          ) : null}
        </span>
      </button>
    );
  }

  function renderMobileRouteSummaryCard() {
    return (
      <button
        type="button"
        data-flight-mobile-summary-card
        inert={mobileSearchOpen ? true : undefined}
        aria-hidden={mobileSearchOpen ? true : undefined}
        aria-label={`${t("editFlightSearch")}: ${mobileSearchSummaryLabel}`}
        title={mobileSearchSummaryLabel}
        aria-haspopup="dialog"
        aria-expanded={mobileSearchOpen}
        onClick={(event) => openMobileSearchDrawer(event.currentTarget, getOverlayActivationModality(event))}
        className="group flex min-h-11 w-full min-w-0 touch-manipulation items-center gap-1.5 overflow-hidden rounded-xl bg-[#F5F7FB] py-1 pe-2 ps-2.5 text-start transition [-webkit-tap-highlight-color:transparent] hover:bg-[#EDF2FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
      >
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="block truncate text-[14px] font-semibold leading-[18px] text-[#142033]">
            {mobileRouteSummary}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-medium leading-[15px] text-[#536B92]">
            {mobileTripTypeSummary} · {mobileDateSummary} ·{" "}
            {mobileTravelerSummary} · {mobileCabinClassSummary}
          </span>
        </span>
        <span aria-hidden="true" className="inline-flex h-7 w-6 shrink-0 items-center justify-center text-[#142033]">
          <SquarePen size={15} strokeWidth={2} />
        </span>
      </button>
    );
  }

  function renderMobileEditSearchDrawer() {
    return (
      <FlightEditSearchDrawer
        resultsMode
        open={mobileSearchOpen}
        presentation="bottom-sheet"
        initialValue={{ tripType: tripTypeInput === "multi-city" ? "multi-city" : tripTypeInput === "one-way" ? "one-way" : "round-trip", legs: tripTypeInput === "multi-city" ? multiCityLegs : [{ origin: originCode || originInput.trim(), destination: destinationCode || destinationInput.trim(), departureDate: departureDateInput }], departureDate: departureDateInput, returnDate: returnDateInput || undefined, adults: adultCount, children: childCount, infants: infantCount, cabinClass: cabinClassInput }}
        onClose={() => closeMobileSearchDrawer()}
        onSearch={(value: FlightEditSearchValue) => {
          const projection = projectSearchLegs(value.tripType, value.legs);
          const nextParams = new URLSearchParams({ tripType: value.tripType, origin: projection.origin, destination: projection.destination, departureDate: projection.departureDate, adults: String(value.adults), children: String(value.children), infants: String(value.infants), travelers: String(value.adults + value.children + value.infants), cabinClass: value.cabinClass });
          if (value.tripType === "round-trip" && value.returnDate) nextParams.set("returnDate", value.returnDate);
          if (value.tripType === "multi-city") { nextParams.set("currency", selectedCurrency); appendFlightLegParams(nextParams, value.legs); }
          closeMobileSearchDrawer({ restoreFocus: false });
          router.push(`/flights/results?${nextParams.toString()}`, { scroll: true });
        }}
      />
    );
  }

  function renderMobileFullFiltersSheet() {
    if (!filtersOpen) return null;
    const outboundTimes = {
      takeoff:
        timeBounds.takeoff &&
        maxTakeoffMinutes !== null &&
        maxTakeoffMinutes < timeBounds.takeoff.max
          ? maxTakeoffMinutes
          : null,
      landing:
        timeBounds.landing &&
        maxLandingMinutes !== null &&
        maxLandingMinutes < timeBounds.landing.max
          ? maxLandingMinutes
          : null,
    };

    return (
      <>
        <button
          type="button"
          aria-label="Close filters"
          onClick={() => closeMobileFiltersDrawer()}
          className="fixed inset-0 z-[9999] bg-slate-950/35 sm:hidden"
        />
        <aside
          ref={mobileFiltersDialogRef}
          id="flight-mobile-filters-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="flight-mobile-filters-title"
          className="fixed inset-x-0 bottom-0 z-[10000] flex h-[95dvh] w-full flex-col overflow-clip rounded-t-[20px] bg-[#F2F4F8] shadow-2xl sm:hidden"
        >
          <header className="relative flex h-16 shrink-0 items-center justify-start bg-[#F2F4F8] px-5">
            <div>
              <h2
                id="flight-mobile-filters-title"
                className="text-base font-semibold text-slate-950"
              >
                Filters
              </h2>
              {activeFilterCount > 0 ? (
                <p className="text-xs font-medium text-slate-500">
                  {activeFilterCount} applied
                </p>
              ) : null}
            </div>
            <button
              ref={mobileFiltersCloseButtonRef}
              type="button"
              className="focus-ring absolute right-3 flex h-11 w-11 items-center justify-center rounded-lg text-slate-700"
              aria-label="Close filters"
              onClick={() => closeMobileFiltersDrawer()}
            >
              <X size={22} aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#F2F4F8] px-6 py-4">
            <MobileFlightFiltersSheet
              results={results}
              priceBounds={priceBounds}
              maxPrice={maxPrice}
              formatPrice={(value) =>
                priceLabelCurrency
                  ? formatResultPriceLabel(value, selectedCurrency)
                  : "—"
              }
              onMaxPrice={(value) => {
                triggerFilterApplying();
                setMaxPrice(value);
              }}
              durationBounds={durationBounds}
              maxDurationMinutes={maxDurationMinutes}
              onMaxDuration={(value) => {
                triggerFilterApplying();
                setMaxDurationMinutes(value);
              }}
              stopOptions={stopOptions}
              selectedStops={selectedStops}
              onToggleStop={(value) => {
                triggerFilterApplying();
                toggleFilterValue(value, setSelectedStops);
              }}
              airlineOptions={mobileAirlineOptions}
              selectedAirlines={selectedAirlines}
              onToggleAirline={(value) => {
                triggerFilterApplying();
                toggleFilterValue(value, setSelectedAirlines);
              }}
              fromAirportOptions={mobileFromAirportOptions}
              toAirportOptions={mobileToAirportOptions}
              selectedFromAirports={selectedFromAirports}
              selectedToAirports={selectedToAirports}
              onToggleFromAirport={(value) => {
                triggerFilterApplying();
                toggleFilterValue(value, setSelectedFromAirports);
              }}
              onToggleToAirport={(value) => {
                triggerFilterApplying();
                toggleFilterValue(value, setSelectedToAirports);
              }}
              baggageSupported={results.some(hasStructuredBaggage)}
              refundableSupported={results.some(hasStructuredFlexibility)}
              baggageIncludedOnly={baggageIncludedOnly}
              flexibleOnly={flexibleOnly}
              onBaggage={() => {
                triggerFilterApplying();
                setBaggageIncludedOnly(!baggageIncludedOnly);
              }}
              onFlexible={() => {
                triggerFilterApplying();
                setFlexibleOnly(!flexibleOnly);
              }}
              journeyTimeMaximums={{
                ...mobileJourneyTimeMaximums,
                outbound: outboundTimes,
              }}
              onJourneyTimeChange={(key, mode, value) => {
                triggerFilterApplying();
                if (key === "outbound") {
                  if (mode === "takeoff") {
                    setMaxTakeoffMinutes(value ?? timeBounds.takeoff?.max ?? null);
                  } else {
                    setMaxLandingMinutes(value ?? timeBounds.landing?.max ?? null);
                  }
                  return;
                }
                setMobileJourneyTimeMaximums((current) => ({
                  ...current,
                  [key]: {
                    takeoff: current[key]?.takeoff ?? null,
                    landing: current[key]?.landing ?? null,
                    [mode]: value,
                  },
                }));
              }}
            />
          </div>

          <footer
            data-flight-full-filters-footer
            className="flex shrink-0 items-center gap-3 border-t border-[#D8DEE8] bg-[#F2F4F8] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_24px_rgba(15,23,42,0.08)]"
          >
            {activeFilterCount > 0 ? (
              <button
                type="button"
                aria-label="Reset flight filters"
                onClick={clearFlightFilters}
                className="focus-ring h-11 w-[30%] shrink-0 rounded-lg border border-[#D8DEE8] bg-[#F2F4F8] px-5 text-sm font-semibold text-slate-700"
              >
                Reset
              </button>
            ) : null}
            <button
              type="button"
              disabled={sortedResults.length === 0}
              onClick={() => {
                shouldScrollToTopAfterFilterApplyRef.current = true;
                triggerFilterApplying();
                closeMobileFiltersDrawer();
              }}
              className="h-11 min-w-0 flex-1 rounded-lg bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-md shadow-[#004BB8]/12 transition hover:bg-[#003f9c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
            >
              {sortedResults.length === 0
                ? "No matching flights"
                : activeFilterCount > 0
                  ? `View ${sortedResults.length} matching ${sortedResults.length === 1 ? "flight" : "flights"}`
                  : `View all ${sortedResults.length} flights`}
            </button>
          </footer>
        </aside>
      </>
    );
  }

  function renderDesktopSortControl() {
    return (
      <div ref={desktopSortRef} className="relative hidden items-center gap-2 lg:flex">
        <span className="text-[13px] font-medium leading-5 text-[#64748B]">Sort by:</span>
        <button ref={desktopSortButtonRef} type="button" aria-label="Sort flight results" aria-haspopup="menu" aria-expanded={desktopSortOpen} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-transparent px-2 text-[14px] font-semibold leading-5 text-[#142033] transition-colors hover:bg-slate-100/70 hover:text-[#142033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25" onClick={() => setDesktopSortOpen((open) => !open)}>
          {selectedSortLabel}<ChevronDown size={14} aria-hidden="true" />
        </button>
        <div role="menu" className={cn("absolute right-0 top-11 z-30 w-44 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_32px_-18px_rgba(15,23,42,0.45)] transition duration-150", desktopSortOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-95 opacity-0")}>
          {sortOptions.map((option) => (
            <button key={option.value} type="button" role="menuitemradio" aria-checked={sortMode === option.value} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25", sortMode === option.value ? "text-[#004BB8]" : "text-slate-700")} onClick={() => { triggerFilterApplying(); setSortMode(option.value); setDesktopSortOpen(false); handleUserFilterCommit(); }}>
              <span className="w-4 text-[#004BB8]">{sortMode === option.value ? "✓" : ""}</span>{option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderGuidedRetryButton() {
    return <Button type="button" className="mt-4 rounded-xl" onClick={retryMainInventorySearch}>{t("deals.guided.flightResults.retry")}</Button>;
  }

  const mobileResultsFiltersContent = (
    <section
      data-flight-mobile-results-shortcuts
      inert={mobileSearchOpen ? true : undefined}
      aria-hidden={mobileSearchOpen ? true : undefined}
      className={cn(
        "w-full py-2 sm:hidden",
        mobileSearchOpen && "pointer-events-none",
      )}
      aria-label="Flight result filters"
    >
      {renderMobileSortResultsRow()}
    </section>
  );

  const standaloneResultsHeader =
    guidedMode || externalResultsHeader ? null : (
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
        hotelDesktopBoundary
        flightResultsDesktopSticky
        mobileResultsSearch={renderMobileRouteSummaryCard()}
        mobileResultsFilters={mobileResultsFiltersContent}
        mobileResultsTrailingActions
      />
    );

  const readyExternalMobileHeader =
    !guidedMode && externalResultsHeader && !resultsUiPreparing ? (
      <>
        {mobileNavSummaryTarget
          ? createPortal(renderMobileRouteSummaryCard(), mobileNavSummaryTarget)
          : null}
        {mobileNavFiltersTarget
          ? createPortal(mobileResultsFiltersContent, mobileNavFiltersTarget)
          : null}
      </>
    ) : null;

  const readyDesktopNavbarSearch =
    !guidedMode && !resultsUiPreparing && desktopNavSearchTarget
      ? createPortal(renderDesktopHeaderSearchBar(), desktopNavSearchTarget)
      : null;

  if (resultsUiPreparing) {
    if (guidedMode) return <section aria-labelledby="deals-guided-flight-results-heading" className="mt-6" data-flight-results-experience="deals-guided"><h2 id="deals-guided-flight-results-heading" tabIndex={-1} className="text-xl font-extrabold text-slate-950">{t("deals.guided.flightResults.loadingTitle")}</h2><div ref={loadingFocusRef} role="status" tabIndex={-1} className="mt-4 space-y-3"><FlightCardSkeleton /><FlightCardSkeleton /></div></section>;
    return (
      <>
      {standaloneResultsHeader}
      {renderMobileEditSearchDrawer()}
      <main className="flex min-h-[calc(100svh-5rem)] flex-1 bg-[radial-gradient(circle_at_top_left,rgba(92,182,178,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,75,184,0.16),transparent_36%),linear-gradient(180deg,#F2F7FA_0%,#FFFFFF_58%,#FFFFFF_100%)] sm:bg-white">
        <BrandedLoading
          variant="fullscreen"
          visual="logoPulse"
          showProgress={false}
          searchType="flight"
          className="min-h-[calc(100svh-5rem)] flex-1 bg-transparent px-5 sm:hidden"
          contentClassName="max-w-md text-center"
        />
        <BrandedLoading
          variant="fullscreen"
          visual="logoPulse"
          showProgress={false}
          contentClassName="max-w-md text-center"
          searchType="flight"
          className="hidden min-h-[calc(100svh-5rem)] flex-1 bg-transparent px-5 sm:flex"
          messages={[
            t("flightResults.loading.checkingAirlinesAndFares"),
            t("flightResults.loading.comparingRoutesAndProviders"),
            t("flightResults.loading.findingBestAvailableOptions"),
            t("flightResults.loading.preparingResults"),
          ]}
        />
      </main>
      </>
    );
  }

  if (guidedMode) return (
    <section aria-labelledby="deals-guided-flight-results-heading" className="mt-0 lg:relative lg:left-1/2 lg:w-[min(1180px,calc(100vw-32px))] lg:-translate-x-1/2 xl:w-[min(1240px,calc(100vw-32px))]" data-flight-results-experience="deals-guided">
      <h2 id="deals-guided-flight-results-heading" ref={resultsHeadingRef} tabIndex={-1} className="sr-only">{formatResultsFound(sortedResults.length, t)}</h2>
      <div className="grid gap-x-6 gap-y-4 pb-5 pt-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-x-6 xl:grid-cols-[304px_minmax(0,1fr)]">
        <aside className="relative hidden self-stretch lg:block"><DesktopFlightFilters presentationMode="deals-guided" activeFilterCount={activeFilterCount} maxPrice={maxPrice} setMaxPrice={setMaxPrice} priceBounds={priceBounds} priceLabelCurrency={priceLabelCurrency} selectedCurrency={selectedCurrency} timeFilterMode={timeFilterMode} setTimeFilterMode={setTimeFilterMode} timeBounds={timeBounds} maxTakeoffMinutes={maxTakeoffMinutes} setMaxTakeoffMinutes={setMaxTakeoffMinutes} maxLandingMinutes={maxLandingMinutes} setMaxLandingMinutes={setMaxLandingMinutes} durationBounds={durationBounds} maxDurationMinutes={maxDurationMinutes} setMaxDurationMinutes={setMaxDurationMinutes} stopOptions={stopOptions} selectedStops={selectedStops} setSelectedStops={setSelectedStops} airlineOptions={airlineOptions} selectedAirlines={selectedAirlines} setSelectedAirlines={setSelectedAirlines} airportOptions={airportOptions} selectedAirports={selectedAirports} setSelectedAirports={setSelectedAirports} flightQualityOptions={flightQualityOptions} renderFlightQualityFilter={renderFlightQualityFilter} selectedFlightQuality={selectedFlightQuality} setSelectedFlightQuality={setSelectedFlightQuality} baggageIncludedOnly={baggageIncludedOnly} setBaggageIncludedOnly={setBaggageIncludedOnly} flexibleOnly={flexibleOnly} setFlexibleOnly={setFlexibleOnly} onFilterChange={triggerFilterApplying} onFilterCommit={handleUserFilterCommit} onClear={clearFlightFilters} originCode={originCode} destinationCode={destinationCode} /></aside>
        <section className="min-w-0 space-y-4">
          <div className="flex w-full flex-col gap-3 py-1"><div className="flex items-center justify-between gap-4"><p className="text-[16px] font-semibold text-[#142033]">{formatResultsFound(sortedResults.length, t)}</p>{renderDesktopSortControl()}<Button variant="secondary" className="h-10 rounded-xl border-slate-300 text-sm font-bold lg:hidden" onClick={(event) => openMobileFiltersDrawer(event.currentTarget, getOverlayActivationModality(event))}>{activeFilterCount > 0 ? t("filtersWithCount").replace("{{count}}", String(activeFilterCount)) : t("filters")}</Button></div><div className="lg:hidden">{renderMobileSortResultsRow()}</div></div>
          {error ? <div className="rounded-xl border border-danger/30 bg-red-50 p-5 text-danger" role="alert"><h2 ref={errorHeadingRef} tabIndex={-1} className="text-lg font-extrabold">{t("deals.guided.flightResults.errorTitle")}</h2><p className="mt-2">{error}</p><p className="mt-2">{t("deals.guided.flightResults.errorBody")}</p>{renderGuidedRetryButton()}</div> : filterApplying ? <div className="space-y-3"><div role="status" className="rounded-xl border border-[#004BB8]/10 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm">{t("updatingResults")}</div><FlightCardSkeleton /><FlightCardSkeleton /></div> : sortedResults.length ? <><div className="space-y-4">{visibleResults.map((flight, index) => <FlightCard key={flight.id} flight={flight} isAccented={index % 2 === 0} resultBadge={resultBadgeByFlightId.get(flight.id)} detailsHref={buildDetailsHref ? buildDetailsHref(flight) : undefined} actionLabel={actionLabel} actionAriaLabel={actionAriaLabel?.(flight)} onAction={onSelectFlight} />)}</div><FlightResultsPagination currentPage={validResultsPage} totalPages={totalResultPages} onPageChange={changeResultsPage} /></> : <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-muted shadow-sm"><h2 ref={emptyHeadingRef} tabIndex={-1} className="text-lg font-extrabold text-slate-950">{t("deals.guided.flightResults.emptyTitle")}</h2><p className="mt-2">{t("deals.guided.flightResults.emptyBody")}</p>{renderGuidedRetryButton()}</div>}
        </section>
      </div>
      {renderMobileFullFiltersSheet()}
    </section>
  );

  return (
    <>
    {standaloneResultsHeader}
    {readyExternalMobileHeader}
    {readyDesktopNavbarSearch}
    <FlightResultsScrollIndicator />
    <main data-flight-results-main className="max-sm:overflow-x-clip bg-[#F5F7FB] pb-0 sm:flex-1 sm:bg-[#F3F6FA] sm:pb-8 lg:bg-white">
      {paginationPendingPage !== null && typeof document !== "undefined"
        ? createPortal(
            <FlightResultsPageTransitionSkeleton
              statusText={t("updatingResults")}
            />,
            document.body,
          )
        : null}
      {renderMobileEditSearchDrawer()}

      {renderStickySearchPopoutOverlay()}

      <div
        ref={stickySentinelRef}
        className="pointer-events-none absolute h-px w-px opacity-0"
        aria-hidden="true"
      />
      <section
        className={cn(
          "relative z-40 hidden border-b border-transparent transition-[padding,background-color] duration-200 sm:block lg:hidden",
          isSearchCollapsed
            ? "border-transparent bg-white/95 py-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur"
            : "border-transparent bg-white pb-5 pt-7",
        )}
      >
        <div className="page-shell">
          {!mobileSearchOpen ? (
            <div
              className={cn(
                "relative z-10 min-w-0",
                !isSearchCollapsed && "translate-y-5",
              )}
            >
              {renderCompactSearchForm("desktop")}
            </div>
          ) : null}
        </div>
      </section>

      <div
        className="flight-results-grid page-shell grid gap-x-6 gap-y-4 pb-0 pt-0 sm:pb-5 sm:pt-5 lg:gap-x-9 lg:pt-4"
      >
        <aside className="relative hidden self-stretch lg:block">
          <div>{renderDesktopFlightFilters()}</div>
          <StickyFlightPopularFilters
            t={t}
            stopOptions={stopOptions}
            airlineOptions={airlineOptions}
            airportOptions={airportOptions}
            flightQualityOptions={flightQualityOptions}
            renderFlightQualityFilter={renderFlightQualityFilter}
            selectedStops={selectedStops}
            selectedAirlines={selectedAirlines}
            selectedAirports={selectedAirports}
            selectedFlightQuality={selectedFlightQuality}
            onToggle={toggleStickyFlightPopularFilter}
          />
        </aside>

        <section className="min-w-0 space-y-4 lg:space-y-0">
          <p className="sr-only" aria-live="polite">
            {savedItemError}
          </p>
          <p className="sr-only" role="status" aria-live="polite">
            {backgroundRefreshing ? t("updatingResults") : ""}
          </p>
          <div ref={flightResultsTopRef} aria-hidden="true" />
          <h2 ref={resultsHeadingRef} tabIndex={-1} className="sr-only">
            {!guidedMode && kayak && results.length === 0 ? "Search results" : formatResultsFound(sortedResults.length, t)}
          </h2>
          {!guidedMode && kayak && results.length === 0 ? <CombinedSearchEmpty otherStatus={loading ? "loading" : error ? "error" : "success"} retry={retryMainInventorySearch} /> : (
            <div className={cn(resultStackClass, "space-y-1 sm:space-y-4")}>
              {body?.tripType !== "multi-city" ? (
                <>
                  <div className="w-full min-w-0 max-w-full overflow-hidden sm:hidden" aria-label="Nearby departure fares" data-nearby-fare-presentation="mobile">
                    <div ref={mobileNearbyFareRailRef} className="flex h-[80px] w-full min-w-0 max-w-full items-center gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-3 py-[5px] [scroll-padding-inline:0.75rem] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {(nearbyFares.length ? nearbyFares : Array.from({ length: nearbyFareRangeSize }, (_, index) => ({ date: `loading-mobile-${index}`, status: "loading" as const }))).map((fare) => {
                        const selected = fare.date === body?.departureDate;
                        const displayPrice = fare.status === "success" ? formatDisplayPrice({ amount: fare.amount, sourceCurrency: fare.currency, displayCurrency: selectedCurrency, convertSourceEstimate: true, useFlightResultSymbols: true, rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback }).formatted : null;
                        const visibleFare = displayPrice ?? (fare.status === "loading" ? "•••" : fare.status === "unavailable" ? "No fare" : fare.status === "error" ? "Try later" : "—");
                        const accessibleFare = displayPrice ?? (fare.status === "loading" ? "Fare loading" : fare.status === "unavailable" ? "Fare unavailable" : fare.status === "error" ? "Fare could not be checked" : "Fare not checked");
                        const accessibleDate = fare.date.startsWith("loading-") ? "Loading date" : `${formatFareStripWeekdayLabel(fare.date, calendarLocale)}, ${formatFareStripDateLabel(fare.date, calendarLocale)}`;
                        return (
                          <button ref={selected ? mobileSelectedNearbyFareRef : undefined} key={fare.date} type="button" data-fare-date-cell aria-label={`${accessibleDate}: ${accessibleFare}`} aria-current={selected ? "date" : undefined} aria-pressed={selected} disabled={selected || loading || fare.status === "loading"} onClick={() => handleNearbyFareDateSelect(fare.date)} className={cn("focus-ring relative flex h-[70px] w-[clamp(76px,calc(27.4vw_-_11.8px),96px)] shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-center shadow-sm transition hover:border-[#075EE8]/40 hover:bg-slate-50", selected && "border-[#075EE8] bg-blue-50/60")}>
                            {selected ? <span className="absolute inset-x-1.5 top-0 h-0.5 rounded-b bg-[#075EE8]" aria-hidden="true" /> : null}
                            {fare.date.startsWith("loading-mobile-") ? (<>
                              <span className="h-3 w-12 animate-pulse rounded bg-slate-200" /><span className="mt-1.5 h-3 w-8 animate-pulse rounded bg-slate-200" /><span className="mt-1.5 h-3 w-14 animate-pulse rounded bg-slate-200" />
                            </>) : (<>
                              <span className={cn("text-[11px] font-bold uppercase leading-[14px]", selected ? "text-[#075EE8]" : "text-slate-800")}>{formatFareStripDateLabel(fare.date, calendarLocale).toUpperCase()}</span>
                              <span className={cn("text-[10px] font-semibold uppercase leading-[13px] tracking-[0.05em]", selected ? "text-[#075EE8]" : "text-slate-500")}>{formatFareStripWeekdayLabel(fare.date, calendarLocale).toUpperCase()}</span>
                              <span className={cn("flight-fare-strip-price mt-[3px] block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-semibold", selected ? "text-[#075EE8]" : "text-slate-900")} data-price-size={visibleFare.replace(/\s/g, "").length >= 13 ? "extra-long" : visibleFare.replace(/\s/g, "").length >= 10 ? "long" : "default"} dir="ltr">{visibleFare}</span>
                            </>)}
                          </button>
                        );
                      })}
                    </div>
                    {cheaperNearbyFare ? <button type="button" onClick={() => handleNearbyFareDateSelect(cheaperNearbyFare.date)} className="flight-mobile-cheaper-nearby focus-ring flex min-h-[28px] max-w-full items-center px-0 text-left font-medium text-slate-600 hover:text-[#075EE8]">Cheaper nearby: {formatFareStripDateLabel(cheaperNearbyFare.date, calendarLocale)} · Save {cheaperNearbyFare.savings}</button> : null}
                  </div>
                  <div
                  className="hidden w-full sm:block"
                  aria-label="Nearby departure fares"
                >
                  <div data-desktop-nearby-fare-rail className="relative grid w-full grid-cols-7 items-stretch gap-2 overflow-visible rounded-2xl bg-transparent p-0">
                    <button
                      type="button"
                      aria-label="Previous nearby fare date"
                      disabled={nearbyFareVisibleStart === 0}
                      onClick={() => navigateNearbyFareWindow("previous")}
                      className="focus-ring absolute -left-9 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-[#075EE8] focus-visible:text-[#075EE8] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>

                    {(nearbyFares.length
                      ? nearbyFares.slice(
                          nearbyFareVisibleStart,
                          nearbyFareVisibleStart + nearbyFareVisibleCount,
                        )
                      : Array.from(
                          { length: nearbyFareVisibleCount },
                          (_, index) => ({
                            date: `loading-${index}`,
                            status: "loading" as const,
                          }),
                        )
                    ).map((fare) => {
                      const selected = fare.date === body?.departureDate;
                      const displayPriceData =
                        fare.status === "success"
                          ? formatDisplayPrice({
                              amount: fare.amount,
                              sourceCurrency: fare.currency,
                              displayCurrency: selectedCurrency,
                              convertSourceEstimate: true,
                              useFlightResultSymbols: true,
                              rates: currencyRates.rates,
                              isFallbackRate: currencyRates.isFallback,
                            })
                          : null;
                      const displayPrice = displayPriceData?.formatted ?? null;
                      const desktopPrice = displayPriceData ? nearbyFarePrice(displayPriceData, calendarLocale) : null;
                      const accessibleFare =
                        displayPrice ??
                        (fare.status === "loading"
                          ? "Loading fare"
                          : "Unavailable");
                      const accessibleDate = fare.date.startsWith("loading-")
                        ? "Loading date"
                        : `${formatFareStripWeekdayLabel(fare.date, calendarLocale)}, ${formatFareStripDateLabel(fare.date, calendarLocale)}`;

                      return (
                        <button
                          key={fare.date}
                          type="button"
                          data-fare-date-cell
                          aria-label={`${accessibleDate}: ${accessibleFare}`}
                          aria-current={selected ? "date" : undefined}
                          aria-pressed={selected}
                          disabled={
                            selected || loading || fare.status === "loading"
                          }
                          onClick={() => handleNearbyFareDateSelect(fare.date)}
                          className={cn(
                            "focus-ring relative flex min-h-[74px] min-w-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white px-1.5 py-2 text-center shadow-sm transition duration-200 hover:border-[#075EE8]/40 hover:bg-slate-50",
                            selected && "border-[#075EE8] bg-blue-50/60",
                          )}
                        >
                          {fare.status === "loading" ? (
                            <>
                              <span className="h-3 w-12 animate-pulse rounded bg-slate-200" />
                              <span className="mt-2 h-3 w-8 animate-pulse rounded bg-slate-200" />
                              <span className="mt-2 h-3 w-14 animate-pulse rounded bg-slate-200" />
                            </>
                          ) : (
                            <>
                              {selected ? <span className="absolute inset-x-2 top-0 h-0.5 rounded-b bg-[#075EE8]" aria-hidden="true" /> : null}
                              <span
                                className={cn(
                                  "text-[11px] font-medium uppercase leading-[14px]",
                                  selected
                                    ? "text-[#075EE8]"
                                    : "text-slate-800",
                                )}
                              >
                                {formatFareStripDateLabel(
                                  fare.date,
                                  calendarLocale,
                                ).toUpperCase()}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-medium uppercase leading-[13px] tracking-[0.05em]",
                                  selected
                                    ? "text-[#075EE8]"
                                    : "text-slate-500",
                                )}
                              >
                                {formatFareStripWeekdayLabel(
                                  fare.date,
                                  calendarLocale,
                                ).toUpperCase()}
                              </span>
                              <span
                                className={cn(
                                  "flight-fare-strip-price mt-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-medium leading-5 lg:hidden",
                                  selected
                                    ? "text-[#075EE8]"
                                    : "text-slate-900",
                                )}
                                data-price-size={
                                  ((displayPrice ?? "Unavailable").replace(/\s/g, "").length) >= 13
                                    ? "extra-long"
                                    : ((displayPrice ?? "Unavailable").replace(/\s/g, "").length) >= 10
                                      ? "long"
                                      : "default"
                                }
                                dir="ltr"
                              >
                                {displayPrice ?? "Unavailable"}
                              </span>
                              <span
                                className={cn("desktop-flight-fare-price hidden lg:block", selected ? "text-[#075EE8]" : "text-slate-900")}
                                data-price-size={desktopPrice?.size ?? "long"}
                                title={desktopPrice?.full}
                                aria-label={desktopPrice?.full}
                                dir="ltr"
                              >
                                {desktopPrice?.formatted ?? "Unavailable"}
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      aria-label="Next nearby fare date"
                      disabled={
                        nearbyFareVisibleStart >=
                        nearbyFareRangeSize - nearbyFareVisibleCount
                      }
                      onClick={() => navigateNearbyFareWindow("next")}
                      className="focus-ring absolute -right-9 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-[#075EE8] focus-visible:text-[#075EE8] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                    >
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                  {cheaperNearbyFare ? (
                    <button
                      type="button"
                      data-desktop-cheaper-nearby
                      onClick={() => handleNearbyFareDateSelect(cheaperNearbyFare.date)}
                      className="desktop-flight-cheaper-nearby focus-ring mt-2 flex min-h-7 w-fit max-w-full items-center px-0 text-left text-slate-600 transition-colors hover:text-[#075EE8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
                    >
                      Cheaper nearby: {formatFareStripDateLabel(cheaperNearbyFare.date, calendarLocale)} · Save {cheaperNearbyFare.savings}
                    </button>
                  ) : null}
                </div>
                </>
              ) : null}

              {mobileFlightPriceAlertQuery ? <div className="max-sm:pt-2 max-sm:pb-1 sm:mb-4"><div data-flight-price-alert-row className="max-sm:-mx-2 max-sm:w-[calc(100%+16px)]"><FlightPriceAlertControl query={mobileFlightPriceAlertQuery} results={providerResults} /></div></div> : null}

              <div data-flight-mobile-results-intro className="space-y-3 pt-2 sm:hidden">
                <div
                  ref={mobileResultsPageTopRef}
                  data-mobile-flight-results-summary-row
                  className="flex w-full items-center justify-between gap-3"
                >
                  <p className="flight-results-count min-w-0 text-[13px] font-bold leading-[17px] tracking-[-0.005em] text-slate-900">
                    {formatMobileFlightResultsFound(sortedResults.length, t, locale)}
                  </p>
                  {resultsDisplayRange ? (
                    <p
                      aria-label={`Showing results ${resultsDisplayRange.start} through ${resultsDisplayRange.end} of ${sortedResults.length}`}
                      className="shrink-0 text-[12px] font-medium leading-4 text-[#536B92]"
                    >
                      {resultsDisplayRange.start}&ndash;{resultsDisplayRange.end}
                    </p>
                  ) : null}
                </div>
              </div>

              

              <div className="sm:hidden">
                <p role="status" aria-live="polite" className="sr-only">{filterApplying ? t("updatingResults") : ""}</p>
                {error && results.length === 0 ? (
                  <MobileFlightResultsState kind="error" onPrimary={retryMainInventorySearch} onSecondary={() => openMobileSearchDrawer()} />
                ) : results.length === 0 ? (
                  <MobileFlightResultsState kind="empty" onPrimary={() => openMobileSearchDrawer()} />
                ) : sortedResults.length === 0 ? (
                  <MobileFlightResultsState kind="filtered" onPrimary={clearFlightFilters} onSecondary={() => openMobileFiltersDrawer()} />
                ) : (
                  <div
                    data-mobile-paginated-flight-results
                    aria-busy={paginationPendingPage !== null}
                    className={cn(
                      "pt-3",
                      totalResultPages <= 1 ? "pb-6" : "pb-0",
                      paginationRevealing && "animate-[fadeIn_150ms_ease-out]",
                    )}
                  >
                    <div data-flight-results-card-list className="max-sm:-mx-2 max-sm:w-[calc(100%+16px)] space-y-3">
                      {visibleResults.map((flight, index) => {
                        const sandboxOffer = kayak?.offers.find(offer => `kayak-sandbox:${offer.id}` === flight.id);
                        if (sandboxOffer && kayak) return <KayakResultCard key={flight.id} offer={sandboxOffer} vertical="flights" criteria={kayak.criteria} />;
                        const detailsQuery = params.toString();
                        const internalDetailsHref = `/flights/details/${encodeURIComponent(flight.id)}` + (detailsQuery ? `?${detailsQuery}` : "");
                        return <FlightCard key={flight.id} flight={flight} isAccented={index % 2 === 0} resultBadge={resultBadgeByFlightId.get(flight.id)} detailsHref={resultActionHref(flight, internalDetailsHref)} />;
                      })}
                    </div>
                    <FlightResultsPagination
                      currentPage={validResultsPage}
                      totalPages={totalResultPages}
                      onPageChange={changeResultsPage}
                      disabled={paginationPendingPage !== null}
                    />
                  </div>
                )}
              </div>

              <div
                data-flight-results-desktop-summary
                className="hidden w-full items-center justify-between gap-4 px-1 py-2 sm:flex lg:py-1 lg:bg-transparent"
              >
                <div>
                  <p className="text-[12px] font-semibold leading-4 text-[#191E3B]">
                    {formatResultsFound(sortedResults.length, t)}
                  </p>

                </div>

                <div
                  ref={desktopSortRef}
                  className="relative hidden shrink-0 items-center whitespace-nowrap lg:flex"
                >
                  <button
                    ref={desktopSortButtonRef}
                    type="button"
                    aria-label={`Sort flight results: ${selectedSortLabel}`}
                    aria-haspopup="listbox"
                    aria-expanded={desktopSortOpen}
                    className="hotel-results-sort-trigger inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#9299A9] bg-white px-3 text-[#191E3B] outline-none transition-colors hover:border-[#191E3B] hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 focus-visible:ring-offset-2"
                    onClick={() => setDesktopSortOpen((open) => !open)}
                  >
                    <span>Sort by {selectedSortLabel}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        desktopSortOpen && "rotate-180",
                      )}
                      strokeWidth={2}
                    />
                  </button>
                  {desktopSortOpen ? (
                    <div
                      role="listbox"
                      aria-label="Sort flight results"
                      className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[190px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_38px_-18px_rgba(15,23,42,0.35)]"
                    >
                      {sortOptions.map((option) => {
                        const selected = sortMode === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-base font-medium leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30",
                              selected
                                ? "bg-[#004BB8]/[0.08] text-[#004BB8]"
                                : "text-slate-800 hover:bg-slate-50 hover:text-slate-950",
                            )}
                            onClick={() => {
                              triggerFilterApplying();
                              setSortMode(option.value);
                              setDesktopSortOpen(false);
                              handleUserFilterCommit();
                            }}
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                              {selected ? (
                                <Check
                                  aria-hidden="true"
                                  className="h-4 w-4"
                                  strokeWidth={2.25}
                                />
                              ) : null}
                            </span>
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <Button
                  variant="secondary"
                  className="h-10 rounded-xl border-slate-300 text-sm font-bold transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8] lg:hidden"
                  onClick={(event) =>
                    openMobileFiltersDrawer(event.currentTarget, getOverlayActivationModality(event))
                  }
                >
                  <SlidersHorizontal size={17} />
                  {activeFilterCount > 0
                    ? t("filtersWithCount").replace(
                        "{{count}}",
                        String(activeFilterCount),
                      )
                    : t("filters")}
                </Button>
              </div>
              <div
                ref={paginationListRef}
                aria-busy={filterApplying}
                className="hidden sm:block"
              >
              {error && results.length === 0 ? (
                <div className="rounded-xl border border-danger/30 bg-red-50 p-5 text-danger">{error}</div>
              ) : filterApplying ? (
                <div className="space-y-3">
                  <div role="status" aria-live="polite" className="sr-only">
                    {t("updatingResults")}
                  </div>
                  {Array.from({ length: 2 }, (_, index) => <FlightCardSkeleton key={index} />)}
                </div>
              ) : sortedResults.length ? (
                <>
                  <div data-flight-results-card-list className="space-y-3 sm:space-y-4">
                    {sortedResults.map((flight, index) => {
                      const sandboxOffer = kayak?.offers.find(offer => `kayak-sandbox:${offer.id}` === flight.id);
                      if (sandboxOffer && kayak) return <KayakResultCard key={flight.id} offer={sandboxOffer} vertical="flights" criteria={kayak.criteria} />;
                      const detailsQuery = params.toString();
                      const internalDetailsHref =
                        `/flights/details/${encodeURIComponent(flight.id)}` +
                        (detailsQuery ? `?${detailsQuery}` : "");
                      const detailsHref = resultActionHref(flight, internalDetailsHref);

                      return (
                        <FlightCard
                          key={flight.id}
                          flight={flight}
                          isAccented={index % 2 === 0}
                          resultBadge={resultBadgeByFlightId.get(flight.id)}
                          detailsHref={detailsHref}
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-muted shadow-sm">
                  {t("noFlightsMatchFilters")}
                </div>
              )}
              </div>
            </div>
          )}
        </section>

        <aside
          className="flight-results-right-rail min-w-0"
          aria-hidden="true"
        />
      </div>

      {renderMobileFullFiltersSheet()}
    </main>
    {!guidedMode && showBackToTop && !filtersOpen ? (
      <button
        type="button"
        aria-label="Back to top"
        onClick={() => {
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }}
        className="fixed bottom-[calc(2rem+env(safe-area-inset-bottom))] end-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-[#004BB8] shadow-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 focus-visible:ring-offset-2 sm:bottom-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </button>
    ) : null}
    <Footer variant="brand-legal-only" />
    </>
  );
}

function FlightResultsPageTransitionSkeleton({
  statusText,
}: {
  statusText: string;
}) {
  return (
    <div
      data-flight-results-transition-cover
      className="fixed inset-0 z-[9990] overflow-hidden bg-[#F5F7FB] sm:bg-[#F3F6FA] lg:bg-white"
      aria-busy="true"
    >
      <p className="sr-only" role="status" aria-live="polite">
        {statusText}
      </p>

      <div className="h-20 border-b border-slate-100 bg-white px-4 sm:h-[86px]">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between">
          <div className="h-5 w-28 animate-pulse rounded bg-slate-200 motion-reduce:animate-none sm:h-7 sm:w-40" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none sm:h-10 sm:w-10" />
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white px-4 py-4 sm:hidden">
        <div className="mx-auto h-[4.25rem] w-full max-w-[30rem] animate-pulse rounded-xl border border-slate-200 bg-white shadow-[0_16px_34px_-26px_rgba(15,23,42,0.55)] motion-reduce:animate-none" />
      </div>

      <div className="mx-auto max-w-[1400px] px-3 py-4 sm:px-4 sm:py-8">
        <div className="mb-3 flex gap-1.5 overflow-hidden sm:hidden">
          {[84, 92, 76, 88].map((width) => (
            <div
              key={width}
              className="h-9 shrink-0 animate-pulse rounded-lg border border-slate-200 bg-white motion-reduce:animate-none"
              style={{ width }}
            />
          ))}
        </div>

        <div className="mb-3 flex items-center justify-between sm:hidden">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
          <div className="h-3 w-10 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
        </div>

        <div className="hidden h-20 animate-pulse rounded-2xl border border-slate-200 bg-white motion-reduce:animate-none sm:block" />

        <div className="mt-3 grid gap-6 sm:mt-6 lg:grid-cols-[288px_minmax(0,1fr)]">
          <div className="hidden h-[34rem] animate-pulse rounded-2xl border border-slate-200 bg-white lg:block motion-reduce:animate-none" />
          <div data-flight-results-skeleton-card-list className="max-sm:-mx-2 max-sm:w-[calc(100%+16px)] space-y-3 sm:space-y-4">
            <div className="hidden h-7 w-44 animate-pulse rounded bg-slate-200 motion-reduce:animate-none sm:block" />
            {Array.from({ length: 3 }, (_, index) => (
              <FlightCardSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
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

function filterResultsByRequestedOutboundDate(
  results: PublicFlightResult[],
  requestedDepartureDate: string,
) {
  if (!requestedDepartureDate) return results;

  return results.filter((result) => {
    const outboundLeg =
      result.legs?.find((leg) => leg.direction === "outbound") ??
      result.legs?.[0];
    const departureTime = outboundLeg?.departureTime || result.departureTime;

    return getItineraryDateKey(departureTime) === requestedDepartureDate;
  });
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addDays(date: Date, amount: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string, locale: string): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(normalizeFlightResultsCalendarLocale(locale), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatCompactDateLabel(value: string, locale: string): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return formatFlightsDateSummary(date, null, locale);
}

function formatDesktopHeaderDateLabel(value: string, locale: string): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  const weekday = new Intl.DateTimeFormat(
    normalizeFlightResultsCalendarLocale(locale),
    { weekday: "short" },
  ).format(date);

  return `${weekday} ${date.getMonth() + 1}/${date.getDate()}`;
}

function formatFareStripDateLabel(value: string, locale: string): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(normalizeFlightResultsCalendarLocale(locale), {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatFareStripWeekdayLabel(value: string, locale: string): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(normalizeFlightResultsCalendarLocale(locale), {
    weekday: "short",
  }).format(date);
}

function getNearbyFareWindowStart(selectedDate: Date): Date {
  const today = startOfLocalDay(new Date());
  const preferredStart = startOfLocalDay(
    addDays(selectedDate, -nearbyFareDaysBeforeAnchor),
  );
  return preferredStart < today ? today : preferredStart;
}

function getNearbyFareDateRange(windowStart: Date): string[] {
  const startDate = startOfLocalDay(windowStart);
  return Array.from({ length: nearbyFareRangeSize }, (_, index) =>
    formatDateValue(addDays(startDate, index)),
  );
}

function isFreshNearbyFareState(
  state: NearbyFareState | undefined,
): state is NearbyFareState {
  if (!state || state.status === "idle" || state.status === "loading") return false;
  if (!("fetchedAt" in state) || typeof state.fetchedAt !== "number") return false;

  return Date.now() - state.fetchedAt <= nearbyFareCacheTtlMs;
}

function getFreshNearbyFareCacheEntry(
  cache: Map<string, NearbyFareState>,
  key: string,
): NearbyFareState | null {
  const state = cache.get(key);
  if (!isFreshNearbyFareState(state)) {
    if (state) cache.delete(key);
    return null;
  }

  return state;
}

function buildNearbyFareSearchBody<
  T extends { tripType: string; departureDate: string; returnDate?: string },
>(search: T, departureDate: string): T {
  const currentDepartureDate = search.departureDate;
  const nextSearch = { ...search, departureDate };

  if (search.tripType === "round-trip" && search.returnDate) {
    const adjustedReturnDate = preserveRoundTripDuration(
      currentDepartureDate,
      search.returnDate,
      departureDate,
    );
    nextSearch.returnDate = adjustedReturnDate ?? search.returnDate;
  }

  return nextSearch;
}

function preserveRoundTripDuration(
  currentDepartureValue: string,
  currentReturnValue: string,
  nextDepartureValue: string,
): string | null {
  const currentDepartureDate = parseDateValue(currentDepartureValue);
  const currentReturnDate = parseDateValue(currentReturnValue);
  const nextDepartureDate = parseDateValue(nextDepartureValue);

  if (!currentDepartureDate || !currentReturnDate || !nextDepartureDate) {
    return null;
  }

  const durationDays = Math.max(
    0,
    Math.round(
      (currentReturnDate.getTime() - currentDepartureDate.getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );

  return formatDateValue(addDays(nextDepartureDate, durationDays));
}

function getNearbyFareCacheKey(
  search: {
    tripType: string;
    origin: string;
    destination: string;
    returnDate?: string;
    adults: number;
    children: number;
    infants: number;
    cabinClass: string;
    currency?: string;
  },
  date: string,
) {
  return [
    search.tripType,
    search.origin,
    search.destination,
    date,
    search.tripType === "round-trip" ? search.returnDate ?? "" : "",
    search.adults,
    search.children,
    search.infants,
    search.cabinClass,
    search.currency ?? "",
  ].join("|");
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
  const adultSingular = t("adultSingular");
  const adultPlural = t("adultPlural");
  const displayAdultSingular = locale?.startsWith("en")
    ? `${adultSingular.charAt(0).toUpperCase()}${adultSingular.slice(1)}`
    : adultSingular;
  const displayAdultPlural = locale?.startsWith("en")
    ? `${adultPlural.charAt(0).toUpperCase()}${adultPlural.slice(1)}`
    : adultPlural;
  const parts = [
    formatTravelerCount(adults, displayAdultSingular, displayAdultPlural),
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
  prominentDesktop = false,
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
  doneDisabled = false,
  launcherRef,
}: {
  position: { top: number; left: number; width: number };
  mobileSheet?: boolean;
  alignToField?: "left" | "right";
  prominentDesktop?: boolean;
  launcherRef?: RefObject<HTMLElement | null>;
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
  doneDisabled?: boolean;
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
          maxHeight: "min(520px, calc(100dvh - 8rem))",
          zIndex: 70,
        } as const)
      : ({
          position: "fixed",
          top: position.top,
          left: position.left,
          width: position.width,
          zIndex: 9999,
        } as const);

  const titleId = "flight-date-picker-mobile-title";

  const renderMonth = (renderedMonth: Date) => (
    <div className="min-w-0">
      <p
        className={cn(
          "text-center font-bold text-slate-900",
          prominentDesktop ? "mb-1 text-[13px]" : "mb-2 text-sm",
        )}
      >
        {formatFlightsMonthHeading(renderedMonth, calendarLocale)}
      </p>

      <div
        className={cn(
          "grid grid-cols-7 gap-1 text-center font-semibold text-slate-500",
          prominentDesktop ? "mb-1 text-[11px]" : "mb-2 text-xs",
        )}
      >
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
                className={
                  mobileSheet ? "h-9" : prominentDesktop ? "h-7" : "h-8"
                }
              />
            );
          }

          const selectedDeparture = isSameDateValue(date, departureValue);
          const selectedReturn = isSameDateValue(date, returnValue);
          const departureDate = parseDateValue(departureValue);
          const returnDate = parseDateValue(returnValue);
          const isInRange = Boolean(
            departureDate &&
            returnDate &&
            startOfLocalDay(date) > startOfLocalDay(departureDate) &&
            startOfLocalDay(date) < startOfLocalDay(returnDate),
          );
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
              aria-pressed={selectedDeparture || selectedReturn}
              onClick={() => {
                if (disabledDate || !isSelectableFlightDate(date)) return;
                onSelect(date);
              }}
              className={cn(
                mobileSheet
                  ? "relative mx-auto flex h-11 w-full max-w-11 items-center justify-center rounded-full text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8]"
                  : prominentDesktop
                    ? "h-7 rounded-md text-[11px] font-semibold transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8]"
                    : "h-8 rounded-md text-xs font-semibold transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8]",
                selectedDeparture || selectedReturn
                  ? "bg-[#004BB8] text-white hover:bg-[#004BB8] focus:bg-[#004BB8]"
                  : disabledDate
                    ? "cursor-not-allowed text-slate-300 hover:bg-transparent"
                    : "text-slate-800 hover:bg-[#004BB8]/8 hover:text-[#004BB8]",
                isInRange &&
                  !(selectedDeparture || selectedReturn) &&
                  "bg-[#004BB8]/10 text-[#021C2B] hover:bg-[#004BB8]/10",
                isToday &&
                  !(selectedDeparture || selectedReturn) &&
                  !disabledDate
                  ? "ring-1 ring-inset ring-[#004BB8]/20"
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

  if (mobileSheet) {
    return (
      <FlightMobilePickerShell
        open={mobileSheet}
        title={t("travelDates")}
        titleId={titleId}
        launcherRef={launcherRef}
        onClose={onClose}
        pickerMarker="flight-date"
        contentClassName="bg-white"
        footer={() => (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className={cn(
            "rounded-lg border border-slate-300 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8]",
            prominentDesktop
              ? "min-h-8 px-2.5 py-1 text-xs"
              : "min-h-9 px-3 py-1.5 text-xs sm:text-sm",
          )}
              onClick={onClear}
            >
              {t("clear")}
            </button>

            <button
              type="button"
              onClick={onToday}
              disabled={doneDisabled}
              className="min-h-11 rounded-xl bg-[#004BB8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            >
              {t("done")}
            </button>
          </div>
        )}
      >
        <div className="mx-auto flex h-full w-full max-w-xl flex-col">
          <div className="mb-4 shrink-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {t("travelDates")}
            </p>
            <h3 id={titleId} className="text-base font-bold text-slate-950">
              {tripType !== "round-trip" || activePicker === "departure"
                ? t("selectDeparture")
                : t("selectReturn")}
            </h3>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
            <div className="mx-auto w-full max-w-xl space-y-8">
              {Array.from({ length: 12 }, (_, monthOffset) =>
                renderMonth(addMonths(startOfMonth(today), monthOffset)),
              )}
            </div>
          </div>
        </div>
      </FlightMobilePickerShell>
    );
  }

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
      style={
        prominentDesktop && !mobileSheet && !alignToField
          ? {
              ...dialogStyle,
              maxHeight: `min(520px, calc(100dvh - ${position.top + 16}px))`,
            }
          : dialogStyle
      }
      className={cn(
        "w-full border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.14)]",
        mobileSheet
          ? "flex h-[100dvh] min-h-0 max-w-full flex-col overflow-y-auto overscroll-contain rounded-none p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))]"
          : prominentDesktop
            ? "max-w-none overflow-y-auto overscroll-contain rounded-xl p-3"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
          >
            ×
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "flex shrink-0 items-center justify-between",
          prominentDesktop ? "mb-2" : "mb-3",
        )}
      >
        <button
          type="button"
          aria-label={t("previousMonth")}
          className={cn(
            "rounded-lg border border-slate-300 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8]",
            prominentDesktop
              ? "min-h-8 px-2.5 py-1 text-xs"
              : "min-h-9 px-3 py-1.5 text-xs sm:text-sm",
          )}
          onClick={() => onMonthChange(addMonths(leftMonth, -1))}
        >
          {t("previousShort")}
        </button>

        <button
          type="button"
          aria-label={t("nextMonth")}
          className={cn(
            "rounded-lg border border-slate-300 font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8]",
            prominentDesktop
              ? "min-h-8 px-2.5 py-1 text-xs"
              : "min-h-9 px-3 py-1.5 text-xs sm:text-sm",
          )}
          onClick={() => onMonthChange(addMonths(leftMonth, 1))}
        >
          {t("nextShort")}
        </button>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 grid",
          prominentDesktop ? "gap-2" : "gap-3",
          mobileSheet ? "overflow-visible md:grid-cols-2" : "md:grid-cols-2",
        )}
      >
        {renderMonth(leftMonth)}
        <div className={cn(mobileSheet ? "block" : "hidden md:block")}>
          {renderMonth(rightMonth)}
        </div>
      </div>

      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white",
          prominentDesktop ? "sticky bottom-0 mt-2 pt-2" : "mt-4 pt-3",
        )}
      >
        <button
          type="button"
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8] sm:text-sm"
          onClick={onClear}
        >
          {t("clear")}
        </button>

        <button
          type="button"
          className={cn(
            "rounded-xl bg-[#004BB8] font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-1",
            prominentDesktop
              ? "min-h-9 px-3 py-1.5 text-xs"
              : "min-h-11 px-4 py-2 text-sm",
          )}
          onClick={onToday}
          disabled={doneDisabled}
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
  prominentDesktop = false,
  adultCount,
  childCount,
  infantCount,
  cabinClass,
  onAdultChange,
  onChildChange,
  onInfantChange,
  onCabinClassChange,
  onClose,
  onDone = onClose,
  launcherRef,
}: {
  position: { top: number; left: number; width: number };
  mobileSheet?: boolean;
  alignToField?: "left" | "right";
  prominentDesktop?: boolean;
  launcherRef?: RefObject<HTMLElement | null>;
  adultCount: number;
  childCount: number;
  infantCount: number;
  cabinClass: CabinClassValue;
  onAdultChange: (value: number) => void;
  onChildChange: (value: number) => void;
  onInfantChange: (value: number) => void;
  onCabinClassChange: (value: CabinClassValue) => void;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const titleId = "flight-traveler-cabin-mobile-title";

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

  if (mobileSheet) {
    return (
      <FlightMobilePickerShell
        open={mobileSheet}
        title={t("travelersAndCabin")}
        titleId={titleId}
        launcherRef={launcherRef}
        onClose={onClose}
        pickerMarker="traveler-cabin"
        footer={() => (
          <button
            type="button"
            onClick={onDone}
            className="min-h-12 w-full rounded-xl bg-[#004BB8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-1"
          >
            {t("done")}
          </button>
        )}
      >
        <div className="mx-auto w-full max-w-xl">
          <div>
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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
                description={t("childAgeRange")}
                value={childCount}
                min={0}
                max={9}
                onChange={onChildChange}
              />
              <CounterRow
                label="Infants"
                description={t("under2")}
                value={infantCount}
                min={0}
                max={adultCount}
                onChange={onInfantChange}
              />
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
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
                        ? "border-[#004BB8]/22 bg-[#004BB8]/6 text-[#021C2B]"
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
      </FlightMobilePickerShell>
    );
  }

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
          : prominentDesktop
            ? "max-w-none rounded-xl p-4"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
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
            <h3 className="text-sm font-semibold text-slate-900">
              {t("travelers")}
            </h3>
          ) : null}

          <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white px-3">
            <CounterRow
              label={t("adults")}
              description={t("adultAgeRange")}
              value={adultCount}
              min={1}
              max={9}
              onChange={onAdultChange}
              presentation="desktop"
            />

            <CounterRow
              label={t("children")}
              description={t("childAgeRange")}
              value={childCount}
              min={0}
              max={9}
              onChange={onChildChange}
              presentation="desktop"
            />

            <CounterRow
              label={t("infantPlural")}
              description={t("under2")}
              value={infantCount}
              min={0}
              max={adultCount}
              onChange={onInfantChange}
              presentation="desktop"
            />
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide leading-4 text-slate-700">
            {t("cabinClass")}
          </h3>
          <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {cabinClassOptions.map((option) => {
              const selected = option.value === cabinClass;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onCabinClassChange(option.value)}
                  className={cn(
                    "focus-ring min-h-11 border-e border-slate-200 px-3 py-2 text-center text-sm font-semibold leading-4 transition-colors last:border-e-0",
                    selected
                      ? "bg-[#EEF5FF] text-[#004BB8] shadow-[inset_0_0_0_1px_#075EE8]"
                      : "text-slate-700 hover:bg-slate-50",
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
            className="min-h-12 w-full rounded-xl bg-[#004BB8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-1"
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
  presentation = "default",
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  presentation?: "default" | "desktop";
}) {
  const decrementDisabled = value <= min;
  const incrementDisabled = value >= max;

  return (
    <div className={cn("flex items-center justify-between gap-3", presentation === "desktop" ? "min-h-[68px] py-3" : "min-h-10 py-2.5")}>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-950">{label}</p>
        <p className="text-xs font-semibold text-slate-500">{description}</p>
      </div>

      <div className={cn("flex shrink-0 items-center", presentation === "desktop" ? "gap-2" : "gap-1")}>
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={decrementDisabled}
          onClick={() => onChange(value - 1)}
          className={cn("focus-ring inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-[#004BB8] hover:text-[#004BB8] disabled:cursor-not-allowed disabled:opacity-40", presentation === "desktop" ? "h-10 w-10" : "h-7 w-7")}
        >
          <Minus className={presentation === "desktop" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        </button>

        <span className={cn("text-center font-semibold tabular-nums text-slate-900", presentation === "desktop" ? "min-w-8 text-base" : "min-w-7 text-sm")}>
          {value}
        </span>

        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={incrementDisabled}
          onClick={() => onChange(value + 1)}
          className={cn("focus-ring inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-700 transition hover:border-[#004BB8] hover:text-[#004BB8] disabled:cursor-not-allowed disabled:opacity-40", presentation === "desktop" ? "h-10 w-10" : "h-7 w-7")}
        >
          <Plus className={presentation === "desktop" ? "h-4 w-4" : "h-3.5 w-3.5"} />
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
  keyboardNavigation = false,
  locale,
}: {
  id: string;
  suggestions: AirportOption[];
  onSelect: (value: string) => void;
  position?: { top: number; left: number; width: number };
  alignToField?: boolean;
  keyboardNavigation?: boolean;
  locale?: string | null;
}) {
  const visibleSuggestions = suggestions.slice(0, 5);

  return (
    <div
      id={id}
      role="listbox"
      aria-label="Airport suggestions"
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
      className="w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_18px_42px_-22px_rgba(15,23,42,0.38)] ring-1 ring-slate-950/[0.025]"
    >
      {visibleSuggestions.length ? (
        visibleSuggestions.map((item, index) => (
          <button
            key={`${item.code}-${item.airport}`}
            type="button"
            role="option"
            aria-selected="false"
            aria-label={`${getLocalizedCityName(item.city, locale)}, ${item.airport}, ${item.code}`}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={() => onSelect(airportInputValue(item))}
            onKeyDown={(event) => {
              if (!keyboardNavigation) return;
              const options = Array.from(
                event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                  '[role="option"]',
                ) ?? [],
              );
              const currentIndex = options.indexOf(event.currentTarget);
              const nextIndex =
                event.key === "ArrowDown"
                  ? Math.min(options.length - 1, currentIndex + 1)
                  : event.key === "ArrowUp"
                    ? Math.max(0, currentIndex - 1)
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? options.length - 1
                        : -1;
              if (nextIndex < 0) return;
              event.preventDefault();
              options[nextIndex]?.focus();
            }}
            className={cn(
              "block min-h-[58px] w-full px-4 py-2.5 text-start transition-colors hover:bg-slate-50 focus-visible:bg-blue-50/60 focus-visible:outline-none",
              index < visibleSuggestions.length - 1 && "border-b border-slate-200/75",
            )}
          >
            <p className="truncate text-sm font-semibold leading-5 text-slate-950">
              {getLocalizedCityName(item.city, locale)} ({item.code})
            </p>
            <p className="mt-0.5 truncate text-xs font-medium leading-4 text-slate-500">
              {item.airport}
              {item.country
                ? ` · ${getLocalizedAirportCountryName(item, locale)}`
                : ""}
            </p>
          </button>
        ))
      ) : (
        <p className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-500">
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

function formatTimeFromMinutes(value: number, locale: string) {
  const normalized = Math.max(0, Math.min(1439, value));
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const date = new Date(2000, 0, 1, hours24, minutes);

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDurationFromMinutes(
  totalMinutes: number,
  t: (key: string) => string,
) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) {
    return t("flightResults.duration.minutesOnly").replace(
      "{{minutes}}",
      String(remainingMinutes),
    );
  }

  if (remainingMinutes === 0) {
    return t("flightResults.duration.hoursOnly").replace(
      "{{hours}}",
      String(hours),
    );
  }

  return t("flightResults.duration.hoursMinutes")
    .replace("{{hours}}", String(hours))
    .replace("{{minutes}}", String(remainingMinutes));
}

function formatOptionsFound(count: number, t: (key: string) => string) {
  const key = count === 1 ? "optionFound" : "optionsFound";
  return t(key).replace("{{count}}", String(count));
}

function formatResultsFound(count: number, t: (key: string) => string) {
  const key = count === 1 ? "resultFound" : "resultsFound";
  return t(key).replace("{{count}}", String(count));
}

function formatMobileFlightResultsFound(count: number, t: (key: string) => string, locale: string) {
  if (locale.toLowerCase().startsWith("en")) {
    return `${count} ${count === 1 ? "Result" : "Results"} found`;
  }
  return formatResultsFound(count, t);
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
  renderFlightQualityFilter,
  selectedFlightQuality,
  setSelectedFlightQuality,
  baggageIncludedOnly,
  setBaggageIncludedOnly,
  flexibleOnly,
  setFlexibleOnly,
  onFilterChange,
  onFilterCommit,
  onClear,
}: {
  layout: "desktop" | "mobile" | "compact";
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
  renderFlightQualityFilter: boolean;
  selectedFlightQuality: string[];
  setSelectedFlightQuality: Dispatch<SetStateAction<string[]>>;
  baggageIncludedOnly: boolean;
  setBaggageIncludedOnly: (value: boolean) => void;
  flexibleOnly: boolean;
  setFlexibleOnly: (value: boolean) => void;
  onFilterChange: () => void;
  onFilterCommit: () => void;
  onClear: () => void;
}) {
  const { t: dictionary, locale } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const calendarLocale = normalizeFlightResultsCalendarLocale(locale);
  const currencyRates = useCurrencyRates();
  const filterRangeClass =
    "h-2 w-full cursor-pointer appearance-none rounded-full bg-border outline-none transition disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[#2F73C8] [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2F73C8] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border [&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[#2F73C8] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#2F73C8] [&::-moz-range-thumb]:shadow-md";
  const formatFilterPrice = (amount: number) =>
    priceLabelCurrency
      ? formatDisplayPrice({
          amount,
          sourceCurrency: priceLabelCurrency,
          displayCurrency: selectedCurrency,
          convertSourceEstimate: true,
          useFlightResultSymbols: true,
          rates: currencyRates.rates,
          isFallbackRate: currencyRates.isFallback,
        }).formatted
      : t("mixedProviderCurrencies");

  const [compactOpenSection, setCompactOpenSection] =
    useState<CompactFilterSectionId>(null);
  const activeFilterLabel = t("activeFilterCount").replace(
    "{{count}}",
    String(activeFilterCount),
  );
  const renderQualitySection =
    renderFlightQualityFilter && flightQualityOptions.length > 0;

  const effectiveCompactOpenSection =
    compactOpenSection === "quality" && !renderQualitySection
      ? null
      : compactOpenSection;

  const compactSectionCounts = {
    price: priceBounds.max && maxPrice < priceBounds.max ? 1 : 0,
    times:
      (timeBounds.takeoff && maxTakeoffMinutes !== timeBounds.takeoff.max
        ? 1
        : 0) +
      (timeBounds.landing && maxLandingMinutes !== timeBounds.landing.max
        ? 1
        : 0),
    duration:
      durationBounds && maxDurationMinutes !== durationBounds.max ? 1 : 0,
    quality: selectedFlightQuality.length,
    stops: selectedStops.length,
    airlines: selectedAirlines.length,
    airports: selectedAirports.length,
    amenities: (baggageIncludedOnly ? 1 : 0) + (flexibleOnly ? 1 : 0),
  };

  if (layout === "compact") {
    return (
      <div className="desktop-filter-sidebar flex h-auto flex-col overflow-visible rounded-2xl border border-[#D8E1EC] bg-[#EEF3F8] p-0 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.42)]">
        <div className="desktop-filter-sidebar__header shrink-0 border-b border-[#D8E1EC]/80 bg-[#EEF3F8] px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="desktop-filter-sidebar__title flex min-w-0 items-center gap-2 truncate text-[15px] font-semibold leading-5 tracking-[-0.01em] text-slate-950">
              <SlidersHorizontal
                className="desktop-filter-sidebar__icon shrink-0 text-[#004BB8]"
                size={15}
                strokeWidth={2.25}
                aria-hidden="true"
              />
              <span className="truncate">{t("filterBy")}</span>
            </h2>
          </div>
          {activeFilterCount > 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="desktop-filter-sidebar__count rounded-full bg-[#EAF2FB] px-2 py-0.5 text-[11px] font-semibold text-[#235A9F] ring-1 ring-[#004BB8]/8">
                {activeFilterLabel}
              </span>
              <button
                type="button"
                className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-[#235A9F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
                onClick={onClear}
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
        <div className="h-auto overflow-visible bg-[#EEF3F8] px-2 py-1">
          <CompactFilterSection
            title={t("price")}
            count={compactSectionCounts.price}
            sectionId="price"
            openSection={effectiveCompactOpenSection}
            setOpenSection={setCompactOpenSection}
          >
            <input
              aria-label={t("price")}
              className={filterRangeClass}
              type="range"
              min={priceBounds.min || 0}
              max={priceBounds.max || 0}
              step={25}
              value={priceBounds.max ? Math.min(maxPrice, priceBounds.max) : 0}
              disabled={!priceBounds.max}
              onPointerUp={onFilterCommit}
              onMouseUp={onFilterCommit}
              onTouchEnd={onFilterCommit}
              onKeyUp={onFilterCommit}
              onBlur={onFilterCommit}
              onChange={(event) => {
                onFilterChange();
                setMaxPrice(Number(event.target.value));
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-medium tabular-nums text-slate-500">
              <span className="min-w-0 truncate whitespace-nowrap">
                {priceBounds.max && priceLabelCurrency
                  ? formatFilterPrice(priceBounds.min)
                  : "—"}
              </span>
              <span className="min-w-0 truncate whitespace-nowrap">
                {priceBounds.max && priceLabelCurrency
                  ? formatFilterPrice(Math.min(maxPrice, priceBounds.max))
                  : "—"}
              </span>
            </div>
          </CompactFilterSection>
          <CompactFilterSection
            title={t("times")}
            count={compactSectionCounts.times}
            sectionId="times"
            openSection={effectiveCompactOpenSection}
            setOpenSection={setCompactOpenSection}
          >
            <div className="space-y-3.5">
              {[
                {
                  key: "takeoff",
                  eyebrow: t("takeoff"),
                  label: t("takeoffTimeFromOrigin"),
                  bounds: timeBounds.takeoff,
                  value: maxTakeoffMinutes,
                  setValue: setMaxTakeoffMinutes,
                },
                {
                  key: "landing",
                  eyebrow: t("landing"),
                  label: t("landingTimeAtDestination"),
                  bounds: timeBounds.landing,
                  value: maxLandingMinutes,
                  setValue: setMaxLandingMinutes,
                },
              ].map((item) => (
                <label key={item.key} className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {item.eyebrow}
                  </span>
                  <span className="mb-1.5 flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
                    <span className="min-w-0 truncate">{item.label}</span>
                    <span className="shrink-0 whitespace-nowrap font-mono tabular-nums text-navy">
                      {item.bounds && item.value !== null
                        ? formatTimeFromMinutes(item.value, calendarLocale)
                        : t("loading")}
                    </span>
                  </span>
                  <input
                    className={filterRangeClass}
                    type="range"
                    min={item.bounds?.min ?? 0}
                    max={item.bounds?.max ?? 0}
                    step={15}
                    value={item.value ?? item.bounds?.max ?? 0}
                    disabled={!item.bounds}
                    onPointerUp={onFilterCommit}
                    onMouseUp={onFilterCommit}
                    onTouchEnd={onFilterCommit}
                    onKeyUp={onFilterCommit}
                    onBlur={onFilterCommit}
                    onChange={(event) => {
                      onFilterChange();
                      item.setValue(Number(event.target.value));
                    }}
                  />
                </label>
              ))}
            </div>
          </CompactFilterSection>
          <CompactFilterSection
            title={t("duration")}
            count={compactSectionCounts.duration}
            sectionId="duration"
            openSection={effectiveCompactOpenSection}
            setOpenSection={setCompactOpenSection}
          >
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs font-medium text-slate-600">
              <span className="min-w-0 truncate">{t("totalTripTime")}</span>
              <span className="shrink-0 whitespace-nowrap font-mono tabular-nums text-navy">
                {durationBounds && maxDurationMinutes !== null
                  ? formatDurationFromMinutes(maxDurationMinutes, t)
                  : t("loading")}
              </span>
            </div>
            <input
              aria-label={t("duration")}
              className={filterRangeClass}
              type="range"
              min={durationBounds?.min ?? 0}
              max={durationBounds?.max ?? 0}
              step={15}
              value={maxDurationMinutes ?? durationBounds?.max ?? 0}
              disabled={!durationBounds}
              onPointerUp={onFilterCommit}
              onMouseUp={onFilterCommit}
              onTouchEnd={onFilterCommit}
              onKeyUp={onFilterCommit}
              onBlur={onFilterCommit}
              onChange={(event) => {
                onFilterChange();
                setMaxDurationMinutes(Number(event.target.value));
              }}
            />
          </CompactFilterSection>
          {renderQualitySection ? (
            <CompactFilterSection
              title={t("flightQuality")}
              count={compactSectionCounts.quality}
              sectionId="quality"
              openSection={effectiveCompactOpenSection}
              setOpenSection={setCompactOpenSection}
            >
              {flightQualityOptions.map((option) => (
                <FilterOptionRow
                  compact
                  key={option.value}
                  label={option.label}
                  count={option.count}
                  checked={selectedFlightQuality.includes(option.value)}
                  onChange={() => {
                    toggleFilterValue(option.value, setSelectedFlightQuality);
                    onFilterCommit();
                  }}
                />
              ))}
            </CompactFilterSection>
          ) : null}
          <CompactFilterSection
            title={t("stops")}
            count={compactSectionCounts.stops}
            sectionId="stops"
            openSection={effectiveCompactOpenSection}
            setOpenSection={setCompactOpenSection}
            emptyText={t("stopsAppearAfterResultsLoad")}
          >
            {stopOptions.map((option) => (
              <FilterOptionRow
                compact
                key={option.value}
                label={option.label}
                count={option.count}
                secondaryLabel={option.secondaryLabel}
                rightLabel={option.rightLabel}
                checked={selectedStops.includes(option.value)}
                onChange={() => {
                  toggleFilterValue(option.value, setSelectedStops);
                  onFilterCommit();
                }}
              />
            ))}
          </CompactFilterSection>
          <CompactFilterSection
            title={t("airlines")}
            count={compactSectionCounts.airlines}
            sectionId="airlines"
            openSection={effectiveCompactOpenSection}
            setOpenSection={setCompactOpenSection}
            emptyText={t("airlinesAppearAfterResultsLoad")}
          >
            {airlineOptions.map((option) => (
              <FilterOptionRow
                compact
                key={option.value}
                label={option.label}
                count={option.count}
                checked={selectedAirlines.includes(option.value)}
                onChange={() => {
                  toggleFilterValue(option.value, setSelectedAirlines);
                  onFilterCommit();
                }}
              />
            ))}
          </CompactFilterSection>
          <CompactFilterSection
            title={t("airports")}
            count={compactSectionCounts.airports}
            sectionId="airports"
            openSection={effectiveCompactOpenSection}
            setOpenSection={setCompactOpenSection}
            emptyText={t("airportsAppearAfterResultsLoad")}
          >
            {airportOptions.map((option) => (
              <FilterOptionRow
                compact
                key={option.value}
                label={option.label}
                count={option.count}
                checked={selectedAirports.includes(option.value)}
                onChange={() => {
                  toggleFilterValue(option.value, setSelectedAirports);
                  onFilterCommit();
                }}
              />
            ))}
          </CompactFilterSection>
          <CompactFilterSection
            title={t("amenities")}
            count={compactSectionCounts.amenities}
            sectionId="amenities"
            openSection={effectiveCompactOpenSection}
            setOpenSection={setCompactOpenSection}
          >
            <FilterOptionRow
              compact
              label={t("baggageIncluded")}
              checked={baggageIncludedOnly}
              onChange={() => {
                setBaggageIncludedOnly(!baggageIncludedOnly);
                onFilterCommit();
              }}
            />
            <FilterOptionRow
              compact
              label={t("flexibleRefundable")}
              checked={flexibleOnly}
              onChange={() => {
                setFlexibleOnly(!flexibleOnly);
                onFilterCommit();
              }}
            />
          </CompactFilterSection>
        </div>
      </div>
    );
  }

  if (layout === "desktop") {
    return null;
  }

  return (
    <div className="bg-white">
      <div className={cn("space-y-4 bg-white")}>
        <section>
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
          <div className="grid grid-cols-2 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTimeFilterMode("takeoff")}
              className={cn(
                "rounded-full px-2 py-1.5 text-xs font-bold transition",
                timeFilterMode === "takeoff"
                  ? "bg-white text-[#004BB8] shadow-sm ring-1 ring-slate-200/70"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              {t("takeoff")}
            </button>
            <button
              type="button"
              onClick={() => setTimeFilterMode("landing")}
              className={cn(
                "rounded-full px-2 py-1.5 text-xs font-bold transition",
                timeFilterMode === "landing"
                  ? "bg-white text-[#004BB8] shadow-sm ring-1 ring-slate-200/70"
                  : "text-slate-600 hover:text-slate-900",
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
                onPointerUp={onFilterCommit}
                onMouseUp={onFilterCommit}
                onTouchEnd={onFilterCommit}
                onKeyUp={onFilterCommit}
                onBlur={onFilterCommit}
                onChange={(event) => {
                  onFilterChange();
                  setMaxTakeoffMinutes(Number(event.target.value));
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-medium tabular-nums text-slate-500">
                <span>
                  {timeBounds.takeoff
                    ? formatTimeFromMinutes(
                        timeBounds.takeoff.min,
                        calendarLocale,
                      )
                    : "—"}
                </span>
                <span>
                  {timeBounds.takeoff
                    ? formatTimeFromMinutes(
                        timeBounds.takeoff.max,
                        calendarLocale,
                      )
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
                onPointerUp={onFilterCommit}
                onMouseUp={onFilterCommit}
                onTouchEnd={onFilterCommit}
                onKeyUp={onFilterCommit}
                onBlur={onFilterCommit}
                onChange={(event) => {
                  onFilterChange();
                  setMaxLandingMinutes(Number(event.target.value));
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-medium tabular-nums text-slate-500">
                <span>
                  {timeBounds.landing
                    ? formatTimeFromMinutes(
                        timeBounds.landing.min,
                        calendarLocale,
                      )
                    : "—"}
                </span>
                <span>
                  {timeBounds.landing
                    ? formatTimeFromMinutes(
                        timeBounds.landing.max,
                        calendarLocale,
                      )
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
                ? formatDurationFromMinutes(maxDurationMinutes, t)
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
                ? formatDurationFromMinutes(durationBounds.min, t)
                : "—"}
            </span>
            <span>
              {durationBounds
                ? formatDurationFromMinutes(durationBounds.max, t)
                : "—"}
            </span>
          </div>
        </FilterSection>

        {renderQualitySection ? (
          <FilterSection title={t("flightQuality")}>
            {flightQualityOptions.map((option) => (
              <FilterOptionRow
                key={option.value}
                label={option.label}
                count={option.count}
                checked={selectedFlightQuality.includes(option.value)}
                onChange={() => {
                  toggleFilterValue(option.value, setSelectedFlightQuality);
                  onFilterCommit();
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
                onFilterCommit();
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
                onFilterCommit();
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
                onFilterCommit();
              }}
            />
          ))}
        </FilterSection>

        <FilterSection title={t("amenities")}>
          <FilterOptionRow
            label={t("baggageIncluded")}
            checked={baggageIncludedOnly}
            onChange={() => {
              setBaggageIncludedOnly(!baggageIncludedOnly);
              onFilterCommit();
            }}
          />
          <FilterOptionRow
            label={t("flexibleRefundable")}
            checked={flexibleOnly}
            onChange={() => {
              setFlexibleOnly(!flexibleOnly);
              onFilterCommit();
            }}
          />
        </FilterSection>
      </div>
    </div>
  );
}

function CompactFilterSection({
  title,
  count,
  sectionId,
  openSection,
  setOpenSection,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  sectionId: Exclude<CompactFilterSectionId, null>;
  openSection: CompactFilterSectionId;
  setOpenSection: Dispatch<SetStateAction<CompactFilterSectionId>>;
  emptyText?: string;
  children: ReactNode;
}) {
  const isOpen = openSection === sectionId;
  const panelId = `compact-filter-${sectionId}-panel`;
  const hasOptions =
    Boolean(children) && (!Array.isArray(children) || children.length > 0);

  return (
    <section className="border-t border-[#D8E1EC]/75 first:border-t-0">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={cn(
          "group flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-start text-[13px] font-semibold leading-5 tracking-[-0.005em] text-slate-800 transition-colors duration-200 motion-reduce:transition-none hover:bg-[#E5ECF4] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30",
          isOpen && "text-[#004BB8]",
        )}
        onClick={() => {
          setOpenSection((current) =>
            current === sectionId ? null : sectionId,
          );

          if (typeof window !== "undefined") {
            window.requestAnimationFrame(() => {
              window.dispatchEvent(new Event("resize"));
            });
          }
        }}
      >
        <span className="min-w-0 truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {count > 0 ? (
            <span className="min-w-5 rounded-full bg-[#E2EAF3] px-2 py-0.5 text-center text-[11px] font-semibold normal-case leading-4 tracking-normal text-[#235A9F] ring-1 ring-[#004BB8]/10 group-hover:bg-[#DCE8F6]">
              {count}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "h-3.5 w-3.5 text-slate-500 transition duration-200 motion-reduce:transition-none group-hover:text-[#004BB8]",
              isOpen && "rotate-180 text-[#004BB8]",
            )}
            strokeWidth={2.3}
          />
        </span>
      </button>
      <div
        id={panelId}
        className={cn(
          "grid h-auto gap-0.5 overflow-visible bg-transparent px-2.5 pb-3 pt-0.5",
          !isOpen && "hidden",
        )}
      >
        {hasOptions ? (
          children
        ) : (
          <p className="py-1 text-xs font-normal text-slate-500">{emptyText}</p>
        )}
      </div>
    </section>
  );
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
    <section className="border-t border-slate-200/75 py-4 first:border-t-0">
      <h3 className="mb-2.5 text-sm font-bold leading-5 tracking-[-0.005em] text-slate-950">
        {title}
      </h3>
      <div className="grid gap-0.5">
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
  compact = false,
}: {
  label: string;
  count?: number;
  secondaryLabel?: string;
  rightLabel?: string;
  checked: boolean;
  onChange: () => void;
  compact?: boolean;
}) {
  const trailingLabel =
    rightLabel ?? (typeof count === "number" ? String(count) : null);

  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between rounded-lg font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus-within:bg-slate-50 focus-within:text-slate-950",
        compact
          ? "min-h-8 gap-2 px-1.5 py-1 text-[13px]"
          : "min-h-11 gap-3 px-1.5 py-1.5 text-[13px] leading-5",
      )}
    >
      <span
        className={cn(
          "flex min-w-0 items-center",
          compact ? "gap-1.5" : "gap-2",
        )}
      >
        <input
          type="checkbox"
          className={cn(
            "mt-0.5 shrink-0 rounded border-slate-300 accent-blue focus-visible:ring-2 focus-visible:ring-[#004BB8]/25",
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
          checked={checked}
          onChange={onChange}
        />
        <span className="min-w-0">
          <span className="block truncate">{label}</span>
          {secondaryLabel ? (
            <span className="block text-[12px] font-medium leading-4 text-slate-500">
              {secondaryLabel}
            </span>
          ) : null}
        </span>
      </span>
      {trailingLabel ? (
        <span className="shrink-0 text-[12px] font-medium leading-5 text-slate-500">
          {trailingLabel}
        </span>
      ) : null}
    </label>
  );
}
