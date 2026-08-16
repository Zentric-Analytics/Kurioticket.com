"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { Building2, ChevronRight, MapPin, Plane, Search } from "lucide-react";
import { FlightMobilePickerShell } from "@/components/search/FlightMobilePickerShell";
import { useLocale } from "@/components/layout/LocaleProvider";
import { searchCarLocationSuggestions, type CarLocationSuggestion } from "@/lib/cars/carLocationSuggestions";

type Props = { open: boolean; mode: "pickup" | "return"; value: string; launcherRef?: RefObject<HTMLElement | null>; onClose: () => void; onCommit: (value: string) => void };

function LocationRow({ item, selected = false, onSelect }: { item: CarLocationSuggestion; selected?: boolean; onSelect: () => void }) {
  const Icon = item.kind === "airport" ? Plane : item.kind === "city" ? Building2 : MapPin;
  return <div className={`flex min-h-[76px] items-center border-b border-slate-200 px-3 last:border-b-0 ${selected ? "bg-[#075EE8]/5" : ""}`}>
    <button type="button" onClick={onSelect} aria-label={`${item.primaryText}, ${item.secondaryText}`} aria-pressed={selected} className="focus-ring flex min-w-0 flex-1 items-center gap-3 text-start">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-50"><Icon aria-hidden="true" className="h-5 w-5 text-slate-600" /></span>
      <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-bold text-slate-950">{item.primaryText}{item.airportCode ? ` (${item.airportCode})` : ""}</span><span className="mt-1 block truncate text-xs font-medium text-slate-500">{item.secondaryText || (item.kind === "city" ? "City" : "")}</span></span>
      <span className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">{item.airportCode ?? (item.kind === "city" ? "City" : item.kind === "area" ? "Area" : "")}</span>{item.airportCode ? <span className="rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">Airport</span> : null}{!selected ? <ChevronRight aria-hidden="true" className="h-4 w-4 text-slate-500" /> : null}</span>
    </button>
  </div>;
}

export function MobileCarLocationPicker({ open, mode, value, launcherRef, onClose, onCommit }: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value);
  const [draft, setDraft] = useState<CarLocationSuggestion | null>(null);
  const [results, setResults] = useState<CarLocationSuggestion[]>([]);
  const [searchCompleted, setSearchCompleted] = useState(false);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      setQuery("");
      setDraft(null);
      setResults([]);
      setSearchCompleted(false);
      inputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, value]);
  useEffect(() => {
    if (!open) return;
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setSearchCompleted(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      searchCarLocationSuggestions(trimmedQuery, { limit: 8 }).then((items) => {
        if (!active) return;
        setResults(items);
        setSearchCompleted(true);
      });
    }, 120);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open, query]);
  const select = (item: CarLocationSuggestion) => { setDraft(item); };
  const commit = () => { const next = draft?.value ?? (query.trim() || value.trim()); if (!next) return; onCommit(next); onClose(); };
  const trimmedQuery = query.trim();
  const text = (key: string, fallback: string) => t[key] ?? fallback;
  return <FlightMobilePickerShell open={open} title={mode === "pickup" ? text("carsSearch.pickupLocationLabel", "Pickup location") : text("carsResults.returnLocationLabel", "Return location")} titleId={`cars-${mode}-location-title`} launcherRef={launcherRef} onClose={onClose} showCancelAction={false} showBackLabel={false} contentClassName="bg-[#FCFDFE] px-4 py-4" footer={<button type="button" onClick={commit} disabled={!draft && !query.trim() && !value.trim()} className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075EE8] text-base font-bold text-white disabled:cursor-not-allowed">{text("done", "Done")}</button>}>
    <div className="mx-auto w-full max-w-xl">
      <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" /><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setDraft(null); setResults([]); setSearchCompleted(false); }} aria-label={text("carsSearch.pickupLocationPlaceholder", "Airport, city, or address")} placeholder={text("carsSearch.pickupLocationPlaceholder", "Airport, city, or address")} className="h-[50px] w-full rounded-[10px] border border-slate-300 bg-white ps-12 pe-4 text-[16px] text-slate-950 outline-none placeholder:text-slate-500 focus:border-[#075EE8] focus:ring-1 focus:ring-[#075EE8]/20" /></div>
      {trimmedQuery ? <section className="mt-7"><h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">{text("carsSearch.locationSuggestions", "Location suggestions")}</h2><div className="overflow-hidden rounded-xl border border-slate-200 bg-white">{results.map((item) => <LocationRow key={item.id} item={item} selected={draft?.id === item.id} onSelect={() => select(item)} />)}{searchCompleted && !results.length ? <p className="p-5 text-sm text-slate-600">{text("carsSearch.noMatchingLocations", "No matching locations found.")}</p> : null}</div></section> : null}
    </div>
  </FlightMobilePickerShell>;
}
