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
  ArrowLeft,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { FlightCard } from "@/components/results/FlightCard";
import { DesktopFlightFilters } from "@/components/results/DesktopFlightFilters";
import { MobileAirportPicker } from "@/components/search/MobileAirportPicker";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { Button } from "@/components/ui/Button";
import { FlightCardSkeleton } from "@/components/ui/Skeleton";
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
  readSavedTripIds,
  toggleSavedTripId,
  writeSavedTripIds,
} from "@/lib/saved-trips-local";
import {
  deleteBackendTrip,
  fetchBackendSavedTrips,
  getSavedTripLocalId,
  saveBackendTrip,
  type SavedTripDisplayDetails,
} from "@/lib/saved-trips-api";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import type { PublicFlightResult, SortMode } from "@/lib/types";
import { cn, getItineraryDateKey } from "@/lib/utils";
import {
  calculateCompactFilterPlacement,
  shouldRenderFlightQualityFilter,
  shouldShowDesktopCompactFilter,
} from "@/lib/flights/desktopCompactFilter";
import { translations as enTranslations } from "@/lib/i18n/en";
import {
  formatFlightsDateSummary,
  formatFlightsMonthHeading,
  normalizeFlightsCalendarLocale,
} from "@/lib/flights/dateFormatting";

const resultStackClass = "w-full min-w-0";
const desktopCompactFilterTopOffset = 116;
type MobileShortcutMenu = "sort" | "airlines" | "stops" | "airports";
type MobileShortcutMenuPosition = { top: number; left: number; width: number };
type DesktopCompactFilterFrame = {
  left: number;
  width: number;
};
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

const nearbyFareRangeSize = 14;
const nearbyFareDaysBeforeAnchor = 6;
const nearbyFareRequestConcurrency = 4;
const nearbyFareCacheTtlMs = 10 * 60 * 1000;

type DesktopCompactFilterPlacementState = "hidden" | "fixed" | "docked";

type BodyScrollLock = {
  restore: (options?: { restoreScroll?: boolean }) => void;
};

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
    display?: SavedTripDisplayDetails,
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

function lockMobileOverlayScroll() {
  const bodyElement = document.body;
  const rootElement = document.documentElement;
  const scrollbarWidth = Math.max(
    0,
    window.innerWidth - rootElement.clientWidth,
  );
  let restored = false;
  const previousBodyStyles = {
    overflow: bodyElement.style.overflow,
    overscrollBehavior: bodyElement.style.overscrollBehavior,
    paddingRight: bodyElement.style.paddingRight,
  };
  const previousRootStyles = {
    overflow: rootElement.style.overflow,
    overscrollBehavior: rootElement.style.overscrollBehavior,
  };

  if (scrollbarWidth > 0) {
    const computedPaddingRight =
      window.getComputedStyle(bodyElement).paddingRight;
    bodyElement.style.paddingRight = `calc(${computedPaddingRight} + ${scrollbarWidth}px)`;
  }

  bodyElement.style.overflow = "hidden";
  bodyElement.style.overscrollBehavior = "none";
  rootElement.style.overflow = "hidden";
  rootElement.style.overscrollBehavior = "none";

  return {
    restore: () => {
      if (restored) return;
      restored = true;
      bodyElement.style.overflow = previousBodyStyles.overflow;
      bodyElement.style.overscrollBehavior =
        previousBodyStyles.overscrollBehavior;
      bodyElement.style.paddingRight = previousBodyStyles.paddingRight;
      rootElement.style.overflow = previousRootStyles.overflow;
      rootElement.style.overscrollBehavior =
        previousRootStyles.overscrollBehavior;
    },
  };
}

function lockDocumentScrollWithoutLayoutShift() {
  const bodyElement = document.body;
  const rootElement = document.documentElement;
  const scrollY = window.scrollY;
  const scrollbarWidth = window.innerWidth - rootElement.clientWidth;
  let restored = false;
  const previousBodyStyles = {
    overflow: bodyElement.style.overflow,
    overscrollBehavior: bodyElement.style.overscrollBehavior,
    paddingRight: bodyElement.style.paddingRight,
  };
  const previousRootStyles = {
    overflow: rootElement.style.overflow,
    overscrollBehavior: rootElement.style.overscrollBehavior,
  };

  rootElement.style.overflow = "hidden";
  bodyElement.style.overflow = "hidden";
  rootElement.style.overscrollBehavior = "none";
  bodyElement.style.overscrollBehavior = "none";

  if (scrollbarWidth > 0) {
    bodyElement.style.paddingRight = `${scrollbarWidth}px`;
  }

  return {
    restore: ({ restoreScroll = true }: { restoreScroll?: boolean } = {}) => {
      if (restored) return;
      restored = true;
      rootElement.style.overflow = previousRootStyles.overflow;
      rootElement.style.overscrollBehavior =
        previousRootStyles.overscrollBehavior;
      bodyElement.style.overflow = previousBodyStyles.overflow;
      bodyElement.style.overscrollBehavior =
        previousBodyStyles.overscrollBehavior;
      bodyElement.style.paddingRight = previousBodyStyles.paddingRight;

      if (restoreScroll && window.scrollY !== scrollY) {
        window.requestAnimationFrame(() => {
          if (window.scrollY !== scrollY) {
            window.scrollTo(0, scrollY);
          }
        });
      }
    },
  };
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
  const [desktopSortOpen, setDesktopSortOpen] = useState(false);
  const desktopSortRef = useRef<HTMLDivElement | null>(null);
  const desktopSortButtonRef = useRef<HTMLButtonElement | null>(null);
  const [results, setResults] = useState<PublicFlightResult[]>([]);
  const activeFlightSearchKeyRef = useRef<string>("");
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileSortMenuOpen, setMobileSortMenuOpen] = useState(false);
  const [mobileAirportMenuOpen, setMobileAirportMenuOpen] = useState(false);
  const [mobileStopsMenuOpen, setMobileStopsMenuOpen] = useState(false);
  const [mobileAirlineMenuOpen, setMobileAirlineMenuOpen] = useState(false);
  const [mobileShortcutMenuPosition, setMobileShortcutMenuPosition] =
    useState<MobileShortcutMenuPosition | null>(null);
  const [showMobileBackToTop, setShowMobileBackToTop] = useState(false);
  const mobileSortMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileAirportMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileStopsMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileAirlineMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileShortcutMenuContentRef = useRef<HTMLDivElement | null>(null);
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
  const nearbyFareStripScrollRef = useRef<HTMLDivElement | null>(null);
  const [nearbyFares, setNearbyFares] = useState<NearbyFareState[]>([]);
  const [nearbyFareCanScrollPrevious, setNearbyFareCanScrollPrevious] =
    useState(false);
  const [nearbyFareCanScrollNext, setNearbyFareCanScrollNext] =
    useState(false);
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
  const [mobileCompactHeaderVisible, setMobileCompactHeaderVisible] =
    useState(false);
  const [activeMobileAirportPicker, setActiveMobileAirportPicker] = useState<
    "origin" | "destination" | null
  >(null);
  const mobileSearchSummarySentinelRef = useRef<HTMLDivElement | null>(null);
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
  const { status: sessionStatus } = useSession();
  const [savedTripIds, setSavedTripIds] = useState<string[]>([]);
  const [backendSavedTripIds, setBackendSavedTripIds] = useState<
    Record<string, string>
  >({});
  const [savedTripError, setSavedTripError] = useState("");

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
  const departureWrapRef = useRef<HTMLDivElement | null>(null);
  const returnWrapRef = useRef<HTMLDivElement | null>(null);
  const travelerCabinWrapRef = useRef<HTMLDivElement | null>(null);
  const stickySentinelRef = useRef<HTMLDivElement | null>(null);
  const stickySearchPanelRef = useRef<HTMLDivElement | null>(null);
  const stickySearchPopoutRef = useRef<HTMLFormElement | null>(null);
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const expandedSearchScrollYRef = useRef(0);
  const filterApplyingTimeoutRef = useRef<number | null>(null);
  const filtersHydratedFromUrlRef = useRef(false);
  const hydratedFilterQueryStringRef = useRef<string | null>(null);
  const lastWrittenFilterQueryStringRef = useRef<string | null>(null);
  const mobileSearchScrollLockRef = useRef<BodyScrollLock | null>(null);
  const mobileFiltersScrollLockRef = useRef<BodyScrollLock | null>(null);
  const mobileSearchLauncherRef = useRef<HTMLElement | null>(null);
  const mobileFiltersLauncherRef = useRef<HTMLElement | null>(null);
  const shouldRestoreMobileSearchFocusRef = useRef(true);
  const shouldRestoreMobileFiltersFocusRef = useRef(true);
  const shouldScrollToTopAfterFilterApplyRef = useRef(false);
  const stickySearchScrollLockRef = useRef<BodyScrollLock | null>(null);
  const stickySearchPanelOpenRef = useRef(false);
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
  const shouldRenderDesktopFullSearchForm = true;
  const shouldShowDesktopCompactSummary = false;
  const showFullSearchForm =
    shouldRenderDesktopFullSearchForm ||
    !isSearchCollapsed ||
    isSearchExpandedWhileSticky;
  const showCompactSearchSummary =
    !shouldRenderDesktopFullSearchForm &&
    isSearchCollapsed &&
    !isSearchExpandedWhileSticky;
  const savedRoutes = useMemo(
    () =>
      savedTripIds
        .map((id) => discoveryById.get(id))
        .filter((item): item is HomeDiscoveryItem => Boolean(item)),
    [savedTripIds],
  );

  const markExpandedSearchInteraction = useCallback(() => {}, []);

  const expandStickySearch = useCallback(() => {
    const currentScrollY = window.scrollY;
    expandedSearchScrollYRef.current = currentScrollY;
    setIsSearchExpandedWhileSticky(true);
  }, []);

  const isStickySearchPanelOpen =
    isSearchCollapsed && isSearchExpandedWhileSticky;

  useEffect(() => {
    stickySearchPanelOpenRef.current = isStickySearchPanelOpen;
  }, [isStickySearchPanelOpen]);

  const collapseStickySearch = useCallback(
    ({ restoreScroll = true }: { restoreScroll?: boolean } = {}) => {
      const activeScrollLock = stickySearchScrollLockRef.current;

      if (!restoreScroll && activeScrollLock) {
        activeScrollLock.restore({ restoreScroll: false });
        stickySearchScrollLockRef.current = null;
      }

      setIsSearchExpandedWhileSticky(false);
      setTripTypeMenuOpen(false);
      setActiveSuggest(null);
      setDropdownPosition(null);
      setActiveDatePicker(null);
      setDatePickerPosition(null);
      setTravelerPopoverOpen(false);
      setTravelerPopoverPosition(null);
      setActiveDesktopSearchSurface(null);
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
    if (!isStickySearchPanelOpen) {
      return undefined;
    }

    const handleStickyPanelPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const panel = stickySearchPopoutRef.current;
      const compactBar = stickySearchPanelRef.current;
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
        setTripTypeMenuOpen(false);
        return;
      }

      collapseStickySearch();
    };

    document.addEventListener("mousedown", handleStickyPanelPointerDown);
    document.addEventListener("keydown", handleStickyPanelKeyDown);

    return () => {
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
    if (!isStickySearchPanelOpen) {
      stickySearchScrollLockRef.current?.restore();
      stickySearchScrollLockRef.current = null;
      return undefined;
    }

    stickySearchScrollLockRef.current = lockDocumentScrollWithoutLayoutShift();

    return () => {
      stickySearchScrollLockRef.current?.restore();
      stickySearchScrollLockRef.current = null;
    };
  }, [isStickySearchPanelOpen]);

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

  useEffect(() => {
    if (loading || typeof window === "undefined") {
      return undefined;
    }

    const sentinel = mobileSearchSummarySentinelRef.current;

    const updateFromSentinel = () => {
      const currentSentinel = mobileSearchSummarySentinelRef.current;

      if (!currentSentinel) {
        setMobileCompactHeaderVisible(false);
        return;
      }

      const rect = currentSentinel.getBoundingClientRect();
      setMobileCompactHeaderVisible(rect.bottom < 8 && window.scrollY > 96);
    };

    updateFromSentinel();

    if (typeof IntersectionObserver === "undefined" || !sentinel) {
      window.addEventListener("scroll", updateFromSentinel, { passive: true });
      window.addEventListener("resize", updateFromSentinel);

      return () => {
        window.removeEventListener("scroll", updateFromSentinel);
        window.removeEventListener("resize", updateFromSentinel);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setMobileCompactHeaderVisible(
          !entry.isIntersecting && window.scrollY > 96,
        );
      },
      { rootMargin: "-8px 0px 0px 0px", threshold: 0 },
    );

    observer.observe(sentinel);
    window.addEventListener("scroll", updateFromSentinel, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateFromSentinel);
    };
  }, [loading]);

  const refreshBackendSavedTrips = useCallback(async (signal?: AbortSignal) => {
    const result = await fetchBackendSavedTrips(signal);
    if (!result.ok || !result.items) return;

    const backendIds: Record<string, string> = {};
    const localIds = result.items.map((item) => {
      const localId = getSavedTripLocalId(item);
      backendIds[localId] = item.id;
      return localId;
    });

    setBackendSavedTripIds(backendIds);
    setSavedTripIds(localIds);
  }, []);

  useEffect(() => {
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
  }, [refreshBackendRecentSearches, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (sessionStatus === "authenticated") {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => {
        void refreshBackendSavedTrips(controller.signal);
      }, 0);
      return () => {
        window.clearTimeout(timeoutId);
        controller.abort();
      };
    }

    const timeoutId = window.setTimeout(() => {
      setBackendSavedTripIds({});
      setSavedTripIds(readSavedTripIds());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshBackendSavedTrips, sessionStatus]);

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

  const closeMobileShortcutMenus = useCallback(() => {
    setMobileSortMenuOpen(false);
    setMobileAirportMenuOpen(false);
    setMobileStopsMenuOpen(false);
    setMobileAirlineMenuOpen(false);
    setMobileShortcutMenuPosition(null);
  }, [
    setMobileAirlineMenuOpen,
    setMobileAirportMenuOpen,
    setMobileShortcutMenuPosition,
    setMobileSortMenuOpen,
    setMobileStopsMenuOpen,
  ]);

  const getActiveMobileShortcutMenu =
    useCallback((): MobileShortcutMenu | null => {
      if (mobileSortMenuOpen) return "sort";
      if (mobileAirlineMenuOpen) return "airlines";
      if (mobileStopsMenuOpen) return "stops";
      if (mobileAirportMenuOpen) return "airports";
      return null;
    }, [
      mobileAirlineMenuOpen,
      mobileAirportMenuOpen,
      mobileSortMenuOpen,
      mobileStopsMenuOpen,
    ]);

  const positionMobileShortcutMenu = useCallback(
    (rect: DOMRect, width: number) => {
      if (typeof window === "undefined") return;

      const gutter = 16;
      const safeWidth = Math.min(width, window.innerWidth - gutter * 2);
      const left = Math.min(
        Math.max(rect.left, gutter),
        window.innerWidth - safeWidth - gutter,
      );

      setMobileShortcutMenuPosition({
        top: Math.min(rect.bottom + 8, window.innerHeight - gutter),
        left,
        width: safeWidth,
      });
    },
    [setMobileShortcutMenuPosition],
  );

  useEffect(() => {
    const activeMenu = getActiveMobileShortcutMenu();
    if (!activeMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;

      const triggerRef = {
        sort: mobileSortMenuRef,
        airlines: mobileAirlineMenuRef,
        stops: mobileStopsMenuRef,
        airports: mobileAirportMenuRef,
      }[activeMenu];

      if (
        triggerRef.current?.contains(event.target) ||
        mobileShortcutMenuContentRef.current?.contains(event.target)
      ) {
        return;
      }

      closeMobileShortcutMenus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileShortcutMenus();
    };
    const handleViewportChange = () => closeMobileShortcutMenus();

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, [closeMobileShortcutMenus, getActiveMobileShortcutMenu]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const threshold = 600;
    const handleScroll = () => {
      const shouldShow = window.scrollY > threshold;
      setShowMobileBackToTop((current) =>
        current === shouldShow ? current : shouldShow,
      );
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    const releaseExistingLock = () => {
      const launcher = mobileSearchLauncherRef.current;
      const shouldRestoreFocus = shouldRestoreMobileSearchFocusRef.current;

      mobileSearchScrollLockRef.current?.restore();
      mobileSearchScrollLockRef.current = null;
      shouldRestoreMobileSearchFocusRef.current = true;

      if (shouldRestoreFocus && launcher?.isConnected) {
        launcher.focus({ preventScroll: true });
      }
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

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileSearchDrawer();
      }
    };

    mobileSearchScrollLockRef.current ??= lockMobileOverlayScroll();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      releaseExistingLock();
    };
  }, [mobileSearchOpen]);

  useLayoutEffect(() => {
    const releaseExistingLock = () => {
      const launcher = mobileFiltersLauncherRef.current;
      const shouldRestoreFocus = shouldRestoreMobileFiltersFocusRef.current;

      mobileFiltersScrollLockRef.current?.restore();
      mobileFiltersScrollLockRef.current = null;
      shouldRestoreMobileFiltersFocusRef.current = true;

      if (shouldRestoreFocus && launcher?.isConnected) {
        launcher.focus({ preventScroll: true });
      }
    };

    if (!filtersOpen || typeof window === "undefined") {
      releaseExistingLock();
      return releaseExistingLock;
    }

    const mobileQuery = window.matchMedia("(max-width: 1023px)");

    if (!mobileQuery.matches) {
      releaseExistingLock();
      return releaseExistingLock;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileFiltersDrawer();
      }
    };

    mobileFiltersScrollLockRef.current ??= lockMobileOverlayScroll();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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
    restoreMobileSearchScrollPosition();
  }

  function openMobileDatePicker() {
    rememberMobileSearchScrollPosition();
    setDraftMobileDepartureDate(departureDateInput);
    setDraftMobileReturnDate(returnDateInput);
    setActiveDatePicker("departure");
    setDatePickerPosition(null);
  }

  function commitMobileDatePicker() {
    const nextDepartureDate = draftMobileDepartureDate.trim();
    const nextReturnDate = draftMobileReturnDate.trim();
    const hasValidDepartureDate =
      isValidFutureOrTodayDateValue(nextDepartureDate);
    const hasValidReturnDate =
      tripTypeInput !== "round-trip" ||
      (isValidFutureOrTodayDateValue(nextReturnDate) &&
        !isDateValueBefore(nextReturnDate, nextDepartureDate));

    if (!hasValidDepartureDate || !hasValidReturnDate) return;

    setDepartureDateInput(nextDepartureDate);
    setReturnDateInput(tripTypeInput === "round-trip" ? nextReturnDate : "");
    setActiveDatePicker(null);
    setDatePickerPosition(null);
    restoreMobileSearchScrollPosition();
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

  function openMobileSearchDrawer(launcher?: HTMLElement | null) {
    mobileSearchLauncherRef.current = launcher ?? null;
    closeMobileFiltersDrawer({ restoreFocus: false });
    closeFlightSearchPopovers();
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 639px)").matches
    ) {
      mobileSearchScrollLockRef.current ??= lockMobileOverlayScroll();
    }
    setMobileSearchOpen(true);
  }

  function openMobileFiltersDrawer(launcher?: HTMLElement | null) {
    mobileFiltersLauncherRef.current = launcher ?? null;
    closeMobileShortcutMenus();
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      mobileFiltersScrollLockRef.current ??= lockMobileOverlayScroll();
    }
    setFiltersOpen(true);
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

  async function handleSavedRouteToggle(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string,
    display?: SavedTripDisplayDetails,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (sessionStatus !== "authenticated") {
      setSavedTripError("");
      setSavedTripIds((current) => {
        const next = toggleSavedTripId(current, itemId);
        writeSavedTripIds(next);
        return next;
      });
      return;
    }

    if (savedTripIds.includes(itemId)) {
      const backendId = backendSavedTripIds[itemId];
      if (!backendId) {
        await refreshBackendSavedTrips();
        return;
      }

      const result = await deleteBackendTrip(backendId);
      if (result.ok) {
        setSavedTripError("");
        setSavedTripIds((current) => current.filter((id) => id !== itemId));
        setBackendSavedTripIds((current) => {
          const next = { ...current };
          delete next[itemId];
          return next;
        });
      } else {
        setSavedTripError(
          result.error ?? "Unable to update saved trips right now.",
        );
        await refreshBackendSavedTrips();
      }
      return;
    }

    const result = await saveBackendTrip(itemId, display);
    if (result.ok || result.duplicate) {
      setSavedTripError("");
      await refreshBackendSavedTrips();
    } else {
      setSavedTripError(result.error ?? "Unable to save trip right now.");
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
    if (!body) {
      activeFlightSearchKeyRef.current = "";
      const resetTimer = window.setTimeout(() => {
        setResults([]);
        setWarnings([]);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    let active = true;
    const searchKey = buildFlightResultsSearchKey(body);
    activeFlightSearchKeyRef.current = searchKey;

    const timer = window.setTimeout(() => {
      if (activeFlightSearchKeyRef.current !== searchKey) return;
      setResults([]);
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
          if (!active || activeFlightSearchKeyRef.current !== searchKey) return;

          setResults(filterResultsByRequestedOutboundDate(data.results, body.departureDate));
          setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
        })
        .catch((searchError) => {
          if (!active || activeFlightSearchKeyRef.current !== searchKey) return;

          setError(
            searchError instanceof Error
              ? t(searchError.message) || searchError.message
              : dictionary.unableToSearchFlights ||
                  enTranslations.unableToSearchFlights ||
                  "Unable to search flights.",
          );
        })
        .finally(() => {
          if (active && activeFlightSearchKeyRef.current === searchKey) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [body, dictionary.unableToSearchFlights, t]);

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

  const updateNearbyFareScrollState = useCallback(() => {
    const strip = nearbyFareStripScrollRef.current;
    if (!strip) {
      setNearbyFareCanScrollPrevious(false);
      setNearbyFareCanScrollNext(false);
      return;
    }

    const maxScrollLeft = Math.max(0, strip.scrollWidth - strip.clientWidth);
    setNearbyFareCanScrollPrevious(strip.scrollLeft > 1);
    setNearbyFareCanScrollNext(strip.scrollLeft < maxScrollLeft - 1);
  }, []);

  useEffect(() => {
    const generation = nearbyFareGenerationRef.current + 1;
    nearbyFareGenerationRef.current = generation;

    const activeRequests = nearbyFareRequestsRef.current;
    activeRequests.forEach((request) => request.controller.abort());
    activeRequests.clear();

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
    const dates = getNearbyFareDateRange(centerDate);
    const fetchedAt = Date.now();
    const currentFare = getLowestProviderFare(results);
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
        window.requestAnimationFrame(updateNearbyFareScrollState);
      }
    }, 0);

    const selectedIndex = dates.indexOf(body.departureDate);
    const prioritizedDates = [...dates]
      .sort((left, right) => {
        const leftDistance = Math.abs(dates.indexOf(left) - selectedIndex);
        const rightDistance = Math.abs(dates.indexOf(right) - selectedIndex);
        return leftDistance - rightDistance;
      })
      .filter((date) => !getFreshNearbyFareCacheEntry(
        nearbyFareCacheRef.current,
        getNearbyFareCacheKey(body, date),
      ));

    async function fetchFareForDate(date: string) {
      if (!body || !active || nearbyFareGenerationRef.current !== generation) return;

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
          const data = (await response.json()) as { results?: PublicFlightResult[] };
          const fare = getLowestProviderFare(data.results ?? []);
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
          if (controller.signal.aborted || !active || nearbyFareGenerationRef.current !== generation) return;

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
          if (nearbyFareRequestsRef.current.get(key)?.controller === controller) {
            nearbyFareRequestsRef.current.delete(key);
          }
        });

      nearbyFareRequestsRef.current.set(key, { controller, promise });
      await promise;
    }

    async function runQueue() {
      let nextIndex = 0;
      const workers = Array.from(
        { length: Math.min(nearbyFareRequestConcurrency, prioritizedDates.length) },
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
  }, [body, results, updateNearbyFareScrollState]);

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
      const useStickyWrap = activeDesktopSearchSurface === "sticky";
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

  function applyMobileFlightDateSelection(date: Date) {
    if (!activeDatePicker) return;

    markExpandedSearchInteraction();

    const nextDateState = getNextFlightDateSelection({
      activePicker: activeDatePicker,
      date,
      departureDate: draftMobileDepartureDate,
      returnDate: draftMobileReturnDate,
      tripType: tripTypeInput,
    });

    if (!nextDateState) return;

    setDraftMobileDepartureDate(nextDateState.departureDate);
    setDraftMobileReturnDate(nextDateState.returnDate);

    if (nextDateState.activePicker) {
      setActiveDatePicker(nextDateState.activePicker);
    }
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

    try {
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

  const priceLabelCurrency = useMemo(
    () => getUniformResultCurrency(results),
    [results],
  );

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



  useLayoutEffect(() => {
    updateNearbyFareScrollState();

    const strip = nearbyFareStripScrollRef.current;
    if (!strip) return;

    const resizeObserver = new ResizeObserver(updateNearbyFareScrollState);
    resizeObserver.observe(strip);

    return () => resizeObserver.disconnect();
  }, [nearbyFares, updateNearbyFareScrollState]);

  const scrollNearbyFareStrip = useCallback(
    (direction: "previous" | "next") => {
      const strip = nearbyFareStripScrollRef.current;
      if (!strip) return;

      const firstCell = strip.querySelector<HTMLElement>(
        "[data-fare-date-cell]",
      );
      const cellWidth = firstCell?.getBoundingClientRect().width ?? 104;
      const gap =
        Number.parseFloat(window.getComputedStyle(strip).columnGap || "0") || 0;
      const distance = cellWidth + gap;

      strip.scrollBy({
        left: direction === "previous" ? -distance : distance,
        behavior: "smooth",
      });

      window.setTimeout(updateNearbyFareScrollState, 240);
    },
    [updateNearbyFareScrollState],
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

  const handleNearbyFareDateSelect = useCallback(
    (date: string) => {
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
    [body, queryString, router, triggerFilterApplying],
  );

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

  const airlineOptions = useMemo(() => {
    const buckets = new Map<
      string,
      { count: number; minPrice: number; currencies: Set<string> }
    >();

    results.forEach((flight) => {
      const airlineName = flight.airlineName.trim();

      if (!airlineName) return;

      const current = buckets.get(airlineName) ?? {
        count: 0,
        minPrice: Number.POSITIVE_INFINITY,
        currencies: new Set<string>(),
      };
      const currencies = new Set(current.currencies);

      if (flight.currency) {
        currencies.add(flight.currency.toUpperCase());
      }

      buckets.set(airlineName, {
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
      label: value,
      count: data.count,
      rightLabel: Number.isFinite(data.minPrice)
        ? formatResultPriceLabel(
            data.minPrice,
            data.currencies.size === 1 ? Array.from(data.currencies)[0] : null,
          )
        : undefined,
    }))
      .sort((first, second) => {
        if (second.count !== first.count) return second.count - first.count;

        return first.label.localeCompare(second.label);
      })
      .slice(0, 8);
  }, [formatResultPriceLabel, results]);

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
    if (renderFlightQualityFilter) {
      count += selectedFlightQuality.length;
    }

    if (baggageIncludedOnly) {
      count += 1;
    }

    if (flexibleOnly) {
      count += 1;
    }

    return count;
  }, [
    baggageIncludedOnly,
    durationBounds,
    flexibleOnly,
    maxDurationMinutes,
    maxLandingMinutes,
    maxPrice,
    maxTakeoffMinutes,
    priceBounds.max,
    renderFlightQualityFilter,
    selectedAirlines.length,
    selectedAirports.length,
    selectedFlightQuality.length,
    selectedStops.length,
    timeBounds.landing,
    timeBounds.takeoff,
  ]);

  const activeFilterLabel = t("activeFilterCount").replace(
    "{{count}}",
    String(activeFilterCount),
  );
  const desktopFilterSidebarRef = useRef<HTMLElement | null>(null);
  const desktopFilterSentinelRef = useRef<HTMLDivElement | null>(null);
  const resultsGridRef = useRef<HTMLDivElement | null>(null);
  const flightResultsTopRef = useRef<HTMLDivElement | null>(null);
  const desktopCompactFilterRef = useRef<HTMLDivElement | null>(null);
  const [showDesktopFilterShortcut, setShowDesktopFilterShortcut] =
    useState(false);
  const [desktopCompactFilterFrame, setDesktopCompactFilterFrame] =
    useState<DesktopCompactFilterFrame | null>(null);
  const [desktopCompactFilterPlacement, setDesktopCompactFilterPlacement] =
    useState<DesktopCompactFilterPlacementState>("hidden");
  const desktopFilterShortcutVisibilityRef = useRef(false);
  const desktopCompactFilterPlacementRef =
    useRef<DesktopCompactFilterPlacementState>("hidden");
  const desktopCompactFilterFrameRef = useRef<DesktopCompactFilterFrame | null>(
    null,
  );
  const desktopCompactFilterHeightRef = useRef(1);
  const scheduleDesktopCompactFilterMeasurementRef = useRef<
    (() => void) | null
  >(null);

  const scrollToFlightResultsTop = useCallback(() => {
    if (typeof window === "undefined") return;

    const target = flightResultsTopRef.current;
    if (!target) return;

    const stickyClearance = desktopCompactFilterTopOffset + 16;
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
    triggerFilterApplying();
    scrollToFlightResultsTop();
  }, [scrollToFlightResultsTop, triggerFilterApplying]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let animationFrameId: number | null = null;

    const applyPlacement = (
      placement: DesktopCompactFilterPlacementState,
      frame: DesktopCompactFilterFrame | null,
    ) => {
      if (placement !== desktopCompactFilterPlacementRef.current) {
        desktopCompactFilterPlacementRef.current = placement;
        setDesktopCompactFilterPlacement(placement);
      }

      const currentFrame = desktopCompactFilterFrameRef.current;
      const frameChanged =
        (frame === null) !== (currentFrame === null) ||
        (frame !== null &&
          currentFrame !== null &&
          (Math.abs(frame.left - currentFrame.left) >= 0.5 ||
            Math.abs(frame.width - currentFrame.width) >= 0.5));

      if (frameChanged) {
        desktopCompactFilterFrameRef.current = frame;
        setDesktopCompactFilterFrame(frame);
      }
    };

    const measureDesktopCompactFilter = () => {
      const sentinel = desktopFilterSentinelRef.current;
      const sidebar = desktopFilterSidebarRef.current;
      const compactPanel = desktopCompactFilterRef.current;
      const resultsBody = resultsGridRef.current;
      const viewportWidth = window.innerWidth;
      const scrollY = window.scrollY;
      const sentinelTop =
        sentinel?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const nextVisibility = shouldShowDesktopCompactFilter({
        viewportWidth,
        sentinelTop,
        topOffset: desktopCompactFilterTopOffset,
      });

      if (nextVisibility !== desktopFilterShortcutVisibilityRef.current) {
        desktopFilterShortcutVisibilityRef.current = nextVisibility;
        setShowDesktopFilterShortcut(nextVisibility);
      }

      if (!nextVisibility || !sidebar || !resultsBody) {
        applyPlacement("hidden", null);
        return;
      }

      const sidebarRect = sidebar.getBoundingClientRect();
      const panelRect = compactPanel?.getBoundingClientRect();
      const bodyRect = resultsBody.getBoundingClientRect();
      const panelHeight =
        panelRect?.height ?? desktopCompactFilterHeightRef.current;

      if (Number.isFinite(panelHeight) && panelHeight > 0) {
        desktopCompactFilterHeightRef.current = panelHeight;
      }

      const placement = calculateCompactFilterPlacement({
        enabled: nextVisibility,
        scrollY,
        desiredTop: desktopCompactFilterTopOffset,
        panelHeight,
        bodyBottomDocument: bodyRect.bottom + scrollY,
        currentState: desktopCompactFilterPlacementRef.current,
      });

      if (placement.state === "hidden") {
        applyPlacement("hidden", null);
        return;
      }

      applyPlacement(placement.state, {
        left: sidebarRect.left,
        width: sidebarRect.width,
      });
    };

    const scheduleMeasurement = () => {
      if (animationFrameId !== null) return;

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        measureDesktopCompactFilter();
      });
    };

    scheduleDesktopCompactFilterMeasurementRef.current = scheduleMeasurement;

    const resizeObserver =
      "ResizeObserver" in window
        ? new ResizeObserver(scheduleMeasurement)
        : null;

    if (resizeObserver) {
      if (desktopFilterSidebarRef.current) {
        resizeObserver.observe(desktopFilterSidebarRef.current);
      }
      if (resultsGridRef.current) {
        resizeObserver.observe(resultsGridRef.current);
      }
    }

    measureDesktopCompactFilter();
    window.addEventListener("scroll", scheduleMeasurement, { passive: true });
    window.addEventListener("resize", scheduleMeasurement);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      scheduleDesktopCompactFilterMeasurementRef.current = null;
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", scheduleMeasurement);
      window.removeEventListener("resize", scheduleMeasurement);
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("ResizeObserver" in window) ||
      desktopCompactFilterPlacement === "hidden" ||
      !desktopCompactFilterRef.current
    ) {
      return undefined;
    }

    const resizeObserver = new ResizeObserver(() => {
      scheduleDesktopCompactFilterMeasurementRef.current?.();
    });

    resizeObserver.observe(desktopCompactFilterRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [desktopCompactFilterPlacement]);

  useEffect(() => {
    if (typeof window === "undefined" || !showDesktopFilterShortcut) return;

    const animationFrameId = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [
    activeFilterCount,
    results.length,
    renderFlightQualityFilter,
    showDesktopFilterShortcut,
  ]);

  const clearFlightFilters = () => {
    handleUserFilterCommit();
    setMaxPrice(priceBounds.max);
    setMaxTakeoffMinutes(timeBounds.takeoff?.max ?? null);
    setMaxLandingMinutes(timeBounds.landing?.max ?? null);
    setMaxDurationMinutes(durationBounds?.max ?? null);
    setSelectedStops([]);
    setSelectedAirlines([]);
    setSelectedAirports([]);
    setSelectedFlightQuality([]);
    setBaggageIncludedOnly(false);
    setFlexibleOnly(false);
  };

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
          !renderFlightQualityFilter ||
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
      renderFlightQualityFilter,
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
      <main className="flex-1 bg-[#F3F6FA] pb-8 pt-4 sm:pt-8 lg:pt-8">
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

            <div className="overflow-visible rounded-[1.65rem] border border-white/70 bg-white/90 p-2.5 shadow-[0_18px_44px_rgba(15,23,42,0.10)] ring-1 ring-slate-950/[0.03] backdrop-blur sm:rounded-none sm:border-slate-200 sm:bg-white sm:p-1.5 sm:shadow-none sm:ring-0 lg:p-1">
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
                        "h-4 w-4 shrink-0 text-slate-500 transition-transform",
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
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#004BB8]">
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

  function renderDesktopMinimizedSearchBar() {
    const stickyLabelClass =
      "text-[0.6rem] font-semibold uppercase leading-3 tracking-[0.13em] text-slate-500/95";
    const stickyValueClass =
      "mt-1 block min-w-0 truncate text-[0.93rem] font-semibold leading-5 text-slate-950";
    const collapsedFieldClass =
      "focus-ring flex min-h-[50px] min-w-0 flex-col justify-center px-4 py-2 text-start transition-colors hover:bg-white/60 focus-visible:bg-white/75";
    const collapsedSeparatorClass = "border-r border-slate-300/60";
    const collapsedConnectorClass =
      "focus-ring flex min-h-[50px] cursor-pointer items-center justify-center bg-slate-50/60 px-1.5 text-[#004BB8] transition-colors hover:bg-white/75 hover:text-[#021C2B] focus-visible:bg-white";
    const stickyDateSummary = departureDateInput
      ? tripTypeInput === "round-trip" && returnDateInput
        ? `${formatCompactDateLabel(departureDateInput, calendarLocale)} – ${formatCompactDateLabel(returnDateInput, calendarLocale)}`
        : formatCompactDateLabel(departureDateInput, calendarLocale)
      : t("travelDates");
    return (
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[100] hidden border-b border-slate-200/80 bg-gradient-to-b from-[#fbfdff]/96 via-[#f8fbff]/94 to-[#f5f9ff]/92 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 lg:block",
          isSearchCollapsed && !isStickySearchPanelOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0",
        )}
        aria-hidden={!isSearchCollapsed || isStickySearchPanelOpen}
      >
        <div ref={stickySearchPanelRef} className="page-shell">
          <div className="mx-auto w-full max-w-5xl">
            <form
              onSubmit={handleCompactSearchSubmit}
              className="group grid min-h-[62px] w-full grid-cols-[minmax(108px,0.72fr)_minmax(140px,1fr)_44px_minmax(140px,1fr)_minmax(150px,1.03fr)_minmax(150px,1.05fr)_auto] items-stretch overflow-hidden rounded-xl border border-slate-300 bg-[#f6f9fd]/95 text-start shadow-[0_14px_34px_-24px_rgba(15,23,42,0.48)] ring-1 ring-white/70 backdrop-blur-md transition hover:border-slate-400/70"
            >
              <button
                type="button"
                aria-expanded={isStickySearchPanelOpen}
                aria-label={t("searchFlights")}
                onClick={expandStickySearch}
                className={cn(collapsedFieldClass, collapsedSeparatorClass)}
              >
                <span className={stickyLabelClass}>{t("tripType")}</span>
                <span className={stickyValueClass}>
                  {mobileTripTypeSummary}
                </span>
              </button>
              <button
                type="button"
                aria-expanded={isStickySearchPanelOpen}
                aria-label={t("searchFlights")}
                onClick={expandStickySearch}
                className={collapsedFieldClass}
              >
                <span className={stickyLabelClass}>{t("origin")}</span>
                <span className={stickyValueClass}>{mobileOriginSummary}</span>
              </button>
              <button
                type="button"
                aria-label={t("swapOriginDestination")}
                onClick={(event) => {
                  event.stopPropagation();
                  handleSwapLocations();
                }}
                className={collapsedConnectorClass}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/65 text-current shadow-[0_4px_12px_rgba(15,23,42,0.06)] ring-1 ring-white/80 transition group-hover:border-slate-400/80">
                  <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
              <button
                type="button"
                aria-expanded={isStickySearchPanelOpen}
                aria-label={t("searchFlights")}
                onClick={expandStickySearch}
                className={cn(collapsedFieldClass, collapsedSeparatorClass)}
              >
                <span className={stickyLabelClass}>{t("destination")}</span>
                <span className={stickyValueClass}>
                  {mobileDestinationSummary}
                </span>
              </button>
              <button
                type="button"
                aria-expanded={isStickySearchPanelOpen}
                aria-label={t("searchFlights")}
                onClick={expandStickySearch}
                className={cn(collapsedFieldClass, collapsedSeparatorClass)}
              >
                <span className={stickyLabelClass}>{t("travelDates")}</span>
                <span className={stickyValueClass}>{stickyDateSummary}</span>
              </button>
              <button
                type="button"
                aria-expanded={isStickySearchPanelOpen}
                aria-label={t("searchFlights")}
                onClick={expandStickySearch}
                className={collapsedFieldClass}
              >
                <span className={stickyLabelClass}>{t("travelers")}</span>
                <span className={stickyValueClass}>{travelerCabinSummary}</span>
              </button>
              <div className="flex items-center border-l border-slate-300/60 bg-white/55 px-3">
                <Button
                  type="submit"
                  className="h-[42px] rounded-lg bg-[#004BB8] px-5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(0,75,184,0.14)] ring-1 ring-[#004BB8]/12 hover:bg-[#021C2B]"
                  onClick={(event) => event.stopPropagation()}
                >
                  {t("search")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  function renderStickySearchPopoutOverlay() {
    const stickyLabelClass =
      "text-[0.62rem] font-semibold uppercase leading-3 tracking-[0.12em] text-slate-500";
    const stickyValueClass =
      "mt-0.5 block min-w-0 truncate text-sm font-semibold leading-5 text-slate-950";
    const panelFieldClass =
      "group relative flex min-h-[58px] min-w-0 flex-col justify-center border-r border-slate-200/80 bg-white/90 px-3 py-1.5 text-start transition-colors hover:bg-white focus-within:z-10 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#004BB8]/20";
    const stickyDateSummary = departureDateInput
      ? tripTypeInput === "round-trip" && returnDateInput
        ? `${formatCompactDateLabel(departureDateInput, calendarLocale)} – ${formatCompactDateLabel(returnDateInput, calendarLocale)}`
        : formatCompactDateLabel(departureDateInput, calendarLocale)
      : t("travelDates");
    const tripTypeOptions = [
      { label: t("oneWay"), value: "one-way" },
      { label: t("roundTrip"), value: "round-trip" },
    ];

    return (
      <>
        {isStickySearchPanelOpen ? (
          <div
            className="fixed inset-0 z-[110] bg-slate-950/30 backdrop-blur-[2px]"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                collapseStickySearch();
              }
            }}
          >
            <div
              className="flex min-h-dvh items-start justify-center px-6 pb-10 pt-24 xl:pt-28"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <form
                ref={stickySearchPopoutRef}
                onSubmit={handleCompactSearchSubmit}
                onChangeCapture={markExpandedSearchInteraction}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
                className="w-full max-w-4xl rounded-2xl border border-slate-200/90 bg-[#fbfaf7]/95 p-4 text-start shadow-[0_30px_90px_-32px_rgba(15,23,42,0.72)] ring-1 ring-white/80 backdrop-blur-md"
              >
                <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200/80 pb-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#004BB8]">
                      {t("searchFlights")}
                    </p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                      {mobileRouteSummary}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {stickyDateSummary} · {travelerCabinSummary}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={t("close")}
                    onClick={() => collapseStickySearch()}
                    className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div
                  role="radiogroup"
                  aria-label={t("tripType")}
                  className="mb-3 flex items-center gap-2 px-0.5"
                >
                  {tripTypeOptions.map((option) => {
                    const selected = tripTypeInput === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => handleTripTypeChange(option.value)}
                        className={cn(
                          "focus-ring inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                          selected
                            ? "bg-[#004BB8]/10 text-[#004BB8]"
                            : "text-slate-500 hover:bg-white hover:text-slate-800",
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "h-2 w-2 rounded-full",
                            selected ? "bg-[#004BB8]" : "bg-slate-300",
                          )}
                        />
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid min-h-[58px] grid-cols-[minmax(0,1.05fr)_44px_minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,1fr)_112px] items-stretch overflow-visible rounded-xl border border-slate-200/85 bg-white/90 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.64)]">
                  <div ref={stickyOriginWrapRef} className={panelFieldClass}>
                    <label
                      className={stickyLabelClass}
                      htmlFor="sticky-results-origin"
                    >
                      {t("origin")}
                    </label>
                    <input
                      id="sticky-results-origin"
                      name="origin"
                      required
                      value={originInput}
                      onFocus={() => {
                        setActiveDesktopSearchSurface("sticky");
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
                        setOriginInput(event.target.value);
                        setOriginCode("");
                        setActiveSuggest(
                          event.target.value.trim().length >= 2
                            ? "origin"
                            : null,
                        );
                      }}
                      placeholder={t("fromPlaceholder")}
                      autoComplete="off"
                      className="mt-0.5 h-5 min-w-0 border-0 bg-transparent p-0 text-sm font-medium leading-5 text-slate-950 outline-none placeholder:text-slate-400"
                    />
                    {activeSuggest === "origin" &&
                    activeDesktopSearchSurface === "sticky" ? (
                      <SuggestionList
                        id="sticky-flight-origin-suggestions"
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

                  <button
                    type="button"
                    aria-label={t("swapOriginDestination")}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSwapLocations();
                    }}
                    className="focus-ring flex min-h-[58px] cursor-pointer items-center justify-center border-r border-slate-200/80 bg-white/90 text-[#5CB6B2] transition-colors hover:bg-blue-50/60 hover:text-[#39948F]"
                  >
                    <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <div
                    ref={stickyDestinationWrapRef}
                    className={panelFieldClass}
                  >
                    <label
                      className={stickyLabelClass}
                      htmlFor="sticky-results-destination"
                    >
                      {t("destination")}
                    </label>
                    <input
                      id="sticky-results-destination"
                      name="destination"
                      required
                      value={destinationInput}
                      onFocus={() => {
                        setActiveDesktopSearchSurface("sticky");
                        setTripTypeMenuOpen(false);
                        setActiveDatePicker(null);
                        setDatePickerPosition(null);
                        setTravelerPopoverOpen(false);
                        setTravelerPopoverPosition(null);
                        if (destinationInput.trim().length >= 2)
                          setActiveSuggest("destination");
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
                        setActiveSuggest(
                          event.target.value.trim().length >= 2
                            ? "destination"
                            : null,
                        );
                      }}
                      placeholder={t("toPlaceholder")}
                      autoComplete="off"
                      className="mt-0.5 h-5 min-w-0 border-0 bg-transparent p-0 text-sm font-medium leading-5 text-slate-950 outline-none placeholder:text-slate-400"
                    />
                    {activeSuggest === "destination" &&
                    activeDesktopSearchSurface === "sticky" ? (
                      <SuggestionList
                        id="sticky-flight-destination-suggestions"
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

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDesktopSearchSurface("sticky");
                        setTripTypeMenuOpen(false);
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                        setTravelerPopoverOpen(false);
                        setTravelerPopoverPosition(null);
                        setActiveDatePicker("departure");
                        setDatePickerPosition(null);
                      }}
                      className={cn(panelFieldClass, "h-full w-full")}
                    >
                      <span className={stickyLabelClass}>
                        {t("travelDates")}
                      </span>
                      <span className={stickyValueClass}>
                        {stickyDateSummary}
                      </span>
                    </button>
                    {activeDatePicker &&
                    activeDesktopSearchSurface === "sticky" ? (
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
                          if (activeDatePicker === "return")
                            setReturnDateInput("");
                        }}
                        onToday={() => {
                          setActiveDatePicker(null);
                          setDatePickerPosition(null);
                        }}
                      />
                    ) : null}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDesktopSearchSurface("sticky");
                        setTripTypeMenuOpen(false);
                        setActiveSuggest(null);
                        setDropdownPosition(null);
                        setActiveDatePicker(null);
                        setDatePickerPosition(null);
                        setTravelerPopoverOpen(true);
                        setTravelerPopoverPosition(null);
                      }}
                      className={cn(panelFieldClass, "h-full w-full")}
                    >
                      <span className={stickyLabelClass}>{t("travelers")}</span>
                      <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2 text-sm font-medium leading-5 text-slate-950">
                        <span className="truncate">{travelerCabinSummary}</span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      </span>
                    </button>
                    {travelerPopoverOpen &&
                    activeDesktopSearchSurface === "sticky" ? (
                      <TravelerCabinPopover
                        alignToField="right"
                        position={
                          travelerPopoverPosition ?? {
                            top: 0,
                            left: 0,
                            width: 0,
                          }
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
                            Math.min(
                              current,
                              nextAdultCount,
                              9 - nextAdultCount,
                            ),
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
                    className="h-full min-h-[58px] rounded-none rounded-r-xl bg-[#004BB8] px-4 text-sm font-bold text-white shadow-none ring-0 hover:bg-[#021C2B]"
                  >
                    {t("search")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </>
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
            launcherRef={useMobileSheet ? departureWrapRef : undefined}
            onClose={
              useMobileSheet
                ? closeMobileDatePicker
                : () => {
                    setActiveDatePicker(null);
                    setDatePickerPosition(null);
                  }
            }
            month={calendarMonth}
            departureValue={
              useMobileSheet ? draftMobileDepartureDate : departureDateInput
            }
            returnValue={
              useMobileSheet ? draftMobileReturnDate : returnDateInput
            }
            activePicker={activeDatePicker}
            tripType={tripTypeInput}
            doneDisabled={
              useMobileSheet &&
              (!isValidFutureOrTodayDateValue(draftMobileDepartureDate) ||
                (tripTypeInput === "round-trip" &&
                  (!isValidFutureOrTodayDateValue(draftMobileReturnDate) ||
                    isDateValueBefore(
                      draftMobileReturnDate,
                      draftMobileDepartureDate,
                    ))))
            }
            onMonthChange={setCalendarMonth}
            onSelect={
              useMobileSheet
                ? applyMobileFlightDateSelection
                : applyFlightDateSelection
            }
            onClear={() => {
              if (activeDatePicker === "departure") {
                if (useMobileSheet) {
                  setDraftMobileDepartureDate("");
                  setDraftMobileReturnDate("");
                } else {
                  setDepartureDateInput("");
                  setReturnDateInput("");
                }
              }

              if (activeDatePicker === "return") {
                if (useMobileSheet) setDraftMobileReturnDate("");
                else setReturnDateInput("");
              }
            }}
            onToday={
              useMobileSheet
                ? commitMobileDatePicker
                : () => {
                    setActiveDatePicker(null);
                    setDatePickerPosition(null);
                  }
            }
          />
        ) : null}

        {travelerPopoverOpen && (useMobileSheet || travelerPopoverPosition) ? (
          <TravelerCabinPopover
            position={travelerPopoverPosition ?? { top: 0, left: 0, width: 0 }}
            mobileSheet={useMobileSheet}
            launcherRef={useMobileSheet ? travelerCabinWrapRef : undefined}
            onClose={
              useMobileSheet
                ? closeMobileTravelerPopover
                : () => {
                    setTravelerPopoverOpen(false);
                    setTravelerPopoverPosition(null);
                  }
            }
            onDone={useMobileSheet ? commitMobileTravelerPopover : undefined}
            adultCount={useMobileSheet ? draftAdultCount : adultCount}
            childCount={useMobileSheet ? draftChildCount : childCount}
            infantCount={useMobileSheet ? draftInfantCount : infantCount}
            cabinClass={useMobileSheet ? draftCabinClassInput : cabinClassInput}
            onAdultChange={(nextValue) => {
              const nextAdultCount = Math.min(9, Math.max(1, nextValue));

              if (useMobileSheet) {
                setDraftAdultCount(nextAdultCount);
                setDraftChildCount((current) =>
                  Math.min(current, 9 - nextAdultCount),
                );
                setDraftInfantCount((current) =>
                  Math.min(current, nextAdultCount, 9 - nextAdultCount),
                );
              } else {
                setAdultCount(nextAdultCount);
                setChildCount((current) =>
                  Math.min(current, 9 - nextAdultCount),
                );
                setInfantCount((current) =>
                  Math.min(current, nextAdultCount, 9 - nextAdultCount),
                );
              }
            }}
            onChildChange={(nextValue) => {
              const nextChildCount = Math.min(
                9 - (useMobileSheet ? draftAdultCount : adultCount),
                Math.max(0, nextValue),
              );

              if (useMobileSheet) {
                setDraftChildCount(nextChildCount);
                setDraftInfantCount((current) =>
                  Math.min(current, 9 - draftAdultCount - nextChildCount),
                );
              } else {
                setChildCount(nextChildCount);
                setInfantCount((current) =>
                  Math.min(current, 9 - adultCount - nextChildCount),
                );
              }
            }}
            onInfantChange={(nextValue) => {
              const currentAdults = useMobileSheet
                ? draftAdultCount
                : adultCount;
              const currentChildren = useMobileSheet
                ? draftChildCount
                : childCount;
              const nextInfantCount = Math.min(
                currentAdults,
                9 - currentAdults - currentChildren,
                Math.max(0, nextValue),
              );

              if (useMobileSheet) setDraftInfantCount(nextInfantCount);
              else setInfantCount(nextInfantCount);
            }}
            onCabinClassChange={
              useMobileSheet ? setDraftCabinClassInput : setCabinClassInput
            }
          />
        ) : null}
      </>
    );
  }

  function renderCompactSearchForm(placement: "mobile" | "desktop") {
    if (placement === "mobile") {
      const mobileFieldClass =
        "rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/[0.025] transition-colors hover:border-slate-300 focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/25";
      const mobileLabelClass =
        "mb-1.5 block text-[0.68rem] font-bold uppercase leading-4 tracking-[0.14em] text-slate-500";
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
            <div className="flex min-h-10 items-center justify-between gap-3">
              <h2
                id="flight-mobile-search-title"
                className="text-[1.15rem] font-bold leading-6 tracking-[-0.01em] text-slate-950"
              >
                {t("editFlightSearch")}
              </h2>

              <button
                type="button"
                aria-label={t("closeEditSearch")}
                onClick={() => closeMobileSearchDrawer()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
              >
                ×
              </button>
            </div>
          </div>

          <div
            ref={mobileSearchScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
              <div
                role="radiogroup"
                aria-label={t("tripType")}
                className="flex min-h-11 items-center gap-5 rounded-2xl bg-slate-50/50 px-1 py-1"
              >
                {mobileTripTypeOptions.map((option) => {
                  const selected = tripTypeInput === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleTripTypeChange(option.value)}
                      className={cn(
                        "focus-ring inline-flex min-h-10 items-center gap-2 rounded-full px-2.5 py-1 text-sm font-semibold transition-colors",
                        selected
                          ? "text-slate-950"
                          : "text-slate-600 hover:text-slate-900",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                          selected
                            ? "border-[#004BB8] bg-white shadow-[0_0_0_3px_rgba(0,75,184,0.10)]"
                            : "border-slate-300 bg-white",
                        )}
                      >
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full transition-colors",
                            selected ? "bg-[#004BB8]" : "bg-transparent",
                          )}
                        />
                      </span>
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>

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
                    setActiveDesktopSearchSurface("sticky");
                    setTripTypeMenuOpen(false);
                    setActiveSuggest(null);
                    setDropdownPosition(null);
                    setTravelerPopoverOpen(false);
                    setTravelerPopoverPosition(null);
                    openMobileDatePicker();
                  }}
                  className={cn(
                    mobileFieldClass,
                    "flex min-h-[68px] w-full items-center gap-3 text-start",
                  )}
                >
                  <Calendar className="h-5 w-5 shrink-0 text-[#004BB8]" />
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
                    setActiveDesktopSearchSurface("sticky");
                    setTripTypeMenuOpen(false);
                    setActiveSuggest(null);
                    setDropdownPosition(null);
                    setActiveDatePicker(null);
                    setDatePickerPosition(null);
                    openMobileTravelerPopover();
                  }}
                  className={cn(
                    mobileFieldClass,
                    "flex min-h-[68px] w-full items-center justify-between gap-3 text-start",
                  )}
                >
                  <span className="min-w-0">
                    <span className={mobileLabelClass}>
                      {t("travelersAndCabin")}
                    </span>
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

              <Button
                type="submit"
                className="mt-1 h-[52px] w-full rounded-2xl bg-[#004BB8] text-base font-bold text-white shadow-[0_10px_22px_rgba(2,28,43,0.14)] ring-1 ring-[#004BB8]/12 hover:bg-[#021C2B]"
              >
                {t("search")}
              </Button>
            </div>
          </div>
        </form>
      );
    }
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

    return (
      <div
        className={cn(
          "mx-auto w-full min-w-0 max-w-full sm:max-w-5xl",
          placement === "desktop" && "hidden sm:block",
        )}
      >
        <div className="flex flex-col gap-0">
          {placement === "desktop" ? (
            <div
              role="radiogroup"
              aria-label={t("tripType")}
              className="hidden translate-y-2 items-center gap-4 px-1 pb-0 sm:flex"
            >
              {[
                { label: t("oneWay"), value: "one-way" },
                { label: t("roundTrip"), value: "round-trip" },
              ].map((option) => {
                const selected = tripTypeInput === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handleTripTypeChange(option.value)}
                    className={cn(
                      "focus-ring inline-flex min-h-6 items-center gap-1.5 rounded-full px-1 py-0.5 text-xs font-medium transition-colors",
                      selected
                        ? "text-slate-900"
                        : "text-slate-500 hover:text-slate-800",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors",
                        selected
                          ? "border-[#004BB8] bg-white shadow-[0_0_0_3px_rgba(0,75,184,0.10)]"
                          : "border-slate-300 bg-white/70",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-colors",
                          selected ? "bg-[#004BB8]" : "bg-transparent",
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
            className="sm:translate-y-4"
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
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.95fr)_minmax(0,1.35fr)_minmax(0,1.12fr)_116px] lg:gap-0">
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
                      className="h-6 w-full border-0 bg-transparent p-0 pe-7 text-[16px] font-semibold leading-6 text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-400 md:text-sm"
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
                      className="h-6 w-full border-0 bg-transparent p-0 pe-7 text-[16px] font-semibold leading-6 text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-400 md:text-sm"
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
                    className="focus-ring flex h-full min-h-[58px] w-full items-center gap-2.5 rounded-[0.9rem] border border-slate-200/85 bg-gradient-to-b from-white to-slate-50/35 px-4 py-2.5 text-start transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:border-[#004BB8] focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200/85 lg:bg-transparent lg:hover:border-slate-200/85"
                  >
                    <Calendar className="h-4 w-4 shrink-0 text-[#004BB8]" />
                    <span className="min-w-0">
                      <span className="mb-1.5 block text-[0.66rem] font-semibold uppercase leading-3 tracking-[0.13em] text-slate-500">
                        {t("travelDates")}
                      </span>
                      <span className="block truncate text-sm font-semibold leading-6 text-slate-950">
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
                    <span className="min-w-0">
                      <span className="mb-1.5 block text-[0.66rem] font-semibold uppercase leading-3 tracking-[0.13em] text-slate-500">
                        {t("travelers")}
                      </span>
                      <span className="block truncate text-sm font-semibold leading-6 text-slate-950">
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
    const mobileSortOptions: Array<{ label: string; value: SortMode }> = [
      { label: t("cheapest"), value: "cheapest" },
      { label: t("best"), value: "best" },
      { label: t("quickest"), value: "fastest" },
    ];
    const activeSortOption =
      mobileSortOptions.find((option) => option.value === sortMode) ??
      mobileSortOptions[0];
    const shortcutButtonClass =
      "focus-ring inline-flex h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-300/80 bg-transparent px-3.5 text-[13px] font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-200/35 hover:text-slate-950 focus-visible:border-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35";
    const menuClass =
      "z-[90] max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_38px_-18px_rgba(15,23,42,0.35)]";
    const menuItemClass =
      "flex min-h-9 w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30";
    const activeMenu = getActiveMobileShortcutMenu();

    const openMobileShortcutMenu = (
      menu: MobileShortcutMenu,
      width: number,
      trigger: HTMLButtonElement,
    ) => {
      const isOpen = activeMenu === menu;
      const rect = trigger.getBoundingClientRect();
      closeMobileShortcutMenus();

      if (!isOpen) {
        if (menu === "sort") setMobileSortMenuOpen(true);
        if (menu === "airlines") setMobileAirlineMenuOpen(true);
        if (menu === "stops") setMobileStopsMenuOpen(true);
        if (menu === "airports") setMobileAirportMenuOpen(true);
        window.requestAnimationFrame(() =>
          positionMobileShortcutMenu(rect, width),
        );
      }
    };

    const renderTrigger = (
      menu: MobileShortcutMenu,
      label: string,
      menuOpen: boolean,
      width: number,
      ref: RefObject<HTMLDivElement | null>,
    ) => (
      <div ref={ref} className="flex-shrink-0">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            openMobileShortcutMenu(menu, width, event.currentTarget);
          }}
          className={shortcutButtonClass}
        >
          <span className="whitespace-nowrap">{label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform",
              menuOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    );

    const renderMenu = () => {
      if (
        !activeMenu ||
        !mobileShortcutMenuPosition ||
        typeof document === "undefined"
      ) {
        return null;
      }

      return createPortal(
        <div
          ref={mobileShortcutMenuContentRef}
          role="menu"
          style={{
            position: "fixed",
            top: mobileShortcutMenuPosition.top,
            left: mobileShortcutMenuPosition.left,
            width: mobileShortcutMenuPosition.width,
          }}
          className={menuClass}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {activeMenu === "sort"
            ? mobileSortOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={sortMode === option.value}
                  onClick={() => {
                    triggerFilterApplying();
                    setSortMode(option.value);
                    closeMobileShortcutMenus();
                  }}
                  className={cn(
                    "flex min-h-9 w-full items-center rounded-lg px-3 text-left text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30",
                    sortMode === option.value
                      ? "bg-[#004BB8]/8 text-[#004BB8]"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                  )}
                >
                  {option.label}
                </button>
              ))
            : null}

          {activeMenu === "airlines"
            ? airlineOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={selectedAirlines.includes(option.value)}
                  onClick={() => {
                    triggerFilterApplying();
                    toggleFilterValue(option.value, setSelectedAirlines);
                  }}
                  className={cn(
                    menuItemClass,
                    selectedAirlines.includes(option.value)
                      ? "bg-[#004BB8]/8 text-[#004BB8]"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                    {option.count}
                  </span>
                </button>
              ))
            : null}

          {activeMenu === "stops"
            ? stopOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={selectedStops.includes(option.value)}
                  onClick={() => {
                    triggerFilterApplying();
                    toggleFilterValue(option.value, setSelectedStops);
                  }}
                  className={cn(
                    menuItemClass,
                    selectedStops.includes(option.value)
                      ? "bg-[#004BB8]/8 text-[#004BB8]"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                  )}
                >
                  <span>{option.label}</span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {option.count}
                  </span>
                </button>
              ))
            : null}

          {activeMenu === "airports"
            ? airportOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={selectedAirports.includes(option.value)}
                  onClick={() => {
                    triggerFilterApplying();
                    toggleFilterValue(option.value, setSelectedAirports);
                  }}
                  className={cn(
                    menuItemClass,
                    selectedAirports.includes(option.value)
                      ? "bg-[#004BB8]/8 text-[#004BB8]"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                  )}
                >
                  <span>{option.label}</span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {option.count}
                  </span>
                </button>
              ))
            : null}
        </div>,
        document.body,
      );
    };

    return (
      <>
        <div
          className="w-full overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
          onScroll={closeMobileShortcutMenus}
        >
          <div className="flex w-max flex-nowrap items-center gap-2.5">
            {renderFloatingFilterButton(shortcutButtonClass)}
            {renderTrigger(
              "sort",
              activeSortOption.label,
              mobileSortMenuOpen,
              144,
              mobileSortMenuRef,
            )}
            {renderTrigger(
              "airlines",
              "Airlines",
              mobileAirlineMenuOpen,
              224,
              mobileAirlineMenuRef,
            )}
            {renderTrigger(
              "stops",
              "Stops",
              mobileStopsMenuOpen,
              160,
              mobileStopsMenuRef,
            )}
            {renderTrigger(
              "airports",
              "Airports",
              mobileAirportMenuOpen,
              176,
              mobileAirportMenuRef,
            )}
          </div>
        </div>
        {renderMenu()}
      </>
    );
  }

  function renderFloatingFilterButton(className?: string) {
    const label =
      activeFilterCount > 0
        ? t("openFiltersWithCount").replace("{{count}}", activeFilterLabel)
        : t("openFilters");

    const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
      openMobileFiltersDrawer(event.currentTarget);
    };

    return (
      <button
        type="button"
        aria-label={label}
        className={cn(
          "focus-ring relative inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-300/80 bg-transparent px-2 text-[13px] font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-200/35 hover:text-slate-950 focus-visible:border-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35",
          className,
        )}
        onClick={handleClick}
      >
        <SlidersHorizontal
          className="h-4 w-4 text-[#004BB8]"
          strokeWidth={2.2}
          aria-hidden="true"
        />
        <span>Filter</span>
        {activeFilterCount > 0 ? (
          <span className="ms-0.5 inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#004BB8]/8 px-1.5 text-[11px] font-semibold leading-none text-[#004BB8]">
            {activeFilterCount}
          </span>
        ) : null}
      </button>
    );
  }

  function renderMobileCompactResultsHeader() {
    const routeLabel = `${mobileOriginSummary} ⇄ ${mobileDestinationSummary}`;
    const modifySearchLabel = `Modify flight search from ${mobileOriginSummary} to ${mobileDestinationSummary}`;

    return (
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[90] border-b border-slate-200/80 bg-white/95 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] shadow-[0_10px_26px_-20px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-all duration-200 ease-out sm:hidden",
          mobileCompactHeaderVisible && !mobileSearchOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0",
        )}
        aria-hidden={!mobileCompactHeaderVisible || mobileSearchOpen}
      >
        <div className="mx-auto grid h-12 w-full max-w-3xl grid-cols-[44px_minmax(0,1fr)_82px] items-center gap-2">
          <button
            type="button"
            aria-label="Back to flights"
            onClick={() => router.push("/flights")}
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label={modifySearchLabel}
            onClick={(event) => openMobileSearchDrawer(event.currentTarget)}
            className="focus-ring flex min-w-0 flex-col items-center justify-center rounded-xl px-2 py-1 text-center transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
          >
            <span
              className="block max-w-full truncate text-[15px] font-extrabold leading-5 tracking-[-0.015em] text-slate-950"
              dir="ltr"
            >
              {routeLabel}
            </span>
            <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-slate-500">
              Modify search
            </span>
          </button>

          <button
            type="button"
            aria-label={
              activeFilterCount > 0
                ? `Open filters, ${activeFilterCount} active`
                : "Open filters"
            }
            onClick={(event) => openMobileFiltersDrawer(event.currentTarget)}
            className="focus-ring inline-flex h-11 min-w-0 items-center justify-center gap-1 rounded-full px-2 text-[13px] font-bold text-slate-800 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
          >
            <SlidersHorizontal
              className="h-4 w-4 shrink-0 text-[#004BB8]"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <span className="truncate">Filter</span>
          </button>
        </div>
      </header>
    );
  }

  function renderMobileControlsRow() {
    return (
      <div className="mx-auto flex w-full max-w-3xl min-w-0 items-stretch justify-center px-4">
        <button
          type="button"
          onClick={(event) => openMobileSearchDrawer(event.currentTarget)}
          className="group relative z-10 flex h-[4.25rem] min-w-0 w-full max-w-[30rem] items-center justify-between gap-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-4 py-0 text-start shadow-[0_16px_34px_-26px_rgba(15,23,42,0.55)] transition hover:border-slate-300 hover:bg-white hover:shadow-[0_18px_38px_-28px_rgba(15,23,42,0.62)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
        >
          <span className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden pe-1">
            <span className="block truncate text-[16px] font-extrabold leading-5 tracking-[-0.015em] text-slate-950">
              {mobileRouteSummary}
            </span>
            <span className="mt-1.5 block truncate text-[12.5px] font-semibold leading-4 text-slate-500">
              {mobileTripTypeSummary} · {mobileDateSummary} ·{" "}
              {mobileTravelerSummary}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition group-hover:border-slate-300 group-hover:bg-slate-100"
          >
            <SquarePen size={15} strokeWidth={2.2} />
          </span>
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-[calc(100svh-5rem)] flex-1 bg-white">
        <BrandedLoading
          variant="fullscreen"
          visual="logoPulse"
          showProgress={false}
          className="min-h-[calc(100svh-5rem)] flex-1 bg-transparent px-5"
          contentClassName="max-w-md text-center"
          searchType="flight"
          messages={[
            t("flightResults.loading.checkingAirlinesAndFares"),
            t("flightResults.loading.comparingRoutesAndProviders"),
            t("flightResults.loading.findingBestAvailableOptions"),
            t("flightResults.loading.preparingResults"),
          ]}
        />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#F3F6FA] pb-8">
      {renderMobileCompactResultsHeader()}
      <section
        className={cn(
          "relative z-40 bg-white pb-0 pt-0 sm:hidden",
          mobileSearchOpen && "hidden",
        )}
        aria-label="Flight search controls"
      >
        <div className="relative translate-y-1/2">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-px -translate-y-1/2 bg-slate-300 shadow-[0_1px_0_rgba(100,116,139,0.18)]"
            aria-hidden="true"
          />
          {renderMobileControlsRow()}
        </div>
        <div
          ref={mobileSearchSummarySentinelRef}
          className="pointer-events-none h-px w-full"
          aria-hidden="true"
        />
      </section>

      {!mobileSearchOpen ? (
        <section
          className="relative z-30 px-4 pb-0 pt-12 sm:hidden"
          aria-label={t("filters")}
        >
          {renderMobileSortResultsRow()}
        </section>
      ) : null}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="flight-mobile-search-title"
        className={cn(
          "fixed inset-0 z-[10000] min-h-[100dvh] overflow-hidden overscroll-contain bg-slate-50 sm:hidden",
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
            locale={locale}
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
            onSelect={(option, requestClose) => {
              setOriginInput(option.code);
              setOriginCode(option.code);
              if (!destinationCode && !destinationInput.trim()) {
                setActiveMobileAirportPicker("destination");
                return;
              }
              requestClose();
            }}
            onClose={closeMobileAirportPicker}
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
            locale={locale}
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
            onSelect={(option, requestClose) => {
              setDestinationInput(option.code);
              setDestinationCode(option.code);

              const missingDatePicker = getMissingMobileDatePicker();
              if (missingDatePicker) {
                rememberMobileSearchScrollPosition();
                pendingMobileDatePickerRef.current = missingDatePicker;
              }

              requestClose();
            }}
            onClose={closeMobileAirportPicker}
          />
        </>
      ) : null}

      {renderDesktopMinimizedSearchBar()}
      {renderStickySearchPopoutOverlay()}

      <div
        ref={stickySentinelRef}
        className="pointer-events-none absolute h-px w-px opacity-0"
        aria-hidden="true"
      />
      <section
        className={cn(
          "relative z-40 hidden border-b border-transparent transition-[padding,background-color] duration-200 sm:block",
          isSearchCollapsed
            ? "border-transparent bg-white/95 py-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] backdrop-blur"
            : "border-transparent bg-white pb-0 pt-7",
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

      <nav
        aria-label="Breadcrumb"
        className="page-shell hidden pt-12 sm:block lg:pt-14"
      >
        <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
          <li>
            <Link
              href="/"
              className="transition-colors hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
            >
              Home
            </Link>
          </li>
          <li className="text-slate-300" aria-hidden="true">
            &gt;
          </li>
          <li>
            <Link
              href="/flights"
              className="transition-colors hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
            >
              Flights
            </Link>
          </li>
          <li className="text-slate-300" aria-hidden="true">
            &gt;
          </li>
          <li className="text-slate-700" aria-current="page">
            Flight results
          </li>
        </ol>
      </nav>

      <div
        ref={resultsGridRef}
        className="flight-results-grid page-shell grid gap-x-6 gap-y-4 pb-5 pt-3 sm:pt-5 lg:gap-x-9 lg:pt-6"
      >
        <aside
          ref={desktopFilterSidebarRef}
          className="relative hidden self-stretch lg:block"
        >
          <div>
            <DesktopFlightFilters
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
            <div
              ref={desktopFilterSentinelRef}
              className="h-px w-full"
              aria-hidden="true"
            />
            {showDesktopFilterShortcut &&
            desktopCompactFilterFrame &&
            desktopCompactFilterPlacement !== "hidden" ? (
              <div
                ref={desktopCompactFilterRef}
                className={cn(
                  "z-30 overflow-visible",
                  desktopCompactFilterPlacement === "fixed" && "fixed",
                  desktopCompactFilterPlacement === "docked" &&
                    "absolute inset-x-0 bottom-0",
                )}
                style={
                  desktopCompactFilterPlacement === "fixed"
                    ? {
                        top: desktopCompactFilterTopOffset,
                        left: desktopCompactFilterFrame.left,
                        width: desktopCompactFilterFrame.width,
                        height: "auto",
                        overflow: "visible",
                      }
                    : {
                        width: "100%",
                        height: "auto",
                        overflow: "visible",
                      }
                }
              >
                <Filters
                  layout="compact"
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
                />
              </div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 space-y-4 lg:space-y-0">
          <p className="sr-only" aria-live="polite">
            {savedTripError}
          </p>
          <div ref={flightResultsTopRef} aria-hidden="true" />
          {error ? (
            <div className="rounded-xl border border-danger/30 bg-red-50 p-5 text-danger">
              {error}
            </div>
          ) : (
            <div className={cn(resultStackClass, "space-y-4")}>
              <div className="hidden w-full sm:block" aria-label="Nearby departure fares">
                <div className="relative">
                  <button
                    type="button"
                    aria-label="Scroll to previous departure fares"
                    aria-disabled={!nearbyFareCanScrollPrevious}
                    disabled={!nearbyFareCanScrollPrevious}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      scrollNearbyFareStrip("previous");
                    }}
                    className="focus-ring absolute left-0 top-1/2 z-10 inline-flex h-12 w-8 -translate-x-5 -translate-y-1/2 items-center justify-start border-0 bg-transparent p-0 text-[#0057FF] shadow-none transition hover:text-[#003E91] focus-visible:text-[#003E91] disabled:cursor-not-allowed disabled:text-slate-300 lg:-translate-x-7 xl:-translate-x-7"
                  >
                    <ChevronLeft
                      className="h-8 w-8"
                      strokeWidth={2.7}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    ref={nearbyFareStripScrollRef}
                    onScroll={updateNearbyFareScrollState}
                    className="fare-strip-scroll grid auto-cols-[minmax(96px,1fr)] grid-flow-col items-center gap-3 overflow-x-auto scroll-smooth px-0 py-1"
                    role="list"
                  >
                    {nearbyFares.length
                      ? nearbyFares.map((fare) => {
                          const selected = fare.date === body?.departureDate;
                          return (
                            <button
                              key={fare.date}
                              type="button"
                              data-fare-date-cell
                              className={cn(
                                "flex min-h-[86px] min-w-[96px] flex-col items-center justify-center bg-transparent px-2.5 py-3 text-center text-[#24324A] transition hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30",
                                selected ? "text-[#0057FF]" : "text-[#24324A]",
                              )}
                              aria-current={selected ? "date" : undefined}
                              aria-pressed={selected}
                              disabled={selected || loading}
                              onClick={() => handleNearbyFareDateSelect(fare.date)}
                            >
                              <span className={cn("text-[13px] font-semibold uppercase leading-5 tracking-[0.02em]", selected ? "text-[#0057FF]" : "text-slate-600")}>
                                {formatFareStripDateLabel(fare.date, calendarLocale).toUpperCase()}
                              </span>
                              <span className={cn("text-[13px] font-semibold uppercase leading-5", selected ? "text-[#0057FF]" : "text-[#24324A]")}>
                                {formatFareStripWeekdayLabel(fare.date, calendarLocale).toUpperCase()}
                              </span>
                              <span className={cn("mt-1 text-[15px] font-semibold leading-5", selected ? "text-[#0057FF]" : "text-slate-950")} aria-live={fare.status === "loading" ? "polite" : undefined}>
                                {fare.status === "loading" ? (
                                  <span className="block h-4 w-14 animate-pulse rounded-full bg-slate-200" aria-label="Loading fare" />
                                ) : fare.status === "success" ? (
                                  formatDisplayPrice({
                                    amount: fare.amount,
                                    sourceCurrency: fare.currency,
                                    displayCurrency: selectedCurrency,
                                    convertUsdEstimate: true,
                                    rates: currencyRates.rates,
                                    isFallbackRate: currencyRates.isFallback,
                                  }).formatted
                                ) : (
                                  "Unavailable"
                                )}
                              </span>
                            </button>
                          );
                        })
                      : Array.from({ length: nearbyFareRangeSize }).map((_, index) => (
                          <div
                            key={index}
                            className="flex min-h-[86px] min-w-[96px] flex-col items-center justify-center px-2.5 py-3"
                          >
                            <div className="h-3 w-14 animate-pulse rounded-full bg-slate-200" />
                            <div className="mt-2 h-3 w-8 animate-pulse rounded-full bg-slate-200" />
                            <div className="mt-2 h-4 w-14 animate-pulse rounded-full bg-slate-200" />
                          </div>
                        ))}
                  </div>

                  <button
                    type="button"
                    aria-label="Scroll to next departure fares"
                    aria-disabled={!nearbyFareCanScrollNext}
                    disabled={!nearbyFareCanScrollNext}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      scrollNearbyFareStrip("next");
                    }}
                    className="focus-ring absolute right-0 top-1/2 z-10 inline-flex h-12 w-8 -translate-y-1/2 items-center justify-end border-0 bg-transparent p-0 text-[#0057FF] shadow-none transition hover:text-[#003E91] focus-visible:text-[#003E91] disabled:cursor-not-allowed disabled:text-slate-300 lg:translate-x-7 xl:translate-x-8"
                  >
                    <ChevronRight
                      className="h-8 w-8"
                      strokeWidth={2.7}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </div>

              <div className="hidden w-full items-center justify-between gap-4 pt-2 sm:flex lg:bg-transparent lg:px-0 lg:pb-0.5">
                <p className="text-[16px] font-semibold leading-6 tracking-[-0.005em] text-[#142033]">
                  {formatResultsFound(sortedResults.length, t)}
                </p>

                <div
                  ref={desktopSortRef}
                  className="relative hidden items-center gap-2 lg:flex"
                >
                  <span className="text-[16px] font-medium text-[#142033]">
                    Sort by:
                  </span>
                  <button
                    ref={desktopSortButtonRef}
                    type="button"
                    aria-label="Sort flight results"
                    aria-haspopup="menu"
                    aria-expanded={desktopSortOpen}
                    className="inline-flex h-9 items-center justify-center gap-3 rounded-md bg-transparent px-2 text-[16px] font-semibold text-[#142033] transition hover:bg-[#004BB8]/5 hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
                    onClick={() => setDesktopSortOpen((open) => !open)}
                  >
                    {selectedSortLabel}
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  <div
                    role="menu"
                    className={cn(
                      "absolute right-0 top-11 z-30 w-44 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_14px_32px_-18px_rgba(15,23,42,0.45)] transition duration-150",
                      desktopSortOpen
                        ? "translate-y-0 scale-100 opacity-100"
                        : "pointer-events-none -translate-y-1 scale-95 opacity-0",
                    )}
                  >
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={sortMode === option.value}
                        className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25", sortMode === option.value ? "text-[#004BB8]" : "text-slate-700")}
                        onClick={() => {
                          triggerFilterApplying();
                          setSortMode(option.value);
                          setDesktopSortOpen(false);
                          handleUserFilterCommit();
                        }}
                      >
                        <span className="w-4 text-[#004BB8]">
                          {sortMode === option.value ? "✓" : ""}
                        </span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="h-10 rounded-xl border-slate-300 text-sm font-bold transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8] lg:hidden"
                  onClick={(event) =>
                    openMobileFiltersDrawer(event.currentTarget)
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
                    className="rounded-xl border border-[#004BB8]/10 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm"
                  >
                    {t("updatingResults")}
                  </div>
                  <FlightCardSkeleton />
                  <FlightCardSkeleton />
                </div>
              ) : sortedResults.length ? (
                <>
                  <p className="mb-3 text-[16px] font-semibold leading-6 tracking-[-0.01em] text-slate-900 sm:hidden">
                    {formatResultsFound(sortedResults.length, t)}
                  </p>
                  {sortedResults.map((flight, index) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      isAccented={index % 2 === 0}
                      resultBadge={resultBadgeByFlightId.get(flight.id)}
                    />
                  ))}
                </>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-muted shadow-sm">
                  {t("noFlightsMatchFilters")}
                </div>
              )}
            </div>
          )}
        </section>

        <aside
          className="flight-results-right-rail min-w-0"
          aria-hidden="true"
        />
      </div>

      <button
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[80] inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#004BB8]/20 bg-white text-[#004BB8] shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition sm:hidden",
          showMobileBackToTop
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <ChevronUp className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
      </button>

      <aside
        id="flight-mobile-filters-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flight-mobile-filters-title"
        className={cn(
          "fixed inset-0 z-[10000] flex h-[100dvh] flex-col overflow-hidden overscroll-contain bg-white transition-transform duration-200 ease-out lg:hidden",
          filtersOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] shadow-[0_1px_0_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="flight-mobile-filters-title"
                className="text-lg font-bold leading-6 text-slate-950"
              >
                {t("filters")}
              </h2>
              {activeFilterCount > 0 ? (
                <p className="mt-1 inline-flex rounded-full bg-[#004BB8]/8 px-2.5 py-1 text-xs font-bold text-[#004BB8] ring-1 ring-[#004BB8]/10">
                  {activeFilterLabel}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-white px-0 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
              aria-label={t("closeFilters")}
              onClick={() => closeMobileFiltersDrawer()}
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
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
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
          <Button
            type="button"
            variant="ghost"
            disabled={activeFilterCount === 0}
            className="h-12 min-w-0 rounded-xl px-0 text-sm font-bold text-[#004BB8] transition hover:bg-transparent hover:text-[#003f9c] disabled:pointer-events-none disabled:text-slate-400"
            onClick={clearFlightFilters}
          >
            {t("clearAll")}
          </Button>
          <Button
            type="button"
            className="h-12 min-w-[8.75rem] rounded-xl bg-[#004BB8] px-7 text-base font-bold text-white shadow-md shadow-[#004BB8]/12 transition hover:bg-[#003f9c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2"
            onClick={() => {
              shouldScrollToTopAfterFilterApplyRef.current = true;
              triggerFilterApplying();
              closeMobileFiltersDrawer({ restoreFocus: false });
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

function buildFlightResultsSearchKey(body: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  tripType: string;
  adults: number;
  children: number;
  infants: number;
  travelers: number;
  cabinClass: string;
  currency?: string;
}) {
  return [
    body.origin.trim().toUpperCase(),
    body.destination.trim().toUpperCase(),
    body.departureDate,
    body.returnDate || "",
    body.tripType,
    body.adults,
    body.children,
    body.infants,
    body.travelers,
    body.cabinClass,
    body.currency || "",
  ].join("|");
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

function getNearbyFareDateRange(anchorDate: Date): string[] {
  const today = startOfLocalDay(new Date());
  const preferredStart = addDays(anchorDate, -nearbyFareDaysBeforeAnchor);
  const startDate = startOfLocalDay(preferredStart) < today ? today : preferredStart;

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

function getLowestProviderFare(results: PublicFlightResult[]) {
  return results.reduce<{ price: number; currency: string } | null>(
    (lowest, result) => {
      if (!Number.isFinite(result.price) || !result.currency) return lowest;

      if (!lowest || result.price < lowest.price) {
        return { price: result.price, currency: result.currency };
      }

      return lowest;
    },
    null,
  );
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
  doneDisabled = false,
  launcherRef,
}: {
  position: { top: number; left: number; width: number };
  mobileSheet?: boolean;
  alignToField?: "left" | "right";
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
      <p className="mb-2 text-center text-sm font-bold text-slate-900">
        {formatFlightsMonthHeading(renderedMonth, calendarLocale)}
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
              className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8] sm:text-sm"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="mb-3 flex shrink-0 items-center justify-between">
        <button
          type="button"
          aria-label={t("previousMonth")}
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8] sm:text-sm"
          onClick={() => onMonthChange(addMonths(leftMonth, -1))}
        >
          {t("previousShort")}
        </button>

        <button
          type="button"
          aria-label={t("nextMonth")}
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8] sm:text-sm"
          onClick={() => onMonthChange(addMonths(leftMonth, 1))}
        >
          {t("nextShort")}
        </button>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 grid gap-3",
          mobileSheet ? "overflow-visible md:grid-cols-2" : "md:grid-cols-2",
        )}
      >
        {renderMonth(leftMonth)}
        <div className={cn(mobileSheet ? "block" : "hidden md:block")}>
          {renderMonth(rightMonth)}
        </div>
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white pt-3">
        <button
          type="button"
          className="min-h-9 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:border-[#004BB8] sm:text-sm"
          onClick={onClear}
        >
          {t("clear")}
        </button>

        <button
          type="button"
          className="min-h-11 rounded-xl bg-[#004BB8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-1"
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
          aria-label={`Decrease ${label.toLowerCase()}`}
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
          aria-label={`Increase ${label.toLowerCase()}`}
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
  locale,
}: {
  id: string;
  suggestions: AirportOption[];
  onSelect: (value: string) => void;
  position?: { top: number; left: number; width: number };
  alignToField?: boolean;
  locale?: string | null;
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
              {getLocalizedCityName(item.city, locale)} ({item.code})
            </p>
            <p className="text-[11px] leading-4 text-slate-600">
              {item.airport}
              {item.country
                ? ` · ${getLocalizedAirportCountryName(item, locale)}`
                : ""}
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
          convertUsdEstimate: true,
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
      <h3 className="mb-2 text-sm font-extrabold uppercase leading-5 tracking-[0.14em] text-slate-950">
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
        "flex cursor-pointer items-start justify-between rounded-lg font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950",
        compact
          ? "min-h-8 gap-2 px-1.5 py-1 text-[13px]"
          : "min-h-10 gap-3 px-1 py-1.5 text-[13px] leading-5",
      )}
    >
      <span
        className={cn(
          "flex min-w-0 items-start",
          compact ? "gap-1.5" : "gap-2",
        )}
      >
        <input
          type="checkbox"
          className={cn(
            "mt-0.5 shrink-0 rounded border-slate-300 accent-blue focus-visible:ring-2 focus-visible:ring-[#004BB8]/25",
            compact ? "h-3.5 w-3.5" : "h-[15px] w-[15px]",
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
