"use client";
import { useKayakResults } from "./KayakResultsContext";
import { CombinedSearchEmpty } from "./CombinedSearchEmpty";
import { kayakCarCardModel } from "./kayakCardModels";
import { isKayakSandboxResult, resultActionHref } from "@/lib/travel/resultAction";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Calendar,
  CalendarDays,
  Car,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  MapPin,
  SquarePen,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { formatTravelDateDisplay } from "@/lib/dateFormatting/travelDateDisplay";
import { cn } from "@/lib/utils";
import { CarResultCard } from "@/components/results/CarResultCard";
import { CarsResultsMapPreview } from "@/components/results/CarsResultsMapPreview";
import { CarsResultsScrollIndicator } from "@/components/results/CarsResultsScrollIndicator";
import { CarPriceAlertControl } from "@/components/results/CarPriceAlertControl";
import { CarCardSkeleton } from "@/components/ui/Skeleton";
import { prefersReducedResultsMotion } from "@/lib/results/paginationTransition";
import {
  assignCarBadges,
  buildCarDetailsHref,
  doesCarMatchFilterOption,
  ensureCarProviderCoverage,
  filterCarResults,
  sortCarResults,
  type CarSort,
  type SelectedCarFilters,
} from "@/lib/cars/carResults";
import type {
  CarInventoryStatus,
  CarSearchParams,
  LocationBoundCarSearchParams,
  NormalizedCarResult,
} from "@/lib/cars/types";
import type { CarLocationSuggestion } from "@/lib/cars/carLocationSuggestions";
import { serializeCarLocationTarget } from "@/lib/cars/carSearchLocationTarget";
import { carFilterGroups, carQuickFilterGroupIds, type CarFilterGroup } from "@/lib/cars/carFilterPresentation";
import { getSelectedCarFiltersSignature } from "@/lib/cars/carFilterSelection";
import { formatCarsCompactTimeRange, toTimeValue, validateCarsForm } from "@/lib/cars/carsSearchUtils";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";

type CarsFilterTransitionPhase = "idle" | "covering" | "revealing";
const CARS_FILTER_MIN_BUSY_MS = 220;
const CARS_FILTER_REVEAL_MS = 160;
import { shouldShowDesktopStickySearch } from "@/lib/search/desktopStickySearch";
import {
  calculateCompactFilterPlacement,
  shouldShowDesktopCompactFilter,
  type DesktopCompactFilterPlacementState,
} from "@/lib/flights/desktopCompactFilter";
import { calculateCompactFilterMaxHeight } from "@/lib/hotels/desktopCompactFilter";
import { lockDesktopPageScroll } from "@/lib/search/desktopPageScrollLock";
import { CarLocationAutocomplete } from "@/components/search/CarLocationAutocomplete";
import { MobileCarLocationPicker } from "@/components/search/MobileCarLocationPicker";
import { openMobilePickerWithKeyboard } from "@/components/search/mobilePickerKeyboardFocus";
import {
  CarsDriverAgePickerContent,
  CarsRentalDatePickerContent,
  CarsTimeRangePickerContent,
  MobileCarDriverAgePickerDialog,
  MobileCarTimePickerDialog,
} from "@/components/search/CarsPickerContent";
import { MobileDatePickerDialog } from "@/components/search/MobileDateRangePicker";
import { MobileResultsEditSheet } from "@/components/search/MobileResultsEditSheet";
import { acquireMobileResultsScrollLock, type MobileResultsScrollLockRelease } from "@/lib/search/mobileResultsScrollLock";
import { acquireMobileResultsOverlayCanvas } from "@/lib/search/mobileResultsOverlayCanvas";
import { getOverlayActivationModality, restoreOverlayLauncherFocus, type OverlayActivationModality } from "@/lib/search/mobileResultsOverlayFocus";
import { getLocationFieldDisplay } from "@/lib/search/locationFieldDisplay";
import {
  carsDesktopPopoverClassName,
  useCarsDesktopPopover,
} from "@/components/search/useCarsDesktopPopover";

export const CAR_BACK_TO_TOP_SCROLL_THRESHOLD = 600;

type CarsResultsValues = LocationBoundCarSearchParams & {
  returnToDifferentLocation: boolean;
};

type CarsResultsMobilePicker =
  | "pickupLocation"
  | "returnLocation"
  | "dates"
  | "times"
  | "driverAge"
  | null;

type CarsResultsSearchSnapshot = {
  pickupLocation: string;
  pickupLocationTarget: string;
  dropoffLocation: string;
  dropoffLocationTarget: string;
  returnToDifferentLocation: boolean;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  driverAge: string;
};

const serializeSuggestionLocationTarget = (
  suggestion?: CarLocationSuggestion,
) => (suggestion?.canonical ? JSON.stringify(suggestion.canonical) : "");

export function buildCarsResultsHref(formData: FormData) {
  const params = new URLSearchParams();

  for (const [name, value] of formData.entries()) {
    if (typeof value === "string") params.append(name, value);
  }

  const query = params.toString();
  return query ? `/cars/results?${query}` : "/cars/results";
}

export function isSameCarsResultsHref(targetHref: string, currentHref: string) {
  const baseUrl = "https://kurioticket.local";
  const targetUrl = new URL(targetHref, baseUrl);
  const currentUrl = new URL(currentHref, baseUrl);

  targetUrl.searchParams.sort();
  currentUrl.searchParams.sort();

  return (
    targetUrl.pathname === currentUrl.pathname &&
    targetUrl.search === currentUrl.search
  );
}

type SearchSurfaceRefs = {
  pickupInputRef: RefObject<HTMLInputElement | null>;
  dropoffInputRef: RefObject<HTMLInputElement | null>;
  dateWrapRef: RefObject<HTMLDivElement | null>;
  timeWrapRef: RefObject<HTMLDivElement | null>;
  driverAgeWrapRef: RefObject<HTMLDivElement | null>;
  datePopoverRef: RefObject<HTMLDivElement | null>;
  timePopoverRef: RefObject<HTMLDivElement | null>;
  driverAgePopoverRef: RefObject<HTMLDivElement | null>;
};

function useSearchSurfaceRefs(): SearchSurfaceRefs {
  return {
    pickupInputRef: useRef<HTMLInputElement | null>(null),
    dropoffInputRef: useRef<HTMLInputElement | null>(null),
    dateWrapRef: useRef<HTMLDivElement | null>(null),
    timeWrapRef: useRef<HTMLDivElement | null>(null),
    driverAgeWrapRef: useRef<HTMLDivElement | null>(null),
    datePopoverRef: useRef<HTMLDivElement | null>(null),
    timePopoverRef: useRef<HTMLDivElement | null>(null),
    driverAgePopoverRef: useRef<HTMLDivElement | null>(null),
  };
}

const defaultDriverAge = "18-70";
const minimumDriverAge = 18;
const maximumDriverAge = 70;
const desktopCompactFilterTopOffset = 116;
const desktopCompactFilterBottomGap = 12;

type DesktopCompactFilterFrame = {
  left: number;
  width: number;
  maxHeight: number;
};

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";

  return `${String(hour).padStart(2, "0")}:${minute}`;
});

function isSafelyFocusableElement(element: HTMLElement | null) {
  if (!element?.isConnected) return false;
  if (element.hidden || element.getAttribute("aria-hidden") === "true")
    return false;
  const rects = element.getClientRects();
  if (rects.length === 0) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

const driverAgeOptions = [
  defaultDriverAge,
  ...Array.from(
    { length: maximumDriverAge - minimumDriverAge + 1 },
    (_, index) => String(index + minimumDriverAge),
  ),
];

export const getCarsResultsIntlLocale = (locale: string) => {
  const normalizedLocale = locale.toLowerCase();

  if (normalizedLocale.startsWith("de")) {
    return "de-DE";
  }

  if (normalizedLocale.startsWith("es")) {
    return "es-ES";
  }

  if (normalizedLocale.startsWith("fr")) {
    return "fr-FR";
  }

  if (normalizedLocale.startsWith("it")) {
    return "it-IT";
  }

  if (normalizedLocale.startsWith("nl")) {
    return "nl-NL";
  }

  if (normalizedLocale.startsWith("pt")) {
    return "pt-BR";
  }

  if (
    normalizedLocale === "zh" ||
    normalizedLocale.startsWith("zh-cn") ||
    normalizedLocale.startsWith("zh-hans")
  ) {
    return "zh-CN";
  }

  if (normalizedLocale.startsWith("ja")) {
    return "ja-JP";
  }

  if (normalizedLocale.startsWith("ko")) {
    return "ko-KR";
  }

  if (normalizedLocale.startsWith("hi")) {
    return "hi-IN";
  }

  if (normalizedLocale.startsWith("tr")) {
    return "tr-TR";
  }

  if (normalizedLocale.startsWith("th")) {
    return "th-TH-u-ca-gregory";
  }

  if (normalizedLocale.startsWith("vi")) {
    return "vi-VN";
  }

  if (normalizedLocale.startsWith("id")) {
    return "id-ID";
  }

  if (normalizedLocale.startsWith("pl")) {
    return "pl-PL";
  }

  if (normalizedLocale.startsWith("sv")) {
    return "sv-SE";
  }

  if (normalizedLocale.startsWith("ar")) {
    return "ar-u-nu-latn";
  }

  return locale;
};

const curatedLocationTranslationKeys: Record<string, string> = {
  Airport: "carsResults.location.airport",
  "City center": "carsResults.location.cityCenter",
  "Hotel area": "carsResults.location.hotelArea",
  "Train station": "carsResults.location.trainStation",
};

const interpolate = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );

const formatCompactDate = (
  date: string,
  intlLocale: string,
  fallback: string,
) => {
  if (!date) {
    return fallback;
  }

  const [year, month, day] = date.split("-").map(Number);

  return year && month && day
    ? new Intl.DateTimeFormat(intlLocale, {
        day: "numeric",
        month: "short",
      }).format(new Date(year, month - 1, day))
    : date;
};

export const formatDate = (
  date: string,
  intlLocale: string,
  fallback: string,
) => {
  if (!date) {
    return fallback;
  }

  const [year, month, day] = date.split("-").map(Number);

  return year && month && day
    ? new Intl.DateTimeFormat(intlLocale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(year, month - 1, day))
    : date;
};

const parseIsoDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const todayAtMidnight = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return today;
};

const isBeforeToday = (date: Date) => date < todayAtMidnight();

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, 1);

const buildMonthCells = (monthDate: Date) => {
  const firstOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const startDate = new Date(firstOfMonth);
  startDate.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

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

const getWeekdays = (intlLocale: string) => {
  if (intlLocale.toLowerCase().startsWith("th")) {
    return ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  }

  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(
      new Date(2024, 0, 7 + index),
    ),
  );
};

const twentyFourHourTimeLocales = [
  "de",
  "es",
  "fr",
  "id",
  "ja",
  "nl",
  "pl",
  "pt",
  "sv",
  "tr",
];

export const formatTimeLabel = (time: string, intlLocale: string) => {
  const [hourValue, minuteValue] = time.split(":").map(Number);
  const normalizedLocale = intlLocale.toLowerCase();
  const timeSeparator = intlLocale.toLowerCase().startsWith("id") ? "." : ":";
  const shouldUseTwentyFourHourTime = twentyFourHourTimeLocales.some(
    (localePrefix) => normalizedLocale.startsWith(localePrefix),
  );
  const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    ...(shouldUseTwentyFourHourTime ? { hourCycle: "h23" } : {}),
  };

  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
    const formattedFallback = new Intl.DateTimeFormat(
      intlLocale,
      dateTimeFormatOptions,
    ).format(new Date(2024, 0, 1, 10, 0));

    return time || formattedFallback.replace(":", timeSeparator);
  }

  return new Intl.DateTimeFormat(intlLocale, dateTimeFormatOptions)
    .format(new Date(2024, 0, 1, hourValue, minuteValue))
    .replace(":", timeSeparator);
};

const normalizeDriverAge = (value: string) =>
  driverAgeOptions.includes(value) ? value : defaultDriverAge;

const getCuratedLocationLabel = (
  location: string,
  t: (key: string) => string,
) => {
  const trimmedLocation = location.trim();
  const translationKey = curatedLocationTranslationKeys[trimmedLocation];

  return translationKey ? t(translationKey) : trimmedLocation;
};

const getDriverAgeOptionLabel = (age: string, t: (key: string) => string) => {
  if (age === defaultDriverAge) {
    return t("carsResults.anyDriverAgeRange");
  }

  const yearsOldLabel = t("carsResults.yearsOld");

  return yearsOldLabel.length === 1
    ? `${age}${yearsOldLabel}`
    : `${age} ${yearsOldLabel}`;
};

const fieldShellClass =
  "relative min-h-[50px] rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm shadow-slate-900/[0.025] transition-[min-height,padding,border-color,box-shadow] duration-200 hover:border-slate-300 focus-within:border-[#004BB8] focus-within:ring-2 focus-within:ring-[#004BB8]/25 sm:min-h-[54px] sm:px-3 sm:py-1.5 lg:flex lg:min-h-[54px] lg:min-w-0 lg:flex-col lg:justify-center lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200/80 lg:bg-transparent lg:px-4 lg:py-2 lg:shadow-none lg:hover:border-slate-200/80 lg:focus-within:border-slate-200/80 lg:focus-within:ring-0";

const differentReturnSearchGridClass =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,1.08fr)_minmax(0,1.48fr)_minmax(0,1.06fr)_118px_116px] lg:items-stretch lg:gap-0";
const sameReturnSearchGridClass =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.26fr)_minmax(0,1.48fr)_minmax(0,1.06fr)_118px_116px] lg:items-stretch lg:gap-0";
const compactFieldShellClass = "min-h-[46px] py-1 lg:min-h-[54px] lg:py-1.5";

const fieldLabelClass =
  "mb-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-slate-500 sm:mb-1 sm:text-xs sm:font-semibold sm:tracking-wide sm:text-slate-600 lg:mb-1 lg:text-[12px] lg:font-bold lg:uppercase lg:leading-4 lg:tracking-[0.05em] lg:text-[#475569]";

const fieldInputClass =
  "h-8 min-w-0 w-full border-0 bg-transparent p-0 text-[16px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus-visible:outline-none focus-visible:shadow-none md:text-sm lg:placeholder:font-medium lg:placeholder:text-slate-400";
const desktopFullSelectedValueClass =
  "cars-results-desktop-filter-heading-type";
const desktopCompactSelectedValueClass =
  "lg:text-[15px] lg:font-bold lg:leading-5 lg:tracking-[-0.005em] lg:text-[#07133B]";
const carsMobileEditFieldShellClass =
  "cars-results-edit-field relative flex min-h-[66px] flex-col justify-center rounded-[13px] border border-[#E7ECF5] bg-white px-3 py-[10px] shadow-none focus-within:border-[#064CF7] focus-within:ring-2 focus-within:ring-[#064CF7]/25";
const carsMobileEditPickupLabelClass =
  "cars-results-edit-label mb-[3px] text-[11px] font-medium normal-case leading-[14px] tracking-normal text-[#595959]";
const carsMobileEditFieldLabelClass =
  "cars-results-edit-label mb-[3px] text-[11px] font-medium normal-case leading-[14px] tracking-normal text-[#595959]";
const carsMobileEditSummaryButtonClass =
  "cars-results-edit-value focus-ring flex h-auto min-h-6 w-full min-w-0 items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[15px] font-semibold leading-5 text-[#1A1A1A] outline-none focus-visible:ring-0";
const carsMobileEditValueGroupClass = "flex min-w-0 flex-1 items-center gap-[10px]";
const carsMobileEditPickupValueClass =
  "cars-results-edit-value focus-ring block h-auto min-h-6 min-w-0 w-full flex-1 border-0 bg-transparent p-0 text-start text-[15px] font-semibold leading-5 text-[#1A1A1A] outline-none focus-visible:ring-0";
const carsMobileEditSecondaryValueClass =
  "cars-results-edit-secondary text-[12px] font-normal leading-4 tracking-normal text-[#595959]";

export function CarsResultsClient({
  values,
  initialResults,
  inventoryStatus,
}: {
  values: CarsResultsValues;
  initialResults: NormalizedCarResult[];
  inventoryStatus: CarInventoryStatus;
}) {
  const { locale, t: dictionary } = useLocale();
  const router = useRouter();
  const t = useCallback((key: string) => dictionary[key] ?? enTranslations[key] ?? "", [dictionary]);
  const intlLocale = getCarsResultsIntlLocale(locale);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchClosing, setMobileSearchClosing] = useState(false);
  const mobileSearchCloseTimerRef = useRef<number | null>(null);
  const [isSearchSubmitting, setIsSearchSubmitting] = useState(false);
  const [searchValidationError, setSearchValidationError] = useState("");
  const isSearchSubmittingRef = useRef(false);
  const [mobilePicker, setMobilePicker] =
    useState<CarsResultsMobilePicker>(null);
  const [isSearchBarCompact, setIsSearchBarCompact] = useState(false);
  const [desktopNavSearchTarget, setDesktopNavSearchTarget] =
    useState<HTMLElement | null>(null);
  const [mobileNavSearchTarget, setMobileNavSearchTarget] =
    useState<HTMLElement | null>(null);
  const [desktopStickySearchSection, setDesktopStickySearchSection] = useState<
    "locations" | "dates" | "times" | "driverAge" | null
  >(null);
  const [pickupLocation, setPickupLocation] = useState(values.pickupLocation);
  const [pickupLocationTarget, setPickupLocationTarget] = useState(
    () => serializeCarLocationTarget(values.pickupLocationTarget) ?? "",
  );
  const [dropoffLocation, setDropoffLocation] = useState(
    values.returnToDifferentLocation ? values.dropoffLocation : "",
  );
  const [dropoffLocationTarget, setDropoffLocationTarget] = useState(
    () =>
      values.returnToDifferentLocation
        ? serializeCarLocationTarget(values.dropoffLocationTarget) ?? ""
        : "",
  );
  const [returnToDifferentLocation, setReturnToDifferentLocation] = useState(
    values.returnToDifferentLocation,
  );
  const [openLocation, setOpenLocation] = useState<"pickup" | "dropoff" | null>(
    null,
  );
  const [pickupDate, setPickupDate] = useState(values.pickupDate);
  const [dropoffDate, setDropoffDate] = useState(values.dropoffDate);
  const [pickupTime, setPickupTime] = useState(values.pickupTime || "10:00");
  const [dropoffTime, setDropoffTime] = useState(values.dropoffTime || "10:00");
  const [driverAge, setDriverAge] = useState(() =>
    normalizeDriverAge(values.driverAge || defaultDriverAge),
  );
  const [datesOpen, setDatesOpen] = useState(false);
  const [timesOpen, setTimesOpen] = useState(false);
  const [driverAgeOpen, setDriverAgeOpen] = useState(false);
  const desktopFullSearchRefs = useSearchSurfaceRefs();
  const desktopStickySearchRefs = useSearchSurfaceRefs();
  const mobileSearchRefs = useSearchSurfaceRefs();
  const pickupLocationLauncherRef = useRef<HTMLButtonElement | null>(null);
  const returnLocationLauncherRef = useRef<HTMLButtonElement | null>(null);
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const resultsGridRef = useRef<HTMLDivElement | null>(null);
  const mobileSearchLauncherRef = useRef<HTMLElement | null>(null);
  const mobileSearchModalityRef = useRef<OverlayActivationModality>("programmatic");
  const mobileSearchSnapshotRef = useRef<CarsResultsSearchSnapshot | null>(
    null,
  );
  const stickyDialogRef = useRef<HTMLDivElement | null>(null);
  const stickyLauncherRef = useRef<HTMLButtonElement | null>(null);
  const stickyScrollLockRef = useRef<{ restore: () => void } | null>(null);
  const [visibleMonthDate, setVisibleMonthDate] = useState(() => {
    const parsedPickup = parseIsoDate(values.pickupDate);

    if (parsedPickup) {
      return new Date(parsedPickup.getFullYear(), parsedPickup.getMonth(), 1);
    }

    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDesktopNavSearchTarget(
        document.querySelector<HTMLElement>("[data-cars-results-nav-search]"),
      );
      setMobileNavSearchTarget(
        document.querySelector<HTMLElement>(
          "[data-cars-results-mobile-nav-search]",
        ),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const hasSearchContext = Boolean(pickupLocation || pickupDate || dropoffDate);
  const trimmedPickupLocation = pickupLocation.trim();
  const trimmedDropoffLocation = dropoffLocation.trim();
  const pickupLocationLabel = getCuratedLocationLabel(trimmedPickupLocation, t);
  const dropoffLocationLabel = getCuratedLocationLabel(
    trimmedDropoffLocation,
    t,
  );
  // Results chrome is intentionally compact. Keep the complete curated labels
  // in state and in every search value, and only select their primary display
  // line for the summary surfaces below.
  const pickupSummaryDisplay = getLocationFieldDisplay(pickupLocationLabel).primary;
  const returnSummaryDisplay = getLocationFieldDisplay(dropoffLocationLabel).primary;
  const showCompactSearchSummary =
    !desktopNavSearchTarget &&
    isSearchBarCompact &&
    desktopStickySearchSection === null;
  const desktopStickySearchOpen = desktopStickySearchSection !== null;
  const pickupSummary = pickupSummaryDisplay || t("carsResults.pickupLocation");
  const returnSummary =
    returnSummaryDisplay ||
    pickupSummaryDisplay ||
    t("carsResults.returnLocation");
  const rentalDateSummary = pickupDate
    ? dropoffDate
      ? `${formatCompactDate(
          pickupDate,
          intlLocale,
          t("carsResults.selectDates"),
        )} — ${formatCompactDate(
          dropoffDate,
          intlLocale,
          t("carsResults.selectDates"),
        )}`
      : formatCompactDate(pickupDate, intlLocale, t("carsResults.selectDates"))
    : t("carsResults.selectRentalDates");
  const driverAgeSummary = getDriverAgeOptionLabel(driverAge, t);
  const timeSummary = formatCarsCompactTimeRange(pickupTime, dropoffTime);
  const locationPairSummary = returnToDifferentLocation
    ? `${pickupSummary} → ${returnSummary}`
    : pickupSummary;
  const mobileSearchSecondarySummary = `${rentalDateSummary} · ${timeSummary} · ${driverAgeSummary}`;
  const openDesktopStickySearch = useCallback(
    (
      section: NonNullable<typeof desktopStickySearchSection>,
      launcher?: HTMLButtonElement,
    ) => {
      if (launcher) stickyLauncherRef.current = launcher;
      setOpenLocation(null);
      setDatesOpen(false);
      setTimesOpen(false);
      setDriverAgeOpen(false);
      setDesktopStickySearchSection(section);
    },
    [
      setOpenLocation,
      setDatesOpen,
      setTimesOpen,
      setDriverAgeOpen,
      setDesktopStickySearchSection,
    ],
  );
  const closeDesktopStickySearch = useCallback(() => {
    setDesktopStickySearchSection(null);
    setOpenLocation(null);
    setDatesOpen(false);
    setTimesOpen(false);
    setDriverAgeOpen(false);
    requestAnimationFrame(() =>
      stickyLauncherRef.current?.focus({ preventScroll: true }),
    );
  }, [
    setDesktopStickySearchSection,
    setOpenLocation,
    setDatesOpen,
    setTimesOpen,
    setDriverAgeOpen,
  ]);

  useEffect(() => {
    const form = searchFormRef.current;
    if (!form) return undefined;
    let frame = 0;
    let previous: boolean | null = null;
    const measure = () => {
      frame = 0;
      const next = shouldShowDesktopStickySearch({
        viewportWidth: window.innerWidth,
        formBottom: form.getBoundingClientRect().bottom,
      });
      if (next !== previous) {
        previous = next;
        setIsSearchBarCompact(next);
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(schedule);
    observer?.observe(form);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!desktopStickySearchOpen) return undefined;
    const scrollLock = lockDesktopPageScroll();
    stickyScrollLockRef.current = scrollLock;
    return () => {
      scrollLock.restore();
      if (stickyScrollLockRef.current === scrollLock) {
        stickyScrollLockRef.current = null;
      }
    };
  }, [desktopStickySearchOpen]);

  useEffect(() => {
    if (!desktopStickySearchOpen) return undefined;
    const media = window.matchMedia("(max-width: 1023px)");
    const closeBelowDesktop = () => {
      if (media.matches) closeDesktopStickySearch();
    };
    media.addEventListener("change", closeBelowDesktop);
    return () => media.removeEventListener("change", closeBelowDesktop);
  }, [desktopStickySearchOpen, closeDesktopStickySearch]);

  useEffect(() => {
    if (!desktopStickySearchSection) return undefined;
    const frame = requestAnimationFrame(() => {
      stickyDialogRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [desktopStickySearchSection]);

  useEffect(() => {
    if (!desktopStickySearchOpen) return undefined;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        if (datesOpen || timesOpen || driverAgeOpen) {
          setDatesOpen(false);
          setTimesOpen(false);
          setDriverAgeOpen(false);
        } else closeDesktopStickySearch();
        return;
      }
      if (event.key === "Tab" && stickyDialogRef.current) {
        const focusable = [
          ...stickyDialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ].filter(isSafelyFocusableElement);
        if (!focusable.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [
    desktopStickySearchOpen,
    closeDesktopStickySearch,
    datesOpen,
    timesOpen,
    driverAgeOpen,
  ]);

  useEffect(() => {
    const activeSearchRefs = desktopStickySearchOpen
      ? desktopStickySearchRefs
      : mobileSearchOpen
        ? mobileSearchRefs
        : desktopFullSearchRefs;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      const clickedInsidePickerPopover =
        target instanceof Element &&
        target.closest('[data-cars-results-picker-popover="true"]');

      if (clickedInsidePickerPopover) return;

      if (
        datesOpen &&
        !activeSearchRefs.dateWrapRef.current?.contains(target) &&
        !activeSearchRefs.datePopoverRef.current?.contains(target)
      ) {
        setDatesOpen(false);
      }

      if (
        timesOpen &&
        !activeSearchRefs.timeWrapRef.current?.contains(target) &&
        !activeSearchRefs.timePopoverRef.current?.contains(target)
      ) {
        setTimesOpen(false);
      }

      if (
        driverAgeOpen &&
        !activeSearchRefs.driverAgeWrapRef.current?.contains(target) &&
        !activeSearchRefs.driverAgePopoverRef.current?.contains(target)
      ) {
        setDriverAgeOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (desktopStickySearchOpen) return;
      if (event.key === "Escape") {
        setDatesOpen(false);
        setTimesOpen(false);
        setDriverAgeOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [
    datesOpen,
    desktopStickySearchOpen,
    driverAgeOpen,
    mobileSearchOpen,
    timesOpen,
    desktopFullSearchRefs,
    desktopStickySearchRefs,
    mobileSearchRefs,
  ]);

  const selectRentalDate = (date: Date) => {
    if (isBeforeToday(date)) {
      return;
    }

    const selectedIso = toIsoDate(date);

    if (!pickupDate || (pickupDate && dropoffDate)) {
      setPickupDate(selectedIso);
      setDropoffDate("");
      return;
    }

    if (selectedIso < pickupDate) {
      setPickupDate(selectedIso);
      setDropoffDate("");
      return;
    }

    setDropoffDate(selectedIso);
  };

  const openMobileSearchDrawer = useCallback(
    (launcher?: HTMLElement | null, modality: OverlayActivationModality = "programmatic") => {
      mobileSearchLauncherRef.current = launcher ?? null;
      mobileSearchModalityRef.current = modality;
      mobileSearchSnapshotRef.current = {
        pickupLocation,
        pickupLocationTarget,
        dropoffLocation,
        dropoffLocationTarget,
        returnToDifferentLocation,
        pickupDate,
        dropoffDate,
        pickupTime,
        dropoffTime,
        driverAge,
      };
      setMobileSearchClosing(false);
      setMobileSearchOpen(true);
      setMobilePicker(null);
      setDesktopStickySearchSection(null);
      setDatesOpen(false);
      setTimesOpen(false);
      setDriverAgeOpen(false);
    },
    [
      pickupLocation,
      pickupLocationTarget,
      dropoffLocation,
      dropoffLocationTarget,
      returnToDifferentLocation,
      pickupDate,
      dropoffDate,
      pickupTime,
      dropoffTime,
      driverAge,
      setMobileSearchOpen,
      setDesktopStickySearchSection,
      setDatesOpen,
      setTimesOpen,
      setDriverAgeOpen,
    ],
  );

  const cancelMobileSearchDrawer = useCallback(() => {
    if (mobileSearchCloseTimerRef.current !== null) {
      window.clearTimeout(mobileSearchCloseTimerRef.current);
      mobileSearchCloseTimerRef.current = null;
    }
    const snapshot = mobileSearchSnapshotRef.current;
    if (snapshot) {
      setPickupLocation(snapshot.pickupLocation);
      setPickupLocationTarget(snapshot.pickupLocationTarget);
      setDropoffLocation(snapshot.dropoffLocation);
      setDropoffLocationTarget(snapshot.dropoffLocationTarget);
      setReturnToDifferentLocation(snapshot.returnToDifferentLocation);
      setPickupDate(snapshot.pickupDate);
      setDropoffDate(snapshot.dropoffDate);
      setPickupTime(snapshot.pickupTime);
      setDropoffTime(snapshot.dropoffTime);
      setDriverAge(snapshot.driverAge);
    }
    mobileSearchSnapshotRef.current = null;
    // Keep the Results document untouched. The shared sheet owns the only
    // search scroll lock and releases it after the close animation completes.
    setMobileSearchOpen(false);
    setMobilePicker(null);
    setDatesOpen(false);
    setTimesOpen(false);
    setDriverAgeOpen(false);
    setMobileSearchClosing(false);
  }, [
    setMobileSearchOpen,
    setDatesOpen,
    setTimesOpen,
    setDriverAgeOpen,
  ]);

  const requestMobileSearchDrawerClose = useCallback(() => {
    if (mobileSearchClosing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cancelMobileSearchDrawer();
      return;
    }
    setMobileSearchClosing(true);
    mobileSearchCloseTimerRef.current = window.setTimeout(
      () => cancelMobileSearchDrawer(),
      300,
    );
  }, [cancelMobileSearchDrawer, mobileSearchClosing]);

  const validateCurrentPickupTime = useCallback(() => {
    const now = new Date();
    const validation = validateCarsForm(
      {
        pickupLocation,
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime,
        driverAge,
        returnToDifferentLocation,
        dropoffLocation: returnToDifferentLocation
          ? dropoffLocation
          : pickupLocation,
      },
      toIsoDate(now),
      toTimeValue(now),
    );
    const pickupTimeExpired =
      validation.pickupTime === "carsSearch.error.pickupTimePast";

    setSearchValidationError(
      pickupTimeExpired ? t("carsSearch.error.pickupTimePast") : "",
    );

    return !pickupTimeExpired;
  }, [
    driverAge,
    dropoffDate,
    dropoffLocation,
    dropoffTime,
    pickupDate,
    pickupLocation,
    pickupTime,
    returnToDifferentLocation,
    t,
  ]);

  useEffect(() => {
    setSearchValidationError("");
  }, [pickupDate, pickupTime]);

  const submitMobileSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (isSearchSubmittingRef.current) return;
      if (!validateCurrentPickupTime()) {
        setMobilePicker("times");
        return;
      }

      const formData = new FormData(event.currentTarget);
      const href = buildCarsResultsHref(formData);

      // Submission commits the live form. It must not run the cancel
      // snapshot or restore focus to the outgoing Results set.
      mobileSearchSnapshotRef.current = null;
      mobileSearchLauncherRef.current = null;

      const currentHref = `${window.location.pathname}${window.location.search}`;
      const isSameSearch = isSameCarsResultsHref(href, currentHref);

      if (!isSameSearch) {
        isSearchSubmittingRef.current = true;
        setIsSearchSubmitting(true);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }

      setMobileSearchOpen(false);
      setMobilePicker(null);
      setDatesOpen(false);
      setTimesOpen(false);
      setDriverAgeOpen(false);

      if (isSameSearch) return;

      router.push(href, { scroll: true });
    },
    [router, validateCurrentPickupTime],
  );

  useEffect(() => {
    if (mobileSearchOpen) return;
    restoreOverlayLauncherFocus(
      mobileSearchLauncherRef.current,
      mobileSearchModalityRef.current,
    );
  }, [mobileSearchOpen]);

  const renderMobileHeaderSearch = () => (
    <button
      type="button"
      data-cars-results-mobile-header-search
      aria-label={`${t("deals.results.modifySearch")}: ${locationPairSummary}, ${mobileSearchSecondarySummary}`}
      aria-haspopup="dialog"
      aria-expanded={mobileSearchOpen}
      onClick={(event) =>
        openMobileSearchDrawer(
          event.currentTarget,
          getOverlayActivationModality(event),
        )
      }
      className="focus-ring flex h-full w-full min-w-0 touch-manipulation items-center gap-1.5 rounded-xl bg-[#F5F7FB] py-1 pe-2 ps-3 text-start transition hover:bg-[#EDF2FA] [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
    >
      <span
        data-cars-results-mobile-search-summary
        className="flex min-w-0 flex-1 flex-col justify-center"
      >
        <span
          title={locationPairSummary}
          className="block truncate text-[14px] font-semibold leading-[18px] text-[#142033]"
        >
          {locationPairSummary}
        </span>
        <span
          title={mobileSearchSecondarySummary}
          className="mt-0.5 block truncate text-[11px] font-medium leading-[15px] text-[#536B92]"
        >
          {mobileSearchSecondarySummary}
        </span>
      </span>
      <span
        data-cars-results-mobile-search-edit
        aria-hidden="true"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#142033]"
      >
        <SquarePen size={15} strokeWidth={2} />
      </span>
    </button>
  );

  const renderCarsSearchForm = (
    placement: "desktop-full" | "desktop-navbar" | "desktop-sticky" | "mobile",
  ) => {
    const idPrefix =
      placement === "desktop-navbar"
        ? "cars-results-nav-search"
        : placement === "desktop-full"
          ? "cars-results-full-search"
          : placement === "desktop-sticky"
            ? "sticky-cars-search"
            : "cars-results-mobile-search";
    const surfaceOwnsPopovers =
      placement === "desktop-sticky"
        ? Boolean(desktopStickySearchSection)
        : placement === "mobile"
          ? mobileSearchOpen
          : !desktopStickySearchSection && !mobileSearchOpen;
    const isNavbarSearch = placement === "desktop-navbar";
    const isCompactSearch = placement === "desktop-sticky" || isNavbarSearch;
    const searchSurfaceRefs =
      placement === "desktop-sticky"
        ? desktopStickySearchRefs
        : placement === "mobile"
          ? mobileSearchRefs
          : desktopFullSearchRefs;
    const locationStrings = {
      locationSuggestions: t("carsSearch.locationSuggestions"),
      popularLocations: t("carsSearch.popularLocations"),
      loadingSuggestions: t("carsSearch.loadingSuggestions"),
      noMatchingLocations: t("carsSearch.noMatchingLocations"),
      suggestionsUnavailable: t("carsSearch.suggestionsUnavailable"),
      continueTypingManually: t("carsSearch.continueTypingManually"),
      useTypedLocation: t("carsSearch.useTypedLocation"),
      unverifiedTypedLocation: t("carsSearch.unverifiedTypedLocation"),
      airport: t("carsSearch.airport"),
      city: t("carsSearch.city"),
      area: t("carsSearch.area"),
      customLocation: t("carsSearch.customLocation"),
    };

    return (
      <form
        ref={placement === "desktop-full" ? searchFormRef : undefined}
        id={`${idPrefix}-form`}
        action="/cars/results"
        method="get"
        data-cars-results-navbar-search={isNavbarSearch ? "" : undefined}
        className={cn("mx-auto w-full min-w-0", isNavbarSearch ? "max-w-full" : "max-w-5xl", placement === "mobile" && "bg-transparent")}
        onSubmit={(event) => {
          if (placement === "mobile") {
            submitMobileSearch(event);
            return;
          }

          if (!validateCurrentPickupTime()) {
            event.preventDefault();
            if (placement === "desktop-sticky") {
              setDesktopStickySearchSection("times");
            }
            setTimesOpen(true);
            return;
          }

          setDesktopStickySearchSection(null);
        }}
      >
        <input type="hidden" name="pickupDate" value={pickupDate} />
        <input type="hidden" name="dropoffDate" value={dropoffDate} />
        <input type="hidden" name="pickupTime" value={pickupTime} />
        <input type="hidden" name="dropoffTime" value={dropoffTime} />
        <input type="hidden" name="driverAge" value={driverAge} />
        {pickupLocationTarget ? (
          <input
            type="hidden"
            name="pickupLocationTarget"
            value={pickupLocationTarget}
          />
        ) : null}
        {returnToDifferentLocation && dropoffLocationTarget ? (
          <input
            type="hidden"
            name="dropoffLocationTarget"
            value={dropoffLocationTarget}
          />
        ) : null}
        {returnToDifferentLocation ? (
          <input type="hidden" name="returnToDifferentLocation" value="1" />
        ) : null}
        <div
          className={cn(
            "overflow-visible transition-[padding,border-color,box-shadow,border-radius] duration-200",
            placement === "mobile"
              ? "border-0 bg-transparent p-0 shadow-none ring-0"
              : isNavbarSearch
                ? "rounded-xl border border-[#CFD9E5] bg-white p-0 shadow-[0_6px_20px_-13px_rgba(20,32,51,0.28)] ring-0"
                : isCompactSearch
                  ? "rounded-xl border border-slate-200 bg-white p-0 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.64)]"
                  : "rounded-[1.15rem] border border-slate-200 bg-white/95 p-1 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.58)] ring-1 ring-slate-200/50",
          )}
        >
          <div
            className={cn(
              placement === "mobile" && "grid grid-cols-1 gap-[10px]",
              placement !== "mobile" && (returnToDifferentLocation
                ? differentReturnSearchGridClass
                : sameReturnSearchGridClass),
            )}
            data-cars-results-navbar-grid={isNavbarSearch ? "" : undefined}
            data-return-location-mode={
              returnToDifferentLocation ? "different" : "same"
            }
          >
            {placement === "mobile" ? (
              <MobileLocationLauncher
                buttonRef={pickupLocationLauncherRef}
                icon={MapPin}
                label={
                  t("carsResults.pickupLocationLabel") ||
                  t("carsResults.pickupLocation")
                }
                value={pickupLocation}
                placeholder={t("carsSearch.pickupLocationPlaceholder")}
                onClick={() =>
                  openMobilePickerWithKeyboard(
                    () => setMobilePicker("pickupLocation"),
                    "cars-results-pickup-mobile-input",
                  )
                }
                className="lg:rounded-s-xl"
                groupedMobile
              />
            ) : (
              <SearchInputCell
                idPrefix={idPrefix}
                icon={isNavbarSearch ? Car : MapPin}
                inputRef={searchSurfaceRefs.pickupInputRef}
                isCompact={isCompactSearch}
                label={
                  t("carsResults.pickupLocationLabel") ||
                  t("carsResults.pickupLocation")
                }
                name="pickupLocation"
                onChange={(nextValue) => {
                  setPickupLocation(nextValue);
                  setPickupLocationTarget("");
                }}
                onSelect={(suggestion) => {
                  setPickupLocationTarget(
                    serializeSuggestionLocationTarget(suggestion),
                  );
                }}
                isOpen={surfaceOwnsPopovers && openLocation === "pickup"}
                onOpenChange={(open) => {
                  setOpenLocation(open ? "pickup" : null);
                  if (open) {
                    setDatesOpen(false);
                    setTimesOpen(false);
                    setDriverAgeOpen(false);
                  }
                }}
                onClear={() => {
                  setPickupLocation("");
                  setPickupLocationTarget("");
                  searchSurfaceRefs.pickupInputRef.current?.focus();
                }}
                placeholder={t("carsSearch.pickupLocationPlaceholder")}
                showClearButton={false}
                value={pickupLocation}
                clearLabel={t("carsSearch.clearPickupLocation")}
                strings={locationStrings}
                className="lg:rounded-s-xl"
              />
            )}
            {returnToDifferentLocation ? (
              placement === "mobile" ? (
                <MobileLocationLauncher
                  buttonRef={returnLocationLauncherRef}
                  icon={MapPin}
                  label={
                    t("carsResults.returnLocationLabel") ||
                    t("carsResults.returnLocation")
                  }
                  value={dropoffLocation}
                  placeholder={t("carsSearch.returnLocationPlaceholder")}
                  onClick={() =>
                    openMobilePickerWithKeyboard(
                      () => setMobilePicker("returnLocation"),
                      "cars-results-return-mobile-input",
                    )
                  }
                  secondaryAction={{
                    label: t("carsResults.sameAsPickup"),
                    onClick: () => {
                      setReturnToDifferentLocation(false);
                      setDropoffLocation("");
                      setDropoffLocationTarget("");
                      setMobilePicker(null);
                    },
                  }}
                  groupedMobile
                />
              ) : (
                <SearchInputCell
                  idPrefix={idPrefix}
                  icon={MapPin}
                  inputRef={searchSurfaceRefs.dropoffInputRef}
                  isCompact={isCompactSearch}
                  label={
                    t("carsResults.returnLocationLabel") ||
                    t("carsResults.returnLocation")
                  }
                  name="dropoffLocation"
                  onChange={(nextValue) => {
                    setDropoffLocation(nextValue);
                    setDropoffLocationTarget("");
                  }}
                  onSelect={(suggestion) => {
                    setDropoffLocationTarget(
                      serializeSuggestionLocationTarget(suggestion),
                    );
                  }}
                  isOpen={surfaceOwnsPopovers && openLocation === "dropoff"}
                  onOpenChange={(open) => {
                    setOpenLocation(open ? "dropoff" : null);
                    if (open) {
                      setDatesOpen(false);
                      setTimesOpen(false);
                      setDriverAgeOpen(false);
                    }
                  }}
                  onClear={() => {
                    setDropoffLocation("");
                    setDropoffLocationTarget("");
                    searchSurfaceRefs.dropoffInputRef.current?.focus();
                  }}
                  placeholder={t("carsResults.sameAsPickup")}
                  showClearButton={false}
                  value={dropoffLocation}
                  clearLabel={t("carsSearch.clearReturnLocation")}
                  strings={locationStrings}
                  secondaryAction={{
                    label: t("carsResults.sameAsPickup"),
                    onClick: () => {
                      searchSurfaceRefs.pickupInputRef.current?.focus({
                        preventScroll: true,
                      });
                      setReturnToDifferentLocation(false);
                      setDropoffLocation("");
                      setDropoffLocationTarget("");
                      setOpenLocation(null);
                    },
                  }}
                />
              )
            ) : null}
            {placement === "mobile" ? (
              <>
                <input
                  type="hidden"
                  name="pickupLocation"
                  value={pickupLocation}
                />
                {returnToDifferentLocation ? (
                  <input
                    type="hidden"
                    name="dropoffLocation"
                    value={dropoffLocation}
                  />
                ) : null}
              </>
            ) : null}
            <SearchDateCell
              dropoffDate={dropoffDate}
              isCompact={isCompactSearch}
              doneButtonVariant={placement === "mobile" ? "neutral" : "brand"}
              isOpen={
                placement !== "mobile" && surfaceOwnsPopovers && datesOpen
              }
              onClear={() => {
                setPickupDate("");
                setDropoffDate("");
              }}
              onDone={() => {
                setDatesOpen(false);
              }}
              onNextMonth={() => {
                setVisibleMonthDate((current) => addMonths(current, 1));
              }}
              onPreviousMonth={() => {
                setVisibleMonthDate((current) => addMonths(current, -1));
              }}
              onSelectDate={selectRentalDate}
              onToggle={() => {
                if (placement === "mobile") {
                  setMobilePicker("dates");
                  return;
                }
                setDatesOpen((current) => !current);
                setOpenLocation(null);
                setTimesOpen(false);
                setDriverAgeOpen(false);
              }}
              pickupDate={pickupDate}
              useCompactDateSummary={placement !== "mobile"}
              showRentalDuration={placement === "desktop-full"}
              visibleMonthDate={visibleMonthDate}
              t={t}
              intlLocale={intlLocale}
              wrapRef={searchSurfaceRefs.dateWrapRef}
              popoverRef={searchSurfaceRefs.datePopoverRef}
              groupedMobile={placement === "mobile"}
            />
            <SearchTimeCell
              dropoffTime={dropoffTime}
              isCompact={isCompactSearch}
              isOpen={
                placement !== "mobile" && surfaceOwnsPopovers && timesOpen
              }
              onToggle={() => {
                if (placement === "mobile") {
                  setMobilePicker("times");
                  return;
                }
                setTimesOpen((current) => !current);
                setOpenLocation(null);
                setDatesOpen(false);
                setDriverAgeOpen(false);
              }}
              pickupTime={pickupTime}
              setDropoffTime={(nextTime) => {
                setDropoffTime(nextTime);
              }}
              setPickupTime={(nextTime) => {
                setPickupTime(nextTime);
              }}
              t={t}
              intlLocale={intlLocale}
              wrapRef={searchSurfaceRefs.timeWrapRef}
              popoverRef={searchSurfaceRefs.timePopoverRef}
              useMainPageDesktopPresentation={placement !== "mobile"}
              groupedMobile={placement === "mobile"}
            />
            <DriverAgeCell
              driverAge={driverAge}
              isCompact={isCompactSearch}
              navbarCompact={isNavbarSearch}
              isOpen={
                placement !== "mobile" && surfaceOwnsPopovers && driverAgeOpen
              }
              onSelect={(age) => {
                setDriverAge(age);
              }}
              onToggle={() => {
                if (placement === "mobile") {
                  setMobilePicker("driverAge");
                  return;
                }
                setDriverAgeOpen((current) => !current);
                setOpenLocation(null);
                setDatesOpen(false);
                setTimesOpen(false);
              }}
              t={t}
              wrapRef={searchSurfaceRefs.driverAgeWrapRef}
              popoverRef={searchSurfaceRefs.driverAgePopoverRef}
              useMainPageDesktopPresentation={placement !== "mobile"}
              groupedMobile={placement === "mobile"}
            />
            <Button
              type="submit"
              aria-label={t("search")}
              data-cars-results-navbar-submit={isNavbarSearch ? "" : undefined}
              className={cn(
                "h-12 w-full rounded-[10px] bg-[#004BB8] px-4 text-[15px] font-semibold text-white shadow-none transition-colors duration-200 hover:bg-[#021C2B] lg:m-[4px] lg:h-auto lg:min-h-[54px] lg:w-[calc(100%-8px)] lg:self-stretch lg:rounded-[9px] lg:text-[15px] lg:tracking-normal lg:ring-1 lg:ring-[#075EE8]/12",
                placement === "mobile" && "hidden",
              )}
            >
              {isNavbarSearch ? (
                <Search className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
              ) : (
                t("search")
              )}
            </Button>
          </div>
        </div>
        {searchValidationError ? (
          <p
            role="alert"
            className={cn(
              "mt-2 text-sm font-semibold text-rose-600",
              placement === "mobile" && "px-1",
            )}
          >
            {searchValidationError}
          </p>
        ) : null}
        {placement === "mobile" ? (
          <Button
            type="submit"
            data-cars-mobile-search-submit
            className="cars-results-edit-submit mt-3 h-[52px] w-full rounded-[12px] bg-[#064CF7] px-4 text-[16px] font-semibold text-white shadow-none transition-colors hover:bg-[#004BB8]"
          >
            {t("search")}
          </Button>
        ) : null}
      </form>
    );
  };

  if (isSearchSubmitting) {
    return (
      <main className="flex min-h-[calc(100svh-5rem)] flex-1 bg-[#F5F7FB] sm:bg-[#f6f8fb] lg:bg-white">
        <BrandedLoading
          variant="fullscreen"
          visual="logoPulse"
          showProgress={false}
          className="min-h-[calc(100svh-5rem)] flex-1 bg-transparent px-5"
          contentClassName="max-w-md text-center"
          title={t("carsResults.loading.title")}
          messages={[
            t("carsResults.loading.checkingCarsAndRates"),
            t("carsResults.loading.comparingVehiclesAndProviders"),
            t("carsResults.loading.findingBestAvailableOptions"),
            t("carsResults.loading.preparingResults"),
          ]}
        />
      </main>
    );
  }

  return (
    <>
    {desktopNavSearchTarget && !mobileSearchOpen
      ? createPortal(
          renderCarsSearchForm("desktop-navbar"),
          desktopNavSearchTarget,
        )
      : null}
    {mobileNavSearchTarget
      ? createPortal(renderMobileHeaderSearch(), mobileNavSearchTarget)
      : null}
    <main className="flex-1 bg-[#F5F7FB] sm:bg-[#f6f8fb] lg:bg-white pb-8">
      <MobileDatePickerDialog
        presentation="carsResultsEdit"
        open={mobileSearchOpen && mobilePicker === "dates"}
        title={t("carsSearch.chooseRentalDates")}
        titleId="cars-results-mobile-rental-dates-title"
        dialogId="cars-results-mobile-rental-dates"
        launcherRef={mobileSearchRefs.dateWrapRef}
        startDate={pickupDate}
        endDate={dropoffDate}
        rangeRequired
        firstMonth={visibleMonthDate}
        locale={intlLocale}
        weekdays={getWeekdays(intlLocale)}
        labels={{
          selectDates: t("carsResults.selectDates"),
          start: "Pick-up date",
          end: "Return date",
          done: t("done"),
          selectDatePrefix: t("carsSearch.selectDateAriaPrefix"),
        }}
        isDateDisabled={isBeforeToday}
        onCommit={(nextPickupDate, nextDropoffDate) => {
          setPickupDate(nextPickupDate);
          setDropoffDate(nextDropoffDate);
        }}
        onClose={() => setMobilePicker(null)}
      />

      <MobileCarLocationPicker
        presentation="carsResultsEdit"
        open={mobileSearchOpen && mobilePicker === "pickupLocation"}
        mode="pickup"
        inputId="cars-results-pickup-mobile-input"
        value={pickupLocation}
        launcherRef={pickupLocationLauncherRef}
        commitOnSelect
        onCommit={(nextValue, suggestion) => {
          setPickupLocation(nextValue);
          setPickupLocationTarget(
            serializeSuggestionLocationTarget(suggestion),
          );
        }}
        onClose={() => setMobilePicker(null)}
      />

      <MobileCarLocationPicker
        presentation="carsResultsEdit"
        open={mobileSearchOpen && mobilePicker === "returnLocation"}
        mode="return"
        inputId="cars-results-return-mobile-input"
        value={dropoffLocation}
        launcherRef={returnLocationLauncherRef}
        commitOnSelect
        onCommit={(nextValue, suggestion) => {
          setDropoffLocation(nextValue);
          setDropoffLocationTarget(
            serializeSuggestionLocationTarget(suggestion),
          );
        }}
        onClose={() => setMobilePicker(null)}
      />

      <MobileCarTimePickerDialog
        presentation="carsResultsEdit"
        open={mobileSearchOpen && mobilePicker === "times"}
        launcherRef={mobileSearchRefs.timeWrapRef}
        onClose={() => setMobilePicker(null)}
        pickupTime={pickupTime}
        returnTime={dropoffTime}
        onCommit={(nextPickupTime, nextDropoffTime) => {
          setPickupTime(nextPickupTime);
          setDropoffTime(nextDropoffTime);
        }}
        formatTime={(time) => formatTimeLabel(time, intlLocale)}
        title={t("carsSearch.pickupReturnTimeLabel")}
        intro={t("carsSearch.mobileTimeIntro")}
        pickupLabel={t("carsSearch.pickupTimeLabel")}
        returnLabel={t("carsSearch.returnTimeLabel")}
        doneLabel={t("done")}
      />

      <MobileCarDriverAgePickerDialog
        presentation="carsResultsEdit"
        open={mobileSearchOpen && mobilePicker === "driverAge"}
        launcherRef={mobileSearchRefs.driverAgeWrapRef}
        onClose={() => setMobilePicker(null)}
        driverAge={driverAge}
        onCommit={setDriverAge}
        title={t("carsSearch.driverAgeLabel")}
        intro={t("carsSearch.mobileDriverAgeIntro")}
        anyAgeLabel={t("carsSearch.driverAgeAnyAgeRange")}
        formatAge={(age) => age}
        doneLabel={t("done")}
      />

      <MobileResultsEditSheet
        appearance="carsResultsEdit"
        open={mobileSearchOpen}
        browserCanvasColor="#ffffff"
        freezeBodyPosition
        isolatedBackdrop
        closing={mobileSearchClosing}
        onCloseAnimationComplete={cancelMobileSearchDrawer}
        title={t("carsResults.editCarSearch")}
        nestedLayerOpen={mobilePicker !== null}
        onClose={requestMobileSearchDrawerClose}
      >
        <div className="mx-auto w-full max-w-xl">
          {mobileSearchOpen ? renderCarsSearchForm("mobile") : null}
        </div>
      </MobileResultsEditSheet>

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-[1000] hidden px-4 transition-all duration-200 lg:block",
          showCompactSearchSummary
            ? "translate-y-0 opacity-100"
            : "-translate-y-3 opacity-0",
        )}
        aria-hidden={!showCompactSearchSummary}
        inert={!showCompactSearchSummary ? true : undefined}
      >
        <div
          className="mx-auto grid h-[58px] w-full max-w-[920px] grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.85fr)_104px] overflow-hidden rounded-lg border border-slate-200/95 bg-[#EEF1F5] shadow-[0_12px_30px_-18px_rgba(15,23,42,0.38)] ring-1 ring-slate-950/[0.03] pointer-events-auto"
          data-cars-results-compact-search-summary
        >
          {(
            [
              [
                "locations",
                locationPairSummary,
                MapPin,
                t("carsResults.pickupLocationLabel"),
              ],
              [
                "dates",
                rentalDateSummary,
                CalendarDays,
                t("carsResults.rentalDatesLabel"),
              ],
              [
                "times",
                timeSummary,
                Clock3,
                t("carsResults.pickupReturnTimeLabel"),
              ],
              [
                "driverAge",
                driverAgeSummary,
                UserRound,
                t("carsResults.driverAgeLabel"),
              ],
            ] as const
          ).map(([section, summary, Icon, label]) => (
            <button
              key={section}
              ref={(node) => {
                if (desktopStickySearchSection === section && node)
                  stickyLauncherRef.current = node;
              }}
              type="button"
              aria-label={label}
              onClick={(event) => {
                openDesktopStickySearch(section, event.currentTarget);
              }}
              className="focus-ring flex h-[56px] min-w-0 items-center gap-2.5 border-e border-slate-200/85 px-3 text-start transition-colors hover:bg-[#E7EBF1] focus-visible:bg-[#E7EBF1]"
            >
              <Icon
                className="cars-results-navbar-leading-icon h-4 w-4 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span
                title={summary}
                className="min-w-0 truncate whitespace-nowrap text-[15px] font-semibold leading-5 tracking-[-0.005em] text-[#142033]"
              >
                {summary}
              </span>
            </button>
          ))}
          <div className="flex items-center justify-center px-1">
            <button
              type="button"
              onClick={(event) => {
                if (pickupLocation.trim() && pickupDate && dropoffDate)
                  searchFormRef.current?.requestSubmit();
                else {
                  openDesktopStickySearch(
                    !pickupLocation.trim() ? "locations" : "dates",
                    event.currentTarget,
                  );
                }
              }}
              className="focus-ring h-10 w-24 rounded-lg bg-[#004BB8] text-[15px] font-bold tracking-[-0.005em] text-white transition hover:bg-[#021C2B]"
            >
              {t("search")}
            </button>
          </div>
        </div>
      </div>

      {desktopStickySearchSection ? (
        <div
          className="fixed inset-0 z-[1100] hidden bg-slate-950/30 backdrop-blur-[2px] lg:block"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              closeDesktopStickySearch();
          }}
        >
          <div
            className="flex min-h-dvh items-start justify-center px-6 pb-10 pt-12 xl:pt-16"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget)
                closeDesktopStickySearch();
            }}
          >
            <div
              ref={stickyDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="sticky-cars-search-title"
              tabIndex={-1}
              onMouseDown={(event) => event.stopPropagation()}
              className={cn(
                "w-full rounded-2xl border border-slate-200 bg-white p-4 text-start shadow-[0_30px_90px_-32px_rgba(15,23,42,0.72)] ring-1 ring-white",
                returnToDifferentLocation ? "max-w-5xl" : "max-w-4xl",
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200/80 pb-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase leading-4 tracking-[0.05em] text-[#004BB8]">
                    {t("carsResults.searchCars")}
                  </p>
                  <h2
                    id="sticky-cars-search-title"
                    className="mt-1 truncate text-[19px] font-bold leading-6 tracking-[-0.012em] text-[#07133B]"
                  >
                    {locationPairSummary}
                  </h2>
                  <p className="mt-1 truncate text-[14px] font-medium leading-5 text-[#526174]">
                    {rentalDateSummary} · {timeSummary} · {driverAgeSummary}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t("carsResults.closeEditSearch")}
                  onClick={closeDesktopStickySearch}
                  className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {renderCarsSearchForm("desktop-sticky")}
            </div>
          </div>
        </div>
      ) : null}

      <section
        className="hidden bg-[#f6f8fb] pb-0 pt-7 sm:block lg:hidden"
        aria-labelledby="cars-results-heading"
      >
        <div className="page-shell">
          <div className="relative z-10 min-w-0 translate-y-5">
            {!mobileSearchOpen ? renderCarsSearchForm("desktop-full") : null}
          </div>
        </div>
      </section>

      <div
        ref={resultsGridRef}
        data-cars-results-scroll-region
        className="page-shell max-sm:w-[calc(100%_-_28px)] pb-6 pt-3 sm:pt-6 lg:max-w-[1020px] lg:pt-5"
      >
        <CarsResultsExperience
          results={initialResults}
          search={values}
          inventoryStatus={inventoryStatus}
          hasSearchContext={hasSearchContext}
          resultHeadingId="cars-results-heading"
          detailsHrefForCar={(car) => resultActionHref(car, buildCarDetailsHref(car.id, values))}
        />
      </div>
    </main>
    <Footer variant="brand-legal-only" className="cars-results-footer-typography" />
    <CarsResultsScrollIndicator />
    </>
  );
}

export function CarsResultsExperience({
  results: providerResults,
  search,
  inventoryStatus,
  hasSearchContext,
  resultHeadingId = "cars-results-experience-heading",
  resultHeading,
  embedded = false,
  detailsHrefForCar,
  actionLabel,
  actionAriaLabelForCar,
  onSelectCar,
  resultHeadingRef,
  presentation = "standalone",
  isCarSelectable,
}: {
  results: NormalizedCarResult[];
  search: CarSearchParams;
  inventoryStatus: CarInventoryStatus;
  hasSearchContext: boolean;
  resultHeadingId?: string;
  resultHeading?: string;
  resultHeadingRef?: RefObject<HTMLHeadingElement | null>;
  embedded?: boolean;
  presentation?: "standalone" | "guided-planning";
  isCarSelectable?: (car: NormalizedCarResult) => boolean;
  detailsHrefForCar: (car: NormalizedCarResult) => string | null;
  actionLabel?: string;
  actionAriaLabelForCar?: (car: NormalizedCarResult) => string;
  onSelectCar?: (car: NormalizedCarResult) => void;
}) {
  const { locale, t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const t = useCallback((key: string) => dictionary[key] ?? enTranslations[key] ?? "", [dictionary]);
  const intlLocale = getCarsResultsIntlLocale(locale);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileNavFilterTarget, setMobileNavFilterTarget] =
    useState<HTMLElement | null>(null);
  const [showMobileHeaderFilter, setShowMobileHeaderFilter] = useState(false);
  const kayak = useKayakResults();
  const results = useMemo(() => presentation !== "standalone" || kayak?.vertical !== "cars" ? providerResults : [
    ...providerResults, ...kayak.offers.map(offer => kayakCarCardModel(offer,Math.max(1,Math.ceil((Date.parse(search.dropoffDate)-Date.parse(search.pickupDate))/86400000)||1),search.pickupLocation)),
  ],[presentation,kayak,providerResults,search.dropoffDate,search.pickupDate,search.pickupLocation]);
  const providersLoading = presentation === "standalone" && kayak?.vertical === "cars" && kayak.status === "loading";
  const [quickFilterGroupId, setQuickFilterGroupId] = useState<string | null>(null);
  const [quickFilterDraft, setQuickFilterDraft] = useState<string[]>([]);
  const [quickSortDraft, setQuickSortDraft] = useState<CarSort>("recommended");
  const [quickFilterClosing, setQuickFilterClosing] = useState(false);
  const quickFilterClosingRef = useRef(false);
  const quickFilterGroupIdRef = useRef<string | null>(null);
  const quickFilterCloseTimerRef = useRef<number | null>(null);
  const quickFilterOverlayOpen = quickFilterGroupId !== null;
  const mobileFiltersOverlayOpen = filtersOpen || quickFilterOverlayOpen;
  const filtersButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileShortcutsRef = useRef<HTMLDivElement | null>(null);
  const mobileFiltersLauncherRef = useRef<HTMLButtonElement | null>(null);
  const mobileFiltersModalityRef = useRef<OverlayActivationModality>("programmatic");
  const filtersDialogRef = useRef<HTMLElement | null>(null);
  const filtersCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const quickFiltersDialogRef = useRef<HTMLElement | null>(null);
  const quickFiltersCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileFiltersScrollLockRef = useRef<MobileResultsScrollLockRelease | null>(
    null,
  );
  const [selectedCarFilters, setSelectedCarFilters] = useState<SelectedCarFilters>({});
  const selectedCarFiltersRef = useRef(selectedCarFilters);
  const mobileFilterDrawerInitialFiltersRef = useRef(
    getSelectedCarFiltersSignature(selectedCarFilters),
  );
  const filterUrlReadyRef = useRef(false);
  const [sort, setSort] = useState<CarSort>(
    presentation === "guided-planning" ? "lowestTotal" : "recommended",
  );
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [carsSortOpen, setCarsSortOpen] = useState(false);
  const [filterTransitionPhase, setFilterTransitionPhase] =
    useState<CarsFilterTransitionPhase>("idle");
  const [filterTransitionMinHeight, setFilterTransitionMinHeight] = useState<
    number | null
  >(null);
  const [selectedDealOfferIds, setSelectedDealOfferIds] = useState<
    Record<string, string>
  >({});
  const paginationListRef = useRef<HTMLDivElement | null>(null);
  const filterTransitionTimerRef = useRef<number | null>(null);
  const filterTransitionFrameRef = useRef<number | null>(null);
  const filterTransitionRunRef = useRef(0);
  const filterTransitionMobileRef = useRef(false);
  const carsSortRef = useRef<HTMLDivElement | null>(null);
  const carsSortButtonRef = useRef<HTMLButtonElement | null>(null);
  const desktopFilterSidebarRef = useRef<HTMLElement | null>(null);
  const desktopFilterSentinelRef = useRef<HTMLDivElement | null>(null);
  const desktopCompactFilterRef = useRef<HTMLDivElement | null>(null);
  const carsResultsBodyRef = useRef<HTMLDivElement | null>(null);
  const [showDesktopCompactFilter, setShowDesktopCompactFilter] =
    useState(false);
  const [desktopCompactFilterFrame, setDesktopCompactFilterFrame] =
    useState<DesktopCompactFilterFrame | null>(null);
  const [desktopCompactFilterPlacement, setDesktopCompactFilterPlacement] =
    useState<DesktopCompactFilterPlacementState>("hidden");

  useLayoutEffect(() => {
    selectedCarFiltersRef.current = selectedCarFilters;
  }, [selectedCarFilters]);

  useEffect(() => {
    if (presentation !== "standalone" || typeof window === "undefined")
      return undefined;

    const frame = window.requestAnimationFrame(() => {
      setMobileNavFilterTarget(
        document.querySelector<HTMLElement>(
          "[data-cars-results-mobile-nav-filter]",
        ),
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [presentation]);

  useEffect(() => {
    if (presentation !== "standalone" || typeof window === "undefined")
      return undefined;

    let frame = 0;
    const media = window.matchMedia("(max-width: 639px)");

    const measureMobileFilterHandoff = () => {
      frame = 0;
      if (!media.matches) {
        setShowMobileHeaderFilter(false);
        return;
      }

      const shortcuts = mobileShortcutsRef.current;
      const header = document.querySelector<HTMLElement>("[data-app-header]");
      if (!shortcuts || !header) {
        setShowMobileHeaderFilter(false);
        return;
      }

      const nextVisible =
        shortcuts.getBoundingClientRect().bottom <=
        header.getBoundingClientRect().bottom;

      setShowMobileHeaderFilter((current) =>
        current === nextVisible ? current : nextVisible,
      );
    };

    const schedule = () => {
      if (!frame)
        frame = window.requestAnimationFrame(measureMobileFilterHandoff);
    };

    const observer =
      "ResizeObserver" in window ? new ResizeObserver(schedule) : null;
    observer?.observe(document.documentElement);
    if (mobileShortcutsRef.current)
      observer?.observe(mobileShortcutsRef.current);

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    media.addEventListener("change", schedule);
    schedule();

    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      media.removeEventListener("change", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [presentation]);
  const desktopCompactFilterVisibilityRef = useRef(false);
  const desktopCompactFilterPlacementRef =
    useRef<DesktopCompactFilterPlacementState>("hidden");
  const desktopCompactFilterFrameRef = useRef<DesktopCompactFilterFrame | null>(
    null,
  );
  const desktopCompactFilterHeightRef = useRef(1);
  const scheduleDesktopCompactFilterMeasurementRef = useRef<
    (() => void) | null
  >(null);
  const activeFilterCount = useMemo(
    () =>
      Object.values(selectedCarFilters).reduce(
        (count, selectedOptions) => count + selectedOptions.length,
        0,
      ),
    [selectedCarFilters],
  );
  const activeFilterLabel = interpolate(t("carsResults.activeFilterCount"), {
    count: String(activeFilterCount),
  });
  const displayPricePerDay = useCallback((car: NormalizedCarResult) => {
    const offer = [...car.offers].filter((item) => Number.isFinite(item.totalPrice) && item.totalPrice >= 0)
      .sort((left, right) => left.totalPrice - right.totalPrice || left.pricePerDay - right.pricePerDay || left.id.localeCompare(right.id))[0];
    if (!offer) return undefined;
    return formatDisplayPrice({
      amount: offer.pricePerDay,
      sourceCurrency: offer.currency,
      displayCurrency: selectedOption.currency,
      convertSourceEstimate: true,
      rates: currencyRates.rates,
      isFallbackRate: currencyRates.isFallback,
    }).amount;
  }, [currencyRates.isFallback, currencyRates.rates, selectedOption.currency]);
  const visibleCarFilterGroups = useMemo(() => carFilterGroups.map((group) => ({
    ...group,
    options: group.options.map((option) => ({
      ...option,
      count: results.filter((car) => doesCarMatchFilterOption(car, option.id, displayPricePerDay)).length,
    })).filter((option) => group.id === "pricePerDay" || option.count > 0),
  })).filter((group) => group.options.length > 0), [displayPricePerDay, results]);
  const appliedCarFilters = useMemo(() => visibleCarFilterGroups.flatMap((group) =>
    (selectedCarFilters[group.id] ?? []).map((optionId) => {
      const option = group.options.find((item) => item.id === optionId);
      return option ? { groupId: group.id, optionId, label: option.label ?? t(option.labelKey) } : null;
    }).filter((item): item is { groupId: string; optionId: string; label: string } => Boolean(item))), [selectedCarFilters, visibleCarFilterGroups, t]);
  const activeQuickFilterGroup = quickFilterGroupId
    ? visibleCarFilterGroups.find((group) => group.id === quickFilterGroupId) ?? null
    : null;

  useEffect(() => {
    const readUrlFilters = () => {
      const value = new URLSearchParams(window.location.search).get("filters");
      const next: SelectedCarFilters = {};
      value?.split(",").forEach((token) => {
        const [group, option] = token.split(":");
        if (group && option && visibleCarFilterGroups.some((item) => item.id === group && item.options.some((choice) => choice.id === option)))
          next[group] = [...(next[group] ?? []), option];
      });
      setSelectedCarFilters(next);
      filterUrlReadyRef.current = true;
    };
    readUrlFilters();
    window.addEventListener("popstate", readUrlFilters);
    return () => window.removeEventListener("popstate", readUrlFilters);
  }, [visibleCarFilterGroups]);

  useEffect(() => {
    if (!filterUrlReadyRef.current) return;
    const url = new URL(window.location.href);
    const value = Object.entries(selectedCarFilters).flatMap(([group, options]) => options.map((option) => `${group}:${option}`)).join(",");
    if (value) url.searchParams.set("filters", value); else url.searchParams.delete("filters");
    window.history.replaceState(window.history.state, "", url);
  }, [selectedCarFilters]);
  const guidedPlanning = presentation === "guided-planning";
  const carSortOptions: { value: CarSort; label: string }[] = guidedPlanning
    ? [
        {
          value: "lowestTotal",
          label: t("deals.guided.carResults.lowestEstimatedTotal"),
        },
      ]
    : [
        { value: "recommended", label: t("carsResults.recommended") },
        { value: "lowestTotal", label: t("carsResults.lowestTotal") },
        { value: "topRated", label: t("carsResults.topRated") },
      ];
  const selectedCarSortLabel =
    carSortOptions.find((option) => option.value === sort)?.label ??
    carSortOptions[0].label;
  const quickFilterGroups = carQuickFilterGroupIds.flatMap((id) => {
    const group = visibleCarFilterGroups.find((item) => item.id === id);
    return group ? [group] : [];
  });
  const badges = useMemo(
    () => (guidedPlanning ? new Map() : assignCarBadges(results)),
    [guidedPlanning, results],
  );
  const visibleResults = useMemo(() => {
    const ranked = sortCarResults(filterCarResults(results, selectedCarFilters, displayPricePerDay), sort);
    return sort === "recommended" ? ensureCarProviderCoverage(ranked) : ranked;
  }, [displayPricePerDay, results, selectedCarFilters, sort]);
  useEffect(() => {
    if (guidedPlanning || typeof window === "undefined") return undefined;
    const update = () => {
      setShowBackToTop(window.scrollY > CAR_BACK_TO_TOP_SCROLL_THRESHOLD);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [guidedPlanning]);

  const startFilterResultsTransition = useCallback(() => {
    const run = ++filterTransitionRunRef.current;
    const mobile = window.innerWidth < 1024;
    filterTransitionMobileRef.current = mobile;
    if (filterTransitionTimerRef.current !== null)
      window.clearTimeout(filterTransitionTimerRef.current);
    if (filterTransitionFrameRef.current !== null)
      window.cancelAnimationFrame(filterTransitionFrameRef.current);

    setFilterTransitionMinHeight(
      paginationListRef.current?.getBoundingClientRect().height ?? null,
    );
    setFilterTransitionPhase("covering");
    const startedAt = performance.now();

    // Two frames guarantee that the covering state reaches a browser paint
    // before the synchronous, already-filtered results are revealed.
    filterTransitionFrameRef.current = window.requestAnimationFrame(() => {
      filterTransitionFrameRef.current = window.requestAnimationFrame(() => {
        const minimumBusyMs = prefersReducedResultsMotion()
          ? 0
          : mobile
            ? CARS_FILTER_MIN_BUSY_MS
            : 160;
        const remaining = Math.max(0, minimumBusyMs - (performance.now() - startedAt));
        filterTransitionTimerRef.current = window.setTimeout(() => {
          if (filterTransitionRunRef.current !== run) return;
          setFilterTransitionMinHeight(null);
          if (prefersReducedResultsMotion() || !mobile) {
            setFilterTransitionPhase("idle");
            return;
          }
          setFilterTransitionPhase("revealing");
          filterTransitionTimerRef.current = window.setTimeout(() => {
            if (filterTransitionRunRef.current === run)
              setFilterTransitionPhase("idle");
          }, CARS_FILTER_REVEAL_MS);
        }, remaining);
      });
    });
  }, []);

  const selectCompareDealOffer = useCallback(
    (carId: string, offerId: string) => {
      setSelectedDealOfferIds((current) =>
        current[carId] === offerId ? current : { ...current, [carId]: offerId },
      );
    },
    [],
  );

  const toggleCarFilter = (groupId: string, option: string) => {
    startFilterResultsTransition();
    setSelectedCarFilters((current) => {
      const currentGroupSelections = current[groupId] ?? [];
      const nextGroupSelections = currentGroupSelections.includes(option)
        ? currentGroupSelections.filter((selected) => selected !== option)
        : [...currentGroupSelections, option];
      const nextFilters = { ...current };
      if (nextGroupSelections.length > 0)
        nextFilters[groupId] = nextGroupSelections;
      else delete nextFilters[groupId];
      return nextFilters;
    });
  };
  const clearCarFilters = () => {
    startFilterResultsTransition();
    setSelectedCarFilters({});
  };
  const toggleMobileDrawerCarFilter = (groupId: string, option: string) => {
    setSelectedCarFilters((current) => {
      const currentGroupSelections = current[groupId] ?? [];
      const nextGroupSelections = currentGroupSelections.includes(option)
        ? currentGroupSelections.filter((selected) => selected !== option)
        : [...currentGroupSelections, option];
      const nextFilters = { ...current };
      if (nextGroupSelections.length > 0)
        nextFilters[groupId] = nextGroupSelections;
      else delete nextFilters[groupId];
      return nextFilters;
    });
  };
  const clearMobileDrawerCarFilters = () => {
    setSelectedCarFilters({});
  };
  const closeMobileFiltersDrawer = useCallback(() => {
    const filtersChanged =
      mobileFilterDrawerInitialFiltersRef.current !==
      getSelectedCarFiltersSignature(selectedCarFiltersRef.current);
    if (filtersChanged) startFilterResultsTransition();
    setFiltersOpen(false);
  }, [startFilterResultsTransition]);
  const openMobileFiltersDrawer = (launcher: HTMLButtonElement, modality: OverlayActivationModality) => {
    mobileFiltersLauncherRef.current = launcher;
    mobileFiltersModalityRef.current = modality;
    mobileFilterDrawerInitialFiltersRef.current =
      getSelectedCarFiltersSignature(selectedCarFiltersRef.current);
    if (quickFilterCloseTimerRef.current !== null) {
      window.clearTimeout(quickFilterCloseTimerRef.current);
      quickFilterCloseTimerRef.current = null;
    }
    quickFilterClosingRef.current = false;
    quickFilterGroupIdRef.current = null;
    setQuickFilterClosing(false);
    setQuickFilterGroupId(null);
    setFiltersOpen(true);
  };
  const finishQuickFilterClose = useCallback(() => {
    if (quickFilterCloseTimerRef.current !== null) {
      window.clearTimeout(quickFilterCloseTimerRef.current);
      quickFilterCloseTimerRef.current = null;
    }
    quickFilterClosingRef.current = false;
    quickFilterGroupIdRef.current = null;
    setQuickFilterClosing(false);
    setQuickFilterGroupId(null);
  }, []);
  const closeQuickFilter = useCallback(() => {
    if (
      quickFilterGroupIdRef.current === null ||
      quickFilterClosingRef.current
    ) {
      return;
    }

    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      finishQuickFilterClose();
      return;
    }

    quickFilterClosingRef.current = true;
    setQuickFilterClosing(true);
    quickFilterCloseTimerRef.current = window.setTimeout(
      finishQuickFilterClose,
      340,
    );
  }, [finishQuickFilterClose]);
  const openQuickFilter = (kind: string, launcher: HTMLButtonElement, modality: OverlayActivationModality) => {
    if (quickFilterCloseTimerRef.current !== null) {
      window.clearTimeout(quickFilterCloseTimerRef.current);
      quickFilterCloseTimerRef.current = null;
    }
    quickFilterClosingRef.current = false;
    quickFilterGroupIdRef.current = kind;
    mobileFiltersLauncherRef.current = launcher;
    mobileFiltersModalityRef.current = modality;
    setQuickFilterClosing(false);
    setQuickFilterDraft(kind === "sort" ? [] : [...(selectedCarFilters[kind] ?? [])]);
    setQuickSortDraft(sort);
    setFiltersOpen(false);
    setQuickFilterGroupId(kind);
  };
  const clearQuickFilterSelection = (groupId: string) => {
    if (!(selectedCarFilters[groupId]?.length)) return;
    startFilterResultsTransition();
    setSelectedCarFilters((current) => {
      const next = { ...current };
      delete next[groupId];
      return next;
    });
  };
  useEffect(
    () => () => {
      filterTransitionRunRef.current += 1;
      if (filterTransitionTimerRef.current !== null)
        window.clearTimeout(filterTransitionTimerRef.current);
      if (filterTransitionFrameRef.current !== null)
        window.cancelAnimationFrame(filterTransitionFrameRef.current);
      if (quickFilterCloseTimerRef.current !== null)
        window.clearTimeout(quickFilterCloseTimerRef.current);
    },
    [],
  );
  useEffect(() => {
    if (!carsSortOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!carsSortRef.current?.contains(event.target as Node))
        setCarsSortOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCarsSortOpen(false);
        carsSortButtonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [carsSortOpen]);
  useLayoutEffect(() => {
    if (!mobileFiltersOverlayOpen || typeof window === "undefined") return undefined;

    const media = window.matchMedia("(max-width: 1023px)");
    if (!media.matches) return undefined;

    const releaseScrollLock = quickFilterOverlayOpen
      ? acquireMobileResultsScrollLock()
      : acquireMobileResultsScrollLock({ freezeBodyPosition: false });
    mobileFiltersScrollLockRef.current = releaseScrollLock;
    return () => {
      releaseScrollLock();
      if (mobileFiltersScrollLockRef.current === releaseScrollLock) {
        mobileFiltersScrollLockRef.current = null;
      }
    };
  }, [mobileFiltersOverlayOpen, quickFilterOverlayOpen]);

  useLayoutEffect(() => {
    if (!filtersOpen || typeof window === "undefined") return undefined;

    const media = window.matchMedia("(max-width: 1023px)");
    if (!media.matches) return undefined;

    const root = document.documentElement;
    const safeAreaSurfaceProperty = "--cars-results-safe-area-surface";
    const previousSafeAreaSurface = root.style.getPropertyValue(
      safeAreaSurfaceProperty,
    );
    root.style.setProperty(safeAreaSurfaceProperty, "#F2F4F8");
    const releaseOverlayCanvas = acquireMobileResultsOverlayCanvas({
      canvasColor: "#F2F4F8",
    });

    return () => {
      releaseOverlayCanvas();
      if (previousSafeAreaSurface) {
        root.style.setProperty(
          safeAreaSurfaceProperty,
          previousSafeAreaSurface,
        );
      } else {
        root.style.removeProperty(safeAreaSurfaceProperty);
      }
    };
  }, [filtersOpen]);
  useEffect(() => {
    if ((!filtersOpen && !quickFilterGroupId) || typeof window === "undefined") {
      return undefined;
    }
    const media = window.matchMedia("(max-width: 1023px)");
    if (!media.matches) {
      return undefined;
    }
    let shouldRestoreFocus = true;
    const activeDialogRef = quickFilterGroupId ? quickFiltersDialogRef : filtersDialogRef;
    const activeCloseButtonRef = quickFilterGroupId ? quickFiltersCloseButtonRef : filtersCloseButtonRef;
    const focusDrawer = requestAnimationFrame(() => {
      const shouldFocusCloseButton =
        mobileFiltersModalityRef.current === "keyboard";
      if (shouldFocusCloseButton) {
        activeCloseButtonRef.current?.focus({ preventScroll: true });
        return;
      }
      activeDialogRef.current?.focus({ preventScroll: true });
    });
    const closeForDesktop = () => {
      if (!media.matches) {
        shouldRestoreFocus = false;
        if (filtersOpen) closeMobileFiltersDrawer();
        else setFiltersOpen(false);
        if (quickFilterCloseTimerRef.current !== null) {
          window.clearTimeout(quickFilterCloseTimerRef.current);
          quickFilterCloseTimerRef.current = null;
        }
        quickFilterClosingRef.current = false;
        quickFilterGroupIdRef.current = null;
        setQuickFilterClosing(false);
        setQuickFilterGroupId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (quickFilterGroupId) closeQuickFilter();
        else closeMobileFiltersDrawer();
      }
      const dialog = activeDialogRef.current;
      if (event.key === "Tab" && dialog) {
        const focusable = [
          ...dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ].filter(isSafelyFocusableElement);
        if (!focusable.length) {
          event.preventDefault();
          dialog.focus({ preventScroll: true });
          return;
        }
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (document.activeElement === dialog || !dialog.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus({ preventScroll: true });
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus({ preventScroll: true });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    media.addEventListener("change", closeForDesktop);
    const launcher =
      mobileFiltersLauncherRef.current ?? filtersButtonRef.current;
    return () => {
      cancelAnimationFrame(focusDrawer);
      window.removeEventListener("keydown", handleKeyDown);
      media.removeEventListener("change", closeForDesktop);
      if (shouldRestoreFocus) restoreOverlayLauncherFocus(launcher, mobileFiltersModalityRef.current);
    };
  }, [closeMobileFiltersDrawer, closeQuickFilter, filtersOpen, quickFilterGroupId]);

  useEffect(() => {
    if (presentation !== "standalone" || typeof window === "undefined")
      return undefined;

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
            Math.abs(frame.width - currentFrame.width) >= 0.5 ||
            Math.abs(frame.maxHeight - currentFrame.maxHeight) >= 0.5));

      if (frameChanged) {
        desktopCompactFilterFrameRef.current = frame;
        setDesktopCompactFilterFrame(frame);
      }
    };

    const measureDesktopCompactFilter = () => {
      const sentinel = desktopFilterSentinelRef.current;
      const sidebar = desktopFilterSidebarRef.current;
      const compactPanel = desktopCompactFilterRef.current;
      const resultsBody = carsResultsBodyRef.current;
      const scrollY = window.scrollY;
      const nextVisibility = shouldShowDesktopCompactFilter({
        viewportWidth: window.innerWidth,
        sentinelTop:
          sentinel?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
        topOffset: desktopCompactFilterTopOffset,
      });

      if (nextVisibility !== desktopCompactFilterVisibilityRef.current) {
        desktopCompactFilterVisibilityRef.current = nextVisibility;
        setShowDesktopCompactFilter(nextVisibility);
      }

      if (!nextVisibility || !sidebar || !resultsBody) {
        applyPlacement("hidden", null);
        return;
      }

      const sidebarRect = sidebar.getBoundingClientRect();
      const panelHeight =
        compactPanel?.getBoundingClientRect().height ??
        desktopCompactFilterHeightRef.current;
      if (Number.isFinite(panelHeight) && panelHeight > 0)
        desktopCompactFilterHeightRef.current = panelHeight;

      const placement = calculateCompactFilterPlacement({
        enabled: nextVisibility,
        scrollY,
        desiredTop: desktopCompactFilterTopOffset,
        panelHeight,
        bodyBottomDocument:
          resultsBody.getBoundingClientRect().bottom + scrollY,
        currentState: desktopCompactFilterPlacementRef.current,
        bottomGap: desktopCompactFilterBottomGap,
      });

      if (placement.state === "hidden") {
        applyPlacement("hidden", null);
        return;
      }

      applyPlacement(placement.state, {
        left: sidebarRect.left,
        width: sidebarRect.width,
        maxHeight: calculateCompactFilterMaxHeight({
          viewportHeight: window.innerHeight,
          topOffset: desktopCompactFilterTopOffset,
          bottomGap: desktopCompactFilterBottomGap,
        }),
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
      if (desktopFilterSidebarRef.current)
        resizeObserver.observe(desktopFilterSidebarRef.current);
      if (carsResultsBodyRef.current)
        resizeObserver.observe(carsResultsBodyRef.current);
    }

    measureDesktopCompactFilter();
    window.addEventListener("scroll", scheduleMeasurement, { passive: true });
    window.addEventListener("resize", scheduleMeasurement);
    return () => {
      if (animationFrameId !== null)
        window.cancelAnimationFrame(animationFrameId);
      scheduleDesktopCompactFilterMeasurementRef.current = null;
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", scheduleMeasurement);
      window.removeEventListener("resize", scheduleMeasurement);
    };
  }, [presentation]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("ResizeObserver" in window) ||
      desktopCompactFilterPlacement === "hidden" ||
      !desktopCompactFilterRef.current
    )
      return undefined;

    const resizeObserver = new ResizeObserver(() =>
      scheduleDesktopCompactFilterMeasurementRef.current?.(),
    );
    resizeObserver.observe(desktopCompactFilterRef.current);
    return () => resizeObserver.disconnect();
  }, [desktopCompactFilterPlacement]);

  useEffect(() => {
    if (typeof window === "undefined" || !showDesktopCompactFilter) return;
    scheduleDesktopCompactFilterMeasurementRef.current?.();
  }, [activeFilterCount, results.length, showDesktopCompactFilter]);

  if (providersLoading) {
    return (
      <div data-cars-results-page-transition="providers">
        <CarsResultsPageTransitionSkeleton />
      </div>
    );
  }

  return (
    <>
    {mobileNavFilterTarget && showMobileHeaderFilter
      ? createPortal(
          <button
            type="button"
            data-cars-results-mobile-header-filter
            aria-label={
              activeFilterCount > 0
                ? t("filtersWithCount").replace(
                    "{{count}}",
                    String(activeFilterCount),
                  )
                : t("filters")
            }
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
            onClick={(event) =>
              openMobileFiltersDrawer(
                event.currentTarget,
                getOverlayActivationModality(event),
              )
            }
            className={cn(
              "focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-[8px] border shadow-[0_1px_2px_rgba(24,48,91,0.045)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25",
              activeFilterCount > 0
                ? "border-[#075EE8] bg-[#EAF2FF] text-[#004BB8]"
                : "border-[#D5DFEA] bg-[#FBFCFE] text-[#24324A] hover:border-[#C7D3E0] hover:bg-white",
            )}
          >
            <SlidersHorizontal
              className="h-[16px] w-[16px]"
              strokeWidth={2}
              aria-hidden="true"
            />
            {activeFilterCount > 0 ? (
              <span
                data-cars-results-mobile-header-filter-count
                className="absolute -end-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#004BB8] px-1 text-[9px] font-bold leading-none text-white"
              >
                {activeFilterCount}
              </span>
            ) : null}
          </button>,
          mobileNavFilterTarget,
        )
      : null}
    <section
      className={cn("min-w-0", embedded ? "mt-6" : "w-full")}
      aria-labelledby={resultHeadingId}
      data-cars-results-experience
    >
      <div
        ref={carsResultsBodyRef}
        className="grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[236px_minmax(0,1fr)]"
      >
        {results.length > 0 ? (
          <aside
            className="relative hidden lg:block self-stretch"
            ref={desktopFilterSidebarRef}
          >
            {!guidedPlanning ? (
              <CarsResultsMapPreview location={search.pickupLocation} />
            ) : null}
            <CarFilters
              groups={
                guidedPlanning
                  ? visibleCarFilterGroups.filter(
                      (group) => group.id !== "cancellation",
                    )
                  : visibleCarFilterGroups
              }
              activeFilterCount={activeFilterCount}
              layout="desktop"
              desktopSurfaceParity={!embedded && presentation === "standalone"}
              onClear={clearCarFilters}
              onToggle={toggleCarFilter}
              selectedFilters={selectedCarFilters}
              t={t}
            />
            {presentation === "standalone" ? (
              <>
                <div
                  ref={desktopFilterSentinelRef}
                  className="h-px w-full"
                  aria-hidden="true"
                />
                {showDesktopCompactFilter &&
                desktopCompactFilterFrame &&
                desktopCompactFilterPlacement !== "hidden" ? (
                  <div
                    ref={desktopCompactFilterRef}
                    className={cn(
                      "z-30 flex overflow-visible",
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
                            maxHeight: desktopCompactFilterFrame.maxHeight,
                          }
                        : {
                            width: "100%",
                            maxHeight: desktopCompactFilterFrame.maxHeight,
                          }
                    }
                  >
                    <CarFilters
                      groups={visibleCarFilterGroups}
                      activeFilterCount={activeFilterCount}
                      layout="compact"
                      desktopSurfaceParity={!embedded && presentation === "standalone"}
                      onClear={clearCarFilters}
                      onToggle={toggleCarFilter}
                      selectedFilters={selectedCarFilters}
                      t={t}
                    />
                  </div>
                ) : null}
              </>
            ) : null}
          </aside>
        ) : null}
        <div className="min-w-0 space-y-0 sm:space-y-4">
          {results.length > 0 ? (
            <>
              <div
                ref={mobileShortcutsRef}
                data-cars-results-sticky-shortcuts
                data-mobile-header-filter-active={showMobileHeaderFilter ? "true" : "false"}
                className="max-sm:bg-[#F5F7FB] max-sm:py-1 lg:hidden"
              >
                {!guidedPlanning ? (
                  <div
                    data-cars-results-quick-filters
                    className="scrollbar-hide -me-4 flex w-[calc(100%+1rem)] flex-nowrap gap-1.5 overflow-x-auto overscroll-x-contain pe-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
                  >
                    <button
                      ref={filtersButtonRef}
                      type="button"
                      aria-label={activeFilterCount > 0
                        ? t("filtersWithCount").replace("{{count}}", String(activeFilterCount))
                        : t("filters")}
                      className="group inline-flex min-h-11 min-w-11 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/35"
                      onClick={(event) => openMobileFiltersDrawer(event.currentTarget, getOverlayActivationModality(event))}
                    >
                      <span className={cn(
                        "inline-flex h-9 items-center justify-center gap-1 rounded-[9px] border px-2.5 text-[13px] font-semibold leading-4 transition",
                        activeFilterCount > 0
                          ? "border-[#142033] bg-white text-[#142033]"
                          : "border-[#D8E1EC] bg-white text-[#142033] group-hover:bg-slate-50",
                      )}>
                        <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
                        {locale.startsWith("en") ? "Filter" : t("filters")}
                        {activeFilterCount > 0 ? (
                          <span className="rounded-full bg-[#F1F5F9] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#142033]">
                            {activeFilterCount}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={quickFilterGroupId === "sort"}
                      aria-label={`${t("carsResults.sortBy")}: ${selectedCarSortLabel}`}
                      onClick={(event) => {
                        openQuickFilter("sort", event.currentTarget, getOverlayActivationModality(event));
                      }}
                      className="group inline-flex min-h-11 min-w-11 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/35"
                    >
                      <span className="inline-flex h-9 items-center gap-1 rounded-[9px] border border-[#D8E1EC] bg-white px-2.5 text-[13px] font-semibold leading-4 text-[#142033] transition group-hover:bg-slate-50">
                        {sort === "recommended" ? "Sort" : selectedCarSortLabel}
                        <ChevronDown
                          className={cn(
                            "h-[13px] w-[13px] text-slate-500 transition-transform duration-150 motion-reduce:transition-none",
                            quickFilterGroupId === "sort" && "rotate-180",
                          )}
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                    {quickFilterGroups.map((group) => {
                      const selected = selectedCarFilters[group.id] ?? [];
                      const active = selected.length > 0;
                      const selectedOption =
                        selected.length === 1
                          ? group.options.find((option) => option.id === selected[0])
                          : null;
                      const label =
                        selectedOption
                          ? selectedOption.label ?? t(selectedOption.labelKey)
                          : active
                            ? `${carFilterGroupLabel(group, t, true)} (${selected.length})`
                            : carFilterGroupLabel(group, t, true);
                      return (
                        <div
                          key={group.id}
                          className="group inline-flex min-h-11 min-w-11 shrink-0 items-center"
                        >
                          <span
                            className={cn(
                              "relative inline-flex h-9 items-center overflow-hidden rounded-[9px] border p-0 text-[13px] font-semibold leading-4 transition",
                              active
                                ? "border-[#142033] bg-[#142033] text-white"
                                : "border-[#D8E1EC] bg-white text-[#142033] group-hover:bg-slate-50",
                            )}
                          >
                            <button
                              type="button"
                              aria-haspopup="dialog"
                              aria-expanded={quickFilterGroupId === group.id}
                              aria-pressed={active}
                              className={cn(
                                "focus-ring inline-flex h-full min-w-0 items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/35",
                                active ? "pl-2.5 pr-7" : "px-2.5",
                              )}
                              onClick={(event) => {
                                openQuickFilter(group.id, event.currentTarget, getOverlayActivationModality(event));
                              }}
                            >
                              <span className="max-w-[11rem] truncate">{label}</span>
                              {!active ? (
                                <ChevronDown
                                  className={cn(
                                    "h-[13px] w-[13px] shrink-0 text-slate-500 transition-transform duration-150 motion-reduce:transition-none",
                                    quickFilterGroupId === group.id && "rotate-180",
                                  )}
                                  aria-hidden="true"
                                />
                              ) : null}
                            </button>
                            {active ? (
                              <button
                                type="button"
                                aria-label={`Clear ${carFilterGroupLabel(group, t, true)} filter`}
                                className="focus-ring absolute right-0.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  clearQuickFilterSelection(group.id);
                                }}
                              >
                                <X className="h-3 w-3" strokeWidth={2.1} aria-hidden="true" />
                              </button>
                            ) : null}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    ref={filtersButtonRef}
                    type="button"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-[#142033] lg:hidden"
                    onClick={(event) => openMobileFiltersDrawer(event.currentTarget, getOverlayActivationModality(event))}
                  >
                    <SlidersHorizontal size={17} aria-hidden="true" />
                    {t("filters")}
                  </button>
                )}

              </div>
              <div
                className="flex w-full min-w-0 flex-col items-start gap-2 pt-1 sm:gap-3 lg:py-1"
                data-cars-results-toolbar
              >
                {!embedded ? <CarPriceAlertControl search={search} results={providerResults} /> : null}
                <div
                  className="flex w-full min-w-0 flex-nowrap items-center justify-between gap-2"
                  data-cars-results-summary-row
                >
                  <div className="min-w-0 flex-1">
                    <h2
                      ref={resultHeadingRef}
                      id={resultHeadingId}
                      tabIndex={-1}
                      className="truncate whitespace-nowrap text-[12px] font-semibold leading-4 tracking-[-0.002em] text-[#07133B] outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8] sm:text-[14px] sm:font-semibold sm:leading-5 sm:tracking-[-0.004em] lg:text-[14px] lg:font-semibold lg:leading-5 lg:tracking-[-0.005em]"
                    >
                      {resultHeading ??
                        t(
                          visibleResults.length === 1
                            ? "resultFound"
                            : "resultsFound",
                        ).replace(
                          "{{count}}",
                          new Intl.NumberFormat(intlLocale, {
                            maximumFractionDigits: 0,
                          }).format(visibleResults.length),
                        )}
                    </h2>
                  </div>
                  <div className="hidden min-w-0 max-w-full flex-nowrap items-center justify-end gap-1 whitespace-nowrap sm:flex sm:gap-2">
                    <span className="cars-results-desktop-sort-label shrink-0 whitespace-nowrap text-xs font-medium text-[#536B92] sm:text-sm">
                      {t("carsResults.sortBy")}:
                    </span>
                    <div
                      ref={carsSortRef}
                      className="relative inline-flex min-w-0 max-w-full shrink items-center whitespace-nowrap"
                    >
                      <button
                        ref={carsSortButtonRef}
                        type="button"
                        aria-label={`${t("carsResults.sortBy")}: ${selectedCarSortLabel}`}
                        aria-haspopup="menu"
                        aria-expanded={carsSortOpen}
                        className="cars-results-desktop-sort-trigger inline-flex h-9 min-w-0 max-w-full items-center justify-center gap-1 rounded-md bg-transparent px-1 text-sm font-semibold text-[#07133B] sm:gap-2 sm:px-2 sm:text-[16px]"
                        onClick={() => setCarsSortOpen((open) => !open)}
                      >
                        <span className="min-w-0 truncate whitespace-nowrap">
                          {selectedCarSortLabel}
                        </span>
                        <ChevronDown
                          size={16}
                          className={cn(
                            "shrink-0 text-current transition-transform duration-150",
                            carsSortOpen && "rotate-180",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                      <div
                        role="menu"
                        aria-hidden={!carsSortOpen}
                        className={cn(
                          "absolute end-0 top-11 z-40 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg",
                          carsSortOpen
                            ? "opacity-100"
                            : "pointer-events-none opacity-0",
                        )}
                      >
                        {carSortOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            role="menuitemradio"
                            aria-checked={sort === option.value}
                            tabIndex={carsSortOpen ? 0 : -1}
                            data-selected={sort === option.value ? "true" : "false"}
                            className="cars-results-desktop-sort-option flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30"
                            onClick={() => {
                              startFilterResultsTransition();
                              setSort(option.value);
                              setCarsSortOpen(false);
                            }}
                          >
                            <span className="flex w-4 shrink-0 items-center justify-center text-[#004BB8]">
                              {sort === option.value ? <Check size={15} strokeWidth={2.5} aria-hidden="true" /> : null}
                            </span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {appliedCarFilters.length > 0 ? (
                  <div className="flex w-full flex-wrap gap-1.5" aria-label="Applied car filters">
                    {appliedCarFilters.map((filter) => (
                      <button key={`${filter.groupId}-${filter.optionId}`} type="button" onClick={() => toggleCarFilter(filter.groupId, filter.optionId)} className="inline-flex min-h-11 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35" aria-label={`Remove ${filter.label} filter`}>
                        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#B8CDED] bg-[#EEF5FF] px-2.5 text-[11px] font-semibold leading-[14px] text-[#064A9B] lg:text-[13px] lg:font-semibold lg:leading-5">{filter.label}<X className="h-[13px] w-[13px] shrink-0" aria-hidden="true" /></span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {filterTransitionPhase === "covering" ? (
                <div
                  ref={paginationListRef}
                  data-cars-results-card-list
                  aria-busy="true"
                  style={
                    filterTransitionPhase === "covering" && filterTransitionMinHeight
                      ? { minHeight: filterTransitionMinHeight }
                      : undefined
                  }
                  className={cn(
                    "w-full space-y-3.5 max-sm:!mt-2.5 sm:space-y-4",
                    !guidedPlanning && "w-full",
                  )}
                >
                  {Array.from({ length: 3 }, (_, item) => (
                    <div
                      key={item}
                      aria-hidden={filterTransitionPhase === "covering" ? "true" : undefined}
                    >
                      <CarCardSkeleton
                        transitionMotion={
                          filterTransitionPhase === "covering" && filterTransitionMobileRef.current
                            ? "shimmer"
                            : "pulse"
                        }
                        desktopSurfaceParity={!embedded && presentation === "standalone"}
                      />
                    </div>
                  ))}
                </div>
              ) : visibleResults.length ? (
                <div
                  ref={paginationListRef}
                  data-cars-results-card-list
                  aria-busy="false"
                  className={cn(
                    "w-full space-y-3.5 max-sm:!mt-2.5 sm:space-y-4",
                    !guidedPlanning && "w-full",
                    filterTransitionPhase === "revealing" &&
                      filterTransitionMobileRef.current &&
                      "cars-filter-results-reveal",
                  )}
                >
                  {visibleResults.map((car) => (
                    <CarResultCard
                      key={car.id}
                      car={car}
                      search={search}
                      badge={badges.get(car.id)}
                      detailsHref={detailsHrefForCar(car)}
                      selectedDealOfferId={selectedDealOfferIds[car.id]}
                      onDealOfferSelected={selectCompareDealOffer}
                      providerLabel={isKayakSandboxResult(car) ? "KAYAK sandbox · Simulated offer" : undefined}
                      onSelect={
                        onSelectCar && (isCarSelectable?.(car) ?? true)
                          ? onSelectCar
                          : undefined
                      }
                      actionLabel={actionLabel}
                      actionAriaLabel={actionAriaLabelForCar?.(car)}
                      headingLevel={embedded ? "h3" : "h2"}
                      presentation={presentation}
                      desktopSurfaceParity={!embedded && presentation === "standalone"}
                      planningLabels={
                        guidedPlanning
                          ? {
                              estimatedTotal: t(
                                "deals.guided.carResults.estimatedTotal",
                              ),
                              estimatedPerDay: t(
                                "deals.guided.carResults.estimatedPerDay",
                              ),
                              disclosure: t(
                                "deals.guided.carResults.disclosure",
                              ),
                              orSimilar: t("deals.guided.carResults.orSimilar"),
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <div
                  role="status"
                  aria-busy="false"
                  className={cn(
                    "w-full rounded-xl border border-slate-200 bg-white p-8 text-center",
                    filterTransitionPhase === "revealing" &&
                      filterTransitionMobileRef.current &&
                      "cars-filter-results-reveal",
                  )}
                >
                  <p className="font-bold text-slate-950">
                    {t("carsResults.filteredEmpty") ||
                      "No cars match these filters."}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4"
                    onClick={clearCarFilters}
                  >
                    {t("carsResults.clearFilters") || "Clear filters"}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <h2
                id={resultHeadingId}
                tabIndex={-1}
                className="text-xl font-extrabold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]"
              >
                {resultHeading ?? (kayak && presentation === "standalone" ? "Search results" : t("deals.guided.carResults.emptyTitle"))}
              </h2>
              {kayak && presentation === "standalone" ? <CombinedSearchEmpty otherStatus={inventoryStatus === "available" ? "success" : "error"} retry={() => window.location.reload()} retriesAll /> : <CarsResultsShell
                hasSearchContext={hasSearchContext}
                inventoryStatus={inventoryStatus}
                t={t}
              />}
            </>
          )}
        </div>
      </div>
      {filtersOpen ? (
        <button
          type="button"
          aria-label={t("carsResults.closeFilters")}
          onClick={closeMobileFiltersDrawer}
          className="fixed inset-0 z-[9999] bg-slate-950/35 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}
      <aside
        ref={filtersDialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cars-guided-filters-title"
        aria-hidden={!filtersOpen}
        inert={!filtersOpen ? true : undefined}
        data-cars-mobile-filter-shell
        className={cn(
          "fixed inset-y-0 right-0 z-[10000] flex h-[95dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-[#F2F4F8] shadow-2xl transition-transform duration-200 ease-out motion-reduce:transition-none max-sm:top-auto sm:h-[100dvh] sm:w-[420px] sm:rounded-none lg:hidden",
          filtersOpen
            ? "translate-y-0 sm:translate-x-0"
            : "pointer-events-none translate-y-full sm:translate-x-full sm:translate-y-0",
        )}
      >
        <header className="relative flex min-h-[64px] shrink-0 items-center bg-[#F2F4F8] pe-[10px] ps-5">
          <div className="min-w-0 flex-1">
            <h2 id="cars-guided-filters-title" className="truncate text-base font-semibold leading-5 text-slate-950">{t("filters")}</h2>
            {activeFilterCount > 0 ? (
              <p className="text-xs font-medium leading-4 text-slate-500">{activeFilterLabel}</p>
            ) : null}
          </div>
          <button ref={filtersCloseButtonRef} type="button" className="focus-ring absolute right-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-700 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35" aria-label={t("carsResults.closeFilters")} onClick={closeMobileFiltersDrawer}>
            <X className="h-[22px] w-[22px]" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#F2F4F8] px-6 py-4">
          <CarFilters
            groups={
              guidedPlanning
                ? visibleCarFilterGroups.filter(
                    (group) => group.id !== "cancellation",
                  )
                : visibleCarFilterGroups
            }
            activeFilterCount={activeFilterCount}
            layout="mobile"
            onClear={clearMobileDrawerCarFilters}
            onToggle={toggleMobileDrawerCarFilter}
            selectedFilters={selectedCarFilters}
            t={t}
          />
        </div>
        <footer className="flex shrink-0 items-center gap-3 border-t border-[#D8DEE8] bg-[#F2F4F8] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_24px_rgba(15,23,42,0.08)]">
          {activeFilterCount > 0 ? (
            <button type="button" aria-label={t("carsResults.resetFilters")} onClick={clearMobileDrawerCarFilters} className="focus-ring h-11 w-[30%] shrink-0 rounded-lg border border-[#D8DEE8] bg-[#F2F4F8] px-4 text-sm font-semibold text-slate-700">
              {t("carsResults.reset")}
            </button>
          ) : null}
          <Button
            type="button"
            className="h-11 min-w-0 flex-1 rounded-lg bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-md shadow-[#004BB8]/12 transition hover:bg-[#003f9c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2"
            onClick={closeMobileFiltersDrawer}
          >
            {locale.startsWith("en")
              ? `View ${visibleResults.length} ${visibleResults.length === 1 ? "car" : "cars"}`
              : `${t("carsResults.show")} ${visibleResults.length}`}
          </Button>
        </footer>
      </aside>
      {quickFilterGroupId && (quickFilterGroupId === "sort" || activeQuickFilterGroup) && typeof document !== "undefined" ? createPortal(
        <div
          data-cars-quick-sheet-backdrop
          className={cn(
            "fixed inset-0 z-[10010] flex items-end lg:hidden",
            quickFilterClosing && "pointer-events-none",
          )}
          role="presentation"
          onMouseDown={closeQuickFilter}
        >
          <div
            aria-hidden="true"
            data-cars-quick-sheet-scrim
            className={cn(
              "mobile-results-sheet-backdrop-layer pointer-events-none fixed inset-0 bg-[rgba(8,18,35,0.52)]",
              quickFilterClosing &&
                "mobile-results-sheet-backdrop-layer-closing",
            )}
          />
          <section
            data-cars-quick-sheet
            ref={quickFiltersDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`cars-quick-${quickFilterGroupId}`}
            inert={quickFilterClosing ? true : undefined}
            onMouseDown={(event) => event.stopPropagation()}
            onAnimationEnd={(event) => {
              if (
                event.currentTarget !== event.target ||
                !quickFilterClosingRef.current
              ) {
                return;
              }
              finishQuickFilterClose();
            }}
            className={cn(
              "mobile-results-sheet-surface mobile-results-sheet-surface-smooth cars-results-quick-sheet-surface relative z-10 mx-3 mb-3 flex min-h-[240px] max-h-[min(76dvh,620px)] w-[calc(100%_-_24px)] flex-col overflow-hidden rounded-[24px] bg-[#F2F4F8] outline-none shadow-none",
              quickFilterClosing && "mobile-results-sheet-surface-closing",
            )}
          >
            <header className="relative flex min-h-16 shrink-0 items-center justify-center bg-[#F2F4F8] px-16 py-3">
              <h2 id={`cars-quick-${quickFilterGroupId}`} className="text-center text-base font-semibold text-slate-950">
                {quickFilterGroupId === "sort" ? "Sort" : carFilterGroupLabel(activeQuickFilterGroup!, t, true)}
              </h2>
              <button ref={quickFiltersCloseButtonRef} type="button" aria-label="Close" onClick={closeQuickFilter} className="absolute right-3 inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#F2F4F8] p-4">
              {quickFilterGroupId === "sort" ? (
                <div role="radiogroup">
                  {carSortOptions.map((option) => {
                    const descriptions: Record<CarSort, string> = { recommended: "Best overall value first", lowestTotal: "Lowest rental total first", topRated: "Highest supplier rating first" };
                    return <button key={option.value} type="button" role="radio" aria-checked={quickSortDraft === option.value} className="flex min-h-[52px] w-full items-center px-[10px] py-[7px] text-start text-slate-950 focus-visible:rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/35" onClick={() => setQuickSortDraft(option.value)}>
                      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-5">{option.label}</span><span className="block text-[10.5px] font-medium leading-[14px] text-slate-500">{descriptions[option.value]}</span></span>
                      {quickSortDraft === option.value ? <Check className="h-[17px] w-[17px] shrink-0 text-[#004BB8]" aria-hidden="true" /> : null}
                    </button>;
                  })}
                </div>
              ) : activeQuickFilterGroup!.options.map((option) => {
                const selected = quickFilterDraft.includes(option.id);
                return <label key={option.id} className="flex min-h-[52px] cursor-pointer items-center gap-[10px] px-[10px] focus-within:rounded-lg focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#004BB8]/35 rtl:flex-row-reverse">
                  <input type="checkbox" checked={selected} onChange={() => setQuickFilterDraft((current) => current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id])} className="peer sr-only" />
                  <span aria-hidden="true" className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px]", selected ? "border-[#004BB8] bg-[#004BB8]" : "border-[#D8DEE8]")}>{selected ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}</span>
                  <span className="min-w-0 flex-1 text-start text-sm font-semibold leading-5 text-slate-950">{option.label ?? t(option.labelKey)}</span>
                  {typeof option.count === "number" ? <span className="shrink-0 text-end text-[13px] font-medium tabular-nums text-slate-500">{option.count}</span> : null}
                </label>;
              })}
            </div>
            <footer
              className="flex shrink-0 items-center justify-between gap-3 bg-[#F2F4F8] px-6 pt-3"
              style={{ paddingBottom: "max(12px, calc(env(safe-area-inset-bottom, 0px) - 12px))" }}
            >
              <button type="button" onClick={() => { if (quickFilterGroupId === "sort") setQuickSortDraft("recommended"); else setQuickFilterDraft([]); }} className="h-11 w-[32%] shrink-0 rounded-lg border border-[#D8DEE8] bg-[#F2F4F8] px-4 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35">Reset</button>
              <button type="button" onClick={() => { startFilterResultsTransition(); if (quickFilterGroupId === "sort") setSort(quickSortDraft); else setSelectedCarFilters((current) => { const next = { ...current }; if (quickFilterDraft.length) next[quickFilterGroupId] = [...quickFilterDraft]; else delete next[quickFilterGroupId]; return next; }); closeQuickFilter(); }} className="h-11 w-[32%] shrink-0 rounded-lg bg-[#004BB8] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-2">
                Apply
              </button>
            </footer>
          </section>
        </div>, document.body) : null}
      {!guidedPlanning ? (
        <button
          type="button"
          aria-label="Back to top"
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: prefersReducedResultsMotion() ? "auto" : "smooth",
            })
          }
          className={cn(
            "fixed right-4 z-[800] flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-[#EEF2F6] text-[#004BB8] shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] sm:bottom-6 sm:right-6",
            "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
            showBackToTop
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          <ArrowUp className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      ) : null}
    </section>
    </>
  );
}

function CarsResultsPageTransitionSkeleton() {
  return (
    <div aria-hidden="true" className="cars-results-desktop-typeface fixed inset-0 z-[1200] overflow-hidden bg-[#F5F7FB] sm:bg-[#f6f8fb] lg:bg-white">
      <div className="h-20 border-b border-slate-100 bg-white px-4 sm:h-24"><div className="mx-auto flex h-full max-w-[1400px] items-center justify-between"><div className="h-8 w-40 animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none" /><div className="h-10 w-10 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" /></div></div>
      <div className="border-b border-slate-100 bg-white px-4 py-5"><div className="mx-auto max-w-[1180px]"><div className="hidden h-[72px] animate-pulse grid-cols-[1.2fr_.9fr_1fr_.7fr_112px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm motion-reduce:animate-none sm:grid">{["pickup", "return", "dates", "age"].map((item) => <div key={item} className="border-r border-slate-200 p-4"><div className="h-4 w-28 rounded bg-slate-200" /><div className="mt-2 h-3 w-20 rounded bg-slate-100" /></div>)}<div className="m-2 rounded-xl bg-[#D9E7F7]" /></div><div className="h-16 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm motion-reduce:animate-none sm:hidden"><div className="h-4 w-52 rounded bg-slate-200" /><div className="mt-2 h-3 w-36 rounded bg-slate-100" /></div></div></div>
      <div className="mx-auto max-w-[1020px] px-4 py-5 sm:py-6"><div className="mb-4 flex gap-2 sm:hidden">{[84, 92, 76, 116].map((width) => <div key={width} className="h-11 shrink-0 animate-pulse rounded-lg border border-slate-200 bg-white motion-reduce:animate-none" style={{ width }} />)}</div><div className="grid min-w-0 gap-5 lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[236px_minmax(0,1fr)]"><aside className="hidden space-y-5 border-r border-slate-200 pr-5 lg:block"><div className="h-6 w-24 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />{["vehicle", "transmission", "seats", "features"].map((item) => <div key={item} className="border-t border-slate-200 pt-5"><div className="h-4 w-28 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" /><div className="mt-4 h-4 w-4/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /><div className="mt-3 h-4 w-3/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /></div>)}</aside><section className="min-w-0"><div className="mb-4 flex items-center justify-between"><div><div className="h-6 w-40 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" /><div className="mt-2 h-3 w-16 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /></div><div className="hidden h-9 w-36 animate-pulse rounded bg-slate-200 motion-reduce:animate-none sm:block" /></div><div className="space-y-4"><CarCardSkeleton desktopSurfaceParity /><CarCardSkeleton desktopSurfaceParity /><CarCardSkeleton desktopSurfaceParity /></div></section></div></div>
    </div>
  );
}

function MobileLocationLauncher({
  buttonRef,
  className,
  icon: Icon,
  label,
  onClick,
  placeholder,
  secondaryAction,
  value,
  groupedMobile = false,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>;
  className?: string;
  icon: typeof MapPin;
  label: string;
  onClick: () => void;
  placeholder: string;
  secondaryAction?: { label: string; onClick: () => void };
  value: string;
  groupedMobile?: boolean;
}) {
  const display = getLocationFieldDisplay(value);
  return (
    <div data-cars-mobile-grouped-row className={cn(groupedMobile ? carsMobileEditFieldShellClass : fieldShellClass, className)}>
      <div className={groupedMobile ? carsMobileEditPickupLabelClass : fieldLabelClass}>
        <span className="truncate">{label}</span>
      </div>
      <div className={groupedMobile ? "flex min-w-0 items-center gap-[10px]" : "flex min-w-0 items-center gap-2"}>
        {groupedMobile ? <Icon className="h-[18px] w-[18px] shrink-0 text-[#334155]" aria-hidden="true" /> : null}
        <button
          ref={buttonRef}
          type="button"
          onClick={onClick}
          className={groupedMobile
            ? cn(carsMobileEditPickupValueClass, !value && "font-normal text-slate-500")
            : cn(fieldInputClass, "focus-ring min-w-0 flex-1 text-start", !value && "text-slate-400")
          }
        >
          <span className="block truncate">{display.primary || placeholder}</span>
          {display.secondary ? (
            <span
              className={groupedMobile
                ? `block truncate ${carsMobileEditSecondaryValueClass}`
                : "block truncate text-[11px] font-normal leading-[15px] text-slate-600"
              }
            >
              {display.secondary}
            </span>
          ) : null}
        </button>
        {secondaryAction ? (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="focus-ring shrink-0 text-xs font-semibold text-[#004BB8]"
          >
            {secondaryAction.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SearchInputCell({
  clearLabel,
  className,
  icon: Icon,
  inputRef,
  idPrefix,
  isCompact,
  label,
  isOpen,
  name,
  onChange,
  onClear,
  onOpenChange,
  onSelect,
  placeholder,
  secondaryAction,
  showClearButton = true,
  strings,
  value,
}: {
  clearLabel: string;
  className?: string;
  icon: typeof MapPin;
  inputRef: RefObject<HTMLInputElement | null>;
  idPrefix: string;
  isCompact: boolean;
  isOpen: boolean;
  label: string;
  name: keyof Pick<CarsResultsValues, "pickupLocation" | "dropoffLocation">;
  onChange: (value: string) => void;
  onClear: () => void;
  onOpenChange: (open: boolean) => void;
  onSelect?: (suggestion: CarLocationSuggestion) => void;
  placeholder: string;
  secondaryAction?: { label: string; onClick: () => void };
  showClearButton?: boolean;
  strings: Parameters<typeof CarLocationAutocomplete>[0]["strings"];
  value: string;
}) {
  return (
    <div
      data-cars-results-navbar-field
      className={cn(
        fieldShellClass,
        isCompact && compactFieldShellClass,
        className,
      )}
    >
      <div data-cars-results-navbar-label className={fieldLabelClass}>
        <Icon
          className="h-3.5 w-3.5 shrink-0 text-slate-500 lg:hidden"
          aria-hidden="true"
        />
        <label htmlFor={`${idPrefix}-${name}`} className="min-w-0 truncate">
          {label}
        </label>
        {secondaryAction ? (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            title={secondaryAction.label}
            className="ms-auto max-w-[45%] truncate text-[10px] font-semibold normal-case tracking-normal text-[#075EE8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/30"
          >
            {secondaryAction.label}
          </button>
        ) : null}
      </div>
      <div className="relative flex min-w-0 items-center gap-2">
        <Icon
          className="cars-results-navbar-leading-icon hidden h-4 w-4 shrink-0 text-slate-500 lg:block"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <CarLocationAutocomplete
            inputRef={inputRef}
            desktopResultsPresentation
            id={`${idPrefix}-${name}`}
            name={name}
            value={value}
            onValueChange={onChange}
            onSelect={onSelect}
            placeholder={placeholder}
            inputClassName={cn("cars-results-navbar-location-value", fieldInputClass, isCompact ? desktopCompactSelectedValueClass : desktopFullSelectedValueClass, showClearButton && "pr-8")}
            presentation="desktop"
            strings={strings}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
          />
        </div>
        {showClearButton && value ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={onClear}
            className="absolute end-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 focus-visible:ring-offset-1"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ResultsDesktopPopover({
  open,
  launcherRef,
  preferredWidth,
  desiredHeight,
  align = "start",
  shellClassName = "overflow-y-auto p-4",
  providedPopoverRef,
  role,
  ariaLabel,
  children,
}: {
  open: boolean;
  launcherRef: RefObject<HTMLElement | null>;
  preferredWidth: number;
  desiredHeight: number;
  align?: "start" | "center" | "end";
  shellClassName?: string;
  providedPopoverRef?: RefObject<HTMLDivElement | null>;
  role: "dialog" | "listbox";
  ariaLabel: string;
  children: ReactNode;
}) {
  const { placement, popoverRef, style } = useCarsDesktopPopover({
    open,
    launcherRef,
    preferredWidth,
    desiredHeight,
    maxHeight: desiredHeight,
    align,
    providedPopoverRef,
  });
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={popoverRef}
      role={role}
      aria-label={ariaLabel}
      data-cars-results-picker-popover="true"
      data-placement={placement}
      style={style}
      className={cn("cars-results-desktop-typeface", carsDesktopPopoverClassName, shellClassName)}
    >
      {children}
    </div>,
    document.body,
  );
}

function SearchDateCell({
  dropoffDate,
  doneButtonVariant,
  isCompact,
  isOpen,
  onClear,
  onDone,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
  onToggle,
  pickupDate,
  useCompactDateSummary,
  showRentalDuration,
  visibleMonthDate,
  t,
  intlLocale,
  wrapRef,
  popoverRef,
  groupedMobile = false,
}: {
  dropoffDate: string;
  doneButtonVariant: "brand" | "neutral";
  isCompact: boolean;
  isOpen: boolean;
  onClear: () => void;
  onDone: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDate: (date: Date) => void;
  onToggle: () => void;
  pickupDate: string;
  useCompactDateSummary: boolean;
  showRentalDuration: boolean;
  visibleMonthDate: Date;
  t: (key: string) => string;
  intlLocale: string;
  wrapRef: RefObject<HTMLDivElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  groupedMobile?: boolean;
}) {
  const dateFormatter = useCompactDateSummary ? formatCompactDate : formatDate;
  const pickupDisplay = groupedMobile
    ? formatTravelDateDisplay(pickupDate, intlLocale) ??
      t("carsResults.selectDate")
    : dateFormatter(
        pickupDate,
        intlLocale,
        t("carsResults.selectDate"),
      );
  const dropoffDisplay = groupedMobile
    ? formatTravelDateDisplay(dropoffDate, intlLocale) ??
      t("carsResults.selectDate")
    : dateFormatter(
        dropoffDate,
        intlLocale,
        t("carsResults.selectDate"),
      );
  const summary = pickupDate
    ? dropoffDate
      ? `${pickupDisplay} — ${dropoffDisplay}`
      : pickupDisplay
    : t("carsResults.rentalDatePlaceholder");
  const weekdays = getWeekdays(intlLocale);
  const pickupParsed = parseIsoDate(pickupDate);
  const dropoffParsed = parseIsoDate(dropoffDate);
  return (
    <div
      ref={wrapRef}
      data-cars-mobile-grouped-row={groupedMobile || undefined}
      data-cars-results-navbar-field
      className={cn(groupedMobile ? carsMobileEditFieldShellClass : fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div data-cars-results-navbar-label className={groupedMobile ? carsMobileEditFieldLabelClass : fieldLabelClass}>
        <CalendarDays
          className={cn("h-3.5 w-3.5 shrink-0 text-[#5CB6B2] lg:hidden", groupedMobile && "hidden")}
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">
          {t("carsResults.rentalDatesLabel") || t("carsResults.rentalDates")}
        </span>
      </div>
      <button
        type="button"
        data-cars-results-navbar-value
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={groupedMobile
          ? carsMobileEditSummaryButtonClass
          : cn(
              "focus-ring flex h-8 min-w-0 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[14px] font-medium leading-[19px] text-slate-900 outline-none md:text-sm",
              isCompact ? desktopCompactSelectedValueClass : desktopFullSelectedValueClass,
            )
        }
      >
        {showRentalDuration ? (
          <Calendar
            className="cars-results-navbar-leading-icon h-4 w-4 shrink-0 text-slate-500"
            aria-hidden="true"
          />
        ) : null}
        {!showRentalDuration && isCompact ? (
          <Calendar className="cars-results-navbar-leading-icon h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        ) : null}
        {groupedMobile ? (
          <span className={carsMobileEditValueGroupClass}>
            <Calendar className="h-[18px] w-[18px] shrink-0 text-[#334155]" aria-hidden="true" />
            <span className={cn("min-w-0 flex-1 truncate", !pickupDate && "font-normal text-slate-500")}>
              {summary}
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate leading-4 lg:leading-5", !pickupDate && "text-slate-400 lg:font-medium lg:text-slate-400")}>
              {summary}
            </span>
          </span>
        )}
        {!groupedMobile ? (
          <ChevronDown
            data-cars-results-navbar-chevron
            className={cn(
              "h-4 w-4 shrink-0 text-slate-500 transition-transform",
              isOpen && "rotate-180",
            )}
            aria-hidden="true"
          />
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label={t("carsResults.rentalDateRangeCalendar")}
          className="absolute start-0 end-0 top-[calc(100%+10px)] z-[80] max-h-[min(72vh,620px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:hidden"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label={t("carsSearch.previousMonth")}
              onClick={onPreviousMonth}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-center text-sm font-bold text-slate-900">
              {t("carsResults.selectPickupThenReturn")}
            </p>
            <button
              type="button"
              aria-label={t("carsSearch.nextMonth")}
              onClick={onNextMonth}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[0, 1].map((monthOffset) => {
              const monthDate = addMonths(visibleMonthDate, monthOffset);
              const cells = buildMonthCells(monthDate);

              return (
                <div key={monthOffset}>
                  <p className="mb-2 text-center text-sm font-bold text-slate-800">
                    {new Intl.DateTimeFormat(intlLocale, {
                      month: "long",
                      year: "numeric",
                    }).format(monthDate)}
                  </p>
                  <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[0.7rem] font-bold text-slate-500">
                    {weekdays.map((weekday) => (
                      <span key={weekday}>{weekday}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((cell) => {
                      const day = cell.date;
                      const iso = toIsoDate(day);
                      const isPickup = iso === pickupDate;
                      const isDropoff = iso === dropoffDate;
                      const isPastDate = isBeforeToday(day);
                      const isBeforePickup = Boolean(
                        pickupDate && !dropoffDate && iso < pickupDate,
                      );
                      const isInRange = Boolean(
                        pickupParsed &&
                        dropoffParsed &&
                        !isPastDate &&
                        day > pickupParsed &&
                        day < dropoffParsed,
                      );

                      if (!cell.isCurrentMonth) {
                        return (
                          <span
                            key={`placeholder-${iso}`}
                            aria-hidden="true"
                            className="h-9 w-9 justify-self-center"
                          />
                        );
                      }

                      return (
                        <button
                          key={iso}
                          type="button"
                          aria-label={`${t("carsSearch.selectDateAriaPrefix")} ${new Intl.DateTimeFormat(
                            intlLocale,
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            },
                          ).format(day)}${
                            isBeforePickup
                              ? `; ${t("carsSearch.startsNewPickupDate")}`
                              : ""
                          }`}
                          onClick={() => onSelectDate(day)}
                          disabled={isPastDate}
                          className={cn(
                            "focus-ring flex h-9 w-9 items-center justify-center justify-self-center rounded-full text-sm font-semibold transition-colors disabled:cursor-not-allowed",
                            isPastDate
                              ? "text-slate-300 hover:bg-transparent"
                              : isBeforePickup
                                ? "text-slate-500 hover:bg-[#004BB8]/8"
                                : "text-slate-900 hover:bg-[#004BB8]/8",
                            isInRange &&
                              "rounded-md bg-[#004BB8]/10 text-[#021C2B] hover:bg-[#004BB8]/10",
                            (isPickup || isDropoff) &&
                              "bg-[#004BB8] text-white hover:bg-[#004BB8]",
                          )}
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
              onClick={onClear}
              className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t("clear")}
            </button>
            <button
              type="button"
              onClick={onDone}
              className={cn(
                "focus-ring rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
                doneButtonVariant === "brand"
                  ? "bg-[#004BB8] shadow-[0_8px_18px_rgba(0,75,184,0.20)] hover:bg-[#021C2B] active:bg-[#021C2B] focus-visible:ring-[#004BB8]/35"
                  : "bg-slate-900 hover:bg-slate-800",
              )}
            >
              {t("done")}
            </button>
          </div>
        </div>
      ) : null}
      <ResultsDesktopPopover
        open={isOpen}
        launcherRef={wrapRef}
        providedPopoverRef={popoverRef}
        preferredWidth={640}
        desiredHeight={isCompact ? 420 : 480}
        shellClassName={isCompact ? "overflow-hidden p-3" : undefined}
        role="dialog"
        ariaLabel={t("carsResults.rentalDateRangeCalendar")}
      >
        <CarsRentalDatePickerContent
          dropoffDate={dropoffDate}
          formatFullDate={(date) =>
            new Intl.DateTimeFormat(intlLocale, { dateStyle: "long" }).format(
              date,
            )
          }
          locale={intlLocale}
          onClear={onClear}
          onDone={onDone}
          onNextMonth={onNextMonth}
          onPreviousMonth={onPreviousMonth}
          onSelectDate={onSelectDate}
          pickupDate={pickupDate}
          strings={{
            chooseDates: t("carsResults.selectPickupThenReturn"),
            previousMonth: t("carsSearch.previousMonth"),
            previousMonthShort: t("carsSearch.previousMonthShort"),
            nextMonth: t("carsSearch.nextMonth"),
            nextMonthShort: t("carsSearch.nextMonthShort"),
            selectDatePrefix: t("carsSearch.selectDateAriaPrefix"),
            startsNewPickupDate: t("carsSearch.startsNewPickupDate"),
            clear: t("clear"),
            done: t("done"),
          }}
          visibleMonthDate={visibleMonthDate}
          weekdays={weekdays}
          desktopCompact={isCompact}
        />
      </ResultsDesktopPopover>
    </div>
  );
}

function SearchTimeCell({
  dropoffTime,
  isCompact,
  isOpen,
  onToggle,
  pickupTime,
  setDropoffTime,
  setPickupTime,
  t,
  intlLocale,
  wrapRef,
  popoverRef,
  useMainPageDesktopPresentation,
  groupedMobile = false,
}: {
  dropoffTime: string;
  isCompact: boolean;
  isOpen: boolean;
  onToggle: () => void;
  pickupTime: string;
  setDropoffTime: (time: string) => void;
  setPickupTime: (time: string) => void;
  t: (key: string) => string;
  intlLocale: string;
  wrapRef: RefObject<HTMLDivElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  useMainPageDesktopPresentation: boolean;
  groupedMobile?: boolean;
}) {
  return (
    <div
      ref={wrapRef}
      data-cars-mobile-grouped-row={groupedMobile || undefined}
      data-cars-results-navbar-field
      className={cn(groupedMobile ? carsMobileEditFieldShellClass : fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div data-cars-results-navbar-label className={groupedMobile ? carsMobileEditFieldLabelClass : fieldLabelClass}>
        <Clock3
          className={cn("h-3.5 w-3.5 shrink-0 text-[#5CB6B2] lg:hidden", groupedMobile && "hidden")}
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">
          {t("carsResults.pickupReturnTimeLabel") ||
            t("carsResults.pickupReturnTime")}
        </span>
      </div>
      <button
        type="button"
        data-cars-results-navbar-value
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={groupedMobile
          ? carsMobileEditSummaryButtonClass
          : cn(
              "focus-ring flex h-8 min-w-0 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[14px] font-medium leading-[19px] text-slate-900 outline-none md:text-sm",
              isCompact ? desktopCompactSelectedValueClass : desktopFullSelectedValueClass,
            )
        }
      >
        {groupedMobile ? (
          <span className={carsMobileEditValueGroupClass}>
            <Clock className="h-[18px] w-[18px] shrink-0 text-[#334155]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-start">
              {formatTimeLabel(pickupTime, intlLocale)} —{" "}
              {formatTimeLabel(dropoffTime, intlLocale)}
            </span>
          </span>
        ) : useMainPageDesktopPresentation ? (
          <span className="flex min-w-0 items-center gap-2">
            <Clock
              className="cars-results-navbar-leading-icon h-4 w-4 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <span className="truncate">
              {formatCarsCompactTimeRange(pickupTime, dropoffTime)}
            </span>
          </span>
        ) : (
          <span className="truncate">
            {formatTimeLabel(pickupTime, intlLocale)} —{" "}
            {formatTimeLabel(dropoffTime, intlLocale)}
          </span>
        )}
        <ChevronDown
          data-cars-results-navbar-chevron
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            groupedMobile && "text-[#334155]",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={t("carsResults.pickupReturnTimeSelector")}
          className="absolute start-0 end-0 top-[calc(100%+10px)] z-[80] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:hidden"
        >
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("carsResults.pickupTime")}
              </span>
              <select
                value={pickupTime}
                onChange={(event) => setPickupTime(event.target.value)}
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-[#004BB8] md:text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={`pickup-${time}`} value={time}>
                    {formatTimeLabel(time, intlLocale)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("carsResults.returnTime")}
              </span>
              <select
                value={dropoffTime}
                onChange={(event) => setDropoffTime(event.target.value)}
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-[#004BB8] md:text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={`return-${time}`} value={time}>
                    {formatTimeLabel(time, intlLocale)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
      <ResultsDesktopPopover
        open={isOpen}
        launcherRef={wrapRef}
        providedPopoverRef={popoverRef}
        preferredWidth={448}
        desiredHeight={320}
        align="center"
        shellClassName="overflow-hidden p-3"
        role="dialog"
        ariaLabel={t("carsResults.pickupReturnTimeSelector")}
      >
        <CarsTimeRangePickerContent
          formatTime={(time) => formatTimeLabel(time, intlLocale)}
          pickupLabel={t("carsSearch.pickupTimeLabel")}
          pickupTime={pickupTime}
          returnLabel={t("carsSearch.returnTimeLabel")}
          returnTime={dropoffTime}
          onPickupTimeChange={setPickupTime}
          onReturnTimeChange={setDropoffTime}
        />
      </ResultsDesktopPopover>
    </div>
  );
}

function DriverAgeCell({
  driverAge,
  isCompact,
  navbarCompact = false,
  isOpen,
  onSelect,
  onToggle,
  t,
  wrapRef,
  popoverRef,
  useMainPageDesktopPresentation,
  groupedMobile = false,
}: {
  driverAge: string;
  isCompact: boolean;
  navbarCompact?: boolean;
  isOpen: boolean;
  onSelect: (age: string) => void;
  onToggle: () => void;
  t: (key: string) => string;
  wrapRef: RefObject<HTMLDivElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  useMainPageDesktopPresentation: boolean;
  groupedMobile?: boolean;
}) {
  const visibleOptions = useMemo(() => driverAgeOptions, []);

  return (
    <div
      ref={wrapRef}
      data-cars-mobile-grouped-row={groupedMobile || undefined}
      data-cars-results-navbar-field
      className={cn(groupedMobile ? carsMobileEditFieldShellClass : fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div data-cars-results-navbar-label className={groupedMobile ? carsMobileEditFieldLabelClass : fieldLabelClass}>
        <UserRound
          className={cn("h-3.5 w-3.5 shrink-0 text-[#5CB6B2] lg:hidden", groupedMobile && "hidden")}
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">
          {t("carsResults.driverAgeLabel") || t("carsResults.driverAge")}
        </span>
      </div>
      <button
        type="button"
        data-cars-results-navbar-value
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={groupedMobile
          ? carsMobileEditSummaryButtonClass
          : cn(
              "focus-ring flex h-8 min-w-0 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[14px] font-medium leading-[19px] text-slate-900 outline-none md:text-sm",
              isCompact ? desktopCompactSelectedValueClass : desktopFullSelectedValueClass,
            )
        }
      >
        {groupedMobile ? (
          <span className={carsMobileEditValueGroupClass}>
            <UserRound className="h-[18px] w-[18px] shrink-0 text-[#334155]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-start">
              {getDriverAgeOptionLabel(driverAge, t)}
            </span>
          </span>
        ) : useMainPageDesktopPresentation ? (
          <span className="flex min-w-0 items-center gap-2">
            <UserRound
              className="cars-results-navbar-leading-icon h-4 w-4 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <span className="truncate">
              {driverAge === defaultDriverAge
                ? t("carsSearch.driverAgeAnyAge")
                : navbarCompact
                  ? `${driverAge}+`
                  : getDriverAgeOptionLabel(driverAge, t)}
            </span>
          </span>
        ) : (
          <span className="truncate">
            {getDriverAgeOptionLabel(driverAge, t)}
          </span>
        )}
        <ChevronDown
          data-cars-results-navbar-chevron
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            groupedMobile && "text-[#334155]",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div
          role="listbox"
          aria-label={t("carsResults.driverAge")}
          className="absolute start-0 end-0 top-[calc(100%+10px)] z-[80] max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:hidden"
        >
          {visibleOptions.map((age) => (
            <button
              key={age}
              type="button"
              role="option"
              aria-selected={age === driverAge}
              onClick={() => onSelect(age)}
              className={cn(
                "focus-ring flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition-colors hover:bg-[#004BB8]/8",
                age === driverAge
                  ? "bg-[#004BB8]/8 text-[#021C2B]"
                  : "text-slate-700",
              )}
            >
              {getDriverAgeOptionLabel(age, t)}
              {age === driverAge ? (
                <CheckCircle2
                  className="h-4 w-4 text-[#004BB8]"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      <ResultsDesktopPopover
        open={isOpen}
        launcherRef={wrapRef}
        providedPopoverRef={popoverRef}
        preferredWidth={288}
        desiredHeight={320}
        align="end"
        shellClassName="overflow-hidden"
        role="listbox"
        ariaLabel={t("carsResults.driverAge")}
      >
        <CarsDriverAgePickerContent
          anyAgeLabel={t("carsSearch.driverAgeAnyAgeRange")}
          formatAge={(age) => age}
          selectedAge={driverAge}
          onSelect={onSelect}
        />
      </ResultsDesktopPopover>
    </div>
  );
}

function CarsResultsShell({
  hasSearchContext,
  inventoryStatus,
  t,
}: {
  hasSearchContext: boolean;
  inventoryStatus: CarInventoryStatus;
  t: (key: string) => string;
}) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-muted shadow-sm"
      role="status"
    >
      {hasSearchContext && inventoryStatus !== "invalid-search"
        ? t("carsResults.emptyInventory")
        : t("carsResults.enterPickupDetails")}
    </div>
  );
}

function CarFilters({
  groups,
  activeFilterCount,
  layout,
  desktopSurfaceParity = false,
  onClear,
  onToggle,
  selectedFilters,
  t,
}: {
  groups: CarFilterGroup[];
  activeFilterCount: number;
  layout: "desktop" | "compact" | "mobile";
  desktopSurfaceParity?: boolean;
  onClear: () => void;
  onToggle: (groupId: string, option: string) => void;
  selectedFilters: SelectedCarFilters;
  t: (key: string) => string;
}) {
  const [openCompactSection, setOpenCompactSection] = useState<string | null>(
    null,
  );
  const activeFilterLabel = interpolate(t("carsResults.activeFilterCount"), {
    count: String(activeFilterCount),
  });

  return (
    <div
      className={cn(
        layout === "compact"
          ? cn(
              "desktop-filter-sidebar flex max-h-full flex-col overflow-hidden rounded-2xl border border-[#D8E1EC] p-0 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.42)]",
              desktopSurfaceParity ? "bg-white" : "bg-[#EEF3F8]",
            )
          : layout === "desktop"
            ? cn(
                "desktop-filter-sidebar border border-slate-200/80 p-0 shadow-none rounded-none",
                desktopSurfaceParity ? "bg-white" : "bg-transparent",
              )
            : "bg-transparent",
        desktopSurfaceParity &&
          layout !== "mobile" &&
          "cars-desktop-filter-surface cars-hotel-filter-surface",
      )}
    >
      {layout === "compact" ? (
        <div
          className={cn(
            "desktop-filter-sidebar__header shrink-0 border-b border-[#D8E1EC]/80 px-3.5 py-2.5",
            desktopSurfaceParity ? "bg-white" : "bg-[#EEF3F8]",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="desktop-filter-sidebar__title flex min-w-0 items-center gap-2 truncate text-[15px] font-bold leading-5 tracking-[-0.004em] text-[#07133B]">
              <SlidersHorizontal
                className="desktop-filter-sidebar__icon cars-desktop-filter-icon shrink-0 text-[#07133B]"
                size={15}
                strokeWidth={2.25}
                aria-hidden="true"
              />
              <span className="truncate">{t("filters")}</span>
            </h2>
          </div>
          {activeFilterCount > 0 ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="desktop-filter-sidebar__count rounded-full bg-[#EAF2FB] px-2 py-0.5 text-[12px] font-semibold leading-4 text-[#235A9F] ring-1 ring-[#004BB8]/8">
                {activeFilterLabel}
              </span>
              <button
                type="button"
                className="rounded-full px-1.5 py-0.5 text-[12px] font-bold leading-4 text-[#475569] transition hover:bg-slate-100 hover:text-[#235A9F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
                onClick={onClear}
              >
                {t("clearAll")}
              </button>
            </div>
          ) : null}
        </div>
      ) : layout === "desktop" ? (
        <div className="desktop-filter-sidebar__header shrink-0 border-b border-slate-200/70 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="truncate text-[16px] font-bold leading-6 tracking-[-0.006em] text-[#07133B]">
              {t("filters")}
              {activeFilterCount > 0 ? (
                <span className="ms-2 rounded-full bg-[#004BB8] px-2 py-0.5 text-[12px] font-semibold leading-4 text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </h2>
            <SlidersHorizontal
              className="cars-desktop-filter-icon shrink-0 text-[#07133B]"
              size={18}
              aria-hidden="true"
            />
          </div>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className="focus-ring mt-2 text-[13px] font-bold leading-5 text-[#004BB8]"
              onClick={onClear}
            >
              {t("clearAll")}
            </button>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn(
          layout === "compact"
            ? cn(
                "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-1",
                desktopSurfaceParity ? "bg-white" : "bg-[#EEF3F8]",
              )
            : layout === "mobile"
              ? "grid gap-6 bg-transparent"
              : "space-y-0 bg-transparent px-3 py-1",
        )}
      >
        {groups.map((group) => (
          <FilterSection
            key={group.id}
            layout={layout}
            group={group}
            onToggle={onToggle}
            selectedOptions={selectedFilters[group.id] ?? []}
            compactOpen={openCompactSection === group.id}
            onCompactOpen={() =>
              setOpenCompactSection((current) =>
                current === group.id ? null : group.id,
              )
            }
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function carFilterGroupLabel(
  group: CarFilterGroup,
  t: (key: string) => string,
  _mobile = false,
) {
  if (group.id === "pricePerDay") {
    return group.title ?? "Price";
  }

  return group.titleKey ? t(group.titleKey) : group.title ?? "";
}

function FilterSection({
  layout,
  group,
  onToggle,
  selectedOptions,
  compactOpen,
  onCompactOpen,
  t,
}: {
  layout: "desktop" | "compact" | "mobile";
  group: CarFilterGroup;
  onToggle: (groupId: string, option: string) => void;
  selectedOptions: string[];
  compactOpen: boolean;
  onCompactOpen: () => void;
  t: (key: string) => string;
}) {
  const panelId = `cars-compact-filter-${group.id}`;
  if (layout === "mobile") {
    return (
      <section className="grid gap-[5px]">
        <div className="flex min-h-7 items-center">
          <h3 className="text-[15px] font-extrabold text-slate-950">
            {carFilterGroupLabel(group, t, true)}
          </h3>
        </div>
        <div>
          {group.options.map((option) => {
            const selected = selectedOptions.includes(option.id);
            return (
              <label
                key={option.id}
                className="flex min-h-[46px] cursor-pointer items-center gap-2.5 text-[13px] font-medium text-slate-950 transition-opacity active:opacity-70"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(group.id, option.id)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-[1.5px] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#004BB8]/35 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#F2F4F8]",
                    selected
                      ? "border-[#004BB8] bg-[#004BB8] text-white"
                      : "border-[#D8DEE8] bg-transparent",
                  )}
                >
                  {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
                <span className="min-w-0 flex-1 break-words">
                  {option.label ?? t(option.labelKey)}
                </span>
                {typeof option.count === "number" ? (
                  <span className="ms-0.5 max-w-[42%] shrink-0 text-right text-xs leading-4 tabular-nums text-slate-500">
                    {option.count}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      </section>
    );
  }
  return (
    <section
      className={cn(
        layout === "compact"
          ? "border-t border-[#D8E1EC]/75 first:border-t-0"
          : "border-t border-slate-200/75 py-3 first:border-t-0",
      )}
    >
      {layout === "compact" ? (
        <button
          type="button"
          aria-expanded={compactOpen}
          aria-controls={panelId}
          onClick={onCompactOpen}
          className={cn(
            "group flex w-full items-center justify-between gap-3 text-start font-bold text-slate-900 transition-colors duration-200 motion-reduce:transition-none hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30",
            "min-h-9 rounded-md px-2.5 py-2 text-[14px] leading-5 tracking-[-0.004em] hover:bg-[#E5ECF4]",
            compactOpen && "text-[#004BB8]",
          )}
        >
          <span className="min-w-0 truncate">{carFilterGroupLabel(group, t)}</span>
          <span className="flex shrink-0 items-center gap-2">
            {selectedOptions.length ? (
              <span className="min-w-5 rounded-full bg-[#E2EAF3] px-2 py-0.5 text-center text-[12px] font-semibold normal-case leading-4 tracking-normal text-[#235A9F] ring-1 ring-[#004BB8]/10 group-hover:bg-[#DCE8F6]">
                {selectedOptions.length}
              </span>
            ) : null}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-slate-500 transition duration-200 motion-reduce:transition-none group-hover:text-[#004BB8]",
                compactOpen && "rotate-180 text-[#004BB8]",
              )}
              strokeWidth={2.3}
              aria-hidden="true"
            />
          </span>
        </button>
      ) : (
        <h3 className="cars-results-desktop-filter-heading-type text-[15px] font-bold normal-case leading-5 tracking-[-0.003em] text-slate-950">
          {carFilterGroupLabel(group, t)}
        </h3>
      )}
      <div
        id={panelId}
        hidden={layout === "compact" && !compactOpen}
        aria-hidden={layout === "compact" && !compactOpen}
        className={cn(
          layout === "compact"
            ? "grid h-auto gap-0.5 overflow-visible bg-transparent px-2.5 pb-3 pt-0.5"
            : "mt-2 grid gap-0.5",
        )}
      >
        {group.options.map((option) => {
          const selected = selectedOptions.includes(option.id);
          const input = (
            <input
              type="checkbox"
              tabIndex={layout === "compact" && !compactOpen ? -1 : undefined}
              className={
                layout === "compact"
                  ? "mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-blue focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
                  : "h-4 w-4 rounded border-slate-300 accent-blue"
              }
              checked={selected}
              onChange={() => onToggle(group.id, option.id)}
            />
          );
          const label = (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{option.label ?? t(option.labelKey)}</span>
              {typeof option.count === "number" ? <span className="ms-auto text-[13px] font-medium leading-5 tabular-nums text-[#64748B]">{option.count}</span> : null}
            </span>
          );
          return (
            <label
              key={option.id}
              className={cn(
                layout === "compact"
                  ? "flex min-h-8 cursor-pointer items-start justify-between gap-2 rounded-lg px-1.5 py-1 text-[14px] font-medium leading-5 text-[#334155] transition hover:bg-slate-50 hover:text-slate-950"
                  : "flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[14px] font-medium leading-5 transition-all",
                selected
                  ? "font-semibold text-[#142033]"
                  : layout === "compact"
                    ? null
                    : "text-[#334155] hover:bg-slate-50 hover:text-[#142033]",
              )}
            >
              {layout === "compact" ? (
                <span className="flex min-w-0 items-start gap-1.5">
                  {input}
                  {label}
                </span>
              ) : (
                <>
                  {input}
                  {label}
                </>
              )}
            </label>
          );
        })}
      </div>
    </section>
  );
}
