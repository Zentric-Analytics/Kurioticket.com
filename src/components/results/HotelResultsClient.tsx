"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowUp, Check, ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal, SquarePen, Star, X } from "lucide-react";

import type { PublicHotelResult } from "@/lib/types";
import { readHotelSearchResponse } from "@/lib/search/readHotelSearchResponse";
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { HotelCardSkeleton } from "@/components/ui/Skeleton";
import { PAGINATION_MIN_BUSY_MS, PAGINATION_REVEAL_MS, prefersReducedResultsMotion } from "@/lib/results/paginationTransition";
import { useLocale } from "@/components/layout/LocaleProvider";
import { HotelCard } from "@/components/results/HotelCard";
import { groupHotelOffers } from "@/lib/hotels/groupHotelOffers";
import { HotelResultsMapPreview } from "@/components/results/HotelResultsMapPreview";
import { isKayakSandboxResult, resultActionHref } from "@/lib/travel/resultAction";
import { HotelResultsScrollIndicator } from "@/components/results/HotelResultsScrollIndicator";
import { buildHotelFacilityFilterOptions, hotelMatchesFacilityFilters } from "@/components/results/hotelFacilityFilter";
import { HotelSearchBar } from "@/components/search/HotelSearchBar";
import { MobileResultsEditSheet } from "@/components/search/MobileResultsEditSheet";
import mobileStyles from "./HotelResultsMobile.module.css";
import { normalizeHotelDestinationSearchValue } from "@/data/hotelDestinations";
import { translations as enTranslations } from "@/lib/i18n/en";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { MobileHotelPriceText } from "./MobileHotelPriceText";
import { saveMobileHotelResultsState, takeMobileHotelResultsState } from "@/lib/hotels/mobileHotelResultsState";
import { createMobileHotelBudget } from "@/lib/hotels/mobileHotelBudget";
import type { ExchangeRates } from "@/lib/currency/exchangeRates";
import { compareHotelsByAvailablePrice, getComparableHotelTotalUsd, hasHotelPrice } from "@/lib/hotels/hotelResultAvailability";
import { getHotelComparableReviewScore } from "@/lib/hotels/hotelRatingSemantics";
import { cn } from "@/lib/utils";
import { countHotelsByStarRating, hotelMatchesStarRating, type HotelStarRatingSelection } from "@/components/results/hotelStarRatingFilter";
import { acquireMobileResultsScrollLock, type MobileResultsScrollLockRelease } from "@/lib/search/mobileResultsScrollLock";
import { getOverlayActivationModality, restoreOverlayLauncherFocus, type OverlayActivationModality } from "@/lib/search/mobileResultsOverlayFocus";
import { buildHotelResultsPaginationItems, clampHotelResultsPage, getHotelResultsPageCount, HOTEL_RESULTS_PAGE_SIZE, paginateHotelResults } from "@/lib/hotels/hotelResultsPagination";
import { getResultsDisplayRange } from "@/lib/results/resultsDisplayRange";

const hotelResultStackClass = "w-full max-w-[800px] lg:max-w-[756px]";
type PaginationTransitionPhase = "idle" | "covering" | "settling";
type MobileHotelShortcutMenu = "price" | "stars" | "amenities" | "roomTypes" | "sort";

type CompactHotelFilterSectionId = "price" | "travellerFeatures" | "rating" | "locations" | "propertyTypes" | "facilities" | "accessibility" | "roomTypes" | "bedTypes" | null;

const FILTER_APPLYING_DELAY_MS = 700;
const SEARCH_APPLYING_TIMEOUT_MS = 15000;
const FILTER_SCROLLBAR_HIDE_DELAY_MS = 700;

const MEAL_FILTERS = [
  {
    value: "room-only",
    labelKey: "hotelResults.filter.roomOnly",
    terms: ["room only", "accommodation only"],
  },
  {
    value: "half-board",
    labelKey: "hotelResults.filter.halfBoard",
    terms: ["half board"],
  },
  {
    value: "full-board",
    labelKey: "hotelResults.filter.fullBoard",
    terms: ["full board"],
  },
  {
    value: "all-inclusive",
    labelKey: "hotelResults.filter.allInclusive",
    terms: ["all inclusive", "all-inclusive"],
  },
];

const CANCELLATION_FILTERS = [
  {
    value: "free-cancellation",
    labelKey: "hotelResults.filter.freeCancellation",
    terms: ["free cancellation"],
  },
  {
    value: "flexible-cancellation",
    labelKey: "hotelResults.filter.flexibleCancellation",
    terms: ["flexible cancellation", "flexible cancellation window"],
  },
  {
    value: "policy-available",
    labelKey: "hotelResults.filter.cancellationPolicyAvailable",
    terms: ["cancellation policy available", "policy shown", "cancellation details", "cancellation rules", "rate comments"],
  },
];

const PROPERTY_TYPE_FILTERS = [
  { value: "hotel", labelKey: "hotelResults.filter.hotel", terms: ["hotel"] },
  {
    value: "apartment",
    labelKey: "hotelResults.filter.apartment",
    terms: ["apartment", "apartments", "aparthotel"],
  },
  {
    value: "resort",
    labelKey: "hotelResults.filter.resort",
    terms: ["resort"],
  },
  {
    value: "suite",
    labelKey: "hotelResults.filter.suites",
    terms: ["suite", "suites"],
  },
  { value: "inn", labelKey: "hotelResults.filter.inn", terms: ["inn"] },
  {
    value: "hostel",
    labelKey: "hotelResults.filter.hostel",
    terms: ["hostel"],
  },
  { value: "villa", labelKey: "hotelResults.filter.villa", terms: ["villa"] },
];

const ROOM_TYPE_FILTERS = [
  {
    value: "single-room",
    labelKey: "hotelResults.filter.singleRoom",
    terms: ["single room", "single standard", "single"],
  },
  {
    value: "double-room",
    labelKey: "hotelResults.filter.doubleRoom",
    terms: ["double room", "double standard", "double"],
  },
  {
    value: "twin-room",
    labelKey: "hotelResults.filter.twinRoom",
    terms: ["twin room", "twin standard", "twin"],
  },
  {
    value: "family-room",
    labelKey: "hotelResults.filter.familyRoom",
    terms: ["family room", "family standard", "family"],
  },
  { value: "suite", labelKey: "hotelResults.filter.suites", terms: ["suite"] },
  {
    value: "standard-room",
    labelKey: "hotelResults.filter.standardRoom",
    terms: ["standard room"],
  },
  {
    value: "deluxe-room",
    labelKey: "hotelResults.filter.deluxeRoom",
    terms: ["deluxe room"],
  },
  {
    value: "studio",
    labelKey: "hotelResults.filter.studio",
    terms: ["studio"],
  },
];

const BED_TYPE_FILTERS = [
  {
    value: "twin-beds",
    labelKey: "hotelResults.filter.twinBeds",
    terms: ["twin bed", "twin beds", "2 twin", "two twin"],
  },
  {
    value: "double-bed",
    labelKey: "hotelResults.filter.doubleBed",
    terms: ["double bed", "double beds"],
  },
  {
    value: "queen-bed",
    labelKey: "hotelResults.filter.queenBed",
    terms: ["queen bed", "queen beds", "queen room"],
  },
  {
    value: "king-bed",
    labelKey: "hotelResults.filter.kingBed",
    terms: ["king bed", "king beds", "king room"],
  },
];

type FilterOption = {
  value: string;
  label: string;
  count: number;
};

function mobileHotelOptionShortcutLabel(
  fallback: string,
  selected: string[],
  options: FilterOption[],
) {
  if (!selected.length) return fallback;
  const labels = selected
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter((label): label is string => Boolean(label));
  if (!labels.length) return fallback;
  return labels.length === 1 ? labels[0] : `${labels[0]} +${labels.length - 1}`;
}

function mobileHotelStarShortcutLabel(selected: number[]) {
  if (!selected.length) return "Stars";
  const ratings = [...selected].sort((a, b) => b - a);
  if (ratings.length === 1) return `${ratings[0]}-star`;
  const minimum = Math.min(...ratings);
  const contiguousThroughFive =
    ratings.length === 6 - minimum &&
    ratings.every((rating, index) => rating === 5 - index);
  return contiguousThroughFive
    ? `${minimum}+ stars`
    : `${ratings[0]}★ +${ratings.length - 1}`;
}

type TermFilter = {
  value: string;
  labelKey: string;
  terms: string[];
};

type ActiveHotelFilterChip = {
  key: string;
  label: string;
  group?: keyof HotelFilterSelections;
  value?: string;
  kind?: "priceRange" | "hotelClass" | "propertySearch";
  rating?: number;
};

type HotelFilterSelections = {
  propertyTypes: string[];
  meals: string[];
  cancellationPolicies: string[];
  facilities: string[];
  locations: string[];
  roomTypes: string[];
  bedTypes: string[];
  accessibility: string[];
  travellerFeatures: string[];
};

const emptySelections: HotelFilterSelections = {
  propertyTypes: [],
  meals: [],
  cancellationPolicies: [],
  facilities: [],
  locations: [],
  roomTypes: [],
  bedTypes: [],
  accessibility: [],
  travellerFeatures: [],
};

const getResultMaxPrice = (hotels: PublicHotelResult[], rates?: ExchangeRates) => {
  const pricedTotals = hotels.map((hotel) => getComparableHotelTotalUsd(hotel, rates)).filter((total): total is number => total !== null && Number.isFinite(total) && total > 0);
  const highestTotal = pricedTotals.length ? Math.max(...pricedTotals) : 300;

  return Math.max(300, Math.ceil(highestTotal / 100) * 100);
};

type HotelSummarySortMode = "cheapest" | "bestValue" | "topRated";

type HotelMobileSearchDraft = {
  destinationId?: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
};

export type HotelResultsSearchInput = HotelMobileSearchDraft & {
  sort?: string;
  petFriendly?: boolean;
  provider?: "kayak-sandbox";
};

export function HotelResultsClient() {
  const params = useSearchParams();
  const searchInput = useMemo<HotelResultsSearchInput>(
    () => ({
      destinationId: params.get("destinationId") || undefined,
      destination:
        normalizeHotelDestinationSearchValue(params.get("destination") || "") ||
        (params.get("provider") === "kayak-sandbox"
          ? "KAYAK sandbox destination"
          : ""),
      checkIn: params.get("checkIn") || "",
      checkOut: params.get("checkOut") || "",
      guests: Number(params.get("guests")),
      rooms: Number(params.get("rooms")),
      sort: params.get("sort") || "cheapest",
      petFriendly: params.get("petFriendly") === "true",
      provider:
        params.get("provider") === "kayak-sandbox"
          ? "kayak-sandbox"
          : undefined,
    }),
    [params],
  );

  return <HotelResultsExperience searchInput={searchInput} />;
}
export function HotelResultsExperience({ searchInput, guided = false, buildDetailsHref }: { searchInput: HotelResultsSearchInput; guided?: boolean; buildDetailsHref?: (hotelId: string) => string | null }) {
  const { locale, t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const t = useCallback((key: string) => dictionary[key] ?? enTranslations[key] ?? "", [dictionary]);

  const [results, setResults] = useState<PublicHotelResult[]>([]);
  const [visibleFiltered, setVisibleFiltered] = useState<PublicHotelResult[]>([]);
  const [inventoryLoading, setLoading] = useState(true);
  const [completedSearchKey, setCompletedSearchKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterApplying, setFilterApplying] = useState(false);
  const [searchApplying, setSearchApplying] = useState(false);
  const [filterScrollbarVisible, setFilterScrollbarVisible] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [minPrice, setMinPrice] = useState(0);
  const [selectedHotelClasses, setSelectedHotelClasses] = useState<number[]>([]);
  const [propertyNameQuery, setPropertyNameQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<HotelFilterSelections>(emptySelections);
  const [hotelSummarySortMode, setHotelSummarySortMode] = useState<HotelSummarySortMode>("cheapest");
  const [mobileDraftSort, setMobileDraftSort] = useState<HotelSummarySortMode>("cheapest");
  const [hotelSortMenuOpen, setHotelSortMenuOpen] = useState(false);
  const [mobileShortcutMenu, setMobileShortcutMenu] = useState<MobileHotelShortcutMenu | null>(null);
  const [mobileShortcutDraftStars, setMobileShortcutDraftStars] = useState<number[]>([]);
  const [mobileShortcutDraftFacilities, setMobileShortcutDraftFacilities] = useState<string[]>([]);
  const [mobileShortcutDraftRoomTypes, setMobileShortcutDraftRoomTypes] = useState<string[]>([]);
  const [mobileShortcutDraftMinPrice, setMobileShortcutDraftMinPrice] = useState(0);
  const [mobileShortcutDraftMaxPrice, setMobileShortcutDraftMaxPrice] = useState(1200);
  const [mobileHotelSearchOpen, setMobileHotelSearchOpen] = useState(false);
  const [mobileHotelSearchClosing, setMobileHotelSearchClosing] = useState(false);
  const [mobileHotelNestedLayerOpen, setMobileHotelNestedLayerOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showStickyHotelFilters, setShowStickyHotelFilters] = useState(false);
  const [desktopNavSearchTarget, setDesktopNavSearchTarget] = useState<HTMLElement | null>(null);
  const [mobileNavSearchTarget, setMobileNavSearchTarget] = useState<HTMLElement | null>(null);
  const [mobileNavFiltersTarget, setMobileNavFiltersTarget] = useState<HTMLElement | null>(null);
  const [desktopSearchPlacement, setDesktopSearchPlacement] = useState<"navbar" | "page" | null>(null);
  const [currentResultsPage, setCurrentResultsPage] = useState(1);
  const [paginationPendingPage, setPaginationPendingPage] = useState<number | null>(null);
  const [paginationTransitionPhase, setPaginationTransitionPhase] = useState<PaginationTransitionPhase>("idle");
  const [paginationMinHeight, setPaginationMinHeight] = useState<number | null>(null);
  const [paginationRevealing, setPaginationRevealing] = useState(false);
  const paginationListRef = useRef<HTMLDivElement | null>(null);
  const desktopFilterPanelRef = useRef<HTMLDivElement | null>(null);
  const desktopResultsContentRef = useRef<HTMLElement | null>(null);
  const hotelSortWrapperRef = useRef<HTMLDivElement | null>(null);
  const hotelSortMenuRef = useRef<HTMLDivElement | null>(null);
  const hotelSortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const hotelSortOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mobileShortcutMenuContentRef = useRef<HTMLDivElement | null>(null);
  const mobileShortcutTriggerRef = useRef<HTMLButtonElement | null>(null);
  const filterApplyingTimeoutRef = useRef<number | null>(null);
  const searchApplyingTimeoutRef = useRef<number | null>(null);
  const filterScrollbarTimeoutRef = useRef<number | null>(null);
  const currencyRatesRef = useRef(currencyRates.rates);
  const mobileReturnScrollRef = useRef<number | null>(null);
  const mobileFiltersScrollLockRef = useRef<MobileResultsScrollLockRelease | null>(null);
  const mobileHotelSearchLauncherRef = useRef<HTMLElement | null>(null);
  const mobileHotelSearchModalityRef = useRef<OverlayActivationModality>("programmatic");
  const mobileFiltersLauncherRef = useRef<HTMLElement | null>(null);
  const mobileFiltersDialogRef = useRef<HTMLElement | null>(null);
  const mobileFiltersModalityRef = useRef<OverlayActivationModality>("programmatic");
  const guidedLoadingStatusRef = useRef<HTMLHeadingElement | null>(null);
  const guidedResultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const standaloneResultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const guidedErrorRef = useRef<HTMLDivElement | null>(null);
  const retryFocusPendingRef = useRef(false);

  useEffect(() => {
    currencyRatesRef.current = currencyRates.rates;
  }, [currencyRates.rates]);

  const providerMode = searchInput.provider === "kayak-sandbox" ? "kayak-sandbox" : undefined;
  const petFriendlyOnly = searchInput.petFriendly === true;
  const body = useMemo(
    () => ({
      destinationId: searchInput.destinationId,
      destination: searchInput.destination,
      checkIn: searchInput.checkIn,
      checkOut: searchInput.checkOut,
      guests: searchInput.guests,
      rooms: searchInput.rooms,
      sort: searchInput.sort || "cheapest",
    }),
    [searchInput],
  );
  const hotelDetailsSearchParams = useMemo(() => {
    return new URLSearchParams({
      ...(body.destinationId ? { destinationId: body.destinationId } : {}),
      destination: body.destination,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: String(body.guests),
      rooms: String(body.rooms),
      ...(petFriendlyOnly ? { petFriendly: "true" } : {}),
      ...(providerMode ? { provider: providerMode } : {}),
    }).toString();
  }, [body.checkIn, body.checkOut, body.destination, body.destinationId, body.guests, body.rooms, petFriendlyOnly, providerMode]);
  const bodySearchKey = [body.destinationId, body.destination, body.checkIn, body.checkOut, body.guests, body.rooms, petFriendlyOnly ? "pets" : "", providerMode].join("-");
  // A changed search must not display cards belonging to the previous request.
  const loading = inventoryLoading || completedSearchKey !== bodySearchKey;
  const bodyMobileSearchDraft = useMemo<HotelMobileSearchDraft>(
    () => ({
      destinationId: body.destinationId,
      destination: body.destination,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: body.guests,
      rooms: body.rooms,
    }),
    [body.checkIn, body.checkOut, body.destination, body.destinationId, body.guests, body.rooms],
  );
  const [mobileHotelSearchDraft, setMobileHotelSearchDraft] = useState<HotelMobileSearchDraft>(() => bodyMobileSearchDraft);
  const [mobileHotelSearchDraftKey, setMobileHotelSearchDraftKey] = useState(bodySearchKey);
  const [desktopHotelSearchDraft, setDesktopHotelSearchDraft] = useState<HotelMobileSearchDraft>(() => bodyMobileSearchDraft);
  const [desktopHotelSearchDraftKey, setDesktopHotelSearchDraftKey] = useState(bodySearchKey);
  const activeMobileHotelSearchDraft = mobileHotelSearchDraftKey === bodySearchKey ? mobileHotelSearchDraft : bodyMobileSearchDraft;
  const activeDesktopHotelSearchDraft = desktopHotelSearchDraftKey === bodySearchKey ? desktopHotelSearchDraft : bodyMobileSearchDraft;

  const updateMobileHotelSearchDraft = useCallback(
    (nextDraft: HotelMobileSearchDraft) => {
      setMobileHotelSearchDraftKey(bodySearchKey);
      setMobileHotelSearchDraft((currentDraft) => {
        if (currentDraft.destinationId === nextDraft.destinationId && currentDraft.destination === nextDraft.destination && currentDraft.checkIn === nextDraft.checkIn && currentDraft.checkOut === nextDraft.checkOut && currentDraft.guests === nextDraft.guests && currentDraft.rooms === nextDraft.rooms) {
          return currentDraft;
        }

        return nextDraft;
      });
    },
    [bodySearchKey],
  );

  const updateDesktopHotelSearchDraft = useCallback(
    (nextDraft: HotelMobileSearchDraft) => {
      setDesktopHotelSearchDraftKey(bodySearchKey);
      setDesktopHotelSearchDraft((currentDraft) => {
        if (currentDraft.destinationId === nextDraft.destinationId && currentDraft.destination === nextDraft.destination && currentDraft.checkIn === nextDraft.checkIn && currentDraft.checkOut === nextDraft.checkOut && currentDraft.guests === nextDraft.guests && currentDraft.rooms === nextDraft.rooms) {
          return currentDraft;
        }

        return nextDraft;
      });
    },
    [bodySearchKey],
  );

  const formatCompactHotelDate = useCallback(
    (value: string) => {
      if (!value) return "";
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return value;

      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
      }).format(date);
    },
    [locale],
  );

  const mobileNavDateSummary = useMemo(() => {
    const checkIn = formatCompactHotelDate(body.checkIn);
    const checkOut = formatCompactHotelDate(body.checkOut);

    if (checkIn && checkOut) return `${checkIn} – ${checkOut}`;
    return checkIn || checkOut || "Travel dates";
  }, [body.checkIn, body.checkOut, formatCompactHotelDate]);

  const mobileNavGuestsSummary = useMemo(() => {
    const guests = Math.max(1, Math.min(12, body.guests));
    const rooms = Math.max(1, Math.min(6, body.rooms));
    const guestLabel = guests === 1 ? t("guestSingular") || "guest" : t("guestPlural") || "guests";
    const roomLabel = rooms === 1 ? t("roomSingular") || "room" : t("roomPlural") || "rooms";

    return `${guests} ${guestLabel}, ${rooms} ${roomLabel}`;
  }, [body.guests, body.rooms, t]);

  const openMobileHotelSearch = useCallback((event?: ReactMouseEvent<HTMLElement>) => {
    setMobileHotelSearchClosing(false);
    mobileHotelSearchLauncherRef.current = event?.currentTarget ?? null;
    mobileHotelSearchModalityRef.current = event ? getOverlayActivationModality(event) : "programmatic";
    setFiltersOpen(false);
    setMobileShortcutMenu(null);
    setMobileHotelSearchOpen(true);
  }, []);

  const finishMobileHotelSearchClose = useCallback(() => {
    setMobileHotelSearchOpen(false);
    setMobileHotelSearchClosing(false);
  }, []);

  const closeMobileHotelSearch = useCallback(() => {
    if (mobileHotelSearchClosing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishMobileHotelSearchClose();
      return;
    }
    setMobileHotelSearchClosing(true);
  }, [finishMobileHotelSearchClose, mobileHotelSearchClosing]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMobileHotelSearchOpen(false);
      setMobileHotelSearchClosing(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [bodySearchKey]);

  useEffect(() => {
    if (mobileHotelSearchOpen) return;
    restoreOverlayLauncherFocus(mobileHotelSearchLauncherRef.current, mobileHotelSearchModalityRef.current);
  }, [mobileHotelSearchOpen]);

  useEffect(() => {
    const releaseExistingLock = () => {
      mobileFiltersScrollLockRef.current?.();
      mobileFiltersScrollLockRef.current = null;
      restoreOverlayLauncherFocus(mobileFiltersLauncherRef.current, mobileFiltersModalityRef.current);
    };

    if (!filtersOpen || typeof window === "undefined") {
      releaseExistingLock();
      return releaseExistingLock;
    }

    const mobileQuery = window.matchMedia("(max-width: 1199px)");

    if (!mobileQuery.matches) {
      releaseExistingLock();
      return releaseExistingLock;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
        return;
      }
      if (event.key === "Tab") {
        const focusable = Array.from(mobileFiltersDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    mobileFiltersScrollLockRef.current = acquireMobileResultsScrollLock();
    window.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => mobileFiltersDialogRef.current?.querySelector<HTMLElement>("button, input")?.focus());

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      releaseExistingLock();
    };
  }, [filtersOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const marker = "kurioticketHotelFiltersOpen";

    if (filtersOpen) {
      if (!window.history.state?.[marker]) {
        window.history.pushState({ ...(window.history.state ?? {}), [marker]: true }, "", window.location.href);
      }

      const handlePopState = (event: PopStateEvent) => {
        if (!event.state?.[marker]) {
          setFiltersOpen(false);
          window.requestAnimationFrame(() => restoreOverlayLauncherFocus(mobileFiltersLauncherRef.current, mobileFiltersModalityRef.current));
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }

    if (window.history.state?.[marker]) {
      window.history.back();
      window.setTimeout(() => restoreOverlayLauncherFocus(mobileFiltersLauncherRef.current, mobileFiltersModalityRef.current), 50);
    }
  }, [filtersOpen]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetch("/api/hotels/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(providerMode ? { "x-hotel-provider-mode": providerMode } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then((response) => readHotelSearchResponse(response, t("hotelResults.searchUnavailableDetailed"), (data) =>
        data.error === enTranslations["hotelResults.liveSearchUnavailable"] ? t("hotelResults.liveSearchUnavailable") : t("hotelResults.unableToSearchHotels"),
      ))
      .then((data) => {
        if (!active) return;

        setError("");
        setResults(data.results);
        const restored = !guided && window.matchMedia("(max-width: 639px)").matches
          ? takeMobileHotelResultsState(bodySearchKey) : null;
        const upperBound = getResultMaxPrice(data.results, currencyRatesRef.current);
        const restoredFilters = Object.fromEntries(
          Object.keys(emptySelections).map((key) => {
            const restoredValues = restored?.selectedFilters[key as keyof HotelFilterSelections] ?? [];
            if (key !== "facilities" || !petFriendlyOnly) return [key, restoredValues];
            return [key, Array.from(new Set([...restoredValues, "petFriendly"]))];
          }),
        ) as HotelFilterSelections;
        const restoredMax = restored?.maxPrice ?? upperBound;
        setVisibleFiltered(restored ? data.results.filter((hotel) => hotelMatchesFilters(hotel, restored.propertyNameQuery, restored.minPrice, restoredMax, restored.minPrice > 0 || restoredMax < upperBound, restored.selectedHotelClasses, restoredFilters, currencyRatesRef.current)) : data.results);
        if (restored) {
          setPropertyNameQuery(restored.propertyNameQuery);
          setHotelSummarySortMode(restored.sort);
          setCurrentResultsPage(restored.page);
          mobileReturnScrollRef.current = restored.scrollY;
        }
        setFilterApplying(false);
        setSearchApplying(false);
        if (searchApplyingTimeoutRef.current !== null) {
          window.clearTimeout(searchApplyingTimeoutRef.current);
          searchApplyingTimeoutRef.current = null;
        }
        setMaxPrice(restoredMax);
        setMinPrice(restored?.minPrice ?? 0);
        setSelectedFilters(restoredFilters);
        setSelectedHotelClasses(restored?.selectedHotelClasses ?? []);
      })
      .catch((searchError) => {
        if (!active || controller.signal.aborted) return;

        setSearchApplying(false);
        setFilterApplying(false);
        if (searchApplyingTimeoutRef.current !== null) {
          window.clearTimeout(searchApplyingTimeoutRef.current);
          searchApplyingTimeoutRef.current = null;
        }
        if (filterApplyingTimeoutRef.current !== null) {
          window.clearTimeout(filterApplyingTimeoutRef.current);
          filterApplyingTimeoutRef.current = null;
        }
        setResults([]);
        setError(searchError instanceof Error ? searchError.message : t("hotelResults.unableToSearchHotels"));
      })
      .finally(() => {
        if (active) {
          setCompletedSearchKey(bodySearchKey);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [body, bodySearchKey, guided, petFriendlyOnly, providerMode, retryKey, t]);

  useEffect(() => {
    if (loading || error || mobileReturnScrollRef.current === null) return;
    const scrollY = mobileReturnScrollRef.current;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: scrollY, behavior: "instant" });
      mobileReturnScrollRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, error, visibleFiltered, currentResultsPage]);

  const retryGuidedHotelSearch = useCallback(() => {
    retryFocusPendingRef.current = true;
    setError("");
    setLoading(true);
    setRetryKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!guided || !retryFocusPendingRef.current) return;

    if (loading) {
      guidedLoadingStatusRef.current?.focus({ preventScroll: true });
      return;
    }

    const finalTarget = error ? guidedErrorRef.current : guidedResultsHeadingRef.current;
    if (!finalTarget) return;

    finalTarget.focus({ preventScroll: true });
    retryFocusPendingRef.current = false;
  }, [error, guided, loading, results]);

  const searchedDestination = body.destination.trim();
  const filterOptions = useMemo(() => buildHotelFilterOptions(results, t, searchedDestination), [results, searchedDestination, t]);

  const pricedResultCount = useMemo(() => results.filter(hasHotelPrice).length, [results]);
  const hasPricedResults = pricedResultCount > 0;
  const hasGoogleMapsResults = results.some((hotel) => hotel.provider === "Google Maps");
  const resultMaxPrice = useMemo(() => getResultMaxPrice(results, currencyRates.rates), [currencyRates.rates, results]);
  const previousPriceBound = useRef(1200);
  useEffect(() => {
    const previous = previousPriceBound.current;
    previousPriceBound.current = resultMaxPrice;
    setMaxPrice(current => current >= previous ? resultMaxPrice : current);
  }, [resultMaxPrice]);
  const priceFilterActive = hasPricedResults && (minPrice > 0 || maxPrice < resultMaxPrice);

  const filtered = useMemo(() => results.filter((hotel) => hotelMatchesFilters(hotel, propertyNameQuery, minPrice, maxPrice, priceFilterActive, selectedHotelClasses, selectedFilters, currencyRates.rates)), [currencyRates.rates, propertyNameQuery, maxPrice, minPrice, priceFilterActive, results, selectedFilters, selectedHotelClasses]);
  const starRatingCounts = useMemo(() => countHotelsByStarRating(results), [results]);
  const formatHotelFilterPrice = useCallback(
    (amountUsd: number) =>
      formatDisplayPrice({
        amount: amountUsd,
        sourceCurrency: "USD",
        displayCurrency: selectedOption.currency,
        convertUsdEstimate: true,
        rates: currencyRates.rates,
        isFallbackRate: currencyRates.isFallback,
      }).formatted,
    [currencyRates.isFallback, currencyRates.rates, selectedOption.currency],
  );

  const formatCompactHotelFilterPrice = useCallback(
    (amountUsd: number) => {
      const display = formatDisplayPrice({
        amount: amountUsd,
        sourceCurrency: "USD",
        displayCurrency: selectedOption.currency,
        convertUsdEstimate: true,
        rates: currencyRates.rates,
        isFallbackRate: currencyRates.isFallback,
      });

      try {
        const formatter = new Intl.NumberFormat(locale, {
          style: "currency",
          currency: display.currency,
          notation: "compact",
          compactDisplay: "short",
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        });
        const formatted = formatter.format(display.amount);
        if (display.currency !== "NGN") return formatted;
        const currencyToken = formatter
          .formatToParts(display.amount)
          .find((part) => part.type === "currency")?.value;
        return currencyToken
          ? formatted.replace(currencyToken, "₦")
          : formatted.replace("NGN", "₦");
      } catch {
        return display.formatted;
      }
    },
    [
      currencyRates.isFallback,
      currencyRates.rates,
      locale,
      selectedOption.currency,
    ],
  );

  const mobilePriceShortcutLabel = priceFilterActive
    ? minPrice <= 0
      ? `Under ${formatCompactHotelFilterPrice(maxPrice)}`
      : maxPrice >= resultMaxPrice
        ? `${formatCompactHotelFilterPrice(minPrice)}+`
        : `${formatCompactHotelFilterPrice(minPrice)}–${formatCompactHotelFilterPrice(maxPrice)}`
    : "Price";
  const mobileStarsShortcutLabel =
    mobileHotelStarShortcutLabel(selectedHotelClasses);
  const mobileFacilitiesShortcutLabel = mobileHotelOptionShortcutLabel(
    "Facilities",
    selectedFilters.facilities,
    filterOptions.facilities,
  );
  const mobileRoomTypesShortcutLabel = mobileHotelOptionShortcutLabel(
    "Room & bed",
    selectedFilters.roomTypes,
    filterOptions.roomTypes,
  );

  const activeFilterChips = useMemo(() => buildActiveFilterChips(selectedFilters, propertyNameQuery, minPrice, maxPrice, resultMaxPrice, priceFilterActive, selectedHotelClasses, formatHotelFilterPrice, t, locale, filterOptions.facilities, filterOptions.locations), [formatHotelFilterPrice, locale, maxPrice, minPrice, selectedHotelClasses, resultMaxPrice, priceFilterActive, selectedFilters, propertyNameQuery, t, filterOptions.facilities, filterOptions.locations]);

  const resultsApplying = filterApplying || searchApplying;

  const activeFilterCount = useMemo(() => {
    let count = priceFilterActive ? 1 : 0;
    count += propertyNameQuery.trim() ? 1 : 0;
    count += selectedHotelClasses.length;
    count += Object.values(selectedFilters).reduce((total, group) => total + group.length, 0);
    return count;
  }, [priceFilterActive, propertyNameQuery, selectedFilters, selectedHotelClasses]);
  const visibleFilteredHotels = resultsApplying ? visibleFiltered : filtered;
  const hotelOfferGroups = useMemo(() => groupHotelOffers(sortHotelSummaryResults(visibleFilteredHotels, hotelSummarySortMode, currencyRates.rates)), [currencyRates.rates, hotelSummarySortMode, visibleFilteredHotels]);
  const sortedVisibleHotels = useMemo(() => hotelOfferGroups.map(group => group[0]), [hotelOfferGroups]);
  const additionalHotelOffers = useMemo(() => new Map(hotelOfferGroups.map(group => [group[0].id, group.slice(1)])), [hotelOfferGroups]);
  const totalHotelResultPages = guided ? 0 : getHotelResultsPageCount(sortedVisibleHotels.length);
  const paginatedVisibleHotels = useMemo(() => (guided ? sortedVisibleHotels : paginateHotelResults(sortedVisibleHotels, currentResultsPage)), [currentResultsPage, guided, sortedVisibleHotels]);
  const paginationItems = useMemo(() => buildHotelResultsPaginationItems(currentResultsPage, totalHotelResultPages), [currentResultsPage, totalHotelResultPages]);
  const mobilePaginationItems = useMemo(() => buildHotelResultsPaginationItems(currentResultsPage, totalHotelResultPages, true), [currentResultsPage, totalHotelResultPages]);
  const hotelSortOptions = useMemo(
    () =>
      [
        {
          value: "cheapest",
          label: t("hotelResults.cheapest"),
        },
        {
          value: "bestValue",
          label: t("hotelResults.bestValue"),
        },
        {
          value: "topRated",
          label: t("hotelResults.topRated"),
        },
      ] satisfies Array<{
        value: HotelSummarySortMode;
        label: string;
      }>,
    [t],
  );
  const currentSortLabel = hotelSortOptions.find((option) => option.value === hotelSummarySortMode)?.label ?? hotelSortOptions[0]?.label ?? "";
  const formattedDisplayedHotelCount = formatHotelCount(sortedVisibleHotels.length, locale);
  const resultsHeading = t(sortedVisibleHotels.length === 1 ? "resultFound" : "resultsFound").replace("{{count}}", formattedDisplayedHotelCount);
  const resultsDisplayRange = guided
    ? null
    : getResultsDisplayRange({
        currentPage: currentResultsPage,
        pageSize: HOTEL_RESULTS_PAGE_SIZE,
        totalResults: sortedVisibleHotels.length,
      });
  const showFilteredEmptyState = !loading && !error && !filterApplying && results.length > 0 && filtered.length === 0;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setCurrentResultsPage((page) => clampHotelResultsPage(page, totalHotelResultPages));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [totalHotelResultPages]);

  useEffect(() => {
    if (guided || typeof window === "undefined") return undefined;
    const update = () => {
      setShowBackToTop(window.scrollY > 600);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [guided]);

  useEffect(() => {
    if (guided || typeof window === "undefined") return undefined;

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    let frame = 0;

    const syncResultsHeaderTargets = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const nextDesktopTarget = document.querySelector<HTMLElement>("[data-hotel-results-nav-search]");
        const nextMobileSearchTarget = document.querySelector<HTMLElement>("[data-hotel-results-mobile-nav-search]");
        const nextMobileFiltersTarget = document.querySelector<HTMLElement>("[data-hotel-results-mobile-nav-filters]");

        setDesktopNavSearchTarget((current) => current === nextDesktopTarget ? current : nextDesktopTarget);
        setMobileNavSearchTarget((current) => current === nextMobileSearchTarget ? current : nextMobileSearchTarget);
        setMobileNavFiltersTarget((current) => current === nextMobileFiltersTarget ? current : nextMobileFiltersTarget);
        setDesktopSearchPlacement(desktopQuery.matches ? "navbar" : "page");
      });
    };

    syncResultsHeaderTargets();

    const observer = new MutationObserver(syncResultsHeaderTargets);
    observer.observe(document.body, { childList: true, subtree: true });
    desktopQuery.addEventListener("change", syncResultsHeaderTargets);

    return () => {
      observer.disconnect();
      desktopQuery.removeEventListener("change", syncResultsHeaderTargets);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [guided]);

  useEffect(() => {
    const fullFilters = desktopFilterPanelRef.current;
    const resultsContent = desktopResultsContentRef.current;
    if (guided || !fullFilters || !resultsContent) return undefined;

    const update = () => {
      const filterBottom = fullFilters.getBoundingClientRect().bottom;
      const remainingResultsHeight = resultsContent.getBoundingClientRect().bottom - filterBottom;
      setShowStickyHotelFilters(
        window.matchMedia("(min-width: 1200px)").matches &&
        filterBottom <= 170 &&
        remainingResultsHeight >= 500,
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(fullFilters);
    observer.observe(resultsContent);
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [guided, paginatedVisibleHotels.length, filterApplying]);

  async function changeResultsPage(page: number) {
    const target = clampHotelResultsPage(page, totalHotelResultPages);
    if (paginationPendingPage !== null || target === currentResultsPage) return;
    setPaginationMinHeight(paginationListRef.current?.getBoundingClientRect().height ?? null);
    setPaginationPendingPage(target);
    setPaginationTransitionPhase("covering");
    const previousRootOverflowAnchor = document.documentElement.style.overflowAnchor;
    const previousBodyOverflowAnchor = document.body.style.overflowAnchor;
    document.documentElement.style.overflowAnchor = "none";
    document.body.style.overflowAnchor = "none";
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    const positionResultsStart = () => {
      const mobile = window.innerWidth < 640;
      const resultsAnchor = mobile
        ? document.querySelector<HTMLElement>("[data-mobile-web-hotel-results]")
        : standaloneResultsHeadingRef.current;
      if (!resultsAnchor) return;
      const stickyOffset = mobile
        ? (document.querySelector<HTMLElement>("[data-app-header]")?.getBoundingClientRect().height ?? 72)
        : 170;
      const resultsTop = Math.max(0, window.scrollY + resultsAnchor.getBoundingClientRect().top - stickyOffset);
      window.scrollTo({ top: resultsTop, behavior: "auto" });
    };

    positionResultsStart();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    setCurrentResultsPage(target);
    setPaginationTransitionPhase("settling");
    setPaginationMinHeight(null);
    await new Promise<void>((resolve) => window.setTimeout(resolve, PAGINATION_MIN_BUSY_MS));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    positionResultsStart();
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    positionResultsStart();
    if (window.innerWidth >= 1024) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 240));
      positionResultsStart();
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
    setPaginationTransitionPhase("idle");
    setPaginationPendingPage(null);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    document.documentElement.style.overflowAnchor = previousRootOverflowAnchor;
    document.body.style.overflowAnchor = previousBodyOverflowAnchor;
    if (!prefersReducedResultsMotion()) {
      setPaginationRevealing(true);
      window.setTimeout(() => setPaginationRevealing(false), PAGINATION_REVEAL_MS);
    }
  }

  useEffect(() => {
    if (!filterApplying || loading || error) return;

    if (filterApplyingTimeoutRef.current !== null) {
      window.clearTimeout(filterApplyingTimeoutRef.current);
    }

    filterApplyingTimeoutRef.current = window.setTimeout(() => {
      setVisibleFiltered(filtered);
      setFilterApplying(false);
      filterApplyingTimeoutRef.current = null;
    }, FILTER_APPLYING_DELAY_MS);

    return () => {
      if (filterApplyingTimeoutRef.current !== null) {
        window.clearTimeout(filterApplyingTimeoutRef.current);
        filterApplyingTimeoutRef.current = null;
      }
    };
  }, [error, filtered, filterApplying, loading]);

  useEffect(() => {
    return () => {
      if (filterApplyingTimeoutRef.current !== null) {
        window.clearTimeout(filterApplyingTimeoutRef.current);
      }

      if (searchApplyingTimeoutRef.current !== null) {
        window.clearTimeout(searchApplyingTimeoutRef.current);
      }

      if (filterScrollbarTimeoutRef.current !== null) {
        window.clearTimeout(filterScrollbarTimeoutRef.current);
      }
    };
  }, []);

  function showFilterScrollbarWhileScrolling() {
    setFilterScrollbarVisible(true);

    if (filterScrollbarTimeoutRef.current !== null) {
      window.clearTimeout(filterScrollbarTimeoutRef.current);
    }

    filterScrollbarTimeoutRef.current = window.setTimeout(() => {
      setFilterScrollbarVisible(false);
      filterScrollbarTimeoutRef.current = null;
    }, FILTER_SCROLLBAR_HIDE_DELAY_MS);
  }

  const triggerFilterApplying = useCallback(() => {
    setCurrentResultsPage(1);
    setVisibleFiltered((current) => {
      if (resultsApplying && current.length > 0) return current;
      return filtered;
    });

    setFilterApplying(true);

    if (filterApplyingTimeoutRef.current !== null) {
      window.clearTimeout(filterApplyingTimeoutRef.current);
      filterApplyingTimeoutRef.current = null;
    }
  }, [filtered, resultsApplying]);

  const triggerSearchApplying = useCallback(() => {
    triggerFilterApplying();
    setSearchApplying(true);

    if (searchApplyingTimeoutRef.current !== null) {
      window.clearTimeout(searchApplyingTimeoutRef.current);
    }

    searchApplyingTimeoutRef.current = window.setTimeout(() => {
      setSearchApplying(false);
      searchApplyingTimeoutRef.current = null;
    }, SEARCH_APPLYING_TIMEOUT_MS);
  }, [triggerFilterApplying]);

  const updateMaxPrice = (value: number) => {
    setCurrentResultsPage(1);
    setMaxPrice(Math.max(value, minPrice));
  };

  const updateMinPrice = (value: number) => {
    setCurrentResultsPage(1);
    setMinPrice(Math.min(value, maxPrice));
  };

  const updatePropertyNameQuery = (value: string) => {
    setCurrentResultsPage(1);
    setPropertyNameQuery(value);
  };

  const toggleHotelClass = (rating: number) => {
    setCurrentResultsPage(1);
    setSelectedHotelClasses((current) => (current.includes(rating) ? current.filter((item) => item !== rating) : [...current, rating].sort((a, b) => b - a)));
  };

  function openAllFilters() {
    setFiltersOpen(true);
  }

  const resetFilters = () => {
    setCurrentResultsPage(1);
    setMinPrice(0);
    setMaxPrice(resultMaxPrice);
    setSelectedHotelClasses([]);
    setPropertyNameQuery("");
    setSelectedFilters(emptySelections);
  };

  const toggleFilter = (group: keyof HotelFilterSelections, value?: string) => {
    setCurrentResultsPage(1);
    setSelectedFilters((current) => ({
      ...current,
      [group]: value === undefined ? [] : current[group].includes(value) ? current[group].filter((item) => item !== value) : [...current[group], value],
    }));
  };

  const removeFilterChip = (chip: ActiveHotelFilterChip) => {
    setCurrentResultsPage(1);

    if (chip.kind === "priceRange") {
      setMinPrice(0);
      setMaxPrice(resultMaxPrice);
      return;
    }

    if (chip.kind === "propertySearch") {
      setPropertyNameQuery("");
      return;
    }

    if (chip.kind === "hotelClass" && chip.rating) {
      setSelectedHotelClasses((current) => current.filter((rating) => rating !== chip.rating));
      return;
    }

    const { group, value } = chip;

    if (!group || !value) return;

    setSelectedFilters((current) => ({
      ...current,
      [group]: current[group].filter((item) => item !== value),
    }));
  };

  const updateHotelSummarySortMode = (sortMode: HotelSummarySortMode) => {
    setCurrentResultsPage(1);
    setHotelSummarySortMode(sortMode);
  };

  const focusHotelSortOption = useCallback(
    (index: number) => {
      const optionCount = hotelSortOptions.length;

      if (!optionCount) return;

      const nextIndex = (index + optionCount) % optionCount;
      hotelSortOptionRefs.current[nextIndex]?.focus();
    },
    [hotelSortOptions.length],
  );

  const openHotelSortMenu = useCallback(() => {
    setHotelSortMenuOpen(true);

    window.requestAnimationFrame(() => {
      const selectedIndex = hotelSortOptions.findIndex((option) => option.value === hotelSummarySortMode);

      hotelSortOptionRefs.current[Math.max(selectedIndex, 0)]?.focus({
        preventScroll: true,
      });
    });
  }, [hotelSortOptions, hotelSummarySortMode]);

  const closeHotelSortMenu = useCallback((returnFocus = false) => {
    setHotelSortMenuOpen(false);

    if (returnFocus) {
      hotelSortTriggerRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const handleHotelSortTriggerClick = useCallback(() => {
    if (hotelSortMenuOpen) {
      closeHotelSortMenu();
      return;
    }

    openHotelSortMenu();
  }, [closeHotelSortMenu, hotelSortMenuOpen, openHotelSortMenu]);

  const handleHotelSortOptionKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusHotelSortOption(index + 1);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        focusHotelSortOption(index - 1);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        focusHotelSortOption(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        focusHotelSortOption(hotelSortOptions.length - 1);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeHotelSortMenu(true);
      }
    },
    [closeHotelSortMenu, focusHotelSortOption, hotelSortOptions.length],
  );

  useEffect(() => {
    if (!hotelSortMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (hotelSortWrapperRef.current?.contains(target)) return;

      setHotelSortMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setHotelSortMenuOpen(false);
      hotelSortTriggerRef.current?.focus({ preventScroll: true });
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hotelSortMenuOpen]);

  const closeMobileShortcutMenu = useCallback((returnFocus = false) => {
    setMobileShortcutMenu(null);
    if (returnFocus) {
      mobileShortcutTriggerRef.current?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    if (!mobileShortcutMenu) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); closeMobileShortcutMenu(true); }
      if (event.key === "Tab") {
        const controls = mobileShortcutMenuContentRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const releaseScrollLock = acquireMobileResultsScrollLock({ freezeBodyPosition: false });
    window.requestAnimationFrame(() => mobileShortcutMenuContentRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus());

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      releaseScrollLock();
    };
  }, [closeMobileShortcutMenu, mobileShortcutMenu]);

  function openMobileShortcutMenu(menu: MobileHotelShortcutMenu, trigger: HTMLButtonElement) {
    if (mobileShortcutMenu === menu) {
      closeMobileShortcutMenu();
      return;
    }

    mobileShortcutTriggerRef.current = trigger;
    if (menu === "price") {
      setMobileShortcutDraftMinPrice(minPrice);
      setMobileShortcutDraftMaxPrice(maxPrice);
    }
    if (menu === "sort") setMobileDraftSort(hotelSummarySortMode);
    if (menu === "stars") setMobileShortcutDraftStars(selectedHotelClasses);
    if (menu === "amenities") setMobileShortcutDraftFacilities(selectedFilters.facilities);
    if (menu === "roomTypes") setMobileShortcutDraftRoomTypes(selectedFilters.roomTypes);
    setMobileShortcutMenu(menu);
  }

  function handleMobileSortSelection(event: ReactMouseEvent<HTMLButtonElement>) {
    const value = event.currentTarget.dataset.sort as HotelSummarySortMode;
    setMobileDraftSort(value);
  }

  function clearMobileShortcutFilter(menu: Exclude<MobileHotelShortcutMenu, "sort">) {
    triggerFilterApplying();
    if (menu === "price") {
      setMinPrice(0);
      setMaxPrice(resultMaxPrice);
      return;
    }
    if (menu === "stars") {
      setSelectedHotelClasses([]);
      return;
    }
    if (menu === "roomTypes") {
      setSelectedFilters((current) => ({ ...current, roomTypes: [] }));
      return;
    }
    setSelectedFilters((current) => ({ ...current, facilities: [] }));
  }

  function renderMobileHotelShortcuts() {
    const shortcutButtonClass = "group inline-flex min-h-11 min-w-11 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/35";
    const shortcutChipClass = "inline-flex h-9 items-center gap-1 rounded-[9px] border px-2 text-[13px] font-semibold transition";
    const menuItemClass = "flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-transparent bg-transparent px-0 text-left text-[14px] font-normal text-slate-800 transition hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30";
    const trigger = (
      menu: Exclude<MobileHotelShortcutMenu, "sort">,
      label: string,
      active = false,
    ) => (
      <div className="group inline-flex min-h-11 min-w-11 shrink-0 items-center">
        <span
          className={cn(
            shortcutChipClass,
            "relative overflow-hidden p-0",
            active
              ? "border-[#142033] bg-[#142033] text-white"
              : "border-[#D8E1EC] bg-white text-[#142033] group-hover:bg-slate-50",
          )}
        >
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={mobileShortcutMenu === menu}
            aria-pressed={active}
            className={cn(
              "focus-ring inline-flex h-full min-w-0 items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/35",
              active ? "pl-2 pr-6" : "px-2",
            )}
            onClick={(event) => {
              event.stopPropagation();
              openMobileShortcutMenu(menu, event.currentTarget);
            }}
          >
            <span className="max-w-[11rem] truncate">{label}</span>
            {!active ? <ChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5 shrink-0 transition-transform", mobileShortcutMenu === menu && "rotate-180")} /> : null}
          </button>
          {active ? (
            <button
              type="button"
              aria-label={`Clear ${label} filter`}
              className="focus-ring absolute right-0.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
              onClick={(event) => {
                event.stopPropagation();
                clearMobileShortcutFilter(menu);
              }}
            >
              <X className="h-3 w-3" strokeWidth={2.1} aria-hidden="true" />
            </button>
          ) : null}
        </span>
      </div>
    );

    const menu =
      mobileShortcutMenu && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[10020] flex items-end sm:hidden" role="presentation" onMouseDown={() => closeMobileShortcutMenu(true)}>
              <div aria-hidden="true" className={cn("mobile-results-sheet-backdrop-layer pointer-events-none fixed inset-0", mobileStyles.editBackdrop)} />
              <section ref={mobileShortcutMenuContentRef} role="dialog" aria-modal="true" aria-labelledby={`mobile-hotel-${mobileShortcutMenu}-title`} className={cn(mobileStyles.filterPalette, "max-h-[min(76dvh,620px)] mx-3 mb-3 w-[calc(100%-24px)] overflow-hidden rounded-[24px] bg-[#F2F4F8] shadow-none mobile-results-sheet-surface mobile-results-sheet-surface-smooth")} onMouseDown={(event) => event.stopPropagation()}>
                <header className="relative flex min-h-16 items-center justify-center bg-[#F2F4F8] px-16 py-3">
                  <div>
                    <h2 id={`mobile-hotel-${mobileShortcutMenu}-title`} className="text-base font-semibold text-slate-950">
                      {mobileShortcutMenu === "price" ? "Total price" : mobileShortcutMenu === "stars" ? "Hotel class" : mobileShortcutMenu === "sort" ? "Sort" : mobileShortcutMenu === "roomTypes" ? "Room & bed" : "Facilities"}
                    </h2>
                  </div>
                  <button type="button" aria-label={`Close ${mobileShortcutMenu} selector`} onClick={() => closeMobileShortcutMenu(true)} className="absolute right-3 inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </header>
                <div className={cn("max-h-[calc(min(76dvh,620px)-9rem)] overflow-y-auto overscroll-contain bg-[#F2F4F8] px-6", mobileShortcutMenu === "sort" ? "space-y-1 px-10 py-6" : "space-y-2 py-4")}>
                  {mobileShortcutMenu === "sort" ? hotelSortOptions.map((option) => (
                    <button key={option.value} type="button" aria-pressed={mobileDraftSort === option.value} className={cn(menuItemClass, mobileStyles.sortOption)} data-sort={option.value} onClick={handleMobileSortSelection}>
                      <span className="flex min-w-0 flex-col gap-1"><span className="font-semibold">{option.label}</span><span className="text-xs text-slate-500">{option.value === "cheapest" ? "Lowest comparable total stay price" : option.value === "bestValue" ? "Best value score first" : "Highest guest review score first"}</span></span>
                      {mobileDraftSort === option.value ? <Check className="h-4 w-4 text-[#004BB8]" aria-hidden="true" /> : null}
                    </button>
                  )) : null}
                  {mobileShortcutMenu === "stars"
                    ? ([5, 4, 3, 2, 1] as HotelStarRatingSelection[])
                        .filter((rating) => (starRatingCounts[rating] ?? 0) > 0)
                        .map((rating) => {
                          const selected = mobileShortcutDraftStars.includes(rating);
                          return (
                            <button key={rating} type="button" role="checkbox" aria-checked={selected} className={menuItemClass} onClick={() => setMobileShortcutDraftStars((current) => (current.includes(rating) ? current.filter((item) => item !== rating) : [...current, rating].sort((a, b) => b - a)))}>
                              <span className="flex min-w-0 items-center gap-[10px]"><span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300">{selected ? <Check className="h-4 w-4 text-[#004BB8]" /> : null}</span><span>{rating}-star hotel</span></span>
                              <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
                                <span>{starRatingCounts[rating]}</span>
                              </span>
                            </button>
                          );
                        })
                    : null}
                  {mobileShortcutMenu === "price" ? (
                    <div className="py-2">
                      <PriceFilterControl mobile showEstimate={false} stayNights={stayNights} minPrice={mobileShortcutDraftMinPrice} maxPrice={mobileShortcutDraftMaxPrice} setMinPrice={(value) => setMobileShortcutDraftMinPrice(Math.min(value, mobileShortcutDraftMaxPrice))} setMaxPrice={(value) => setMobileShortcutDraftMaxPrice(Math.max(value, mobileShortcutDraftMinPrice))} resultMaxPrice={resultMaxPrice} formatPrice={formatHotelFilterPrice} filterRangeClass="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#D7E5F8] accent-[#0067DB]" />
                    </div>
                  ) : null}
                  {mobileShortcutMenu === "amenities" || mobileShortcutMenu === "roomTypes"
                    ? (mobileShortcutMenu === "roomTypes" ? filterOptions.roomTypes : filterOptions.facilities).map((option) => {
                        const draft = mobileShortcutMenu === "roomTypes" ? mobileShortcutDraftRoomTypes : mobileShortcutDraftFacilities;
                        const setDraft = mobileShortcutMenu === "roomTypes" ? setMobileShortcutDraftRoomTypes : setMobileShortcutDraftFacilities;
                        const selected = draft.includes(option.value);
                        return (
                          <button key={option.value} type="button" role="checkbox" aria-checked={selected} className={menuItemClass} onClick={() => setDraft((current) => (current.includes(option.value) ? current.filter((item) => item !== option.value) : [...current, option.value]))}>
                            <span className="flex min-w-0 items-center gap-[10px]"><span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300">{selected ? <Check className="h-4 w-4 text-[#004BB8]" /> : null}</span><span>{option.label}</span></span>
                            <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
                              <span>{option.count}</span>
                            </span>
                          </button>
                        );
                      })
                    : null}
                </div>
                {<footer className="flex items-center justify-between gap-3 bg-[#F2F4F8] px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
                    <button type="button" className="h-11 w-[32%] shrink-0 rounded-lg border border-[#D8DEE8] bg-[#F2F4F8] px-4 text-sm font-semibold text-slate-700" onClick={() => { if (mobileShortcutMenu === "sort") setMobileDraftSort("cheapest"); else if (mobileShortcutMenu === "price") { setMobileShortcutDraftMinPrice(0); setMobileShortcutDraftMaxPrice(resultMaxPrice); } else if (mobileShortcutMenu === "stars") setMobileShortcutDraftStars([]); else if (mobileShortcutMenu === "roomTypes") setMobileShortcutDraftRoomTypes([]); else setMobileShortcutDraftFacilities([]); }}>
                      Reset
                    </button>
                    <button
                      type="button"
                      className="h-11 w-[32%] shrink-0 rounded-lg bg-[#004BB8] px-4 text-sm font-semibold text-white"
                      onClick={() => {
                        if (mobileShortcutMenu === "sort") { updateHotelSummarySortMode(mobileDraftSort); closeMobileShortcutMenu(true); return; }
                        triggerFilterApplying();
                        if (mobileShortcutMenu === "price") { setMinPrice(mobileShortcutDraftMinPrice); setMaxPrice(mobileShortcutDraftMaxPrice); }
                        else if (mobileShortcutMenu === "stars") setSelectedHotelClasses(mobileShortcutDraftStars);
                        else if (mobileShortcutMenu === "roomTypes") setSelectedFilters((current) => ({ ...current, roomTypes: mobileShortcutDraftRoomTypes }));
                        else
                          setSelectedFilters((current) => ({
                            ...current,
                            facilities: mobileShortcutDraftFacilities,
                          }));
                        closeMobileShortcutMenu(true);
                      }}
                    >
                      Apply
                    </button>
                </footer>}
              </section>
            </div>,
            document.body,
          )
        : null;

    return (
      <>
        <div
          data-mobile-hotel-shortcuts
          className="scrollbar-hide flex w-full min-w-0 flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:hidden"
        >
          <button
            type="button"
            aria-label={activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter"}
            className={shortcutButtonClass}
            onClick={(event) => {
              mobileFiltersLauncherRef.current = event.currentTarget;
              mobileFiltersModalityRef.current = getOverlayActivationModality(event);
              openAllFilters();
            }}
          >
            <span
              className={cn(
                shortcutChipClass,
                activeFilterCount > 0
                  ? "border-[#142033] bg-white text-[#142033]"
                  : "border-[#D8E1EC] bg-white text-[#142033] group-hover:bg-slate-50",
              )}
            >
              <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
              <span>Filter</span>
              {activeFilterCount > 0 ? <span className="rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold text-[#142033]">{activeFilterCount}</span> : null}
            </span>
          </button>
          {hasPricedResults ? trigger("price", mobilePriceShortcutLabel, priceFilterActive) : null}
          {trigger("stars", mobileStarsShortcutLabel, selectedHotelClasses.length > 0)}
          {trigger("amenities", mobileFacilitiesShortcutLabel, selectedFilters.facilities.length > 0)}
          {filterOptions.roomTypes.length > 1 ? trigger("roomTypes", mobileRoomTypesShortcutLabel, selectedFilters.roomTypes.length > 0) : null}
        </div>
        {menu}
      </>
    );
  }

  let loadingContent = null;
  if (loading || filterApplying) {
    if (guided) {
      return (
        <section aria-labelledby="deals-guided-hotel-results-status" aria-busy="true" className="mt-6 space-y-4">
          <h2 ref={guidedLoadingStatusRef} id="deals-guided-hotel-results-status" tabIndex={-1} className="text-lg font-bold text-slate-950" role="status">
            {t("deals.guided.hotelResults.loading")}
          </h2>
          <HotelCardSkeleton />
          <HotelCardSkeleton />
        </section>
      );
    }
    loadingContent = (
      <main className="flex min-h-[calc(100svh-5rem)] flex-1 bg-[radial-gradient(circle_at_top_left,rgba(92,182,178,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,75,184,0.16),transparent_36%),linear-gradient(180deg,#F2F7FA_0%,#FFFFFF_58%,#FFFFFF_100%)]">
        <BrandedLoading variant="fullscreen" visual="logoPulse" showProgress={false} searchType="hotel" className="min-h-[calc(100svh-5rem)] flex-1 bg-transparent px-5" contentClassName="max-w-md text-center" />
      </main>
    );
  }

  const ResultsRoot = guided ? "div" : "main";
  const stayNights = Math.max(1, Math.round((new Date(`${body.checkOut}T00:00:00Z`).getTime() - new Date(`${body.checkIn}T00:00:00Z`).getTime()) / 86_400_000));
  const renderDesktopHotelSearch = (idPrefix: string) => (
    <HotelSearchBar
      key={`${body.destination}-${body.checkIn}-${body.checkOut}-${body.guests}-${body.rooms}-${body.sort}`}
      initialDestination={activeDesktopHotelSearchDraft.destination}
      initialDestinationId={activeDesktopHotelSearchDraft.destinationId}
      initialCheckIn={activeDesktopHotelSearchDraft.checkIn}
      initialCheckOut={activeDesktopHotelSearchDraft.checkOut}
      initialGuests={activeDesktopHotelSearchDraft.guests}
      initialRooms={activeDesktopHotelSearchDraft.rooms}
      initialSort={body.sort}
      errorRole="alert"
      compact
      desktopPresentation="results-flat"
      idPrefix={idPrefix}
      className="min-w-0"
      onDesktopDraftChange={updateDesktopHotelSearchDraft}
      onSubmitStart={() => {
        mobileHotelSearchModalityRef.current = "programmatic";
        triggerSearchApplying();
      }}
    />
  );

  const renderMobileHotelNavSearch = () => (
    <button
      type="button"
      data-hotel-results-mobile-nav-search-button
      inert={mobileHotelSearchOpen ? true : undefined}
      aria-hidden={mobileHotelSearchOpen ? true : undefined}
      aria-label={`${t("editHotelSearch")}: ${body.destination}, ${mobileNavDateSummary}, ${mobileNavGuestsSummary}`}
      aria-haspopup="dialog"
      aria-expanded={mobileHotelSearchOpen}
      onClick={openMobileHotelSearch}
      className={cn("focus-ring flex h-full w-full min-w-0 items-center gap-1.5 rounded-xl bg-[#F5F7FB] py-1 pe-2 ps-3 text-start transition hover:bg-[#EDF2FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35", mobileHotelSearchOpen && "pointer-events-none")}
    >
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="block truncate text-[14px] font-semibold leading-[18px] text-[#142033]">
          {body.destination}
        </span>
        <span className="mt-0.5 block truncate text-[11px] font-medium leading-[15px] text-[#536B92]">
          {mobileNavDateSummary} · {mobileNavGuestsSummary}
        </span>
      </span>
      <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#142033]">
        <SquarePen size={15} strokeWidth={2} />
      </span>
    </button>
  );

  const mobileResultsFiltersContent =
    !guided && results.length > 0 ? (
      <section
        data-hotel-results-toolbar
        className="w-full py-2 sm:hidden"
        aria-label="Hotel result filters"
      >
        {renderMobileHotelShortcuts()}
      </section>
    ) : null;

  return (
    <>
      {!guided && !loadingContent && mobileNavSearchTarget
        ? createPortal(renderMobileHotelNavSearch(), mobileNavSearchTarget)
        : null}
      {!guided && !loadingContent && mobileNavFiltersTarget && mobileResultsFiltersContent
        ? createPortal(mobileResultsFiltersContent, mobileNavFiltersTarget)
        : null}
      {!guided && !loadingContent && desktopSearchPlacement === "navbar" && desktopNavSearchTarget
        ? createPortal(renderDesktopHotelSearch("hotel-results-nav-search"), desktopNavSearchTarget)
        : null}
      {!guided && paginationTransitionPhase !== "idle" && typeof document !== "undefined"
        ? createPortal(
            <HotelResultsPageTransitionSkeleton />,
            document.body,
          )
        : null}
      {loadingContent ?? <>
      <ResultsRoot
        onClickCapture={(event) => {
          if (guided || !window.matchMedia("(max-width: 639px)").matches) return;
          const target = event.target;
          if (!(target instanceof Element) || !target.closest('a[href*="/hotels/details/"]')) return;
          saveMobileHotelResultsState(bodySearchKey, {
            minPrice, maxPrice: maxPrice >= resultMaxPrice ? null : maxPrice,
            selectedHotelClasses, propertyNameQuery, selectedFilters,
            sort: hotelSummarySortMode, page: currentResultsPage,
            scrollY: window.scrollY, savedAt: Date.now(),
          });
        }}
        className={cn(!guided && mobileStyles.results, guided ? "mt-6 min-w-0" : "flex-1 overflow-x-clip bg-[#F5F7FB] pb-2 sm:pb-8 sm:bg-[#f6f8fb] lg:bg-white")}
        {...(!guided ? { "data-mobile-web-hotel-results": "" } : {})}
        {...(guided && !error
          ? {
              role: "region",
              "aria-labelledby": "deals-guided-hotel-results-heading",
            }
          : {})}
      >
        {!guided ? (
          <MobileResultsEditSheet
            open={mobileHotelSearchOpen}
            browserCanvasColor="#ffffff"
            backdropClassName={mobileStyles.editBackdrop}
            smoothMotion
            isolatedBackdrop
            closing={mobileHotelSearchClosing}
            onCloseAnimationComplete={finishMobileHotelSearchClose}
            nestedLayerOpen={mobileHotelNestedLayerOpen}
            title={t("editHotelSearch") || "Edit hotel search"}
            onClose={closeMobileHotelSearch}
            className={mobileStyles.editSheet}
            contentClassName=""
          >
            <HotelSearchBar
              key={`mobile-drawer-${bodySearchKey}-${body.sort}`}
              idPrefix="hotel-results-mobile-drawer"
              initialDestination={activeMobileHotelSearchDraft.destination}
              initialDestinationId={activeMobileHotelSearchDraft.destinationId}
              initialCheckIn={activeMobileHotelSearchDraft.checkIn}
              initialCheckOut={activeMobileHotelSearchDraft.checkOut}
              initialGuests={activeMobileHotelSearchDraft.guests}
              initialRooms={activeMobileHotelSearchDraft.rooms}
              initialSort={body.sort}
              errorRole="alert"
              compact
              mobileLayout="drawer"
              mobileResultsSheet
              onCloseMobileSearch={closeMobileHotelSearch}
              onMobileDraftChange={updateMobileHotelSearchDraft}
              onMobileNestedLayerChange={setMobileHotelNestedLayerOpen}
              onSubmitStart={() => {
                mobileHotelSearchModalityRef.current = "programmatic";
                triggerSearchApplying();
              }}
            />
          </MobileResultsEditSheet>
        ) : null}

        {!guided ? (
          <section data-hotel-results-desktop-search className="hidden bg-[#f6f8fb] pb-1 pt-5 sm:block lg:hidden">
            <div className="page-shell">
              <div className="relative z-40 min-w-0 overflow-visible">
                <div className="relative z-10 min-w-0 overflow-visible">
                  {desktopSearchPlacement === "page" ? renderDesktopHotelSearch("hotel-results-full-search") : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <div data-hotel-results-scroll-region className={cn(guided ? "grid gap-y-5 pb-6 min-[1200px]:grid-cols-[288px_minmax(0,1fr)] min-[1200px]:gap-x-8" : "page-shell grid gap-y-3 pb-2 pt-0 max-sm:w-[calc(100%-24px)] sm:gap-y-5 sm:pb-6 sm:pt-6 min-[1200px]:grid-cols-[288px_minmax(0,1fr)] min-[1200px]:gap-x-8")}>
          <aside className="relative hidden w-[260px] self-stretch min-[1200px]:block min-[1200px]:justify-self-end">
            <HotelResultsMapPreview destination={body.destination} />
            <div ref={desktopFilterPanelRef}>
              <HotelFilters layout="desktop" propertyNameQuery={propertyNameQuery} setPropertyNameQuery={updatePropertyNameQuery} t={t} maxPrice={maxPrice} minPrice={minPrice} setMaxPrice={updateMaxPrice} setMinPrice={updateMinPrice} resultMaxPrice={resultMaxPrice} hasPricedResults={hasPricedResults} formatPrice={formatHotelFilterPrice} locale={locale} stayNights={stayNights} selectedRatings={selectedHotelClasses} toggleRating={toggleHotelClass} starRatingCounts={starRatingCounts} options={filterOptions} selectedFilters={selectedFilters} toggleFilter={toggleFilter} activeFilterCount={activeFilterCount} onClear={resetFilters} />
            </div>
            {!guided && showStickyHotelFilters ? (
              <StickyHotelPopularFilters
                t={t}
                locale={locale}
                options={filterOptions}
                selectedFilters={selectedFilters}
                selectedRatings={selectedHotelClasses}
                starRatingCounts={starRatingCounts}
                toggleFilter={toggleFilter}
                toggleRating={toggleHotelClass}
              />
            ) : null}
          </aside>

          <section data-hotel-results-list-start ref={desktopResultsContentRef} className="relative min-w-0 space-y-2 sm:space-y-4">
            {error && results.length === 0 ? (
              <div ref={guided ? guidedErrorRef : undefined} tabIndex={guided ? -1 : undefined} className={cn(hotelResultStackClass, "rounded-[13px] border border-danger/20 bg-white p-4 text-slate-950 shadow-[0_10px_28px_-24px_rgba(2,28,43,0.30)] sm:rounded-md sm:border-danger/30 sm:bg-red-50 sm:text-danger sm:shadow-none")}>
                <p role="alert" className="text-sm font-semibold leading-5">{error}</p>
                <Button className="mt-4 min-h-11 w-full sm:w-auto" onClick={retryGuidedHotelSearch}>
                  {t("deals.guided.hotelResults.retry")}
                </Button>
              </div>
            ) : showFilteredEmptyState ? (
              <div className={cn(hotelResultStackClass, "space-y-2 sm:space-y-4")}>
                <ActiveHotelFilterChips chips={activeFilterChips} onRemove={removeFilterChip} t={t} />
                <div className="rounded-[13px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_-24px_rgba(2,28,43,0.30)] sm:rounded-2xl sm:border-[#004BB8]/10 sm:shadow-[0_16px_40px_-24px_rgba(2,28,43,0.28)]">
                  <p className="text-[16px] font-bold leading-6 text-[#021C2B]">{t("hotelResults.noStaysMatchFiltersTitle")}</p>
                  <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-muted sm:mt-2 sm:text-sm sm:leading-6">{t("hotelResults.noStaysMatchFiltersBody")}</p>
                  <Button variant="secondary" className="mt-4 min-h-11 w-full sm:w-auto" onClick={resetFilters}>
                    {t("hotelResults.resetFilters")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className={cn(hotelResultStackClass, "space-y-4")}>
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="hidden min-h-11 gap-2 sm:inline-flex min-[1200px]:!hidden"
                    onClick={(event) => {
                      mobileFiltersLauncherRef.current = event.currentTarget;
                      mobileFiltersModalityRef.current = getOverlayActivationModality(event);
                      openAllFilters();
                    }}
                  >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    {t("filters")}
                    {activeFilterCount ? ` (${activeFilterCount})` : ""}
                  </Button>

                  <div role="group" aria-label={t("hotelResults.summaryAria")} className={cn("flex w-full flex-col gap-2 py-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3", !guided && "min-[1200px]:grid min-[1200px]:grid-cols-[minmax(0,1fr)_auto]")}>
                    <div className={cn(!guided && "hidden sm:block")}>
                      {guided ? (
                        <h2 ref={guidedResultsHeadingRef} id="deals-guided-hotel-results-heading" tabIndex={-1} className="text-xl font-bold leading-7 tracking-[-0.015em] text-[#142033] sm:text-2xl">
                          {resultsHeading}
                        </h2>
                      ) : (
                        <h1 ref={standaloneResultsHeadingRef} tabIndex={-1} className="scroll-mt-20 text-[12px] font-bold leading-4 text-[#071A48]">
                          {resultsHeading}
                        </h1>
                      )}
                      {resultsDisplayRange && totalHotelResultPages > 1 ? (
                        <p aria-label={`Showing results ${resultsDisplayRange.start} through ${resultsDisplayRange.end}`} className="mt-0.5 text-xs font-medium leading-4 text-slate-500">
                          Showing {resultsDisplayRange.start}&ndash;
                          {resultsDisplayRange.end}
                        </p>
                      ) : null}
                    </div>
                    <div className="hidden shrink-0 flex-nowrap items-center justify-end whitespace-nowrap sm:flex min-[1200px]:justify-self-end">
                      <div
                        ref={hotelSortWrapperRef}
                        className="relative inline-flex shrink-0 items-center whitespace-nowrap"
                        onBlur={(event) => {
                          if (!event.currentTarget.contains(event.relatedTarget)) {
                            setHotelSortMenuOpen(false);
                          }
                        }}
                      >
                        <button ref={hotelSortTriggerRef} type="button" aria-haspopup="listbox" aria-expanded={hotelSortMenuOpen} aria-controls="hotel-results-sort-menu" className={cn("hotel-results-sort-trigger inline-flex h-8 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-[#9299A9] bg-white px-3 text-[#071A48] outline-none transition-colors hover:border-[#191E3B] hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 focus-visible:ring-offset-2", hotelSortMenuOpen && "border-[#191E3B] bg-[#ECF4FD] ring-1 ring-inset ring-[#191E3B]")} onClick={handleHotelSortTriggerClick}>
                          <span>{t("sortBy") || "Sort by"} {currentSortLabel}</span>
                          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>

                        {hotelSortMenuOpen ? (
                          <div ref={hotelSortMenuRef} id="hotel-results-sort-menu" role="listbox" aria-label={t("sortBy") || "Sort by"} className="absolute right-0 top-[calc(100%+12px)] z-50 w-[270px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg bg-white p-6 shadow-[0_2px_12px_rgba(12,14,28,0.08)]">
                            {hotelSortOptions.map((option, index) => {
                              const selected = option.value === hotelSummarySortMode;

                              return (
                                <button
                                  key={option.value}
                                  ref={(element) => {
                                    hotelSortOptionRefs.current[index] = element;
                                  }}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  tabIndex={selected ? 0 : -1}
                                  className="hotel-results-sort-option flex h-12 w-full items-center justify-between gap-3 px-3 text-left text-[#191E3B] transition-colors hover:bg-[#F5F7FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30"
                                  onClick={() => {
                                    updateHotelSummarySortMode(option.value);
                                    setHotelSortMenuOpen(false);
                                    hotelSortTriggerRef.current?.focus({
                                      preventScroll: true,
                                    });
                                  }}
                                  onKeyDown={(event) => handleHotelSortOptionKeyDown(event, index)}
                                >
                                  <span>{option.label}</span>
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden="true">{selected ? <Check className="h-6 w-6" strokeWidth={2.25} /> : null}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <ActiveHotelFilterChips chips={activeFilterChips} onRemove={removeFilterChip} t={t} />

                  {hasGoogleMapsResults ? (
                    <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal leading-5 text-[#5E5E5E] shadow-sm">
                      Hotel discovery data provided by{" "}
                      <span translate="no" className="whitespace-nowrap not-italic font-normal text-sm text-[#5E5E5E]">
                        Google Maps
                      </span>
                    </p>
                  ) : null}

                  {!guided ? (
                    <div data-mobile-hotel-results-summary role="group" aria-label={t("hotelResults.summaryAria")} className="flex items-center justify-between gap-2 sm:hidden">
                      <div className="min-w-0">
                        <h1 tabIndex={-1} className="scroll-mt-20 truncate whitespace-nowrap text-[13px] font-bold leading-[17px] text-[#071A48]">
                          {resultsHeading}
                        </h1>
                        {resultsDisplayRange && totalHotelResultPages > 1 ? (
                          <p aria-label={`Showing results ${resultsDisplayRange.start} through ${resultsDisplayRange.end}`} className="mt-0.5 text-xs font-medium leading-4 text-slate-500">
                            Showing {resultsDisplayRange.start}&ndash;{resultsDisplayRange.end}
                          </p>
                        ) : null}
                      </div>
                      <button type="button" data-hotel-sort-trigger aria-label={`Sort hotels: ${currentSortLabel}`} aria-haspopup="dialog" aria-expanded={mobileShortcutMenu === "sort"} onClick={(event) => openMobileShortcutMenu("sort", event.currentTarget)} className="focus-ring inline-flex min-h-[38px] min-w-[116px] shrink-0 items-center justify-center gap-[5px] rounded-[10px] border border-[#D8E1EC] px-2.5 py-2 text-[13px] font-medium leading-[17px] text-[#56658E]">
                        <span>Sort:</span><span className="font-semibold text-[#071A48]">{currentSortLabel}</span><ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}

                  <div ref={paginationListRef} aria-busy={paginationPendingPage !== null} style={paginationMinHeight ? { minHeight: paginationMinHeight } : undefined} className={cn("relative max-sm:-mx-2 max-sm:w-[calc(100%+16px)] space-y-2 sm:space-y-4 lg:!space-y-3", paginationRevealing && "animate-[fadeIn_150ms_ease-out]")}>
                    {paginationTransitionPhase === "covering" ? (
                      <div className="space-y-4">
                        <div role="status" aria-live="polite" className="sr-only">
                          {t("updatingResults")}
                        </div>
                        {Array.from(
                          {
                            length: paginatedVisibleHotels.length,
                          },
                          (_, index) => (
                            <HotelCardSkeleton key={index} />
                          ),
                        )}
                      </div>
                    ) : paginatedVisibleHotels.length ? (
                      paginatedVisibleHotels.map((hotel, index) => {
                        const internalHref = guided ? (buildDetailsHref?.(hotel.id) ?? null) : `/hotels/details/${encodeURIComponent(hotel.id)}?${hotelDetailsSearchParams}`;
                        const alternatives = additionalHotelOffers.get(hotel.id) ?? [];
                        return <section key={hotel.id} aria-label={hotel.name}>
                          <HotelCard hotel={hotel} providerLabel={isKayakSandboxResult(hotel) ? "KAYAK sandbox" : undefined} detailsHref={resultActionHref(hotel, internalHref)} actionLabel={guided ? t("deals.guided.hotelResults.viewRooms") : undefined} actionAriaLabel={guided ? t("deals.guided.hotelResults.viewRoomsFor").replace("{{hotelName}}", hotel.name) : undefined} unavailableActionLabel={guided ? t("deals.guided.hotelResults.roomsUnavailable") : undefined} unavailableActionAriaLabel={guided ? t("deals.guided.hotelResults.roomsUnavailableFor").replace("{{hotelName}}", hotel.name) : undefined} allowExternalAttribution={!guided} allowSave={!guided} stayNights={stayNights} sortBadge={(currentResultsPage - 1) * HOTEL_RESULTS_PAGE_SIZE + index === 0 ? hotelSummarySortMode : undefined} />
                          {alternatives.length > 0 ? <details className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
                            <summary className="cursor-pointer font-semibold">{t("deals.guided.hotelResults.viewRooms")} ({alternatives.length})</summary>
                            <div className="mt-3 space-y-3">{alternatives.map(offer => {
                              const href = guided ? (buildDetailsHref?.(offer.id) ?? null) : `/hotels/details/${encodeURIComponent(offer.id)}?${hotelDetailsSearchParams}`;
                              return <HotelCard key={offer.id} hotel={offer} providerLabel={isKayakSandboxResult(offer) ? "KAYAK sandbox" : undefined} detailsHref={resultActionHref(offer, href)} allowExternalAttribution={!guided} allowSave={!guided} stayNights={stayNights} />;
                            })}</div>
                          </details> : null}
                        </section>;
                      })
                    ) : (
                      <div className="rounded-[13px] border border-slate-200 bg-white p-4 text-[13px] font-semibold leading-5 text-muted shadow-[0_10px_28px_-24px_rgba(2,28,43,0.30)] sm:rounded-xl sm:p-6 sm:text-sm sm:shadow-sm">
                        <p>{guided && results.length === 0 ? t("deals.guided.hotelResults.empty") : t("hotelResults.noStaysMatchFiltersInline")}</p>
                        {guided && results.length === 0 ? (
                          <Button className="mt-4 min-h-11 w-full sm:w-auto" onClick={retryGuidedHotelSearch}>
                            {t("deals.guided.hotelResults.retry")}
                          </Button>
                        ) : null}
                      </div>
                    )}
                    {!guided && totalHotelResultPages > 1 && !filterApplying ? (
                      <nav aria-label="Hotel results pages" className="flex flex-wrap items-center justify-center gap-1 pt-2 sm:gap-1.5 sm:pt-4">
                        <button type="button" aria-label="Previous page" disabled={currentResultsPage === 1 || paginationPendingPage !== null} onClick={() => changeResultsPage(currentResultsPage - 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-transparent bg-transparent text-[#07133B] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent sm:border-slate-200 sm:bg-white sm:text-slate-700 sm:disabled:opacity-40">
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <span className="hidden items-center gap-1.5 sm:flex">{paginationItems.map((item, index) =>
                          item === "ellipsis" ? (
                            <span key={`ellipsis-${index}`} className="inline-flex min-h-11 min-w-8 items-center justify-center text-slate-500" aria-hidden="true">
                              …
                            </span>
                          ) : (
                            <button key={item} type="button" disabled={paginationPendingPage !== null} aria-current={item === currentResultsPage ? "page" : undefined} onClick={() => changeResultsPage(item)} className={cn("inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border text-sm font-bold", item === currentResultsPage ? "border-[#004BB8] bg-[#004BB8] text-white" : "border-slate-200 bg-white text-slate-800 hover:border-[#004BB8]/40")}>
                              {item}
                            </button>
                          ),
                        )}</span>
                        <span className="flex items-center sm:hidden">{mobilePaginationItems.map((item) => (
                          <button key={item} type="button" disabled={paginationPendingPage !== null} aria-label={`Page ${item}`} aria-current={item === currentResultsPage ? "page" : undefined} onClick={() => changeResultsPage(item)} className={cn("inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-transparent bg-transparent text-sm font-semibold text-[#07133B] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35", item === currentResultsPage && "font-bold text-[#004BB8]")}>
                            {item}
                          </button>
                        ))}</span>
                        <button type="button" aria-label="Next page" disabled={currentResultsPage === totalHotelResultPages || paginationPendingPage !== null} onClick={() => changeResultsPage(currentResultsPage + 1)} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border border-transparent bg-transparent text-sm font-bold text-[#07133B] transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent sm:border-slate-200 sm:bg-white sm:px-3 sm:text-slate-700 sm:disabled:opacity-40">
                          <span className="hidden sm:inline">Next</span><ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </nav>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {!guided ? (
          <button
            type="button"
            aria-label="Back to top"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: prefersReducedResultsMotion() ? "auto" : "smooth",
              })
            }
            className={cn("fixed right-4 z-[800] flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-[#F8FAFC] text-[#004BB8] shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] sm:bottom-6 sm:right-6", "bottom-[calc(1rem+env(safe-area-inset-bottom))]", showBackToTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0")}
          >
            <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        ) : null}

        {filtersOpen ? <button type="button" aria-label={t("closeFilters")} onClick={() => setFiltersOpen(false)} className="fixed inset-0 z-[9999] bg-slate-950/35 sm:backdrop-blur-[1px] min-[1200px]:hidden" /> : null}

        <aside ref={mobileFiltersDialogRef} role="dialog" aria-modal="true" aria-label="Hotel filters" aria-hidden={!filtersOpen} className={cn(mobileStyles.filterPalette, "fixed inset-y-0 right-0 z-[10000] flex h-[95dvh] w-full flex-col overflow-clip rounded-t-[20px] bg-[#F2F4F8] shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none max-sm:top-auto sm:h-[100dvh] sm:rounded-none sm:w-[420px] min-[1200px]:hidden", filtersOpen ? "translate-y-0 sm:translate-x-0" : "pointer-events-none translate-y-full sm:translate-x-full sm:translate-y-0")}>
          <div className="relative flex h-16 shrink-0 items-center justify-start bg-[#F2F4F8] px-5 sm:hidden">
            <div><h2 className="text-base font-semibold text-slate-950">Filters</h2>{activeFilterCount > 0 ? <p className="text-xs font-medium text-slate-500">{activeFilterCount} applied</p> : null}</div>
            <button type="button" aria-label={t("closeFilters")} onClick={() => setFiltersOpen(false)} className="focus-ring absolute right-3 flex h-11 w-11 items-center justify-center rounded-lg text-slate-700"><X size={22} /></button>
          </div>
          <div className="hidden sm:contents">
          <div className="shrink-0 border-b border-slate-200 bg-[#F2F4F8] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:px-5 sm:pb-4 sm:pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-slate-700" aria-hidden="true">
                    <SlidersHorizontal className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold leading-6 tracking-[-0.01em] text-slate-950">{t("filters")}</h2>
                    <p className="text-xs font-medium text-slate-500">{activeFilterCount ? `${activeFilterCount} applied` : "All stays shown"}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {activeFilterCount > 0 ? (
                  <button type="button" onClick={resetFilters} className="min-h-11 rounded-lg px-2.5 text-sm font-bold text-[#004BB8] transition hover:bg-[#EAF2FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30">
                    {t("clearAll")}
                  </button>
                ) : null}
                <Button type="button" variant="ghost" className="h-11 w-11 shrink-0 rounded-xl bg-transparent px-0 text-slate-700 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2" aria-label={t("closeFilters")} onClick={() => setFiltersOpen(false)}>
                  <X size={20} />
                </Button>
              </div>
            </div>
          </div>

          </div>
          <div className={cn("hotel-filter-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#F2F4F8] px-6 py-4 sm:px-5", filterScrollbarVisible ? "hotel-filter-scrollbar--visible" : undefined)} onScroll={showFilterScrollbarWhileScrolling}>
            {activeFilterChips.length ? (
              <div className="hidden sm:block mb-3 rounded-xl border border-[#C9D9EA] bg-white p-3 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.5)]">
                <ActiveHotelFilterChips chips={activeFilterChips} onRemove={removeFilterChip} t={t} />
              </div>
            ) : null}
            <HotelFilters key={filtersOpen ? "open" : "closed"} layout="mobile" propertyNameQuery={propertyNameQuery} setPropertyNameQuery={updatePropertyNameQuery} t={t} maxPrice={maxPrice} minPrice={minPrice} setMaxPrice={updateMaxPrice} setMinPrice={updateMinPrice} resultMaxPrice={resultMaxPrice} hasPricedResults={hasPricedResults} formatPrice={formatHotelFilterPrice} locale={locale} stayNights={stayNights} selectedRatings={selectedHotelClasses} toggleRating={toggleHotelClass} starRatingCounts={starRatingCounts} options={{ ...filterOptions, propertyTypes: buildTermOptions(results, PROPERTY_TYPE_FILTERS, (hotel) => hotel.catalogueProfile?.propertyType ?? "", t, true) }} selectedFilters={selectedFilters} toggleFilter={toggleFilter} activeFilterCount={activeFilterCount} onClear={resetFilters} />
          </div>

          <div className="flex shrink-0 items-center gap-3 border-t border-[#D8DEE8] bg-[#F2F4F8] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_24px_rgba(15,23,42,0.08)] sm:px-5 sm:pb-4 sm:pt-4">
            {activeFilterCount > 0 ? <button type="button" aria-label="Reset hotel filters" className="focus-ring h-11 w-[30%] shrink-0 rounded-lg border border-[#D8DEE8] bg-[#F2F4F8] px-5 text-sm font-semibold text-slate-700 sm:hidden" onClick={resetFilters}>Reset</button> : null}
            <Button
              type="button"
              disabled={sortedVisibleHotels.length === 0}
              aria-live="polite"
              className="h-11 flex-1 min-w-0 rounded-lg sm:h-12 sm:rounded-xl bg-[#004BB8] px-5 text-sm font-semibold sm:text-base sm:font-bold text-white shadow-md shadow-[#004BB8]/12 transition hover:bg-[#003f9c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
              onClick={() => {
                triggerFilterApplying();
                setFiltersOpen(false);
              }}
            >
              <span className={locale.startsWith("en") ? "hidden sm:inline" : undefined}>{sortedVisibleHotels.length === 0 ? t("hotelResults.noStaysMatchFiltersTitle") : `${t("deals.results.package.view.hotel")} (${new Intl.NumberFormat(locale).format(sortedVisibleHotels.length)})`}</span>
              {locale.startsWith("en") ? <span className="sm:hidden">{sortedVisibleHotels.length === 0 ? "No matching stays" : activeFilterCount > 0 ? `View ${sortedVisibleHotels.length} matching ${sortedVisibleHotels.length === 1 ? "stay" : "stays"}` : `View all ${sortedVisibleHotels.length} stays`}</span> : null}
            </Button>
          </div>
        </aside>
      </ResultsRoot>
      {!guided ? <Footer variant="brand-legal-only" /> : null}
      {!guided ? <HotelResultsScrollIndicator /> : null}
      </>}
    </>
  );
}

function sortHotelSummaryResults(hotels: PublicHotelResult[], sortMode: HotelSummarySortMode, rates?: ExchangeRates) {
  const indexedHotels = hotels.map((hotel, index) => ({ hotel, index }));

  if (sortMode === "bestValue" && !hotels.some(hasHotelValueScore)) {
    return hotels;
  }

  indexedHotels.sort((first, second) => {
    if (sortMode === "cheapest") {
      return compareHotelsByAvailablePrice(first.hotel, second.hotel, rates) || first.index - second.index;
    }

    if (sortMode === "topRated") {
      const firstReview = getHotelComparableReviewScore(first.hotel);
      const secondReview = getHotelComparableReviewScore(second.hotel);
      return compareNullableScoresDescending(firstReview, secondReview) || getHotelSortableClassification(second.hotel) - getHotelSortableClassification(first.hotel) || getHotelSortablePrice(first.hotel, rates) - getHotelSortablePrice(second.hotel, rates) || first.index - second.index;
    }

    const firstScore = getHotelValueSortScore(first.hotel);
    const secondScore = getHotelValueSortScore(second.hotel);

    if (firstScore === null && secondScore === null) {
      return first.index - second.index;
    }

    if (firstScore === null) return 1;
    if (secondScore === null) return -1;

    return secondScore - firstScore || getHotelSortablePrice(first.hotel, rates) - getHotelSortablePrice(second.hotel, rates) || first.index - second.index;
  });

  return indexedHotels.map(({ hotel }) => hotel);
}

function getHotelSortablePrice(hotel: PublicHotelResult, rates?: ExchangeRates) {
  const comparableTotalUsd = getComparableHotelTotalUsd(hotel, rates);
  return comparableTotalUsd ?? Number.POSITIVE_INFINITY;
}

function compareNullableScoresDescending(first: number | null, second: number | null) {
  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  return second - first;
}

function getHotelSortableClassification(hotel: PublicHotelResult) {
  return hotel.classificationStars ?? Number.NEGATIVE_INFINITY;
}

function hasHotelValueScore(hotel: PublicHotelResult) {
  return getHotelValueSortScore(hotel) !== null;
}

function getHotelValueSortScore(hotel: PublicHotelResult) {
  if (!hasHotelPrice(hotel)) return null;
  return Number.isFinite(hotel.valueScore) ? hotel.valueScore : null;
}

function formatHotelRating(rating: number, t: (key: string) => string, locale: string) {
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: Number.isInteger(rating) ? 0 : 1,
    minimumFractionDigits: Number.isInteger(rating) ? 0 : 1,
  }).format(rating);

  return t(rating === 1 ? "hotelResults.starSingular" : "hotelResults.starPlural").replace("{{count}}", formatted);
}

function formatHotelCount(count: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(count);
}

function ActiveHotelFilterChips({ chips, onRemove, t }: { chips: ActiveHotelFilterChip[]; onRemove: (chip: ActiveHotelFilterChip) => void; t: (key: string) => string }) {
  if (!chips.length) return null;

  return (
    <div className="hidden max-w-full overflow-x-clip sm:block">
      <div className="flex max-w-full flex-wrap items-center gap-2" aria-label={t("hotelResults.activeHotelFilters")}>
        {chips.map((chip) => (
          <button key={chip.key} type="button" className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-950 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25" onClick={() => onRemove(chip)} aria-label={t("hotelResults.removeFilter").replace("{{label}}", chip.label)}>
            <span className="truncate">{chip.kind === "priceRange" ? <MobileHotelPriceText text={chip.label} /> : chip.label}</span>
            <span aria-hidden="true" className="text-sm leading-none text-slate-700">
              ×
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HotelResultsPageTransitionSkeleton() {
  return (
    <div aria-hidden="true" className="fixed inset-0 z-[1200] overflow-hidden bg-[#f6f8fb] lg:bg-white">
      <div className="h-20 border-b border-slate-100 bg-white px-4 sm:h-24">
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between">
          <div className="h-8 w-40 animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none" />
          <div className="flex items-center gap-3">
            <div className="hidden h-5 w-16 animate-pulse rounded bg-slate-200 motion-reduce:animate-none sm:block" />
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-white px-4 py-5">
        <div className="mx-auto max-w-[1180px]">
          <div className="hidden h-[72px] animate-pulse grid-cols-[1.2fr_1fr_.7fr_112px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm motion-reduce:animate-none sm:grid">
            <div className="border-r border-slate-200 p-4"><div className="h-4 w-36 rounded bg-slate-200" /><div className="mt-2 h-3 w-24 rounded bg-slate-100" /></div>
            <div className="border-r border-slate-200 p-4"><div className="h-4 w-40 rounded bg-slate-200" /><div className="mt-2 h-3 w-28 rounded bg-slate-100" /></div>
            <div className="border-r border-slate-200 p-4"><div className="h-4 w-28 rounded bg-slate-200" /><div className="mt-2 h-3 w-20 rounded bg-slate-100" /></div>
            <div className="m-2 rounded-xl bg-[#D9E7F7]" />
          </div>
          <div className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm motion-reduce:animate-none sm:hidden">
            <div className="h-4 w-32 rounded bg-slate-200" /><div className="mt-2 h-3 w-48 rounded bg-slate-100" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6">
        <div className="mb-5 flex gap-2 sm:hidden">
          {[76, 68, 72, 96].map((width) => <div key={width} className="h-11 shrink-0 animate-pulse rounded-xl border border-slate-200 bg-white motion-reduce:animate-none" style={{ width }} />)}
        </div>
        <div className="grid min-w-0 gap-8 min-[1200px]:grid-cols-[288px_minmax(0,1fr)]">
          <aside className="hidden min-[1200px]:block">
            <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-5 w-24 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
              <div className="h-11 animate-pulse rounded-lg bg-slate-100 motion-reduce:animate-none" />
              {["price", "class", "trip", "area", "type"].map((item, index) => (
                <div key={item} className="border-t border-slate-100 pt-4">
                  <div className="h-4 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" style={{ width: `${52 + index * 6}%` }} />
                  <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
                  <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
                </div>
              ))}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <div><div className="h-7 w-48 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" /><div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /></div>
              <div className="hidden h-10 w-36 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none sm:block" />
            </div>
            <div className="space-y-4">
              <HotelCardSkeleton />
              <HotelCardSkeleton />
              <HotelCardSkeleton />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function HotelFilters({ layout = "desktop", propertyNameQuery, setPropertyNameQuery, t, minPrice, maxPrice, setMinPrice, setMaxPrice, resultMaxPrice, hasPricedResults, formatPrice, locale, stayNights, selectedRatings, toggleRating, starRatingCounts, options, selectedFilters, toggleFilter }: { layout?: "desktop" | "compact" | "mobile"; propertyNameQuery: string; setPropertyNameQuery: (value: string) => void; t: (key: string) => string; maxPrice: number; minPrice: number; setMaxPrice: (value: number) => void; setMinPrice: (value: number) => void; resultMaxPrice: number; hasPricedResults: boolean; formatPrice: (amountUsd: number) => string; locale: string; stayNights: number; selectedRatings: number[]; toggleRating: (value: number) => void; starRatingCounts: Record<HotelStarRatingSelection, number>; options: ReturnType<typeof buildHotelFilterOptions>; selectedFilters: HotelFilterSelections; toggleFilter: (group: keyof HotelFilterSelections, value?: string) => void; activeFilterCount: number; onClear: () => void }) {
  const filterRangeClass = cn(layout === "desktop" ? "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#D7E5F8] accent-[#0067DB] disabled:cursor-not-allowed disabled:opacity-60" : "h-2 w-full cursor-pointer appearance-none rounded-full bg-border outline-none transition disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[#2F73C8] [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2F73C8] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border [&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[#2F73C8] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#2F73C8] [&::-moz-range-thumb]:shadow-md");

  const [openCompactSection, setOpenCompactSection] = useState<CompactHotelFilterSectionId>(null);
  const getSelectedCount = (group: keyof HotelFilterSelections) => selectedFilters[group].length;
  const compactSections = (
    [
      {
        id: "price",
        title: t("hotelResults.budgetPrice"),
        selectedCount: hasPricedResults && (minPrice > 0 || maxPrice < resultMaxPrice) ? 1 : 0,
        content: <PriceFilterControl mobile={layout === "mobile"} stayNights={stayNights} minPrice={minPrice} maxPrice={maxPrice} setMinPrice={setMinPrice} setMaxPrice={setMaxPrice} resultMaxPrice={resultMaxPrice} formatPrice={formatPrice} filterRangeClass={filterRangeClass} />,
      },
      {
        id: "travellerFeatures",
        title: "Good for your trip",
        selectedCount: getSelectedCount("travellerFeatures"),
        content: <CheckboxFilterOptions layout="compact" options={options.travellerFeatures} selected={selectedFilters.travellerFeatures} onToggle={(value) => toggleFilter("travellerFeatures", value)} t={t} locale={locale} />,
      },
      {
        id: "rating",
        title: t("hotelResults.starRating"),
        selectedCount: selectedRatings.length,
        content: <StarRatingFilterControl selectedRatings={selectedRatings} onToggle={toggleRating} counts={starRatingCounts} locale={locale} t={t} layout="compact" />,
      },
      {
        id: "locations",
        title: t("hotelResults.locationArea"),
        selectedCount: getSelectedCount("locations"),
        content: <CheckboxFilterOptions layout="compact" options={options.locations} selected={selectedFilters.locations} onToggle={(value) => toggleFilter("locations", value)} t={t} locale={locale} collapsedCount={5} />,
      },
      {
        id: "propertyTypes",
        title: t("hotelResults.propertyType"),
        selectedCount: getSelectedCount("propertyTypes"),
        content: <CheckboxFilterOptions layout="compact" options={options.propertyTypes} selected={selectedFilters.propertyTypes} onToggle={(value) => toggleFilter("propertyTypes", value)} t={t} locale={locale} />,
      },
      {
        id: "facilities",
        title: t("hotelResults.facilities"),
        selectedCount: getSelectedCount("facilities"),
        content: <CheckboxFilterOptions layout="compact" options={options.facilities} selected={selectedFilters.facilities} onToggle={(value) => toggleFilter("facilities", value)} t={t} locale={locale} collapsedCount={6} />,
      },
      {
        id: "accessibility",
        title: "Accessibility",
        selectedCount: getSelectedCount("accessibility"),
        content: <CheckboxFilterOptions layout="compact" options={options.accessibility} selected={selectedFilters.accessibility} onToggle={(value) => toggleFilter("accessibility", value)} t={t} locale={locale} collapsedCount={5} />,
      },
      {
        id: "roomTypes",
        title: locale.startsWith("en") ? "Room & bed" : t("hotelResults.roomType"),
        selectedCount: getSelectedCount("roomTypes"),
        content: <CheckboxFilterOptions layout="compact" options={options.roomTypes} selected={selectedFilters.roomTypes} onToggle={(value) => toggleFilter("roomTypes", value)} t={t} locale={locale} collapsedCount={5} />,
      },
      {
        id: "bedTypes",
        title: locale.startsWith("en") ? "Bed options" : t("hotelResults.bedType"),
        selectedCount: getSelectedCount("bedTypes"),
        content: <CheckboxFilterOptions layout="compact" options={options.bedTypes} selected={selectedFilters.bedTypes} onToggle={(value) => toggleFilter("bedTypes", value)} t={t} locale={locale} collapsedCount={5} />,
      },
    ] satisfies Array<{
      id: Exclude<CompactHotelFilterSectionId, null>;
      title: string;
      selectedCount: number;
      content: ReactNode;
    }>
  ).filter((section) => (section.id !== "price" || hasPricedResults) && (section.id !== "travellerFeatures" || options.travellerFeatures.length > 0) && (section.id !== "locations" || options.locations.length > 0) && (section.id !== "propertyTypes" || options.propertyTypes.length > 0) && (section.id !== "facilities" || options.facilities.length > 0) && (section.id !== "accessibility" || options.accessibility.length > 0) && (section.id !== "roomTypes" || options.roomTypes.length > 1) && (section.id !== "bedTypes" || options.bedTypes.length > 1));

  if (layout === "compact") {
    return (
      <div className="desktop-filter-sidebar flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        <div className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain bg-white px-5 py-4">
          <label className="block text-sm font-semibold text-slate-950" htmlFor="hotel-property-search-compact">Property name</label>
          <div className="relative mb-4 mt-2">
            <input id="hotel-property-search-compact" type="search" value={propertyNameQuery} onChange={(event) => setPropertyNameQuery(event.target.value)} placeholder="Search properties" autoComplete="off" className="h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20 [&::-webkit-search-cancel-button]:appearance-none" />
            {propertyNameQuery ? <button type="button" aria-label="Clear property search" onClick={() => setPropertyNameQuery("")} className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"><X className="h-4 w-4" aria-hidden="true" /></button> : null}
          </div>
          {compactSections.map((section) => (
            <CompactHotelFilterSection key={section.id} sectionId={section.id} title={section.title} selectedCount={section.selectedCount} expanded={openCompactSection === section.id} onToggle={() => setOpenCompactSection((current) => (current === section.id ? null : section.id))}>
              {section.content}
            </CompactHotelFilterSection>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={layout === "mobile" ? "bg-transparent" : layout === "desktop" ? "overflow-hidden rounded-lg border border-[#CFD9E5] bg-white" : "overflow-hidden rounded-lg border border-slate-200 bg-white"}>
      {layout === "desktop" ? (
        <div className="flex min-h-10 items-center px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-[14px] font-bold tracking-[-0.01em] text-slate-950">{t("hotelResults.filterBy")}</h2>
            </div>
          </div>
        </div>
      ) : null}

      {
        <div className={cn("border-b border-slate-200", layout === "mobile" ? "mb-6 border-0 bg-transparent pb-0 sm:mb-3 sm:bg-white sm:rounded-xl sm:border sm:p-4 sm:shadow-[0_8px_24px_-20px_rgba(15,23,42,0.5)]" : layout === "desktop" ? "px-3 py-3" : "mb-2 pb-4")}>
          <label className={cn("block text-sm font-bold text-slate-950", layout === "mobile" && "max-sm:text-lg max-sm:font-semibold", layout === "desktop" && "text-[13px]")} htmlFor={`hotel-property-search-${layout}`}>
            Property name
          </label>
          <div className={cn("relative mt-2", layout === "desktop" && "mt-1.5")}>
            <input id={`hotel-property-search-${layout}`} type="search" value={propertyNameQuery} onChange={(event) => setPropertyNameQuery(event.target.value)} placeholder="Search properties" autoComplete="off" className={cn("h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-950 outline-none placeholder:text-slate-500 focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20 [&::-webkit-search-cancel-button]:appearance-none", layout === "desktop" && "h-9 rounded-md text-[13px]")} />
            {propertyNameQuery ? (
              <button type="button" aria-label="Clear property search" onClick={() => setPropertyNameQuery("")} className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      }

      <div className={cn(layout === "mobile" ? "space-y-6 bg-transparent sm:space-y-3" : layout === "desktop" ? "bg-transparent" : "space-y-5 bg-transparent")}>
        {hasPricedResults ? (
          <FilterSection title={layout === "mobile" ? "Budget / Price" : t("hotelResults.budgetPrice")} layout={layout}>
            <PriceFilterControl mobile={layout === "mobile"} stayNights={stayNights} minPrice={minPrice} maxPrice={maxPrice} setMinPrice={setMinPrice} setMaxPrice={setMaxPrice} resultMaxPrice={resultMaxPrice} formatPrice={formatPrice} filterRangeClass={filterRangeClass} />
          </FilterSection>
        ) : null}

        {options.travellerFeatures.length > 0 ? <CheckboxFilterSection title="Good for your trip" options={options.travellerFeatures} selected={selectedFilters.travellerFeatures} onToggle={(value) => toggleFilter("travellerFeatures", value)} t={t} locale={locale} layout={layout} /> : null}

        <FilterSection title={layout === "mobile" && locale.startsWith("en") ? "Hotel class" : t("hotelResults.starRating")} layout={layout}>
          <StarRatingFilterControl selectedRatings={selectedRatings} onToggle={toggleRating} counts={starRatingCounts} locale={locale} t={t} layout={layout} />
        </FilterSection>

        <CheckboxFilterSection title={layout === "mobile" ? "Area" : t("hotelResults.locationArea")} options={options.locations} selected={selectedFilters.locations} onToggle={(value) => toggleFilter("locations", value)} t={t} locale={locale} collapsedCount={5} layout={layout} />

        <CheckboxFilterSection title={t("hotelResults.propertyType")} options={options.propertyTypes} selected={selectedFilters.propertyTypes} onToggle={(value) => toggleFilter("propertyTypes", value)} t={t} locale={locale} layout={layout} />

        <CheckboxFilterSection title={t("hotelResults.facilities")} options={options.facilities} selected={selectedFilters.facilities} onToggle={(value) => toggleFilter("facilities", value)} t={t} locale={locale} collapsedCount={6} layout={layout} />

        <CheckboxFilterSection title="Accessibility" options={options.accessibility} selected={selectedFilters.accessibility} onToggle={(value) => toggleFilter("accessibility", value)} t={t} locale={locale} collapsedCount={5} layout={layout} />

        <CheckboxFilterSection title={locale.startsWith("en") ? "Room & bed" : t("hotelResults.roomType")} minimumOptionCount={2} options={options.roomTypes} selected={selectedFilters.roomTypes} onToggle={(value) => toggleFilter("roomTypes", value)} t={t} locale={locale} collapsedCount={5} layout={layout} />

        {options.bedTypes.length > 1 ? <CheckboxFilterSection title={locale.startsWith("en") ? "Bed options" : t("hotelResults.bedType")} minimumOptionCount={2} options={options.bedTypes} selected={selectedFilters.bedTypes} onToggle={(value) => toggleFilter("bedTypes", value)} t={t} locale={locale} collapsedCount={5} layout={layout} /> : null}
      </div>
    </div>
  );
}

function StickyHotelPopularFilters({ t, locale, options, selectedFilters, selectedRatings, starRatingCounts, toggleFilter, toggleRating }: { t: (key: string) => string; locale: string; options: ReturnType<typeof buildHotelFilterOptions>; selectedFilters: HotelFilterSelections; selectedRatings: number[]; starRatingCounts: Record<HotelStarRatingSelection, number>; toggleFilter: (group: keyof HotelFilterSelections, value?: string) => void; toggleRating: (rating: number) => void }) {
  const groups: Array<{ group: keyof HotelFilterSelections; options: FilterOption[]; limit: number }> = [
    { group: "facilities", options: options.facilities, limit: 5 },
    { group: "travellerFeatures", options: options.travellerFeatures, limit: 2 },
    { group: "propertyTypes", options: options.propertyTypes, limit: 2 },
    { group: "locations", options: options.locations, limit: 2 },
    { group: "roomTypes", options: options.roomTypes, limit: 1 },
  ];
  const popularFilters = [
    ...groups.flatMap(({ group, options: groupOptions, limit }) =>
      [...groupOptions]
        .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
        .slice(0, limit)
        .map((option) => ({ key: `${group}-${option.value}`, label: option.label, count: option.count, selected: selectedFilters[group].includes(option.value), onToggle: () => toggleFilter(group, option.value) })),
    ),
    ...([5, 4] as const)
      .filter((rating) => starRatingCounts[rating] > 0)
      .map((rating) => ({ key: `rating-${rating}`, label: formatHotelRating(rating, t, locale), count: starRatingCounts[rating], selected: selectedRatings.includes(rating), onToggle: () => toggleRating(rating) })),
  ].sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));

  if (!popularFilters.length) return null;

  return (
    <section aria-label={t("hotelResults.popularFilters")} className="sticky top-[88px] z-10 mt-3 max-h-[calc(100vh-100px)] overflow-y-auto rounded-lg border border-[#CFD9E5] bg-white px-3 py-3 shadow-[0_4px_16px_-12px_rgba(15,23,42,0.35)]">
      <h2 className="mb-1.5 text-[13px] font-bold leading-5 text-[#142033]">{t("hotelResults.popularFilters")}</h2>
      <div className="space-y-0.5">
        {popularFilters.map((filter) => (
          <label key={filter.key} className="flex min-h-7 cursor-pointer items-center gap-2 rounded px-0.5 text-[12px] font-normal leading-4 text-[#142033] hover:bg-slate-50">
            <input type="checkbox" checked={filter.selected} onChange={filter.onToggle} className="h-4 w-4 shrink-0 cursor-pointer accent-[#004BB8]" />
            <span className="min-w-0 flex-1 truncate" title={filter.label}>{filter.label}</span>
            <span className="shrink-0 tabular-nums text-slate-500">{formatHotelCount(filter.count, locale)}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function PriceFilterControl({ mobile = false, showEstimate = true, stayNights, minPrice, maxPrice, setMinPrice, setMaxPrice, resultMaxPrice, formatPrice, filterRangeClass }: { mobile?: boolean; showEstimate?: boolean; stayNights: number; minPrice: number; maxPrice: number; setMinPrice: (value: number) => void; setMaxPrice: (value: number) => void; resultMaxPrice: number; formatPrice: (amountUsd: number) => string; filterRangeClass: string }) {
  const { t: dictionary, locale } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const totalLabel = t("hotelResults.estimatedStayTotal");
  const minimumLabel = mobile ? "Minimum" : t("from");
  const maximumLabel = mobile ? "Maximum" : t("hotelResults.totalUpTo");
  const minimumAriaLabel = mobile ? "Minimum estimated stay total" : `${totalLabel}: ${minimumLabel}`;
  const maximumAriaLabel = mobile ? "Maximum estimated stay total" : `${totalLabel}: ${maximumLabel}`;
  const { selectedOption } = useRegion();
  const { rates } = useCurrencyRates();
  const budget = createMobileHotelBudget(selectedOption.currency, rates);
  const toInput = (value: number) => mobile ? budget.toDisplay(value) : value;
  const fromInput = (value: number) => mobile ? budget.toUsd(value) : value;
  const rangeMax = Math.max(resultMaxPrice, 300);
  return (
    <div className={cn("space-y-3", !mobile && "space-y-2")}>
      {showEstimate ? <p className={cn("text-xs leading-5 text-slate-600", !mobile && "leading-4")}>
        {mobile ? `Estimated total for ${stayNights} ${stayNights === 1 ? "night" : "nights"}.` : <>{totalLabel} · {new Intl.NumberFormat(locale).format(stayNights)} {t(stayNights === 1 ? "deals.results.night" : "deals.results.nights")}</>}
      </p> : null}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-slate-700">
          {minimumLabel}
          <input type="number" min={0} max={toInput(maxPrice)} step={mobile ? "any" : 25} value={toInput(minPrice)} onChange={(event) => setMinPrice(mobile ? Math.min(maxPrice, fromInput(Number(event.target.value))) : Number(event.target.value))} className={cn("mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20", !mobile && "h-9 rounded-md px-2 text-[12px]")} aria-label={minimumAriaLabel} />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          {maximumLabel}
          <input type="number" min={toInput(minPrice)} max={toInput(rangeMax)} step={mobile ? "any" : 25} value={toInput(maxPrice)} onChange={(event) => setMaxPrice(mobile ? Math.min(rangeMax, Math.max(minPrice, fromInput(Number(event.target.value)))) : Number(event.target.value))} className={cn("mt-1 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-950 outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20", !mobile && "h-9 rounded-md px-2 text-[12px]")} aria-label={maximumAriaLabel} />
        </label>
      </div>
      <div className="relative h-6" aria-label="Estimated stay total range">
        <input className={cn(filterRangeClass, "absolute inset-x-0 top-2 pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto")} type="range" min={0} max={rangeMax} step={25} value={minPrice} onChange={(event) => setMinPrice(Number(event.target.value))} aria-label={minimumAriaLabel} aria-valuetext={formatPrice(minPrice)} />
        <input className={cn(filterRangeClass, "absolute inset-x-0 top-2 bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto")} type="range" min={0} max={rangeMax} step={25} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} aria-label={maximumAriaLabel} aria-valuetext={formatPrice(maxPrice)} />
      </div>
      <p className="flex justify-between text-xs font-medium text-slate-600">
        <span>{mobile ? <MobileHotelPriceText text={formatPrice(minPrice)} /> : formatPrice(minPrice)}</span>
        <span>{mobile ? <MobileHotelPriceText text={formatPrice(maxPrice)} /> : formatPrice(maxPrice)}</span>
      </p>
    </div>
  );
}

function StarRatingFilterControl({ selectedRatings, onToggle, counts, locale, t, layout = "desktop" }: { selectedRatings: number[]; onToggle: (rating: number) => void; counts: Record<HotelStarRatingSelection, number>; locale: string; t: (key: string) => string; layout?: "desktop" | "compact" | "mobile" }) {
  const options = [5, 4, 3, 2, 1].filter((rating) => (counts[rating as HotelStarRatingSelection] ?? 0) > 0);

  return (
    <fieldset className="space-y-0.5">
      <legend className="sr-only">{t("hotelResults.starRating")}</legend>

      {options.map((rating) => {
        const selected = selectedRatings.includes(rating);
        const label = formatHotelRating(rating as HotelStarRatingSelection, t, locale);

        return (
          <label key={rating} className={cn("group flex min-h-11 cursor-pointer justify-between gap-3 rounded-lg text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950", layout === "desktop" ? "min-h-[30px] items-center px-0.5 py-1 text-[12px] font-medium leading-5" : layout === "mobile" ? "items-center px-0 py-1.5 text-sm sm:px-1.5" : "items-center px-1.5 py-1.5 text-sm")}>
            <span className={cn("flex min-w-0 items-center gap-2", layout === "mobile" && "max-sm:gap-[10px]")}>
              <input className="peer sr-only" type="checkbox" value={rating} checked={selected} onChange={() => onToggle(rating)} aria-label={label} />

              <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-[2px] border transition-colors", layout === "desktop" ? "mt-0.5 h-[14px] w-[14px]" : layout === "mobile" ? "h-5 w-5 rounded sm:h-4 sm:w-4" : "h-4 w-4", selected ? "border-[#0067DB] bg-[#0067DB] text-white" : "border-slate-300 bg-white group-hover:border-slate-400", "peer-focus-visible:ring-2 peer-focus-visible:ring-[#004BB8]/30 peer-focus-visible:ring-offset-2")}>
                {selected ? <Check className={cn(layout === "desktop" ? "h-2.5 w-2.5" : "h-3 w-3")} strokeWidth={3} aria-hidden="true" /> : null}
              </span>

              <span className="flex items-center gap-[2px]" aria-label={label}>
                {Array.from({ length: rating }).map((_, index) => (
                  <Star key={index} className="h-[15px] w-[15px] fill-[#E9A400] text-[#E9A400]" aria-hidden="true" />
                ))}
              </span>
            </span>

            <span className={cn("min-w-6 shrink-0 text-right font-medium tabular-nums text-slate-500", layout === "desktop" ? "text-[12px] leading-5" : "text-[11px]")}>{formatHotelCount(counts[rating as HotelStarRatingSelection] ?? 0, locale)}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function CompactHotelFilterSection({ sectionId, title, selectedCount, expanded, onToggle, children }: { sectionId: Exclude<CompactHotelFilterSectionId, null>; title: string; selectedCount: number; expanded: boolean; onToggle: () => void; children: ReactNode }) {
  const panelId = `compact-hotel-filter-${sectionId}-panel`;

  return (
    <section className="border-t border-[#D8E1EC]/75 first:border-t-0">
      <button type="button" className={cn("group flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-start text-[13px] font-semibold leading-5 tracking-[-0.005em] text-slate-800 transition-colors duration-200 motion-reduce:transition-none hover:bg-[#E5ECF4] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30", expanded && "text-[#004BB8]")} aria-expanded={expanded} aria-controls={panelId} onClick={onToggle}>
        <span className="min-w-0 truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {selectedCount > 0 ? <span className="min-w-5 rounded-full bg-[#E2EAF3] px-2 py-0.5 text-center text-[11px] font-semibold normal-case leading-4 tracking-normal text-[#235A9F] ring-1 ring-[#004BB8]/10 group-hover:bg-[#DCE8F6]">{selectedCount}</span> : null}
          <ChevronDown className={cn("h-3.5 w-3.5 text-slate-500 transition duration-200 motion-reduce:transition-none group-hover:text-[#004BB8]", expanded && "rotate-180 text-[#004BB8]")} strokeWidth={2.3} aria-hidden="true" />
        </span>
      </button>
      <div id={panelId} hidden={!expanded} aria-hidden={!expanded} className="grid h-auto gap-0.5 overflow-visible bg-transparent px-2.5 pb-3 pt-0.5">
        {children}
      </div>
    </section>
  );
}

function CheckboxFilterOptions({
  options,
  selected,
  onToggle,
  allOption,
  t,
  collapsedCount = 4,
  locale,
  layout = "desktop",
}: {
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  allOption?: {
    label: string;
    count: number;
    onSelect: () => void;
  };
  t: (key: string) => string;
  collapsedCount?: number;
  locale: string;
  layout?: "desktop" | "compact" | "mobile";
}) {
  const [expanded, setExpanded] = useState(false);

  if (!options.length && !allOption) return null;

  const allOptionChecked = Boolean(allOption) && selected.length === 0;
  const visibleOptions = expanded ? options : options.slice(0, collapsedCount);
  const hasMore = options.length > collapsedCount;
  const optionRowClass = cn("group flex min-h-11 min-w-0 cursor-pointer items-center justify-between gap-3 transition hover:bg-slate-50 hover:text-slate-950", layout === "desktop" ? "min-h-[30px] rounded-md px-0.5 py-1 text-[12px] font-medium leading-5 text-slate-700" : layout === "compact" ? "min-h-8 gap-2 rounded-lg px-1.5 py-1 text-[13px] font-medium text-slate-600" : "rounded-lg px-0 py-1.5 text-sm font-normal text-slate-700 sm:px-1.5 sm:font-medium sm:text-slate-600");
  const controlClass = (checked: boolean) => cn("flex shrink-0 items-center justify-center rounded-[2px] border transition-colors", layout === "desktop" ? "mt-0.5 h-[14px] w-[14px]" : layout === "compact" ? "mt-0.5 h-3.5 w-3.5" : "h-5 w-5 rounded sm:mt-0.5 sm:h-4 sm:w-4", checked ? "border-[#0067DB] bg-[#0067DB] text-white" : "border-slate-300 bg-white group-hover:border-slate-400", "peer-focus-visible:ring-2 peer-focus-visible:ring-[#004BB8]/30 peer-focus-visible:ring-offset-2");
  const checkClass = layout === "desktop" ? "h-2.5 w-2.5" : layout === "compact" ? "h-2.5 w-2.5" : "h-3 w-3";
  const countClass = cn("min-w-6 shrink-0 text-right font-medium tabular-nums text-slate-500", layout === "desktop" ? "text-[12px] leading-5" : layout === "compact" ? "text-[12px] leading-5" : "text-xs");

  return (
    <>
      <div className="grid gap-0.5">
        {allOption ? (
          <label className={optionRowClass}>
            <span className={cn("flex min-w-0 flex-1 items-start gap-2", layout === "mobile" && "max-sm:items-center max-sm:gap-[10px]")}>
              <input
                className="peer sr-only"
                type="checkbox"
                checked={allOptionChecked}
                onChange={() => {
                  if (!allOptionChecked) allOption.onSelect();
                }}
              />
              <span aria-hidden="true" className={controlClass(allOptionChecked)}>
                {allOptionChecked ? <Check className={checkClass} strokeWidth={3} aria-hidden="true" /> : null}
              </span>
              <span className={cn("min-w-0 truncate", allOptionChecked ? "font-semibold text-[#0057B8]" : undefined)}>{allOption.label}</span>
            </span>
            <span className={countClass}>{formatHotelCount(allOption.count, locale)}</span>
          </label>
        ) : null}
        {visibleOptions.map((option) => {
          const checked = selected.includes(option.value);

          return (
            <label key={option.value} className={optionRowClass}>
              <span className={cn("flex min-w-0 flex-1 items-start gap-2", layout === "mobile" && "max-sm:items-center max-sm:gap-[10px]")}>
                <input className="peer sr-only" type="checkbox" checked={checked} onChange={() => onToggle(option.value)} />
                <span aria-hidden="true" className={controlClass(checked)}>
                  {checked ? <Check className={checkClass} strokeWidth={3} aria-hidden="true" /> : null}
                </span>
                <span className={cn("min-w-0 truncate", checked ? layout === "desktop" ? "font-semibold text-slate-950" : "font-semibold text-navy" : undefined)}>{option.label}</span>
              </span>
              <span className={countClass}>{formatHotelCount(option.count, locale)}</span>
            </label>
          );
        })}
      </div>

      {hasMore ? (
        <button type="button" className={cn("mt-2 text-xs font-semibold text-[#004BB8] transition-colors hover:text-[#021C2B]", layout === "desktop" && "mt-1")} onClick={() => setExpanded((current) => !current)}>
          {layout === "mobile" ? expanded ? "Show less" : `Show more (${formatHotelCount(options.length - collapsedCount, locale)})` : expanded ? t("hotelResults.showLess") : t("hotelResults.showMore").replace("{{count}}", formatHotelCount(options.length - collapsedCount, locale))}
        </button>
      ) : null}
    </>
  );
}

function FilterSection({ title, children, layout = "desktop" }: { title: string; children: ReactNode; layout?: "desktop" | "compact" | "mobile" }) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  return (
    <section className={cn("border-t border-slate-200/75 first:border-t-0", layout === "desktop" ? "px-3 py-3" : layout === "mobile" ? "border-t-0 bg-transparent py-0 sm:bg-white sm:rounded-xl sm:border sm:px-4 sm:py-1 sm:shadow-[0_8px_24px_-20px_rgba(15,23,42,0.5)]" : "py-4")}>
      <h3 className={cn(layout === "mobile" ? "text-lg font-semibold leading-6 text-slate-950 sm:text-sm sm:font-bold sm:leading-5" : "text-sm font-bold leading-5 text-slate-950", layout === "desktop" && "text-[13px]")}>
        {layout === "mobile" ? <span className="flex min-h-11 items-center sm:hidden">{title}</span> : null}
        <button type="button" className={cn("flex min-h-11 w-full items-center justify-between gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30", layout === "mobile" && "max-sm:hidden", layout === "desktop" && "min-h-6")} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((value) => !value)}>
          <span>{title}</span>
          <ChevronDown className={cn("h-4 w-4 text-slate-500 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
        </button>
      </h3>
      <div id={panelId} className={cn("gap-0.5", layout === "mobile" ? "pb-0 sm:pb-4" : layout === "desktop" ? "pt-1" : "pb-4", expanded ? "grid" : layout === "mobile" ? "grid sm:hidden" : "hidden")}>
        {children}
      </div>
    </section>
  );
}

function CheckboxFilterSection({
  title,
  options,
  selected,
  onToggle,
  allOption,
  t,
  collapsedCount = 4,
  locale,
  layout = "desktop",
  minimumOptionCount = 1,
}: {
  title: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  allOption?: {
    label: string;
    count: number;
    onSelect: () => void;
  };
  t: (key: string) => string;
  collapsedCount?: number;
  locale: string;
  layout?: "desktop" | "compact" | "mobile";
  minimumOptionCount?: number;
}) {
  if (options.length < minimumOptionCount) return null;

  return (
    <FilterSection title={title} layout={layout}>
      <CheckboxFilterOptions options={options} selected={selected} onToggle={onToggle} allOption={allOption} t={t} collapsedCount={collapsedCount} locale={locale} layout={layout} />
    </FilterSection>
  );
}

function buildActiveFilterChips(selectedFilters: HotelFilterSelections, propertyNameQuery: string, minPrice: number, maxPrice: number, resultMaxPrice: number, priceFilterActive: boolean, selectedHotelClasses: number[], formatPrice: (amountUsd: number) => string, t: (key: string) => string, locale: string, facilityOptions: FilterOption[], locationOptions: FilterOption[]): ActiveHotelFilterChip[] {
  const filterGroups: Array<{
    group: keyof HotelFilterSelections;
    filters: TermFilter[];
  }> = [
    { group: "propertyTypes", filters: PROPERTY_TYPE_FILTERS },
    { group: "meals", filters: MEAL_FILTERS },
    { group: "cancellationPolicies", filters: CANCELLATION_FILTERS },
    { group: "roomTypes", filters: ROOM_TYPE_FILTERS },
    { group: "bedTypes", filters: BED_TYPE_FILTERS },
  ];

  const chips: ActiveHotelFilterChip[] = filterGroups.flatMap(({ group, filters }) =>
    selectedFilters[group].map((value) => {
      const filter = filters.find((item) => item.value === value);

      return {
        key: `${group}-${value}`,
        label: filter ? t(filter.labelKey) : value,
        group,
        value,
      };
    }),
  );

  if (propertyNameQuery.trim()) {
    chips.unshift({
      key: "propertySearch",
      label: `Property: ${propertyNameQuery.trim()}`,
      kind: "propertySearch",
    });
  }

  selectedFilters.locations.forEach((value) => {
    const option = locationOptions.find((item) => item.value === value);

    chips.push({
      key: `locations-${value}`,
      label: option?.label ?? value,
      group: "locations",
      value,
    });
  });

  selectedFilters.facilities.forEach((value) => {
    const option = facilityOptions.find((item) => item.value === value);

    chips.push({
      key: `facilities-${value}`,
      label: option?.label ?? value,
      group: "facilities",
      value,
    });
  });

  if (priceFilterActive) {
    chips.push({
      key: "priceRange",
      label: `${formatPrice(minPrice)} – ${formatPrice(maxPrice)}`,
      kind: "priceRange",
    });
  }

  selectedHotelClasses.forEach((rating) => {
    chips.push({
      key: `hotelClass-${rating}`,
      label: formatHotelRating(rating as HotelStarRatingSelection, t, locale),
      kind: "hotelClass",
      rating,
    });
  });

  (["accessibility", "travellerFeatures"] as const).forEach((group) => {
    selectedFilters[group].forEach((value) => {
      chips.push({
        key: `${group}-${value}`,
        label: value.replace(/\b\w/g, (letter) => letter.toUpperCase()),
        group,
        value,
      });
    });
  });

  return chips;
}

function buildHotelFilterOptions(hotels: PublicHotelResult[], t: (key: string) => string, destination: string) {
  return {
    totalCount: hotels.length,
    propertyTypes: buildTermOptions(hotels, PROPERTY_TYPE_FILTERS, (hotel) => hotel.catalogueProfile?.propertyType ?? "", t, false),
    meals: buildTermOptions(hotels, MEAL_FILTERS, (hotel) => hotel.catalogueProfile?.mealPlan ?? "", t),
    cancellationPolicies: buildTermOptions(hotels, CANCELLATION_FILTERS, (hotel) => hotel.catalogueProfile?.cancellationPolicy ?? "", t),
    facilities: buildHotelFacilityFilterOptions(hotels, t),
    locations: buildHotelNeighbourhoodFilterOptions(hotels, destination),
    roomTypes: buildTermOptions(hotels, ROOM_TYPE_FILTERS, (hotel) => hotel.catalogueProfile?.room.name ?? "", t, true),
    bedTypes: buildTermOptions(hotels, BED_TYPE_FILTERS, (hotel) => hotel.catalogueProfile?.room.bedConfiguration ?? "", t),
    accessibility: buildStructuredListOptions(hotels, (hotel) => hotel.catalogueProfile?.accessibilityFeatures ?? []),
    travellerFeatures: buildStructuredListOptions(hotels, (hotel) => hotel.catalogueProfile?.travellerFeatures ?? []),
  };
}

function buildStructuredListOptions(hotels: PublicHotelResult[], valuesForHotel: (hotel: PublicHotelResult) => string[]): FilterOption[] {
  const counts = new Map<string, FilterOption>();
  hotels.forEach((hotel) => {
    valuesForHotel(hotel).forEach((label) => {
      const value = label.trim().toLocaleLowerCase();
      if (!value) return;
      const existing = counts.get(value);
      if (existing) existing.count += 1;
      else counts.set(value, { value, label: label.trim(), count: 1 });
    });
  });
  return Array.from(counts.values())
    .filter((option) => option.count >= 2 && option.count < hotels.length)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function matchesStructuredList(values: string[] | undefined, selected: string[]) {
  if (!selected.length) return true;
  const normalized = new Set((values ?? []).map((value) => value.trim().toLocaleLowerCase()));
  return selected.some((value) => normalized.has(value));
}

function cleanHotelNeighbourhood(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function getHotelNeighbourhoodFilterValue(value: string | undefined) {
  return cleanHotelNeighbourhood(value).toLocaleLowerCase();
}

function formatNeighbourhoodFilterLabel(neighbourhood: string, destination: string) {
  const cleanNeighbourhood = cleanHotelNeighbourhood(neighbourhood);
  const cleanDestination = destination.trim().replace(/\s+/g, " ");

  if (!cleanDestination) return cleanNeighbourhood;

  const primaryCity = cleanDestination.split(",")[0]?.trim();
  const neighbourhoodSegments = cleanNeighbourhood.split(",").map((segment) => segment.trim().toLocaleLowerCase());

  if (primaryCity && neighbourhoodSegments.includes(primaryCity.toLocaleLowerCase())) {
    return cleanNeighbourhood;
  }

  return `${cleanNeighbourhood}, ${cleanDestination}`;
}

function buildHotelNeighbourhoodFilterOptions(hotels: PublicHotelResult[], destination: string): FilterOption[] {
  const optionsByNeighbourhood = new Map<string, FilterOption>();

  hotels.forEach((hotel) => {
    const value = getHotelNeighbourhoodFilterValue(hotel.neighbourhood);
    if (!value) return;

    const option = optionsByNeighbourhood.get(value);

    if (option) {
      option.count += 1;
      return;
    }

    optionsByNeighbourhood.set(value, {
      value,
      label: formatNeighbourhoodFilterLabel(cleanHotelNeighbourhood(hotel.neighbourhood), destination),
      count: 1,
    });
  });

  return Array.from(optionsByNeighbourhood.values()).sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
}

function buildTermOptions(hotels: PublicHotelResult[], filters: TermFilter[], textForHotel: (hotel: PublicHotelResult) => string, t: (key: string) => string, includeUniversal = false) {
  return filters
    .map((filter) => ({
      value: filter.value,
      label: t(filter.labelKey),
      count: hotels.filter((hotel) => textIncludesTerms(textForHotel(hotel), filter.terms)).length,
    }))
    .filter((option) => option.count > 0 && (includeUniversal || option.count < hotels.length))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
}

function hotelMatchesNeighbourhoodFilters(hotel: PublicHotelResult, selectedValues: string[]) {
  if (!selectedValues.length) return true;

  const neighbourhoodValue = getHotelNeighbourhoodFilterValue(hotel.neighbourhood);

  return neighbourhoodValue.length > 0 && selectedValues.includes(neighbourhoodValue);
}

function hotelMatchesFilters(hotel: PublicHotelResult, propertyNameQuery: string, minPrice: number, maxPrice: number, priceFilterActive: boolean, selectedHotelClasses: number[], selectedFilters: HotelFilterSelections, rates?: ExchangeRates) {
  return (
    (!propertyNameQuery.trim() || normalizePropertySearchText(hotel.name).includes(normalizePropertySearchText(propertyNameQuery))) &&
    (!priceFilterActive ||
      (() => {
        const total = getComparableHotelTotalUsd(hotel, rates);
        return total !== null && total >= minPrice && total <= maxPrice;
      })()) &&
    (selectedHotelClasses.length === 0 || selectedHotelClasses.some((rating) => hotelMatchesStarRating(hotel.classificationStars, rating as HotelStarRatingSelection))) &&
    matchesTermGroup(hotel, selectedFilters.propertyTypes, PROPERTY_TYPE_FILTERS, (item) => item.catalogueProfile?.propertyType ?? "") &&
    matchesTermGroup(hotel, selectedFilters.meals, MEAL_FILTERS, (item) => item.catalogueProfile?.mealPlan ?? "") &&
    matchesTermGroup(hotel, selectedFilters.cancellationPolicies, CANCELLATION_FILTERS, (item) => item.catalogueProfile?.cancellationPolicy ?? "") &&
    hotelMatchesFacilityFilters(hotel, selectedFilters.facilities) &&
    matchesStructuredList(hotel.catalogueProfile?.accessibilityFeatures, selectedFilters.accessibility) &&
    matchesStructuredList(hotel.catalogueProfile?.travellerFeatures, selectedFilters.travellerFeatures) &&
    hotelMatchesNeighbourhoodFilters(hotel, selectedFilters.locations) &&
    matchesTermGroup(hotel, selectedFilters.roomTypes, ROOM_TYPE_FILTERS, (item) => item.catalogueProfile?.room.name ?? "") &&
    matchesTermGroup(hotel, selectedFilters.bedTypes, BED_TYPE_FILTERS, (item) => item.catalogueProfile?.room.bedConfiguration ?? "")
  );
}

function normalizePropertySearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchesTermGroup(hotel: PublicHotelResult, selectedValues: string[], filters: TermFilter[], textForHotel: (hotel: PublicHotelResult) => string) {
  if (!selectedValues.length) return true;

  return selectedValues.some((value) => {
    const filter = filters.find((item) => item.value === value);
    return filter ? textIncludesTerms(textForHotel(hotel), filter.terms) : false;
  });
}

function textIncludesTerms(text: string, terms: string[]) {
  const normalizedText = text.toLowerCase();
  return terms.some((term) => normalizedText.includes(term));
}
