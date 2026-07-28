"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer } from "react";
import { BedDouble, Car, CircleAlert, Plane } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { buildCarResultsUrl, buildDealsModifyUrl, buildFlightApiPayload, buildFlightResultsUrl, buildHotelApiPayload, buildHotelResultsUrl, getIncludedProducts, type DealsSearch } from "@/lib/deals/dealsSearchParams";
import { countHotelNights, formatDealsOptionCount, getOverviewData, normalizeMetadata, selectDealsFlightPreviews, selectDealsHotelPreviews } from "@/lib/deals/dealsResultsPresentation";
import { DealsTripOverview } from "./deals/DealsTripOverview";
import { DealsProductSection } from "./deals/DealsProductSection";
import { DealsFlightPreviewCard } from "./deals/DealsFlightPreviewCard";
import { DealsHotelPreviewCard } from "./deals/DealsHotelPreviewCard";

type Status = "idle" | "loading" | "success" | "empty" | "error";
type ProductState<T> = { status: Status; results: T[]; errorKey?: string; warnings: string[]; servedFromFallback: boolean; latencyMs?: number; warningCategory?: string };
type State = { flight: ProductState<PublicFlightResult>; hotel: ProductState<PublicHotelResult> };
type Action = { product: "flight"; value: ProductState<PublicFlightResult> } | { product: "hotel"; value: ProductState<PublicHotelResult> };
const empty = <T,>(): ProductState<T> => ({ status: "idle", results: [], warnings: [], servedFromFallback: false });
const initialState: State = { flight: empty(), hotel: empty() };
function reducer(state: State, action: Action): State { return { ...state, [action.product]: action.value }; }
const modeKeys = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" } as const;

export function DealsResultsClient({ initialSearch: search, invalid }: { initialSearch: DealsSearch; invalid: boolean }) {
  const { t: dictionary, locale } = useLocale(); const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const [state, dispatch] = useReducer(reducer, initialState); const included = getIncludedProducts(search.mode); const overview = getOverviewData(search, locale);
  const request = useCallback((product: "flight" | "hotel", signal?: AbortSignal) => {
    dispatch({ product, value: { ...empty(), status: "loading" } } as Action);
    const isFlight = product === "flight";
    void fetch(isFlight ? "/api/flights/search" : "/api/hotels/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isFlight ? buildFlightApiPayload(search) : buildHotelApiPayload(search)), signal }).then(async response => {
      const payload: unknown = await response.json(); const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {}; const metadata = normalizeMetadata(record);
      if (!response.ok) throw new Error(response.status === 429 ? "rate" : metadata.warningCategory === "unsupported_destination" ? "unsupported" : "provider");
      const results = Array.isArray(record.results) ? record.results : [];
      dispatch({ product, value: { status: results.length ? "success" : "empty", results, ...metadata } } as Action);
    }).catch((error: unknown) => { if (error instanceof DOMException && error.name === "AbortError") return; const reason = error instanceof Error ? error.message : "provider"; dispatch({ product, value: { ...empty(), status: "error", errorKey: reason === "rate" ? "deals.results.rateLimited" : reason === "unsupported" ? "deals.results.unsupportedDestination" : "deals.results.providerUnavailable" } } as Action); });
  }, [search]);
  useEffect(() => { if (invalid) return; const flight = new AbortController(); const hotel = new AbortController(); if (included.flight) request("flight", flight.signal); if (included.hotel) request("hotel", hotel.signal); return () => { flight.abort(); hotel.abort(); }; }, [included.flight, included.hotel, invalid, request]);
  if (invalid) return <main className="page-shell flex-1 py-10"><div className="rounded-3xl border border-rose-200 bg-white p-8 text-center"><CircleAlert aria-hidden className="mx-auto h-10 w-10 text-rose-600" /><p className="mt-3 text-xs font-bold uppercase text-rose-700">{t("deals.results.tripOverview")}</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950">{t("deals.results.invalidTitle")}</h1><p className="mt-2 text-slate-600">{t("deals.results.invalidMessage")}</p><Link href={buildDealsModifyUrl(search)} className="mt-5 inline-flex rounded-xl bg-[#004BB8] px-5 py-3 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{t("deals.results.modify")}</Link></div></main>;
  const notice = (item: ProductState<unknown>) => item.servedFromFallback ? t("deals.results.fallbackNotice") : item.warnings.length || item.warningCategory === "partial_results" ? t("deals.results.partialResults") : undefined;
  const count = (length: number, visible: number) => formatDealsOptionCount(t(length <= visible ? "deals.results.returnedOptions" : "deals.results.previewCount"), visible, length);
  const flightPreviews = selectDealsFlightPreviews(state.flight.results); const hotelPreviews = selectDealsHotelPreviews(state.hotel.results);
  const viewAll = (key: string, total: number) => t(key).replace("{{count}}", String(total));
  return <main className="flex-1 bg-slate-50 py-6 sm:py-8"><div className="page-shell"><DealsTripOverview search={search} locale={locale} t={t} modeLabel={t(modeKeys[search.mode])} /><div className="mt-6 space-y-6">
    {included.flight && <DealsProductSection id="flight-options" title={t("deals.results.flightOptions")} summary={`${overview.flight.title} · ${overview.flight.dates}`} icon={<Plane aria-hidden className="text-[#004BB8]" />} href={buildFlightResultsUrl(search)} viewAll={state.flight.status === "success" ? viewAll("deals.results.viewFlightsCount", state.flight.results.length) : t("deals.results.viewFlights")} supportingText={t("deals.results.openCompleteResults")} priceNotice={t("deals.results.priceResponsibility")} status={state.flight.status} loadingLabel={t("searchingFlights")} emptyLabel={t("deals.results.flightEmpty")} errorLabel={t(state.flight.errorKey ?? "deals.results.providerUnavailable")} retryLabel={t("retry")} onRetry={() => request("flight")} notice={notice(state.flight)} countLabel={state.flight.status === "success" ? count(state.flight.results.length, flightPreviews.length) : undefined}><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{flightPreviews.map(({ result, badgeKey, reasonKey }) => <DealsFlightPreviewCard key={result.id} flight={result} badgeKey={badgeKey} reasonKey={reasonKey} locale={locale} t={t} />)}</div></DealsProductSection>}
    {included.hotel && <DealsProductSection id="stay-options" title={t("deals.results.stayOptions")} summary={`${overview.hotel.title} · ${overview.hotel.dates}`} icon={<BedDouble aria-hidden className="text-[#004BB8]" />} href={buildHotelResultsUrl(search)} viewAll={state.hotel.status === "success" ? viewAll("deals.results.viewHotelsCount", state.hotel.results.length) : t("deals.results.viewHotels")} supportingText={t("deals.results.openCompleteResults")} priceNotice={t("deals.results.priceResponsibility")} status={state.hotel.status} loadingLabel={t("searchingHotels")} emptyLabel={t("deals.results.hotelEmpty")} errorLabel={t(state.hotel.errorKey ?? "deals.results.providerUnavailable")} retryLabel={t("retry")} onRetry={() => request("hotel")} notice={notice(state.hotel)} countLabel={state.hotel.status === "success" ? count(state.hotel.results.length, hotelPreviews.length) : undefined}><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{hotelPreviews.map(({ result, badgeKey, reasonKey }) => <DealsHotelPreviewCard key={result.id} hotel={result} badgeKey={badgeKey} reasonKey={reasonKey} locale={locale} nights={countHotelNights(search.hotelCheckIn, search.hotelCheckOut)} rooms={search.hotelRooms} t={t} />)}</div></DealsProductSection>}
    {included.car && <section aria-labelledby="car-continuation" className="rounded-3xl border border-[#D8E1EC] bg-white p-6"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><h2 id="car-continuation" className="flex items-center gap-2 text-xl font-extrabold"><Car aria-hidden className="text-[#004BB8]" />{t("deals.results.carContinuationTitle")}</h2><p className="mt-2 text-sm text-slate-600">{t("deals.results.carContinuationDescription")}</p><p dir="ltr" className="mt-3 font-bold">{overview.car.title}</p><p className="text-sm text-slate-600">{overview.car.dates} · {overview.car.pickupTime} – {overview.car.returnTime} · {t("carsSearch.driverAgeLabel")} {overview.car.driverAge}</p></div><Link href={buildCarResultsUrl(search)} className="rounded-xl bg-[#004BB8] px-5 py-3 text-center font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{t("deals.results.viewCars")}</Link></div></section>}
  </div></div></main>;
}
