"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { BedDouble, Car, CircleAlert, Plane } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { translations as en } from "@/lib/i18n/en";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { buildCarResultsUrl, buildDealsResultsUrl, buildFlightApiPayload, buildFlightResultsUrl, buildHotelApiPayload, buildHotelResultsUrl, getIncludedProducts, type DealsSearch } from "@/lib/deals/dealsSearchParams";
import { countHotelNights, getOverviewData, normalizeMetadata, selectDealsFlightPreviews, selectDealsHotelPreviews } from "@/lib/deals/dealsResultsPresentation";
import { DealsResultsSearchSummary } from "./deals/DealsResultsSearchSummary";
import { DealsResultsBreadcrumbs } from "./deals/DealsResultsBreadcrumbs";
import { DealsResultsIntro } from "./deals/DealsResultsIntro";
import { DealsModifySearchDialog } from "./deals/DealsModifySearchDialog";
import { DealsProductSection } from "./deals/DealsProductSection";
import { DealsFlightPreviewCard } from "./deals/DealsFlightPreviewCard";
import { DealsHotelPreviewCard } from "./deals/DealsHotelPreviewCard";
import { DealsTripPlanBar } from "./deals/DealsTripPlanBar";
import { buildDealsSearchFingerprint, createDealsTripPlan, updateDealsTripPlan, validateDealsInternalPath, type DealsTripPlan } from "@/lib/deals/dealsTripPlan";
import { readDealsTripPlan, removeDealsTripPlan, writeDealsTripPlan } from "@/lib/deals/dealsTripPlanStorage";
import { getDealsProviderHandoff } from "@/lib/deals/dealsProviderHandoff";
import { reconcileDealsFlightSelection, reconcileDealsHotelSelection } from "@/lib/deals/dealsTripPlanReconciliation";

type Status = "idle" | "loading" | "success" | "empty" | "error";
type ProductState<T> = { status: Status; results: T[]; receivedAt?: number; errorKey?: string; warnings: string[]; servedFromFallback: boolean; latencyMs?: number; warningCategory?: string };
type State = { flight: ProductState<PublicFlightResult>; hotel: ProductState<PublicHotelResult> };
type Action = { product: "flight"; value: ProductState<PublicFlightResult> } | { product: "hotel"; value: ProductState<PublicHotelResult> };
const empty = <T,>(): ProductState<T> => ({ status: "idle", results: [], warnings: [], servedFromFallback: false });
const initialState: State = { flight: empty(), hotel: empty() };
function reducer(state: State, action: Action): State { return { ...state, [action.product]: action.value }; }
const modeKeys = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" } as const;

export function DealsResultsClient({ initialSearch: search, invalid }: { initialSearch: DealsSearch; invalid: boolean }) {
  const router = useRouter();
  const { start: startRouteProgress } = useRouteProgress();
  const { t: dictionary, locale } = useLocale(); const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const [state, dispatch] = useReducer(reducer, initialState); const included = getIncludedProducts(search.mode); const overview = getOverviewData(search, locale);
  const fingerprint = buildDealsSearchFingerprint(search); const [plan, setPlan] = useState<DealsTripPlan | null>(null); const [announcement, setAnnouncement] = useState("");
  const [editorOpen, setEditorOpen] = useState(invalid); const [draftChanged, setDraftChanged] = useState(false); const modifyButtonRef = useRef<HTMLButtonElement>(null);
  const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<"idle" | "saving" | "saved" | "unavailable">("idle");
  useEffect(() => { const timer = window.setTimeout(() => { const result = readDealsTripPlan(fingerprint); if (result.status === "valid") { setPlan(result.plan); setPersistence("saved"); } else if (result.status === "storage_unavailable") setPersistence("unavailable"); }, 0); return () => window.clearTimeout(timer); }, [fingerprint]);
  const basePlan = useCallback(() => createDealsTripPlan({ mode: search.mode, searchFingerprint: fingerprint, resultsPath: validateDealsInternalPath(buildDealsResultsUrl(search))!, carsResultsPath: included.car ? validateDealsInternalPath(buildCarResultsUrl(search), "/cars/results") ?? undefined : undefined }), [fingerprint, included.car, search]);
  const persist = useCallback((next: DealsTripPlan) => { setPersistence("saving"); const saved = writeDealsTripPlan(next); setPersistence(saved ? "saved" : "unavailable"); return saved; }, []);
  const selectFlight = (flight: PublicFlightResult) => { const receivedAt = state.flight.receivedAt; if (!receivedAt || !Number.isFinite(flight.price) || flight.price <= 0 || !flight.currency?.trim() || !getDealsProviderHandoff(flight, "flight").available) { setAnnouncement(t("deals.tripPlan.resultTimestampUnavailable")); return; } const next = updateDealsTripPlan(plan ?? basePlan(), { flight: { id: flight.id.trim(), provider: flight.provider?.trim() || t("deals.results.providerHandoff.providerGeneric"), airline: flight.airlineName, flightNumber: flight.flightNumber, origin: flight.originAirport, destination: flight.destinationAirport, departure: flight.departureTime, arrival: flight.arrivalTime, duration: flight.duration, sourcePrice: flight.price, sourceCurrency: flight.currency, resultReceivedAt: receivedAt } }); setAnnouncement(t(plan?.flight ? "deals.tripPlan.flightReplaced" : "deals.tripPlan.flightAdded")); setPlan(next); persist(next); };
  const selectHotel = (hotel: PublicHotelResult) => { const receivedAt = state.hotel.receivedAt; if (!receivedAt || !Number.isFinite(hotel.totalPrice) || !hotel.totalPrice || hotel.totalPrice <= 0 || !hotel.currency?.trim() || !getDealsProviderHandoff(hotel, "hotel").available) { setAnnouncement(t("deals.tripPlan.resultTimestampUnavailable")); return; } const next = updateDealsTripPlan(plan ?? basePlan(), { hotel: { id: hotel.id.trim(), provider: hotel.provider?.trim() || t("deals.results.providerHandoff.providerGeneric"), name: hotel.name, location: hotel.neighbourhood || hotel.location, checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, roomType: hotel.roomType, sourcePrice: hotel.totalPrice, sourceCurrency: hotel.currency, resultReceivedAt: receivedAt } }); setAnnouncement(t(plan?.hotel ? "deals.tripPlan.stayReplaced" : "deals.tripPlan.stayAdded")); setPlan(next); persist(next); };
  const clearPlan = () => { setPlan(null); removeDealsTripPlan(); setPersistence("idle"); setAnnouncement(t("deals.tripPlan.cleared")); };
  const closeEditor = useCallback(() => { if (pendingFingerprint) return; setEditorOpen(false); setDraftChanged(false); requestAnimationFrame(() => modifyButtonRef.current?.focus()); }, [pendingFingerprint]);
  const updateDraft = useCallback((draft: DealsSearch) => setDraftChanged(buildDealsSearchFingerprint(draft) !== fingerprint), [fingerprint]);
  const submitSearch = useCallback((draft: DealsSearch) => {
    if (buildDealsSearchFingerprint(draft) === fingerprint) { setAnnouncement(t("deals.results.editor.unchanged")); closeEditor(); return; }
    const nextFingerprint = buildDealsSearchFingerprint(draft);
    startRouteProgress(); setPendingFingerprint(nextFingerprint); setAnnouncement(t("deals.results.editor.updatingAnnouncement"));
    router.push(buildDealsResultsUrl(draft), { scroll: false });
  }, [closeEditor, fingerprint, router, startRouteProgress, t]);
  const warningKey = plan?.flight && plan?.hotel ? "deals.results.editor.clearBoth" : plan?.flight ? "deals.results.editor.clearFlight" : plan?.hotel ? "deals.results.editor.clearStay" : null;
  const editor = editorOpen ? <DealsModifySearchDialog key={fingerprint} search={search} locale={locale} t={t} onSubmit={submitSearch} onClose={closeEditor} onDraftChange={updateDraft} pending={Boolean(pendingFingerprint)} warning={draftChanged && warningKey ? <p role="status" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950">{t(warningKey)}</p> : undefined} /> : null;
  const changeSelection = (product: "flight" | "hotel") => { const heading = document.getElementById(product === "flight" ? "flight-options" : "stay-options"); heading?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); heading?.focus({ preventScroll: true }); };
  const request = useCallback((product: "flight" | "hotel", signal?: AbortSignal) => {
    dispatch({ product, value: { ...empty(), status: "loading" } } as Action);
    const isFlight = product === "flight";
    void fetch(isFlight ? "/api/flights/search" : "/api/hotels/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isFlight ? buildFlightApiPayload(search) : buildHotelApiPayload(search)), signal }).then(async response => {
      const payload: unknown = await response.json(); const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {}; const metadata = normalizeMetadata(record);
      if (!response.ok) throw new Error(response.status === 429 ? "rate" : metadata.warningCategory === "unsupported_destination" ? "unsupported" : "provider");
      const results = Array.isArray(record.results) ? record.results : [];
      dispatch({ product, value: { status: results.length ? "success" : "empty", results, receivedAt: Date.now(), ...metadata } } as Action);
    }).catch((error: unknown) => { if (error instanceof DOMException && error.name === "AbortError") return; const reason = error instanceof Error ? error.message : "provider"; dispatch({ product, value: { ...empty(), status: "error", errorKey: reason === "rate" ? "deals.results.rateLimited" : reason === "unsupported" ? "deals.results.unsupportedDestination" : "deals.results.providerUnavailable" } } as Action); });
  }, [search]);
  useEffect(() => { if (invalid) return; const flight = new AbortController(); const hotel = new AbortController(); if (included.flight) request("flight", flight.signal); if (included.hotel) request("hotel", hotel.signal); return () => { flight.abort(); hotel.abort(); }; }, [included.flight, included.hotel, invalid, request]);
  useEffect(() => {
    if (!pendingFingerprint) return;
    if (fingerprint === pendingFingerprint) {
      const applied = window.setTimeout(() => {
        setPlan(null); removeDealsTripPlan(); setPersistence("idle"); setPendingFingerprint(null); setEditorOpen(false); setDraftChanged(false); setAnnouncement(t("deals.results.editor.selectionsCleared"));
        requestAnimationFrame(() => { const heading = document.getElementById("deals-trip-overview-heading"); heading?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); heading?.focus({ preventScroll: true }); });
      }, 0);
      return () => window.clearTimeout(applied);
    }
    const timeout = window.setTimeout(() => { setPendingFingerprint(null); setAnnouncement(t("deals.results.editor.updateFailed")); }, 10000);
    return () => window.clearTimeout(timeout);
  }, [fingerprint, pendingFingerprint, t]);
  useEffect(() => { if (!plan || (state.flight.status !== "success" && state.flight.status !== "empty")) return; const next = reconcileDealsFlightSelection(plan, state.flight.results); if (next === plan) return; const timer = window.setTimeout(() => { setPlan(next); persist(next); setAnnouncement(t("deals.tripPlan.flightRemoved")); }, 0); return () => window.clearTimeout(timer); }, [plan, state.flight.results, state.flight.status, persist, t]);
  useEffect(() => { if (!plan || (state.hotel.status !== "success" && state.hotel.status !== "empty")) return; const next = reconcileDealsHotelSelection(plan, state.hotel.results); if (next === plan) return; const timer = window.setTimeout(() => { setPlan(next); persist(next); setAnnouncement(t("deals.tripPlan.stayRemoved")); }, 0); return () => window.clearTimeout(timer); }, [plan, state.hotel.results, state.hotel.status, persist, t]);
  if (invalid) return <main className="flex-1 bg-[#f6f8fb] pb-10"><DealsResultsBreadcrumbs t={t} /><div className="page-shell pt-8 sm:pt-6"><div className="rounded-3xl border border-rose-200 bg-white p-8 text-center"><CircleAlert aria-hidden className="mx-auto h-10 w-10 text-rose-600" /><p className="mt-3 text-xs font-bold uppercase text-rose-700">{t("deals.results.breadcrumb.current")}</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950">{t("deals.results.invalidTitle")}</h1><p className="mt-2 text-slate-600">{t("deals.results.editor.correctHere")}</p><button ref={modifyButtonRef} type="button" aria-expanded={editorOpen} aria-controls="deals-modify-search-dialog" onClick={() => setEditorOpen(true)} className="mt-5 min-h-11 rounded-xl bg-[#004BB8] px-6 font-extrabold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{t("deals.results.editor.correctSearch")}</button><p className="mt-4"><Link href="/deals" className="rounded-sm text-sm font-bold text-[#004BB8] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30">{t("deals.results.returnToDeals")}</Link></p></div></div>{editor}<p className="sr-only" aria-live="polite">{announcement}</p></main>;
  const notice = (item: ProductState<unknown>) => item.servedFromFallback ? t("deals.results.fallbackNotice") : item.warnings.length || item.warningCategory === "partial_results" ? t("deals.results.partialResults") : undefined;
  const flightPreviews = selectDealsFlightPreviews(state.flight.results); const hotelPreviews = selectDealsHotelPreviews(state.hotel.results);
  const viewAll = (key: string, total: number) => t(key).replace("{{count}}", String(total));
  return <main className={`flex-1 overflow-x-clip bg-[#f6f8fb] pb-8 ${plan?.flight || plan?.hotel ? "pb-64 sm:pb-44" : ""}`}><DealsResultsSearchSummary search={search} locale={locale} t={t} modeLabel={t(modeKeys[search.mode])} onModify={() => setEditorOpen(true)} modifyExpanded={editorOpen} modifyButtonRef={modifyButtonRef} /><DealsResultsBreadcrumbs t={t} /><div className="page-shell pt-5 sm:pt-6"><DealsResultsIntro t={t} />{editorOpen && editor}<div className="mt-6 space-y-6">
    {included.flight && <DealsProductSection id="flight-options" title={t("deals.results.flightOptions")} summary={`${overview.flight.title} · ${overview.flight.dates}`} icon={<Plane aria-hidden className="text-[#004BB8]" />} href={buildFlightResultsUrl(search)} viewAll={state.flight.status === "success" ? viewAll("deals.results.viewFlightsCount", state.flight.results.length) : t("deals.results.viewFlights")} priceNotice={t("deals.results.priceResponsibility")} status={state.flight.status} loadingLabel={t("searchingFlights")} emptyLabel={t("deals.results.flightEmpty")} errorLabel={t(state.flight.errorKey ?? "deals.results.providerUnavailable")} retryLabel={t("retry")} onRetry={() => request("flight")} notice={notice(state.flight)}><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{flightPreviews.map(({ result, badgeKey, reasonKey }) => <DealsFlightPreviewCard key={result.id} flight={result} badgeKey={badgeKey} reasonKey={reasonKey} locale={locale} t={t} selected={plan?.flight?.id === result.id} onSelect={() => selectFlight(result)} />)}</div></DealsProductSection>}
    {included.hotel && <DealsProductSection id="stay-options" title={t("deals.results.stayOptions")} summary={`${overview.hotel.title} · ${overview.hotel.dates}`} icon={<BedDouble aria-hidden className="text-[#004BB8]" />} href={buildHotelResultsUrl(search)} viewAll={state.hotel.status === "success" ? viewAll("deals.results.viewHotelsCount", state.hotel.results.length) : t("deals.results.viewHotels")} priceNotice={t("deals.results.priceResponsibility")} status={state.hotel.status} loadingLabel={t("searchingHotels")} emptyLabel={t("deals.results.hotelEmpty")} errorLabel={t(state.hotel.errorKey ?? "deals.results.providerUnavailable")} retryLabel={t("retry")} onRetry={() => request("hotel")} notice={notice(state.hotel)}><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{hotelPreviews.map(({ result, badgeKey, reasonKey }) => <DealsHotelPreviewCard key={result.id} hotel={result} badgeKey={badgeKey} reasonKey={reasonKey} locale={locale} nights={countHotelNights(search.hotelCheckIn, search.hotelCheckOut)} rooms={search.hotelRooms} t={t} selected={plan?.hotel?.id === result.id} onSelect={() => selectHotel(result)} />)}</div></DealsProductSection>}
    {included.car && <section aria-labelledby="car-continuation" className="rounded-3xl border border-[#D8E1EC] bg-white p-6"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><h2 id="car-continuation" className="flex items-center gap-2 text-xl font-extrabold"><Car aria-hidden className="text-[#004BB8]" />{t("deals.results.carContinuationTitle")}</h2><p className="mt-2 text-sm text-slate-600">{t("deals.results.carContinuationDescription")}</p><p dir="ltr" className="mt-3 font-bold">{overview.car.title}</p><p className="text-sm text-slate-600">{overview.car.dates} · {overview.car.pickupTime} – {overview.car.returnTime} · {t("carsSearch.driverAgeLabel")} {overview.car.driverAge}</p></div><Link href={buildCarResultsUrl(search)} className="rounded-xl bg-[#004BB8] px-5 py-3 text-center font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{t("deals.results.viewCars")}</Link></div></section>}
  </div></div><p className="sr-only" aria-live="polite">{announcement}</p>{plan && (plan.flight || plan.hotel) && <DealsTripPlanBar plan={plan} persistence={persistence} t={t} onChange={changeSelection} onClear={clearPlan} onRetry={() => persist(plan)} />}</main>;
}
