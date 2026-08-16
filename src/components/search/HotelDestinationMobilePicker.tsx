"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Building2, MapPin, X } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { HotelMobilePickerShell } from "@/components/search/HotelMobilePickerShell";
import {
  getLocalizedHotelDestinationCityName,
  getLocalizedHotelDestinationDetail,
  type HotelDestinationSuggestion,
} from "@/data/hotelDestinations";
import { deriveRecentHotelDestinations, readRecentSearches } from "@/lib/recent-searches";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

export type { HotelDestinationSuggestion };

type HotelDestinationsApiResponse = { suggestions?: HotelDestinationSuggestion[] };

type Props = {
  open: boolean;
  value: string;
  titleId: string;
  inputId: string;
  launcherRef?: RefObject<HTMLElement | null>;
  selectedCountryHint?: string;
  detectedCountryHint?: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onClear?: () => void;
};

function MobileHotelDestinationRow({ option, selected, locale, onSelect }: {
  option: HotelDestinationSuggestion; selected: boolean; locale: string; onSelect: () => void;
}) {
  const name = getLocalizedHotelDestinationCityName(option.name, locale);
  const detail = getLocalizedHotelDestinationDetail(option, locale) || option.country;
  return (
    <button type="button" aria-pressed={selected} aria-label={`${name}, ${detail}`} onClick={onSelect}
      className={cn("focus-ring flex min-h-[88px] w-full items-center gap-3 px-4 text-start transition-colors hover:bg-slate-50", selected && "bg-blue-50/70")}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Building2 aria-hidden="true" className="h-[22px] w-[22px]" />
      </span>
      <span className="min-w-0"><span className="block truncate text-[16px] font-bold text-slate-950">{name}</span>
        <span className="mt-1 block truncate text-[13px] font-medium text-slate-600">{detail}</span></span>
    </button>
  );
}

export function HotelDestinationMobilePicker({ open, value, titleId, inputId, launcherRef, selectedCountryHint = "", detectedCountryHint = "", onChange, onClose }: Props) {
  const { locale, t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(value);
  const [draftValue, setDraftValue] = useState(value);
  const [suggestions, setSuggestions] = useState<HotelDestinationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const recents = useMemo(() => open ? deriveRecentHotelDestinations(readRecentSearches(), 3) : [], [open]);
  const trimmed = query.trim();

  useEffect(() => {
    if (!open) return;
    setQuery(value); setDraftValue(value); setSuggestions([]);
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, value]);

  useEffect(() => {
    if (!open || !trimmed) { setSuggestions([]); setLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed, limit: "8" });
        const hint = selectedCountryHint || detectedCountryHint;
        if (hint) params.set("countryCode", hint);
        const response = await fetch(`/api/hotels/destinations?${params}`, { signal: controller.signal, cache: "no-store" });
        const payload = response.ok ? await response.json() as HotelDestinationsApiResponse : {};
        setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions.slice(0, 8) : []);
      } catch { if (!controller.signal.aborted) setSuggestions([]); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, trimmed, selectedCountryHint, detectedCountryHint]);

  const choose = (option: HotelDestinationSuggestion) => { setDraftValue(option.searchValue); setQuery(option.searchValue); };
  const clearDraft = () => { setQuery(""); setDraftValue(""); setSuggestions([]); requestAnimationFrame(() => inputRef.current?.focus()); };
  const rows = trimmed ? suggestions : recents;

  return <HotelMobilePickerShell open={open} title={t("chooseDestination")} titleId={titleId} launcherRef={launcherRef}
    onClose={onClose} showCancelAction={false} contentClassName="bg-[#fcfdfe] px-4 py-6"
    footer={(requestClose) => <button type="button" disabled={!draftValue.trim()} onClick={() => { onChange(draftValue.trim()); requestClose(); }}
      className="focus-ring h-[52px] w-full rounded-[9px] bg-[#075ee8] text-[16px] font-bold text-white disabled:cursor-not-allowed">{t("done")}</button>}>
    <div className="mx-auto w-full max-w-xl">
      <label htmlFor={inputId} className="mb-4 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{t("hotelSearchDestinationLabel")}</label>
      <div className="relative"><MapPin aria-hidden="true" className="absolute start-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-600" />
        <input ref={inputRef} id={inputId} value={query} onChange={(e) => { setQuery(e.target.value); setDraftValue(""); }} aria-label={t("hotelSearchDestinationPlaceholder")}
          placeholder={t("hotelSearchDestinationPlaceholder")} className="h-[52px] w-full rounded-[10px] border border-slate-300 bg-white ps-12 pe-12 text-[15px] font-medium text-slate-950 outline-none placeholder:text-slate-500 focus:border-[#075ee8] focus:ring-1 focus:ring-[#075ee8]/20" />
        <button type="button" onClick={clearDraft} aria-label={t("clearDestination")} className="focus-ring absolute end-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-slate-500"><X aria-hidden="true" className="h-[18px] w-[18px]" /></button>
      </div>
      {!trimmed && recents.length ? <h3 className="mb-4 mt-8 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{t("recentSearches")}</h3> : null}
      {loading ? <p className="py-8 text-center text-sm text-slate-500">{t("findingDestinations")}</p> : rows.length ?
        <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-200", trimmed && "mt-5")}>{rows.map(option => <MobileHotelDestinationRow key={option.id} option={option} locale={locale} selected={draftValue === option.searchValue} onSelect={() => choose(option)} />)}</div>
        : trimmed ? <p className="py-8 text-center text-sm text-slate-500">{t("noMatchingDestinationsYet")}</p> : null}
    </div>
  </HotelMobilePickerShell>;
}
