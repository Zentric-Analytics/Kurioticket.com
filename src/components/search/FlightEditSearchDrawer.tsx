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
  MapPin,
  UserRound,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";

import { useLocale } from "@/components/layout/LocaleProvider";
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
  const { locale } = useLocale();
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
  const fieldClass =
    "min-h-[60px] w-full min-w-0 bg-white px-4 py-2.5 text-start transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25";
  const field = (
    label: string,
    value: string,
    icon: React.ReactNode,
    trailing?: React.ReactNode,
  ) => (
    <span className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase leading-3 tracking-[0.08em] text-slate-500">
        {label}
      </span>
      <span
        className="grid min-w-0 grid-cols-[22px_minmax(0,1fr)_20px] items-center gap-2.5"
        data-mobile-value-row
      >
        {icon}
        <span className="min-w-0 truncate text-[16px] font-semibold leading-5 text-slate-950">
          {value}
        </span>
        {trailing ?? <span aria-hidden="true" />}
      </span>
    </span>
  );

  if (!open) return null;
  const bottomSheet = presentation === "bottom-sheet";
  const overlay = (
    <div
      onPointerDown={(event) => {
        if (bottomSheet && event.target === event.currentTarget) closeDrawer();
      }}
      data-mobile-results-overlay-root={bottomSheet ? true : undefined}
      data-flight-edit-presentation={presentation}
      className={`${bottomSheet ? `mobile-results-overlay-root mobile-results-sheet-backdrop mobile-results-sheet-backdrop-clean fixed inset-0 z-[10000] flex min-h-0 w-screen items-end overflow-visible overscroll-none sm:hidden ${isClosing ? "mobile-results-sheet-backdrop-closing" : ""}` : "fixed inset-0 z-[10000] min-h-[100dvh] overflow-hidden overscroll-contain bg-slate-50 sm:hidden"}`}
    >
      <div
        className={
          bottomSheet
            ? `mobile-results-sheet-surface mobile-results-sheet-surface-smooth relative flex max-h-[94dvh] min-h-0 w-full flex-col ${isClosing ? "mobile-results-sheet-surface-closing" : ""}`
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
        className={`relative z-10 flex min-h-0 w-full min-w-0 flex-col bg-white ${bottomSheet ? "overflow-hidden rounded-t-[22px] shadow-[0_-12px_36px_rgba(15,23,42,0.18)]" : "h-full"}`}
      >
        <div
          className={`shrink-0 border-b border-slate-200/80 bg-white px-4 pb-2 ${bottomSheet ? "pt-2" : "pt-[calc(0.5rem+env(safe-area-inset-top))]"}`}
        >
          <div className="flex min-h-11 items-center justify-between gap-3">
            <h2
              id="flight-mobile-search-title"
              className="text-xl font-bold leading-6 tracking-[-0.01em] text-slate-950"
            >
              Edit flight search
            </h2>
            <button
              type="button"
              aria-label="Close edit search"
              onClick={closeDrawer}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/35"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col gap-3.5">
            <div
              role="radiogroup"
              aria-label="Trip type"
              data-mobile-trip-type-grid
              className="grid min-h-11 w-full min-w-0 grid-cols-3 items-stretch gap-1 rounded-[13px] bg-slate-100/75 p-1"
            >
              {(
                [
                  ["round-trip", "Round-trip"],
                  ["one-way", "One-way"],
                  ["multi-city", "Multi-city"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={draft.tripType === value}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      tripType: value,
                      legs:
                        value === "multi-city" && current.legs.length < 2
                          ? [
                              firstLeg,
                              {
                                origin: firstLeg.destination,
                                destination: "",
                                departureDate: firstLeg.departureDate,
                              },
                            ]
                          : current.legs,
                    }))
                  }
                  className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-1 text-[13px] font-semibold min-[360px]:text-sm ${draft.tripType === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border ${draft.tripType === value ? "border-[#004BB8]" : "border-slate-300"}`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${draft.tripType === value ? "bg-[#004BB8]" : "bg-transparent"}`}
                    />
                  </span>
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
                className="min-w-0 overflow-hidden rounded-[14px] border border-slate-200 bg-white"
              >
                <div
                  data-mobile-route-fields
                  className="relative grid divide-y divide-slate-200"
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
                      "Origin",
                      firstLeg.origin || "Choose origin",
                      <MapPin
                        className="h-5 w-5 text-slate-700"
                        aria-hidden="true"
                      />,
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Swap origin and destination"
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
                      "Destination",
                      firstLeg.destination || "Choose destination",
                      <MapPin
                        className="h-5 w-5 text-slate-700"
                        aria-hidden="true"
                      />,
                    )}
                  </button>
                </div>
                <button
                  ref={datesRef}
                  type="button"
                  onClick={() => setDatePickerOpen(true)}
                  className={`${fieldClass} border-t border-slate-200`}
                  data-mobile-field="dates"
                  title={travelDatesDisplay ?? "Travel dates"}
                  aria-label={`Travel dates: ${travelDatesDisplay ?? "Travel dates"}`}
                >
                  {field(
                    "Travel dates",
                    travelDatesDisplay ?? "Travel dates",
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
                  className={`${fieldClass} border-t border-slate-200`}
                  data-mobile-field="travelers"
                >
                  {field(
                    "Travelers and cabin",
                    `${travelerTotal} ${travelerTotal === 1 ? "traveler" : "travelers"}, ${draft.cabinClass.replace("-", " ")}`,
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
                      "Origin",
                      firstLeg.origin || "Choose origin",
                      <MapPin
                        className="h-5 w-5 text-slate-700"
                        aria-hidden="true"
                      />,
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Swap origin and destination"
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
                      "Destination",
                      firstLeg.destination || "Choose destination",
                      <MapPin
                        className="h-5 w-5 text-slate-700"
                        aria-hidden="true"
                      />,
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
                    title={travelDatesDisplay ?? "Travel dates"}
                    aria-label={`Travel dates: ${travelDatesDisplay ?? "Travel dates"}`}
                  >
                    {field(
                      "Travel dates",
                      travelDatesDisplay ?? "Travel dates",
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
                      "Travelers and cabin",
                      `${travelerTotal} ${travelerTotal === 1 ? "traveler" : "travelers"}, ${draft.cabinClass.replace("-", " ")}`,
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
            <Button
              type="submit"
              disabled={!canSearch}
              className="mt-1 h-12 w-full rounded-[11px] bg-[#004BB8] text-[15px] font-semibold text-white shadow-sm"
            >
              Search
            </Button>
          </div>
        </div>
      </form>
      {bottomSheet ? (
        <div
          aria-hidden="true"
          data-flight-edit-bottom-continuation
          data-mobile-results-sheet-bottom-continuation
          className="mobile-results-sheet-bottom-continuation pointer-events-none absolute inset-x-0 top-[calc(100%-1px)] bg-white"
        />
      ) : null}
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
        title="Choose origin"
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
        title="Choose destination"
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
        title="Travel dates"
        titleId="edit-flight-dates-title"
        dialogId="edit-flight-dates"
        launcherRef={datesRef}
        startDate={draft.departureDate}
        endDate={draft.returnDate ?? ""}
        rangeRequired={draft.tripType === "round-trip"}
        locale={locale}
        weekdays={weekdays}
        labels={{
          selectDates: "Select dates",
          start: "Departure",
          end: "Return",
          done: "Done",
          selectDatePrefix: "Select",
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
      {/* eslint-disable react/no-children-prop -- `children` below is a traveler label inside a strings object. */}
      <FlightMobilePickerShell
        open={travelerPickerOpen}
        title="Travelers and cabin"
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
            Done
          </Button>
        }
      >
        <MobileTravelerCabinPicker
          adults={draft.adults}
          children={draft.children}
          infants={draft.infants}
          cabinClass={
            draft.cabinClass === "premium-economy"
              ? "economy"
              : draft.cabinClass
          }
          strings={{
            travelers: "Travelers",
            adults: "Adults",
            adultDescription: "18 years and above",
            children: "Children",
            childDescription: "2 to 17 years",
            infants: "Infants",
            infantDescription: "Under 2 years",
            cabinClass: "Cabin class",
            economy: "Economy",
            business: "Business",
            first: "First",
            tip: "Tip",
            baggageTip: "Baggage allowance may vary by airline.",
            decrease: (label) => `Decrease ${label}`,
            increase: (label) => `Increase ${label}`,
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
      {/* eslint-enable react/no-children-prop */}
    </>
  );
}
