"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";

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
  presentationMode?: "default" | "deals-guided";
  compact?: boolean;
  idPrefix?: string;
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
  presentationMode = "default",
  compact = false,
  idPrefix = "desktop-flight-filter",
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
  const [openCompactSection, setOpenCompactSection] = useState<string | null>(null);

  const formatFilterPrice = (amount: number) =>
    priceLabelCurrency
      ? formatDisplayPrice({
          amount,
          sourceCurrency: priceLabelCurrency,
          displayCurrency: selectedCurrency,
          convertSourceEstimate: true,
          useFlightResultSymbols: true,
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
  const hasActiveFilters = activeFilterCount > 0;
  const isGuidedComfortable = presentationMode === "deals-guided";

  if (compact) {
    const compactSections = {
      price: priceBounds.max > 0 && maxPrice > 0 && maxPrice < priceBounds.max ? 1 : 0,
      time:
        Number(Boolean(timeBounds.takeoff && maxTakeoffMinutes !== null && maxTakeoffMinutes < timeBounds.takeoff.max)) +
        Number(Boolean(timeBounds.landing && maxLandingMinutes !== null && maxLandingMinutes < timeBounds.landing.max)),
      duration: durationBounds && maxDurationMinutes !== null && maxDurationMinutes < durationBounds.max ? 1 : 0,
      stops: selectedStops.length,
      airlines: selectedAirlines.length,
      airports: selectedAirports.length,
      baggage: Number(baggageIncludedOnly) + Number(flexibleOnly),
      quality: selectedFlightQuality.length,
    };

    const toggleCompactSection = (section: string) =>
      setOpenCompactSection((current) => (current === section ? null : section));

    return (
      <div
        data-flight-desktop-filter-surface
        data-flight-desktop-compact-filter-surface
        className="desktop-filter-sidebar cars-desktop-filter-surface flex max-h-full w-full flex-col overflow-hidden rounded-2xl border border-[#D8E1EC] bg-[#F2F4F8] p-0 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.42)]"
      >
        <div className="desktop-filter-sidebar__header shrink-0 border-b border-[#D8E1EC]/80 bg-[#F2F4F8] px-3.5 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="desktop-filter-sidebar__title flex min-w-0 items-center gap-2 truncate text-[15px] font-semibold leading-5 tracking-[-0.004em] text-[#07133B]">
              <SlidersHorizontal
                className="desktop-filter-sidebar__icon cars-desktop-filter-icon shrink-0 text-[#07133B]"
                size={15}
                strokeWidth={2.25}
                aria-hidden="true"
              />
              <span className="truncate">{t("filters")}</span>
            </h2>
          </div>
          {hasActiveFilters ? (
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="desktop-filter-sidebar__count rounded-full bg-[#EAF2FB] px-2 py-0.5 text-[12px] font-semibold leading-4 text-[#235A9F] ring-1 ring-[#004BB8]/8">
                {t("activeFilterCount").replace("{{count}}", String(activeFilterCount))}
              </span>
              <button
                type="button"
                aria-label="Reset filters"
                className="rounded-full px-1.5 py-0.5 text-[12px] font-semibold leading-4 text-[#526174] transition hover:bg-slate-100 hover:text-[#235A9F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
                onClick={onClear}
              >
                {t("clearAll")}
              </button>
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#F2F4F8] px-2 py-1">
          <CompactFilterSection
            id={`${idPrefix}-price-panel`}
            title={t("price")}
            open={openCompactSection === "price"}
            selectedCount={compactSections.price}
            onToggle={() => toggleCompactSection("price")}
          >
            <div className={cn("mb-2.5 grid grid-cols-2 gap-4 text-[12px] font-medium leading-5 tabular-nums text-[#475569]", isGuidedComfortable && "text-[13px]")}>
              <span className="min-w-0">{priceBounds.max && priceLabelCurrency ? formatFilterPrice(priceBounds.min) : "—"}</span>
              <span className="min-w-0 text-right">{priceBounds.max && priceLabelCurrency ? formatFilterPrice(priceBounds.max) : "—"}</span>
            </div>
            <input aria-label={t("price")} className={rangeClass} type="range" min={priceBounds.min || 0} max={priceBounds.max || 0} step={25} value={priceBounds.max ? Math.min(maxPrice, priceBounds.max) : 0} disabled={!priceBounds.max} onPointerUp={onFilterCommit} onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit} onKeyUp={onFilterCommit} onBlur={onFilterCommit} onChange={(event) => { onFilterChange(); setMaxPrice(Number(event.target.value)); }} />
            {priceBounds.max && priceLabelCurrency ? <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-950">{t("price")}: {formatFilterPrice(Math.min(maxPrice, priceBounds.max))}</p> : null}
          </CompactFilterSection>

          <CompactFilterSection
            id={`${idPrefix}-time-panel`}
            title={`${t("takeoff")} / ${t("landing")}`}
            open={openCompactSection === "time"}
            selectedCount={compactSections.time}
            onToggle={() => toggleCompactSection("time")}
          >
            <div className="mb-2.5 grid grid-cols-2 rounded-[10px] bg-slate-100 p-1">
              {["takeoff", "landing"].map((mode) => <button key={mode} type="button" onClick={() => setTimeFilterMode(mode as TimeFilterMode)} className={cn("min-h-9 rounded-lg px-2 py-1.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30", isGuidedComfortable && "min-h-10", timeFilterMode === mode ? "bg-white text-[#004BB8] shadow-sm" : "text-slate-600 hover:text-slate-950")}>{mode === "takeoff" ? t("takeoff") : t("landing")}</button>)}
            </div>
            <div className={cn("mb-2.5 flex items-center justify-between gap-3 text-[12px] leading-5", isGuidedComfortable && "text-[13px]")}>
              <span className="min-w-0 font-medium text-slate-600">{timeFilterMode === "takeoff" ? `${t("takeoffTimeFromOrigin")} (${airportCode || "—"})` : `${t("landingTimeAtDestination")} (${airportCode || "—"})`}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-950">{timeBoundsForMode ? formatTimeFromMinutes(maxTimeForMode ?? timeBoundsForMode.max, calendarLocale) : "—"}</span>
            </div>
            <input aria-label={timeFilterMode === "takeoff" ? t("takeoff") : t("landing")} className={rangeClass} type="range" min={timeBoundsForMode?.min ?? 0} max={timeBoundsForMode?.max ?? 0} step={15} value={maxTimeForMode ?? timeBoundsForMode?.max ?? 0} disabled={!timeBoundsForMode} onPointerUp={onFilterCommit} onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit} onKeyUp={onFilterCommit} onBlur={onFilterCommit} onChange={(event) => { onFilterChange(); setMaxTimeForMode(Number(event.target.value)); }} />
          </CompactFilterSection>

          <CompactFilterSection
            id={`${idPrefix}-duration-panel`}
            title={t("duration")}
            open={openCompactSection === "duration"}
            selectedCount={compactSections.duration}
            onToggle={() => toggleCompactSection("duration")}
          >
            <div className={cn("mb-2.5 flex items-center justify-between gap-3 text-[12px] leading-5", isGuidedComfortable && "text-[13px]")}>
              <span className="font-medium text-slate-600">{t("duration")}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-950">{durationBounds ? formatDurationFromMinutes(maxDurationMinutes ?? durationBounds.max, t) : "—"}</span>
            </div>
            <input aria-label={t("duration")} className={rangeClass} type="range" min={durationBounds?.min ?? 0} max={durationBounds?.max ?? 0} step={15} value={maxDurationMinutes ?? durationBounds?.max ?? 0} disabled={!durationBounds} onPointerUp={onFilterCommit} onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit} onKeyUp={onFilterCommit} onBlur={onFilterCommit} onChange={(event) => { onFilterChange(); setMaxDurationMinutes(Number(event.target.value)); }} />
          </CompactFilterSection>

          <CompactFilterSection id={`${idPrefix}-stops-panel`} title={t("stops")} open={openCompactSection === "stops"} selectedCount={compactSections.stops} onToggle={() => toggleCompactSection("stops")}>
            <div className="grid gap-0.5">{stopOptions.length ? stopOptions.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} secondaryLabel={option.rightLabel ? `${t("from").toLowerCase()} ${option.rightLabel}` : option.secondaryLabel} checked={selectedStops.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedStops); onFilterCommit(); }} />) : <p className="py-1 text-xs text-slate-500">{t("stopsAppearAfterResultsLoad")}</p>}</div>
          </CompactFilterSection>

          <CompactFilterSection id={`${idPrefix}-airlines-panel`} title={t("airlines")} open={openCompactSection === "airlines"} selectedCount={compactSections.airlines} onToggle={() => toggleCompactSection("airlines")}>
            <label className="sr-only" htmlFor={`${idPrefix}-airline-search`}>{t("accountDashboard.preferences.booking.searchAirlines")}</label>
            <input id={`${idPrefix}-airline-search`} className="mb-2.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#004BB8] focus:outline-none focus:ring-2 focus:ring-[#004BB8]/20" placeholder={t("accountDashboard.preferences.booking.searchAirlines")} type="search" value={airlineSearch} onChange={(event) => setAirlineSearch(event.target.value)} />
            {visibleAirlines.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} checked={selectedAirlines.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedAirlines); onFilterCommit(); }} />)}
            {!airlineSearch.trim() && airlineOptions.length > 5 ? <button type="button" className="mx-auto mt-2 flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#004BB8] transition hover:bg-[#EAF2FB]" onClick={() => setShowAllAirlines((current) => !current)}>{showAllAirlines ? t("hotelResults.showLess") : t("showMoreResults")}<ChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5 transition", showAllAirlines && "rotate-180")} /></button> : null}
          </CompactFilterSection>

          <CompactFilterSection id={`${idPrefix}-airports-panel`} title={t("airports")} open={openCompactSection === "airports"} selectedCount={compactSections.airports} onToggle={() => toggleCompactSection("airports")}>
            <div className="grid gap-0.5">{airportOptions.length ? airportOptions.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} checked={selectedAirports.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedAirports); onFilterCommit(); }} />) : <p className="py-1 text-xs text-slate-500">{t("airportsAppearAfterResultsLoad")}</p>}</div>
          </CompactFilterSection>

          <CompactFilterSection id={`${idPrefix}-baggage-panel`} title={`${t("baggage")} / ${t("flexibleRefundable")}`} open={openCompactSection === "baggage"} selectedCount={compactSections.baggage} onToggle={() => toggleCompactSection("baggage")}>
            <div className="grid gap-0.5">
              <FacetRow label={t("baggageIncluded")} checked={baggageIncludedOnly} onChange={() => { onFilterChange(); setBaggageIncludedOnly(!baggageIncludedOnly); onFilterCommit(); }} />
              <FacetRow label={t("flexibleRefundable")} checked={flexibleOnly} onChange={() => { onFilterChange(); setFlexibleOnly(!flexibleOnly); onFilterCommit(); }} />
            </div>
          </CompactFilterSection>

          {renderQualitySection ? (
            <CompactFilterSection id={`${idPrefix}-quality-panel`} title={t("flightQuality")} open={openCompactSection === "quality"} selectedCount={compactSections.quality} onToggle={() => toggleCompactSection("quality")}>
              <div className="grid gap-0.5">{flightQualityOptions.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} checked={selectedFlightQuality.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedFlightQuality); onFilterCommit(); }} />)}</div>
            </CompactFilterSection>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      data-flight-desktop-filter-surface
      className={cn(
        "desktop-filter-sidebar cars-desktop-filter-surface border border-slate-200/80 bg-[#F2F4F8] p-0 shadow-none",
        compact
          ? "max-h-full w-full overflow-y-auto rounded-2xl overscroll-contain"
          : "rounded-none",
        isGuidedComfortable && "bg-[#F2F4F8]",
      )}
    >
      <div className="desktop-filter-sidebar__header shrink-0 border-b border-slate-200/70 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-[16px] font-semibold leading-6 tracking-[-0.006em] text-[#07133B]">
            {t("filters")}
            {hasActiveFilters ? (
              <span className="ms-2 rounded-full bg-[#004BB8] px-2 py-0.5 text-[12px] font-semibold leading-4 text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </h2>
          <SlidersHorizontal
            aria-hidden="true"
            className="cars-desktop-filter-icon h-[18px] w-[18px] shrink-0 text-[#07133B]"
            strokeWidth={2}
          />
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            aria-label="Reset filters"
            className="focus-ring mt-2 text-[13px] font-semibold leading-5 text-[#004BB8]"
            onClick={onClear}
          >
            {t("clearAll")}
          </button>
        ) : null}
      </div>

      <div className="space-y-0 bg-transparent px-3 py-1">
        <section className="border-t border-slate-200/75 py-3 first:border-t-0">
          <SectionTitle>{t("price")}</SectionTitle>
          <div className={cn("mb-2.5 grid grid-cols-2 gap-4 text-[12px] font-medium leading-5 tabular-nums text-[#475569]", isGuidedComfortable && "text-[13px]")}>
            <span className="min-w-0">{priceBounds.max && priceLabelCurrency ? formatFilterPrice(priceBounds.min) : "—"}</span>
            <span className="min-w-0 text-right">{priceBounds.max && priceLabelCurrency ? formatFilterPrice(priceBounds.max) : "—"}</span>
          </div>
          <input aria-label={t("price")} className={rangeClass} type="range" min={priceBounds.min || 0} max={priceBounds.max || 0} step={25} value={priceBounds.max ? Math.min(maxPrice, priceBounds.max) : 0} disabled={!priceBounds.max} onPointerUp={onFilterCommit} onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit} onKeyUp={onFilterCommit} onBlur={onFilterCommit} onChange={(event) => { onFilterChange(); setMaxPrice(Number(event.target.value)); }} />
          {priceBounds.max && priceLabelCurrency ? <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-950">{t("price")}: {formatFilterPrice(Math.min(maxPrice, priceBounds.max))}</p> : null}
        </section>

        <section className="border-t border-slate-200/75 py-3 first:border-t-0">
          <SectionTitle>{t("takeoff")} / {t("landing")}</SectionTitle>
          <div className="mb-2.5 grid grid-cols-2 rounded-[10px] bg-slate-100 p-1">
            {["takeoff", "landing"].map((mode) => <button key={mode} type="button" onClick={() => { onFilterChange(); setTimeFilterMode(mode as TimeFilterMode); onFilterCommit(); }} className={cn("min-h-9 rounded-lg px-2 py-1.5 text-[13px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30", isGuidedComfortable && "min-h-10", timeFilterMode === mode ? "bg-white text-[#004BB8] shadow-sm" : "text-slate-600 hover:text-slate-950")}>{mode === "takeoff" ? t("takeoff") : t("landing")}</button>)}
          </div>
          <div className={cn("mb-2.5 flex items-center justify-between gap-3 text-[12px] leading-5", isGuidedComfortable && "text-[13px]")}>
            <span className="min-w-0 font-medium text-slate-600">{timeFilterMode === "takeoff" ? `${t("takeoffTimeFromOrigin")} (${airportCode || "—"})` : `${t("landingTimeAtDestination")} (${airportCode || "—"})`}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-950">{timeBoundsForMode ? formatTimeFromMinutes(maxTimeForMode ?? timeBoundsForMode.max, calendarLocale) : "—"}</span>
          </div>
          <input aria-label={timeFilterMode === "takeoff" ? t("takeoff") : t("landing")} className={rangeClass} type="range" min={timeBoundsForMode?.min ?? 0} max={timeBoundsForMode?.max ?? 0} step={15} value={maxTimeForMode ?? timeBoundsForMode?.max ?? 0} disabled={!timeBoundsForMode} onPointerUp={onFilterCommit} onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit} onKeyUp={onFilterCommit} onBlur={onFilterCommit} onChange={(event) => { onFilterChange(); setMaxTimeForMode(Number(event.target.value)); }} />
        </section>

        <section className="border-t border-slate-200/75 py-3 first:border-t-0">
          <SectionTitle>{t("duration")}</SectionTitle>
          <div className={cn("mb-2.5 flex items-center justify-between gap-3 text-[12px] leading-5", isGuidedComfortable && "text-[13px]")}>
            <span className="font-medium text-slate-600">{t("duration")}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-950">{durationBounds ? formatDurationFromMinutes(maxDurationMinutes ?? durationBounds.max, t) : "—"}</span>
          </div>
          <input aria-label={t("duration")} className={rangeClass} type="range" min={durationBounds?.min ?? 0} max={durationBounds?.max ?? 0} step={15} value={maxDurationMinutes ?? durationBounds?.max ?? 0} disabled={!durationBounds} onPointerUp={onFilterCommit} onMouseUp={onFilterCommit} onTouchEnd={onFilterCommit} onKeyUp={onFilterCommit} onBlur={onFilterCommit} onChange={(event) => { onFilterChange(); setMaxDurationMinutes(Number(event.target.value)); }} />
        </section>

        <OptionSection title={t("stops")} emptyText={t("stopsAppearAfterResultsLoad")}>{stopOptions.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} secondaryLabel={option.rightLabel ? `${t("from").toLowerCase()} ${option.rightLabel}` : option.secondaryLabel} checked={selectedStops.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedStops); onFilterCommit(); }} />)}</OptionSection>

        <OptionSection title={t("airlines")} emptyText={t("airlinesAppearAfterResultsLoad")}>
          <label className="sr-only" htmlFor={`${idPrefix}-airline-search`}>{t("accountDashboard.preferences.booking.searchAirlines")}</label>
          <input id={`${idPrefix}-airline-search`} className="mb-2.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#004BB8] focus:outline-none focus:ring-2 focus:ring-[#004BB8]/20" placeholder={t("accountDashboard.preferences.booking.searchAirlines")} type="search" value={airlineSearch} onChange={(event) => setAirlineSearch(event.target.value)} />
          {visibleAirlines.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} checked={selectedAirlines.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedAirlines); onFilterCommit(); }} />)}
          {!airlineSearch.trim() && airlineOptions.length > 5 ? <button type="button" className="mx-auto mt-2 flex min-h-9 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#004BB8] transition hover:bg-[#EAF2FB]" onClick={() => setShowAllAirlines((current) => !current)}>{showAllAirlines ? t("hotelResults.showLess") : t("showMoreResults")}<ChevronDown aria-hidden="true" className={cn("h-3.5 w-3.5 transition", showAllAirlines && "rotate-180")} /></button> : null}
        </OptionSection>

        <OptionSection title={t("airports")} emptyText={t("airportsAppearAfterResultsLoad")}>{airportOptions.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} checked={selectedAirports.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedAirports); onFilterCommit(); }} />)}</OptionSection>

        <section className="border-t border-slate-200/75 py-3 first:border-t-0">
          <SectionTitle>{t("baggage")} / {t("flexibleRefundable")}</SectionTitle>
          <div className="grid gap-0.5">
            <FacetRow label={t("baggageIncluded")} checked={baggageIncludedOnly} onChange={() => { onFilterChange(); setBaggageIncludedOnly(!baggageIncludedOnly); onFilterCommit(); }} />
            <FacetRow label={t("flexibleRefundable")} checked={flexibleOnly} onChange={() => { onFilterChange(); setFlexibleOnly(!flexibleOnly); onFilterCommit(); }} />
          </div>
        </section>

        {renderQualitySection ? <Accordion idPrefix={idPrefix} title={t("flightQuality")}>{flightQualityOptions.map((option) => <FacetRow key={option.value} label={option.label} count={option.count} checked={selectedFlightQuality.includes(option.value)} onChange={() => { onFilterChange(); toggleFilterValue(option.value, setSelectedFlightQuality); onFilterCommit(); }} />)}</Accordion> : null}
      </div>
    </div>
  );
}

function CompactFilterSection({
  id,
  title,
  open,
  selectedCount,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  selectedCount: number;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[#D8E1EC]/75 first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className={cn(
          "group flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-start text-[14px] font-semibold leading-5 tracking-[-0.004em] text-slate-800 transition-colors duration-200 motion-reduce:transition-none hover:bg-[#E5ECF4] hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#004BB8]/30",
          open && "text-[#004BB8]",
        )}
      >
        <span className="min-w-0 truncate">{title}</span>
        <span className="flex shrink-0 items-center gap-2">
          {selectedCount > 0 ? (
            <span className="min-w-5 rounded-full bg-[#E2EAF3] px-2 py-0.5 text-center text-[12px] font-semibold normal-case leading-4 tracking-normal text-[#235A9F] ring-1 ring-[#004BB8]/10 group-hover:bg-[#DCE8F6]">
              {selectedCount}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-slate-500 transition duration-200 motion-reduce:transition-none group-hover:text-[#004BB8]",
              open && "rotate-180 text-[#004BB8]",
            )}
            strokeWidth={2.3}
            aria-hidden="true"
          />
        </span>
      </button>
      <div
        id={id}
        hidden={!open}
        aria-hidden={!open}
        className="px-2.5 pb-3 pt-0.5"
      >
        {children}
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-[14px] font-semibold normal-case leading-5 tracking-[-0.002em] text-[#334155]">{children}</h3>;
}

function OptionSection({ title, emptyText, children }: { title: string; emptyText?: string; children: ReactNode }) {
  const hasOptions = Boolean(children) && (!Array.isArray(children) || children.length > 0);
  return <section className="border-t border-slate-200/75 py-3 first:border-t-0"><SectionTitle>{title}</SectionTitle><div className="grid gap-0.5">{hasOptions ? children : <p className="py-1 text-xs text-slate-500">{emptyText}</p>}</div></section>;
}

function Accordion({ idPrefix, title, emptyText, children }: { idPrefix: string; title: string; emptyText?: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = `${idPrefix}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-panel`;
  const hasOptions = Boolean(children) && (!Array.isArray(children) || children.length > 0);

  return <section className="border-t border-slate-200"><button type="button" aria-expanded={isOpen} aria-controls={panelId} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg py-2.5 text-left text-sm font-semibold text-[#334155] transition hover:bg-slate-100/70 hover:text-[#142033] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30" onClick={() => setIsOpen((current) => !current)}><span>{title}</span><ChevronDown aria-hidden="true" className={cn("h-4 w-4 text-slate-500 transition", isOpen && "rotate-180 text-[#004BB8]")} /></button><div id={panelId} className={cn("grid gap-0.5 pb-3", !isOpen && "hidden")}>{hasOptions ? children : <p className="py-1 text-xs text-slate-500">{emptyText}</p>}</div></section>;
}

function FacetRow({ label, count, secondaryLabel, rightLabel, checked, onChange }: { label: string; count?: number; secondaryLabel?: string; rightLabel?: string; checked: boolean; onChange: () => void }) {
  const trailingLabel = rightLabel ?? (typeof count === "number" ? String(count) : null);

  return <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[14px] font-medium leading-5 transition-all", checked ? "font-semibold text-[#142033]" : "text-[#64748B] hover:bg-slate-100/70 hover:text-[#334155]")}><input type="checkbox" className="h-4 w-4 shrink-0 rounded border-slate-300 accent-blue" checked={checked} onChange={onChange} /><span className="min-w-0 flex-1"><span className="block break-words">{label}</span>{secondaryLabel ? <span className="block break-words text-[12px] font-medium leading-4 text-[#64748B]">{secondaryLabel}</span> : null}</span>{trailingLabel ? <span className="ms-auto shrink-0 text-[13px] font-medium leading-5 tabular-nums text-[#64748B]">{trailingLabel}</span> : null}</label>;
}
