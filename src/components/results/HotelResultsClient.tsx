"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  Check,
  ChevronDown,
  MapPin,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from "lucide-react";

import type { PublicHotelResult } from "@/lib/types";
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { Button } from "@/components/ui/Button";
import { HotelCardSkeleton } from "@/components/ui/Skeleton";
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
import type { ExchangeRates } from "@/lib/currency/exchangeRates";
import {
  compareHotelsByAvailablePrice,
  getComparableHotelTotalUsd,
  hasHotelPrice,
} from "@/lib/hotels/hotelResultAvailability";
import { getHotelComparableReviewScore } from "@/lib/hotels/hotelRatingSemantics";
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
import { calculateCompactFilterMaxHeight } from "@/lib/hotels/desktopCompactFilter";
import { shouldShowDesktopStickySearch } from "@/lib/search/desktopStickySearch";

const hotelResultStackClass = "w-full max-w-[800px]";
const desktopCompactFilterTopOffset = 116;
const desktopCompactFilterBottomGap = 16;

type DesktopCompactFilterFrame = {
  left: number;
  width: number;
};

type DesktopCompactFilterPlacementState = "hidden" | "fixed" | "docked";
type DesktopStickyHotelSearchSection =
  | "destination"
  | "dates"
  | "guests"
  | null;

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

const getResultMaxPrice = (
  hotels: PublicHotelResult[],
  rates?: ExchangeRates,
) => {
  const pricedTotals = hotels
    .map((hotel) => getComparableHotelTotalUsd(hotel, rates))
    .filter(
      (total): total is number =>
        total !== null && Number.isFinite(total) && total > 0,
    );
  const highestTotal = pricedTotals.length ? Math.max(...pricedTotals) : 300;

  return Math.max(300, Math.ceil(highestTotal / 100) * 100);
};

type HotelSummarySortMode = "cheapest" | "bestValue" | "topRated";

type HotelMobileSearchDraft = {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
};

export type HotelResultsSearchInput = HotelMobileSearchDraft & {
  sort?: string;
};

export function HotelResultsClient() {
  const params = useSearchParams();
  const searchInput = useMemo<HotelResultsSearchInput>(
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

  return <HotelResultsExperience searchInput={searchInput} />;
}

export function HotelResultsExperience({
  searchInput,
  guided = false,
  buildDetailsHref,
}: {
  searchInput: HotelResultsSearchInput;
  guided?: boolean;
  buildDetailsHref?: (hotelId: string) => string | null;
}) {
  const { locale, t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const t = useCallback(
    (key: string) => dictionary[key] ?? enTranslations[key] ?? "",
    [dictionary],
  );

  const [results, setResults] = useState<PublicHotelResult[]>([]);
  const [visibleFiltered, setVisibleFiltered] = useState<PublicHotelResult[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
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
  const [desktopStickyHotelSearchOpen, setDesktopStickyHotelSearchOpen] =
    useState(false);
  const [
    activeDesktopStickyHotelSearchSection,
    setActiveDesktopStickyHotelSearchSection,
  ] = useState<DesktopStickyHotelSearchSection>(null);
  const [
    submitDesktopStickyHotelSearchOnOpen,
    setSubmitDesktopStickyHotelSearchOnOpen,
  ] = useState(false);

  const desktopSearchFrameRef = useRef<HTMLDivElement | null>(null);
  const desktopSearchFormRef = useRef<HTMLFormElement | null>(null);
  const stickyHotelLauncherRef = useRef<HTMLButtonElement | null>(null);
  const stickyHotelDialogRef = useRef<HTMLDivElement | null>(null);
  const stickyHotelCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const stickyHotelScrollLockRef = useRef<{ restore: () => void } | null>(null);
  const desktopSearchVisibilityRef = useRef(false);
  const setDesktopSearchFormRef = useCallback(
    (node: HTMLFormElement | null) => {
      desktopSearchFormRef.current = node;
    },
    [],
  );
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
  const guidedLoadingStatusRef = useRef<HTMLHeadingElement | null>(null);
  const guidedResultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const guidedErrorRef = useRef<HTMLDivElement | null>(null);
  const retryFocusPendingRef = useRef(false);

  useEffect(() => {
    currencyRatesRef.current = currencyRates.rates;
  }, [currencyRates.rates]);

  const body = useMemo(
    () => ({ ...searchInput, sort: searchInput.sort || "cheapest" }),
    [searchInput],
  );
  const hotelDetailsSearchParams = useMemo(() => {
    return new URLSearchParams({
      destination: body.destination,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guests: String(body.guests),
      rooms: String(body.rooms),
    }).toString();
  }, [body.checkIn, body.checkOut, body.destination, body.guests, body.rooms]);
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
    const checkIn = formatCompactHotelDate(
      activeDesktopHotelSearchDraft.checkIn,
    );
    const checkOut = formatCompactHotelDate(
      activeDesktopHotelSearchDraft.checkOut,
    );

    if (checkIn && checkOut) return `${checkIn} – ${checkOut}`;
    return checkIn || checkOut || "Travel dates";
  }, [
    activeDesktopHotelSearchDraft.checkIn,
    activeDesktopHotelSearchDraft.checkOut,
    formatCompactHotelDate,
  ]);

  const desktopMinimizedGuestsSummary = useMemo(() => {
    const guests = Math.max(
      1,
      Math.min(12, activeDesktopHotelSearchDraft.guests),
    );
    const rooms = Math.max(1, Math.min(6, activeDesktopHotelSearchDraft.rooms));
    const guestLabel =
      guests === 1
        ? t("guestSingular") || "guest"
        : t("guestPlural") || "guests";
    const roomLabel =
      rooms === 1 ? t("roomSingular") || "room" : t("roomPlural") || "rooms";

    return `${guests} ${guestLabel}, ${rooms} ${roomLabel}`;
  }, [
    activeDesktopHotelSearchDraft.guests,
    activeDesktopHotelSearchDraft.rooms,
    t,
  ]);

  const openDesktopStickyHotelSearch = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      section: DesktopStickyHotelSearchSection,
      submitOnOpen = false,
    ) => {
      stickyHotelLauncherRef.current = event.currentTarget;
      setHotelSortMenuOpen(false);
      setFiltersOpen(false);
      setActiveDesktopStickyHotelSearchSection(section);
      setSubmitDesktopStickyHotelSearchOnOpen(submitOnOpen);
      setDesktopStickyHotelSearchOpen(true);
    },
    [],
  );

  const closeDesktopStickyHotelSearch = useCallback(() => {
    setDesktopStickyHotelSearchOpen(false);
    setActiveDesktopStickyHotelSearchSection(null);
    setSubmitDesktopStickyHotelSearchOnOpen(false);

    window.requestAnimationFrame(() => {
      stickyHotelLauncherRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const releaseLock = () => {
      stickyHotelScrollLockRef.current?.restore();
      stickyHotelScrollLockRef.current = null;
    };

    if (!desktopStickyHotelSearchOpen || typeof window === "undefined") {
      releaseLock();
      return releaseLock;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    if (!desktopQuery.matches) {
      const closeId = window.setTimeout(closeDesktopStickyHotelSearch, 0);
      return () => {
        window.clearTimeout(closeId);
        releaseLock();
      };
    }

    stickyHotelScrollLockRef.current = lockBodyScroll();
    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) closeDesktopStickyHotelSearch();
    };
    desktopQuery.addEventListener("change", handleViewportChange);

    return () => {
      desktopQuery.removeEventListener("change", handleViewportChange);
      releaseLock();
    };
  }, [closeDesktopStickyHotelSearch, desktopStickyHotelSearchOpen]);

  useEffect(() => {
    if (!desktopStickyHotelSearchOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDesktopStickyHotelSearch();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable =
        stickyHotelDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeDesktopStickyHotelSearch, desktopStickyHotelSearchOpen]);

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
    const controller = new AbortController();

    fetch("/api/hotels/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();

        if (data.warningCategory === "provider_unavailable") {
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
        if (!active || controller.signal.aborted) return;

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
      controller.abort();
    };
  }, [body, retryKey, t]);

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

    const finalTarget = error
      ? guidedErrorRef.current
      : guidedResultsHeadingRef.current;
    if (!finalTarget) return;

    finalTarget.focus({ preventScroll: true });
    retryFocusPendingRef.current = false;
  }, [error, guided, loading, results]);

  const searchedDestination = body.destination.trim();
  const filterOptions = useMemo(
    () => buildHotelFilterOptions(results, t, searchedDestination),
    [results, searchedDestination, t],
  );

  const pricedResultCount = useMemo(
    () => results.filter(hasHotelPrice).length,
    [results],
  );
  const hasPricedResults = pricedResultCount > 0;
  const hasGoogleMapsResults = results.some(
    (hotel) => hotel.provider === "Google Maps",
  );
  const resultMaxPrice = useMemo(
    () => getResultMaxPrice(results, currencyRates.rates),
    [currencyRates.rates, results],
  );
  const priceFilterActive = hasPricedResults && maxPrice < resultMaxPrice;

  const filtered = useMemo(
    () =>
      results.filter((hotel) =>
        hotelMatchesFilters(
          hotel,
          maxPrice,
          priceFilterActive,
          selectedStarRating,
          selectedFilters,
          currencyRates.rates,
        ),
      ),
    [
      currencyRates.rates,
      maxPrice,
      priceFilterActive,
      results,
      selectedFilters,
      selectedStarRating,
    ],
  );
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
        priceFilterActive,
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
      priceFilterActive,
      selectedFilters,
      t,
      filterOptions.facilities,
      filterOptions.locations,
    ],
  );

  const resultsApplying = filterApplying || searchApplying;

  const activeFilterCount = useMemo(() => {
    let count = priceFilterActive ? 1 : 0;
    count += selectedStarRating === ALL_HOTEL_STAR_RATINGS ? 0 : 1;
    count += Object.values(selectedFilters).reduce(
      (total, group) => total + group.length,
      0,
    );
    return count;
  }, [priceFilterActive, selectedFilters, selectedStarRating]);
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
  const [desktopCompactFilterMaxHeight, setDesktopCompactFilterMaxHeight] =
    useState(0);
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

  const visibleFilteredHotels = resultsApplying ? visibleFiltered : filtered;
  const sortedVisibleHotels = useMemo(
    () =>
      sortHotelSummaryResults(
        visibleFilteredHotels,
        hotelSummarySortMode,
        currencyRates.rates,
      ),
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
  const currentSortLabel =
    hotelSortOptions.find((option) => option.value === hotelSummarySortMode)
      ?.label ??
    hotelSortOptions[0]?.label ??
    "";
  const formattedDisplayedHotelCount = formatHotelCount(
    visibleFilteredHotels.length,
    locale,
  );
  const resultsHeading = t(
    visibleFilteredHotels.length === 1 ? "resultFound" : "resultsFound",
  ).replace("{{count}}", formattedDisplayedHotelCount);
  const showFilteredEmptyState =
    !loading &&
    !error &&
    !filterApplying &&
    results.length > 0 &&
    filtered.length === 0;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let animationFrame = 0;
    const searchForm = desktopSearchFormRef.current;

    const updateDesktopSearchState = () => {
      animationFrame = 0;
      const formBottom =
        desktopSearchFormRef.current?.getBoundingClientRect().bottom;
      const shouldShow = shouldShowDesktopStickySearch({
        viewportWidth: window.innerWidth,
        formBottom,
      });

      if (shouldShow === desktopSearchVisibilityRef.current) return;

      desktopSearchVisibilityRef.current = shouldShow;
      setShowDesktopMinimizedSearch(shouldShow);
      scheduleDesktopCompactFilterMeasurementRef.current?.();
    };

    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateDesktopSearchState);
    };

    scheduleUpdate();
    const observer =
      typeof IntersectionObserver === "undefined" || !searchForm
        ? null
        : new IntersectionObserver(scheduleUpdate, { threshold: 0 });

    if (observer && searchForm) {
      observer.observe(searchForm);
    }
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      observer?.disconnect();
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
      const maxHeight = calculateCompactFilterMaxHeight({
        viewportHeight: window.innerHeight,
        topOffset: desktopCompactFilterTopOffset,
        bottomGap: desktopCompactFilterBottomGap,
      });
      setDesktopCompactFilterMaxHeight((current) =>
        current === maxHeight ? current : maxHeight,
      );
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

  function renderDesktopMinimizedHotelSearchBar() {
    const compactSectionClass =
      "focus-ring flex h-[56px] min-w-0 items-center gap-2.5 border-r border-slate-200/85 px-3 text-start transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50/90";
    const compactValueClass =
      "min-w-0 truncate whitespace-nowrap text-[0.86rem] font-medium leading-5 text-slate-800";
    const destination =
      activeDesktopHotelSearchDraft.destination || body.destination;

    return (
      <div className="page-shell">
        <div className="pointer-events-auto mx-auto grid h-[58px] w-full max-w-[820px] grid-cols-[minmax(220px,1.5fr)_minmax(150px,0.9fr)_minmax(160px,1fr)_92px] items-center overflow-hidden rounded-lg border border-slate-200/95 bg-white shadow-[0_12px_28px_-22px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/[0.025]">
          <button
            type="button"
            aria-expanded={desktopStickyHotelSearchOpen}
            aria-controls="sticky-hotel-search-dialog"
            aria-label={`${t("editHotelSearch")}: ${destination}`}
            onClick={(event) =>
              openDesktopStickyHotelSearch(event, "destination")
            }
            className={compactSectionClass}
          >
            <MapPin
              className="h-4 w-4 shrink-0 text-[#004BB8]"
              aria-hidden="true"
            />
            <span className={compactValueClass}>{destination}</span>
          </button>

          <button
            type="button"
            aria-expanded={desktopStickyHotelSearchOpen}
            aria-controls="sticky-hotel-search-dialog"
            aria-label={`${t("travelDates")}: ${desktopMinimizedDateSummary}`}
            onClick={(event) => openDesktopStickyHotelSearch(event, "dates")}
            className={compactSectionClass}
          >
            <Calendar
              className="h-4 w-4 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <span className={compactValueClass}>
              {desktopMinimizedDateSummary}
            </span>
          </button>

          <button
            type="button"
            aria-expanded={desktopStickyHotelSearchOpen}
            aria-controls="sticky-hotel-search-dialog"
            aria-label={`${t("guestsAndRooms")}: ${desktopMinimizedGuestsSummary}`}
            onClick={(event) => openDesktopStickyHotelSearch(event, "guests")}
            className={compactSectionClass}
          >
            <Users
              className="h-4 w-4 shrink-0 text-[#004BB8]"
              aria-hidden="true"
            />
            <span className={compactValueClass}>
              {desktopMinimizedGuestsSummary}
            </span>
          </button>

          <div className="flex h-[56px] items-center justify-center px-2">
            <button
              type="button"
              aria-label={t("editHotelSearch")}
              onClick={(event) =>
                openDesktopStickyHotelSearch(event, null, true)
              }
              className="h-10 w-[92px] whitespace-nowrap rounded-lg bg-[#004BB8] px-3 text-sm font-semibold text-white shadow-none ring-1 ring-[#004BB8]/10 transition-colors hover:bg-[#021C2B] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]"
            >
              {t("search")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderDesktopStickyHotelSearchDialog() {
    if (guided) return null;
    if (!desktopStickyHotelSearchOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[1100] hidden bg-slate-950/30 backdrop-blur-[2px] lg:block"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget)
            closeDesktopStickyHotelSearch();
        }}
      >
        <div className="flex min-h-dvh items-start justify-center px-6 pb-10 pt-24 xl:pt-28">
          <div
            id="sticky-hotel-search-dialog"
            ref={stickyHotelDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sticky-hotel-search-title"
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full max-w-4xl rounded-2xl border border-slate-200/90 bg-[#fbfaf7]/95 p-4 text-start shadow-[0_30px_90px_-32px_rgba(15,23,42,0.72)] ring-1 ring-white/80 backdrop-blur-md"
          >
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200/80 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#004BB8]">
                  {t("searchHotels")}
                </p>
                <h2
                  id="sticky-hotel-search-title"
                  className="mt-1 text-xl font-bold tracking-tight text-slate-950"
                >
                  {(activeDesktopHotelSearchDraft.destination || body.destination).trim() ||
                    t("destination")}
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {desktopMinimizedDateSummary} · {desktopMinimizedGuestsSummary}
                </p>
              </div>
              <button
                ref={stickyHotelCloseButtonRef}
                type="button"
                aria-label={t("closeSearchForm")}
                onClick={closeDesktopStickyHotelSearch}
                className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <HotelSearchBar
              key={`sticky-hotel-${bodySearchKey}-${activeDesktopStickyHotelSearchSection}-${submitDesktopStickyHotelSearchOnOpen}`}
              initialDestination={activeDesktopHotelSearchDraft.destination}
              initialCheckIn={activeDesktopHotelSearchDraft.checkIn}
              initialCheckOut={activeDesktopHotelSearchDraft.checkOut}
              initialGuests={activeDesktopHotelSearchDraft.guests}
              initialRooms={activeDesktopHotelSearchDraft.rooms}
              initialSort={body.sort}
              errorRole="alert"
              compact
              desktopPresentation="sticky-dialog"
              initialDesktopSection={activeDesktopStickyHotelSearchSection}
              submitOnDesktopOpen={submitDesktopStickyHotelSearchOnOpen}
              idPrefix="sticky-hotel-search"
              onDesktopDraftChange={updateDesktopHotelSearchDraft}
              onSubmitStart={triggerSearchApplying}
              onSubmitComplete={closeDesktopStickyHotelSearch}
            />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
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

  const ResultsRoot = guided ? "div" : "main";

  return (
    <ResultsRoot
      className={guided ? "mt-6 min-w-0" : "flex-1 overflow-x-clip bg-[#f6f8fb] pb-8"}
      {...(guided && !error ? { role: "region", "aria-labelledby": "deals-guided-hotel-results-heading" } : {})}
    >
      {!guided ? <div
        className={cn(
          "sticky top-0 z-50 border-b border-slate-200/70 bg-[#f6f8fb]/95 px-4 py-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.04)] backdrop-blur sm:hidden",
          mobileHotelSearchOpen && "hidden",
        )}
      >
        <HotelSearchBar
          key={`mobile-controls-${activeMobileHotelSearchKey}`}
          idPrefix="hotel-results-mobile-controls"
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
      </div> : null}

      {!guided && mobileHotelSearchOpen ? (
        <div className="fixed inset-0 z-[10000] min-h-[100dvh] overflow-hidden bg-slate-50 sm:hidden">
          <HotelSearchBar
            key={`mobile-drawer-${bodySearchKey}-${body.sort}`}
            idPrefix="hotel-results-mobile-drawer"
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

      {!guided ? <section className="hidden bg-white pb-0 pt-7 shadow-none sm:block">
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
                idPrefix="hotel-results-full-search"
                className="min-w-0"
                desktopFormRef={setDesktopSearchFormRef}
                onDesktopDraftChange={updateDesktopHotelSearchDraft}
                onSubmitStart={triggerSearchApplying}
              />
            </div>
          </div>
        </div>
      </section> : null}

      {!guided ? <div
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-[1000] hidden px-4 transition-all duration-200 lg:block",
          showDesktopMinimizedSearch && !desktopStickyHotelSearchOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-3 opacity-0",
        )}
        aria-hidden={
          !showDesktopMinimizedSearch || desktopStickyHotelSearchOpen
        }
        inert={
          !showDesktopMinimizedSearch || desktopStickyHotelSearchOpen
            ? true
            : undefined
        }
      >
        {renderDesktopMinimizedHotelSearchBar()}
      </div> : null}

      {renderDesktopStickyHotelSearchDialog()}

      {!guided ? <nav
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
      </nav> : null}

      <div
        ref={resultsGridRef}
        className={cn(guided ? "grid gap-y-5 pb-6 lg:grid-cols-[256px_minmax(0,1fr)] lg:gap-x-9" : "page-shell grid gap-y-5 pb-6 pt-5 sm:pt-6 lg:grid-cols-[256px_minmax(0,1fr)] lg:gap-x-9")}
      >
        <aside
          ref={desktopFilterSidebarRef}
          className="relative hidden self-stretch lg:block lg:w-[268px] lg:justify-self-end xl:w-[272px]"
        >
          <div>
            <HotelFilters
              layout="desktop"
              t={t}
              maxPrice={maxPrice}
              setMaxPrice={updateMaxPrice}
              resultMaxPrice={resultMaxPrice}
              hasPricedResults={hasPricedResults}
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
                  "z-30 overflow-hidden",
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
                        maxHeight: desktopCompactFilterMaxHeight,
                      }
                    : {
                        width: "100%",
                        maxHeight: desktopCompactFilterMaxHeight,
                      }
                }
              >
                <HotelFilters
                  layout="compact"
                  t={t}
                  maxPrice={maxPrice}
                  setMaxPrice={updateMaxPrice}
                  resultMaxPrice={resultMaxPrice}
                  hasPricedResults={hasPricedResults}
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
              ref={guided ? guidedErrorRef : undefined}
              tabIndex={guided ? -1 : undefined}
              className={cn(
                hotelResultStackClass,
                "rounded-md border border-danger/30 bg-red-50 p-4 text-danger",
              )}
            >
              <p role="alert">{error}</p>
              {guided ? (
                <Button className="mt-4 min-h-11" onClick={retryGuidedHotelSearch}>
                  {t("deals.guided.hotelResults.retry")}
                </Button>
              ) : null}
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
              <div className="space-y-3">
                <ActiveHotelFilterChips
                  chips={activeFilterChips}
                  onRemove={removeFilterChip}
                  onClearAll={resetFilters}
                  t={t}
                />

                {guided ? (
                  <Button type="button" variant="secondary" className="min-h-11 lg:hidden" onClick={() => setFiltersOpen(true)}>
                    {t("filters")}{activeFilterCount ? ` (${activeFilterCount})` : ""}
                  </Button>
                ) : null}

                <div
                  role="group"
                  aria-label={t("hotelResults.summaryAria")}
                  className="flex w-full flex-nowrap items-center justify-between gap-2 py-1"
                >
                  {guided ? (
                    <h2 ref={guidedResultsHeadingRef} id="deals-guided-hotel-results-heading" tabIndex={-1} className="whitespace-nowrap text-[16px] font-semibold leading-6 tracking-[-0.005em] text-[#142033]">{resultsHeading}</h2>
                  ) : (
                    <h1 className="whitespace-nowrap text-[16px] font-semibold leading-6 tracking-[-0.005em] text-[#142033]">{resultsHeading}</h1>
                  )}
                  <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1 whitespace-nowrap sm:gap-2">
                    <span className="whitespace-nowrap text-[clamp(0.68rem,3vw,0.875rem)] font-semibold text-slate-700 sm:text-base">
                      {`${t("sortBy") || "Sort by"}:`}
                    </span>

                    <div
                        ref={hotelSortWrapperRef}
                        className="relative inline-flex shrink-0 items-center whitespace-nowrap"
                        onBlur={(event) => {
                          if (
                          !event.currentTarget.contains(event.relatedTarget)
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
                          className="inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap bg-transparent py-1 text-[clamp(0.75rem,3.3vw,1rem)] font-bold text-slate-950 outline-none transition-colors hover:text-[#004BB8] focus-visible:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 focus-visible:ring-offset-2 sm:gap-2 sm:pl-1 sm:text-lg"
                          onClick={handleHotelSortTriggerClick}
                        >
                          <span>{currentSortLabel}</span>
                          <ChevronDown
                            aria-hidden="true"
                            className={cn(
                              "h-4 w-4 text-slate-700 transition-transform sm:h-[18px] sm:w-[18px]",
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
                                  hotelSortOptionRefs.current[index] = element;
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

                {hasGoogleMapsResults ? (
                  <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal leading-5 text-[#5E5E5E] shadow-sm">
                    Hotel discovery data provided by{" "}
                    <span
                      translate="no"
                      className="whitespace-nowrap not-italic font-normal text-sm text-[#5E5E5E]"
                    >
                      Google Maps
                    </span>
                  </p>
                ) : null}

                {filterApplying ? (
                  <div className="space-y-4">
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm"
                    >
                      {t("updatingResults")}
                    </div>
                    <HotelCardSkeleton />
                    <HotelCardSkeleton />
                  </div>
                ) : sortedVisibleHotels.length ? (
                  sortedVisibleHotels.map((hotel, index) => (
                    <HotelCard
                      key={hotel.id}
                      hotel={hotel}
                      detailsHref={guided ? buildDetailsHref?.(hotel.id) ?? null : `/hotels/details/${encodeURIComponent(hotel.id)}?${hotelDetailsSearchParams}`}
                      actionLabel={guided ? t("deals.guided.hotelResults.viewRooms") : undefined}
                      actionAriaLabel={guided ? t("deals.guided.hotelResults.viewRoomsFor").replace("{{hotelName}}", hotel.name) : undefined}
                      unavailableActionLabel={guided ? t("deals.guided.hotelResults.roomsUnavailable") : undefined}
                      unavailableActionAriaLabel={guided ? t("deals.guided.hotelResults.roomsUnavailableFor").replace("{{hotelName}}", hotel.name) : undefined}
                      allowExternalAttribution={!guided}
                      allowSave={!guided}
                      sortBadge={index === 0 ? hotelSummarySortMode : undefined}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm font-semibold text-muted shadow-sm">
                    <p>{guided && results.length === 0 ? t("deals.guided.hotelResults.empty") : t("hotelResults.noStaysMatchFiltersInline")}</p>
                    {guided && results.length === 0 ? (
                      <Button className="mt-4 min-h-11" onClick={retryGuidedHotelSearch}>
                        {t("deals.guided.hotelResults.retry")}
                      </Button>
                    ) : null}
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
            hasPricedResults={hasPricedResults}
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
    </ResultsRoot>
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
        compareHotelsByAvailablePrice(first.hotel, second.hotel, rates) ||
        first.index - second.index
      );
    }

    if (sortMode === "topRated") {
      const firstReview = getHotelComparableReviewScore(first.hotel);
      const secondReview = getHotelComparableReviewScore(second.hotel);
      return (
        compareNullableScoresDescending(firstReview, secondReview) ||
        getHotelSortableClassification(second.hotel) -
          getHotelSortableClassification(first.hotel) ||
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

function getHotelSortablePrice(
  hotel: PublicHotelResult,
  rates?: ExchangeRates,
) {
  const comparableTotalUsd = getComparableHotelTotalUsd(hotel, rates);
  return comparableTotalUsd ?? Number.POSITIVE_INFINITY;
}

function compareNullableScoresDescending(
  first: number | null,
  second: number | null,
) {
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
  hasPricedResults,
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
  hasPricedResults: boolean;
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
  const filterRangeClass = cn(
    layout === "desktop"
      ? "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#D7E5F8] accent-[#0067DB] disabled:cursor-not-allowed disabled:opacity-60"
      : "h-2 w-full cursor-pointer appearance-none rounded-full bg-border outline-none transition disabled:cursor-not-allowed disabled:opacity-60 [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[#2F73C8] [&::-webkit-slider-thumb]:mt-[-4px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[#2F73C8] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border [&::-moz-range-progress]:h-2 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-[#2F73C8] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[#2F73C8] [&::-moz-range-thumb]:shadow-md",
  );

  const [openCompactSection, setOpenCompactSection] =
    useState<CompactHotelFilterSectionId>(null);
  const getSelectedCount = (group: keyof HotelFilterSelections) =>
    selectedFilters[group].length;
  const compactSections = (
    [
    {
      id: "price",
      title: t("hotelResults.budgetPrice"),
      selectedCount: hasPricedResults && maxPrice < resultMaxPrice ? 1 : 0,
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
          layout="compact"
        />
      ),
    },
      {
        id: "locations",
        title: t("hotelResults.locationArea"),
        selectedCount: getSelectedCount("locations"),
        content: (
          <CheckboxFilterOptions layout="compact"
            options={options.locations}
            selected={selectedFilters.locations}
            onToggle={(value) => toggleFilter("locations", value)}
            t={t}
            locale={locale}
          />
        ),
      },
      {
        id: "propertyTypes",
        title: t("hotelResults.propertyType"),
        selectedCount: getSelectedCount("propertyTypes"),
        content: (
          <CheckboxFilterOptions
            layout="compact"
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
          />
        ),
      },
      {
        id: "roomTypes",
        title: t("hotelResults.roomType"),
        selectedCount: getSelectedCount("roomTypes"),
        content: (
          <CheckboxFilterOptions
            layout="compact"
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
          />
        ),
      },
      {
        id: "bedTypes",
        title: t("hotelResults.bedType"),
        selectedCount: getSelectedCount("bedTypes"),
        content: (
          <CheckboxFilterOptions
            layout="compact"
            options={options.bedTypes}
            selected={selectedFilters.bedTypes}
            onToggle={(value) => toggleFilter("bedTypes", value)}
            t={t}
            locale={locale}
          />
        ),
      },
      {
        id: "meals",
        title: t("hotelResults.meals"),
        selectedCount: getSelectedCount("meals"),
        content: (
          <CheckboxFilterOptions
            layout="compact"
            options={options.meals}
            selected={selectedFilters.meals}
            onToggle={(value) => toggleFilter("meals", value)}
            t={t}
            locale={locale}
          />
        ),
      },
      {
        id: "cancellationPolicies",
        title: t("hotelResults.cancellationPolicy"),
        selectedCount: getSelectedCount("cancellationPolicies"),
        content: (
          <CheckboxFilterOptions
            layout="compact"
            options={options.cancellationPolicies}
            selected={selectedFilters.cancellationPolicies}
            onToggle={(value) => toggleFilter("cancellationPolicies", value)}
            t={t}
            locale={locale}
          />
        ),
      },
      {
        id: "facilities",
        title: t("hotelResults.facilities"),
        selectedCount: getSelectedCount("facilities"),
        content: (
          <CheckboxFilterOptions
            layout="compact"
            options={options.facilities}
            selected={selectedFilters.facilities}
            onToggle={(value) => toggleFilter("facilities", value)}
            t={t}
            locale={locale}
          />
        ),
      },
  ] satisfies Array<{
    id: Exclude<CompactHotelFilterSectionId, null>;
    title: string;
    selectedCount: number;
    content: ReactNode;
    }>
  ).filter(
    (section) =>
      (section.id !== "price" || hasPricedResults) &&
      (section.id !== "meals" || options.meals.length > 0),
  );

  if (layout === "compact") {
    return (
      <div className="desktop-filter-sidebar flex max-h-full flex-col overflow-hidden rounded-2xl border border-[#D8E1EC] bg-[#EEF3F8] p-0 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.42)]">
        <div className="desktop-filter-sidebar__header shrink-0 border-b border-[#D8E1EC]/80 bg-[#EEF3F8] px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="desktop-filter-sidebar__title flex min-w-0 items-center gap-2 truncate text-[15px] font-semibold leading-5 tracking-[-0.01em] text-slate-950">
              <SlidersHorizontal
                className="desktop-filter-sidebar__icon shrink-0 text-[#004BB8]"
                size={15}
                strokeWidth={2.25}
                aria-hidden="true"
              />
              <span className="truncate">{t("hotelResults.filterBy")}</span>
            </h2>
          </div>
          {activeFilterCount > 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="desktop-filter-sidebar__count rounded-full bg-[#EAF2FB] px-2 py-0.5 text-[11px] font-semibold text-[#235A9F] ring-1 ring-[#004BB8]/8">
                {t("activeFilterCount").replace(
                  "{{count}}",
                  String(activeFilterCount),
                )}
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
        <div className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#EEF3F8] px-2 py-1">
          {compactSections.map((section) => (
            <CompactHotelFilterSection
              key={section.id}
              sectionId={section.id}
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
        layout === "mobile"
          ? "bg-white"
          : "rounded-[10px] border border-[#D8E1EC] bg-[#F5F8FC] px-4 py-4 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.5)] xl:px-5",
      )}
    >
      {layout === "desktop" ? (
        <div className="mb-4 border-b border-[#C7D5E6]/80 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                aria-hidden="true"
                className="h-4 w-4 text-[#004BB8]"
                strokeWidth={2.2}
              />
              <h2 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-slate-950">
                {t("hotelResults.filterBy")}
              </h2>
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                className="rounded-md px-1.5 py-1 text-xs font-semibold text-[#004BB8] transition hover:bg-[#EAF2FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
                onClick={onClear}
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          layout === "mobile"
            ? "space-y-0 bg-white"
            : "space-y-5 bg-transparent",
        )}
      >
        {hasPricedResults ? (
        <FilterSection title={t("hotelResults.budgetPrice")} layout={layout}>
          <label className="block">
            <span
        className={cn(
          "mb-1.5 flex items-center justify-between",
          layout === "desktop"
            ? "text-[12px] font-semibold text-slate-950"
            : "text-[11px] font-medium text-muted",
        )}
      >
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
        ) : null}

        <FilterSection title={t("hotelResults.starRating")} layout={layout}>
          <StarRatingFilterControl
            selectedRating={selectedRating}
            onChange={setSelectedRating}
            counts={starRatingCounts}
            locale={locale}
            t={t}
            layout={layout}
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
  layout = "desktop",
}: {
  selectedRating: HotelStarRatingSelection;
  onChange: (rating: HotelStarRatingSelection) => void;
  counts: Record<HotelStarRatingSelection, number>;
  locale: string;
  t: (key: string) => string;
  layout?: "desktop" | "compact" | "mobile";
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
            className={cn(
              "group flex min-h-9 cursor-pointer justify-between gap-3 rounded-md text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950",
              layout === "desktop"
                ? "items-start px-0.5 py-1 text-[12px] font-medium leading-5"
                : "items-center px-1.5 py-1.5 text-sm",
            )}
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
                  "flex shrink-0 items-center justify-center rounded-[2px] border transition-colors",
                  layout === "desktop" ? "mt-0.5 h-[14px] w-[14px]" : "h-4 w-4",
                  selected
                    ? "border-[#0067DB] bg-[#0067DB] text-white"
                    : "border-slate-300 bg-white group-hover:border-slate-400",
                  "peer-focus-visible:ring-2 peer-focus-visible:ring-[#004BB8]/30 peer-focus-visible:ring-offset-2",
                )}
              >
                {selected ? (
                  <Check
                    className={cn(
                      layout === "desktop" ? "h-2.5 w-2.5" : "h-3 w-3",
                    )}
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

            <span
              className={cn(
                "min-w-6 shrink-0 text-right font-medium tabular-nums text-slate-500",
                layout === "desktop" ? "text-[12px] leading-5" : "text-[11px]",
              )}
            >
              {formatHotelCount(counts[rating] ?? 0, locale)}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function CompactHotelFilterSection({
  sectionId,
  title,
  selectedCount,
  expanded,
  onToggle,
  children,
}: {
  sectionId: Exclude<CompactHotelFilterSectionId, null>;
  title: string;
  selectedCount: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = `compact-hotel-filter-${sectionId}-panel`;

  return (
    <section className="border-t border-[#D8E1EC]/75 first:border-t-0">
      <button
        type="button"
        className={cn(
          "group flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-start text-[13px] font-semibold leading-5 tracking-[-0.005em] text-slate-800 transition-colors duration-200 motion-reduce:transition-none hover:bg-[#E5ECF4] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30",
          expanded && "text-[#004BB8]",
        )}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="min-w-0 truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {selectedCount > 0 ? (
            <span className="min-w-5 rounded-full bg-[#E2EAF3] px-2 py-0.5 text-center text-[11px] font-semibold normal-case leading-4 tracking-normal text-[#235A9F] ring-1 ring-[#004BB8]/10 group-hover:bg-[#DCE8F6]">
              {selectedCount}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-slate-500 transition duration-200 motion-reduce:transition-none group-hover:text-[#004BB8]",
              expanded && "rotate-180 text-[#004BB8]",
            )}
            strokeWidth={2.3}
            aria-hidden="true"
          />
        </span>
      </button>
      <div
        id={panelId}
        hidden={!expanded}
        aria-hidden={!expanded}
        className="grid h-auto gap-0.5 overflow-visible bg-transparent px-2.5 pb-3 pt-0.5"
      >
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
  const optionRowClass = cn(
    "group flex min-h-9 min-w-0 cursor-pointer items-start justify-between gap-3 transition hover:bg-slate-50 hover:text-slate-950",
    layout === "desktop"
      ? "rounded-md px-0.5 py-1 text-[12px] font-medium leading-5 text-slate-700"
      : layout === "compact"
        ? "min-h-8 gap-2 rounded-lg px-1.5 py-1 text-[13px] font-medium text-slate-600"
        : "rounded-lg px-1.5 py-1.5 text-sm font-medium text-slate-600",
  );
  const controlClass = (checked: boolean) =>
    cn(
      "mt-0.5 flex shrink-0 items-center justify-center rounded-[2px] border transition-colors",
      layout === "desktop"
        ? "h-[14px] w-[14px]"
        : layout === "compact"
          ? "h-3.5 w-3.5"
          : "h-4 w-4",
      checked
        ? "border-[#0067DB] bg-[#0067DB] text-white"
        : "border-slate-300 bg-white group-hover:border-slate-400",
      "peer-focus-visible:ring-2 peer-focus-visible:ring-[#004BB8]/30 peer-focus-visible:ring-offset-2",
    );
  const checkClass =
    layout === "desktop"
      ? "h-2.5 w-2.5"
      : layout === "compact"
        ? "h-2.5 w-2.5"
        : "h-3 w-3";
  const countClass = cn(
    "min-w-6 shrink-0 text-right font-medium tabular-nums text-slate-500",
    layout === "desktop"
      ? "text-[12px] leading-5"
      : layout === "compact"
        ? "text-[12px] leading-5"
        : "text-xs",
  );

  return (
    <>
      <div className="grid gap-0.5">
        {allOption ? (
          <label className={optionRowClass}>
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
                className={controlClass(allOptionChecked)}
              >
                {allOptionChecked ? (
                  <Check
                    className={checkClass}
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
            <span className={countClass}>
              {formatHotelCount(allOption.count, locale)}
            </span>
          </label>
        ) : null}
        {visibleOptions.map((option) => {
          const checked = selected.includes(option.value);

          return (
            <label key={option.value} className={optionRowClass}>
              <span className="flex min-w-0 flex-1 items-start gap-2">
                <input
                  className="peer sr-only"
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(option.value)}
                />
                <span aria-hidden="true" className={controlClass(checked)}>
                  {checked ? (
                    <Check
                      className={checkClass}
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
              <span className={countClass}>
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
        layout === "desktop"
          ? "border-t-0 py-0"
          : layout === "mobile"
            ? "py-4"
            : "py-4",
      )}
    >
      <h3
        className={cn(
          layout === "desktop"
            ? "mb-3 text-[12px] font-extrabold uppercase leading-4 tracking-[0.12em] text-slate-950"
            : "mb-2 text-sm font-extrabold uppercase leading-5 tracking-[0.14em] text-slate-950",
        )}
      >
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
        layout={layout}
      />
    </FilterSection>
  );
}

function buildActiveFilterChips(
  selectedFilters: HotelFilterSelections,
  maxPrice: number,
  resultMaxPrice: number,
  priceFilterActive: boolean,
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

  if (priceFilterActive) {
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
    neighbourhoodValue.length > 0 && selectedValues.includes(neighbourhoodValue)
  );
}

function hotelMatchesFilters(
  hotel: PublicHotelResult,
  maxPrice: number,
  priceFilterActive: boolean,
  selectedStarRating: HotelStarRatingSelection,
  selectedFilters: HotelFilterSelections,
  rates?: ExchangeRates,
) {
  return (
    (!priceFilterActive ||
      (getComparableHotelTotalUsd(hotel, rates) ?? Number.POSITIVE_INFINITY) <=
        maxPrice) &&
    hotelMatchesStarRating(hotel.classificationStars, selectedStarRating) &&
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
