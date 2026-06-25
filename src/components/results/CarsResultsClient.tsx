"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Search,
  SquarePen,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

type CarsResultsValues = {
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

type SelectedCarFilters = Record<string, string[]>;

const defaultDriverAge = "18-70";
const minimumDriverAge = 18;
const maximumDriverAge = 70;

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";

  return `${String(hour).padStart(2, "0")}:${minute}`;
});

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

const getCarsResultsIntlLocale = (locale: string) => {
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

  if (normalizedLocale.startsWith("ar")) {
    return "ar-u-nu-latn";
  }

  return "en-US";
};

const usesTwentyFourHourCarsResultsTime = (intlLocale: string) =>
  ["de", "es", "fr", "ja", "nl", "pt"].some((localePrefix) =>
    intlLocale.toLowerCase().startsWith(localePrefix),
  );

const usesLocalizedCarsResultsTime = (intlLocale: string) =>
  intlLocale.toLowerCase().startsWith("ar");

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

const formatCompactDate = (date: string, intlLocale: string, fallback: string) => {
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

const formatDate = (date: string, intlLocale: string, fallback: string) => {
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

const getWeekdays = (intlLocale: string) =>
  Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(intlLocale, { weekday: "short" }).format(
      new Date(2024, 0, 7 + index),
    ),
  );

const formatTimeLabel = (time: string, intlLocale: string) => {
  const [hourValue, minuteValue] = time.split(":").map(Number);

  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
    return time || (usesTwentyFourHourCarsResultsTime(intlLocale) ? "10:00" : "10:00 AM");
  }

  if (usesTwentyFourHourCarsResultsTime(intlLocale)) {
    return `${String(hourValue).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")}`;
  }

  if (usesLocalizedCarsResultsTime(intlLocale)) {
    return new Intl.DateTimeFormat(intlLocale, {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(2024, 0, 1, hourValue, minuteValue));
  }

  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;

  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
};

const normalizeDriverAge = (value: string) =>
  driverAgeOptions.includes(value) ? value : defaultDriverAge;

const getCuratedLocationLabel = (location: string, t: (key: string) => string) => {
  const trimmedLocation = location.trim();
  const translationKey = curatedLocationTranslationKeys[trimmedLocation];

  return translationKey ? t(translationKey) : trimmedLocation;
};

const getDriverAgeOptionLabel = (
  age: string,
  t: (key: string) => string,
) => {
  if (age === defaultDriverAge) {
    return t("carsResults.anyDriverAgeRange");
  }

  const yearsOldLabel = t("carsResults.yearsOld");

  return yearsOldLabel.length === 1
    ? `${age}${yearsOldLabel}`
    : `${age} ${yearsOldLabel}`;
};

const fieldShellClass =
  "relative min-h-[50px] rounded-xl border border-slate-300 bg-white px-3 py-1 transition-[min-height,padding,border-color,box-shadow] duration-200 hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-e lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0";

const searchFormGridClass =
  "grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.16fr)_minmax(0,1.08fr)_minmax(0,1.28fr)_minmax(0,1.08fr)_minmax(7rem,0.62fr)_104px] lg:gap-0";

const compactFieldShellClass = "min-h-[46px] py-1 lg:min-h-[44px]";

const fieldLabelClass =
  "mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600";

const fieldInputClass =
  "focus-ring h-8 w-full border-0 bg-transparent p-0 text-[16px] font-medium text-slate-900 outline-none placeholder:text-slate-400 md:text-sm";

export function CarsResultsClient({ values }: { values: CarsResultsValues }) {
  const { locale, t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const intlLocale = getCarsResultsIntlLocale(locale);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [selectedCarFilters, setSelectedCarFilters] =
    useState<SelectedCarFilters>({});
  const [isSearchBarCompact, setIsSearchBarCompact] = useState(false);
  const [isSearchExpandedWhileSticky, setIsSearchExpandedWhileSticky] =
    useState(false);
  const [hasInteractedWithExpandedSearch, setHasInteractedWithExpandedSearch] =
    useState(false);
  const [pickupLocation, setPickupLocation] = useState(values.pickupLocation);
  const [dropoffLocation, setDropoffLocation] = useState(
    values.dropoffLocation || values.pickupLocation,
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
  const dateWrapRef = useRef<HTMLDivElement | null>(null);
  const timeWrapRef = useRef<HTMLDivElement | null>(null);
  const driverAgeWrapRef = useRef<HTMLDivElement | null>(null);
  const stickySentinelRef = useRef<HTMLDivElement | null>(null);
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const expandedSearchScrollYRef = useRef(0);
  const pickupInputRef = useRef<HTMLInputElement | null>(null);
  const dropoffInputRef = useRef<HTMLInputElement | null>(null);
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
  const dropoffLocationLabel = getCuratedLocationLabel(trimmedDropoffLocation, t);
  const locationSummary = trimmedPickupLocation
    ? trimmedDropoffLocation && trimmedDropoffLocation !== trimmedPickupLocation
      ? interpolate(t("carsResults.pickupToReturn"), {
          pickup: pickupLocationLabel,
          return: dropoffLocationLabel,
        })
      : pickupLocationLabel
    : t("carsResults.pickupLocationNeeded");
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
  const showFullSearchForm = !isSearchBarCompact || isSearchExpandedWhileSticky;
  const showCompactSearchSummary =
    isSearchBarCompact && !isSearchExpandedWhileSticky;
  const pickupSummary = pickupLocationLabel || t("carsResults.pickupLocation");
  const returnSummary =
    dropoffLocationLabel || pickupLocationLabel || t("carsResults.returnLocation");
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
      : formatCompactDate(
          pickupDate,
          intlLocale,
          t("carsResults.selectDates"),
        )
    : t("carsResults.selectRentalDates");
  const timeSummary = `${formatTimeLabel(pickupTime, intlLocale)} — ${formatTimeLabel(
    dropoffTime,
    intlLocale,
  )}`;
  const driverAgeSummary = getDriverAgeOptionLabel(driverAge, t);
  const isExpandedStickySearchActive =
    isSearchBarCompact && isSearchExpandedWhileSticky;
  const canAutoCollapseExpandedSearch =
    isExpandedStickySearchActive &&
    !hasInteractedWithExpandedSearch &&
    !datesOpen &&
    !timesOpen &&
    !driverAgeOpen;

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
    setDatesOpen(false);
    setTimesOpen(false);
    setDriverAgeOpen(false);
  }, []);

  const toggleCarFilter = (groupId: string, option: string) => {
    setSelectedCarFilters((current) => {
      const currentGroupSelections = current[groupId] ?? [];
      const isSelected = currentGroupSelections.includes(option);
      const nextGroupSelections = isSelected
        ? currentGroupSelections.filter((selected) => selected !== option)
        : [...currentGroupSelections, option];
      const nextFilters = { ...current };

      if (nextGroupSelections.length > 0) {
        nextFilters[groupId] = nextGroupSelections;
      } else {
        delete nextFilters[groupId];
      }

      return nextFilters;
    });
  };

  const clearCarFilters = () => setSelectedCarFilters({});

  useEffect(() => {
    const sentinel = stickySentinelRef.current;

    if (!sentinel || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldCompact = !entry.isIntersecting;
        setIsSearchBarCompact(shouldCompact);

        if (!shouldCompact) {
          setIsSearchExpandedWhileSticky(false);
          setHasInteractedWithExpandedSearch(false);
        }
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canAutoCollapseExpandedSearch) {
      return undefined;
    }

    let animationFrame = 0;

    const onScroll = () => {
      if (animationFrame) {
        return;
      }

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
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (datesOpen && !dateWrapRef.current?.contains(target)) {
        setDatesOpen(false);
      }

      if (timesOpen && !timeWrapRef.current?.contains(target)) {
        setTimesOpen(false);
      }

      if (driverAgeOpen && !driverAgeWrapRef.current?.contains(target)) {
        setDriverAgeOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [datesOpen, driverAgeOpen, timesOpen]);

  const selectRentalDate = (date: Date) => {
    if (isBeforeToday(date)) {
      return;
    }

    const selectedIso = toIsoDate(date);
    markExpandedSearchInteraction();

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
    setIsSearchExpandedWhileSticky(false);
    setHasInteractedWithExpandedSearch(false);
    setDatesOpen(false);
    setTimesOpen(false);
    setDriverAgeOpen(false);
  }, []);

  const closeMobileSearchDrawer = useCallback(() => {
    setMobileSearchOpen(false);
    setDatesOpen(false);
    setTimesOpen(false);
    setDriverAgeOpen(false);
  }, []);

  const renderMobileControlsRow = () => (
    <div className="mx-auto flex w-full max-w-3xl min-w-0 items-stretch gap-2.5">
      <Button
        type="button"
        variant="secondary"
        aria-label={
          activeFilterCount > 0
            ? interpolate(t("carsResults.openFiltersWithCount"), {
                count: String(activeFilterCount),
              })
            : t("carsResults.openFilters")
        }
        className="relative h-14 w-[68px] shrink-0 rounded-md border border-slate-200/90 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:text-slate-900 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        onClick={() => setFiltersOpen(true)}
      >
        <span className="flex flex-col items-center justify-center gap-1 leading-none">
          <SlidersHorizontal size={17} strokeWidth={2.3} aria-hidden="true" />
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
        className="flex h-14 min-w-0 max-w-full flex-1 items-center justify-between gap-3 overflow-hidden rounded-md border border-slate-200/90 bg-white px-4 py-0 text-start shadow-[0_6px_16px_rgba(15,23,42,0.06)] transition hover:border-slate-300 hover:shadow-[0_8px_18px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
      >
        <span className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
          <span className="block truncate text-sm font-bold leading-5 text-slate-950">
            {pickupSummary} → {returnSummary}
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

  const renderCarsSearchForm = (placement: "desktop" | "mobile") => {
    const compactSummaryVisible =
      placement === "desktop" && showCompactSearchSummary;
    const fullFormVisible = placement === "mobile" || showFullSearchForm;
    const isCompactSearch =
      placement === "desktop" &&
      isSearchBarCompact &&
      !isSearchExpandedWhileSticky;

    return (
      <form
        ref={searchFormRef}
        action="/cars/results"
        method="get"
        className={cn(
          "mx-auto w-full min-w-0 max-w-[72rem]",
          compactSummaryVisible && "max-w-[54rem]",
        )}
        onFocusCapture={markExpandedSearchInteraction}
        onChangeCapture={markExpandedSearchInteraction}
        onSubmit={() => {
          closeMobileSearchDrawer();
          setIsSearchExpandedWhileSticky(false);
          setHasInteractedWithExpandedSearch(false);
        }}
      >
        <input type="hidden" name="pickupDate" value={pickupDate} />
        <input type="hidden" name="dropoffDate" value={dropoffDate} />
        <input type="hidden" name="pickupTime" value={pickupTime} />
        <input type="hidden" name="dropoffTime" value={dropoffTime} />
        <input type="hidden" name="driverAge" value={driverAge} />
        <div
          className={cn(
            "overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.075)] transition-[padding,border-color,box-shadow,border-eadius] duration-200",
            compactSummaryVisible
              ? "rounded-sm border-slate-300 bg-white p-1 shadow-[0_8px_22px_rgba(15,23,42,0.12)]"
              : "p-1",
          )}
        >
          {compactSummaryVisible ? (
            <button
              type="button"
              aria-label={t("carsResults.editCarSearch")}
              onClick={expandStickySearch}
              className="group focus-ring flex w-full min-w-0 flex-col gap-2 rounded-[2px] bg-white px-3 py-2.5 text-start transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
            >
              <span className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] lg:items-center lg:gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
                  <MapPin
                    className="h-4 w-4 shrink-0 text-violet-600"
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 items-center gap-1.5 truncate">
                    <span className="min-w-0 truncate">{pickupSummary}</span>
                    <span
                      className="shrink-0 text-slate-400"
                      aria-hidden="true"
                    >
                      →
                    </span>
                    <span className="min-w-0 truncate">{returnSummary}</span>
                  </span>
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-slate-600">
                  {rentalDateSummary}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-slate-600">
                  {timeSummary}
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-slate-600">
                  {driverAgeSummary}
                </span>
              </span>
              <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-[2px] border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700 shadow-sm transition group-hover:border-indigo-200 group-hover:bg-white sm:self-center">
                <SquarePen className="h-3.5 w-3.5" aria-hidden="true" />
                {t("carsResults.edit")}
              </span>
            </button>
          ) : null}

          {fullFormVisible ? (
            <div className={searchFormGridClass}>
              <SearchInputCell
                icon={MapPin}
                inputRef={pickupInputRef}
                isCompact={isCompactSearch}
                label={t("carsResults.pickupLocation")}
                name="pickupLocation"
                onChange={(nextValue) => {
                  markExpandedSearchInteraction();
                  setPickupLocation(nextValue);
                }}
                onClear={() => {
                  markExpandedSearchInteraction();
                  setPickupLocation("");
                  pickupInputRef.current?.focus();
                }}
                placeholder={t("carsSearch.pickupLocationPlaceholder")}
                value={pickupLocation}
                clearLabel={t("carsSearch.clearPickupLocation")}
                className="lg:rounded-s-xl"
              />
              <SearchInputCell
                icon={MapPin}
                inputRef={dropoffInputRef}
                isCompact={isCompactSearch}
                label={t("carsResults.returnLocation")}
                name="dropoffLocation"
                onChange={(nextValue) => {
                  markExpandedSearchInteraction();
                  setDropoffLocation(nextValue);
                }}
                onClear={() => {
                  markExpandedSearchInteraction();
                  setDropoffLocation("");
                  dropoffInputRef.current?.focus();
                }}
                placeholder={t("carsResults.sameAsPickup")}
                value={dropoffLocation}
                clearLabel={t("carsSearch.clearReturnLocation")}
              />
              <SearchDateCell
                dropoffDate={dropoffDate}
                isCompact={isCompactSearch}
                isOpen={datesOpen}
                onClear={() => {
                  markExpandedSearchInteraction();
                  setPickupDate("");
                  setDropoffDate("");
                }}
                onDone={() => {
                  markExpandedSearchInteraction();
                  setDatesOpen(false);
                }}
                onNextMonth={() => {
                  markExpandedSearchInteraction();
                  setVisibleMonthDate((current) => addMonths(current, 1));
                }}
                onPreviousMonth={() => {
                  markExpandedSearchInteraction();
                  setVisibleMonthDate((current) => addMonths(current, -1));
                }}
                onSelectDate={selectRentalDate}
                onToggle={() => {
                  markExpandedSearchInteraction();
                  setDatesOpen((current) => !current);
                  setTimesOpen(false);
                  setDriverAgeOpen(false);
                }}
                pickupDate={pickupDate}
                visibleMonthDate={visibleMonthDate}
                t={t}
                intlLocale={intlLocale}
                wrapRef={dateWrapRef}
              />
              <SearchTimeCell
                dropoffTime={dropoffTime}
                isCompact={isCompactSearch}
                isOpen={timesOpen}
                onToggle={() => {
                  markExpandedSearchInteraction();
                  setTimesOpen((current) => !current);
                  setDatesOpen(false);
                  setDriverAgeOpen(false);
                }}
                pickupTime={pickupTime}
                setDropoffTime={(nextTime) => {
                  markExpandedSearchInteraction();
                  setDropoffTime(nextTime);
                }}
                setPickupTime={(nextTime) => {
                  markExpandedSearchInteraction();
                  setPickupTime(nextTime);
                }}
                t={t}
                intlLocale={intlLocale}
                wrapRef={timeWrapRef}
              />
              <DriverAgeCell
                driverAge={driverAge}
                isCompact={isCompactSearch}
                isOpen={driverAgeOpen}
                onSelect={(age) => {
                  markExpandedSearchInteraction();
                  setDriverAge(age);
                  setDriverAgeOpen(false);
                }}
                onToggle={() => {
                  markExpandedSearchInteraction();
                  setDriverAgeOpen((current) => !current);
                  setDatesOpen(false);
                  setTimesOpen(false);
                }}
                t={t}
                wrapRef={driverAgeWrapRef}
              />
              <Button
                type="submit"
                className={cn(
                  "mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 transition-[min-height,height,box-shadow] duration-200 sm:mt-3 lg:mt-0 lg:h-auto lg:self-stretch lg:rounded-none lg:rounded-e-xl lg:border lg:border-s-0 lg:border-indigo-600/20",
                  isCompactSearch ? "lg:min-h-[46px]" : "lg:min-h-[54px]",
                )}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                {t("carsResults.searchCars")}
              </Button>
            </div>
          ) : null}
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
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
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

      <div ref={stickySentinelRef} className="h-px" aria-hidden="true" />
      <section
        className={cn(
          "sticky top-0 z-40 hidden border-b border-slate-200/80 bg-[#f6f8fb]/95 backdrop-blur transition-[padding,box-shadow] duration-200 sm:block",
          showCompactSearchSummary
            ? "py-1.5 shadow-[0_3px_12px_rgba(15,23,42,0.05)]"
            : "py-2.5 shadow-[0_4px_16px_rgba(15,23,42,0.06)]",
        )}
        aria-labelledby="cars-results-heading"
      >
        <div className="page-shell">
          <div
            className={cn(
              "mb-2 flex items-center justify-between gap-3 lg:hidden",
              showCompactSearchSummary && "hidden",
            )}
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">
              {t("carsResults.resultsLabel")}
            </p>
            <Button
              type="button"
              variant="secondary"
              aria-label={
                activeFilterCount > 0
                  ? interpolate(t("carsResults.openFiltersWithCount"), {
                      count: String(activeFilterCount),
                    })
                  : t("carsResults.openFilters")
              }
              className="relative h-10 rounded-md border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {t("filters")}
              {activeFilterCount > 0 ? (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-50 px-1.5 text-[11px] font-bold leading-none text-indigo-700 ring-1 ring-indigo-100">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </div>

          {!mobileSearchOpen ? renderCarsSearchForm("desktop") : null}
        </div>
      </section>

      <div className="page-shell grid gap-5 pb-6 pt-5 sm:pt-6 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="hidden lg:sticky lg:top-[7.5rem] lg:block lg:max-h-[calc(100vh-8.5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
          <CarFilters
            activeFilterCount={activeFilterCount}
            layout="desktop"
            onClear={clearCarFilters}
            onToggle={toggleCarFilter}
            selectedFilters={selectedCarFilters}
            t={t}
          />
        </aside>

        <section className="min-w-0 space-y-4" aria-label={t("carsResults.carResultsAria")}>
          <h1 id="cars-results-heading" className="sr-only">
            {interpolate(t("carsResults.resultsFor"), { location: locationSummary })}
          </h1>

          <div className="hidden w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-navy">
                {interpolate(t("carsResults.resultsFor"), { location: locationSummary })}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {rentalDateSummary} · {timeSummary} · {driverAgeSummary}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl border-slate-300 text-sm font-bold transition hover:border-slate-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 lg:hidden"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
              {activeFilterCount > 0
                ? t("filtersWithCount").replace("{{count}}", String(activeFilterCount))
                : t("filters")}
            </Button>
          </div>

          <CarsResultsShell hasSearchContext={hasSearchContext} t={t} />
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
        aria-label={t("carsResults.carFiltersAria")}
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
              aria-label={t("carsResults.closeFilters")}
              onClick={() => setFiltersOpen(false)}
            >
              <X size={20} />
            </Button>
          </div>
          <CarFilters
            activeFilterCount={activeFilterCount}
            layout="mobile"
            onClear={clearCarFilters}
            onToggle={toggleCarFilter}
            selectedFilters={selectedCarFilters}
            t={t}
          />
        </div>

        <div className="grid gap-2 border-t border-slate-200 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {activeFilterCount > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full rounded-xl border-slate-300 text-sm font-bold text-slate-700"
              onClick={clearCarFilters}
            >
              {t("carsResults.resetFilters")}
            </Button>
          ) : null}
          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-700/20"
            onClick={() => setFiltersOpen(false)}
          >
            {t("done")}
            {activeFilterCount > 0 ? ` · ${activeFilterCount}` : ""}
          </Button>
        </div>
      </aside>
    </main>
  );
}

function SearchInputCell({
  clearLabel,
  className,
  icon: Icon,
  inputRef,
  isCompact,
  label,
  name,
  onChange,
  onClear,
  placeholder,
  value,
}: {
  clearLabel: string;
  className?: string;
  icon: typeof MapPin;
  inputRef: RefObject<HTMLInputElement | null>;
  isCompact: boolean;
  label: string;
  name: keyof Pick<CarsResultsValues, "pickupLocation" | "dropoffLocation">;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder: string;
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
      <label htmlFor={name} className={fieldLabelClass}>
        <Icon className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={cn(fieldInputClass, "pr-8")}
          autoComplete="off"
        />
        {value ? (
          <button
            type="button"
            aria-label={clearLabel}
            onClick={onClear}
            className="absolute end-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SearchDateCell({
  dropoffDate,
  isCompact,
  isOpen,
  onClear,
  onDone,
  onNextMonth,
  onPreviousMonth,
  onSelectDate,
  onToggle,
  pickupDate,
  visibleMonthDate,
  t,
  intlLocale,
  wrapRef,
}: {
  dropoffDate: string;
  isCompact: boolean;
  isOpen: boolean;
  onClear: () => void;
  onDone: () => void;
  onNextMonth: () => void;
  onPreviousMonth: () => void;
  onSelectDate: (date: Date) => void;
  onToggle: () => void;
  pickupDate: string;
  visibleMonthDate: Date;
  t: (key: string) => string;
  intlLocale: string;
  wrapRef: RefObject<HTMLDivElement | null>;
}) {
  const pickupDisplay = formatDate(
    pickupDate,
    intlLocale,
    t("carsResults.selectDate"),
  );
  const dropoffDisplay = formatDate(
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
      className={cn(fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div className={fieldLabelClass}>
        <CalendarDays
          className="h-3.5 w-3.5 text-violet-600"
          aria-hidden="true"
        />
        {t("carsResults.rentalDates")}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[16px] font-medium text-slate-900 outline-none md:text-sm"
      >
        <span className={cn("truncate", !pickupDate && "text-slate-400")}>
          {summary}
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
          className="absolute start-0 end-0 top-[calc(100%+10px)] z-[80] max-h-[min(72vh,620px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:end-auto sm:w-[min(92vw,640px)] sm:p-4"
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
                                ? "text-slate-500 hover:bg-indigo-50"
                                : "text-slate-900 hover:bg-indigo-50",
                            isInRange &&
                              "rounded-md bg-indigo-100 text-indigo-900 hover:bg-indigo-100",
                            (isPickup || isDropoff) &&
                              "bg-indigo-700 text-white hover:bg-indigo-700",
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
              className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              {t("done")}
            </button>
          </div>
        </div>
      ) : null}
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
}) {
  return (
    <div
      ref={wrapRef}
      className={cn(fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div className={fieldLabelClass}>
        <Clock3 className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        {t("carsResults.pickupReturnTime")}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[16px] font-medium text-slate-900 outline-none md:text-sm"
      >
        <span className="truncate">
          {formatTimeLabel(pickupTime, intlLocale)} — {formatTimeLabel(dropoffTime, intlLocale)}
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
          role="menu"
          aria-label={t("carsResults.pickupReturnTimeSelector")}
          className="absolute start-0 end-0 top-[calc(100%+10px)] z-[80] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:end-auto sm:w-[min(92vw,340px)]"
        >
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                {t("carsResults.pickupTime")}
              </span>
              <select
                value={pickupTime}
                onChange={(event) => setPickupTime(event.target.value)}
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-indigo-300 md:text-sm"
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
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-indigo-300 md:text-sm"
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
}: {
  driverAge: string;
  isCompact: boolean;
  isOpen: boolean;
  onSelect: (age: string) => void;
  onToggle: () => void;
  t: (key: string) => string;
  wrapRef: RefObject<HTMLDivElement | null>;
}) {
  const visibleOptions = useMemo(() => driverAgeOptions, []);

  return (
    <div
      ref={wrapRef}
      className={cn(fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div className={fieldLabelClass}>
        <Users className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        {t("carsResults.driverAge")}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-start text-[16px] font-medium text-slate-900 outline-none md:text-sm"
      >
        <span className="truncate">{getDriverAgeOptionLabel(driverAge, t)}</span>
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
          className="absolute start-0 end-0 top-[calc(100%+10px)] z-[80] max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:end-auto sm:w-56"
        >
          {visibleOptions.map((age) => (
            <button
              key={age}
              type="button"
              role="option"
              aria-selected={age === driverAge}
              onClick={() => onSelect(age)}
              className={cn(
                "focus-ring flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-start text-sm font-semibold transition-colors hover:bg-indigo-50",
                age === driverAge
                  ? "bg-indigo-50 text-indigo-800"
                  : "text-slate-700",
              )}
            >
              {getDriverAgeOptionLabel(age, t)}
              {age === driverAge ? (
                <CheckCircle2
                  className="h-4 w-4 text-indigo-700"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CarsResultsShell({
  hasSearchContext,
  t,
}: {
  hasSearchContext: boolean;
  t: (key: string) => string;
}) {
  return (
    <div
      className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-semibold text-muted shadow-sm"
      role="status"
    >
      {hasSearchContext
        ? t("carsResults.emptyInventory")
        : t("carsResults.enterPickupDetails")}
    </div>
  );
}

function CarFilters({
  activeFilterCount,
  layout,
  onClear,
  onToggle,
  selectedFilters,
  t,
}: {
  activeFilterCount: number;
  layout: "desktop" | "mobile";
  onClear: () => void;
  onToggle: (groupId: string, option: string) => void;
  selectedFilters: SelectedCarFilters;
  t: (key: string) => string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden",
        layout === "desktop"
          ? "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.04]"
          : "bg-white",
      )}
    >
      <div className="flex items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-3 py-3">
        <h2 className="text-base font-semibold text-white/95">{t("carsResults.filterBy")}</h2>
        <div className="flex shrink-0 items-center gap-2">
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-white/70">
              {interpolate(t("carsResults.activeFilterCount"), {
                count: String(activeFilterCount),
              })}
            </span>
          ) : null}
          <SlidersHorizontal
            className="text-white/90"
            size={18}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="space-y-3 bg-white px-3 py-3">
        {activeFilterCount > 0 ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2.5">
            <span className="text-sm font-semibold text-indigo-950">
              {interpolate(t("carsResults.selectedFilterCount"), {
                count: String(activeFilterCount),
              })}
            </span>
            <button
              type="button"
              className="focus-ring rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
              onClick={onClear}
            >
              {t("carsResults.reset")}
            </button>
          </div>
        ) : null}

        {carFilterGroups.map((group) => (
          <FilterSection
            key={group.id}
            group={group}
            onToggle={onToggle}
            selectedOptions={selectedFilters[group.id] ?? []}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function FilterSection({
  group,
  onToggle,
  selectedOptions,
  t,
}: {
  group: CarFilterGroup;
  onToggle: (groupId: string, option: string) => void;
  selectedOptions: string[];
  t: (key: string) => string;
}) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-sm shadow-slate-900/[0.025]">
      <h3 className="text-sm font-semibold text-slate-900">{t(group.titleKey)}</h3>
      <div className="mt-2 space-y-1.5">
        {group.options.map((option) => {
          const isSelected = selectedOptions.includes(option.id);

          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all",
                isSelected
                  ? "border-indigo-200 bg-indigo-50 text-indigo-900 shadow-sm shadow-indigo-900/[0.03]"
                  : "border-slate-200/70 bg-white text-slate-700 hover:border-indigo-100 hover:bg-indigo-50/40 hover:text-slate-950",
              )}
            >
              <input
                type="checkbox"
                className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
                checked={isSelected}
                onChange={() => onToggle(group.id, option.id)}
              />
              <span className="min-w-0 flex-1 truncate">{t(option.labelKey)}</span>
              {isSelected ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-indigo-700"
                  aria-hidden="true"
                />
              ) : null}
            </label>
          );
        })}
      </div>
    </section>
  );
}
