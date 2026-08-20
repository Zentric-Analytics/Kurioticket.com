"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { FlightSearchLeg } from "@/lib/types";
import { MULTI_CITY_MAX_LEGS, MULTI_CITY_MIN_LEGS } from "@/lib/flights/flightSearchJourney";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";

type Suggestion = { code: string; city: string; airport: string };

export function MultiCityFlightEditor({ legs, onChange, minimumDate }: { legs: FlightSearchLeg[]; onChange: (legs: FlightSearchLeg[]) => void; minimumDate: string }) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? key;
  const flightLabel = (index: number) => t("flightMultiCity.flight").replace("{{number}}", String(index + 1));
  const update = (index: number, patch: Partial<FlightSearchLeg>) => {
    const next = legs.map((leg, legIndex) => legIndex === index ? { ...leg, ...patch } : leg);
    if (patch.departureDate) {
      for (let cursor = index + 1; cursor < next.length; cursor += 1) {
        if (next[cursor].departureDate && next[cursor].departureDate < patch.departureDate) next[cursor] = { ...next[cursor], departureDate: "" };
      }
    }
    onChange(next);
  };
  const add = () => {
    if (legs.length >= MULTI_CITY_MAX_LEGS) return;
    const previous = legs.at(-1);
    onChange([...legs, { origin: previous?.destination ?? "", destination: "", departureDate: previous?.departureDate ?? "" }]);
  };
  const remove = (index: number) => {
    if (legs.length <= MULTI_CITY_MIN_LEGS) return;
    onChange(legs.filter((_, legIndex) => legIndex !== index));
  };

  return <section aria-labelledby="multi-city-flights-heading" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
    <div className="flex items-center justify-between gap-3">
      <h3 id="multi-city-flights-heading" className="text-sm font-bold text-slate-950">{t("flightMultiCity.title")}</h3>
      <span className="text-xs text-slate-500">{legs.length} of {MULTI_CITY_MAX_LEGS}</span>
    </div>
    <div className="mt-3 space-y-3">
      {legs.map((leg, index) => <fieldset key={index} className="rounded-xl border border-slate-200 bg-white p-3">
        <legend className="px-1 text-sm font-bold text-[#004BB8]">{flightLabel(index)}</legend>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px_auto] md:items-end">
          <MultiCityAirportInput label={`${flightLabel(index)} origin`} value={leg.origin} context="origin" onChange={(origin) => update(index, { origin })} />
          <MultiCityAirportInput label={`${flightLabel(index)} destination`} value={leg.destination} context="destination" onChange={(destination) => update(index, { destination })} />
          <label className="block text-xs font-semibold text-slate-700">{t("flightMultiCity.departureDate")}
            <input type="date" aria-label={`Flight ${index + 1} date`} min={index ? legs[index - 1].departureDate || minimumDate : minimumDate} value={leg.departureDate} onChange={(event) => update(index, { departureDate: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-[#004BB8] focus:outline-none focus:ring-2 focus:ring-[#004BB8]/20" />
          </label>
          <button type="button" onClick={() => remove(index)} disabled={legs.length <= MULTI_CITY_MIN_LEGS} aria-label={t("flightMultiCity.removeFlight").replace("{{number}}", String(index + 1))} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-3 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" aria-hidden="true" /><span className="ms-2 md:sr-only">{t("flightMultiCity.removeFlight").replace("{{number}}", "")}</span></button>
        </div>
        {leg.origin && leg.destination && leg.origin === leg.destination ? <p role="alert" className="mt-2 text-xs font-medium text-rose-700">{t("flightMultiCity.sameAirport")}</p> : null}
      </fieldset>)}
    </div>
    <button type="button" onClick={add} disabled={legs.length >= MULTI_CITY_MAX_LEGS} title={legs.length >= MULTI_CITY_MAX_LEGS ? t("flightMultiCity.maximum") : undefined} className="focus-ring mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#004BB8] bg-white px-4 text-sm font-bold text-[#004BB8] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-45"><Plus className="h-4 w-4" aria-hidden="true" />{t("flightMultiCity.addFlight")}</button>
  </section>;
}

function MultiCityAirportInput({ label, value, context, onChange }: { label: string; value: string; context: "origin" | "destination"; onChange: (value: string) => void }) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  useEffect(() => {
    const query = value.trim();
    if (query.length < 2 || /^[A-Z0-9]{3}$/.test(query)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/flights/places?${new URLSearchParams({ q: query, context })}`, { signal: controller.signal });
        const payload = response.ok ? await response.json() as { suggestions?: Suggestion[] } : {};
        setSuggestions((payload.suggestions ?? []).filter((item) => item.code).slice(0, 7));
      } catch { if (!controller.signal.aborted) setSuggestions([]); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [context, value]);
  return <label className="block text-xs font-semibold text-slate-700">{label}
    <input list={listId} value={value} placeholder="Airport code" autoComplete="off" onChange={(event) => onChange(event.target.value.trim().toUpperCase())} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm uppercase focus:border-[#004BB8] focus:outline-none focus:ring-2 focus:ring-[#004BB8]/20" />
    <datalist id={listId}>{suggestions.map((item) => <option key={item.code} value={item.code}>{item.city} — {item.airport}</option>)}</datalist>
  </label>;
}
