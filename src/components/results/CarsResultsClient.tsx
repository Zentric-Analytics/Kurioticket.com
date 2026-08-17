"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  MapPin,
  SquarePen,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";
import { CarResultCard } from "@/components/results/CarResultCard";
import { CarCardSkeleton } from "@/components/ui/Skeleton";
import {
  assignCarBadges,
  buildCarDetailsHref,
  filterCarResults,
  sortCarResults,
  type CarSort,
  type SelectedCarFilters,
} from "@/lib/cars/carResults";
import type {
  CarInventoryStatus,
  CarSearchParams,
  NormalizedCarResult,
} from "@/lib/cars/types";
import { shouldShowDesktopStickySearch } from "@/lib/search/desktopStickySearch";
import { lockDesktopPageScroll } from "@/lib/search/desktopPageScrollLock";
import { CarLocationAutocomplete } from "@/components/search/CarLocationAutocomplete";
import {
  CarsDriverAgePickerContent,
  CarsRentalDatePickerContent,
  CarsTimeRangePickerContent,
} from "@/components/search/CarsPickerContent";
import {
  carsDesktopPopoverClassName,
  useCarsDesktopPopover,
} from "@/components/search/useCarsDesktopPopover";

type CarsResultsValues = CarSearchParams & {
  returnToDifferentLocation: boolean;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  driverAge: string;
};

type CarFilterOption = {
  id: string;
  labelKey: string;
};

type CarFilterGroup = {
  id: string;
  titleKey: string;
  options: CarFilterOption[];
};

type SearchSurfaceRefs = {
  pickupInputRef: RefObject<HTMLInputElement | null>;
  dropoffInputRef: RefObject<HTMLInputElement | null>;
  dateWrapRef: RefObject<HTMLDivElement | null>;
  timeWrapRef: RefObject<HTMLDivElement | null>;
  driverAgeWrapRef: RefObject<HTMLDivElement | null>;
};

function useSearchSurfaceRefs(): SearchSurfaceRefs {
  return {
    pickupInputRef: useRef<HTMLInputElement | null>(null),
    dropoffInputRef: useRef<HTMLInputElement | null>(null),
    dateWrapRef: useRef<HTMLDivElement | null>(null),
    timeWrapRef: useRef<HTMLDivElement | null>(null),
    driverAgeWrapRef: useRef<HTMLDivElement | null>(null),
  };
}

const defaultDriverAge = "18-70";
const minimumDriverAge = 18;
const maximumDriverAge = 70;

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";

  return `${String(hour).padStart(2, "0")}:${minute}`;
});

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

const carFilterGroups: CarFilterGroup[] = [
  {
    id: "vehicleType",
    titleKey: "carsResults.vehicleType",
    options: [
      { id: "smallCars", labelKey: "carsResults.smallCars" },
      { id: "mediumCars", labelKey: "carsResults.mediumCars" },
      { id: "suvs", labelKey: "carsResults.suvs" },
    ],
  },
  {
    id: "transmission",
    titleKey: "carsResults.transmission",
    options: [
      { id: "automatic", labelKey: "carsResults.automatic" },
      { id: "manual", labelKey: "carsResults.manual" },
    ],
  },
  {
    id: "seats",
    titleKey: "carsResults.seats",
    options: [
      { id: "seats4Plus", labelKey: "carsResults.seats4Plus" },
      { id: "seats5Plus", labelKey: "carsResults.seats5Plus" },
      { id: "seats7Plus", labelKey: "carsResults.seats7Plus" },
    ],
  },
  {
    id: "bags",
    titleKey: "carsResults.bags",
    options: [
      { id: "bags2Plus", labelKey: "carsResults.bags2Plus" },
      { id: "bags3Plus", labelKey: "carsResults.bags3Plus" },
      { id: "bags4Plus", labelKey: "carsResults.bags4Plus" },
    ],
  },
  {
    id: "fuelPolicy",
    titleKey: "carsResults.fuelPolicy",
    options: [
      { id: "fullToFull", labelKey: "carsResults.fullToFull" },
      { id: "sameToSame", labelKey: "carsResults.sameToSame" },
    ],
  },
  {
    id: "mileagePolicy",
    titleKey: "carsResults.mileagePolicy",
    options: [
      { id: "unlimitedMileage", labelKey: "carsResults.unlimitedMileage" },
      { id: "limitedMileage", labelKey: "carsResults.limitedMileage" },
    ],
  },
  {
    id: "cancellation",
    titleKey: "carsResults.cancellation",
    options: [
      { id: "freeCancellation", labelKey: "carsResults.freeCancellation" },
      { id: "payAtPickup", labelKey: "carsResults.payAtPickup" },
    ],
  },
  {
    id: "pickupLocationType",
    titleKey: "carsResults.pickupLocationType",
    options: [
      { id: "airportCounter", labelKey: "carsResults.airportCounter" },
      { id: "shuttlePickup", labelKey: "carsResults.shuttlePickup" },
      { id: "cityLocation", labelKey: "carsResults.cityLocation" },
    ],
  },
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
  "relative min-h-[50px] rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm shadow-slate-900/[0.025] transition-[min-height,padding,border-color,box-shadow] duration-200 hover:border-slate-300 focus-within:border-[#004BB8] focus-within:ring-2 focus-within:ring-[#004BB8]/25 sm:min-h-[54px] sm:px-3 sm:py-1.5 lg:flex lg:min-h-[58px] lg:min-w-0 lg:flex-col lg:justify-center lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200/80 lg:bg-transparent lg:px-4 lg:py-2.5 lg:shadow-none lg:hover:border-slate-200/80 lg:focus-within:border-slate-200/80 lg:focus-within:ring-0";

const differentReturnSearchGridClass =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,1.08fr)_minmax(0,1.48fr)_minmax(0,1.06fr)_118px_116px] lg:items-stretch lg:gap-0";
const sameReturnSearchGridClass =
  "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.26fr)_minmax(0,1.48fr)_minmax(0,1.06fr)_118px_116px] lg:items-stretch lg:gap-0";
const compactFieldShellClass = "min-h-[46px] py-1 lg:min-h-[54px] lg:py-1.5";

const fieldLabelClass =
  "mb-1.5 flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11px] font-bold uppercase leading-4 tracking-[0.12em] text-slate-500 sm:mb-1 sm:text-xs sm:font-semibold sm:tracking-wide sm:text-slate-600 lg:text-[0.66rem] lg:leading-3 lg:tracking-[0.13em] lg:text-slate-500";

const fieldInputClass =
  "h-8 min-w-0 w-full border-0 bg-transparent p-0 text-[16px] font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus-visible:outline-none focus-visible:shadow-none md:text-sm lg:text-[15px] lg:font-medium lg:leading-6";

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
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const intlLocale = getCarsResultsIntlLocale(locale);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isSearchBarCompact, setIsSearchBarCompact] = useState(false);
  const [desktopStickySearchSection, setDesktopStickySearchSection] = useState<
    "locations" | "dates" | "times" | "driverAge" | null
  >(null);
  const [pickupLocation, setPickupLocation] = useState(values.pickupLocation);
  const [dropoffLocation, setDropoffLocation] = useState(
    values.returnToDifferentLocation ? values.dropoffLocation : "",
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
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const resultsGridRef = useRef<HTMLDivElement | null>(null);
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
  const hasSearchContext = Boolean(pickupLocation || pickupDate || dropoffDate);
  const trimmedPickupLocation = pickupLocation.trim();
  const trimmedDropoffLocation = dropoffLocation.trim();
  const pickupLocationLabel = getCuratedLocationLabel(trimmedPickupLocation, t);
  const dropoffLocationLabel = getCuratedLocationLabel(
    trimmedDropoffLocation,
    t,
  );
  const showCompactSearchSummary =
    isSearchBarCompact && desktopStickySearchSection === null;
  const desktopStickySearchOpen = desktopStickySearchSection !== null;
  const pickupSummary = pickupLocationLabel || t("carsResults.pickupLocation");
  const returnSummary =
    dropoffLocationLabel ||
    pickupLocationLabel ||
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
  const timeSummary = `${formatTimeLabel(pickupTime, intlLocale)} → ${formatTimeLabel(dropoffTime, intlLocale)}`;
  const locationPairSummary = returnToDifferentLocation
    ? `${pickupSummary} → ${returnSummary}`
    : pickupSummary;
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
        !activeSearchRefs.dateWrapRef.current?.contains(target)
      ) {
        setDatesOpen(false);
      }

      if (
        timesOpen &&
        !activeSearchRefs.timeWrapRef.current?.contains(target)
      ) {
        setTimesOpen(false);
      }

      if (
        driverAgeOpen &&
        !activeSearchRefs.driverAgeWrapRef.current?.contains(target)
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

  const openMobileSearchDrawer = useCallback(() => {
    setMobileSearchOpen(true);
    setDesktopStickySearchSection(null);
    setDatesOpen(false);
    setTimesOpen(false);
    setDriverAgeOpen(false);
  }, [
    setMobileSearchOpen,
    setDesktopStickySearchSection,
    setDatesOpen,
    setTimesOpen,
    setDriverAgeOpen,
  ]);

  const closeMobileSearchDrawer = useCallback(() => {
    setMobileSearchOpen(false);
    setDatesOpen(false);
    setTimesOpen(false);
    setDriverAgeOpen(false);
  }, [setMobileSearchOpen, setDatesOpen, setTimesOpen, setDriverAgeOpen]);

  const renderMobileControlsRow = () => (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 items-stretch gap-2.5">
      <button
        type="button"
        onClick={openMobileSearchDrawer}
        className="flex h-14 min-w-0 max-w-full flex-1 items-center justify-between gap-3 overflow-hidden rounded-md border border-slate-200/90 bg-white px-4 py-0 text-start shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
      >
        <span className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <span className="block truncate text-sm font-bold leading-5 text-slate-950">
            {locationPairSummary}
          </span>
          <span className="mt-1 block truncate text-[12px] font-semibold leading-4 text-slate-600">
            {rentalDateSummary} · {driverAgeSummary}
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

  const renderCarsSearchForm = (
    placement: "desktop-full" | "desktop-sticky" | "mobile",
  ) => {
    const idPrefix =
      placement === "desktop-full"
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
    const isCompactSearch = placement === "desktop-sticky";
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
        className="mx-auto w-full min-w-0 max-w-5xl"
        onSubmit={() => {
          closeMobileSearchDrawer();
          setDesktopStickySearchSection(null);
        }}
      >
        <input type="hidden" name="pickupDate" value={pickupDate} />
        <input type="hidden" name="dropoffDate" value={dropoffDate} />
        <input type="hidden" name="pickupTime" value={pickupTime} />
        <input type="hidden" name="dropoffTime" value={dropoffTime} />
        <input type="hidden" name="driverAge" value={driverAge} />
        {returnToDifferentLocation ? (
          <input type="hidden" name="returnToDifferentLocation" value="1" />
        ) : null}
        <div
          className={cn(
            "overflow-visible border border-slate-200/90 bg-white transition-[padding,border-color,box-shadow,border-radius] duration-200",
            isCompactSearch
              ? "rounded-xl border-slate-200/85 bg-white/90 p-0 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.64)]"
              : "rounded-[1.15rem] p-1.5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.58)] ring-1 ring-slate-950/[0.025]",
          )}
        >
          <div
            className={
              returnToDifferentLocation
                ? differentReturnSearchGridClass
                : sameReturnSearchGridClass
            }
            data-return-location-mode={
              returnToDifferentLocation ? "different" : "same"
            }
          >
            <SearchInputCell
              idPrefix={idPrefix}
              icon={MapPin}
              inputRef={searchSurfaceRefs.pickupInputRef}
              isCompact={isCompactSearch}
              label={
                t("carsResults.pickupLocationLabel") ||
                t("carsResults.pickupLocation")
              }
              name="pickupLocation"
              onChange={(nextValue) => {
                setPickupLocation(nextValue);
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
                searchSurfaceRefs.pickupInputRef.current?.focus();
              }}
              placeholder={t("carsSearch.pickupLocationPlaceholder")}
              showClearButton={false}
              value={pickupLocation}
              clearLabel={t("carsSearch.clearPickupLocation")}
              strings={locationStrings}
              className="lg:rounded-s-xl"
            />
            {returnToDifferentLocation ? (
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
                  searchSurfaceRefs.dropoffInputRef.current?.focus();
                }}
                placeholder={t("carsResults.sameAsPickup")}
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
                    setOpenLocation(null);
                  },
                }}
              />
            ) : null}
            <SearchDateCell
              dropoffDate={dropoffDate}
              isCompact={isCompactSearch}
              doneButtonVariant={placement === "mobile" ? "neutral" : "brand"}
              isOpen={surfaceOwnsPopovers && datesOpen}
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
            />
            <SearchTimeCell
              dropoffTime={dropoffTime}
              isCompact={isCompactSearch}
              isOpen={surfaceOwnsPopovers && timesOpen}
              onToggle={() => {
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
              useMainPageDesktopPresentation={placement !== "mobile"}
            />
            <DriverAgeCell
              driverAge={driverAge}
              isCompact={isCompactSearch}
              isOpen={surfaceOwnsPopovers && driverAgeOpen}
              onSelect={(age) => {
                setDriverAge(age);
                setDriverAgeOpen(false);
              }}
              onToggle={() => {
                setDriverAgeOpen((current) => !current);
                setOpenLocation(null);
                setDatesOpen(false);
                setTimesOpen(false);
              }}
              t={t}
              wrapRef={searchSurfaceRefs.driverAgeWrapRef}
              useMainPageDesktopPresentation={placement !== "mobile"}
            />
            <Button
              type="submit"
              className={cn(
                "mt-2 h-12 w-full rounded-xl bg-[#075EE8] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(7,94,232,0.2)] transition-[min-height,height,box-shadow,background-color] duration-200 hover:bg-[#064fc2] hover:shadow-[0_10px_20px_rgba(7,94,232,0.24)] sm:mt-3 lg:m-[4px] lg:h-auto lg:w-[calc(100%-8px)] lg:self-stretch lg:rounded-[9px] lg:ring-1 lg:ring-[#075EE8]/12",
                isCompactSearch ? "lg:min-h-[54px]" : "lg:min-h-[58px]",
              )}
            >
              {t("search")}
            </Button>
          </div>
        </div>
      </form>
    );
  };

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
          "fixed inset-0 z-[10000] min-h-[100dvh] overflow-y-auto bg-slate-50 px-4 py-4 sm:hidden",
          mobileSearchOpen ? "block" : "hidden",
        )}
      >
        <div className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#004BB8]">
                {t("carsResults.editSearch")}
              </p>
              <h2 className="mt-1 text-base font-bold text-slate-950">
                {t("carsResults.carRentalSearch")}
              </h2>
            </div>
            <Button
              type="button"
              variant="secondary"
              aria-label={t("carsResults.closeEditSearch")}
              className="h-10 w-10 rounded-full border-slate-200 bg-white p-0 text-slate-700 shadow-sm"
              onClick={closeMobileSearchDrawer}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          {mobileSearchOpen ? renderCarsSearchForm("mobile") : null}
        </div>
      </div>

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
        <div className="mx-auto grid h-[58px] w-full max-w-[920px] grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,0.85fr)_104px] overflow-hidden rounded-lg border border-slate-200/95 bg-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.38)] ring-1 ring-slate-950/[0.03] pointer-events-auto">
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
              className="focus-ring flex h-[56px] min-w-0 items-center gap-2.5 border-e border-slate-200/85 px-3 text-start transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50/90"
            >
              <Icon
                className="h-4 w-4 shrink-0 text-[#004BB8]"
                aria-hidden="true"
              />
              <span
                title={summary}
                className="min-w-0 truncate whitespace-nowrap text-[0.86rem] font-medium leading-5 text-slate-800"
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
              className="focus-ring h-10 w-24 rounded-lg bg-[#004BB8] text-sm font-semibold text-white transition hover:bg-[#021C2B]"
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
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              ref={stickyDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="sticky-cars-search-title"
              tabIndex={-1}
              className={cn(
                "w-full rounded-2xl border border-slate-200/90 bg-[#fbfaf7]/95 p-4 text-start shadow-[0_30px_90px_-32px_rgba(15,23,42,0.72)] ring-1 ring-white/80 backdrop-blur-md",
                returnToDifferentLocation ? "max-w-5xl" : "max-w-4xl",
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-200/80 pb-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#004BB8]">
                    {t("carsResults.searchCars")}
                  </p>
                  <h2
                    id="sticky-cars-search-title"
                    className="mt-1 truncate text-xl font-bold tracking-tight text-slate-950"
                  >
                    {locationPairSummary}
                  </h2>
                  <p className="mt-1 truncate text-sm font-medium text-slate-600">
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
        className="hidden bg-white pb-0 pt-7 sm:block"
        aria-labelledby="cars-results-heading"
      >
        <div className="page-shell">
          <div className="relative z-10 min-w-0 translate-y-5">
            {!mobileSearchOpen ? renderCarsSearchForm("desktop-full") : null}
          </div>
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
              href="/cars"
              className="transition-colors hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
            >
              Cars
            </Link>
          </li>

          <li className="text-slate-300" aria-hidden="true">
            &gt;
          </li>

          <li className="text-slate-700" aria-current="page">
            Car results
          </li>
        </ol>
      </nav>

      <div ref={resultsGridRef} className="page-shell pb-6 pt-5 sm:pt-6">
        <CarsResultsExperience
          results={initialResults}
          inventoryStatus={inventoryStatus}
          hasSearchContext={hasSearchContext}
          resultHeadingId="cars-results-heading"
          detailsHrefForCar={(car) => buildCarDetailsHref(car.id, values)}
        />
      </div>
    </main>
  );
}

export function CarsResultsExperience({
  results,
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
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const intlLocale = getCarsResultsIntlLocale(locale);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement | null>(null);
  const filtersDialogRef = useRef<HTMLElement | null>(null);
  const filtersCloseButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileFiltersScrollLockRef = useRef<{ restore: () => void } | null>(
    null,
  );
  const [selectedCarFilters, setSelectedCarFilters] =
    useState<SelectedCarFilters>({});
  const [sort, setSort] = useState<CarSort>(
    presentation === "guided-planning" ? "lowestTotal" : "recommended",
  );
  const [carsSortOpen, setCarsSortOpen] = useState(false);
  const [resultsTransitioning, setResultsTransitioning] = useState(false);
  const resultsTransitionTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const carsSortRef = useRef<HTMLDivElement | null>(null);
  const carsSortButtonRef = useRef<HTMLButtonElement | null>(null);
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
  const badges = useMemo(
    () => (guidedPlanning ? new Map() : assignCarBadges(results)),
    [guidedPlanning, results],
  );
  const visibleResults = useMemo(
    () => sortCarResults(filterCarResults(results, selectedCarFilters), sort),
    [results, selectedCarFilters, sort],
  );
  const setTransition = () => {
    setResultsTransitioning(true);
    if (resultsTransitionTimerRef.current)
      clearTimeout(resultsTransitionTimerRef.current);
    resultsTransitionTimerRef.current = setTimeout(
      () => setResultsTransitioning(false),
      160,
    );
  };
  const toggleCarFilter = (groupId: string, option: string) => {
    setTransition();
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
    setTransition();
    setSelectedCarFilters({});
  };
  useEffect(
    () => () => {
      if (resultsTransitionTimerRef.current)
        clearTimeout(resultsTransitionTimerRef.current);
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
  useEffect(() => {
    const releaseExistingLock = () => {
      mobileFiltersScrollLockRef.current?.restore();
      mobileFiltersScrollLockRef.current = null;
    };
    if (!filtersOpen || typeof window === "undefined") {
      releaseExistingLock();
      return releaseExistingLock;
    }
    const media = window.matchMedia("(max-width: 1023px)");
    if (!media.matches) {
      releaseExistingLock();
      return releaseExistingLock;
    }
    let shouldRestoreFocus = true;
    const focusDrawer = requestAnimationFrame(() =>
      filtersCloseButtonRef.current?.focus({ preventScroll: true }),
    );
    const closeForDesktop = () => {
      if (!media.matches) {
        shouldRestoreFocus = false;
        setFiltersOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFiltersOpen(false);
      if (event.key === "Tab" && filtersDialogRef.current) {
        const focusable = [
          ...filtersDialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
    mobileFiltersScrollLockRef.current = lockBodyScroll();
    window.addEventListener("keydown", handleKeyDown);
    media.addEventListener("change", closeForDesktop);
    const launcher = filtersButtonRef.current;
    return () => {
      cancelAnimationFrame(focusDrawer);
      window.removeEventListener("keydown", handleKeyDown);
      media.removeEventListener("change", closeForDesktop);
      releaseExistingLock();
      if (shouldRestoreFocus && launcher && isSafelyFocusableElement(launcher))
        launcher.focus({ preventScroll: true });
    };
  }, [filtersOpen]);

  return (
    <section
      className={cn("min-w-0", embedded ? "mt-6" : "w-full")}
      aria-labelledby={resultHeadingId}
      data-cars-results-experience
    >
      <div className="grid gap-5 lg:grid-cols-[256px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
        {results.length > 0 ? (
          <aside className="relative hidden lg:block">
            <CarFilters
              groups={
                guidedPlanning
                  ? carFilterGroups.filter(
                      (group) => group.id !== "cancellation",
                    )
                  : carFilterGroups
              }
              activeFilterCount={activeFilterCount}
              layout="desktop"
              onClear={clearCarFilters}
              onToggle={toggleCarFilter}
              selectedFilters={selectedCarFilters}
              t={t}
            />
          </aside>
        ) : null}
        <div className="min-w-0 space-y-4">
          {results.length > 0 ? (
            <>
              <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 py-1 sm:gap-3">
                <h2
                  ref={resultHeadingRef}
                  id={resultHeadingId}
                  tabIndex={-1}
                  className={cn(
                    "min-w-0 flex-1 truncate whitespace-nowrap text-[16px] font-semibold leading-6 tracking-[-0.005em] text-[#142033] outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]",
                    !embedded && "sr-only",
                  )}
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
                <button
                  ref={filtersButtonRef}
                  type="button"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35 lg:hidden"
                  onClick={() => setFiltersOpen(true)}
                >
                  <SlidersHorizontal size={17} aria-hidden="true" />
                  {activeFilterCount > 0
                    ? t("filtersWithCount").replace(
                        "{{count}}",
                        String(activeFilterCount),
                      )
                    : t("filters")}
                </button>
                <div className="flex min-w-0 max-w-full flex-nowrap items-center justify-end gap-1 whitespace-nowrap sm:gap-2">
                  <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-700">
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
                      className="inline-flex h-9 min-w-0 max-w-full items-center justify-center gap-2 rounded-md bg-transparent px-2 text-[16px] font-semibold text-[#142033]"
                      onClick={() => setCarsSortOpen((open) => !open)}
                    >
                      <span className="min-w-0 truncate whitespace-nowrap">
                        {selectedCarSortLabel}
                      </span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "shrink-0 transition-transform duration-150",
                          carsSortOpen && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    <div
                      role="menu"
                      aria-hidden={!carsSortOpen}
                      className={cn(
                        "absolute end-0 top-11 z-40 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg",
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
                          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2.5 text-start text-sm font-semibold"
                          onClick={() => {
                            setTransition();
                            setSort(option.value);
                            setCarsSortOpen(false);
                          }}
                        >
                          <span className="w-4 shrink-0 text-[#004BB8]">
                            {sort === option.value ? "✓" : ""}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              {resultsTransitioning ? (
                <div className="w-full space-y-4">
                  {[0, 1, 2].map((item) => (
                    <CarCardSkeleton key={item} />
                  ))}
                </div>
              ) : visibleResults.length ? (
                <div className="w-full space-y-4">
                  {visibleResults.map((car) => (
                    <CarResultCard
                      key={car.id}
                      car={car}
                      badge={badges.get(car.id)}
                      detailsHref={detailsHrefForCar(car)}
                      onSelect={
                        onSelectCar && (isCarSelectable?.(car) ?? true)
                          ? onSelectCar
                          : undefined
                      }
                      actionLabel={actionLabel}
                      actionAriaLabel={actionAriaLabelForCar?.(car)}
                      headingLevel={embedded ? "h3" : "h2"}
                      presentation={presentation}
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
                  className="w-full rounded-xl border border-slate-200 bg-white p-8 text-center"
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
                {resultHeading ?? t("deals.guided.carResults.emptyTitle")}
              </h2>
              <CarsResultsShell
                hasSearchContext={hasSearchContext}
                inventoryStatus={inventoryStatus}
                t={t}
              />
            </>
          )}
        </div>
      </div>
      {filtersOpen ? (
        <aside
          ref={filtersDialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cars-guided-filters-title"
          className="fixed inset-0 z-[10000] flex h-[100dvh] flex-col overflow-hidden bg-white lg:hidden"
        >
          <div className="shrink-0 border-b border-slate-200 bg-white px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
                  id="cars-guided-filters-title"
                  className="text-lg font-bold leading-6 text-slate-950"
                >
                  {t("filters")}
                </h2>
                {activeFilterCount > 0 ? (
                  <p className="mt-1 inline-flex rounded-full bg-[#004BB8]/8 px-2.5 py-1 text-xs font-bold text-[#004BB8]">
                    {activeFilterLabel}
                  </p>
                ) : null}
              </div>
              <button
                ref={filtersCloseButtonRef}
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
                aria-label={t("carsResults.closeFilters")}
                onClick={() => setFiltersOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <CarFilters
              groups={
                guidedPlanning
                  ? carFilterGroups.filter(
                      (group) => group.id !== "cancellation",
                    )
                  : carFilterGroups
              }
              activeFilterCount={activeFilterCount}
              layout="mobile"
              onClear={clearCarFilters}
              onToggle={toggleCarFilter}
              selectedFilters={selectedCarFilters}
              t={t}
            />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4">
            <Button
              type="button"
              variant="ghost"
              disabled={activeFilterCount === 0}
              className="h-12"
              onClick={clearCarFilters}
            >
              {t("clearAll")}
            </Button>
            <Button
              type="button"
              className="h-12 min-w-[8.75rem] bg-[#004BB8] text-white"
              onClick={() => setFiltersOpen(false)}
            >
              {t("done")}
            </Button>
          </div>
        </aside>
      ) : null}
    </section>
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
  placeholder: string;
  secondaryAction?: { label: string; onClick: () => void };
  showClearButton?: boolean;
  strings: Parameters<typeof CarLocationAutocomplete>[0]["strings"];
  value: string;
}) {
  return (
    <div
      className={cn(
        fieldShellClass,
        isCompact && compactFieldShellClass,
        className,
      )}
    >
      <div className={fieldLabelClass}>
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
          className="hidden h-4 w-4 shrink-0 text-slate-500 lg:block"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <CarLocationAutocomplete
            inputRef={inputRef}
            id={`${idPrefix}-${name}`}
            name={name}
            value={value}
            onValueChange={onChange}
            placeholder={placeholder}
            inputClassName={cn(fieldInputClass, showClearButton && "pr-8")}
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
      className={cn(carsDesktopPopoverClassName, shellClassName)}
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
}) {
  const dateFormatter = useCompactDateSummary ? formatCompactDate : formatDate;
  const pickupDisplay = dateFormatter(
    pickupDate,
    intlLocale,
    t("carsResults.selectDate"),
  );
  const dropoffDisplay = dateFormatter(
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
  const rentalDayCount =
    pickupParsed && dropoffParsed
      ? Math.max(
          0,
          Math.round(
            (dropoffParsed.getTime() - pickupParsed.getTime()) / 86_400_000,
          ),
        )
      : 0;
  const rentalDaysLabel = t("carsSearch.rentalDays").replace(
    "{count}",
    String(rentalDayCount),
  );

  return (
    <div
      ref={wrapRef}
      className={cn(fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div className={fieldLabelClass}>
        <CalendarDays
          className="h-3.5 w-3.5 shrink-0 text-[#5CB6B2] lg:hidden"
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">
          {t("carsResults.rentalDatesLabel") || t("carsResults.rentalDates")}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="focus-ring flex h-8 min-w-0 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[16px] font-medium text-slate-900 outline-none md:text-sm lg:font-semibold lg:leading-6"
      >
        {showRentalDuration || isCompact ? (
          <Calendar
            className="h-4 w-4 shrink-0 text-slate-500"
            aria-hidden="true"
          />
        ) : null}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate leading-4",
              !pickupDate && "text-slate-400",
            )}
          >
            {summary}
          </span>
          {showRentalDuration && rentalDayCount > 0 ? (
            <span className="mt-0.5 block text-[11px] font-medium leading-3 text-slate-500">
              {rentalDaysLabel}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            isOpen && "rotate-180",
          )}
          aria-hidden="true"
        />
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
  useMainPageDesktopPresentation,
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
  useMainPageDesktopPresentation: boolean;
}) {
  return (
    <div
      ref={wrapRef}
      className={cn(fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div className={fieldLabelClass}>
        <Clock3
          className="h-3.5 w-3.5 shrink-0 text-[#5CB6B2] lg:hidden"
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">
          {t("carsResults.pickupReturnTimeLabel") ||
            t("carsResults.pickupReturnTime")}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="focus-ring flex h-8 min-w-0 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[16px] font-medium text-slate-900 outline-none md:text-sm lg:font-semibold lg:leading-6"
      >
        {useMainPageDesktopPresentation ? (
          <span className="flex min-w-0 items-center gap-2">
            <Clock
              className="h-4 w-4 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <span className="truncate">
              {formatTimeLabel(pickupTime, intlLocale)}
            </span>
          </span>
        ) : (
          <span className="truncate">
            {formatTimeLabel(pickupTime, intlLocale)} —{" "}
            {formatTimeLabel(dropoffTime, intlLocale)}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
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
  isOpen,
  onSelect,
  onToggle,
  t,
  wrapRef,
  useMainPageDesktopPresentation,
}: {
  driverAge: string;
  isCompact: boolean;
  isOpen: boolean;
  onSelect: (age: string) => void;
  onToggle: () => void;
  t: (key: string) => string;
  wrapRef: RefObject<HTMLDivElement | null>;
  useMainPageDesktopPresentation: boolean;
}) {
  const visibleOptions = useMemo(() => driverAgeOptions, []);

  return (
    <div
      ref={wrapRef}
      className={cn(fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div className={fieldLabelClass}>
        <UserRound
          className="h-3.5 w-3.5 shrink-0 text-[#5CB6B2] lg:hidden"
          aria-hidden="true"
        />
        <span className="min-w-0 truncate">
          {t("carsResults.driverAgeLabel") || t("carsResults.driverAge")}
        </span>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="focus-ring flex h-8 min-w-0 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[16px] font-medium text-slate-900 outline-none md:text-sm lg:font-semibold lg:leading-6"
      >
        {useMainPageDesktopPresentation ? (
          <span className="flex min-w-0 items-center gap-2">
            <UserRound
              className="h-4 w-4 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <span className="truncate">
              {driverAge === defaultDriverAge
                ? t("carsSearch.driverAgeAnyAge")
                : getDriverAgeOptionLabel(driverAge, t)}
            </span>
          </span>
        ) : (
          <span className="truncate">
            {getDriverAgeOptionLabel(driverAge, t)}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
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
  onClear,
  onToggle,
  selectedFilters,
  t,
}: {
  groups: CarFilterGroup[];
  activeFilterCount: number;
  layout: "desktop" | "compact" | "mobile";
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
          ? "desktop-filter-sidebar flex max-h-full flex-col overflow-hidden rounded-2xl border border-[#D8E1EC] bg-[#EEF3F8] p-0 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.42)]"
          : layout === "desktop"
            ? "desktop-filter-sidebar border border-slate-200/80 bg-transparent p-0 shadow-none rounded-none"
            : "overflow-hidden bg-white",
      )}
    >
      {layout === "compact" ? (
        <div className="desktop-filter-sidebar__header shrink-0 border-b border-[#D8E1EC]/80 bg-[#EEF3F8] px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="desktop-filter-sidebar__title flex min-w-0 items-center gap-2 truncate text-[15px] font-semibold leading-5 tracking-[-0.01em] text-slate-950">
              <SlidersHorizontal
                className="desktop-filter-sidebar__icon shrink-0 text-[#004BB8]"
                size={15}
                strokeWidth={2.25}
                aria-hidden="true"
              />
              <span className="truncate">{t("carsResults.filterBy")}</span>
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
                {t("clearAll")}
              </button>
            </div>
          ) : null}
        </div>
      ) : layout === "desktop" ? (
        <div className="desktop-filter-sidebar__header shrink-0 border-b border-slate-200/70 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="truncate text-base font-bold text-slate-950">
              {t("carsResults.filterBy")}
              {activeFilterCount > 0 ? (
                <span className="ms-2 rounded-full bg-[#004BB8] px-2 py-0.5 text-xs text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </h2>
            <SlidersHorizontal
              className="shrink-0 text-[#004BB8]"
              size={18}
              aria-hidden="true"
            />
          </div>
          {activeFilterCount > 0 ? (
            <button
              type="button"
              className="focus-ring mt-2 text-xs font-semibold text-[#004BB8]"
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
            ? "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#EEF3F8] px-2 py-1"
            : layout === "mobile"
              ? "space-y-0 bg-white"
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
  return (
    <section
      className={cn(
        layout === "compact"
          ? "border-t border-[#D8E1EC]/75 first:border-t-0"
          : layout === "mobile"
            ? "border-t border-border py-4 first:border-t-0 first:pt-0"
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
            "group flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-start text-[13px] font-semibold leading-5 tracking-[-0.005em] text-slate-800 transition-colors duration-200 motion-reduce:transition-none hover:bg-[#E5ECF4] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30",
            compactOpen && "text-[#004BB8]",
          )}
        >
          <span className="min-w-0 truncate">{t(group.titleKey)}</span>
          <span className="flex shrink-0 items-center gap-2">
            {selectedOptions.length ? (
              <span className="min-w-5 rounded-full bg-[#E2EAF3] px-2 py-0.5 text-center text-[11px] font-semibold normal-case leading-4 tracking-normal text-[#235A9F] ring-1 ring-[#004BB8]/10 group-hover:bg-[#DCE8F6]">
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
        <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-950">
          {t(group.titleKey)}
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
            <span className="min-w-0 flex-1 truncate">
              {t(option.labelKey)}
            </span>
          );
          return (
            <label
              key={option.id}
              className={cn(
                layout === "compact"
                  ? "flex min-h-8 cursor-pointer items-start justify-between gap-2 rounded-lg px-1.5 py-1 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                  : "flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-sm font-medium transition-all",
                selected
                  ? "font-semibold text-[#021C2B]"
                  : layout === "compact"
                    ? null
                    : "text-slate-600 hover:bg-slate-50",
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
