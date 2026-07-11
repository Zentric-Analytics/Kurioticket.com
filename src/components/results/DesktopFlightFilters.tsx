"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

type FilterOption = {
  value: string;
  label: string;
  count: number;
  secondaryLabel?: string;
  rightLabel?: string;
};

type TimeFilterMode = "takeoff" | "landing";

type TimeBounds = {
  takeoff: { min: number; max: number } | null;
  landing: { min: number; max: number } | null;
};

export type DesktopFlightFiltersProps = {
  activeFilterCount: number;
  maxPrice: number;
  setMaxPrice: (value: number) => void;
  priceBounds: { min: number; max: number };
  priceLabelCurrency: string | null;
  selectedCurrency: string;
  originCode: string;
  destinationCode: string;
  timeFilterMode: TimeFilterMode;
  setTimeFilterMode: Dispatch<SetStateAction<TimeFilterMode>>;
  timeBounds: TimeBounds;
  maxTakeoffMinutes: number | null;
  setMaxTakeoffMinutes: (value: number | null) => void;
  maxLandingMinutes: number | null;
  setMaxLandingMinutes: (value: number | null) => void;
  durationBounds: { min: number; max: number } | null;
  maxDurationMinutes: number | null;
  setMaxDurationMinutes: (value: number | null) => void;
  stopOptions: FilterOption[];
  selectedStops: string[];
  setSelectedStops: Dispatch<SetStateAction<string[]>>;
  airlineOptions: FilterOption[];
  selectedAirlines: string[];
  setSelectedAirlines: Dispatch<SetStateAction<string[]>>;
  airportOptions: FilterOption[];
  selectedAirports: string[];
  setSelectedAirports: Dispatch<SetStateAction<string[]>>;
  flightQualityOptions: FilterOption[];
  renderFlightQualityFilter: boolean;
  selectedFlightQuality: string[];
  setSelectedFlightQuality: Dispatch<SetStateAction<string[]>>;
  baggageIncludedOnly: boolean;
  setBaggageIncludedOnly: (value: boolean) => void;
  flexibleOnly: boolean;
  setFlexibleOnly: (value: boolean) => void;
  onFilterChange: () => void;
  onFilterCommit: () => void;
  onClear: () => void;
};

function formatTimeFromMinutes(value: number, locale: string) {
  const normalized = Math.max(0, Math.min(1439, value));
  const date = new Date(2000, 0, 1, Math.floor(normalized / 60), normalized % 60);

  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDurationFromMinutes(totalMinutes: number, t: (key: string) => string) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) {
    return t("flightResults.duration.minutesOnly").replace("{{minutes}}", String(remainingMinutes));
  }

  if (remainingMinutes === 0) {
    return t("flightResults.duration.hoursOnly").replace("{{hours}}", String(hours));
  }

  return t("flightResults.duration.hoursMinutes")
    .replace("{{hours}}", String(hours))
    .replace("{{minutes}}", String(remainingMinutes));
}

function normalizeCalendarLocale(locale: string) {
  if (locale === "pt") return "pt-BR";
  if (locale === "zh") return "zh-CN";
  return locale || "en";
}

function toggleFilterValue(value: string, setter: Dispatch<SetStateAction<string[]>>) {
  setter((current) =>
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value],
  );
}

export function DesktopFlightFilters({
  activeFilterCount,
  maxPrice,
  setMaxPrice,
  priceBounds,
  priceLabelCurrency,
  selectedCurrency,
  originCode,
  destinationCode,
  timeFilterMode,
  setTimeFilterMode,
  timeBounds,
  maxTakeoffMinutes,
  setMaxTakeoffMinutes,
  maxLandingMinutes,
  setMaxLandingMinutes,
  durationBounds,
  maxDurationMinutes,
  setMaxDurationMinutes,
  stopOptions,
  selectedStops,
  setSelectedStops,
  airlineOptions,
  selectedAirlines,
  setSelectedAirlines,
  airportOptions,
  selectedAirports,
  setSelectedAirports,
  flightQualityOptions,
  renderFlightQualityFilter,
  selectedFlightQuality,
  setSelectedFlightQuality,
  baggageIncludedOnly,
  setBaggageIncludedOnly,
  flexibleOnly,
  setFlexibleOnly,
  onFilterChange,
  onFilterCommit,
  onClear,
}: DesktopFlightFiltersProps) {
  const { t: dictionary, locale } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const calendarLocale = normalizeCalendarLocale(locale);
  const currencyRates = useCurrencyRates();
  const [airlineSearch, setAirlineSearch] = useState("");
  const [showAllAirlines, setShowAllAirlines] = useState(false);

  const formatFilterPrice = (amount: number) =>
    priceLabelCurrency
      ? formatDisplayPrice({
          amount,
          sourceCurrency: priceLabelCurrency,
          displayCurrency: selectedCurrency,
          convertUsdEstimate: true,
          rates: currencyRates.rates,
          isFallbackRate: currencyRates.isFallback,
        }).formatted
      : t("mixedProviderCurrencies");

  const visibleAirlines = useMemo(() => {
    const query = airlineSearch.trim().toLowerCase();
    const options = query
      ? airlineOptions.filter(
          (option) =>
            option.label.toLowerCase().includes(query) ||
            selectedAirlines.includes(option.value),
        )
      : airlineOptions;

    return query || showAllAirlines ? options : options.slice(0, 5);
  }, [airlineOptions, airlineSearch, selectedAirlines, showAllAirlines]);

  const timeBoundsForMode = timeFilterMode === "takeoff" ? timeBounds.takeoff : timeBounds.landing;
  const maxTimeForMode = timeFilterMode === "takeoff" ? maxTakeoffMinutes : maxLandingMinutes;
  const setMaxTimeForMode = timeFilterMode === "takeoff" ? setMaxTakeoffMinutes : setMaxLandingMinutes;
  const airportCode = timeFilterMode === "takeoff" ? originCode : destinationCode;
  const renderQualitySection = renderFlightQualityFilter && flightQualityOptions.length > 0;
  const rangeClass = "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#D7E5F8] accent-[#0067DB] disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="rounded-[10px] border border-[#D8E1EC] bg-[#FCFDFF] px-4 py-4 shadow-[0_10px_26px_-24px_rgba(15,23,42,0.5)] xl:px-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-slate-950">{t("filterBy")}</h2>
        <button
          type="button"
          className="rounded-md px-1.5 py-1 text-xs font-semibold text-[#004BB8] transition hover:bg-[#EAF2FB] disabled:pointer-events-none disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
          onClick={onClear}
          disabled={activeFilterCount === 0}
        >
          {t("carsResults.resetFilters")}
        </button>
      </div>

      <div className="space-y-5">
        <section>
          <SectionTitle>{t("price")}</SectionTitle>
          <div className="mb-2.5 flex justify-between text-[12px] font-semibold tabular-nums text-slate-950">
            <span>{priceBounds.max && priceLabelCurrency ? formatFilterPrice(priceBounds.min) : "—"}</span>
            <span>{priceBounds.max && priceLabelCurrency ? formatFilterPrice(priceBounds.max) : "—"}</span>
          </div>
          <input aria-label={t("price")} className={rangeClass} type="range" min={priceBounds.min || 0} max={priceBounds.max || 0} step={25} value={priceBounds.max ? Math.min(maxPrice, priceBounds.max) : 0} disabled={!priceBounds.max} onPointerUp={onFilterCommit} onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit} onKeyUp={onFilterCommit} onBlur={onFilterCommit} onChange={(event) => { onFilterChange(); setMaxPrice(Number(event.target.value)); }} />
        </section>

        <OptionSection title={t("stops")} emptyText={t("stopsAppearAfterResultsLoad")}>{stopOptions.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} secondaryLabel={option.rightLabel ? `${t("from").toLowerCase()} ${option.rightLabel}` : option.secondaryLabel} checked={selectedStops.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedStops); onFilterCommit(); }} />)}</OptionSection>

        <section>
          <SectionTitle>{timeFilterMode === "takeoff" ? `${t("takeoffTimeFromOrigin")} (${airportCode || "—"})` : `${t("landingTimeAtDestination")} (${airportCode || "—"})`}</SectionTitle>
          <div className="mb-2.5 grid grid-cols-2 rounded-md border border-slate-200 bg-slate-50 p-0.5">
            {["takeoff", "landing"].map((mode) => <button key={mode} type="button" onClick={() => { onFilterChange(); setTimeFilterMode(mode as TimeFilterMode); onFilterCommit(); }} className={cn("rounded px-2 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30", timeFilterMode === mode ? "bg-white text-[#004BB8] shadow-sm" : "text-slate-600 hover:text-slate-950")}>{mode === "takeoff" ? t("takeoff") : t("landing")}</button>)}
          </div>
          <div className="mb-2.5 flex justify-between text-[12px] font-medium tabular-nums text-slate-700"><span>{timeBoundsForMode ? formatTimeFromMinutes(timeBoundsForMode.min, calendarLocale) : "—"}</span><span>{timeBoundsForMode ? formatTimeFromMinutes(timeBoundsForMode.max, calendarLocale) : "—"}</span></div>
          <input aria-label={timeFilterMode === "takeoff" ? t("takeoff") : t("landing")} className={rangeClass} type="range" min={timeBoundsForMode?.min ?? 0} max={timeBoundsForMode?.max ?? 0} step={15} value={maxTimeForMode ?? timeBoundsForMode?.max ?? 0} disabled={!timeBoundsForMode} onPointerUp={onFilterCommit} onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit} onKeyUp={onFilterCommit} onBlur={onFilterCommit} onChange={(event) => { onFilterChange(); setMaxTimeForMode(Number(event.target.value)); }} />
          <button type="button" className="mt-2.5 h-7 w-full rounded-md border border-slate-200 bg-white text-xs font-semibold text-[#004BB8] transition hover:border-[#9EC5FE] hover:bg-[#F4F8FF]" onClick={() => { onFilterChange(); setTimeFilterMode(timeFilterMode === "takeoff" ? "landing" : "takeoff"); onFilterCommit(); }}>{t(timeFilterMode === "takeoff" ? "landingTimeAtDestination" : "takeoffTimeFromOrigin")}</button>
        </section>

        <section>
          <SectionTitle>{t("duration")}</SectionTitle>
          <div className="mb-2.5 flex justify-between text-[12px] font-medium tabular-nums text-slate-700"><span>{durationBounds ? formatDurationFromMinutes(durationBounds.min, t) : "—"}</span><span>{durationBounds ? formatDurationFromMinutes(durationBounds.max, t) : "—"}</span></div>
          <input aria-label={t("duration")} className={rangeClass} type="range" min={durationBounds?.min ?? 0} max={durationBounds?.max ?? 0} step={15} value={maxDurationMinutes ?? durationBounds?.max ?? 0} disabled={!durationBounds} onPointerUp={onFilterCommit} onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit} onKeyUp={onFilterCommit} onBlur={onFilterCommit} onChange={(event) => { onFilterChange(); setMaxDurationMinutes(Number(event.target.value)); }} />
        </section>

        <OptionSection title={t("airlines")} emptyText={t("airlinesAppearAfterResultsLoad")}>
          <label className="sr-only" htmlFor="desktop-airline-filter-search">{t("accountDashboard.preferences.booking.searchAirlines")}</label>
          <input id="desktop-airline-filter-search" className="mb-2.5 h-8 w-full rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#004BB8] focus:outline-none focus:ring-2 focus:ring-[#004BB8]/20" placeholder={t("accountDashboard.preferences.booking.searchAirlines")} type="search" value={airlineSearch} onChange={(event) => setAirlineSearch(event.target.value)} />
          {visibleAirlines.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} secondaryLabel={option.rightLabel ? `${t("from").toLowerCase()} ${option.rightLabel}` : undefined} checked={selectedAirlines.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedAirlines); onFilterCommit(); }} />)}
          {!airlineSearch.trim() && airlineOptions.length > 5 ? <button type="button" className="mx-auto mt-2 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[#004BB8] transition hover:bg-[#EAF2FB]" onClick={() => setShowAllAirlines((current) => !current)}>{showAllAirlines ? t("hotelResults.showLess") : t("showMoreResults")}<ChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5 transition", showAllAirlines && "rotate-180")} /></button> : null}
        </OptionSection>

        <Accordion title={t("baggage") || t("amenities")}><FacetRow label={t("baggageIncluded")} checked={baggageIncludedOnly} onChange={() => { onFilterChange(); setBaggageIncludedOnly(!baggageIncludedOnly); onFilterCommit(); }} /></Accordion>
        {renderQualitySection ? <Accordion title={t("flightQuality")}>{flightQualityOptions.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} checked={selectedFlightQuality.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedFlightQuality); onFilterCommit(); }} />)}</Accordion> : null}
        <Accordion title={t("flexibleRefundable")}><FacetRow label={t("flexibleRefundable")} checked={flexibleOnly} onChange={() => { onFilterChange(); setFlexibleOnly(!flexibleOnly); onFilterCommit(); }} /></Accordion>
        <Accordion title={t("airports")} emptyText={t("airportsAppearAfterResultsLoad")}>{airportOptions.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} checked={selectedAirports.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedAirports); onFilterCommit(); }} />)}</Accordion>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-3 text-[12px] font-extrabold uppercase leading-4 tracking-[0.12em] text-slate-950">{children}</h3>;
}

function OptionSection({ title, emptyText, children }: { title: string; emptyText?: string; children: ReactNode }) {
  const hasOptions = Boolean(children) && (!Array.isArray(children) || children.length > 0);
  return <section><SectionTitle>{title}</SectionTitle><div className="grid gap-0.5">{hasOptions ? children : <p className="py-1 text-xs text-slate-500">{emptyText}</p>}</div></section>;
}

function Accordion({ title, emptyText, children }: { title: string; emptyText?: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `desktop-flight-filter-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-panel`;
  const hasOptions = Boolean(children) && (!Array.isArray(children) || children.length > 0);

  return <section className="border-t border-slate-200/80"><button type="button" aria-expanded={isOpen} aria-controls={panelId} className="flex w-full items-center justify-between gap-3 py-3 text-left text-xs font-extrabold uppercase tracking-[0.08em] text-slate-950 transition hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30" onClick={() => setIsOpen((current) => !current)}><span>{title}</span><ChevronDown aria-hidden="true" className={cn("h-4 w-4 text-slate-600 transition", isOpen && "rotate-180 text-[#004BB8]")} /></button><div id={panelId} className={cn("grid gap-0.5 pb-3", !isOpen && "hidden")}>{hasOptions ? children : <p className="py-1 text-xs text-slate-500">{emptyText}</p>}</div></section>;
}

function FacetRow({ label, count, secondaryLabel, rightLabel, checked, onChange }: { label: string; count?: number; secondaryLabel?: string; rightLabel?: string; checked: boolean; onChange: () => void }) {
  const trailingLabel = rightLabel ?? (typeof count === "number" ? String(count) : null);

  return <label className="flex min-h-9 cursor-pointer items-start justify-between gap-3 rounded-md px-0.5 py-1 text-[12px] font-medium leading-5 text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"><span className="flex min-w-0 items-start gap-2"><input type="checkbox" className="mt-0.5 h-[14px] w-[14px] shrink-0 rounded border-slate-300 accent-[#0067DB] focus-visible:ring-2 focus-visible:ring-[#004BB8]/25" checked={checked} onChange={onChange} /><span className="min-w-0"><span className="block truncate">{label}</span>{secondaryLabel ? <span className="block text-[11px] font-medium leading-4 text-slate-500">{secondaryLabel}</span> : null}</span></span>{trailingLabel ? <span className="shrink-0 text-[12px] font-medium leading-5 text-slate-500">{trailingLabel}</span> : null}</label>;
}
