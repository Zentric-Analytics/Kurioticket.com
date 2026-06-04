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
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  Heart,
  Minus,
  PencilLine,
  Plus,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { FlightCard } from "@/components/results/FlightCard";
import { Button } from "@/components/ui/Button";
import { FlightCardSkeleton } from "@/components/ui/Skeleton";
import { useRegion } from "@/components/region/RegionProvider";
import { airports, type AirportOption } from "@/data/airports";
import {
  getHomeDiscoveryByRegion,
  homeDiscoveryByRegion,
  type HomeDiscoveryItem,
} from "@/data/homeDiscovery";
import { buildDiscoveryLink } from "@/lib/home/buildDiscoveryLinks";
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
import type { PublicFlightResult, SortMode } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

const resultStackClass = "w-full max-w-[760px] lg:ml-4 xl:ml-6";

const loadingMessages = [
  "Searching airlines...",
  "Comparing prices...",
  "Checking value-focused routes...",
  "Finding lower-priced options...",
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

const flightFaqItems: Array<{ question: string; answer: string }> = [
  {
    question: "When is the best time to book a flight?",
    answer:
      "Flight prices can change based on route, season, demand, and availability. It is usually helpful to compare several dates, check nearby airports when possible, and review the full itinerary before choosing a fare.",
  },
  {
    question: "What should I check before booking?",
    answer:
      "Review the departure and arrival times, total travel time, stopovers, baggage rules, seat selection options, cancellation terms, and ticket-change policy before completing your booking with the provider.",
  },
  {
    question: "What is a flexible fare?",
    answer:
      "A flexible fare may allow changes or cancellations with fewer restrictions than a basic fare, but the exact rules depend on the airline or booking provider. Always review the fare conditions before purchase.",
  },
  {
    question: "Are nonstop flights always better?",
    answer:
      "Not always. Nonstop flights can save time, while one-stop routes may offer different departure times, arrival windows, or fare options. Compare total travel time, layover length, and convenience before deciding.",
  },
  {
    question: "How do baggage rules work?",
    answer:
      "Baggage allowance can vary by airline, route, cabin, fare type, and provider. Check whether carry-on, checked bags, and personal items are included before booking.",
  },
  {
    question: "Can I change or cancel my ticket?",
    answer:
      "Change and cancellation options depend on the fare rules and provider policies. Some tickets may be non-refundable or include fees, so review the terms carefully before booking.",
  },
  {
    question: "What should I know about international flights?",
    answer:
      "For international travel, review passport validity, visa requirements, transit rules, baggage policies, and arrival requirements for your destination before booking.",
  },
];

type PlacesApiResponse = {
  suggestions?: AirportOption[];
};

const allDiscoveryItems = [
  ...Object.values(homeDiscoveryByRegion).flat(),
  ...getHomeDiscoveryByRegion(),
];

const discoveryById = new Map<string, HomeDiscoveryItem>(
  allDiscoveryItems.map((item) => [item.id, item])
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

const beachVacationVisualsByDestinationCode: Record<string, BeachVacationVisual> = {
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
      .map((item, index) => ({ item, index, score: getBeachVacationScore(item) }))
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
  const cardContent = (
    <>
      <div className="relative h-24 overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-600 to-sky-400">
        {entry.image ? (
          <img
            src={entry.image}
            alt={entry.imageAlt || entry.label}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-focus-visible:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-between p-4 text-white">
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-white/70">
                Kurioticket
              </p>
              <p className="mt-1 max-w-[9rem] text-lg font-black leading-tight">
                {entry.type === "flight" ? "Flight search" : "Hotel search"}
              </p>
            </div>
            <ArrowRightLeft className="h-8 w-8 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
        <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-950 shadow-sm">
          {entry.type === "flight" ? "Flight" : "Hotel"}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="line-clamp-1 text-base font-black leading-tight text-slate-950">
          {entry.label}
        </p>
        <p className="mt-1 line-clamp-2 flex-1 text-sm leading-6 text-slate-600">
          {entry.subtitle}
        </p>
        <span className="mt-3 inline-flex items-center justify-between rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white transition group-hover:bg-indigo-700 group-focus-visible:bg-indigo-700">
          Resume search
          <ArrowRightLeft size={14} />
        </span>
      </div>
    </>
  );

  return (
    <article className="relative h-full min-w-0">
      {entry.href ? (
        <Link
          href={entry.href}
          className="focus-ring group flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl"
        >
          {cardContent}
        </Link>
      ) : (
        <div className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {cardContent}
        </div>
      )}

      <button
        type="button"
        aria-label={`Remove ${entry.label} from recent searches`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRemove(entry.id);
        }}
        className="focus-ring absolute right-3 top-3 rounded-full border border-white/70 bg-white/95 p-2 text-slate-600 shadow-sm transition hover:bg-white hover:text-rose-600"
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
  onHeartToggle: (event: ReactMouseEvent<HTMLButtonElement>, itemId: string) => void;
}) {
  return (
    <article className="group relative min-w-[250px] snap-start overflow-hidden rounded-[1.45rem] border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-xl sm:min-w-[280px] md:min-w-0">
      <Link
        href={buildDiscoveryLink(item)}
        aria-label={`Explore ${item.originCode} to ${item.destinationCode}`}
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
          <span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.65rem] font-black tracking-[0.14em] text-slate-950 shadow-sm">
            {item.originCode} → {item.destinationCode}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-1 pr-8 text-base font-black leading-tight text-slate-950">
            {item.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {item.originCity} to {item.destinationCity}
          </p>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-slate-600">
            {item.routeNote}
          </p>
          <span className="mt-4 inline-flex items-center justify-between rounded-full bg-slate-950 px-3 py-2 text-xs font-black text-white transition group-hover:bg-indigo-700 group-focus-visible:bg-indigo-700">
            Explore route
            <ArrowRightLeft size={14} />
          </span>
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Remove ${item.title} from saved routes`}
        aria-pressed="true"
        onClick={(event) => onHeartToggle(event, item.id)}
        className="focus-ring absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200/90 bg-rose-500/95 text-white shadow-sm shadow-rose-950/15 backdrop-blur transition hover:bg-rose-600"
      >
        <Heart className="h-4 w-4 fill-current" />
      </button>
    </article>
  );
}

function FlightBookingFaqSection() {
  return (
    <section aria-labelledby="flight-booking-faq-heading" className="mt-8">
      <div className="max-w-3xl">
        <h2
          id="flight-booking-faq-heading"
          className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl"
        >
          Flight booking FAQs
        </h2>
        <p className="mt-2 text-sm font-medium leading-6 text-slate-600 sm:text-base">
          Review common flight-search details before continuing with a provider.
        </p>
      </div>

      <FaqAccordion
        items={flightFaqItems}
        columns="three"
        compact
        className="mt-4"
      />
    </section>
  );
}

export function FlightResultsClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { selectedOption } = useRegion();
  const selectedCurrency = selectedOption.currency;
  const discoveryCards = useMemo(
    () => getHomeDiscoveryByRegion(selectedOption.code).slice(0, 4),
    [selectedOption.code]
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
    (params.get("sort") as SortMode) || "cheapest"
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
    "takeoff"
  );
  const [maxTakeoffMinutes, setMaxTakeoffMinutes] = useState<number | null>(
    null
  );
  const [maxLandingMinutes, setMaxLandingMinutes] = useState<number | null>(
    null
  );
  const [maxDurationMinutes, setMaxDurationMinutes] = useState<number | null>(
    null
  );
  const [selectedStops, setSelectedStops] = useState<string[]>([]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedAirports, setSelectedAirports] = useState<string[]>([]);
  const [selectedFlightQuality, setSelectedFlightQuality] = useState<string[]>(
    []
  );
  const [baggageIncludedOnly, setBaggageIncludedOnly] = useState(true);
  const [flexibleOnly, setFlexibleOnly] = useState(false);
  const [tripTypeInput, setTripTypeInput] = useState(
    params.get("tripType") || "round-trip"
  );
  const [tripTypeMenuOpen, setTripTypeMenuOpen] = useState(false);
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [travelerPopoverPosition, setTravelerPopoverPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [countryHint, setCountryHint] = useState("");
  const [originSuggestions, setOriginSuggestions] = useState<AirportOption[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<AirportOption[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearchEntry[]>([]);
  const [savedTripIds, setSavedTripIds] = useState<string[]>([]);

  const tripTypeMenuRef = useRef<HTMLDivElement | null>(null);
  const originWrapRef = useRef<HTMLDivElement | null>(null);
  const destinationWrapRef = useRef<HTMLDivElement | null>(null);
  const departureWrapRef = useRef<HTMLDivElement | null>(null);
  const returnWrapRef = useRef<HTMLDivElement | null>(null);
  const travelerCabinWrapRef = useRef<HTMLDivElement | null>(null);
  const filterApplyingTimeoutRef = useRef<number | null>(null);

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
  const mobileTripTypeSummary =
    tripTypeInput === "one-way" ? "One-way" : "Round-trip";
  const mobileOriginSummary = (originCode || originInput || "Origin").trim();
  const mobileDestinationSummary = (
    destinationCode ||
    destinationInput ||
    "Destination"
  ).trim();
  const mobileRouteSummary = `${mobileOriginSummary} → ${mobileDestinationSummary}`;
  const mobileDateSummary = departureDateInput
    ? tripTypeInput === "round-trip" && returnDateInput
      ? `${formatCompactDateLabel(departureDateInput)} – ${formatCompactDateLabel(returnDateInput)}`
      : formatCompactDateLabel(departureDateInput)
    : "Travel dates";
  const mobileTravelerTotal = Math.max(
    1,
    adultCount + childCount + infantCount
  );
  const mobileTravelerSummary =
    mobileTravelerTotal === 1 && adultCount === 1
      ? "1 adult"
      : `${mobileTravelerTotal} travelers`;
  const savedRoutes = useMemo(
    () =>
      savedTripIds
        .map((id) => discoveryById.get(id))
        .filter((item): item is HomeDiscoveryItem => Boolean(item)),
    [savedTripIds]
  );

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

  function handleSavedRouteToggle(
    event: ReactMouseEvent<HTMLButtonElement>,
    itemId: string
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
    const query = originInput.trim();
    if (query.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clears stale suggestions when the search query becomes too short.
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clears stale suggestions when the search query becomes too short.
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
      sort: (params.get("sort") as SortMode) || "cheapest",
      currency: selectedCurrency,
    };
  }, [params, selectedCurrency]);

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
            throw new Error(data.error || "Unable to search flights.");
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

  function handleSwapLocations() {
    const currentOriginInput = originInput;
    const currentOriginCode = originCode;

    setOriginInput(destinationInput);
    setOriginCode(destinationCode);
    setDestinationInput(currentOriginInput);
    setDestinationCode(currentOriginCode);
    setActiveSuggest(null);
    setDropdownPosition(null);
  }

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

  const resultCurrency = useMemo(
    () => getSingleResultCurrency(results, selectedCurrency),
    [results, selectedCurrency],
  );

  const stopOptions = useMemo(() => {
    const buckets = new Map<string, { count: number; minPrice: number }>();

    results.forEach((flight) => {
      const bucket = getStopBucket(flight.stops);
      const current = buckets.get(bucket) ?? {
        count: 0,
        minPrice: Number.POSITIVE_INFINITY,
      };

      buckets.set(bucket, {
        count: current.count + 1,
        minPrice:
          Number.isFinite(flight.price) && flight.price > 0
            ? Math.min(current.minPrice, flight.price)
            : current.minPrice,
      });
    });

    return Array.from(buckets, ([value, data]) => ({
      value,
      label: stopLabel(value),
      count: data.count,
      secondaryLabel: `${data.count} option${data.count === 1 ? "" : "s"}`,
      rightLabel: Number.isFinite(data.minPrice)
        ? formatCurrency(data.minPrice, resultCurrency)
        : undefined,
    })).sort(
      (first, second) =>
        stopBucketSortValue(first.value) - stopBucketSortValue(second.value)
    );
  }, [resultCurrency, results]);

  const airlineOptions = useMemo(
    () =>
      buildCountOptions(results.map((flight) => flight.airlineName)).slice(0, 8),
    [results]
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
          count: results.filter((flight) =>
            flightHasQualityOption(flight, option.value)
          ).length,
        }))
        .filter((option) => option.count > 0),
    [results]
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

  useEffect(() => {
    if (priceBounds.max > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset only when new result price bounds are derived.
      setMaxPrice(priceBounds.max);
    }
  }, [priceBounds]);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset only when new result time bounds are derived.
    setMaxTakeoffMinutes(timeBounds.takeoff?.max ?? null);
  }, [timeBounds.takeoff?.max]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset only when new result time bounds are derived.
    setMaxLandingMinutes(timeBounds.landing?.max ?? null);
  }, [timeBounds.landing?.max]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset only when new result duration bounds are derived.
    setMaxDurationMinutes(durationBounds?.max ?? null);
  }, [durationBounds?.max]);

  const filtered = results.filter((flight) => {
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
        flightMatchesAirport(flight, airport)
      );
    const matchesBaggage = !baggageIncludedOnly || hasBaggageIncluded(flight);
    const matchesFlexibility = !flexibleOnly || hasFlexibleTerms(flight);
    const matchesFlightQuality =
      selectedFlightQuality.length === 0 ||
      selectedFlightQuality.every((option) =>
        flightHasQualityOption(flight, option)
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
  });

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
      (a, b) => a.durationMinutes - b.durationMinutes
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
                    <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      <h1 className="mx-auto w-max whitespace-nowrap text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-[clamp(1.9rem,5vw,2.75rem)]">
                        Compare available flight options
                      </h1>
                    </div>
                    <div className="mx-auto mt-3 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      <p className="mx-auto w-max whitespace-nowrap text-center text-xs leading-6 text-slate-600 sm:text-base">
                        Review fares and choose the route that fits your trip in a few taps.
                      </p>
                    </div>
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
                        onClick={handleSwapLocations}
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
                      className="mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 sm:mt-3 lg:mt-0 lg:h-auto lg:min-h-[54px] lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-600/20"
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


          {recentSearches.length > 0 ? (
            <section className="mx-auto mt-7 w-full max-w-6xl rounded-[1.75rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                    Recent searches
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Continue where you left off
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-base">
                    Pick up a recent flight or hotel search stored on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearRecentSearches}
                  className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:border-rose-200 hover:text-rose-700"
                >
                  Clear all
                </button>
              </div>

              <div className="mt-4 grid auto-cols-[240px] grid-flow-col gap-3 overflow-x-auto pb-1.5 [scrollbar-width:none] [-ms-overflow-style:none] sm:auto-cols-[260px] md:grid-flow-row md:grid-cols-3 md:overflow-visible lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
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
                    Saved routes ❤️
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    Saved routes
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600 sm:text-base">
                    Routes you saved on this device.
                  </p>
                </div>
                <p className="max-w-xs text-sm leading-6 text-slate-500">
                  Jump back into route ideas you already liked—no account required.
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
                    Discover destinations from your region
                  </h2>
                </div>
                <div className="mt-1.5 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <p className="w-max whitespace-nowrap text-xs font-normal leading-6 text-slate-600 sm:text-base">
                    Explore curated routes and start your next trip with confidence.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200/80 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5 lg:p-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:gap-5">
                  {discoveryCards.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={buildDiscoveryLink(item)}
                      aria-label={`Explore ${item.originCode} to ${item.destinationCode}`}
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
                      More flight routes to explore
                    </h2>
                  </div>
                  <div className="max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    <p className="w-max whitespace-nowrap text-xs font-normal leading-6 text-slate-600 sm:text-base">
                      Browse route ideas from your region and open one when you are ready to compare dates and fare details.
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
                          aria-label={`Explore ${item.originCode} to ${item.destinationCode}`}
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
                    Beach vacations
                  </h2>
                </div>
                <div className="mt-1.5 max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <p className="w-max whitespace-nowrap text-xs font-normal leading-6 text-slate-600 sm:text-base">
                    Explore flight routes to sunny coastlines, island escapes, and warm-weather beach destinations.
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
                          aria-label={`Explore ${item.originCode} to ${item.destinationCode}`}
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

  function renderCompactSearchForm(placement: "mobile" | "desktop") {
    return (
      <form
        onSubmit={handleCompactSearchSubmit}
        className={cn(
          "mx-auto w-full min-w-0 max-w-full sm:max-w-5xl",
          placement === "desktop" && "hidden sm:block",
        )}
      >
        <div className="flex flex-col gap-0">
          <div className="flex items-center justify-between sm:hidden">
            <span className="text-sm font-semibold text-slate-500">
              Edit search
            </span>
            <button
              type="button"
              aria-label="Close search form"
              onClick={() => setMobileSearchOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              ×
            </button>
          </div>

          <div className="overflow-visible rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]">
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] lg:gap-0">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_36px_minmax(0,1fr)] items-stretch rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-colors hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:rounded-l-xl lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0">
                    <div
                      ref={originWrapRef}
                      className="relative min-h-[54px] px-0 py-0 pr-3"
                    >
                      <label
                        className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600"
                        htmlFor="results-origin"
                      >
                        Origin
                      </label>
                      <input
                        id="results-origin"
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
                        placeholder="From?"
                        autoComplete="off"
                        className="h-8 w-full border-0 bg-transparent p-0 text-[16px] font-semibold text-slate-950 outline-none placeholder:text-slate-400 md:text-sm"
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

                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        aria-label="Swap origin and destination"
                        onClick={handleSwapLocations}
                        className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                      >
                        <ArrowRightLeft size={14} />
                      </button>
                    </div>

                    <div
                      ref={destinationWrapRef}
                      className="relative min-h-[54px] px-0 py-0 pl-3"
                    >
                      <label
                        className="mb-1 block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600"
                        htmlFor="results-destination"
                      >
                        Destination
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
                        placeholder="To?"
                        autoComplete="off"
                        className="h-8 w-full border-0 bg-transparent p-0 text-[16px] font-semibold text-slate-950 outline-none placeholder:text-slate-400 md:text-sm"
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
                  </div>

                <div ref={departureWrapRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDatePicker("departure");
                      setDatePickerPosition(null);
                    }}
                    className="focus-ring flex h-full min-h-[54px] w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-left transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200"
                  >
                    <Calendar className="h-4 w-4 shrink-0 text-indigo-700" />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">
                        Travel dates
                      </span>
                      <span className="block truncate text-sm font-semibold text-slate-950">
                        {departureDateInput
                          ? tripTypeInput === "round-trip" && returnDateInput
                            ? `${formatDateLabel(departureDateInput)} – ${formatDateLabel(returnDateInput)}`
                            : formatDateLabel(departureDateInput)
                          : "Travel dates"}
                      </span>
                    </span>
                  </button>
                </div>

                <div ref={travelerCabinWrapRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setTravelerPopoverOpen(true);
                      setTravelerPopoverPosition(null);
                    }}
                    className="focus-ring flex h-full min-h-[54px] w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-left transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600">
                        Travelers
                      </span>
                      <span className="block truncate text-sm font-semibold text-slate-950">
                        {buildTravelerCabinSummary(
                          adultCount,
                          childCount,
                          infantCount,
                          cabinClassInput,
                        )}
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                  </button>
                </div>

              <Button
                type="submit"
                className="h-full min-h-[54px] w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-700/20 ring-1 ring-indigo-500/20 lg:min-w-[112px] lg:rounded-l-none lg:rounded-r-xl"
              >
                Search
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-start px-1">
            <div ref={tripTypeMenuRef} className="relative inline-flex">
              <button
                type="button"
                aria-expanded={tripTypeMenuOpen}
                aria-haspopup="listbox"
                onClick={() => setTripTypeMenuOpen((open) => !open)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
              >
                {tripTypeInput === "one-way" ? "One-way" : "Round-trip"}
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
                  aria-label="Trip type"
                  className="absolute left-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10"
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={tripTypeInput === "round-trip"}
                    onClick={() => {
                      setTripTypeInput("round-trip");
                      setTripTypeMenuOpen(false);
                    }}
                    className={cn(
                      "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                      tripTypeInput === "round-trip"
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    Round-trip
                  </button>

                  <button
                    type="button"
                    role="option"
                    aria-selected={tripTypeInput === "one-way"}
                    onClick={() => {
                      setTripTypeInput("one-way");
                      setReturnDateInput("");
                      setTripTypeMenuOpen(false);

                      if (activeDatePicker === "return") {
                        setActiveDatePicker(null);
                        setDatePickerPosition(null);
                      }
                    }}
                    className={cn(
                      "focus-ring flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors",
                      tripTypeInput === "one-way"
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    One-way
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    );
  }

  function renderMobileControlsRow() {
    return (
      <div className="mx-auto flex w-full max-w-3xl min-w-0 items-center gap-2 overflow-hidden">
        <Button
          type="button"
          variant="secondary"
          aria-label="Open filters"
          className="h-[52px] w-[56px] shrink-0 rounded-xl border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-800 shadow-[0_8px_18px_rgba(15,23,42,0.07)] transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
          onClick={() => setFiltersOpen(true)}
        >
          <span className="flex flex-col items-center justify-center gap-0.5">
            <SlidersHorizontal size={15} />
            <span>Filters</span>
          </span>
        </Button>

        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          className="flex h-[58px] min-w-0 max-w-full flex-1 items-center justify-between gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white px-3 py-0 text-left shadow-[0_8px_18px_rgba(15,23,42,0.07)] transition hover:border-slate-300 hover:shadow-[0_10px_22px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        >
          <span className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
            <span className="block truncate text-[15px] font-semibold leading-5 text-slate-950">
              {mobileRouteSummary}
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-medium leading-4 text-slate-600">
              {mobileTripTypeSummary} · {mobileDateSummary} · {mobileTravelerSummary}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          >
            <PencilLine size={16} />
          </span>
        </button>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-x-clip bg-[#f6f8fb] pb-8 pt-6 sm:pt-8 lg:pt-8">
      <div
        className={cn(
          "sticky top-0 z-40 bg-[#f6f8fb] px-4 pb-3 pt-2 sm:hidden",
          mobileSearchOpen && "hidden"
        )}
      >
        {renderMobileControlsRow()}
      </div>

      <div
        className={cn(
          "sticky top-0 z-50 bg-[#f6f8fb] px-4 pb-3 pt-2 sm:hidden",
          mobileSearchOpen ? "block" : "hidden"
        )}
      >
        {mobileSearchOpen ? renderCompactSearchForm("mobile") : null}
      </div>

      <div className="page-shell grid gap-5 pb-6 pt-8 sm:py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <section className="lg:col-span-2">
          {!mobileSearchOpen ? renderCompactSearchForm("desktop") : null}

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
            priceBounds={priceBounds}
            currency={resultCurrency}
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
            <div className={cn(resultStackClass, "space-y-4")}>
              <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    triggerFilterApplying();
                    setSortMode("cheapest");
                  }}
                  className={cn(
                    "relative px-2 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 sm:px-3 sm:py-2.5",
                    sortMode === "cheapest"
                      ? "bg-white text-navy after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-violet-600 sm:after:left-3 sm:after:right-3"
                      : "text-slate-600"
                  )}
                >
                  <span className="block text-[12px] font-semibold text-slate-600 sm:text-[13px]">
                    Cheapest
                  </span>
                  <span className="mt-1 block truncate text-[14px] font-semibold leading-5 text-slate-950 sm:text-[15px]">
                    {sortSummaries.cheapest
                      ? formatCurrency(
                          sortSummaries.cheapest.price,
                          sortSummaries.cheapest.currency
                        )
                      : "—"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerFilterApplying();
                    setSortMode("best");
                  }}
                  className={cn(
                    "relative border-l border-slate-200 px-2 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 sm:px-3 sm:py-2.5",
                    sortMode === "best"
                      ? "bg-white text-navy after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-violet-600 sm:after:left-3 sm:after:right-3"
                      : "text-slate-600"
                  )}
                >
                  <span className="block text-[12px] font-semibold text-slate-600 sm:text-[13px]">
                    Best
                  </span>
                  <span className="mt-1 block truncate text-[14px] font-semibold leading-5 text-slate-950 sm:text-[15px]">
                    {sortSummaries.best
                      ? `${formatCurrency(
                          sortSummaries.best.price,
                          sortSummaries.best.currency
                        )} · ${formatDurationFromMinutes(
                          sortSummaries.best.durationMinutes
                        )}`
                      : "—"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerFilterApplying();
                    setSortMode("fastest");
                  }}
                  className={cn(
                    "relative border-l border-slate-200 px-2 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30 sm:px-3 sm:py-2.5",
                    sortMode === "fastest"
                      ? "bg-white text-navy after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-violet-600 sm:after:left-3 sm:after:right-3"
                      : "text-slate-600"
                  )}
                >
                  <span className="block text-[12px] font-semibold text-slate-600 sm:text-[13px]">
                    Quickest
                  </span>
                  <span className="mt-1 block truncate text-[14px] font-semibold leading-5 text-slate-950 sm:text-[15px]">
                    {sortSummaries.fastest
                      ? formatDurationFromMinutes(
                          sortSummaries.fastest.durationMinutes
                        )
                      : "—"}
                  </span>
                </button>
              </div>

              <div className="space-y-3 sm:hidden">
                <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-navy">
                    {sortedResults.length} option
                    {sortedResults.length === 1 ? "" : "s"} found
                  </p>
                </div>
              </div>

              <div className="hidden w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-navy">
                  {sortedResults.length} option
                  {sortedResults.length === 1 ? "" : "s"} found
                </p>

                <Button
                  variant="secondary"
                  className="h-10 rounded-xl border-slate-300 text-sm font-bold transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-500 lg:hidden"
                  onClick={() => setFiltersOpen(true)}
                >
                  <SlidersHorizontal size={17} />
                  Filters
                </Button>
              </div>

              {warnings.length > 0 ? (
                <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 shadow-sm" role="status">
                  Some provider checks may be limited for this search. Review final availability and fare details with the provider before booking.
                </div>
              ) : null}

              {filterApplying ? (
                <div className="space-y-3">
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-indigo-100 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm"
                  >
                    Updating results...
                  </div>
                  <FlightCardSkeleton />
                  <FlightCardSkeleton />
                </div>
              ) : sortedResults.length ? (
                sortedResults.map((flight) => (
                  <FlightCard key={flight.id} flight={flight} />
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-muted shadow-sm">
                  No flights match these filters. Widen your filters to see more
                  live options.
                </div>
              )}
            </div>
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
          priceBounds={priceBounds}
          currency={resultCurrency}
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

function getSingleResultCurrency(
  results: PublicFlightResult[],
  fallbackCurrency: string,
) {
  const currencies = results
    .map((result) => result.currency?.toUpperCase())
    .filter(Boolean);
  const [firstCurrency] = currencies;

  if (firstCurrency) {
    return firstCurrency;
  }

  return fallbackCurrency.toUpperCase();
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

function formatCompactDateLabel(value: string): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
  }).format(date);
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
  { value: "wifi", label: "Wi-Fi" },
  { value: "power", label: "Power outlets" },
  { value: "entertainment", label: "Entertainment" },
  { value: "comfort", label: "Better comfort" },
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

function formatTimeFromMinutes(value: number) {
  const normalized = Math.max(0, Math.min(1439, value));
  const hours24 = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatDurationFromMinutes(totalMinutes: number) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;

  return `${hours}h ${remainingMinutes}m`;
}

function getStopBucket(stops: number) {
  return stops >= 2 ? "2+" : String(stops);
}

function stopLabel(bucket: string) {
  if (bucket === "0") return "Nonstop";
  if (bucket === "1") return "1 stop";
  return "2+ stops";
}

function stopBucketSortValue(bucket: string) {
  return bucket === "2+" ? 2 : Number(bucket);
}

function hasBaggageIncluded(flight: PublicFlightResult) {
  return /included|carry-on|checked/i.test(flight.baggageInfo || "");
}

function hasFlexibleTerms(flight: PublicFlightResult) {
  return /refundable|changes allowed|change allowed|flexible/i.test(
    flight.refundInfo || ""
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
      Number.isFinite(flight.comfortScore) &&
      flight.comfortScore >= 70
    ) || /comfort|legroom|seat pitch|extra space/i.test(text);
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
  setter: Dispatch<SetStateAction<string[]>>
) {
  setter((current) =>
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]
  );
}

function Filters({
  maxPrice,
  setMaxPrice,
  priceBounds,
  currency,
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
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  priceBounds: { min: number; max: number };
  currency: string;
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
  const filterRangeClass =
    "h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 outline-none transition disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gradient-to-r [&::-webkit-slider-runnable-track]:from-indigo-600 [&::-webkit-slider-runnable-track]:to-violet-500 [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-slate-200 [&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-violet-600 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-violet-600 [&::-moz-range-thumb]:shadow-md";

  return (
    <div className="bg-white">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-3 py-3">
        <div>
          <h2 className="text-base font-bold text-white">Filter by</h2>
        </div>
        <SlidersHorizontal className="text-white/90" size={18} />
      </div>

      <div className="space-y-4 bg-white px-3 py-3">
        <section>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px] font-semibold leading-5 text-slate-800">
            <span>Price</span>
            <span className="shrink-0 text-xs font-medium text-navy">
              {priceBounds.max
                ? `${formatCurrency(priceBounds.min, currency)} - ${formatCurrency(
                    Math.min(maxPrice, priceBounds.max),
                    currency
                  )}`
                : "Loading prices"}
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
          <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
            <span>
              {priceBounds.max ? formatCurrency(priceBounds.min, currency) : "—"}
            </span>
            <span>
              {priceBounds.max ? formatCurrency(priceBounds.max, currency) : "—"}
            </span>
          </div>
        </section>

        <FilterSection title="Times">
          <div className="grid grid-cols-2 border-b border-slate-200/70">
            <button
              type="button"
              onClick={() => setTimeFilterMode("takeoff")}
              className={cn(
                "border-b-2 px-2 pb-1.5 pt-1 text-[13px] font-medium transition",
                timeFilterMode === "takeoff"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              Take-off
            </button>
            <button
              type="button"
              onClick={() => setTimeFilterMode("landing")}
              className={cn(
                "border-b-2 px-2 pb-1.5 pt-1 text-[13px] font-medium transition",
                timeFilterMode === "landing"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              )}
            >
              Landing
            </button>
          </div>

          {timeFilterMode === "takeoff" ? (
            <div className="mt-2">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
                <span>Take-off time from origin</span>
                <span className="font-mono text-navy">
                  {timeBounds.takeoff && maxTakeoffMinutes !== null
                    ? formatTimeFromMinutes(maxTakeoffMinutes)
                    : "Loading"}
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
              <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
                <span>
                  {timeBounds.takeoff
                    ? formatTimeFromMinutes(timeBounds.takeoff.min)
                    : "—"}
                </span>
                <span>
                  {timeBounds.takeoff
                    ? formatTimeFromMinutes(timeBounds.takeoff.max)
                    : "—"}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
                <span>Landing time at destination</span>
                <span className="font-mono text-navy">
                  {timeBounds.landing && maxLandingMinutes !== null
                    ? formatTimeFromMinutes(maxLandingMinutes)
                    : "Loading"}
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
              <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
                <span>
                  {timeBounds.landing
                    ? formatTimeFromMinutes(timeBounds.landing.min)
                    : "—"}
                </span>
                <span>
                  {timeBounds.landing
                    ? formatTimeFromMinutes(timeBounds.landing.max)
                    : "—"}
                </span>
              </div>
            </div>
          )}
        </FilterSection>

        <FilterSection title="Duration">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
            <span>Total trip time</span>
            <span className="font-mono text-navy">
              {durationBounds && maxDurationMinutes !== null
                ? formatDurationFromMinutes(maxDurationMinutes)
                : "Loading"}
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

          <div className="mt-1.5 flex justify-between text-[10px] font-medium text-slate-400">
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
          <FilterSection title="Flight quality">
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
          title="Stops"
          emptyText="Stops appear after results load."
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
          title="Airlines"
          emptyText="Airlines appear after results load."
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
          title="Airports"
          emptyText="Airports appear after results load."
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


        <FilterSection title="Amenities">
          <FilterOptionRow
            label="Baggage included"
            checked={baggageIncludedOnly}
            onChange={() => {
              onFilterChange();
              setBaggageIncludedOnly(!baggageIncludedOnly);
            }}
          />
          <FilterOptionRow
            label="Flexible/refundable"
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
      <h3 className="mb-1.5 text-[13px] font-semibold leading-5 text-slate-800">
        {title}
      </h3>
      <div className="grid gap-1">
        {hasOptions ? (
          children
        ) : (
          <p className="py-1 text-xs font-normal text-slate-500">
            {emptyText}
          </p>
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
    <label className="flex cursor-pointer items-start justify-between gap-3 py-1.5 text-[13px] font-medium text-slate-700 transition hover:text-slate-950">
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
            <span className="block text-[11px] font-medium text-slate-400">
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
