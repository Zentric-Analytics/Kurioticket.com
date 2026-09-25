"use client";

import { ArrowRightLeft, Calendar, Plane, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import {
  DesktopFlightPopover,
  FlightAirportFieldControl,
  flightDesktopPopoverSelector,
  flightSearchFieldLabelClassName,
  flightSearchFieldShellClassName,
  flightSearchFieldValueButtonClassName,
} from "@/components/search/FlightSearchFieldPrimitives";
import {
  FlightSingleDateCalendar,
  parseFlightIsoDate,
} from "@/components/search/FlightSingleDateCalendar";
import { MobileAirportPicker } from "@/components/search/MobileAirportPicker";
import { openMobilePickerWithKeyboard } from "@/components/search/mobilePickerKeyboardFocus";
import { MobileDatePickerDialog } from "@/components/search/MobileDateRangePicker";
import {
  formatAirportLabel,
  getAirportByCode,
  getLocalizedAirportCountryName,
  getLocalizedCityName,
  type AirportOption,
} from "@/data/airports";
import {
  MULTI_CITY_MAX_LEGS,
  MULTI_CITY_MIN_LEGS,
} from "@/lib/flights/flightSearchJourney";
import { formatTravelDateDisplay } from "@/lib/dateFormatting/travelDateDisplay";
import { swapMultiCityLegState } from "@/lib/flights/multiCitySwap";
import {
  formatFlightsWeekdays,
  normalizeFlightsCalendarLocale,
} from "@/lib/flights/dateFormatting";
import { translations as enTranslations } from "@/lib/i18n/en";
import type { FlightSearchLeg } from "@/lib/types";
import { cn } from "@/lib/utils";

type AirportField = "origin" | "destination";
type PickerField = AirportField | "date";
type ActivePicker = { legIndex: number; field: PickerField; mode: "desktop" | "mobile" } | null;

type MultiCityFlightEditorProps = {
  legs: FlightSearchLeg[];
  onChange: (legs: FlightSearchLeg[]) => void;
  minimumDate: string;
  presentation?: "standalone" | "homepage" | "results";
  onAirportValidityChange?: (valid: boolean) => void;
};

export function MultiCityFlightEditor({
  legs,
  onChange,
  minimumDate,
  presentation = "standalone",
  onAirportValidityChange,
}: MultiCityFlightEditorProps) {
  const { t: dictionary, locale } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? enTranslations[key] ?? key, [dictionary]);
  const calendarLocale = useMemo(() => normalizeFlightsCalendarLocale(locale), [locale]);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const resultsPresentation = presentation === "results";
  const [verifiedAirports, setVerifiedAirports] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    legs.forEach((leg, index) => {
      if (getAirportByCode(leg.origin)) initial[`${index}:origin`] = leg.origin;
      if (getAirportByCode(leg.destination)) initial[`${index}:destination`] = leg.destination;
    });
    return initial;
  });

  const flightLabel = (index: number) =>
    t("flightMultiCity.flight").replace("{{number}}", String(index + 1));
  const airportsValid = useMemo(
    () => legs.every((leg, index) =>
      verifiedAirports[`${index}:origin`] === leg.origin &&
      verifiedAirports[`${index}:destination`] === leg.destination,
    ),
    [legs, verifiedAirports],
  );

  useEffect(() => onAirportValidityChange?.(airportsValid), [airportsValid, onAirportValidityChange]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest("[data-multi-city-picker-anchor]") || target.closest(flightDesktopPopoverSelector) || target.closest("[data-flight-mobile-picker-shell]")) return;
      setActivePicker(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActivePicker(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const update = (index: number, patch: Partial<FlightSearchLeg>) => {
    const next = legs.map((leg, legIndex) => legIndex === index ? { ...leg, ...patch } : leg);
    if (patch.departureDate) {
      for (let cursor = index + 1; cursor < next.length; cursor += 1) {
        if (next[cursor].departureDate && next[cursor].departureDate < patch.departureDate) {
          next[cursor] = { ...next[cursor], departureDate: "" };
        }
      }
    }
    onChange(next);
  };

  const markVerified = (index: number, field: AirportField, code: string | null) => {
    setVerifiedAirports((current) => ({ ...current, [`${index}:${field}`]: code ?? "" }));
  };

  const swap = (index: number) => {
    setActivePicker(null);
    setVerifiedAirports((current) => {
      const swapped = swapMultiCityLegState(legs, current, index);
      onChange(swapped.legs);
      return swapped.verifiedAirports;
    });
  };

  const add = () => {
    if (legs.length >= MULTI_CITY_MAX_LEGS) return;
    const previous = legs.at(-1);
    onChange([
      ...legs,
      {
        origin: previous?.destination ?? "",
        destination: "",
        departureDate: previous?.departureDate ?? "",
      },
    ]);
    if (previous?.destination) {
      setVerifiedAirports((current) => ({
        ...current,
        [`${legs.length}:origin`]: previous.destination,
      }));
    }
  };

  const remove = (index: number) => {
    if (legs.length <= MULTI_CITY_MIN_LEGS) return;
    setActivePicker(null);
    onChange(legs.filter((_, legIndex) => legIndex !== index));
    setVerifiedAirports((current) => {
      const next: Record<string, string> = {};
      legs.forEach((_, oldIndex) => {
        if (oldIndex === index) return;
        const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
        for (const field of ["origin", "destination"] as const) {
          const value = current[`${oldIndex}:${field}`];
          if (value) next[`${newIndex}:${field}`] = value;
        }
      });
      return next;
    });
  };

  return (
    <section
      aria-label={resultsPresentation ? t("multiCity") : undefined}
      aria-labelledby={resultsPresentation ? undefined : "multi-city-flights-heading"}
      data-multi-city-presentation={presentation}
      className={cn("mt-1", resultsPresentation && "min-w-0")}
    >
      <div className={cn("flex items-center justify-between gap-3", resultsPresentation && "justify-end")}>
        {!resultsPresentation ? (
          <h3 id="multi-city-flights-heading" className="text-sm font-bold text-slate-950">
            {t("flightMultiCity.title")}
          </h3>
        ) : null}
        <span className="text-xs font-medium text-slate-500">
          {legs.length} of {MULTI_CITY_MAX_LEGS}
        </span>
      </div>

      <div className={cn("mt-3 space-y-3", resultsPresentation && "space-y-4")}>
        {legs.map((leg, index) => {
          const legMinimumDate = index > 0 ? legs[index - 1].departureDate || minimumDate : minimumDate;
          return (
            <div key={index} className={cn("space-y-1.5", resultsPresentation && "min-w-0 space-y-2")}>
              <p className="text-xs font-semibold text-slate-700">{flightLabel(index)}</p>
              <div className={cn(
                "grid grid-cols-1 gap-2 sm:overflow-hidden sm:rounded-2xl sm:ring-1 sm:ring-slate-200 md:grid-cols-[minmax(0,2fr)_minmax(170px,.72fr)] md:gap-0 lg:grid-cols-[minmax(0,2fr)_minmax(170px,.72fr)_48px]",
                resultsPresentation && "flex min-w-0 flex-col gap-2.5 sm:ring-0",
              )}>
                <div
                  className={cn(
                    "relative grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-0",
                    resultsPresentation && "overflow-hidden rounded-[13px] border border-[#E7ECF5] bg-white divide-y divide-[#E7ECF5]",
                  )}
                  data-multi-city-route-pair
                  data-multi-city-results-route-card={resultsPresentation ? true : undefined}
                >
                <MultiCityAirportField
                  legIndex={index}
                  field="origin"
                  code={leg.origin}
                  label={t("origin")}
                  inputLabel={`${flightLabel(index)} ${t("origin")}`}
                  locale={locale}
                  activePicker={activePicker}
                  onOpen={setActivePicker}
                  onSelect={(option) => {
                    update(index, { origin: option.code });
                    markVerified(index, "origin", option.code);
                    setActivePicker(null);
                  }}
                  onInvalidate={() => {
                    update(index, { origin: "" });
                    markVerified(index, "origin", null);
                  }}
                  t={t}
                  resultsPresentation={resultsPresentation}
                />
                <MultiCityAirportField
                  legIndex={index}
                  field="destination"
                  code={leg.destination}
                  label={t("destination")}
                  inputLabel={`${flightLabel(index)} ${t("destination")}`}
                  locale={locale}
                  activePicker={activePicker}
                  onOpen={setActivePicker}
                  onSelect={(option) => {
                    update(index, { destination: option.code });
                    markVerified(index, "destination", option.code);
                    setActivePicker(null);
                  }}
                  onInvalidate={() => {
                    update(index, { destination: "" });
                    markVerified(index, "destination", null);
                  }}
                  t={t}
                  resultsPresentation={resultsPresentation}
                />
                <button
                  type="button"
                  onClick={() => swap(index)}
                  aria-label={`Swap origin and destination for ${flightLabel(index)}`}
                  data-multi-city-swap-control
                  className={cn(
                    "focus-ring absolute left-1/2 top-1/2 z-10 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#D8E1EC] bg-white text-[#004BB8]",
                    resultsPresentation && "border-0 bg-transparent text-[#064CF7]",
                  )}
                >
                  {resultsPresentation ? (
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E7ECF5] bg-white shadow-[0_2px_4px_rgba(24,48,91,0.12)]">
                      <ArrowRightLeft className="h-[17px] w-[17px]" aria-hidden="true" />
                    </span>
                  ) : (
                    <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
                </div>
                <MultiCityDateField
                  legIndex={index}
                  value={leg.departureDate}
                  minimumDate={legMinimumDate}
                  locale={calendarLocale}
                  activePicker={activePicker}
                  onOpen={setActivePicker}
                  onChange={(departureDate) => update(index, { departureDate })}
                  t={t}
                  resultsPresentation={resultsPresentation}
                />
                <div className={cn(
                  "flex min-h-11 items-center justify-end border-slate-200 bg-white px-1.5 sm:border-t md:border-s lg:border-t-0",
                  resultsPresentation && "min-h-0 justify-start border-0 bg-transparent px-0",
                )}>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={legs.length <= MULTI_CITY_MIN_LEGS}
                    aria-label={t("flightMultiCity.removeFlight").replace("{{number}}", String(index + 1))}
                    className={cn(
                      "focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-35 lg:w-11",
                      resultsPresentation && "w-auto justify-start px-2 text-[13px] text-[#56658E] lg:w-auto",
                    )}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <span className="lg:sr-only">{t("flightMultiCity.removeFlight").replace("{{number}}", "")}</span>
                  </button>
                </div>
              </div>
              {leg.origin && leg.destination && leg.origin === leg.destination ? (
                <p role="alert" className="text-xs font-medium text-rose-700">{t("flightMultiCity.sameAirport")}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={legs.length >= MULTI_CITY_MAX_LEGS}
        title={legs.length >= MULTI_CITY_MAX_LEGS ? t("flightMultiCity.maximum") : undefined}
        className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-[#004BB8] transition-colors hover:border-[#004BB8]/40 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {t("flightMultiCity.addFlight")}
      </button>
    </section>
  );
}

function MultiCityAirportField({
  legIndex,
  field,
  code,
  label,
  inputLabel,
  locale,
  activePicker,
  onOpen,
  onSelect,
  onInvalidate,
  t,
  resultsPresentation,
}: {
  legIndex: number;
  field: AirportField;
  code: string;
  label: string;
  inputLabel: string;
  locale: string;
  activePicker: ActivePicker;
  onOpen: (picker: ActivePicker) => void;
  onSelect: (option: AirportOption) => void;
  onInvalidate: () => void;
  t: (key: string) => string;
  resultsPresentation: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileLauncherRef = useRef<HTMLButtonElement>(null);
  const selectedAirport = getAirportByCode(code);
  const [draftQuery, setDraftQuery] = useState<string | null>(null);
  const query = draftQuery ?? (selectedAirport ? formatAirportLabel(selectedAirport, locale) : code);
  const [suggestions, setSuggestions] = useState<AirportOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const open = activePicker?.legIndex === legIndex && activePicker.field === field;
  const desktopOpen = open && activePicker.mode === "desktop";
  const mobileOpen = open && activePicker.mode === "mobile";

  useEffect(() => {
    const trimmed = query.trim();
    if (!desktopOpen || trimmed.length < 2) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed, context: field });
        const response = await fetch(`/api/flights/places?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Airport lookup failed");
        const payload = (await response.json()) as { suggestions?: AirportOption[] };
        setSuggestions((payload.suggestions ?? []).filter((option) => option.code && option.city && option.airport).slice(0, 7));
        setHighlight(0);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [desktopOpen, field, query]);

  const openPicker = () => {
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    if (mobile) {
      openMobilePickerWithKeyboard(
        () => onOpen({ legIndex, field, mode: "mobile" }),
        `multi-city-${legIndex}-${field}-mobile-search`,
      );
      return;
    }
    onOpen({ legIndex, field, mode: "desktop" });
  };

  const commitOption = (option: AirportOption) => {
    setDraftQuery(null);
    onSelect(option);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") return onOpen(null);
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && desktopOpen) {
      event.preventDefault();
      commitOption(suggestions[highlight]);
    }
  };

  const desktopSuggestions = desktopOpen && query.trim().length >= 2 ? (
    <DesktopFlightPopover
      open
      anchorRef={wrapRef}
      desiredWidth={390}
      placement="auto"
      maxHeight={300}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.14)] ring-1 ring-slate-950/[0.02]"
    >
      {loading ? (
        <p className="px-4 py-5 text-center text-sm font-medium text-slate-500">{t("searchingAirportsAndCities")}</p>
      ) : suggestions.length ? (
        <div className="py-1" role="listbox" aria-label={inputLabel}>
          {suggestions.map((option, index) => (
            <button
              key={`${option.code}-${option.airport}`}
              type="button"
              role="option"
              aria-selected={highlight === index}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => commitOption(option)}
              className={cn(
                "focus-ring flex w-full items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-start transition-colors last:border-b-0 hover:bg-[#004BB8]/8",
                highlight === index && "bg-[#004BB8]/8 text-[#021C2B]",
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200/70" aria-hidden="true">
                <Plane className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{getLocalizedCityName(option.city, locale)}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {option.airport}{option.country ? ` · ${getLocalizedAirportCountryName(option, locale)}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium tracking-[0.08em] text-slate-600">{option.code}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="px-4 py-5 text-center text-sm font-medium text-slate-500">{t("noMatchingAirportsOrCities")}</p>
      )}
    </DesktopFlightPopover>
  ) : null;

  return (
    <>
      <FlightAirportFieldControl
        ref={wrapRef}
        inputRef={inputRef}
        mobileLauncherRef={mobileLauncherRef}
        label={label}
        inputLabel={inputLabel}
        value={resultsPresentation && draftQuery === null ? code : query}
        placeholder={t("cityOrAirport")}
        mobilePlaceholder={t("cityOrAirport")}
        useMainFlightLandingMobilePresentation
        mobileLeadingIconClassName={resultsPresentation ? "h-[18px] w-[18px] shrink-0 text-[#071A48] sm:hidden" : "h-5 w-5 shrink-0 text-slate-500 sm:hidden"}
        mobileValueRowClassName={resultsPresentation ? "grid grid-cols-[18px_minmax(0,1fr)] items-center gap-2.5 sm:contents" : "grid grid-cols-[22px_minmax(0,1fr)] items-center gap-2.5 sm:contents"}
        open={open}
        onMobileOpen={openPicker}
        onDesktopFocus={() => onOpen({ legIndex, field, mode: "desktop" })}
        onChange={(value) => {
          setDraftQuery(value);
          onInvalidate();
          onOpen({ legIndex, field, mode: "desktop" });
        }}
        onKeyDown={onKeyDown}
        desktopSuggestions={desktopSuggestions}
        className={cn(
          "sm:min-h-[58px] sm:rounded-none sm:border-0 sm:bg-white sm:shadow-none sm:focus-within:ring-0",
          resultsPresentation && "min-h-[66px] rounded-none border-0 bg-white px-3 py-[9px] shadow-none hover:border-0 [&_label]:mb-1 [&_label]:text-[10px] [&_label]:font-extrabold [&_label]:leading-[14px] [&_label]:tracking-[0.5px] [&_label]:text-[#56658E] [&_button]:text-[15px] [&_button]:font-semibold [&_button]:leading-5",
        )}
      />
      <MobileAirportPicker
        open={mobileOpen}
        field={field}
        title={field === "origin" ? t("chooseOrigin") : t("chooseDestination")}
        inputId={`multi-city-${legIndex}-${field}-mobile-search`}
        value={query}
        selectedCode={code}
        selectedAirport={selectedAirport}
        launcherRef={mobileLauncherRef}
        locale={locale}
        onCommit={(option) => {
          if (option) commitOption(option);
          else onInvalidate();
        }}
        onClose={() => onOpen(null)}
      />
    </>
  );
}

function MultiCityDateField({
  legIndex,
  value,
  minimumDate,
  locale,
  activePicker,
  onOpen,
  onChange,
  t,
  resultsPresentation,
}: {
  legIndex: number;
  value: string;
  minimumDate: string;
  locale: string;
  activePicker: ActivePicker;
  onOpen: (picker: ActivePicker) => void;
  onChange: (value: string) => void;
  t: (key: string) => string;
  resultsPresentation: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const open = activePicker?.legIndex === legIndex && activePicker.field === "date";
  const desktopOpen = open && activePicker.mode === "desktop";
  const mobileOpen = open && activePicker.mode === "mobile";
  const fieldLabel = t(resultsPresentation ? "travelDates" : "flightMultiCity.departureDate");
  const summary = formatTravelDateDisplay(value, locale) ?? fieldLabel;
  const openPicker = () => {
    const mode = window.matchMedia("(max-width: 639px)").matches ? "mobile" : "desktop";
    onOpen(open ? null : { legIndex, field: "date", mode });
  };
  const isDisabled = (date: Date) => {
    const minimum = parseFlightIsoDate(minimumDate);
    return Boolean(minimum && new Date(date.getFullYear(), date.getMonth(), date.getDate()) < minimum);
  };

  return (
    <>
      <div
        ref={wrapRef}
        data-multi-city-picker-anchor
        data-multi-city-results-date-card={resultsPresentation ? true : undefined}
        className={cn(
          flightSearchFieldShellClassName,
          "sm:min-h-[58px] sm:rounded-none sm:border-0 sm:bg-white sm:shadow-none sm:focus-within:ring-0",
          resultsPresentation && "min-h-[66px] rounded-[13px] border border-[#E7ECF5] bg-white px-3 py-[9px] shadow-none hover:border-[#E7ECF5]",
        )}
      >
        <label className={cn(flightSearchFieldLabelClassName, resultsPresentation && "mb-1 text-[10px] font-extrabold leading-[14px] tracking-[0.5px] text-[#56658E]")}>{fieldLabel}</label>
        <button
          ref={launcherRef}
          type="button"
          aria-label={`${fieldLabel} ${legIndex + 1}: ${summary}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={openPicker}
          className={cn(flightSearchFieldValueButtonClassName, resultsPresentation && "text-[15px] font-semibold leading-5")}
        >
          <span className={cn("grid min-w-0 flex-1 grid-cols-[22px_minmax(0,1fr)] items-center gap-2.5 sm:flex sm:gap-2", resultsPresentation && "grid-cols-[18px_minmax(0,1fr)]")}>
            <Calendar className={cn("h-5 w-5 shrink-0 text-slate-500 sm:h-4 sm:w-4", resultsPresentation && "h-[18px] w-[18px] text-[#071A48]")} aria-hidden="true" />
            <span className={cn("truncate", !value && "text-slate-500")}>{summary}</span>
          </span>
        </button>
        <DesktopFlightPopover
          open={desktopOpen}
          anchorRef={launcherRef}
          desiredWidth={690}
          align="end"
          className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-[0_22px_54px_rgba(15,23,42,0.16)] ring-1 ring-slate-950/[0.03]"
        >
          <FlightSingleDateCalendar
            value={value}
            minimumDate={minimumDate}
            locale={locale}
            selectDateLabel={t("selectDateAriaPrefix") || "Select"}
            previousMonthLabel={t("previousMonth") || "Previous month"}
            nextMonthLabel={t("nextMonth") || "Next month"}
            onSelect={(date) => {
              onChange(date);
              onOpen(null);
              window.requestAnimationFrame(() => launcherRef.current?.focus({ preventScroll: true }));
            }}
          />
        </DesktopFlightPopover>
      </div>
      <MobileDatePickerDialog
        open={mobileOpen}
        title={fieldLabel}
        titleId={`multi-city-${legIndex}-date-title`}
        dialogId={`multi-city-${legIndex}-date-dialog`}
        launcherRef={launcherRef}
        startDate={value}
        endDate=""
        rangeRequired={false}
        locale={locale}
        weekdays={formatFlightsWeekdays(locale)}
        labels={{
          selectDates: fieldLabel,
          start: t("mobileDatePicker.start") || "Start",
          end: t("mobileDatePicker.end") || "End",
          done: t("done") || "Done",
          selectDatePrefix: t("selectDateAriaPrefix") || "Select",
        }}
        isDateDisabled={isDisabled}
        onCommit={(date) => onChange(date)}
        onClose={() => onOpen(null)}
      />
    </>
  );
}
