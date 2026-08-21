"use client";

import { Calendar, Plane, Plus, Trash2 } from "lucide-react";
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
  presentation?: "standalone" | "homepage";
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
      aria-labelledby="multi-city-flights-heading"
      data-multi-city-presentation={presentation}
      className="mt-1"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id="multi-city-flights-heading" className="text-sm font-bold text-slate-950">
          {t("flightMultiCity.title")}
        </h3>
        <span className="text-xs font-medium text-slate-500">
          {legs.length} of {MULTI_CITY_MAX_LEGS}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {legs.map((leg, index) => {
          const legMinimumDate = index > 0 ? legs[index - 1].departureDate || minimumDate : minimumDate;
          return (
            <div key={index} className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-700">{flightLabel(index)}</p>
              <div className="grid grid-cols-1 gap-2 sm:overflow-hidden sm:rounded-2xl sm:ring-1 sm:ring-slate-200 md:grid-cols-2 md:gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(170px,.72fr)_48px]">
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
                />
                <MultiCityDateField
                  legIndex={index}
                  value={leg.departureDate}
                  minimumDate={legMinimumDate}
                  locale={calendarLocale}
                  activePicker={activePicker}
                  onOpen={setActivePicker}
                  onChange={(departureDate) => update(index, { departureDate })}
                  t={t}
                />
                <div className="flex min-h-11 items-center justify-end border-slate-200 bg-white px-1.5 sm:border-t md:border-s lg:border-t-0">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={legs.length <= MULTI_CITY_MIN_LEGS}
                    aria-label={t("flightMultiCity.removeFlight").replace("{{number}}", String(index + 1))}
                    className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-35 lg:w-11"
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
    onOpen({ legIndex, field, mode: mobile ? "mobile" : "desktop" });
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
        value={query}
        placeholder={t("cityOrAirport")}
        mobilePlaceholder={t("cityOrAirport")}
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
        className="sm:min-h-[58px] sm:rounded-none sm:border-0 sm:bg-white sm:shadow-none sm:focus-within:ring-0"
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
}: {
  legIndex: number;
  value: string;
  minimumDate: string;
  locale: string;
  activePicker: ActivePicker;
  onOpen: (picker: ActivePicker) => void;
  onChange: (value: string) => void;
  t: (key: string) => string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const open = activePicker?.legIndex === legIndex && activePicker.field === "date";
  const desktopOpen = open && activePicker.mode === "desktop";
  const mobileOpen = open && activePicker.mode === "mobile";
  const parsed = parseFlightIsoDate(value);
  const summary = parsed ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(parsed) : t("flightMultiCity.departureDate");
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
      <div ref={wrapRef} data-multi-city-picker-anchor className={cn(flightSearchFieldShellClassName, "sm:min-h-[58px] sm:rounded-none sm:border-0 sm:bg-white sm:shadow-none sm:focus-within:ring-0")}>
        <label className={flightSearchFieldLabelClassName}>{t("flightMultiCity.departureDate")}</label>
        <button
          ref={launcherRef}
          type="button"
          aria-label={`${t("flightMultiCity.departureDate")} ${legIndex + 1}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={openPicker}
          className={flightSearchFieldValueButtonClassName}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
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
        title={t("flightMultiCity.departureDate")}
        titleId={`multi-city-${legIndex}-date-title`}
        dialogId={`multi-city-${legIndex}-date-dialog`}
        launcherRef={launcherRef}
        startDate={value}
        endDate=""
        rangeRequired={false}
        locale={locale}
        weekdays={formatFlightsWeekdays(locale)}
        labels={{
          selectDates: t("flightMultiCity.departureDate"),
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
