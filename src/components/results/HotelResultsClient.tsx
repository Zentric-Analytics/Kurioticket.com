"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";

import type { PublicHotelResult } from "@/lib/types";
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/layout/LocaleProvider";
import { HotelCard } from "@/components/results/HotelCard";
import {
  buildHotelFacilityFilterOptions,
  hotelMatchesFacilityFilters,
} from "@/components/results/hotelFacilityFilter";
import { HotelSearchBar } from "@/components/search/HotelSearchBar";
import { normalizeHotelDestinationSearchValue } from "@/data/hotelDestinations";
import { translations as enTranslations } from "@/lib/i18n/en";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { convertCurrencyAmount, type ExchangeRates } from "@/lib/currency/exchangeRates";
import { cn } from "@/lib/utils";
import {
  ALL_HOTEL_STAR_RATINGS,
  countHotelsByStarRating,
  hotelMatchesStarRating,
  type HotelStarRatingSelection,
} from "@/components/results/hotelStarRatingFilter";
import {
  calculateCompactFilterPlacement,
  shouldShowDesktopCompactFilter,
} from "@/lib/flights/desktopCompactFilter";

const hotelResultStackClass = "w-full max-w-[800px]";
const desktopCompactFilterTopOffset = 116;

type DesktopCompactFilterFrame = {
  left: number;
  width: number;
};

type DesktopCompactFilterPlacementState = "hidden" | "fixed" | "docked";

type CompactHotelFilterSectionId =
  | "price"
  | "rating"
  | "locations"
  | "propertyTypes"
  | "roomTypes"
  | "bedTypes"
  | "meals"
  | "cancellationPolicies"
  | "facilities"
  | null;

const FILTER_APPLYING_DELAY_MS = 700;
const SEARCH_APPLYING_TIMEOUT_MS = 15000;
const FILTER_SCROLLBAR_HIDE_DELAY_MS = 700;

function lockBodyScroll() {
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

  return {
    restore: () => {
      bodyElement.style.left = previousBodyStyles.left;
      bodyElement.style.overflow = previousBodyStyles.overflow;
      bodyElement.style.overscrollBehavior =
        previousBodyStyles.overscrollBehavior;
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
}

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
    terms: [
      "cancellation policy available",
      "policy shown",
      "cancellation details",
      "cancellation rules",
      "rate comments",
    ],
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
  kind?: "maxPrice" | "starRating";
};

type HotelFilterSelections = {
  propertyTypes: string[];
  meals: string[];
  cancellationPolicies: string[];
  facilities: string[];
  locations: string[];
  roomTypes: string[];
  bedTypes: string[];
};

const emptySelections: HotelFilterSelections = {
  propertyTypes: [],
  meals: [],
  cancellationPolicies: [],
  facilities: [],
  locations: [],
  roomTypes: [],
  bedTypes: [],
};

const getResultMaxPrice = (hotels: PublicHotelResult[], rates?: ExchangeRates) =>
  Math.max(
    300,
    Math.ceil(Math.max(...hotels.map((hotel) => getHotelComparableTotalUsd(hotel, rates)), 300) / 100) *
      100,
  );

type HotelSummarySortMode = "cheapest" | "bestValue" | "topRated";

type HotelMobileSearchDraft = {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
};

export function HotelResultsClient() {
  const { locale, t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const t = useCallback(
    (key: string) => dictionary[key] ?? enTranslations[key] ?? "",
    [dictionary],
  );
  const params = useSearchParams();

  const [results, setResults] = useState<PublicHotelResult[]>([]);
  const [visibleFiltered, setVisibleFiltered] = useState<PublicHotelResult[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterApplying, setFilterApplying] = useState(false);
  const [searchApplying, setSearchApplying] = useState(false);
  const [filterScrollbarVisible, setFilterScrollbarVisible] = useState(false);
  const [maxPrice, setMaxPrice] = useState(1200);
  const [selectedStarRating, setSelectedStarRating] =
    useState<HotelStarRatingSelection>(ALL_HOTEL_STAR_RATINGS);
  const [selectedFilters, setSelectedFilters] =
    useState<HotelFilterSelections>(emptySelections);
  const [hotelSummarySortMode, setHotelSummarySortMode] =
    useState<HotelSummarySortMode>("cheapest");
  const [hotelSortMenuOpen, setHotelSortMenuOpen] = useState(false);
  const [mobileHotelSearchOpen, setMobileHotelSearchOpen] = useState(false);
  const [showDesktopMinimizedSearch, setShowDesktopMinimizedSearch] =
    useState(false);

  const desktopSearchFrameRef = useRef<HTMLDivElement | null>(null);
  const hotelSortWrapperRef = useRef<HTMLDivElement | null>(null);
  const hotelSortMenuRef = useRef<HTMLDivElement | null>(null);
  const hotelSortTriggerRef = useRef<HTMLButtonElement | null>(null);
  const hotelSortOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const filterApplyingTimeoutRef = useRef<number | null>(null);
  const searchApplyingTimeoutRef = useRef<number | null>(null);
  const filterScrollbarTimeoutRef = useRef<number | null>(null);
  const currencyRatesRef = useRef(currencyRates.rates);
  const mobileHotelSearchScrollLockRef = useRef<{ restore: () => void } | null>(
    null,
  );
  const mobileFiltersScrollLockRef = useRef<{ restore: () => void } | null>(
    null,
  );

  useEffect(() => {
    currencyRatesRef.current = currencyRates.rates;
  }, [currencyRates.rates]);

  const body = useMemo(
    () => ({
      destination: normalizeHotelDestinationSearchValue(
        params.get("destination") || "Tokyo",
      ),
      checkIn: params.get("checkIn") || nextDate(28),
      checkOut: params.get("checkOut") || nextDate(35),
      guests: Number(params.get("guests") || 2),
      rooms: Number(params.get("rooms") || 1),
      sort: params.get("sort") || "cheapest",
    }),
    [params],
  );
  const bodySearchKey = [
    body.destination,
    body.checkIn,
    body.checkOut,
    body.guests,
    body.rooms,
  ].join("-");
  const bodyMobileSearchDraft = useMemo<HotelMobileSearchDraft>(
    () => ({
      destination: body.destination,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: body.guests,
      rooms: body.rooms,
    }),
    [body.checkIn, body.checkOut, body.destination, body.guests, body.rooms],
  );
  const [mobileHotelSearchDraft, setMobileHotelSearchDraft] =
    useState<HotelMobileSearchDraft>(() => bodyMobileSearchDraft);
  const [mobileHotelSearchDraftKey, setMobileHotelSearchDraftKey] =
    useState(bodySearchKey);
  const [desktopHotelSearchDraft, setDesktopHotelSearchDraft] =
    useState<HotelMobileSearchDraft>(() => bodyMobileSearchDraft);
  const [desktopHotelSearchDraftKey, setDesktopHotelSearchDraftKey] =
    useState(bodySearchKey);
  const activeMobileHotelSearchDraft =
    mobileHotelSearchDraftKey === bodySearchKey
      ? mobileHotelSearchDraft
      : bodyMobileSearchDraft;
  const activeDesktopHotelSearchDraft =
    desktopHotelSearchDraftKey === bodySearchKey
      ? desktopHotelSearchDraft
      : bodyMobileSearchDraft;
  const activeMobileHotelSearchKey = [
    activeMobileHotelSearchDraft.destination,
    activeMobileHotelSearchDraft.checkIn,
    activeMobileHotelSearchDraft.checkOut,
    activeMobileHotelSearchDraft.guests,
    activeMobileHotelSearchDraft.rooms,
    body.sort,
  ].join("-");

  const updateMobileHotelSearchDraft = useCallback(
    (nextDraft: HotelMobileSearchDraft) => {
      setMobileHotelSearchDraftKey(bodySearchKey);
      setMobileHotelSearchDraft((currentDraft) => {
        if (
          currentDraft.destination === nextDraft.destination &&
          currentDraft.checkIn === nextDraft.checkIn &&
          currentDraft.checkOut === nextDraft.checkOut &&
          currentDraft.guests === nextDraft.guests &&
          currentDraft.rooms === nextDraft.rooms
        ) {
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
        if (
          currentDraft.destination === nextDraft.destination &&
          currentDraft.checkIn === nextDraft.checkIn &&
          currentDraft.checkOut === nextDraft.checkOut &&
          currentDraft.guests === nextDraft.guests &&
          currentDraft.rooms === nextDraft.rooms
        ) {
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

  const desktopMinimizedDateSummary = useMemo(() => {
    const checkIn = formatCompactHotelDate(activeDesktopHotelSearchDraft.checkIn);
    const checkOut = formatCompactHotelDate(activeDesktopHotelSearchDraft.checkOut);

    if (checkIn && checkOut) return `${checkIn} – ${checkOut}`;
    return checkIn || checkOut || "Travel dates";
  }, [activeDesktopHotelSearchDraft.checkIn, activeDesktopHotelSearchDraft.checkOut, formatCompactHotelDate]);

  const desktopMinimizedGuestsSummary = useMemo(() => {
    const guests = Math.max(1, Math.min(12, activeDesktopHotelSearchDraft.guests));
    const rooms = Math.max(1, Math.min(6, activeDesktopHotelSearchDraft.rooms));
    const guestLabel = guests === 1 ? t("guestSingular") || "guest" : t("guestPlural") || "guests";
    const roomLabel = rooms === 1 ? t("roomSingular") || "room" : t("roomPlural") || "rooms";

    return `${guests} ${guestLabel}, ${rooms} ${roomLabel}`;
  }, [activeDesktopHotelSearchDraft.guests, activeDesktopHotelSearchDraft.rooms, t]);

  const scrollToFullHotelSearch = useCallback(() => {
    if (typeof window === "undefined") return;

    const target = desktopSearchFrameRef.current;
    if (!target) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const openMobileHotelSearch = useCallback(() => {
    setFiltersOpen(false);
    setMobileHotelSearchOpen(true);
  }, []);

  const closeMobileHotelSearch = useCallback(() => {
    setMobileHotelSearchOpen(false);
  }, []);

  useEffect(() => {
    const closeId = window.setTimeout(() => {
      setMobileHotelSearchOpen(false);
    }, 0);

    return () => window.clearTimeout(closeId);
  }, [bodySearchKey]);

  useEffect(() => {
    const releaseExistingLock = () => {
      mobileHotelSearchScrollLockRef.current?.restore();
      mobileHotelSearchScrollLockRef.current = null;
    };

    if (!mobileHotelSearchOpen || typeof window === "undefined") {
      releaseExistingLock();
      return releaseExistingLock;
    }

    const mobileQuery = window.matchMedia("(max-width: 639px)");

    if (!mobileQuery.matches) {
      releaseExistingLock();
      return releaseExistingLock;
    }

    mobileHotelSearchScrollLockRef.current = lockBodyScroll();

    return releaseExistingLock;
  }, [mobileHotelSearchOpen]);

  useEffect(() => {
    const releaseExistingLock = () => {
      mobileFiltersScrollLockRef.current?.restore();
      mobileFiltersScrollLockRef.current = null;
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
        setFiltersOpen(false);
      }
    };

    mobileFiltersScrollLockRef.current = lockBodyScroll();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      releaseExistingLock();
    };
  }, [filtersOpen]);

  useEffect(() => {
    let active = true;

    fetch("/api/hotels/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (response) => {
        const data = await response.json();

        if (data.warningCategory === "no_live_hotel_provider") {
          throw new Error(t("hotelResults.searchUnavailableDetailed"));
        }

        if (!response.ok) {
          throw new Error(
            data.error === enTranslations["hotelResults.liveSearchUnavailable"]
              ? t("hotelResults.liveSearchUnavailable")
              : t("hotelResults.unableToSearchHotels"),
          );
        }

        return data as { results: PublicHotelResult[]; warnings?: string[] };
      })
      .then((data) => {
        if (!active) return;

        setResults(data.results);
        setVisibleFiltered(data.results);
        setFilterApplying(false);
        setSearchApplying(false);
        if (searchApplyingTimeoutRef.current !== null) {
          window.clearTimeout(searchApplyingTimeoutRef.current);
          searchApplyingTimeoutRef.current = null;
        }
        setMaxPrice(getResultMaxPrice(data.results, currencyRatesRef.current));
        setSelectedFilters(emptySelections);
        setSelectedStarRating(ALL_HOTEL_STAR_RATINGS);
      })
      .catch((searchError) => {
        if (!active) return;

        setSearchApplying(false);
        if (searchApplyingTimeoutRef.current !== null) {
          window.clearTimeout(searchApplyingTimeoutRef.current);
          searchApplyingTimeoutRef.current = null;
        }
        setError(
          searchError instanceof Error
            ? searchError.message
            : t("hotelResults.unableToSearchHotels"),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [body, t]);

  const searchedDestination = body.destination.trim();
  const filterOptions = useMemo(
    () => buildHotelFilterOptions(results, t, searchedDestination),
    [results, searchedDestination, t],
  );

  const filtered = useMemo(
    () =>
      results.filter((hotel) =>
        hotelMatchesFilters(
          hotel,
          maxPrice,
          selectedStarRating,
          selectedFilters,
          currencyRates.rates,
        ),
      ),
    [currencyRates.rates, maxPrice, results, selectedFilters, selectedStarRating],
  );

  const resultMaxPrice = useMemo(() => getResultMaxPrice(results, currencyRates.rates), [currencyRates.rates, results]);
  const starRatingCounts = useMemo(
    () => countHotelsByStarRating(results),
    [results],
  );
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

  const activeFilterChips = useMemo(
    () =>
      buildActiveFilterChips(
        selectedFilters,
        maxPrice,
        resultMaxPrice,
        selectedStarRating,
        formatHotelFilterPrice,
        t,
        locale,
        filterOptions.facilities,
        filterOptions.locations,
      ),
    [
      formatHotelFilterPrice,
      locale,
      maxPrice,
      selectedStarRating,
      resultMaxPrice,
      selectedFilters,
      t,
      filterOptions.facilities,
      filterOptions.locations,
    ],
  );

  const resultsApplying = filterApplying || searchApplying;

  const activeFilterCount = useMemo(() => {
    let count = maxPrice < resultMaxPrice ? 1 : 0;
    count += selectedStarRating === ALL_HOTEL_STAR_RATINGS ? 0 : 1;
    count += Object.values(selectedFilters).reduce(
      (total, group) => total + group.length,
      0,
    );
    return count;
  }, [maxPrice, resultMaxPrice, selectedFilters, selectedStarRating]);
  const desktopFilterSidebarRef = useRef<HTMLElement | null>(null);
  const desktopFilterSentinelRef = useRef<HTMLDivElement | null>(null);
  const resultsGridRef = useRef<HTMLDivElement | null>(null);
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
  const scheduleDesktopCompactFilterMeasurementRef = useRef<(() => void) | null>(
    null,
  );

  const visibleFilteredHotels = resultsApplying ? visibleFiltered : filtered;
  const sortedVisibleHotels = useMemo(
    () => sortHotelSummaryResults(visibleFilteredHotels, hotelSummarySortMode, currencyRates.rates),
    [currencyRates.rates, hotelSummarySortMode, visibleFilteredHotels],
  );
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
  const selectedHotelSortLabel =
    hotelSortOptions.find((option) => option.value === hotelSummarySortMode)
      ?.label ?? hotelSortOptions[0]?.label ?? "";
  const formattedDisplayedHotelCount = formatHotelCount(
    visibleFilteredHotels.length,
    locale,
  );
  const resultsHeading = searchedDestination
    ? `${formattedDisplayedHotelCount} ${
        visibleFilteredHotels.length === 1 ? "property" : "properties"
      } found in ${searchedDestination}`
    : t("hotelResults.foundPlacesToStay").replace(
        "{{count}}",
        formattedDisplayedHotelCount,
      );
  const showFilteredEmptyState =
    !loading &&
    !error &&
    !filterApplying &&
    results.length > 0 &&
    filtered.length === 0;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let animationFrame = 0;

    const updateDesktopSearchState = () => {
      animationFrame = 0;
      const frame = desktopSearchFrameRef.current;

      const shouldShow =
        window.innerWidth >= 1024 &&
        Boolean(frame) &&
        frame!.getBoundingClientRect().bottom <= 16;

      setShowDesktopMinimizedSearch(shouldShow);
    };

    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateDesktopSearchState);
    };

    updateDesktopSearchState();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

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
      const panelHeight = panelRect?.height ?? desktopCompactFilterHeightRef.current;

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
      scheduleDesktopCompactFilterMeasurementRef.current?.();
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [activeFilterCount, results.length, showDesktopFilterShortcut]);

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
    triggerFilterApplying();
    setMaxPrice(value);
  };

  const updateSelectedStarRating = (rating: HotelStarRatingSelection) => {
    triggerFilterApplying();
    setSelectedStarRating(rating);
  };

  const resetFilters = () => {
    triggerFilterApplying();
    setMaxPrice(resultMaxPrice);
    setSelectedStarRating(ALL_HOTEL_STAR_RATINGS);
    setSelectedFilters(emptySelections);
  };

  const toggleFilter = (group: keyof HotelFilterSelections, value?: string) => {
    triggerFilterApplying();
    setSelectedFilters((current) => ({
      ...current,
      [group]:
        value === undefined
          ? []
          : current[group].includes(value)
            ? current[group].filter((item) => item !== value)
            : [...current[group], value],
    }));
  };

  const removeFilterChip = (chip: ActiveHotelFilterChip) => {
    triggerFilterApplying();

    if (chip.kind === "maxPrice") {
      setMaxPrice(resultMaxPrice);
      return;
    }

    if (chip.kind === "starRating") {
      setSelectedStarRating(ALL_HOTEL_STAR_RATINGS);
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
    triggerFilterApplying();
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
      const selectedIndex = hotelSortOptions.findIndex(
        (option) => option.value === hotelSummarySortMode,
      );

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

  if (loading) {
    return (
      <main className="flex min-h-[calc(100svh-5rem)] flex-1 bg-[radial-gradient(circle_at_top_left,rgba(92,182,178,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,75,184,0.16),transparent_36%),linear-gradient(180deg,#F2F7FA_0%,#FFFFFF_58%,#FFFFFF_100%)]">
        <BrandedLoading
          variant="fullscreen"
          visual="logoPulse"
          showProgress={false}
          searchType="hotel"
          className="min-h-[calc(100svh-5rem)] flex-1 bg-transparent px-5"
          contentClassName="max-w-md text-center"
        />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-x-clip bg-[#f6f8fb] pb-8">
      <div
        className={cn(
          "sticky top-0 z-50 border-b border-slate-200/70 bg-[#f6f8fb]/95 px-4 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)] backdrop-blur sm:hidden",
          mobileHotelSearchOpen && "hidden",
        )}
      >
        <HotelSearchBar
          key={`mobile-controls-${activeMobileHotelSearchKey}`}
          initialDestination={activeMobileHotelSearchDraft.destination}
          initialCheckIn={activeMobileHotelSearchDraft.checkIn}
          initialCheckOut={activeMobileHotelSearchDraft.checkOut}
          initialGuests={activeMobileHotelSearchDraft.guests}
          initialRooms={activeMobileHotelSearchDraft.rooms}
          initialSort={body.sort}
          errorRole="alert"
          compact
          mobileLayout="controls"
          onOpenFilters={() => setFiltersOpen(true)}
          onOpenMobileSearch={openMobileHotelSearch}
          onMobileDraftChange={updateMobileHotelSearchDraft}
          onSubmitStart={triggerSearchApplying}
        />
      </div>

      {mobileHotelSearchOpen ? (
        <div className="fixed inset-0 z-[10000] min-h-[100dvh] overflow-hidden bg-slate-50 sm:hidden">
          <HotelSearchBar
            key={`mobile-drawer-${bodySearchKey}-${body.sort}`}
            initialDestination={activeMobileHotelSearchDraft.destination}
            initialCheckIn={activeMobileHotelSearchDraft.checkIn}
            initialCheckOut={activeMobileHotelSearchDraft.checkOut}
            initialGuests={activeMobileHotelSearchDraft.guests}
            initialRooms={activeMobileHotelSearchDraft.rooms}
            initialSort={body.sort}
            errorRole="alert"
            compact
            mobileLayout="drawer"
            onCloseMobileSearch={closeMobileHotelSearch}
            onMobileDraftChange={updateMobileHotelSearchDraft}
            onSubmitStart={triggerSearchApplying}
          />
        </div>
      ) : null}

      <section className="hidden bg-white pb-0 pt-7 shadow-none sm:block">
        <div className="page-shell">
          <div
            ref={desktopSearchFrameRef}
            className="relative z-40 min-w-0 overflow-visible"
          >
            <div className="relative z-10 min-w-0 translate-y-5 overflow-visible">
              <HotelSearchBar
                key={`${body.destination}-${body.checkIn}-${body.checkOut}-${body.guests}-${body.rooms}-${body.sort}`}
                initialDestination={body.destination}
                initialCheckIn={body.checkIn}
                initialCheckOut={body.checkOut}
                initialGuests={body.guests}
                initialRooms={body.rooms}
                initialSort={body.sort}
                errorRole="alert"
                compact
                className="min-w-0"
                onDesktopDraftChange={updateDesktopHotelSearchDraft}
                onSubmitStart={triggerSearchApplying}
              />
            </div>
          </div>
        </div>
      </section>

      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[1000] hidden border-b border-slate-200/80 bg-gradient-to-b from-[#fbfdff]/96 via-[#f8fbff]/94 to-[#f5f9ff]/92 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.07)] backdrop-blur-xl transition-all duration-200 lg:block",
          showDesktopMinimizedSearch
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0",
        )}
        aria-hidden={!showDesktopMinimizedSearch}
      >
        <div className="page-shell">
          <div className="mx-auto w-full max-w-5xl">
            <div className="group flex min-h-[56px] w-full items-stretch overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 text-start shadow-[0_18px_40px_-26px_rgba(15,23,42,0.68)] ring-1 ring-white/85 backdrop-blur-md transition hover:border-slate-300 hover:bg-white">
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-stretch">
                <button type="button" aria-label="Edit hotel destination" onClick={scrollToFullHotelSearch} className="focus-ring flex min-h-[44px] min-w-0 flex-col justify-center border-e border-slate-200/80 px-3 py-1.5 text-start transition-colors hover:bg-white/70 focus-visible:bg-white/75">
                  <span className="whitespace-nowrap text-[0.62rem] font-semibold uppercase leading-3 tracking-[0.12em] text-slate-500">Destination</span>
                  <span className="mt-0.5 block truncate text-sm font-semibold leading-5 text-slate-950">{activeDesktopHotelSearchDraft.destination || body.destination}</span>
                </button>
                <button type="button" aria-label="Edit travel dates" onClick={scrollToFullHotelSearch} className="focus-ring flex min-h-[44px] min-w-0 flex-col justify-center border-e border-slate-200/80 px-3 py-1.5 text-start transition-colors hover:bg-white/70 focus-visible:bg-white/75">
                  <span className="whitespace-nowrap text-[0.62rem] font-semibold uppercase leading-3 tracking-[0.12em] text-slate-500">Travel dates</span>
                  <span className="mt-0.5 block truncate text-sm font-semibold leading-5 text-slate-950">{desktopMinimizedDateSummary}</span>
                </button>
                <button type="button" aria-label="Edit guests and rooms" onClick={scrollToFullHotelSearch} className="focus-ring flex min-h-[44px] min-w-0 flex-col justify-center border-e border-slate-200/80 px-3 py-1.5 text-start transition-colors hover:bg-white/70 focus-visible:bg-white/75">
                  <span className="whitespace-nowrap text-[0.62rem] font-semibold uppercase leading-3 tracking-[0.12em] text-slate-500">Guests / rooms</span>
                  <span className="mt-0.5 block truncate text-sm font-semibold leading-5 text-slate-950">{desktopMinimizedGuestsSummary}</span>
                </button>
                <div className="flex min-h-[44px] items-center justify-center px-3 py-1.5">
                  <button type="button" aria-label="Edit hotel search" onClick={scrollToFullHotelSearch} className="h-9 whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-sm font-bold text-white transition-colors hover:bg-[#021C2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">Search</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              href="/hotels"
              className="transition-colors hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
            >
              Hotels
            </Link>
          </li>

          <li className="text-slate-300" aria-hidden="true">
            &gt;
          </li>

          <li className="text-slate-700" aria-current="page">
            Hotel results
          </li>
        </ol>
      </nav>

      <div
        ref={resultsGridRef}
        className="page-shell grid gap-y-5 pb-6 pt-5 sm:pt-6 lg:grid-cols-[256px_minmax(0,1fr)] lg:gap-x-9"
      >
        <aside
          ref={desktopFilterSidebarRef}
          className="relative hidden self-stretch lg:block"
        >
          <div>
            <HotelFilters
              layout="desktop"
              t={t}
              maxPrice={maxPrice}
              setMaxPrice={updateMaxPrice}
              resultMaxPrice={resultMaxPrice}
              formatPrice={formatHotelFilterPrice}
              locale={locale}
              selectedRating={selectedStarRating}
              setSelectedRating={updateSelectedStarRating}
              starRatingCounts={starRatingCounts}
              options={filterOptions}
              selectedFilters={selectedFilters}
              toggleFilter={toggleFilter}
              activeFilterCount={activeFilterCount}
              onClear={resetFilters}
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
                <HotelFilters
                  layout="compact"
                  t={t}
                  maxPrice={maxPrice}
                  setMaxPrice={updateMaxPrice}
                  resultMaxPrice={resultMaxPrice}
                  formatPrice={formatHotelFilterPrice}
                  locale={locale}
                  selectedRating={selectedStarRating}
                  setSelectedRating={updateSelectedStarRating}
                  starRatingCounts={starRatingCounts}
                  options={filterOptions}
                  selectedFilters={selectedFilters}
                  toggleFilter={toggleFilter}
                  activeFilterCount={activeFilterCount}
                  onClear={resetFilters}
                />
              </div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {error ? (
            <div
              className={cn(
                hotelResultStackClass,
                "rounded-md border border-danger/30 bg-red-50 p-4 text-danger",
              )}
            >
              {error}
            </div>
          ) : showFilteredEmptyState ? (
            <div className={cn(hotelResultStackClass, "space-y-4")}>
              <ActiveHotelFilterChips
                chips={activeFilterChips}
                onRemove={removeFilterChip}
                onClearAll={resetFilters}
                t={t}
              />
              <div className="rounded-2xl border border-[#004BB8]/10 bg-white p-4 shadow-[0_16px_40px_-24px_rgba(2,28,43,0.28)]">
                <p className="text-base font-bold text-[#021C2B]">
                  {t("hotelResults.noStaysMatchFiltersTitle")}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  {t("hotelResults.noStaysMatchFiltersBody")}
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={resetFilters}
                >
                  {t("hotelResults.resetFilters")}
                </Button>
              </div>
            </div>
          ) : (
            <div className={cn(hotelResultStackClass, "space-y-4")}>
              <div
                className={cn(
                  "space-y-3 transition-opacity",
                  resultsApplying ? "animate-pulse opacity-80" : undefined,
                )}
              >
                <ActiveHotelFilterChips
                  chips={activeFilterChips}
                  onRemove={removeFilterChip}
                  onClearAll={resetFilters}
                  t={t}
                />

                <div
                  role="group"
                  aria-label={t("hotelResults.summaryAria")}
                  className="flex w-full flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <h1 className="min-w-0 text-sm font-bold text-navy">
                    {resultsHeading}
                  </h1>
                  <div className="flex min-w-0 items-center justify-end gap-2">
                    <span className="whitespace-nowrap text-base font-semibold text-slate-700">
                      {`${t("sortBy") || "Sort by"}:`}
                    </span>

                    <div
                        ref={hotelSortWrapperRef}
                        className="relative inline-flex min-w-0 items-center"
                        onBlur={(event) => {
                          if (
                            !event.currentTarget.contains(
                              event.relatedTarget,
                            )
                          ) {
                            setHotelSortMenuOpen(false);
                          }
                        }}
                      >
                        <button
                          ref={hotelSortTriggerRef}
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={hotelSortMenuOpen}
                          aria-controls="hotel-results-sort-menu"
                          className="inline-flex h-10 items-center gap-2 bg-transparent py-1 pl-1 text-lg font-bold text-slate-950 outline-none transition-colors hover:text-[#004BB8] focus-visible:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 focus-visible:ring-offset-2"
                          onClick={handleHotelSortTriggerClick}
                        >
                          <span>{selectedHotelSortLabel}</span>
                          <ChevronDown
                            aria-hidden="true"
                            className={cn(
                              "h-[18px] w-[18px] text-slate-700 transition-transform",
                              hotelSortMenuOpen && "rotate-180",
                            )}
                            strokeWidth={2.25}
                          />
                        </button>

                        {hotelSortMenuOpen ? (
                          <div
                            ref={hotelSortMenuRef}
                            id="hotel-results-sort-menu"
                            role="listbox"
                            aria-label={t("sortBy") || "Sort by"}
                            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[190px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_38px_-18px_rgba(15,23,42,0.35)]"
                          >
                            {hotelSortOptions.map((option, index) => {
                              const selected =
                                option.value === hotelSummarySortMode;

                              return (
                                <button
                                  key={option.value}
                                  ref={(element) => {
                                    hotelSortOptionRefs.current[index] =
                                      element;
                                  }}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  tabIndex={selected ? 0 : -1}
                                  className={cn(
                                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-base font-medium leading-6 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30",
                                    selected
                                      ? "bg-[#004BB8]/[0.08] text-[#004BB8]"
                                      : "text-slate-800 hover:bg-slate-50 hover:text-slate-950",
                                  )}
                                  onClick={() => {
                                    updateHotelSummarySortMode(option.value);
                                    setHotelSortMenuOpen(false);
                                    hotelSortTriggerRef.current?.focus({
                                      preventScroll: true,
                                    });
                                  }}
                                  onKeyDown={(event) =>
                                    handleHotelSortOptionKeyDown(event, index)
                                  }
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
                    </div>
                  </div>

                {sortedVisibleHotels.length ? (
                  sortedVisibleHotels.map((hotel, index) => (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      sortBadge={
                        index === 0 ? hotelSummarySortMode : undefined
                      }
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-muted shadow-sm">
                    {t("hotelResults.noStaysMatchFiltersInline")}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <aside
        className={cn(
          "fixed inset-0 z-[10000] flex h-[100dvh] flex-col overflow-hidden bg-white transition-transform duration-200 ease-out lg:hidden",
          filtersOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="shrink-0 border-b border-slate-200 bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] shadow-[0_1px_0_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold leading-6 text-slate-950">
              {t("filters")}
            </h2>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-white px-0 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
              aria-label={t("closeFilters")}
              onClick={() => setFiltersOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "hotel-filter-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4",
            filterScrollbarVisible
              ? "hotel-filter-scrollbar--visible"
              : undefined,
          )}
          onScroll={showFilterScrollbarWhileScrolling}
        >
          <HotelFilters
            layout="mobile"
            t={t}
            maxPrice={maxPrice}
            setMaxPrice={updateMaxPrice}
            resultMaxPrice={resultMaxPrice}
            formatPrice={formatHotelFilterPrice}
            locale={locale}
            selectedRating={selectedStarRating}
            setSelectedRating={updateSelectedStarRating}
            starRatingCounts={starRatingCounts}
            options={filterOptions}
            selectedFilters={selectedFilters}
            toggleFilter={toggleFilter}
            activeFilterCount={activeFilterCount}
            onClear={resetFilters}
          />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
          <Button
            type="button"
            variant="ghost"
            disabled={activeFilterChips.length === 0}
            className="h-12 min-w-0 rounded-xl px-0 text-sm font-bold text-[#004BB8] transition hover:bg-transparent hover:text-[#003f9c] disabled:pointer-events-none disabled:text-slate-400"
            onClick={resetFilters}
          >
            {t("clearAll")}
          </Button>
          <Button
            type="button"
            className="h-12 min-w-[8.75rem] rounded-xl bg-[#004BB8] px-7 text-base font-bold text-white shadow-md shadow-[#004BB8]/12 transition hover:bg-[#003f9c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2"
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

function sortHotelSummaryResults(
  hotels: PublicHotelResult[],
  sortMode: HotelSummarySortMode,
  rates?: ExchangeRates,
) {
  const indexedHotels = hotels.map((hotel, index) => ({ hotel, index }));

  if (sortMode === "bestValue" && !hotels.some(hasHotelValueScore)) {
    return hotels;
  }

  indexedHotels.sort((first, second) => {
    if (sortMode === "cheapest") {
      return (
        getHotelSortablePrice(first.hotel, rates) -
          getHotelSortablePrice(second.hotel, rates) || first.index - second.index
      );
    }

    if (sortMode === "topRated") {
      return (
        getHotelSortableRating(second.hotel) -
          getHotelSortableRating(first.hotel) ||
        getHotelSortablePrice(first.hotel, rates) -
          getHotelSortablePrice(second.hotel, rates) ||
        first.index - second.index
      );
    }

    const firstScore = getHotelValueSortScore(first.hotel);
    const secondScore = getHotelValueSortScore(second.hotel);

    if (firstScore === null && secondScore === null) {
      return first.index - second.index;
    }

    if (firstScore === null) return 1;
    if (secondScore === null) return -1;

    return (
      secondScore - firstScore ||
      getHotelSortablePrice(first.hotel, rates) -
        getHotelSortablePrice(second.hotel, rates) ||
      first.index - second.index
    );
  });

  return indexedHotels.map(({ hotel }) => hotel);
}

function getHotelSortablePrice(hotel: PublicHotelResult, rates?: ExchangeRates) {
  const comparableTotalUsd = getHotelComparableTotalUsd(hotel, rates);
  if (Number.isFinite(comparableTotalUsd)) return comparableTotalUsd;

  return Number.POSITIVE_INFINITY;
}

function getHotelComparableTotalUsd(hotel: PublicHotelResult, rates?: ExchangeRates) {
  const convertedTotal = convertCurrencyAmount(
    hotel.totalPrice,
    hotel.currency || "USD",
    "USD",
    rates,
  );

  if (convertedTotal !== null) return convertedTotal;

  // Keep filter/sort behavior usable if an unexpected provider currency is
  // missing from the FX table; display formatting still preserves the provider
  // currency instead of relabeling this raw amount.
  if ((hotel.currency || "USD").toUpperCase() === "USD" && Number.isFinite(hotel.totalPrice)) {
    return hotel.totalPrice;
  }

  return Number.isFinite(hotel.totalPrice) ? hotel.totalPrice : Number.POSITIVE_INFINITY;
}

function getHotelSortableRating(hotel: PublicHotelResult) {
  return Number.isFinite(hotel.rating)
    ? hotel.rating
    : Number.NEGATIVE_INFINITY;
}

function hasHotelValueScore(hotel: PublicHotelResult) {
  return getHotelValueSortScore(hotel) !== null;
}

function getHotelValueSortScore(hotel: PublicHotelResult) {
  return Number.isFinite(hotel.valueScore) ? hotel.valueScore : null;
}

function formatHotelRating(
  rating: number,
  t: (key: string) => string,
  locale: string,
) {
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: Number.isInteger(rating) ? 0 : 1,
    minimumFractionDigits: Number.isInteger(rating) ? 0 : 1,
  }).format(rating);

  return t(
    rating === 1 ? "hotelResults.starSingular" : "hotelResults.starPlural",
  ).replace("{{count}}", formatted);
}


function formatHotelCount(count: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(count);
}

function ActiveHotelFilterChips({
  chips,
  onRemove,
  onClearAll,
  t,
}: {
  chips: ActiveHotelFilterChip[];
  onRemove: (chip: ActiveHotelFilterChip) => void;
  onClearAll: () => void;
  t: (key: string) => string;
}) {
  if (!chips.length) return null;

  return (
    <div
      className="flex max-w-full flex-wrap items-center gap-2 overflow-x-clip"
      aria-label={t("hotelResults.activeHotelFilters")}
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#004BB8]/12 bg-[#EAF2FB] px-2.5 py-1 text-xs font-semibold text-[#123B65] transition-colors hover:border-[#004BB8]/20 hover:bg-[#DDEBFA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
          onClick={() => onRemove(chip)}
          aria-label={t("hotelResults.removeFilter").replace(
            "{{label}}",
            chip.label,
          )}
        >
          <span className="truncate">{chip.label}</span>
          <span
            aria-hidden="true"
            className="text-sm leading-none text-[#004BB8]"
          >
            ×
          </span>
        </button>
      ))}
      <button
        type="button"
        className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:text-[#235A9F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
        onClick={onClearAll}
      >
        {t("clearAll")}
      </button>
    </div>
  );
}

function HotelFilters({
  layout = "desktop",
  t,
  maxPrice,
  setMaxPrice,
  resultMaxPrice,
  formatPrice,
  locale,
  selectedRating,
  setSelectedRating,
  starRatingCounts,
  options,
  selectedFilters,
  toggleFilter,
  activeFilterCount,
  onClear,
}: {
  layout?: "desktop" | "compact" | "mobile";
  t: (key: string) => string;
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  resultMaxPrice: number;
  formatPrice: (amountUsd: number) => string;
  locale: string;
  selectedRating: HotelStarRatingSelection;
  setSelectedRating: (value: HotelStarRatingSelection) => void;
  starRatingCounts: Record<HotelStarRatingSelection, number>;
  options: ReturnType<typeof buildHotelFilterOptions>;
  selectedFilters: HotelFilterSelections;
  toggleFilter: (group: keyof HotelFilterSelections, value?: string) => void;
  activeFilterCount: number;
  onClear: () => void;
}) {
  const filterRangeClass =
    "h-2 w-full cursor-pointer appearance-none rounded-full bg-border outline-none transition disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[#2F73C8] [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2F73C8] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border [&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[#2F73C8] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#2F73C8] [&::-moz-range-thumb]:shadow-md";

  const [openCompactSection, setOpenCompactSection] =
    useState<CompactHotelFilterSectionId>("price");
  const getSelectedCount = (group: keyof HotelFilterSelections) =>
    selectedFilters[group].length;
  const compactSections = ([
    {
      id: "price",
      title: t("hotelResults.budgetPrice"),
      selectedCount: maxPrice < resultMaxPrice ? 1 : 0,
      content: (
        <PriceFilterControl
          t={t}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          resultMaxPrice={resultMaxPrice}
          formatPrice={formatPrice}
          filterRangeClass={filterRangeClass}
        />
      ),
    },
    {
      id: "rating",
      title: t("hotelResults.starRating"),
      selectedCount: selectedRating === ALL_HOTEL_STAR_RATINGS ? 0 : 1,
      content: (
        <StarRatingFilterControl
          selectedRating={selectedRating}
          onChange={setSelectedRating}
          counts={starRatingCounts}
          locale={locale}
          t={t}
        />
      ),
    },
    { id: "locations", title: t("hotelResults.locationArea"), selectedCount: getSelectedCount("locations"), content: <CheckboxFilterOptions options={options.locations} selected={selectedFilters.locations} onToggle={(value) => toggleFilter("locations", value)} t={t} locale={locale} /> },
    { id: "propertyTypes", title: t("hotelResults.propertyType"), selectedCount: getSelectedCount("propertyTypes"), content: <CheckboxFilterOptions options={options.propertyTypes} selected={selectedFilters.propertyTypes} onToggle={(value) => toggleFilter("propertyTypes", value)} allOption={{ label: "Any property type", count: options.totalCount, onSelect: () => toggleFilter("propertyTypes") }} t={t} locale={locale} /> },
    { id: "roomTypes", title: t("hotelResults.roomType"), selectedCount: getSelectedCount("roomTypes"), content: <CheckboxFilterOptions options={options.roomTypes} selected={selectedFilters.roomTypes} onToggle={(value) => toggleFilter("roomTypes", value)} allOption={{ label: "Any room type", count: options.totalCount, onSelect: () => toggleFilter("roomTypes") }} t={t} locale={locale} /> },
    { id: "bedTypes", title: t("hotelResults.bedType"), selectedCount: getSelectedCount("bedTypes"), content: <CheckboxFilterOptions options={options.bedTypes} selected={selectedFilters.bedTypes} onToggle={(value) => toggleFilter("bedTypes", value)} t={t} locale={locale} /> },
    { id: "meals", title: t("hotelResults.meals"), selectedCount: getSelectedCount("meals"), content: <CheckboxFilterOptions options={options.meals} selected={selectedFilters.meals} onToggle={(value) => toggleFilter("meals", value)} t={t} locale={locale} /> },
    { id: "cancellationPolicies", title: t("hotelResults.cancellationPolicy"), selectedCount: getSelectedCount("cancellationPolicies"), content: <CheckboxFilterOptions options={options.cancellationPolicies} selected={selectedFilters.cancellationPolicies} onToggle={(value) => toggleFilter("cancellationPolicies", value)} t={t} locale={locale} /> },
    { id: "facilities", title: t("hotelResults.facilities"), selectedCount: getSelectedCount("facilities"), content: <CheckboxFilterOptions options={options.facilities} selected={selectedFilters.facilities} onToggle={(value) => toggleFilter("facilities", value)} t={t} locale={locale} /> },
  ] satisfies Array<{
    id: Exclude<CompactHotelFilterSectionId, null>;
    title: string;
    selectedCount: number;
    content: ReactNode;
  }>).filter(
    (section) => section.id !== "meals" || options.meals.length > 0,
  );

  if (layout === "compact") {
    return (
      <div
        className="rounded-[1.15rem] border border-slate-200/90 bg-white shadow-[0_14px_34px_-28px_rgba(15,23,42,0.45)] ring-1 ring-slate-950/[0.02]"
        style={{
          maxHeight: `calc(100vh - ${desktopCompactFilterTopOffset + 12}px)`,
          overflowY: "auto",
          overscrollBehavior: "contain",
        }}
      >
        <div className="border-b border-slate-200/70 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="truncate text-sm font-bold text-slate-950">
              {t("hotelResults.filterBy")}
            </h2>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-[#235A9F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
                onClick={onClear}
              >
                Clear all
              </button>
            ) : null}
          </div>
          {activeFilterCount > 0 ? (
            <span className="mt-2 inline-flex rounded-full bg-[#EAF2FB] px-2 py-0.5 text-[11px] font-semibold text-[#235A9F] ring-1 ring-[#004BB8]/8">
              {t("activeFilterCount").replace("{{count}}", String(activeFilterCount))}
            </span>
          ) : null}
        </div>
        <div className="divide-y divide-slate-200/75">
          {compactSections.map((section) => (
            <CompactHotelFilterSection
              key={section.id}
              title={section.title}
              selectedCount={section.selectedCount}
              expanded={openCompactSection === section.id}
              onToggle={() =>
                setOpenCompactSection((current) =>
                  current === section.id ? null : section.id,
                )
              }
            >
              {section.content}
            </CompactHotelFilterSection>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        layout === "mobile" ? "bg-white" : "desktop-filter-sidebar border border-slate-200/80 bg-transparent p-0 shadow-none rounded-none",
      )}
    >
      {layout === "desktop" ? (
        <div className="desktop-filter-sidebar__header border-b border-slate-200/70 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="desktop-filter-sidebar__title truncate text-base font-bold text-slate-950">
              {t("hotelResults.filterBy")}
            </h2>
            <SlidersHorizontal
              className="desktop-filter-sidebar__icon shrink-0 text-[#004BB8]"
              size={18}
            />
          </div>
          {activeFilterCount > 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="desktop-filter-sidebar__count rounded-full bg-[#EAF2FB] px-2 py-0.5 text-[11px] font-semibold text-[#235A9F] ring-1 ring-[#004BB8]/8">
                {t("activeFilterCount").replace("{{count}}", String(activeFilterCount))}
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
      ) : null}

      <div
        className={cn(
          layout === "mobile" ? "space-y-0 bg-white" : "space-y-0 bg-transparent px-3 py-1",
        )}
      >
        <FilterSection title={t("hotelResults.budgetPrice")} layout={layout}>
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
              {t("hotelResults.totalUpTo")}{" "}
              <span className="font-mono text-[#021C2B]">
                {formatPrice(maxPrice)}
              </span>
            </span>
            <input
              className={filterRangeClass}
              type="range"
              min={100}
              max={Math.max(resultMaxPrice, 300)}
              step={25}
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              aria-valuetext={formatPrice(maxPrice)}
            />
          </label>
        </FilterSection>

        <FilterSection title={t("hotelResults.starRating")} layout={layout}>
          <StarRatingFilterControl
            selectedRating={selectedRating}
            onChange={setSelectedRating}
            counts={starRatingCounts}
            locale={locale}
            t={t}
          />
        </FilterSection>

        <CheckboxFilterSection
          title={t("hotelResults.locationArea")}
          options={options.locations}
          selected={selectedFilters.locations}
          onToggle={(value) => toggleFilter("locations", value)}
          t={t}
          locale={locale}
          collapsedCount={5}
          layout={layout}
        />

        <CheckboxFilterSection
          title={t("hotelResults.propertyType")}
          options={options.propertyTypes}
          selected={selectedFilters.propertyTypes}
          onToggle={(value) => toggleFilter("propertyTypes", value)}
          allOption={{
            label: "Any property type",
            count: options.totalCount,
            onSelect: () => toggleFilter("propertyTypes"),
          }}
          t={t}
          locale={locale}
          layout={layout}
        />

        <CheckboxFilterSection
          title={t("hotelResults.roomType")}
          options={options.roomTypes}
          selected={selectedFilters.roomTypes}
          onToggle={(value) => toggleFilter("roomTypes", value)}
          allOption={{
            label: "Any room type",
            count: options.totalCount,
            onSelect: () => toggleFilter("roomTypes"),
          }}
          t={t}
          locale={locale}
          collapsedCount={5}
          layout={layout}
        />

        <CheckboxFilterSection
          title={t("hotelResults.bedType")}
          options={options.bedTypes}
          selected={selectedFilters.bedTypes}
          onToggle={(value) => toggleFilter("bedTypes", value)}
          t={t}
          locale={locale}
          collapsedCount={5}
          layout={layout}
        />

        {options.meals.length > 0 ? (
          <CheckboxFilterSection
            title={t("hotelResults.meals")}
            options={options.meals}
            selected={selectedFilters.meals}
            onToggle={(value) => toggleFilter("meals", value)}
            t={t}
            locale={locale}
            layout={layout}
          />
        ) : null}

        <CheckboxFilterSection
          title={t("hotelResults.cancellationPolicy")}
          options={options.cancellationPolicies}
          selected={selectedFilters.cancellationPolicies}
          onToggle={(value) => toggleFilter("cancellationPolicies", value)}
          t={t}
          locale={locale}
          layout={layout}
        />

        <CheckboxFilterSection
          title={t("hotelResults.facilities")}
          options={options.facilities}
          selected={selectedFilters.facilities}
          onToggle={(value) => toggleFilter("facilities", value)}
          t={t}
          locale={locale}
          collapsedCount={6}
          layout={layout}
        />
      </div>
    </div>
  );
}


function PriceFilterControl({
  t,
  maxPrice,
  setMaxPrice,
  resultMaxPrice,
  formatPrice,
  filterRangeClass,
}: {
  t: (key: string) => string;
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  resultMaxPrice: number;
  formatPrice: (amountUsd: number) => string;
  filterRangeClass: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
        {t("hotelResults.totalUpTo")} {" "}
        <span className="font-mono text-[#021C2B]">
          {formatPrice(maxPrice)}
        </span>
      </span>
      <input
        className={filterRangeClass}
        type="range"
        min={100}
        max={Math.max(resultMaxPrice, 300)}
        step={25}
        value={maxPrice}
        onChange={(event) => setMaxPrice(Number(event.target.value))}
        aria-valuetext={formatPrice(maxPrice)}
      />
    </label>
  );
}

function StarRatingFilterControl({
  selectedRating,
  onChange,
  counts,
  locale,
  t,
}: {
  selectedRating: HotelStarRatingSelection;
  onChange: (rating: HotelStarRatingSelection) => void;
  counts: Record<HotelStarRatingSelection, number>;
  locale: string;
  t: (key: string) => string;
}) {
  const groupId = useId();
  const options: HotelStarRatingSelection[] = [
    ALL_HOTEL_STAR_RATINGS,
    5,
    4,
    3,
    2,
    1,
  ];

  return (
    <fieldset className="space-y-0.5">
      <legend className="sr-only">{t("hotelResults.starRating")}</legend>

      {options.map((rating) => {
        const selected = selectedRating === rating;
        const label =
          rating === ALL_HOTEL_STAR_RATINGS
            ? t("recentSearchesFilterAll") || "All"
            : formatHotelRating(rating, t, locale);

        return (
          <label
            key={rating}
            className="group flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
          >
            <span className="flex min-w-0 items-center gap-2">
              <input
                className="peer sr-only"
                type="radio"
                name={groupId}
                value={rating}
                checked={selected}
                onChange={() => onChange(rating)}
                aria-label={label}
              />

              <span
                aria-hidden="true"
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border transition-colors",
                  selected
                    ? "border-[#0057B8] bg-[#0057B8] text-white"
                    : "border-slate-300 bg-white group-hover:border-slate-400",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-[#004BB8]/30 peer-focus-visible:ring-offset-2",
                )}
              >
                {selected ? (
                  <Check
                    className="h-3 w-3"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                ) : null}
              </span>

              {rating === ALL_HOTEL_STAR_RATINGS ? (
                <span
                  className={cn(
                    "leading-none",
                    selected ? "font-semibold" : "font-normal",
                  )}
                >
                  {label}
                </span>
              ) : (
                <span
                  className="flex items-center gap-[2px]"
                  aria-hidden="true"
                >
                  {Array.from({ length: rating }).map((_, index) => (
                    <Star
                      key={index}
                      className="h-[15px] w-[15px] fill-[#E9A400] text-[#E9A400]"
                      aria-hidden="true"
                    />
                  ))}
                </span>
              )}
            </span>

            <span className="min-w-6 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-500">
              {formatHotelCount(counts[rating] ?? 0, locale)}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function CompactHotelFilterSection({
  title,
  selectedCount,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  selectedCount: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm font-bold text-slate-950 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/25"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="min-w-0 truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {selectedCount > 0 ? (
            <span className="rounded-full bg-[#EAF2FB] px-2 py-0.5 text-[11px] font-semibold text-[#235A9F] ring-1 ring-[#004BB8]/8">
              {selectedCount}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-500 transition-transform",
              expanded && "rotate-180",
            )}
            aria-hidden="true"
          />
        </span>
      </button>
      {expanded ? <div className="px-3 pb-3">{children}</div> : null}
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
}) {
  const [expanded, setExpanded] = useState(false);

  if (!options.length && !allOption) return null;

  const allOptionChecked = Boolean(allOption) && selected.length === 0;
  const visibleOptions = expanded ? options : options.slice(0, collapsedCount);
  const hasMore = options.length > collapsedCount;

  return (
    <>
      <div className="grid gap-0.5">
        {allOption ? (
          <label className="group flex min-h-9 min-w-0 cursor-pointer items-start justify-between gap-3 rounded-lg px-1.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950">
            <span className="flex min-w-0 flex-1 items-start gap-2">
              <input
                className="peer sr-only"
                type="checkbox"
                checked={allOptionChecked}
                onChange={() => {
                  if (!allOptionChecked) allOption.onSelect();
                }}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border transition-colors",
                  allOptionChecked
                    ? "border-[#0057B8] bg-[#0057B8] text-white"
                    : "border-slate-300 bg-white group-hover:border-slate-400",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-[#004BB8]/30 peer-focus-visible:ring-offset-2",
                )}
              >
                {allOptionChecked ? (
                  <Check
                    className="h-3 w-3"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "min-w-0 truncate",
                  allOptionChecked ? "font-semibold text-[#0057B8]" : undefined,
                )}
              >
                {allOption.label}
              </span>
            </span>
            <span className="min-w-6 shrink-0 text-right text-xs font-medium tabular-nums text-slate-500">
              {formatHotelCount(allOption.count, locale)}
            </span>
          </label>
        ) : null}
        {visibleOptions.map((option) => {
          const checked = selected.includes(option.value);

          return (
            <label
              key={option.value}
              className="group flex min-h-9 min-w-0 cursor-pointer items-start justify-between gap-3 rounded-lg px-1.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <span className="flex min-w-0 flex-1 items-start gap-2">
                <input
                  className="peer sr-only"
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(option.value)}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border transition-colors",
                    checked
                      ? "border-[#0057B8] bg-[#0057B8] text-white"
                      : "border-slate-300 bg-white group-hover:border-slate-400",
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-[#004BB8]/30 peer-focus-visible:ring-offset-2",
                  )}
                >
                  {checked ? (
                    <Check
                      className="h-3 w-3"
                      strokeWidth={3}
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "min-w-0 truncate",
                    checked ? "font-semibold text-navy" : undefined,
                  )}
                >
                  {option.label}
                </span>
              </span>
              <span className="min-w-6 shrink-0 text-right text-xs font-medium tabular-nums text-slate-500">
                {formatHotelCount(option.count, locale)}
              </span>
            </label>
          );
        })}
      </div>

      {hasMore ? (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-[#004BB8] transition-colors hover:text-[#021C2B]"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded
            ? t("hotelResults.showLess")
            : t("hotelResults.showMore").replace(
                "{{count}}",
                formatHotelCount(options.length - collapsedCount, locale),
              )}
        </button>
      ) : null}
    </>
  );
}

function FilterSection({
  title,
  children,
  layout = "desktop",
}: {
  title: string;
  children: ReactNode;
  layout?: "desktop" | "compact" | "mobile";
}) {
  return (
    <section
      className={cn(
        "border-t border-slate-200/75 first:border-t-0",
        layout === "mobile" ? "py-4" : "py-4",
      )}
    >
      <h3 className="mb-2 text-sm font-extrabold uppercase leading-5 tracking-[0.14em] text-slate-950">
        {title}
      </h3>
      <div className="grid gap-0.5">{children}</div>
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
}) {
  return (
    <FilterSection title={title} layout={layout}>
      <CheckboxFilterOptions
        options={options}
        selected={selected}
        onToggle={onToggle}
        allOption={allOption}
        t={t}
        collapsedCount={collapsedCount}
        locale={locale}
      />
    </FilterSection>
  );
}

function buildActiveFilterChips(
  selectedFilters: HotelFilterSelections,
  maxPrice: number,
  resultMaxPrice: number,
  selectedStarRating: HotelStarRatingSelection,
  formatPrice: (amountUsd: number) => string,
  t: (key: string) => string,
  locale: string,
  facilityOptions: FilterOption[],
  locationOptions: FilterOption[],
): ActiveHotelFilterChip[] {
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

  const chips: ActiveHotelFilterChip[] = filterGroups.flatMap(
    ({ group, filters }) =>
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

  if (maxPrice < resultMaxPrice) {
    chips.push({
      key: "maxPrice",
      label: t("hotelResults.upToPrice").replace(
        "{{price}}",
        formatPrice(maxPrice),
      ),
      kind: "maxPrice",
    });
  }

  if (selectedStarRating !== ALL_HOTEL_STAR_RATINGS) {
    chips.push({
      key: "starRating",
      label: formatHotelRating(selectedStarRating, t, locale),
      kind: "starRating",
    });
  }

  return chips;
}

function buildHotelFilterOptions(
  hotels: PublicHotelResult[],
  t: (key: string) => string,
  destination: string,
) {
  return {
    totalCount: hotels.length,
    propertyTypes: buildTermOptions(
      hotels,
      PROPERTY_TYPE_FILTERS,
      (hotel) => [hotel.name, hotel.roomType].join(" "),
      t,
      true,
    ),
    meals: buildTermOptions(hotels, MEAL_FILTERS, getSearchableHotelText, t),
    cancellationPolicies: buildTermOptions(
      hotels,
      CANCELLATION_FILTERS,
      (hotel) => [hotel.cancellationInfo, ...hotel.amenities].join(" "),
      t,
    ),
    facilities: buildHotelFacilityFilterOptions(hotels, t),
    locations: buildHotelNeighbourhoodFilterOptions(hotels, destination),
    roomTypes: buildTermOptions(
      hotels,
      ROOM_TYPE_FILTERS,
      (hotel) => hotel.roomType,
      t,
      true,
    ),
    bedTypes: buildTermOptions(
      hotels,
      BED_TYPE_FILTERS,
      (hotel) => hotel.roomType,
      t,
    ),
  };
}


function cleanHotelNeighbourhood(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function getHotelNeighbourhoodFilterValue(value: string | undefined) {
  return cleanHotelNeighbourhood(value).toLocaleLowerCase();
}

function formatNeighbourhoodFilterLabel(
  neighbourhood: string,
  destination: string,
) {
  const cleanNeighbourhood = cleanHotelNeighbourhood(neighbourhood);
  const cleanDestination = destination.trim().replace(/\s+/g, " ");

  if (!cleanDestination) return cleanNeighbourhood;

  const primaryCity = cleanDestination.split(",")[0]?.trim();
  const neighbourhoodSegments = cleanNeighbourhood
    .split(",")
    .map((segment) => segment.trim().toLocaleLowerCase());

  if (
    primaryCity &&
    neighbourhoodSegments.includes(primaryCity.toLocaleLowerCase())
  ) {
    return cleanNeighbourhood;
  }

  return `${cleanNeighbourhood}, ${cleanDestination}`;
}

function buildHotelNeighbourhoodFilterOptions(
  hotels: PublicHotelResult[],
  destination: string,
): FilterOption[] {
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
      label: formatNeighbourhoodFilterLabel(
        cleanHotelNeighbourhood(hotel.neighbourhood),
        destination,
      ),
      count: 1,
    });
  });

  return Array.from(optionsByNeighbourhood.values()).sort(
    (first, second) =>
      second.count - first.count || first.label.localeCompare(second.label),
  );
}

function buildTermOptions(
  hotels: PublicHotelResult[],
  filters: TermFilter[],
  textForHotel: (hotel: PublicHotelResult) => string,
  t: (key: string) => string,
  includeUniversal = false,
) {
  return filters
    .map((filter) => ({
      value: filter.value,
      label: t(filter.labelKey),
      count: hotels.filter((hotel) =>
        textIncludesTerms(textForHotel(hotel), filter.terms),
      ).length,
    }))
    .filter(
      (option) =>
        option.count > 0 && (includeUniversal || option.count < hotels.length),
    )
    .sort(
      (first, second) =>
        second.count - first.count || first.label.localeCompare(second.label),
    );
}

function hotelMatchesNeighbourhoodFilters(
  hotel: PublicHotelResult,
  selectedValues: string[],
) {
  if (!selectedValues.length) return true;

  const neighbourhoodValue = getHotelNeighbourhoodFilterValue(
    hotel.neighbourhood,
  );

  return (
    neighbourhoodValue.length > 0 &&
    selectedValues.includes(neighbourhoodValue)
  );
}

function hotelMatchesFilters(
  hotel: PublicHotelResult,
  maxPrice: number,
  selectedStarRating: HotelStarRatingSelection,
  selectedFilters: HotelFilterSelections,
  rates?: ExchangeRates,
) {
  return (
    getHotelComparableTotalUsd(hotel, rates) <= maxPrice &&
    hotelMatchesStarRating(hotel.rating, selectedStarRating) &&
    matchesTermGroup(
      hotel,
      selectedFilters.propertyTypes,
      PROPERTY_TYPE_FILTERS,
      (item) => [item.name, item.roomType].join(" "),
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.meals,
      MEAL_FILTERS,
      getSearchableHotelText,
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.cancellationPolicies,
      CANCELLATION_FILTERS,
      (item) => [item.cancellationInfo, ...item.amenities].join(" "),
    ) &&
    hotelMatchesFacilityFilters(hotel, selectedFilters.facilities) &&
    hotelMatchesNeighbourhoodFilters(hotel, selectedFilters.locations) &&
    matchesTermGroup(
      hotel,
      selectedFilters.roomTypes,
      ROOM_TYPE_FILTERS,
      (item) => item.roomType,
    ) &&
    matchesTermGroup(
      hotel,
      selectedFilters.bedTypes,
      BED_TYPE_FILTERS,
      (item) => item.roomType,
    )
  );
}

function matchesTermGroup(
  hotel: PublicHotelResult,
  selectedValues: string[],
  filters: TermFilter[],
  textForHotel: (hotel: PublicHotelResult) => string,
) {
  if (!selectedValues.length) return true;

  return selectedValues.some((value) => {
    const filter = filters.find((item) => item.value === value);
    return filter
      ? textIncludesTerms(textForHotel(hotel), filter.terms)
      : false;
  });
}

function getSearchableHotelText(hotel: PublicHotelResult) {
  return [
    hotel.name,
    hotel.location,
    hotel.roomType,
    hotel.cancellationInfo,
    ...hotel.amenities,
  ].join(" ");
}

function textIncludesTerms(text: string, terms: string[]) {
  const normalizedText = text.toLowerCase();
  return terms.some((term) => normalizedText.includes(term));
}

function nextDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
