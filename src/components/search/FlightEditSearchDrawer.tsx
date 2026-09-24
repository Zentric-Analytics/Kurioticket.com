"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRightLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  MapPin,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";

import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { MobileAirportPicker } from "@/components/search/MobileAirportPicker";
import { openMobilePickerWithKeyboard } from "@/components/search/mobilePickerKeyboardFocus";
import { MobileDatePickerDialog } from "@/components/search/MobileDateRangePicker";
import { MobileTravelerCabinPicker } from "@/components/search/MobileTravelerCabinPicker";
import { MultiCityFlightEditor } from "@/components/search/MultiCityFlightEditor";
import { Button } from "@/components/ui/Button";
import {
  formatTravelDateDisplay,
  formatTravelDateRangeDisplay,
} from "@/lib/dateFormatting/travelDateDisplay";
import {
  MULTI_CITY_MAX_LEGS,
  MULTI_CITY_MIN_LEGS,
} from "@/lib/flights/flightSearchJourney";
import type { CabinClass, FlightSearchLeg, TripType } from "@/lib/types";
import {
  acquireMobileResultsScrollLock,
  type MobileResultsScrollLockRelease,
} from "@/lib/search/mobileResultsScrollLock";
import {
  acquireMobileResultsOverlayCanvas,
  type MobileResultsOverlayCanvasRelease,
} from "@/lib/search/mobileResultsOverlayCanvas";
import { getLocationFieldDisplay } from "@/lib/search/locationFieldDisplay";

export type FlightEditSearchInitialValue = {
  tripType: TripType;
  legs: FlightSearchLeg[];
  departureDate: string;
  returnDate?: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: CabinClass;
};

export type FlightEditSearchValue = FlightEditSearchInitialValue;

type Props = {
  open: boolean;
  initialValue: FlightEditSearchInitialValue;
  onClose: () => void;
  onSearch: (value: FlightEditSearchValue) => void;
  presentation?: "fullscreen" | "bottom-sheet";
  resultsMode?: boolean;
};

const today = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
const validDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  value >= today().toISOString().slice(0, 10);

export function FlightEditSearchDrawer({
  open,
  initialValue,
  onClose,
  onSearch,
  presentation = "fullscreen",
  resultsMode = false,
}: Props) {
  const { locale, t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const [draft, setDraft] = useState(initialValue);
  const [airportPicker, setAirportPicker] = useState<
    "origin" | "destination" | null
  >(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [travelerPickerOpen, setTravelerPickerOpen] = useState(false);
  const [multiCityAirportsValid, setMultiCityAirportsValid] = useState(true);
  const originRef = useRef<HTMLButtonElement>(null);
  const destinationRef = useRef<HTMLButtonElement>(null);
  const datesRef = useRef<HTMLButtonElement>(null);
  const travelersRef = useRef<HTMLButtonElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const closePreparationFrameRef = useRef<number | null>(null);
  const isPreparingCloseRef = useRef(false);
  const scrollLockReleaseRef = useRef<MobileResultsScrollLockRelease | null>(
    null,
  );
  const overlayCanvasReleaseRef =
    useRef<MobileResultsOverlayCanvasRelease | null>(null);
  const openingScrollPositionRef = useRef<{ x: number; y: number } | null>(
    null,
  );
  const preservedMultiCityLegsRef = useRef<FlightSearchLeg[]>(
    initialValue.tripType === "multi-city" ? initialValue.legs : [],
  );

  const correctUnderlyingResultsScroll = useCallback(() => {
    const openingPosition = openingScrollPositionRef.current;
    if (
      openingPosition &&
      (Math.abs(window.scrollX - openingPosition.x) > 1 ||
        Math.abs(window.scrollY - openingPosition.y) > 1)
    ) {
      window.scrollTo({
        left: openingPosition.x,
        top: openingPosition.y,
        behavior: "auto",
      });
    }
  }, []);

  const finishClose = useCallback(() => {
    setDraft(initialValue);
    preservedMultiCityLegsRef.current =
      initialValue.tripType === "multi-city" ? initialValue.legs : [];
    // Reset before the parent unmounts the portal so the next open owns its
    // final geometry on the first committed frame.
    setIsClosing(false);
    onClose();
  }, [initialValue, onClose]);

  const closeDrawer = useCallback(() => {
    if (isClosing || isPreparingCloseRef.current) return;
    if (presentation === "bottom-sheet") {
      isPreparingCloseRef.current = true;
      scrollLockReleaseRef.current?.({ restoreScroll: false });
      scrollLockReleaseRef.current = null;

      closePreparationFrameRef.current = window.requestAnimationFrame(() => {
        correctUnderlyingResultsScroll();
        closePreparationFrameRef.current = window.requestAnimationFrame(() => {
          correctUnderlyingResultsScroll();
          closePreparationFrameRef.current = window.requestAnimationFrame(
            () => {
              closePreparationFrameRef.current = null;
              correctUnderlyingResultsScroll();
              setIsClosing(true);
              closeTimerRef.current = window.setTimeout(finishClose, 280);
            },
          );
        });
      });
      return;
    }
    finishClose();
  }, [correctUnderlyingResultsScroll, finishClose, isClosing, presentation]);

  useLayoutEffect(() => {
    if (!open || presentation !== "bottom-sheet") return;
    openingScrollPositionRef.current = { x: window.scrollX, y: window.scrollY };
    isPreparingCloseRef.current = false;
    overlayCanvasReleaseRef.current = acquireMobileResultsOverlayCanvas({
      canvasColor: "#ffffff",
    });
    scrollLockReleaseRef.current = acquireMobileResultsScrollLock();
    return () => {
      scrollLockReleaseRef.current?.({ restoreScroll: true });
      scrollLockReleaseRef.current = null;
      overlayCanvasReleaseRef.current?.();
      overlayCanvasReleaseRef.current = null;
      openingScrollPositionRef.current = null;
      isPreparingCloseRef.current = false;
    };
  }, [open, presentation]);

  useEffect(() => {
    return () => {
      if (closePreparationFrameRef.current !== null) {
        window.cancelAnimationFrame(closePreparationFrameRef.current);
      }
      if (closeTimerRef.current !== null)
        window.clearTimeout(closeTimerRef.current);
    };
  }, [open, presentation]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !airportPicker &&
        !datePickerOpen &&
        !travelerPickerOpen
      )
        closeDrawer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [airportPicker, closeDrawer, datePickerOpen, open, travelerPickerOpen]);

  const firstLeg = draft.legs[0] ?? {
    origin: "",
    destination: "",
    departureDate: draft.departureDate,
  };
  const weekdays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
          new Date(2024, 0, 7 + index),
        ),
      ),
    [locale],
  );
  const travelDatesDisplay =
    draft.tripType === "round-trip"
      ? formatTravelDateRangeDisplay(
          draft.departureDate,
          draft.returnDate,
          locale,
        )
      : formatTravelDateDisplay(draft.departureDate, locale);
  const travelerTotal = draft.adults + draft.children + draft.infants;
  const travelerSummary = `${new Intl.NumberFormat(locale).format(travelerTotal)} ${t(travelerTotal === 1 ? "deals.travelerSingular" : "deals.travelerPlural")}, ${t(draft.cabinClass === "premium-economy" ? "premiumEconomy" : draft.cabinClass)}`;
  const validMultiCity =
    draft.legs.length >= MULTI_CITY_MIN_LEGS &&
    draft.legs.length <= MULTI_CITY_MAX_LEGS &&
    multiCityAirportsValid &&
    draft.legs.every(
      (leg, index) =>
        /^[A-Z0-9]{3}$/.test(leg.origin) &&
        /^[A-Z0-9]{3}$/.test(leg.destination) &&
        leg.origin !== leg.destination &&
        validDate(leg.departureDate) &&
        (index === 0 ||
          leg.departureDate >= draft.legs[index - 1].departureDate),
    );
  const canSearch =
    draft.tripType === "multi-city"
      ? validMultiCity
      : Boolean(
          firstLeg.origin &&
          firstLeg.destination &&
          validDate(draft.departureDate) &&
          (draft.tripType !== "round-trip" ||
            (draft.returnDate && draft.returnDate >= draft.departureDate)),
        );
  const changeTripType = (tripType: TripType) => {
    setDraft((current) => {
      const currentFirst = current.legs[0] ?? {
        origin: "",
        destination: "",
        departureDate: current.departureDate,
      };
      if (tripType === "multi-city") {
        const preservedLegs = preservedMultiCityLegsRef.current;
        const hasPreservedMultiCityJourney =
          preservedLegs.length >= MULTI_CITY_MIN_LEGS;
        const hasCurrentMultiCityJourney =
          current.tripType === "multi-city" &&
          current.legs.length >= MULTI_CITY_MIN_LEGS;
        const legs = hasCurrentMultiCityJourney
          ? current.legs
          : hasPreservedMultiCityJourney
            ? preservedLegs
            : [
                currentFirst,
                {
                  origin: currentFirst.destination,
                  destination:
                    current.tripType === "round-trip"
                      ? currentFirst.origin
                      : "",
                  departureDate:
                    current.tripType === "round-trip"
                      ? current.returnDate ?? current.departureDate
                      : current.departureDate,
                },
              ];
        preservedMultiCityLegsRef.current = legs;
        return {
          ...current,
          tripType,
          legs,
          departureDate: legs[0]?.departureDate ?? current.departureDate,
        };
      }
      if (current.tripType === "multi-city") {
        preservedMultiCityLegsRef.current = current.legs;
        const second = current.legs[1];
        const returnDate =
          tripType === "round-trip" &&
          currentFirst.origin &&
          currentFirst.destination &&
          second?.origin === currentFirst.destination &&
          second.destination === currentFirst.origin &&
          second.departureDate > currentFirst.departureDate
            ? second.departureDate
            : "";
        return {
          ...current,
          tripType,
          legs: [currentFirst],
          departureDate: currentFirst.departureDate,
          returnDate,
        };
      }
      return { ...current, tripType };
    });
  };
  const fieldClass = resultsMode
    ? "min-h-[66px] w-full min-w-0 bg-white px-3 py-[9px] text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064CF7]/25"
    : "min-h-[60px] w-full min-w-0 bg-white px-4 py-2.5 text-start transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25";
  const field = (
    label: string,
    value: string,
    icon: React.ReactNode,
    trailing?: React.ReactNode,
    location = false,
  ) => {
    const display = location ? getLocationFieldDisplay(value) : { primary: value };
    return (
    <span className="block min-w-0">
      <span className={resultsMode ? "mb-1 block text-[10px] font-extrabold uppercase leading-[14px] tracking-[0.5px] text-[#56658E]" : "mb-1.5 block text-[11px] font-semibold uppercase leading-3 tracking-[0.08em] text-slate-500"}>
        {label}
      </span>
      <span
        className={resultsMode ? "grid min-w-0 grid-cols-[18px_minmax(0,1fr)_16px] items-center gap-2.5" : "grid min-w-0 grid-cols-[22px_minmax(0,1fr)_20px] items-center gap-2.5"}
        data-mobile-value-row
      >
        {icon}
        <span className="min-w-0 text-slate-950">
          <span className={resultsMode ? "block truncate text-[15px] font-semibold leading-5" : "block truncate text-[16px] font-semibold leading-5"}>{display.primary}</span>
          {display.secondary ? <span className="block truncate text-xs font-medium leading-4 text-slate-600">{display.secondary}</span> : null}
        </span>
        {trailing ?? <span aria-hidden="true" />}
      </span>
    </span>
    );
  };

  if (!open) return null;
  const bottomSheet = presentation === "bottom-sheet";
  const overlay = (
    <div
      onPointerDown={(event) => {
        if (bottomSheet && event.target === event.currentTarget) closeDrawer();
      }}
      data-mobile-results-overlay-root={bottomSheet ? true : undefined}
      data-flight-edit-presentation={presentation}
      style={bottomSheet ? { backgroundColor: "rgba(8, 18, 35, 0.52)" } : undefined}
      className={`${bottomSheet ? `mobile-results-overlay-root mobile-results-sheet-backdrop fixed inset-0 z-[10000] flex min-h-0 w-screen items-end overflow-visible overscroll-none sm:hidden ${isClosing ? "mobile-results-sheet-backdrop-closing" : ""}` : "fixed inset-0 z-[10000] min-h-[100dvh] overflow-hidden overscroll-contain bg-slate-50 sm:hidden"}`}
    >
      <div
        className={
          bottomSheet
            ? `mobile-results-sheet-surface mobile-results-sheet-surface-smooth relative mb-3 ml-3 mr-3 flex max-h-[88dvh] min-h-0 w-[calc(100%_-_24px)] flex-col overflow-hidden rounded-[24px] ${isClosing ? "mobile-results-sheet-surface-closing" : ""}`
            : "contents"
        }
      >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="flight-mobile-search-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSearch) {
            if (closeTimerRef.current !== null)
              window.clearTimeout(closeTimerRef.current);
            if (bottomSheet) {
              scrollLockReleaseRef.current?.({ restoreScroll: false });
              scrollLockReleaseRef.current = null;
            }
            onSearch(draft);
          }
        }}
        className={`relative z-10 flex min-h-0 w-full min-w-0 flex-col ${bottomSheet ? "max-h-[88dvh] overflow-hidden rounded-[24px] bg-[#F5F7FB]" : "h-full bg-white"}`}
      >
        <div
          className={bottomSheet ? "shrink-0 bg-[#F5F7FB] pl-4 pr-2" : "shrink-0 border-b border-slate-200/80 bg-white px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]"}
        >
          <div className={bottomSheet ? "flex min-h-[52px] items-center justify-between gap-3" : "flex min-h-11 items-center justify-between gap-3"}>
            <h2
              id="flight-mobile-search-title"
              className={bottomSheet ? "text-[19px] font-semibold leading-6 text-slate-950" : "text-xl font-bold leading-6 tracking-[-0.01em] text-slate-950"}
            >
              {resultsMode ? "Change your search" : t("editFlightSearch")}
            </h2>
            <button
              type="button"
              aria-label={t("closeEditSearch")}
              onClick={closeDrawer}
              className="inline-flex h-11 w-11 items-center justify-center text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#064CF7]/35"
            >
              <X className={bottomSheet ? "h-[23px] w-[23px]" : "h-5 w-5"} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className={bottomSheet ? "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#F5F7FB] px-3 pb-[max(20px,calc(env(safe-area-inset-bottom)-12px))] pt-2.5" : "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3"}>
          <div className={bottomSheet && resultsMode ? "mx-auto flex w-full min-w-0 max-w-xl flex-col p-2" : "mx-auto flex w-full min-w-0 max-w-xl flex-col gap-3.5"}>
            <div
              role={resultsMode ? "tablist" : "radiogroup"}
              aria-label={t("tripType")}
              data-mobile-trip-type-grid
              className={resultsMode ? "grid min-h-[51px] w-full min-w-0 grid-cols-3 items-stretch" : "grid min-h-11 w-full min-w-0 grid-cols-3 items-stretch gap-1 rounded-[13px] bg-slate-100/75 p-1"}
            >
              {(
                [
                  ["round-trip", t("roundTrip")],
                  ["one-way", t("oneWay")],
                  ["multi-city", t("multiCity")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role={resultsMode ? "tab" : "radio"}
                  aria-selected={resultsMode ? draft.tripType === value : undefined}
                  aria-checked={!resultsMode ? draft.tripType === value : undefined}
                  onClick={() => changeTripType(value)}
                  className={resultsMode ? `inline-flex min-h-[50px] min-w-0 items-center justify-center whitespace-nowrap border-b-2 px-1 text-[11px] font-semibold ${draft.tripType === value ? "border-[#064CF7] font-extrabold text-[#064CF7]" : "border-transparent text-[#071A48]"}` : `inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-1 text-[13px] font-semibold min-[360px]:text-sm ${draft.tripType === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
                >
                  {!resultsMode ? (
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border ${draft.tripType === value ? "border-[#004BB8]" : "border-slate-300"}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${draft.tripType === value ? "bg-[#004BB8]" : "bg-transparent"}`}
                      />
                    </span>
                  ) : null}
                  {label}
                </button>
              ))}
            </div>
            {draft.tripType === "multi-city" ? (
              <MultiCityFlightEditor
                legs={draft.legs}
                onChange={(legs) =>
                  setDraft((current) => ({ ...current, legs }))
                }
                minimumDate={today().toISOString().slice(0, 10)}
                presentation="homepage"
                onAirportValidityChange={setMultiCityAirportsValid}
              />
            ) : resultsMode ? (
              <div
                data-flight-results-edit-fields
                className="flex min-w-0 flex-col"
              >
                <div
                  data-mobile-route-fields
                  className="relative mt-2.5 grid min-w-0 overflow-hidden rounded-[13px] border border-[#E7ECF5] bg-white divide-y divide-[#E7ECF5]"
                >
                  <button
                    ref={originRef}
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() =>
                      openMobilePickerWithKeyboard(
                        () => setAirportPicker("origin"),
                        "edit-flight-origin",
                      )
                    }
                    className={fieldClass}
                    data-mobile-field="origin"
                  >
                    {field(
                      t("origin"),
                      firstLeg.origin || t("chooseOrigin"),
                      <MapPin className="h-[18px] w-[18px] text-[#071A48]" aria-hidden="true" />,
                      undefined,
                      Boolean(firstLeg.origin),
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={t("swapOriginDestination")}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        legs: [
                          {
                            ...firstLeg,
                            origin: firstLeg.destination,
                            destination: firstLeg.origin,
                          },
                          ...current.legs.slice(1),
                        ],
                      }))
                    }
                    data-mobile-swap-control
                    className="absolute left-1/2 top-1/2 z-10 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E7ECF5] bg-white text-[#064CF7] shadow-[0_2px_4px_rgba(24,48,91,0.12)]">
                      <ArrowRightLeft className="h-[17px] w-[17px]" aria-hidden="true" />
                    </span>
                  </button>
                  <button
                    ref={destinationRef}
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() =>
                      openMobilePickerWithKeyboard(
                        () => setAirportPicker("destination"),
                        "edit-flight-destination",
                      )
                    }
                    className={fieldClass}
                    data-mobile-field="destination"
                  >
                    {field(
                      t("destination"),
                      firstLeg.destination || t("chooseDestination"),
                      <MapPin className="h-[18px] w-[18px] text-[#071A48]" aria-hidden="true" />,
                      undefined,
                      Boolean(firstLeg.destination),
                    )}
                  </button>
                </div>
                <div
                  data-mobile-results-edit-group
                  className="mt-2.5 overflow-hidden rounded-[13px] border border-[#E7ECF5] bg-white"
                >
                  <button
                    ref={datesRef}
                    type="button"
                    onClick={() => setDatePickerOpen(true)}
                    className={fieldClass}
                    data-mobile-field="dates"
                    title={travelDatesDisplay ?? t("travelDates")}
                    aria-label={`${t("travelDates")}: ${travelDatesDisplay ?? t("travelDates")}`}
                  >
                    {field(
                      t("travelDates"),
                      travelDatesDisplay ?? t("travelDates"),
                      <Calendar className="h-[18px] w-[18px] text-[#071A48]" aria-hidden="true" />,
                      <ChevronRight className="h-4 w-4 text-[#071A48]" aria-hidden="true" />,
                    )}
                  </button>
                </div>
                <div
                  data-mobile-results-edit-group
                  className="mt-2.5 overflow-hidden rounded-[13px] border border-[#E7ECF5] bg-white"
                >
                  <button
                    ref={travelersRef}
                    type="button"
                    onClick={() => setTravelerPickerOpen(true)}
                    className={fieldClass}
                    data-mobile-field="travelers"
                  >
                    {field(
                      t("travelersAndCabinClass"),
                      travelerSummary,
                      <UserRound className="h-[18px] w-[18px] text-[#071A48]" aria-hidden="true" />,
                      <ChevronRight className="h-4 w-4 text-[#071A48]" aria-hidden="true" />,
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="relative grid min-w-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white divide-y divide-slate-200"
                  data-mobile-results-edit-group
                  data-mobile-route-fields
                >
                  <button
                    ref={originRef}
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() =>
                      openMobilePickerWithKeyboard(
                        () => setAirportPicker("origin"),
                        "edit-flight-origin",
                      )
                    }
                    className={fieldClass}
                    data-mobile-field="origin"
                  >
                    {field(
                      t("origin"),
                      firstLeg.origin || t("chooseOrigin"),
                      <MapPin
                        className="h-5 w-5 text-slate-700"
                        aria-hidden="true"
                      />,
                      undefined,
                      Boolean(firstLeg.origin),
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={t("swapOriginDestination")}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        legs: [
                          {
                            ...firstLeg,
                            origin: firstLeg.destination,
                            destination: firstLeg.origin,
                          },
                          ...current.legs.slice(1),
                        ],
                      }))
                    }
                    data-mobile-swap-control
                    className="absolute left-1/2 top-1/2 z-10 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#D8E1EC] bg-white text-[#004BB8]"
                  >
                    <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    ref={destinationRef}
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() =>
                      openMobilePickerWithKeyboard(
                        () => setAirportPicker("destination"),
                        "edit-flight-destination",
                      )
                    }
                    className={fieldClass}
                    data-mobile-field="destination"
                  >
                    {field(
                      t("destination"),
                      firstLeg.destination || t("chooseDestination"),
                      <MapPin
                        className="h-5 w-5 text-slate-700"
                        aria-hidden="true"
                      />,
                      undefined,
                      Boolean(firstLeg.destination),
                    )}
                  </button>
                </div>
                <div
                  className="overflow-hidden rounded-[14px] border border-slate-200 bg-white divide-y divide-slate-200"
                  data-mobile-results-edit-group
                >
                  <button
                    ref={datesRef}
                    type="button"
                    onClick={() => setDatePickerOpen(true)}
                    className={fieldClass}
                    data-mobile-field="dates"
                    title={travelDatesDisplay ?? t("travelDates")}
                    aria-label={`${t("travelDates")}: ${travelDatesDisplay ?? t("travelDates")}`}
                  >
                    {field(
                      t("travelDates"),
                      travelDatesDisplay ?? t("travelDates"),
                      <Calendar
                        className="h-5 w-5 text-slate-700"
                        aria-hidden="true"
                      />,
                    )}
                  </button>
                  <button
                    ref={travelersRef}
                    type="button"
                    onClick={() => setTravelerPickerOpen(true)}
                    className={fieldClass}
                    data-mobile-field="travelers"
                  >
                    {field(
                      t("travelersAndCabin"),
                      travelerSummary,
                      <UserRound
                        className="h-5 w-5 text-slate-700"
                        aria-hidden="true"
                      />,
                      <ChevronDown
                        className="h-4 w-4 text-slate-500"
                        aria-hidden="true"
                      />,
                    )}
                  </button>
                </div>
              </>
            )}
            {resultsMode && draft.tripType === "multi-city" ? (
              <div
                data-mobile-results-edit-group
                className="mt-2.5 overflow-hidden rounded-[13px] border border-[#E7ECF5] bg-white"
              >
                <button
                  ref={travelersRef}
                  type="button"
                  onClick={() => setTravelerPickerOpen(true)}
                  className={fieldClass}
                  data-mobile-field="travelers"
                >
                  {field(
                    t("travelersAndCabinClass"),
                    travelerSummary,
                    <UserRound className="h-[18px] w-[18px] text-[#071A48]" aria-hidden="true" />,
                    <ChevronRight className="h-4 w-4 text-[#071A48]" aria-hidden="true" />,
                  )}
                </button>
              </div>
            ) : null}
            <div className={resultsMode ? "p-2 pt-4" : undefined}>
              <Button
                type="submit"
                disabled={!canSearch}
                className={resultsMode ? "min-h-[54px] w-full rounded-[9px] bg-[#064CF7] text-[15px] font-extrabold text-white" : "mt-1 h-12 w-full rounded-[11px] bg-[#004BB8] text-[15px] font-semibold text-white shadow-sm"}
              >
                {resultsMode ? t("searchFlights") : t("search")}
              </Button>
            </div>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
  return (
    <>
      {bottomSheet && typeof document !== "undefined"
        ? createPortal(overlay, document.body)
        : overlay}
      <MobileAirportPicker
        commitOnSelect={resultsMode}
        open={airportPicker === "origin"}
        field="origin"
        title={t("chooseOrigin")}
        inputId="edit-flight-origin"
        value={firstLeg.origin}
        selectedCode={firstLeg.origin}
        launcherRef={originRef}
        locale={locale}
        onCommit={(option) => {
          if (option)
            setDraft((current) => ({
              ...current,
              legs: [
                { ...firstLeg, origin: option.code },
                ...current.legs.slice(1),
              ],
            }));
        }}
        onClose={() => setAirportPicker(null)}
      />
      <MobileAirportPicker
        commitOnSelect={resultsMode}
        open={airportPicker === "destination"}
        field="destination"
        title={t("chooseDestination")}
        inputId="edit-flight-destination"
        value={firstLeg.destination}
        selectedCode={firstLeg.destination}
        launcherRef={destinationRef}
        locale={locale}
        onCommit={(option) => {
          if (option)
            setDraft((current) => ({
              ...current,
              legs: [
                { ...firstLeg, destination: option.code },
                ...current.legs.slice(1),
              ],
            }));
        }}
        onClose={() => setAirportPicker(null)}
      />
      <MobileDatePickerDialog
        open={datePickerOpen}
        title={t("travelDates")}
        titleId="edit-flight-dates-title"
        dialogId="edit-flight-dates"
        launcherRef={datesRef}
        startDate={draft.departureDate}
        endDate={draft.returnDate ?? ""}
        rangeRequired={draft.tripType === "round-trip"}
        locale={locale}
        weekdays={weekdays}
        labels={{
          selectDates: t("travelDates"),
          start: t("departure"),
          end: t("return"),
          done: t("done"),
          selectDatePrefix: t("selectDateAriaPrefix"),
        }}
        isDateDisabled={(date) => date < today()}
        onCommit={(departureDate, returnDate) =>
          setDraft((current) => ({
            ...current,
            departureDate,
            returnDate:
              current.tripType === "round-trip" ? returnDate : undefined,
            legs: [{ ...firstLeg, departureDate }, ...current.legs.slice(1)],
          }))
        }
        onClose={() => setDatePickerOpen(false)}
      />
      <FlightMobilePickerShell
        open={travelerPickerOpen}
        title={t("travelersAndCabin")}
        titleId="edit-flight-travelers-title"
        dialogId="edit-flight-travelers"
        launcherRef={travelersRef}
        pickerMarker="traveler-cabin"
        contentClassName="px-4 py-4"
        onClose={() => setTravelerPickerOpen(false)}
        footer={
          <Button
            type="button"
            className="h-12 w-full rounded-[11px] bg-[#004BB8] text-[15px] font-semibold text-white hover:bg-[#003F9E] active:bg-[#003786]"
            onClick={() => setTravelerPickerOpen(false)}
          >
            {t("done")}
          </Button>
        }
      >
        <MobileTravelerCabinPicker
          adults={draft.adults}
          childCount={draft.children}
          infants={draft.infants}
          cabinClass={
            draft.cabinClass === "premium-economy"
              ? "economy"
              : draft.cabinClass
          }
          strings={{
            travelers: t("travelers"),
            adults: t("adults"),
            adultDescription: t("mobileTravelerCabin.adultDescription"),
            children: t("children"),
            childDescription: t("mobileTravelerCabin.childDescription"),
            infants: t("infantsOnLap"),
            infantDescription: t("mobileTravelerCabin.infantDescription"),
            cabinClass: t("cabinClass"),
            economy: t("economy"),
            business: t("business"),
            first: t("first"),
            tip: t("mobileTravelerCabin.tip"),
            baggageTip: t("mobileTravelerCabin.baggageTip"),
            decrease: (label) => t("deals.decreaseCountAria").replace("{{label}}", label),
            increase: (label) => t("deals.increaseCountAria").replace("{{label}}", label),
          }}
          onAdultsChange={(adults) =>
            setDraft((current) => ({ ...current, adults }))
          }
          onChildrenChange={(children) =>
            setDraft((current) => ({ ...current, children }))
          }
          onInfantsChange={(infants) =>
            setDraft((current) => ({ ...current, infants }))
          }
          onCabinClassChange={(cabinClass) =>
            setDraft((current) => ({ ...current, cabinClass }))
          }
        />
      </FlightMobilePickerShell>
    </>
  );
}
