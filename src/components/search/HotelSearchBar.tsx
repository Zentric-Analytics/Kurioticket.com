"use client";

import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BedDouble,
  Calendar,
  ChevronDown,
  MapPin,
  Minus,
  PencilLine,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

import { useRouteProgress } from "@/components/layout/RouteProgress";
import { useLocale } from "@/components/layout/LocaleProvider";
import { HotelDestinationMobilePicker } from "@/components/search/HotelDestinationMobilePicker";
import { MessageBanner } from "@/components/ui/MessageBanner";
import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import { MobileHotelGuestsRoomsPicker } from "@/components/search/MobileHotelGuestsRoomsPicker";
import { MobileDatePickerDialog } from "@/components/search/MobileDateRangePicker";
import { useRegion } from "@/components/region/RegionProvider";
import {
  getLocalizedHotelDestinationCityName,
  getLocalizedHotelDestinationDetail,
  normalizeHotelDestinationSearchValue,
} from "@/data/hotelDestinations";
import { translations as enTranslations } from "@/lib/i18n/en";
import { normalizeHotelCalendarLocale } from "@/lib/hotelsDateFormatting";
import {
  buildHotelRecentSearch,
  syncBackendRecentSearch,
  upsertRecentSearch,
} from "@/lib/recent-searches";
import { cn } from "@/lib/utils";

const parseIsoDate = (value: string) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const todayLocal = () => startOfLocalDay(new Date());

const isBeforeToday = (date: Date) =>
  startOfLocalDay(date).getTime() < todayLocal().getTime();

const addMonths = (date: Date, offset: number) =>
  new Date(date.getFullYear(), date.getMonth() + offset, 1);

const currentMonthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

type MonthCell = {
  date: Date;
  isCurrentMonth: boolean;
};

const buildMonthCells = (monthDate: Date): MonthCell[] => {
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

const formatWeekdays = (locale: string) => {
  if (locale === "th-TH-u-ca-gregory") {
    return ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
  }

  return Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2024, 0, 7 + day),
    ),
  );
};

const formatShortDate = (value: string, locale: string) => {
  if (!value) return "";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
};

const clampCount = (value: string, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
};

const normalizeGuestCount = (value: string | number | undefined) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.max(1, Math.min(12, parsed));
};

const formatHotelSearchTemplate = (
  template: string,
  values: Record<string, string | number>,
) =>
  Object.entries(values).reduce(
    (formatted, [key, value]) =>
      formatted.replaceAll(`{{${key}}}`, String(value)),
    template,
  );

type HotelDestinationSuggestion = {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  region?: string;
  kind: "city" | "district" | "landmark" | "airport-area";
  searchValue: string;
};

type HotelDestinationsApiResponse = {
  suggestions?: HotelDestinationSuggestion[];
  source?: "curated-destinations";
};

type HotelSearchDraft = {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
};

const normalizeCountryHint = (value: string | null | undefined) => {
  const countryCode = value?.trim().toUpperCase() || "";
  if (countryCode === "EU") return countryCode;
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : "";
};

const destinationKindLabels: Record<
  HotelDestinationSuggestion["kind"],
  string
> = {
  city: "City",
  district: "Area",
  landmark: "Landmark",
  "airport-area": "Airport area",
};

const destinationKindTranslationKeys: Record<
  HotelDestinationSuggestion["kind"],
  string
> = {
  city: "hotelDestinationKind.city",
  district: "hotelDestinationKind.district",
  landmark: "hotelDestinationKind.landmark",
  "airport-area": "hotelDestinationKind.airport-area",
};

export type HotelSearchBarProps = {
  desktopPresentation?: "inline" | "sticky-dialog";
  initialDesktopSection?: "destination" | "dates" | "guests" | null;
  submitOnDesktopOpen?: boolean;
  idPrefix?: string;
  onSubmitComplete?: () => void;
  initialDestination?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string | number;
  initialRooms?: string | number;
  initialSort?: string | null;
  introLabel?: string;
  desktopIdentityLabel?: string;
  errorRole?: "alert" | "status";
  compact?: boolean;
  mobileLayout?: "default" | "controls" | "drawer";
  mobileLandingPresentation?: boolean;
  onOpenFilters?: () => void;
  onOpenMobileSearch?: () => void;
  onCloseMobileSearch?: () => void;
  onMobileDraftChange?: (draft: HotelSearchDraft) => void;
  onDesktopDraftChange?: (draft: HotelSearchDraft) => void;
  onSubmitStart?: () => void;
  className?: string;
  desktopFormRef?: (node: HTMLFormElement | null) => void;
};

export function HotelSearchBar({
  desktopPresentation = "inline",
  initialDesktopSection = null,
  submitOnDesktopOpen = false,
  idPrefix = "hotel-search",
  onSubmitComplete,
  initialDestination = "",
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = 1,
  initialRooms = "1",
  initialSort = null,
  introLabel,
  desktopIdentityLabel,
  errorRole,
  compact = false,
  mobileLayout = "default",
  mobileLandingPresentation = false,
  onOpenFilters,
  onOpenMobileSearch,
  onCloseMobileSearch,
  onMobileDraftChange,
  onDesktopDraftChange,
  onSubmitStart,
  className,
  desktopFormRef,
}: HotelSearchBarProps) {
  const { locale, t: dictionary } = useLocale();
  const { status: sessionStatus } = useSession();
  const t = useCallback(
    (key: string) => dictionary[key] ?? enTranslations[key] ?? "",
    [dictionary],
  );
  const getDestinationKindLabel = (kind: HotelDestinationSuggestion["kind"]) =>
    t(destinationKindTranslationKeys[kind]) || destinationKindLabels[kind];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearchParams = searchParams.toString();
  const currentUrl = `${pathname}${currentSearchParams ? `?${currentSearchParams}` : ""}`;
  const { start: startRouteProgress } = useRouteProgress();
  const {
    selectedOption,
    selectedCountryCode,
    detectedCountryCode,
    hasUserSelectedRegion,
  } = useRegion();
  const [destination, setDestination] = useState(initialDestination);
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [hotelAdultCount, setHotelAdultCount] = useState(() =>
    normalizeGuestCount(initialGuests),
  );
  const [hotelChildCount, setHotelChildCount] = useState(0);
  const [rooms, setRooms] = useState(String(initialRooms || "1"));
  const [hotelPetFriendly, setHotelPetFriendly] = useState(false);
  const [draftHotelAdults, setDraftHotelAdults] = useState(1);
  const [draftHotelChildren, setDraftHotelChildren] = useState(0);
  const [draftHotelRooms, setDraftHotelRooms] = useState(1);
  const [draftHotelPetFriendly, setDraftHotelPetFriendly] = useState(false);
  const [error, setError] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);
  const [guestsRoomsOpen, setGuestsRoomsOpen] = useState(false);
  useEffect(() => {
    if (!guestsRoomsOpen) return;
    setDraftHotelAdults(hotelAdultCount);
    setDraftHotelChildren(hotelChildCount);
    setDraftHotelRooms(clampCount(rooms, 1, 6));
    setDraftHotelPetFriendly(hotelPetFriendly);
  }, [guestsRoomsOpen]);
  const [internalMobileSearchOpen, setInternalMobileSearchOpen] =
    useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [destinationSuggestions, setDestinationSuggestions] = useState<
    HotelDestinationSuggestion[]
  >([]);
  const [
    destinationSuggestionsCountryHint,
    setDestinationSuggestionsCountryHint,
  ] = useState("");
  const [destinationSuggestionsOpen, setDestinationSuggestionsOpen] =
    useState(false);
  const [destinationSuggestionsLoading, setDestinationSuggestionsLoading] =
    useState(false);
  const [destinationMobilePickerOpen, setDestinationMobilePickerOpen] =
    useState(false);
  const [destinationHighlight, setDestinationHighlight] = useState(0);
  const destinationInputRef = useRef<HTMLInputElement>(null);
  const destinationMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const datesMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const guestsRoomsMobileLauncherRef = useRef<HTMLButtonElement>(null);
  const destinationWrapperRef = useRef<HTMLLabelElement>(null);
  const datesWrapperRef = useRef<HTMLDivElement>(null);
  const guestsRoomsWrapperRef = useRef<HTMLDivElement>(null);
  const mobileSearchPanelRef = useRef<HTMLFormElement>(null);
  const setSearchPanelRef = useCallback(
    (node: HTMLFormElement | null) => {
      mobileSearchPanelRef.current = node;
      desktopFormRef?.(node);
    },
    [desktopFormRef],
  );
  const mobileSearchContentRef = useRef<HTMLDivElement>(null);
  const mobileSearchScrollLockRef = useRef<{ restore: () => void } | null>(
    null,
  );
  const submittingResetTimeoutRef = useRef<number | null>(null);
  const initialDesktopActionConsumedRef = useRef(false);
  const mobileSearchOpen =
    mobileLayout === "drawer" ||
    (mobileLayout === "default" && internalMobileSearchOpen);
  const isPageLevelMobileDrawer = compact && mobileLayout === "drawer";

  const [hotelVisibleMonthDate, setHotelVisibleMonthDate] = useState(() => {
    const parsedCheckIn = parseIsoDate(initialCheckIn);
    if (parsedCheckIn) {
      return new Date(parsedCheckIn.getFullYear(), parsedCheckIn.getMonth(), 1);
    }

    return currentMonthStart();
  });

  const calendarLocale = useMemo(
    () => normalizeHotelCalendarLocale(locale),
    [locale],
  );
  const weekdays = useMemo(
    () => formatWeekdays(calendarLocale),
    [calendarLocale],
  );

  const dateSummary = useMemo(() => {
    const formattedCheckIn = formatShortDate(checkIn, calendarLocale);
    const formattedCheckOut = formatShortDate(checkOut, calendarLocale);

    if (!formattedCheckIn) {
      return t("hotelSearchDatePlaceholder");
    }

    if (formattedCheckOut) {
      return formatHotelSearchTemplate(t("hotelSearch.dateRange"), {
        checkIn: formattedCheckIn,
        checkOut: formattedCheckOut,
      });
    }

    return formattedCheckIn;
  }, [calendarLocale, checkIn, checkOut, t]);

  const totalHotelGuests = hotelAdultCount + hotelChildCount;

  const guestsRoomsSummary = useMemo(() => {
    const normalizedGuests = Math.max(1, Math.min(12, totalHotelGuests));
    const normalizedRooms = clampCount(rooms, 1, 6);

    const guestLabel = t(
      normalizedGuests === 1 ? "guestSingular" : "guestPlural",
    );
    const roomLabel = t(normalizedRooms === 1 ? "roomSingular" : "roomPlural");

    return formatHotelSearchTemplate(t("hotelSearch.guestsRoomsSummary"), {
      guests: normalizedGuests,
      guestLabel,
      rooms: normalizedRooms,
      roomLabel,
    });
  }, [rooms, t, totalHotelGuests]);

  const hotelSearchIntroLabel = introLabel ?? t("hotelSearchIntroLabel");
  const hotelSearchIdentityLabel = desktopIdentityLabel ?? t("hotels");

  const mobileSearchSummary = useMemo(() => {
    const trimmedDestination = destination.trim() || t("destination");
    return formatHotelSearchTemplate(t("hotelSearch.mobileSummary"), {
      destination: trimmedDestination,
      dates: dateSummary,
      summary: guestsRoomsSummary,
    });
  }, [dateSummary, destination, guestsRoomsSummary, t]);

  const resultsSearchSummary = useMemo(
    () =>
      formatHotelSearchTemplate(t("hotelSearch.resultsSummary"), {
        dates: dateSummary,
        summary: guestsRoomsSummary,
      }),
    [dateSummary, guestsRoomsSummary, t],
  );

  const checkInParsed = parseIsoDate(checkIn);
  const checkOutParsed = parseIsoDate(checkOut);
  const normalizedRooms = String(clampCount(rooms, 1, 6));
  const selectedCountryHint = hasUserSelectedRegion
    ? normalizeCountryHint(selectedCountryCode ?? selectedOption.code)
    : "";
  const detectedCountryHint = selectedCountryHint
    ? ""
    : normalizeCountryHint(detectedCountryCode);
  const activeCountryHint = selectedCountryHint || detectedCountryHint;
  const destinationQuery = destination.trim();
  const visibleDestinationSuggestions =
    destinationSuggestionsCountryHint === activeCountryHint
      ? destinationSuggestions
      : [];
  const shouldShowDestinationSuggestions =
    destinationSuggestionsOpen &&
    (destinationSuggestionsLoading ||
      visibleDestinationSuggestions.length > 0 ||
      destinationQuery.length >= 1);

  const hasActiveHotelSearch =
    destination.trim() !== "" ||
    checkIn !== "" ||
    checkOut !== "" ||
    hotelAdultCount !== 1 ||
    hotelChildCount !== 0 ||
    normalizedRooms !== "1" ||
    hotelPetFriendly ||
    error !== "";

  useEffect(() => {
    if (
      desktopPresentation !== "sticky-dialog" ||
      initialDesktopActionConsumedRef.current
    ) {
      return;
    }

    initialDesktopActionConsumedRef.current = true;
    window.requestAnimationFrame(() => {
      if (submitOnDesktopOpen) {
        mobileSearchPanelRef.current?.requestSubmit();
        return;
      }

      if (initialDesktopSection === "destination") {
        destinationInputRef.current?.focus({ preventScroll: true });
        setDestinationSuggestionsOpen(true);
      } else if (initialDesktopSection === "dates") {
        setDatesOpen(true);
        datesMobileLauncherRef.current?.focus({ preventScroll: true });
      } else if (initialDesktopSection === "guests") {
        setGuestsRoomsOpen(true);
        guestsRoomsMobileLauncherRef.current?.focus({ preventScroll: true });
      }
    });
  }, [desktopPresentation, initialDesktopSection, submitOnDesktopOpen]);

  useEffect(() => {
    if (!compact || mobileLayout === "default") return;

    onMobileDraftChange?.({
      destination,
      checkIn,
      checkOut,
      guests: Math.max(1, Math.min(12, totalHotelGuests)),
      rooms: clampCount(rooms, 1, 6),
    });
  }, [
    checkIn,
    checkOut,
    compact,
    destination,
    mobileLayout,
    onMobileDraftChange,
    rooms,
    totalHotelGuests,
  ]);

  useEffect(() => {
    if (!compact || mobileLayout !== "default" || !onDesktopDraftChange) {
      return;
    }

    onDesktopDraftChange({
      destination,
      checkIn,
      checkOut,
      guests: Math.max(1, Math.min(12, totalHotelGuests)),
      rooms: clampCount(rooms, 1, 6),
    });
  }, [
    checkIn,
    checkOut,
    compact,
    destination,
    mobileLayout,
    onDesktopDraftChange,
    rooms,
    totalHotelGuests,
  ]);

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setIsSubmitting(false);

      if (submittingResetTimeoutRef.current !== null) {
        window.clearTimeout(submittingResetTimeoutRef.current);
        submittingResetTimeoutRef.current = null;
      }
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [currentUrl]);

  useEffect(() => {
    return () => {
      if (submittingResetTimeoutRef.current !== null) {
        window.clearTimeout(submittingResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) return;

      if (target instanceof Element) {
        const mobilePickerShell = target.closest(
          "[data-flight-mobile-picker-shell]",
        );

        if (mobilePickerShell) return;
      }

      if (!destinationWrapperRef.current?.contains(target)) {
        setDestinationSuggestionsOpen(false);
      }

      if (datesOpen && !datesWrapperRef.current?.contains(target)) {
        setDatesOpen(false);
      }

      if (guestsRoomsOpen && !guestsRoomsWrapperRef.current?.contains(target)) {
        setGuestsRoomsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (destinationSuggestionsOpen) {
        event.stopImmediatePropagation();
        setDestinationSuggestionsOpen(false);
      } else if (datesOpen) {
        event.stopImmediatePropagation();
        setDatesOpen(false);
      } else if (guestsRoomsOpen) {
        event.stopImmediatePropagation();
        setGuestsRoomsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [datesOpen, destinationSuggestionsOpen, guestsRoomsOpen]);

  useEffect(() => {
    const releaseExistingLock = () => {
      mobileSearchScrollLockRef.current?.restore();
      mobileSearchScrollLockRef.current = null;
    };

    if (
      mobileLayout !== "default" ||
      !mobileSearchOpen ||
      typeof window === "undefined"
    ) {
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

    return releaseExistingLock;
  }, [mobileLayout, mobileSearchOpen]);

  useEffect(() => {
    if (!destinationSuggestionsOpen) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      async () => {
        setDestinationSuggestionsLoading(true);

        try {
          const params = new URLSearchParams({
            limit: "8",
          });

          if (destinationQuery.length >= 1) {
            params.set("q", destinationQuery);
          }

          if (selectedCountryHint) {
            params.set("countryCode", selectedCountryHint);
          }

          if (detectedCountryHint) {
            params.set("detectedCountryCode", detectedCountryHint);
          }

          if (typeof navigator !== "undefined" && navigator.language) {
            params.set("locale", navigator.language);
          }

          const response = await fetch(
            `/api/hotels/destinations?${params.toString()}`,
            {
              signal: controller.signal,
              cache: "no-store",
            },
          );

          if (!response.ok) {
            throw new Error("Failed to load hotel destination suggestions");
          }

          const payload =
            (await response.json()) as HotelDestinationsApiResponse;
          const suggestions = Array.isArray(payload.suggestions)
            ? payload.suggestions
                .filter((suggestion) =>
                  Boolean(
                    suggestion?.id &&
                    suggestion?.name &&
                    suggestion?.country &&
                    suggestion?.searchValue,
                  ),
                )
                .slice(0, 8)
            : [];

          setDestinationSuggestions(suggestions);
          setDestinationSuggestionsCountryHint(activeCountryHint);
          setDestinationHighlight(0);
        } catch {
          if (!controller.signal.aborted) {
            setDestinationSuggestions([]);
            setDestinationSuggestionsCountryHint(activeCountryHint);
          }
        } finally {
          if (!controller.signal.aborted) {
            setDestinationSuggestionsLoading(false);
          }
        }
      },
      destinationQuery.length >= 1 ? 180 : 0,
    );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    activeCountryHint,
    destinationQuery,
    destinationSuggestionsOpen,
    selectedCountryHint,
    detectedCountryHint,
  ]);

  const selectDestinationSuggestion = (
    suggestion: HotelDestinationSuggestion,
  ) => {
    setDestination(suggestion.searchValue);
    setDestinationSuggestionsOpen(false);
    setDestinationHighlight(0);
    setError("");
    window.requestAnimationFrame(() =>
      destinationInputRef.current?.focus({ preventScroll: true }),
    );
  };

  const handleDestinationKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Escape") {
      setDestinationSuggestionsOpen(false);
      return;
    }

    if (!visibleDestinationSuggestions.length) {
      if (event.key === "ArrowDown") {
        setDestinationSuggestionsOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDestinationSuggestionsOpen(true);
      setDestinationHighlight(
        (current) => (current + 1) % visibleDestinationSuggestions.length,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setDestinationSuggestionsOpen(true);
      setDestinationHighlight(
        (current) =>
          (current - 1 + visibleDestinationSuggestions.length) %
          visibleDestinationSuggestions.length,
      );
      return;
    }

    if (event.key === "Enter" && destinationSuggestionsOpen) {
      const highlightedSuggestion =
        visibleDestinationSuggestions[destinationHighlight];
      if (!highlightedSuggestion) return;

      event.preventDefault();
      selectDestinationSuggestion(highlightedSuggestion);
    }
  };

  const handleClearDestination = () => {
    setDestinationMobilePickerOpen(false);
    setDestination("");
    setDestinationSuggestions([]);
    setDestinationSuggestionsCountryHint(activeCountryHint);
    setDestinationSuggestionsOpen(true);
    setDestinationHighlight(0);
    setError("");
    destinationInputRef.current?.focus();
  };

  const closeHotelSearchPopovers = () => {
    setDestinationSuggestionsOpen(false);
    setDestinationMobilePickerOpen(false);
    setDatesOpen(false);
    setGuestsRoomsOpen(false);
  };

  const resetMobileSearchPanelScroll = useCallback(() => {
    const scrollContainers = [
      mobileSearchPanelRef.current,
      mobileSearchContentRef.current,
    ];

    scrollContainers.forEach((scrollContainer) => {
      if (!scrollContainer) return;

      scrollContainer.scrollTop = 0;
      scrollContainer.scrollTo({ left: 0, top: 0 });
    });
  }, []);

  useEffect(() => {
    if (!mobileSearchOpen || typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(resetMobileSearchPanelScroll);

    return () => window.cancelAnimationFrame(frame);
  }, [mobileSearchOpen, resetMobileSearchPanelScroll]);

  const closeMobileSearchPanel = () => {
    closeHotelSearchPopovers();

    if (mobileLayout === "drawer") {
      onCloseMobileSearch?.();
      return;
    }

    setInternalMobileSearchOpen(false);
  };

  const openMobileSearchPanel = () => {
    closeHotelSearchPopovers();

    if (mobileLayout === "controls") {
      onOpenMobileSearch?.();
      return;
    }

    setInternalMobileSearchOpen(true);

    if (typeof window === "undefined") return;

    window.requestAnimationFrame(resetMobileSearchPanelScroll);
  };

  const handleResetSearch = () => {
    setDestination("");
    setCheckIn("");
    setCheckOut("");
    setHotelAdultCount(1);
    setHotelChildCount(0);
    setRooms("1");
    setHotelPetFriendly(false);
    setError("");
    setDatesOpen(false);
    setGuestsRoomsOpen(false);
    setInternalMobileSearchOpen(false);
    setDestinationSuggestions([]);
    setDestinationSuggestionsCountryHint(activeCountryHint);
    setDestinationSuggestionsOpen(false);
    setDestinationMobilePickerOpen(false);
    setDestinationHighlight(0);
    setHotelVisibleMonthDate(currentMonthStart());
  };

  const handleToggleDates = () => {
    setDatesOpen((prev) => {
      const nextOpen = !prev;

      if (nextOpen) {
        setDestinationMobilePickerOpen(false);
        setGuestsRoomsOpen(false);
      }

      return nextOpen;
    });
  };

  const handleToggleGuestsRooms = () => {
    setGuestsRoomsOpen((prev) => {
      const nextOpen = !prev;

      if (nextOpen) {
        setDestinationMobilePickerOpen(false);
        setDatesOpen(false);
      }

      return nextOpen;
    });
  };

  const handleSelectHotelDate = (date: Date) => {
    if (isBeforeToday(date)) {
      return;
    }

    const selectedIso = toIsoDate(date);

    if (!checkIn || (checkIn && checkOut)) {
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedDestination = destination.trim();
    const parsedRooms = Number.parseInt(rooms, 10);
    const normalizedGuests = Math.max(1, Math.min(12, totalHotelGuests));
    const normalizedRooms = Number.isNaN(parsedRooms)
      ? 1
      : Math.max(1, Math.min(6, parsedRooms));

    if (!trimmedDestination) {
      setError(t("hotelErrorEnterDestination"));
      destinationInputRef.current?.focus({ preventScroll: true });
      return;
    }

    setDestinationSuggestionsOpen(false);

    if (!checkIn) {
      setError(t("hotelErrorSelectCheckIn"));
      setDatesOpen(true);
      datesMobileLauncherRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!checkOut) {
      setError(t("hotelErrorSelectCheckOut"));
      setDatesOpen(true);
      datesMobileLauncherRef.current?.focus({ preventScroll: true });
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      setError(t("hotelErrorCheckoutAfterCheckin"));
      setDatesOpen(true);
      datesMobileLauncherRef.current?.focus({ preventScroll: true });
      return;
    }

    if (normalizedGuests < 1 || normalizedGuests > 12) {
      setError(t("hotelErrorGuestsRange"));
      return;
    }

    if (normalizedRooms < 1 || normalizedRooms > 6) {
      setError(t("hotelErrorRoomsRange"));
      return;
    }

    const searchDestination =
      normalizeHotelDestinationSearchValue(trimmedDestination);

    const params = new URLSearchParams({
      destination: searchDestination,
      checkIn,
      checkOut,
      guests: String(normalizedGuests),
      rooms: String(normalizedRooms),
    });

    if (initialSort) {
      params.set("sort", initialSort);
    }

    const nextUrl = `/hotels/results?${params.toString()}`;

    setRooms(String(normalizedRooms));
    setError("");
    closeHotelSearchPopovers();
    setIsSubmitting(true);
    onSubmitStart?.();

    if (!mobileSearchOpen) {
      closeMobileSearchPanel();
    }

    if (submittingResetTimeoutRef.current !== null) {
      window.clearTimeout(submittingResetTimeoutRef.current);
    }

    submittingResetTimeoutRef.current = window.setTimeout(() => {
      setIsSubmitting(false);
      submittingResetTimeoutRef.current = null;
    }, 15000);

    startRouteProgress();
    try {
      const recentSearch = buildHotelRecentSearch({
        destination: searchDestination,
        checkIn,
        checkOut,
        guests: normalizedGuests,
        rooms: normalizedRooms,
      });
      if (sessionStatus === "authenticated") {
        void syncBackendRecentSearch(recentSearch);
      } else {
        upsertRecentSearch(recentSearch);
      }
    } catch {
      // best effort only
    }
    router.push(nextUrl);
    onSubmitComplete?.();
  };

  const isStickyDialog = desktopPresentation === "sticky-dialog";
  const fieldClassName = cn(
    "relative rounded-xl border border-slate-300 bg-white transition-colors hover:border-slate-400 focus-within:border-[#004BB8] focus-within:ring-2 focus-within:ring-[#004BB8]/25",
    isStickyDialog
      ? "min-h-[58px] rounded-none border-0 border-e border-slate-200/80 bg-white/90 px-3 py-1.5 flex flex-col justify-center hover:border-slate-200/80 focus-within:z-10 focus-within:border-slate-200/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#004BB8]/20"
      : compact
        ? cn(
            "min-h-[56px] px-3 py-2 sm:min-h-[54px] sm:px-3 sm:py-1.5 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0",
            mobileSearchOpen &&
              "min-h-[74px] rounded-3xl border-slate-200 px-4 py-3.5 shadow-sm shadow-slate-900/[0.03] sm:min-h-[54px] sm:rounded-xl sm:border-slate-300 sm:px-3 sm:py-1.5 sm:shadow-none lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200",
          )
        : "min-h-[54px] px-3 py-1.5 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0",
  );
  const valueControlClassName = cn(
    "focus-ring w-full rounded-md border-0 bg-transparent px-0 outline-none transition-colors",
    isStickyDialog
      ? "mt-0.5 h-5 min-w-0 text-sm font-medium leading-5 text-slate-950 placeholder:text-slate-400"
      : compact
        ? cn(
            "h-7 text-[15px] font-bold text-slate-950 placeholder:text-slate-500 sm:h-8 sm:text-[16px] sm:font-semibold md:text-sm",
            mobileSearchOpen && "h-9 text-[16px] sm:h-8",
          )
        : "h-8 text-[16px] text-slate-900 md:text-sm",
  );
  const desktopPopoverClassName =
    "absolute top-[calc(100%+10px)] z-[1000] hidden border border-slate-200 bg-white shadow-[0_24px_56px_rgba(15,23,42,0.20)] ring-1 ring-slate-950/[0.04] sm:block";
  const fieldLabelClassName = cn(
    "block font-semibold uppercase",
    isStickyDialog
      ? "text-[0.62rem] leading-3 tracking-[0.12em] text-slate-500"
      : compact
        ? cn(
            "text-[10px] leading-4 tracking-[0.08em] text-slate-600 sm:mb-1 sm:text-xs sm:tracking-wide sm:text-slate-600",
            mobileSearchOpen &&
              "mb-1.5 text-[0.68rem] font-black tracking-[0.16em] text-slate-500 sm:mb-1 sm:text-xs sm:font-semibold sm:tracking-wide sm:text-slate-600",
          )
        : "mb-1 text-xs leading-4 tracking-wide text-slate-600",
  );

  return (
    <section
      className={cn(
        "mx-auto w-full",
        compact ? "max-w-full sm:max-w-5xl" : "max-w-[1040px] space-y-3",
        className,
      )}
    >
      {compact ? (
        <div className={cn("sm:hidden", mobileSearchOpen && "hidden")}>
          {onOpenFilters ? (
            <div className="mx-auto flex w-full max-w-3xl min-w-0 items-stretch gap-2.5">
              <button
                type="button"
                aria-label={t("hotelResults.openFilters")}
                onClick={onOpenFilters}
                className="focus-ring relative inline-flex h-16 w-[72px] shrink-0 items-center justify-center rounded-md border border-[#004BB8]/12 bg-white px-2 text-[11px] font-semibold text-slate-800 shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:border-[#004BB8]/20 hover:text-slate-950 hover:shadow-[0_8px_18px_rgba(0,75,184,0.12)] focus-visible:border-[#004BB8]"
              >
                <span className="flex flex-col items-center justify-center gap-1 leading-none">
                  <SlidersHorizontal
                    className="text-[#004BB8]"
                    size={17}
                    strokeWidth={2.3}
                  />
                  <span>{t("filters")}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={openMobileSearchPanel}
                className="focus-ring flex h-16 min-w-0 max-w-full flex-1 items-center justify-between gap-3 overflow-hidden rounded-md border border-[#004BB8]/12 bg-white px-4 py-0 text-start shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:border-[#004BB8]/20 hover:shadow-[0_8px_18px_rgba(0,75,184,0.12)] focus-visible:border-[#004BB8]"
              >
                <span className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
                  <span className="block truncate text-[15px] font-bold leading-5 text-slate-950">
                    {destination.trim() || t("destination")}
                  </span>
                  <span className="mt-1 block truncate text-[12px] font-semibold leading-4 text-slate-700">
                    {resultsSearchSummary}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#004BB8]/12 bg-[#004BB8]/8 text-[#004BB8] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                >
                  <PencilLine size={16} strokeWidth={2.1} />
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openMobileSearchPanel}
              className="focus-ring w-full rounded-xl border border-[#004BB8]/12 bg-white px-4 py-4 text-start shadow-[0_12px_26px_rgba(15,23,42,0.10)] transition hover:border-[#004BB8]/20 focus-visible:border-[#004BB8]"
            >
              <span className="block truncate text-sm font-semibold text-slate-950">
                {mobileSearchSummary}
              </span>
            </button>
          )}
        </div>
      ) : (
        <p className="px-1 text-sm font-medium text-slate-600">
          {hotelSearchIntroLabel}
        </p>
      )}
      <form
        onSubmit={handleSubmit}
        ref={setSearchPanelRef}
        className={cn(
          compact
            ? mobileSearchOpen
              ? isPageLevelMobileDrawer
                ? "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-slate-50 sm:hidden"
                : "fixed inset-0 z-[10000] flex h-[100dvh] min-h-0 w-full min-w-0 flex-col overflow-hidden bg-slate-50 sm:hidden"
              : "hidden sm:block sm:space-y-2"
            : "space-y-4",
        )}
        noValidate
      >
        {compact ? (
          <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 pb-3 pt-[calc(0.85rem+env(safe-area-inset-top))] sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold tracking-tight text-slate-950">
                {t("editHotelSearch")}
              </h2>
              <button
                type="button"
                aria-label={t("closeSearchForm")}
                onClick={closeMobileSearchPanel}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-base font-medium leading-none text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
              >
                ×
              </button>
            </div>
          </div>
        ) : null}
        <div
          ref={mobileSearchContentRef}
          className={cn(
            "overflow-visible",
            isStickyDialog
              ? "p-0 shadow-none"
              : compact
                ? cn(
                    "rounded-xl border border-slate-300 bg-slate-50 p-2 shadow-[0_14px_32px_rgba(15,23,42,0.14)] sm:rounded-[1.35rem] sm:border-slate-200/90 sm:bg-white sm:p-1.5 sm:shadow-[0_16px_36px_-24px_rgba(15,23,42,0.32)] sm:ring-1 sm:ring-slate-950/[0.02] lg:p-1",
                    mobileSearchOpen &&
                      "min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-none border-0 bg-slate-50 px-4 py-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-none",
                  )
                : "rounded-2xl border border-slate-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.10)]",
          )}
        >
          {!compact && desktopIdentityLabel ? (
            <div className="flex items-center px-1 pb-2 sm:hidden">
              <span
                className={cn(
                  "inline-flex items-center rounded-lg bg-[#004BB8]/8 px-3 font-semibold text-navy shadow-sm ring-1 ring-[#004BB8]/10",
                  mobileLandingPresentation
                    ? "gap-2 py-2 text-[16px]"
                    : "gap-1.5 py-1.5 text-[0.86rem]",
                )}
              >
                <BedDouble
                  aria-hidden="true"
                  className={cn(
                    "text-[#004BB8]",
                    mobileLandingPresentation ? "h-5 w-5" : "h-4 w-4",
                  )}
                  strokeWidth={2.15}
                />
                {hotelSearchIdentityLabel}
              </span>
            </div>
          ) : null}
          {!compact && desktopIdentityLabel ? (
            <div className="hidden items-center px-1 pb-2 sm:flex lg:pb-2.5">
              <span className="inline-flex items-center gap-2 rounded-lg bg-[#004BB8]/8 px-3.5 py-1.5 text-[0.925rem] font-semibold text-navy shadow-sm ring-1 ring-[#004BB8]/10">
                <BedDouble
                  aria-hidden="true"
                  className="h-[1.125rem] w-[1.125rem] text-[#004BB8]"
                  strokeWidth={2.15}
                />
                {hotelSearchIdentityLabel}
              </span>
            </div>
          ) : null}
          <div
            className={cn(
              isStickyDialog
                ? "grid min-h-[58px] grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px] items-stretch gap-0 overflow-visible rounded-xl border border-slate-200/85 bg-white/90 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.64)]"
                : "grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:gap-0",
              !isStickyDialog && compact
                ? cn(
                    "lg:grid-cols-[minmax(0,2.5fr)_minmax(0,1.45fr)_minmax(0,1.2fr)_112px]",
                    mobileSearchOpen &&
                      "mx-auto flex w-full max-w-xl flex-col gap-3 sm:grid sm:max-w-none sm:gap-1.5 lg:gap-0",
                  )
                : !isStickyDialog
                  ? "lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_minmax(0,1.15fr)_104px]"
                  : undefined,
            )}
          >
            <label
              ref={destinationWrapperRef}
              className={cn(
                fieldClassName,
                "lg:rounded-s-xl",
                shouldShowDestinationSuggestions && "z-[1000]",
              )}
            >
              <span className={fieldLabelClassName}>
                {t("hotelSearchDestinationLabel")}
              </span>
              <span className="relative block">
                <button
                  ref={destinationMobileLauncherRef}
                  type="button"
                  onClick={() => {
                    setDestinationMobilePickerOpen(true);
                    setDestinationSuggestionsOpen(false);
                    setDatesOpen(false);
                    setGuestsRoomsOpen(false);
                  }}
                  aria-haspopup="dialog"
                  aria-expanded={destinationMobilePickerOpen}
                  aria-label={t("chooseHotelDestination")}
                  className={cn(
                    valueControlClassName,
                    "flex items-center gap-2 text-start sm:hidden",
                    !mobileLandingPresentation && "justify-between pe-2",
                  )}
                >
                  {mobileLandingPresentation ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPin
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-slate-500"
                      />
                      <span
                        className={cn(
                          "truncate",
                          !destination.trim() && "text-slate-400",
                        )}
                      >
                        {destination.trim() ||
                          t("hotelSearchDestinationPlaceholder")}
                      </span>
                    </span>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "truncate",
                          !destination.trim() && "text-slate-400",
                        )}
                      >
                        {destination.trim() ||
                          t("hotelSearchDestinationPlaceholder")}
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "shrink-0 text-slate-500 transition-transform",
                          destinationMobilePickerOpen && "rotate-180",
                        )}
                      />
                    </>
                  )}
                </button>
                <input
                  ref={destinationInputRef}
                  type="text"
                  value={destination}
                  onChange={(event) => {
                    setDestination(event.target.value);
                    setDestinationSuggestionsOpen(true);
                    setDestinationHighlight(0);
                    setError("");
                  }}
                  onFocus={() => setDestinationSuggestionsOpen(true)}
                  onKeyDown={handleDestinationKeyDown}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={shouldShowDestinationSuggestions}
                  aria-controls={`${idPrefix}-destination-suggestions`}
                  aria-activedescendant={
                    shouldShowDestinationSuggestions &&
                    visibleDestinationSuggestions[destinationHighlight]
                      ? `${idPrefix}-destination-suggestion-${visibleDestinationSuggestions[destinationHighlight].id}`
                      : undefined
                  }
                  placeholder={t("hotelSearchDestinationPlaceholder")}
                  className={cn(
                    valueControlClassName,
                    "pr-9 placeholder:text-slate-400 max-sm:hidden",
                  )}
                  required
                />
                {destination ? (
                  <button
                    type="button"
                    onClick={handleClearDestination}
                    onMouseDown={(event) => event.preventDefault()}
                    aria-label={t("clearDestination")}
                    className="focus-ring absolute end-0 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:inline-flex"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </span>
              {shouldShowDestinationSuggestions ? (
                <div
                  id={`${idPrefix}-destination-suggestions`}
                  role="listbox"
                  aria-label={t("hotelDestinationSuggestions")}
                  className={cn(
                    desktopPopoverClassName,
                    "start-0 max-h-[min(68vh,360px)] w-[min(92vw,420px)] overflow-y-auto rounded-2xl p-1.5 lg:w-[min(42vw,440px)]",
                  )}
                >
                  {destinationSuggestionsLoading ? (
                    <div className="px-3 py-2.5 text-sm font-medium text-slate-500">
                      {t("findingDestinations")}
                    </div>
                  ) : visibleDestinationSuggestions.length ? (
                    visibleDestinationSuggestions.map((suggestion, index) => {
                      const isActive = destinationHighlight === index;
                      const detail = getLocalizedHotelDestinationDetail(
                        suggestion,
                        locale,
                      );
                      const localizedName =
                        getLocalizedHotelDestinationCityName(
                          suggestion.name,
                          locale,
                        );

                      return (
                        <button
                          key={suggestion.id}
                          id={`${idPrefix}-destination-suggestion-${suggestion.id}`}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onClick={() =>
                            selectDestinationSuggestion(suggestion)
                          }
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setDestinationHighlight(index)}
                          className={cn(
                            "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
                            isActive ? "bg-[#004BB8]/8" : "hover:bg-slate-50",
                          )}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-950">
                              {localizedName}
                            </span>
                            <span className="mt-0.5 block truncate text-xs font-medium text-slate-600">
                              {detail || suggestion.country}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                            {getDestinationKindLabel(suggestion.kind)}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2.5 text-sm font-medium text-slate-500">
                      {t("noMatchingDestinationsYet")}
                    </div>
                  )}
                </div>
              ) : null}
            </label>

            <div
              ref={datesWrapperRef}
              className={cn(fieldClassName, datesOpen && "z-[1000]")}
            >
              <span className={fieldLabelClassName}>
                {t("hotelSearchTravelDatesLabel")}
              </span>
              <button
                ref={datesMobileLauncherRef}
                type="button"
                onClick={handleToggleDates}
                aria-expanded={datesOpen}
                aria-haspopup="dialog"
                aria-label={t("chooseTravelDates")}
                className={cn(
                  valueControlClassName,
                  "flex items-center gap-1.5 text-start",
                )}
              >
                <Calendar
                  size={16}
                  className={cn(
                    "shrink-0",
                    compact ? "text-[#004BB8]" : "text-slate-500",
                  )}
                />
                <span className="truncate">{dateSummary}</span>
              </button>
              {datesOpen ? (
                <div
                  className={cn(
                    desktopPopoverClassName,
                    "end-0 w-[min(92vw,580px)] rounded-2xl p-3 lg:end-auto lg:start-0",
                  )}
                >
                  <p className="mb-2.5 text-sm font-semibold text-slate-900">
                    {t("chooseTravelDates")}
                  </p>
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      aria-label={t("previousMonth")}
                      onClick={() =>
                        setHotelVisibleMonthDate((prev) => addMonths(prev, -1))
                      }
                      className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {t("previousMonthShort")}
                    </button>
                    <button
                      type="button"
                      aria-label={t("nextMonth")}
                      onClick={() =>
                        setHotelVisibleMonthDate((prev) => addMonths(prev, 1))
                      }
                      className="focus-ring rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {t("nextMonthShort")}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[0, 1].map((monthOffset) => {
                      const monthDate = addMonths(
                        hotelVisibleMonthDate,
                        monthOffset,
                      );
                      const cells = buildMonthCells(monthDate);

                      return (
                        <div key={monthOffset}>
                          <p className="mb-1.5 text-center text-sm font-semibold text-slate-800">
                            {monthDate.toLocaleDateString(calendarLocale, {
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
                              const isCheckIn = iso === checkIn;
                              const isCheckOut = iso === checkOut;
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
                                  aria-label={`${t(
                                    "hotelResults.selectDateAriaPrefix",
                                  )} ${day.toLocaleDateString(calendarLocale, {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                  })}`}
                                  onClick={() => handleSelectHotelDate(day)}
                                  disabled={isPastDate}
                                  className={`focus-ring flex h-8 w-8 items-center justify-center justify-self-center rounded-full text-sm transition-colors disabled:cursor-not-allowed ${
                                    isPastDate
                                      ? "text-slate-300 hover:bg-transparent"
                                      : "text-slate-900 hover:bg-[#004BB8]/8"
                                  } ${
                                    isInRange
                                      ? "rounded-md bg-[#004BB8]/10 text-[#021C2B] hover:bg-[#004BB8]/10"
                                      : ""
                                  } ${
                                    isCheckIn || isCheckOut
                                      ? "bg-[#004BB8] text-white hover:bg-[#004BB8]"
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
                        setCheckIn("");
                        setCheckOut("");
                      }}
                      className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      {t("clear")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDatesOpen(false)}
                      className="focus-ring rounded-lg bg-[#004BB8] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,75,184,0.20)] transition-colors hover:bg-[#021C2B] active:bg-[#021C2B] focus-visible:ring-[#004BB8]/35"
                    >
                      {t("done")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div
              ref={guestsRoomsWrapperRef}
              className={cn(fieldClassName, guestsRoomsOpen && "z-[1000]")}
            >
              <span className={fieldLabelClassName}>
                {t("hotelSearchGuestsLabel")}
              </span>
              <button
                ref={guestsRoomsMobileLauncherRef}
                type="button"
                onClick={handleToggleGuestsRooms}
                aria-expanded={guestsRoomsOpen}
                aria-haspopup="dialog"
                aria-label={t("chooseGuestsAndRooms")}
                className={cn(
                  valueControlClassName,
                  "flex items-center justify-between gap-1.5 text-start",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {mobileLandingPresentation ? (
                    <UserRound
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-slate-500"
                    />
                  ) : null}
                  <span className="truncate">{guestsRoomsSummary}</span>
                </span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-slate-500 transition-transform ${
                    guestsRoomsOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {guestsRoomsOpen ? (
                <div
                  className={cn(
                    desktopPopoverClassName,
                    "start-0 w-[min(92vw,320px)] rounded-xl p-3 lg:end-0 lg:start-auto",
                  )}
                >
                  <div className="space-y-3">
                    {[
                      {
                        key: "adults",
                        label: t("adults"),
                        value: hotelAdultCount,
                        min: 1,
                        max: 12 - hotelChildCount,
                        onDecrement: () =>
                          setHotelAdultCount((prev) => Math.max(1, prev - 1)),
                        onIncrement: () =>
                          setHotelAdultCount((prev) =>
                            Math.min(12 - hotelChildCount, prev + 1),
                          ),
                      },
                      {
                        key: "children",
                        label: t("children"),
                        value: hotelChildCount,
                        min: 0,
                        max: 12 - hotelAdultCount,
                        onDecrement: () =>
                          setHotelChildCount((prev) => Math.max(0, prev - 1)),
                        onIncrement: () =>
                          setHotelChildCount((prev) =>
                            Math.min(12 - hotelAdultCount, prev + 1),
                          ),
                      },
                      {
                        key: "rooms",
                        label: t("rooms"),
                        value: clampCount(rooms, 1, 6),
                        min: 1,
                        max: 6,
                        onDecrement: () =>
                          setRooms((prev) =>
                            String(Math.max(1, clampCount(prev, 1, 6) - 1)),
                          ),
                        onIncrement: () =>
                          setRooms((prev) =>
                            String(Math.min(6, clampCount(prev, 1, 6) + 1)),
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
                    {!mobileSearchOpen ? (
                      <div className="border-t border-slate-200 pt-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {t("petFriendly")}
                            </p>
                            <p className="pr-2 text-xs leading-5 text-slate-600">
                              {t("onlyShowPetFriendlyStays")}
                            </p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={hotelPetFriendly}
                            aria-label={t("togglePetFriendlyStays")}
                            onClick={() => setHotelPetFriendly((prev) => !prev)}
                            className={`focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                              hotelPetFriendly
                                ? "border-[#004BB8] bg-[#004BB8]"
                                : "border-slate-300 bg-slate-200"
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                hotelPetFriendly
                                  ? "translate-x-5"
                                  : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div
              className={cn(
                "sm:col-span-2 lg:col-span-1 lg:self-stretch",
                compact ? "sm:min-h-[54px]" : "lg:min-h-[54px]",
              )}
            >
              <button
                type="submit"
                className={cn(
                  isStickyDialog
                    ? "h-full min-h-[58px] w-full rounded-none rounded-e-xl bg-[#004BB8] px-4 text-sm font-bold text-white shadow-none transition-colors hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-75"
                    : compact
                      ? "w-full rounded-xl bg-[#004BB8] px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(0,75,184,0.18)] transition hover:bg-[#021C2B] hover:shadow-[0_14px_28px_rgba(0,75,184,0.24)] disabled:cursor-not-allowed disabled:opacity-75 lg:h-full lg:self-stretch lg:rounded-e-xl lg:border lg:border-s-0 lg:border-[#004BB8]/20"
                      : "h-12 w-full whitespace-nowrap rounded-xl bg-[#004BB8] px-4 text-sm font-bold text-white shadow-md shadow-[#004BB8]/20 enabled:hover:bg-[#021C2B] enabled:active:bg-[#021C2B] disabled:bg-[#004BB8] disabled:opacity-100 disabled:shadow-md disabled:shadow-[#004BB8]/20 lg:h-full lg:self-stretch lg:min-h-[58px] lg:rounded-none lg:rounded-e-2xl lg:border lg:border-s-0 lg:border-[#004BB8]/20 lg:px-5 lg:text-[15px] lg:font-bold lg:shadow-[0_10px_22px_rgba(0,75,184,0.22)] lg:disabled:shadow-[0_10px_22px_rgba(0,75,184,0.22)]",
                  !isStickyDialog && compact
                    ? cn(
                        "h-[54px] shadow-lg sm:min-h-[54px] lg:min-w-[112px] lg:rounded-s-none",
                        mobileSearchOpen &&
                          "mt-1 h-[52px] rounded-2xl text-base sm:mt-0 sm:h-[54px] sm:rounded-xl lg:rounded-s-none",
                      )
                    : !isStickyDialog
                      ? "h-12 lg:min-h-[54px] lg:rounded-none"
                      : undefined,
                )}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting
                  ? t("searchingHotels")
                  : compact
                    ? t("search")
                    : t("searchHotels")}
              </button>
            </div>
          </div>
        </div>

        {!compact && !mobileLandingPresentation && hasActiveHotelSearch ? (
          <div className="flex justify-end px-1">
            <button
              type="button"
              onClick={handleResetSearch}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("clearAll")}
            </button>
          </div>
        ) : null}

        {error ? (
          <MessageBanner tone="error" role={errorRole}>
            {error}
          </MessageBanner>
        ) : null}
      </form>

      <HotelDestinationMobilePicker
        open={destinationMobilePickerOpen}
        value={destination}
        titleId={`${idPrefix}-mobile-destination-title`}
        inputId={`${idPrefix}-mobile-destination-input`}
        launcherRef={destinationMobileLauncherRef}
        selectedCountryHint={selectedCountryHint}
        detectedCountryHint={detectedCountryHint}
        onChange={(nextDestination) => {
          setDestination(nextDestination);
          setDestinationSuggestionsOpen(false);
          setError("");
        }}
        onClose={() => setDestinationMobilePickerOpen(false)}
      />

      <MobileDatePickerDialog
        open={datesOpen}
        title={t("chooseTravelDates")}
        titleId={`${idPrefix}-mobile-dates-title`}
        dialogId={`${idPrefix}-mobile-dates`}
        launcherRef={datesMobileLauncherRef}
        startDate={checkIn}
        endDate={checkOut}
        rangeRequired
        firstMonth={hotelVisibleMonthDate}
        locale={calendarLocale}
        weekdays={weekdays}
        labels={{
          selectDates: t("carsResults.selectDates"),
          start: t("mobileDatePicker.start"),
          end: t("mobileDatePicker.end"),
          done: t("done"),
          selectDatePrefix: t("hotelResults.selectDateAriaPrefix"),
        }}
        isDateDisabled={isBeforeToday}
        onCommit={(nextCheckIn, nextCheckOut) => {
          setCheckIn(nextCheckIn);
          setCheckOut(nextCheckOut);
        }}
        onClose={() => setDatesOpen(false)}
      />

      <HotelMobilePickerShell
        open={guestsRoomsOpen}
        title={t("hotelGuestsRooms.mobileTitle") || "Guests & Rooms"}
        titleId={`${idPrefix}-mobile-guests-title`}
        launcherRef={guestsRoomsMobileLauncherRef}
        onClose={() => setGuestsRoomsOpen(false)}
        showCancelAction={false}
        showBackLabel={false}
        contentClassName="bg-[#fcfdfe] px-4 py-6"
        footer={(requestClose) => (
            <button type="button" onClick={() => {
              setHotelAdultCount(draftHotelAdults);
              setHotelChildCount(draftHotelChildren);
              setRooms(String(draftHotelRooms));
              setHotelPetFriendly(draftHotelPetFriendly);
              requestClose();
            }} className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075ee8] text-[17px] font-bold text-white">
              {t("done")}
            </button>
        )}
      >
        <MobileHotelGuestsRoomsPicker adults={draftHotelAdults} children={draftHotelChildren} rooms={draftHotelRooms} petFriendly={draftHotelPetFriendly} density={mobileLandingPresentation ? "compact" : undefined}
          onAdultsChange={setDraftHotelAdults} onChildrenChange={setDraftHotelChildren} onRoomsChange={setDraftHotelRooms} onPetFriendlyChange={setDraftHotelPetFriendly}
          strings={{ guests: t("guests"), adults: t("adults"), adultDescription: t("hotelGuests.adultDescription") || "Ages 18+", children: t("children"), childDescription: t("hotelGuests.childDescription") || "Ages 0–17", rooms: t("rooms"), roomDescription: t("hotelGuests.roomDescription") || "Separate rooms", petFriendly: t("petFriendly"), petDescription: t("onlyShowPetFriendlyStays"), decrease: (label) => `Decrease ${label}`, increase: (label) => `Increase ${label}` }} />
      </HotelMobilePickerShell>
    </section>
  );
}
