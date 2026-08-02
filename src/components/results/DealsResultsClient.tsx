"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, type MouseEvent } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { translations as en } from "@/lib/i18n/en";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import type { NormalizedCarResult } from "@/lib/cars/types";
import { buildCarApiPayload, buildCarResultsUrl, buildDealsResultsUrl, buildFlightApiPayload, buildFlightResultsUrl, buildHotelApiPayload, buildHotelResultsUrl, getIncludedProducts, type DealsSearch } from "@/lib/deals/dealsSearchParams";
import type { ContractResult } from "@/lib/travel/searchContract";
import { normalizeMetadata } from "@/lib/deals/dealsResultsPresentation";
import { DealsResultsSearchSummary } from "./deals/DealsResultsSearchSummary";
import { DealsResultsBreadcrumbs } from "./deals/DealsResultsBreadcrumbs";
import { DealsModifySearchDialog } from "./deals/DealsModifySearchDialog";
import { DealsTripPlanBar } from "./deals/DealsTripPlanBar";
import { buildDealsSearchFingerprint, createDealsTripPlan, updateDealsTripPlan, validateDealsInternalPath, type DealsTripPlan } from "@/lib/deals/dealsTripPlan";
import { readDealsTripPlan, removeDealsTripPlan, writeDealsTripPlan } from "@/lib/deals/dealsTripPlanStorage";
import { reconcileDealsCarSelection, reconcileDealsFlightSelection, reconcileDealsHotelSelection } from "@/lib/deals/dealsTripPlanReconciliation";
import { buildDealsPackageCandidates, isDealsCarEligible, isDealsFlightEligible, isDealsHotelEligible, type DealsPackageCandidate } from "@/lib/deals/dealsPackageCandidates";
import { DealsPackageCard } from "./deals/DealsPackageCard";
import { DealsPreviewSkeleton } from "./deals/DealsPreviewSkeleton";
import { DealsPackageResultsToolbar, type DealsPackageSort } from "./deals/DealsPackageResultsToolbar";
import { useRegion } from "@/components/region/RegionProvider";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { buildCarDetailsHref, getPrimaryCarOffer } from "@/lib/cars/carResults";

type Status = "idle" | "loading" | "success" | "empty" | "error";
type ProductState<T> = { status: Status; results: ContractResult<T>[]; receivedAt?: number; errorKey?: string; warnings: string[]; servedFromFallback: boolean; latencyMs?: number; warningCategory?: string; source?: string };
type State = { flight: ProductState<PublicFlightResult>; hotel: ProductState<PublicHotelResult>; car: ProductState<NormalizedCarResult> };
type Action = { product: "flight"; value: ProductState<PublicFlightResult> } | { product: "hotel"; value: ProductState<PublicHotelResult> } | { product: "car"; value: ProductState<NormalizedCarResult> };
const empty = <T,>(): ProductState<T> => ({ status: "idle", results: [], warnings: [], servedFromFallback: false });
const initialState: State = { flight: empty(), hotel: empty(), car: empty() };
function reducer(state: State, action: Action): State { return { ...state, [action.product]: action.value }; }
const modeKeys = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" } as const;
const PACKAGE_SORT_SKELETON_MS = 400;

export function DealsResultsClient({ initialSearch: search, invalid }: { initialSearch: DealsSearch; invalid: boolean }) {
  const router = useRouter();
  const { start: startRouteProgress } = useRouteProgress();
  const { t: dictionary, locale } = useLocale(); const { selectedCurrency } = useRegion(); const rates = useCurrencyRates(); const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const [state, dispatch] = useReducer(reducer, initialState); const included = getIncludedProducts(search.mode);
  const fingerprint = buildDealsSearchFingerprint(search); const [plan, setPlan] = useState<DealsTripPlan | null>(null); const [announcement, setAnnouncement] = useState("");
  const [editorOpen, setEditorOpen] = useState(invalid); const [draftChanged, setDraftChanged] = useState(false); const activeModifyTriggerRef = useRef<HTMLButtonElement>(null);
  const [packageSort,setPackageSort]=useState<DealsPackageSort>("recommended");
  const [packageSortPending, setPackageSortPending] = useState(false);
  const packageSortTimerRef = useRef<number | null>(null);
  const packageSortTransitionRef = useRef(0);
  const [pendingFingerprint, setPendingFingerprint] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<"idle" | "saving" | "saved" | "unavailable">("idle");
  useEffect(() => { const timer = window.setTimeout(() => { const result = readDealsTripPlan(fingerprint); if (result.status === "valid") { setPlan(result.plan); setPersistence("saved"); } else if (result.status === "storage_unavailable") setPersistence("unavailable"); }, 0); return () => window.clearTimeout(timer); }, [fingerprint]);
  const basePlan = useCallback(() => createDealsTripPlan({ mode: search.mode, searchFingerprint: fingerprint, resultsPath: validateDealsInternalPath(buildDealsResultsUrl(search))!, carsResultsPath: included.car ? validateDealsInternalPath(buildCarResultsUrl(search), "/cars/results") ?? undefined : undefined }), [fingerprint, included.car, search]);
  const persist = useCallback((next: DealsTripPlan) => { setPersistence("saving"); const saved = writeDealsTripPlan(next); setPersistence(saved ? "saved" : "unavailable"); return saved; }, []);
  const selectPackage = (candidate: DealsPackageCandidate) => {
    const received = { flight: state.flight.receivedAt, hotel: state.hotel.receivedAt, car: state.car.receivedAt };
    if ((candidate.flight && !received.flight) || (candidate.hotel && !received.hotel) || (candidate.car && !received.car)) { setAnnouncement(t("deals.tripPlan.resultTimestampUnavailable")); return; }
    const carOffer = candidate.car ? getPrimaryCarOffer(candidate.car) : undefined;
    const next = updateDealsTripPlan(basePlan(), {
      flight: candidate.flight ? { id: candidate.flight.id.trim(), provider: candidate.flight.provider?.trim() || t("deals.results.providerHandoff.providerGeneric"), airline: candidate.flight.airlineName, flightNumber: candidate.flight.flightNumber, origin: candidate.flight.originAirport, destination: candidate.flight.destinationAirport, departure: candidate.flight.departureTime, arrival: candidate.flight.arrivalTime, duration: candidate.flight.duration, sourcePrice: candidate.flight.price, sourceCurrency: candidate.flight.currency, resultReceivedAt: received.flight!, detailsPath: candidate.flight.searchPolicy.action.kind === "internal-detail" ? candidate.flight.searchPolicy.action.href : undefined } : undefined,
      hotel: candidate.hotel ? { id: candidate.hotel.id.trim(), provider: candidate.hotel.provider?.trim() || t("deals.results.providerHandoff.providerGeneric"), name: candidate.hotel.name, location: candidate.hotel.neighbourhood || candidate.hotel.location, checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, roomType: candidate.hotel.roomType, sourcePrice: candidate.hotel.totalPrice!, sourceCurrency: candidate.hotel.currency!, resultReceivedAt: received.hotel!, detailsPath: candidate.hotel.searchPolicy.action.kind === "internal-detail" ? candidate.hotel.searchPolicy.action.href : undefined } : undefined,
      car: candidate.car && carOffer ? { id: candidate.car.id.trim(), provider: carOffer.bookingProviderName || candidate.car.rentalCompanyName, rentalCompany: candidate.car.rentalCompanyName, modelName: candidate.car.modelName, categoryLabel: candidate.car.categoryLabel, pickupLocation: candidate.car.pickupLocation, returnLocation: candidate.car.returnLocation, pickupDate: search.carPickupDate, pickupTime: search.carPickupTime, dropoffDate: search.carReturnDate, dropoffTime: search.carReturnTime, sourcePrice: carOffer.totalPrice, sourceCurrency: carOffer.currency, resultReceivedAt: received.car!, detailsPath: buildCarDetailsHref(candidate.car.id, buildCarApiPayload(search)) } : undefined,
    });
    setPlan(next); persist(next); setAnnouncement(t("deals.results.package.selectedAnnouncement"));
  };
  const clearPlan = () => { setPlan(null); removeDealsTripPlan(); setPersistence("idle"); setAnnouncement(t("deals.tripPlan.cleared")); };
  const closeEditor = useCallback(() => { if (pendingFingerprint) return; setEditorOpen(false); setDraftChanged(false); requestAnimationFrame(() => activeModifyTriggerRef.current?.focus()); }, [pendingFingerprint]);
  const openEditor=(event:MouseEvent<HTMLButtonElement>)=>{activeModifyTriggerRef.current=event.currentTarget;setEditorOpen(true);};
  const updateDraft = useCallback((draft: DealsSearch) => setDraftChanged(buildDealsSearchFingerprint(draft) !== fingerprint), [fingerprint]);
  const submitSearch = useCallback((draft: DealsSearch) => {
    if (buildDealsSearchFingerprint(draft) === fingerprint) { setAnnouncement(t("deals.results.editor.unchanged")); closeEditor(); return; }
    const nextFingerprint = buildDealsSearchFingerprint(draft);
    startRouteProgress(); setPendingFingerprint(nextFingerprint); setAnnouncement(t("deals.results.editor.updatingAnnouncement"));
    router.push(buildDealsResultsUrl(draft), { scroll: false });
  }, [closeEditor, fingerprint, router, startRouteProgress, t]);
  const warningKey = [plan?.flight, plan?.hotel, plan?.car].filter(Boolean).length > 1 ? "deals.results.editor.clearMultiple" : plan?.flight ? "deals.results.editor.clearFlight" : plan?.hotel ? "deals.results.editor.clearStay" : plan?.car ? "deals.results.editor.clearCar" : null;
  const editor = editorOpen ? <DealsModifySearchDialog key={fingerprint} search={search} locale={locale} t={t} onSubmit={submitSearch} onClose={closeEditor} onDraftChange={updateDraft} pending={Boolean(pendingFingerprint)} warning={draftChanged && warningKey ? <p role="status" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-950">{t(warningKey)}</p> : undefined} /> : null;
  const changeSelection = () => { const heading = document.getElementById("package-options"); heading?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); heading?.focus({ preventScroll: true }); };
  const request = useCallback((product: "flight" | "hotel" | "car", signal?: AbortSignal) => {
    dispatch({ product, value: { ...empty(), status: "loading" } } as Action);
    const isFlight = product === "flight"; const isCar = product === "car";
    void fetch(isFlight ? "/api/flights/search" : isCar ? "/api/cars/search" : "/api/hotels/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isFlight ? buildFlightApiPayload(search) : isCar ? buildCarApiPayload(search) : buildHotelApiPayload(search)), signal }).then(async response => {
      const payload: unknown = await response.json(); const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {}; const metadata = normalizeMetadata(record);
      if (!response.ok) throw new Error(response.status === 429 ? "rate" : metadata.warningCategory === "unsupported_destination" ? "unsupported" : "provider");
      const results = Array.isArray(record.results) ? record.results : [];
      if (isCar && record.status !== "available") throw new Error("car-unavailable");
      dispatch({ product, value: { status: results.length ? "success" : "empty", results, ...(results.length ? { receivedAt: Date.now() } : {}), ...metadata, ...(typeof record.source === "string" ? { source: record.source } : {}) } } as Action);
    }).catch((error: unknown) => { if (error instanceof DOMException && error.name === "AbortError") return; const reason = error instanceof Error ? error.message : "provider"; dispatch({ product, value: { ...empty(), status: "error", errorKey: reason === "rate" ? "deals.results.rateLimited" : reason === "unsupported" ? "deals.results.unsupportedDestination" : product === "car" ? "deals.results.carUnavailable" : "deals.results.providerUnavailable" } } as Action); });
  }, [search]);
  useEffect(() => { if (invalid) return; const flight = new AbortController(); const hotel = new AbortController(); const car = new AbortController(); if (included.flight) request("flight", flight.signal); if (included.hotel) request("hotel", hotel.signal); if (included.car) request("car", car.signal); return () => { flight.abort(); hotel.abort(); car.abort(); }; }, [included.flight, included.hotel, included.car, invalid, request]);
  useEffect(() => {
    if (!pendingFingerprint) return;
    if (fingerprint === pendingFingerprint) {
      const applied = window.setTimeout(() => {
        setPlan(null); removeDealsTripPlan(); setPersistence("idle"); setPendingFingerprint(null); setEditorOpen(false); setDraftChanged(false); setAnnouncement(t("deals.results.editor.selectionsCleared"));
        requestAnimationFrame(() => { const heading = document.getElementById("package-options"); heading?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); heading?.focus({ preventScroll: true }); });
      }, 0);
      return () => window.clearTimeout(applied);
    }
    const timeout = window.setTimeout(() => { setPendingFingerprint(null); setAnnouncement(t("deals.results.editor.updateFailed")); }, 10000);
    return () => window.clearTimeout(timeout);
  }, [fingerprint, included.flight, pendingFingerprint, t]);
  useEffect(() => { if (!plan || (state.flight.status !== "success" && state.flight.status !== "empty")) return; const next = reconcileDealsFlightSelection(plan, state.flight.results); if (next === plan) return; const timer = window.setTimeout(() => { setPlan(next); persist(next); setAnnouncement(t("deals.tripPlan.flightRemoved")); }, 0); return () => window.clearTimeout(timer); }, [plan, state.flight.results, state.flight.status, persist, t]);
  useEffect(() => { if (!plan || (state.hotel.status !== "success" && state.hotel.status !== "empty")) return; const next = reconcileDealsHotelSelection(plan, state.hotel.results); if (next === plan) return; const timer = window.setTimeout(() => { setPlan(next); persist(next); setAnnouncement(t("deals.tripPlan.stayRemoved")); }, 0); return () => window.clearTimeout(timer); }, [plan, state.hotel.results, state.hotel.status, persist, t]);
  useEffect(() => { if (!plan || (state.car.status !== "success" && state.car.status !== "empty")) return; const next = reconcileDealsCarSelection(plan, state.car.results); if (next === plan) return; const timer = window.setTimeout(() => { setPlan(next); persist(next); setAnnouncement(t("deals.tripPlan.carRemoved")); }, 0); return () => window.clearTimeout(timer); }, [plan, state.car.results, state.car.status, persist, t]);
  const requiredStates = [included.flight && state.flight, included.hotel && state.hotel, included.car && state.car].filter(Boolean) as ProductState<unknown>[];
  const loading = requiredStates.some(item => item.status === "loading" || item.status === "idle");
  const failed = requiredStates.find(item => item.status === "error");
  const candidates = loading || failed ? [] : buildDealsPackageCandidates({ mode: search.mode, flights: state.flight.results, hotels: state.hotel.results, cars: state.car.results, displayCurrency: selectedCurrency, rates: rates.rates });
  const sortedCandidates=[...candidates].sort((a,b)=>{let difference=0;if(packageSort==="lowest-total")difference=(a.estimatedTotal??Infinity)-(b.estimatedTotal??Infinity);else if(packageSort==="shortest-flight")difference=(a.flight?.durationMinutes??Infinity)-(b.flight?.durationMinutes??Infinity);else if(packageSort==="highest-hotel")difference=(b.hotel?.reviewScore??b.hotel?.rating??-Infinity)-(a.hotel?.reviewScore??a.hotel?.rating??-Infinity);else if(packageSort==="highest-car")difference=(b.car?.supplierRating??-Infinity)-(a.car?.supplierRating??-Infinity);else difference=({recommended:0,"lowest-total":1,comfort:2,alternative:3}[a.strategy]-{recommended:0,"lowest-total":1,comfort:2,alternative:3}[b.strategy]);return difference||a.id.localeCompare(b.id);});
  const handlePackageSortChange = useCallback((nextSort: DealsPackageSort) => {
    if (nextSort === packageSort) return;

    setPackageSort(nextSort);
    setPackageSortPending(true);
    setAnnouncement(t("deals.results.package.loading"));

    if (packageSortTimerRef.current !== null) {
      window.clearTimeout(packageSortTimerRef.current);
    }

    const transition = ++packageSortTransitionRef.current;
    packageSortTimerRef.current = window.setTimeout(() => {
      if (transition !== packageSortTransitionRef.current) return;
      packageSortTimerRef.current = null;
      setPackageSortPending(false);
      setAnnouncement("");
    }, PACKAGE_SORT_SKELETON_MS);
  }, [packageSort, t]);
  useEffect(() => {
    packageSortTransitionRef.current += 1;
    if (packageSortTimerRef.current !== null) {
      window.clearTimeout(packageSortTimerRef.current);
      packageSortTimerRef.current = null;
    }
    const reset = window.setTimeout(() => {
      setPackageSortPending(false);
      setAnnouncement("");
    }, 0);
    return () => window.clearTimeout(reset);
  }, [fingerprint, loading]);
  useEffect(() => () => {
    packageSortTransitionRef.current += 1;
    if (packageSortTimerRef.current !== null) {
      window.clearTimeout(packageSortTimerRef.current);
    }
  }, []);
  const showPackageSortSkeleton = !loading && !failed && candidates.length > 0 && packageSortPending;
  if (invalid) return <main className="flex-1 bg-[#f6f8fb] pb-10"><DealsResultsBreadcrumbs t={t} /><div className="page-shell pt-8 sm:pt-6"><div className="rounded-3xl border border-rose-200 bg-white p-8 text-center"><CircleAlert aria-hidden className="mx-auto h-10 w-10 text-rose-600" /><p className="mt-3 text-xs font-bold uppercase text-rose-700">{t("deals.results.breadcrumb.current")}</p><h1 className="mt-1 text-2xl font-extrabold text-slate-950">{t("deals.results.invalidTitle")}</h1><p className="mt-2 text-slate-600">{t("deals.results.editor.correctHere")}</p><button type="button" aria-expanded={editorOpen} aria-controls="deals-modify-search-dialog" onClick={openEditor} className="mt-5 min-h-11 rounded-xl bg-[#004BB8] px-6 font-extrabold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">{t("deals.results.editor.correctSearch")}</button><p className="mt-4"><Link href="/deals" className="rounded-sm text-sm font-bold text-[#004BB8] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30">{t("deals.results.returnToDeals")}</Link></p></div></div>{editor}<p className="sr-only" aria-live="polite">{announcement}</p></main>;
  const unavailable = [
    included.flight && !state.flight.results.some(isDealsFlightEligible) && { product: "flight", key: state.flight.results.length ? "deals.results.package.flightUnavailable" : "deals.results.package.flightEmpty", href: buildFlightResultsUrl(search) },
    included.hotel && !state.hotel.results.some(isDealsHotelEligible) && { product: "hotel", key: !state.hotel.results.length ? "deals.results.package.hotelUnavailable" : "deals.results.package.hotelEmpty", href: buildHotelResultsUrl(search) },
    included.car && !state.car.results.some(isDealsCarEligible) && { product: "car", key: !state.car.results.length ? "deals.results.package.carEmpty" : "deals.results.package.carUnavailable", href: buildCarResultsUrl(search) },
  ].filter(Boolean) as Array<{ product: "flight" | "hotel" | "car"; key: string; href: string }>;
  const retryAll = () => { if (included.flight) request("flight"); if (included.hotel) request("hotel"); if (included.car) request("car"); };
  return <main className={`flex-1 overflow-x-clip bg-[#f6f8fb] pb-8 ${plan?.flight || plan?.hotel || plan?.car ? "pb-96 sm:pb-56" : ""}`}><DealsResultsSearchSummary search={search} locale={locale} t={t} modeLabel={t(modeKeys[search.mode])} onModify={() => setEditorOpen(true)} modifyExpanded={editorOpen} modifyButtonRef={activeModifyTriggerRef} /><DealsResultsBreadcrumbs t={t} /><div className="page-shell max-w-5xl pt-5 sm:pt-6">{editorOpen && editor}<section id="package-options" tabIndex={-1} aria-label={t("deals.results.package.title")} aria-busy={loading || packageSortPending} className="scroll-mt-20 outline-none">
    {loading && <><span className="sr-only" aria-live="polite">{t("deals.results.package.loading")}</span><DealsPreviewSkeleton /></>}
    {failed && <div className="mt-5 rounded-2xl bg-rose-50 p-6 text-center"><p role="alert" className="text-rose-800">{t(failed.errorKey ?? "deals.results.providerUnavailable")}</p><button type="button" onClick={retryAll} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 font-bold"><RefreshCw aria-hidden className="h-4 w-4" />{t("retry")}</button></div>}
    {!loading && !failed && !candidates.length && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-extrabold text-amber-950">{t("deals.results.package.unavailableTitle")}</h2><ul className="mt-3 space-y-2 text-sm text-amber-950">{unavailable.map(item => <li key={item.product}>{t(item.key)}</li>)}</ul><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={retryAll} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#004BB8] px-4 font-bold text-white"><RefreshCw aria-hidden className="h-4 w-4" />{t("retry")}</button><button type="button" aria-expanded={editorOpen} aria-controls="deals-modify-search-dialog" onClick={openEditor} className="min-h-11 rounded-xl border border-[#004BB8] bg-white px-4 font-bold text-[#004BB8] focus-visible:outline focus-visible:outline-2">{t("deals.results.modifySearch")}</button>{unavailable.map(item => <Link key={item.product} href={item.href} className="inline-flex min-h-11 items-center rounded-xl px-3 font-bold text-[#004BB8] underline underline-offset-4">{t(`deals.results.package.view.${item.product}`)}</Link>)}</div></div>}
    {candidates.length > 0 && <div className="space-y-4"><div><h1 className="text-2xl font-extrabold text-slate-950">{t("deals.results.package.title")}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("deals.results.package.intro")}</p></div><DealsPackageResultsToolbar count={candidates.length} mode={search.mode} value={packageSort} onChange={handlePackageSortChange} t={t}/>{showPackageSortSkeleton ? <DealsPreviewSkeleton withTopMargin={false} /> : <ol aria-label={t("deals.results.package.title")} className="space-y-4 sm:space-y-6">{sortedCandidates.map(candidate => <li key={candidate.id}><DealsPackageCard candidate={candidate} search={search} locale={locale} selected={[candidate.flight?.id, candidate.hotel?.id, candidate.car?.id].filter(Boolean).join("::") === [plan?.flight?.id, plan?.hotel?.id, plan?.car?.id].filter(Boolean).join("::")} t={t} onSelect={() => selectPackage(candidate)} /></li>)}</ol>}</div>}
  </section></div><p className="sr-only" aria-live="polite">{announcement}</p>{plan && (plan.flight || plan.hotel || plan.car) && <DealsTripPlanBar plan={plan} persistence={persistence} t={t} onChange={changeSelection} onClear={clearPlan} onRetry={() => persist(plan)} />}</main>;
}
