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
  PencilLine,
  Search,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
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

const defaultDriverAge = "18-70";
const driverAgeRangeLabel = "Any driver age 18–70";

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

const formatCompactDate = (date: string) => {
  if (!date) {
    return "Select dates";
  }

  const [year, month, day] = date.split("-").map(Number);

  return year && month && day
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(new Date(year, month - 1, day))
    : date;
};

const formatDate = (date: string) => {
  if (!date) {
    return "Select date";
  }

  const [year, month, day] = date.split("-").map(Number);

  return year && month && day
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
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

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatTimeLabel = (time: string) => {
  const [hourValue, minuteValue] = time.split(":").map(Number);

  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
    return time || "10:00 AM";
  }

  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;

  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
};

const normalizeDriverAge = (value: string) =>
  driverAgeOptions.includes(value) ? value : defaultDriverAge;

const getDriverAgeOptionLabel = (age: string) =>
  age === defaultDriverAge ? driverAgeRangeLabel : `${age} years old`;

const fieldShellClass =
  "relative min-h-[54px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 transition-[min-height,padding,border-color,box-shadow] duration-200 hover:border-slate-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/40 lg:rounded-none lg:border-0 lg:border-r lg:border-slate-200 lg:hover:border-slate-200 lg:focus-within:border-slate-200 lg:focus-within:ring-0";

const searchFormGridClass =
  "grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.16fr)_minmax(0,1.08fr)_minmax(0,1.28fr)_minmax(0,1.08fr)_minmax(7rem,0.62fr)_104px] lg:gap-0";

const compactFieldShellClass = "min-h-[48px] py-1 lg:min-h-[46px]";

const fieldLabelClass =
  "mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase leading-4 tracking-wide text-slate-600";

const fieldInputClass =
  "focus-ring h-8 w-full border-0 bg-transparent p-0 text-[16px] font-medium text-slate-900 outline-none placeholder:text-slate-400 md:text-sm";

export function CarsResultsClient({ values }: { values: CarsResultsValues }) {
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
  const locationSummary = pickupLocation.trim()
    ? dropoffLocation.trim() && dropoffLocation.trim() !== pickupLocation.trim()
      ? `${pickupLocation.trim()} to ${dropoffLocation.trim()}`
      : pickupLocation.trim()
    : "Pickup location needed";
  const showFullSearchForm = !isSearchBarCompact || isSearchExpandedWhileSticky;
  const showCompactSearchSummary =
    isSearchBarCompact && !isSearchExpandedWhileSticky;
  const pickupSummary = pickupLocation.trim() || "Pickup location";
  const returnSummary =
    dropoffLocation.trim() || pickupLocation.trim() || "Return location";
  const rentalDateSummary = pickupDate
    ? dropoffDate
      ? `${formatCompactDate(pickupDate)} — ${formatCompactDate(dropoffDate)}`
      : formatCompactDate(pickupDate)
    : "Select rental dates";
  const timeSummary = `${formatTimeLabel(pickupTime)} — ${formatTimeLabel(
    dropoffTime,
  )}`;
  const driverAgeSummary = getDriverAgeOptionLabel(driverAge);
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

  const focusSearchForEditing = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsSearchExpandedWhileSticky(true);
    window.setTimeout(() => pickupInputRef.current?.focus(), 120);
  };

  return (
    <main className="flex-1 bg-[#f6f8fb] pb-8">
      <div ref={stickySentinelRef} className="h-px" aria-hidden="true" />
      <section
        className={cn(
          "sticky top-0 z-40 border-b border-slate-200/80 bg-[#f6f8fb]/95 backdrop-blur transition-[padding,box-shadow] duration-200",
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
              Cars results
            </p>
          </div>

          <form
            ref={searchFormRef}
            action="/cars/results"
            method="get"
            className={cn(
              "mx-auto w-full min-w-0 max-w-[72rem]",
              showCompactSearchSummary && "max-w-[54rem]",
            )}
            onFocusCapture={markExpandedSearchInteraction}
            onChangeCapture={markExpandedSearchInteraction}
            onSubmit={() => {
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
                "overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.075)] transition-[padding,box-shadow] duration-200",
                showCompactSearchSummary
                  ? "border-slate-200/80 bg-white/95 p-1 shadow-[0_8px_20px_rgba(15,23,42,0.07)]"
                  : "p-1",
              )}
            >
              {showCompactSearchSummary ? (
                <button
                  type="button"
                  aria-label="Edit car search"
                  onClick={expandStickySearch}
                  className="focus-ring flex w-full min-w-0 flex-col gap-2 rounded-xl bg-gradient-to-r from-white via-white to-indigo-50/35 px-3 py-2.5 text-left transition hover:bg-indigo-50/55 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4"
                >
                  <span className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.8fr)] lg:items-center lg:gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-950">
                      <MapPin
                        className="h-4 w-4 shrink-0 text-violet-600"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate">
                        {pickupSummary} → {returnSummary}
                      </span>
                    </span>
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-700">
                      {rentalDateSummary}
                    </span>
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-700">
                      {timeSummary}
                    </span>
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-600">
                      {driverAgeSummary}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-indigo-700 shadow-sm sm:self-center">
                    <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </span>
                </button>
              ) : null}

              {showFullSearchForm ? (
                <div className={searchFormGridClass}>
                  <SearchInputCell
                    icon={MapPin}
                    inputRef={pickupInputRef}
                    isCompact={
                      isSearchBarCompact && !isSearchExpandedWhileSticky
                    }
                    label="Pickup location"
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
                    placeholder="Airport, city, or address"
                    value={pickupLocation}
                    clearLabel="Clear pickup location"
                    className="lg:rounded-l-xl"
                  />
                  <SearchInputCell
                    icon={MapPin}
                    inputRef={dropoffInputRef}
                    isCompact={
                      isSearchBarCompact && !isSearchExpandedWhileSticky
                    }
                    label="Return location"
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
                    placeholder="Same as pickup"
                    value={dropoffLocation}
                    clearLabel="Clear return location"
                  />
                  <SearchDateCell
                    dropoffDate={dropoffDate}
                    isCompact={
                      isSearchBarCompact && !isSearchExpandedWhileSticky
                    }
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
                    wrapRef={dateWrapRef}
                  />
                  <SearchTimeCell
                    dropoffTime={dropoffTime}
                    isCompact={
                      isSearchBarCompact && !isSearchExpandedWhileSticky
                    }
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
                    wrapRef={timeWrapRef}
                  />
                  <DriverAgeCell
                    driverAge={driverAge}
                    isCompact={
                      isSearchBarCompact && !isSearchExpandedWhileSticky
                    }
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
                    wrapRef={driverAgeWrapRef}
                  />
                  <Button
                    type="submit"
                    className={cn(
                      "mt-2 h-12 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-700/20 transition-[min-height,height,box-shadow] duration-200 sm:mt-3 lg:mt-0 lg:h-auto lg:self-stretch lg:rounded-none lg:rounded-r-xl lg:border lg:border-l-0 lg:border-indigo-600/20",
                      isSearchBarCompact && !isSearchExpandedWhileSticky
                        ? "lg:min-h-[46px]"
                        : "lg:min-h-[54px]",
                    )}
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Search
                  </Button>
                </div>
              ) : null}
            </div>
          </form>
        </div>
      </section>

      <div className="page-shell grid gap-5 pb-6 pt-5 sm:pt-6 lg:grid-cols-1">
        <section
          className="mx-auto min-w-0 max-w-5xl space-y-4"
          aria-label="Car results"
        >
          <h1 id="cars-results-heading" className="sr-only">
            Cars results for {locationSummary}
          </h1>

          <div className="hidden w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-navy">
                Cars results for {locationSummary}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {rentalDateSummary} · {timeSummary} · {driverAgeSummary}
              </p>
            </div>
          </div>

          <div className="space-y-3 sm:hidden">
            <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-bold text-navy">
                Cars results for {locationSummary}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {rentalDateSummary} · {timeSummary}
              </p>
            </div>
          </div>

          <CarsResultsShell
            hasSearchContext={hasSearchContext}
            onEditSearch={focusSearchForEditing}
          />
        </section>
      </div>
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
            className="absolute right-0 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
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
  wrapRef: RefObject<HTMLDivElement | null>;
}) {
  const pickupDisplay = formatDate(pickupDate);
  const dropoffDisplay = formatDate(dropoffDate);
  const summary = pickupDate
    ? dropoffDate
      ? `${pickupDisplay} — ${dropoffDisplay}`
      : pickupDisplay
    : "Pickup date — Return date";
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
        Rental dates
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-left text-[16px] font-medium text-slate-900 outline-none md:text-sm"
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
          aria-label="Rental date range calendar"
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-[80] max-h-[min(72vh,620px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:right-auto sm:w-[min(92vw,640px)] sm:p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={onPreviousMonth}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-center text-sm font-bold text-slate-900">
              Select pickup, then return
            </p>
            <button
              type="button"
              aria-label="Next month"
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
                    {monthDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
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
                          aria-label={`Select ${day.toLocaleDateString(
                            "en-US",
                            {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}${isBeforePickup ? "; starts a new pickup date" : ""}`}
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
              Clear
            </button>
            <button
              type="button"
              onClick={onDone}
              className="focus-ring rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Done
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
  wrapRef,
}: {
  dropoffTime: string;
  isCompact: boolean;
  isOpen: boolean;
  onToggle: () => void;
  pickupTime: string;
  setDropoffTime: (time: string) => void;
  setPickupTime: (time: string) => void;
  wrapRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={wrapRef}
      className={cn(fieldShellClass, isCompact && compactFieldShellClass)}
    >
      <div className={fieldLabelClass}>
        <Clock3 className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
        Pickup / return time
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-left text-[16px] font-medium text-slate-900 outline-none md:text-sm"
      >
        <span className="truncate">
          {formatTimeLabel(pickupTime)} — {formatTimeLabel(dropoffTime)}
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
          aria-label="Pickup and return time selector"
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-[80] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:right-auto sm:w-[min(92vw,340px)]"
        >
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Pickup time
              </span>
              <select
                value={pickupTime}
                onChange={(event) => setPickupTime(event.target.value)}
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-indigo-300 md:text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={`pickup-${time}`} value={time}>
                    {formatTimeLabel(time)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Return time
              </span>
              <select
                value={dropoffTime}
                onChange={(event) => setDropoffTime(event.target.value)}
                className="focus-ring h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[16px] font-semibold text-slate-950 outline-none transition focus:border-indigo-300 md:text-sm"
              >
                {timeOptions.map((time) => (
                  <option key={`return-${time}`} value={time}>
                    {formatTimeLabel(time)}
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
  wrapRef,
}: {
  driverAge: string;
  isCompact: boolean;
  isOpen: boolean;
  onSelect: (age: string) => void;
  onToggle: () => void;
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
        Driver age
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="focus-ring flex h-8 w-full items-center justify-between gap-2 rounded-md border-0 bg-transparent p-0 text-left text-[16px] font-medium text-slate-900 outline-none md:text-sm"
      >
        <span className="truncate">{getDriverAgeOptionLabel(driverAge)}</span>
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
          aria-label="Driver age"
          className="absolute left-0 right-0 top-[calc(100%+10px)] z-[80] max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_42px_rgba(15,23,42,0.18)] sm:right-auto sm:w-56"
        >
          {visibleOptions.map((age) => (
            <button
              key={age}
              type="button"
              role="option"
              aria-selected={age === driverAge}
              onClick={() => onSelect(age)}
              className={cn(
                "focus-ring flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-indigo-50",
                age === driverAge
                  ? "bg-indigo-50 text-indigo-800"
                  : "text-slate-700",
              )}
            >
              {getDriverAgeOptionLabel(age)}
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
  onEditSearch,
}: {
  hasSearchContext: boolean;
  onEditSearch: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <div className="relative isolate px-5 py-8 text-center sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <div
          className="pointer-events-none absolute inset-x-8 top-0 -z-10 h-28 rounded-full bg-indigo-50/80 blur-3xl"
          aria-hidden="true"
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 sm:h-16 sm:w-16">
          <Search className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-black tracking-[-0.02em] text-slate-950 sm:text-2xl">
          {hasSearchContext
            ? "No cars found for this search"
            : "Start a car search"}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm font-medium leading-6 text-slate-600 sm:text-base">
          {hasSearchContext
            ? "Try adjusting your pickup location, dates, times, or driver age."
            : "Enter your pickup location, rental dates, times, and driver age to search for cars."}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            type="button"
            className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-700 to-violet-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-700/20 sm:w-auto"
            onClick={onEditSearch}
          >
            <PencilLine className="h-4 w-4" aria-hidden="true" />
            Edit search
          </Button>
        </div>
      </div>
    </div>
  );
}
