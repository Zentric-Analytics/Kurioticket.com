"use client";

import { useMemo, useState } from "react";

import type { PublicFlightResult } from "@/lib/types";
import { cn } from "@/lib/utils";

type FilterOption = { value: string; label: string; count: number; secondaryLabel?: string; rightLabel?: string };
export type MobileJourneyTimeMaximums = Record<string, { takeoff: number | null; landing: number | null }>;

export function mobileFlightLegKey(leg: PublicFlightResult["legs"] extends (infer L)[] | undefined ? L : never, index: number) {
  if (leg.direction === "outbound" || leg.direction === "return") return leg.direction;
  return `leg:${leg.legIndex ?? index}`;
}

const timeMinutes = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getHours() * 60 + date.getMinutes();
};

const clock = (minutes: number) => {
  const value = Math.max(0, Math.min(1439, Math.round(minutes)));
  const hours = Math.floor(value / 60);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(value % 60).padStart(2, "0")} ${suffix}`;
};

const duration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ""}` : `${remainder}m`;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border-b border-slate-200 pb-6 last:border-0"><h3 className="mb-3 text-[15px] font-bold leading-5 text-slate-950">{title}</h3>{children}</section>;
}

function CheckRow({ label, count, trailing, checked, onChange }: { label: string; count?: number; trailing?: string; checked: boolean; onChange: () => void }) {
  return <button type="button" role="checkbox" aria-checked={checked} onClick={onChange} className="flex min-h-12 w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"><span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border-[1.5px] text-xs font-bold", checked ? "border-[#004BB8] bg-[#004BB8] text-white" : "border-[#D8DEE8] bg-white text-transparent")}>✓</span><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold leading-[18px] text-slate-900">{label}</span>{count !== undefined ? <span className="block text-[11px] leading-4 text-slate-500">{count} {count === 1 ? "flight" : "flights"}</span> : null}</span>{trailing ? <span className="shrink-0 text-[12px] font-semibold text-slate-600">{trailing}</span> : null}</button>;
}

export function MobileFlightFiltersSheet({ results, activeFilterCount, matchingCount, priceBounds, maxPrice, formatPrice, onMaxPrice, durationBounds, maxDurationMinutes, onMaxDuration, stopOptions, selectedStops, onToggleStop, airlineOptions, selectedAirlines, onToggleAirline, fromAirportOptions, toAirportOptions, selectedAirports, onToggleAirport, baggageSupported, refundableSupported, baggageIncludedOnly, flexibleOnly, onBaggage, onFlexible, journeyTimeMaximums, onJourneyTimeChange, onReset, onView }: {
  results: PublicFlightResult[];
  activeFilterCount: number;
  matchingCount: number;
  priceBounds: { min: number; max: number };
  maxPrice: number;
  formatPrice: (value: number) => string;
  onMaxPrice: (value: number) => void;
  durationBounds: { min: number; max: number } | null;
  maxDurationMinutes: number | null;
  onMaxDuration: (value: number) => void;
  stopOptions: FilterOption[];
  selectedStops: string[];
  onToggleStop: (value: string) => void;
  airlineOptions: FilterOption[];
  selectedAirlines: string[];
  onToggleAirline: (value: string) => void;
  fromAirportOptions: FilterOption[];
  toAirportOptions: FilterOption[];
  selectedAirports: string[];
  onToggleAirport: (value: string) => void;
  baggageSupported: boolean;
  refundableSupported: boolean;
  baggageIncludedOnly: boolean;
  flexibleOnly: boolean;
  onBaggage: () => void;
  onFlexible: () => void;
  journeyTimeMaximums: MobileJourneyTimeMaximums;
  onJourneyTimeChange: (key: string, mode: "takeoff" | "landing", value: number | null) => void;
  onReset: () => void;
  onView: () => void;
}) {
  const [legTab, setLegTab] = useState(0);
  const [timeMode, setTimeMode] = useState<"takeoff" | "landing">("takeoff");
  const [airlineSearch, setAirlineSearch] = useState("");
  const [showAllAirlines, setShowAllAirlines] = useState(false);
  const legs = useMemo(() => results.find((result) => result.legs?.length)?.legs?.filter((leg) => ["outbound", "return", "leg"].includes(leg.direction)) ?? [], [results]);
  const leg = legs[legTab];
  const legKey = leg ? mobileFlightLegKey(leg, legTab) : "outbound";
  const legTimes = useMemo(() => {
    const values: number[] = [];
    for (const result of results) {
      const candidates = result.legs?.filter((item) => ["outbound", "return", "leg"].includes(item.direction)) ?? [];
      const candidate = candidates.find((item, index) => mobileFlightLegKey(item, index) === legKey) ?? (legKey === "outbound" ? result : undefined);
      if (!candidate) continue;
      const value = timeMinutes(timeMode === "takeoff" ? candidate.departureTime : candidate.arrivalTime);
      if (value !== null) values.push(value);
    }
    return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
  }, [legKey, results, timeMode]);
  const selectedTime = journeyTimeMaximums[legKey]?.[timeMode] ?? legTimes?.max ?? null;
  const searchedAirlines = airlineOptions.filter((option) => !airlineSearch.trim() || option.label.toLowerCase().includes(airlineSearch.trim().toLowerCase()) || selectedAirlines.includes(option.value));
  const visibleAirlines = airlineSearch.trim() || showAllAirlines ? searchedAirlines : searchedAirlines.slice(0, 5);
  const rangeClass = "h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30";

  return <>
    <div data-mobile-flight-filter-sections className="space-y-6">
      {priceBounds.max > 0 ? <Section title="Price"><label className="block text-[13px] font-semibold text-slate-700">Maximum price</label><input aria-label="Maximum price" className={cn(rangeClass, "mt-3")} type="range" min={priceBounds.min} max={priceBounds.max} step={25} value={Math.min(maxPrice, priceBounds.max)} onChange={(event) => onMaxPrice(Number(event.target.value))} /><div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{formatPrice(priceBounds.min)}</span><span>{formatPrice(priceBounds.max)}</span></div><p className="mt-2 text-[13px] font-bold text-slate-900">Up to {formatPrice(Math.min(maxPrice, priceBounds.max))}</p></Section> : null}
      {legs.length ? <Section title="Flight times">{legs.length > 1 ? <div role="tablist" aria-label="Flight leg" className="mb-3 flex gap-4 overflow-x-auto border-b border-slate-200">{legs.map((item, index) => <button key={mobileFlightLegKey(item, index)} type="button" role="tab" aria-selected={legTab === index} onClick={() => setLegTab(index)} className={cn("min-h-11 shrink-0 border-b-2 px-1 text-[13px] font-bold", legTab === index ? "border-[#004BB8] text-[#004BB8]" : "border-transparent text-slate-500")}>{item.direction === "outbound" ? "Departing flight" : item.direction === "return" ? "Return flight" : `Flight ${(item.legIndex ?? index) + 1}`}</button>)}</div> : null}<div className="grid grid-cols-2 rounded-[10px] bg-slate-100 p-1">{(["takeoff", "landing"] as const).map((mode) => <button key={mode} type="button" aria-pressed={timeMode === mode} onClick={() => setTimeMode(mode)} className={cn("min-h-10 rounded-lg text-[13px] font-bold", timeMode === mode ? "bg-white text-[#004BB8] shadow-sm" : "text-slate-600")}>{mode === "takeoff" ? "Takeoff" : "Landing"}</button>)}</div>{legTimes && leg ? <div className="mt-3"><div className="flex justify-between gap-3 text-[13px]"><span className="font-semibold text-slate-600">{timeMode === "takeoff" ? `Takeoff: ${leg.originAirport}` : `Landing: ${leg.destinationAirport}`}</span><span className="font-bold text-slate-900">{clock(selectedTime ?? legTimes.max)}</span></div><input aria-label={timeMode === "takeoff" ? `Takeoff: ${leg.originAirport}` : `Landing: ${leg.destinationAirport}`} className={cn(rangeClass, "mt-3")} type="range" min={legTimes.min} max={legTimes.max} step={15} value={selectedTime ?? legTimes.max} onChange={(event) => { const value = Number(event.target.value); onJourneyTimeChange(legKey, timeMode, value === legTimes.max ? null : value); }} /></div> : null}</Section> : null}
      {durationBounds ? <Section title="Duration"><label className="block text-[13px] font-semibold text-slate-700">Maximum travel time</label><input aria-label="Maximum travel time" className={cn(rangeClass, "mt-3")} type="range" min={durationBounds.min} max={durationBounds.max} step={5} value={maxDurationMinutes ?? durationBounds.max} onChange={(event) => onMaxDuration(Number(event.target.value))} /><div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{duration(durationBounds.min)}</span><span>{duration(durationBounds.max)}</span></div><p className="mt-2 text-[13px] font-bold text-slate-900">{duration(maxDurationMinutes ?? durationBounds.max)}</p></Section> : null}
      <Section title="Stops">{stopOptions.map((option) => <CheckRow key={option.value} label={option.value === "0" ? "Nonstop" : option.value === "1" ? "1 stop" : "2+ stops"} count={option.count} trailing={option.rightLabel ? `From ${option.rightLabel}` : undefined} checked={selectedStops.includes(option.value)} onChange={() => onToggleStop(option.value)} />)}</Section>
      <Section title="Airlines"><label className="sr-only" htmlFor="mobile-flight-airline-search">Search airlines</label><input id="mobile-flight-airline-search" type="search" value={airlineSearch} onChange={(event) => setAirlineSearch(event.target.value)} placeholder="Search airlines" className="mb-2 min-h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3 text-[13px] text-slate-950 outline-none focus:border-[#004BB8] focus:ring-2 focus:ring-[#004BB8]/20" />{visibleAirlines.map((option) => <CheckRow key={option.value} label={option.label} count={option.count} checked={selectedAirlines.includes(option.value)} onChange={() => onToggleAirline(option.value)} />)}{!airlineSearch.trim() && airlineOptions.length > 5 ? <button type="button" onClick={() => setShowAllAirlines((current) => !current)} className="min-h-11 text-[13px] font-bold text-[#004BB8]">{showAllAirlines ? "Show less" : "Show more"}</button> : null}</Section>
      {(fromAirportOptions.length || toAirportOptions.length) ? <Section title="Airports">{fromAirportOptions.length ? <><h4 className="mb-1 text-[11px] font-bold tracking-[0.08em] text-slate-500">FROM</h4>{fromAirportOptions.map((option) => <CheckRow key={`from-${option.value}`} label={option.label} count={option.count} checked={selectedAirports.includes(option.value)} onChange={() => onToggleAirport(option.value)} />)}</> : null}{toAirportOptions.length ? <><h4 className="mb-1 mt-3 text-[11px] font-bold tracking-[0.08em] text-slate-500">TO</h4>{toAirportOptions.map((option) => <CheckRow key={`to-${option.value}`} label={option.label} count={option.count} checked={selectedAirports.includes(option.value)} onChange={() => onToggleAirport(option.value)} />)}</> : null}</Section> : null}
      {(baggageSupported || refundableSupported) ? <Section title="Fare preferences">{baggageSupported ? <CheckRow label="Baggage included" checked={baggageIncludedOnly} onChange={onBaggage} /> : null}{refundableSupported ? <CheckRow label="Flexible / refundable" checked={flexibleOnly} onChange={onFlexible} /> : null}</Section> : null}
    </div>
    <div data-mobile-flight-filter-footer className="sticky bottom-0 -mx-5 mt-6 flex gap-3 border-t border-[#D8DEE8] bg-[#F2F4F8] px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">{activeFilterCount > 0 ? <button type="button" onClick={onReset} className="min-h-12 min-w-[116px] rounded-xl border border-[#D8DEE8] bg-[#F2F4F8] px-4 text-[15px] font-bold text-slate-900">Reset</button> : null}<button type="button" disabled={matchingCount === 0} onClick={onView} className="min-h-12 flex-1 rounded-[10px] bg-[#004BB8] px-4 text-[15px] font-bold text-white disabled:opacity-45">{matchingCount === 0 ? "No flights" : `View ${matchingCount} ${matchingCount === 1 ? "flight" : "flights"}`}</button></div>
  </>;
}
