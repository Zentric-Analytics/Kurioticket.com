"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { translations as en } from "@/lib/i18n/en";
import { buildDealsSearchFingerprint, replaceDealsFlightSelection, replaceDealsHotelSelection, type DealsTripPlanFlight, type DealsTripPlanHotel } from "@/lib/deals/dealsTripPlan";
import { applyDealsPlanReadResult, buildDealsPlanContextKey, getVisibleDealsPlan, readDealsStagedJourneyPlan, removeDealsStagedJourneyPlan, unresolvedDealsPlanState, writeDealsStagedJourneyPlan } from "@/lib/deals/dealsTripPlanStorage";
import { getIncludedProducts, type DealsSearch } from "@/lib/deals/dealsSearchParams";
import { getGuidedDealsJourneyProgress } from "@/lib/deals/dealsJourneyProgress";
import { buildDealsJourneyUrl, buildLegacyDealsResultsUrl, getFirstDealsJourneyStage, getNextDealsJourneyStage, getPreviousDealsJourneyStage, getRequiredDealsJourneyStage, type DealsJourneyStage } from "@/lib/deals/dealsJourneyRoutes";
import { DealsResultsSearchSummary } from "./DealsResultsSearchSummary";
import { DealsModifySearchDialog } from "./DealsModifySearchDialog";
import { DealsJourneyProgress } from "./DealsJourneyProgress";
import { DealsHotelResultsStage } from "./DealsHotelResultsStage";
import { DealsHotelDetailsStage } from "./DealsHotelDetailsStage";
import { DealsFlightResultsStage } from "./DealsFlightResultsStage";
import { DealsFlightDetailsStage } from "./DealsFlightDetailsStage";
import { DealsCarResultsStage } from "./DealsCarResultsStage";
import { areDealsHotelSelectionsMateriallyEqual } from "@/lib/deals/dealsHotelDetails";
import { areDealsFlightSelectionsMateriallyEqual, buildGuidedDealsBaseTripPlan } from "@/lib/deals/dealsFlightDetails";

const modeKeys = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" } as const;

export function DealsJourneyShell({ stage, search, invalid, hotelId, flightId, carId }: { stage: DealsJourneyStage; search: DealsSearch; invalid: boolean; hotelId: string | null; flightId: string | null; carId: string | null }) {
  const router = useRouter(); const { start } = useRouteProgress(); const { t: dictionary, locale } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const fingerprint = buildDealsSearchFingerprint(search); const contextKey = buildDealsPlanContextKey("guided", fingerprint);
  const [planState, setPlanState] = useState(unresolvedDealsPlanState); const resolved = planState.resolvedContextKey === contextKey;
  const [editorOpen, setEditorOpen] = useState(invalid); const [announcement, setAnnouncement] = useState("");
  const [confirmingHotel, setConfirmingHotel] = useState(false); const [confirmationError, setConfirmationError] = useState("");
  const [confirmingFlight, setConfirmingFlight] = useState(false); const [flightConfirmationError, setFlightConfirmationError] = useState("");
  const modifyButtonRef = useRef<HTMLButtonElement>(null); const headingRef = useRef<HTMLHeadingElement>(null);
  const plan = getVisibleDealsPlan(planState, contextKey);

  useEffect(() => {
    let active = true; const timer = window.setTimeout(() => {
      const result = readDealsStagedJourneyPlan(fingerprint);
      if (active) setPlanState(previous => applyDealsPlanReadResult(contextKey, contextKey, previous, result));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [contextKey, fingerprint]);

  const requiredStage = resolved ? getRequiredDealsJourneyStage(stage, search.mode, plan, hotelId, flightId, carId) : stage;
  useEffect(() => {
    if (!resolved || requiredStage === stage) return;
    const timer = window.setTimeout(() => { setAnnouncement(t("deals.guided.routeCorrected")); start(); router.replace(buildDealsJourneyUrl(requiredStage, search)); }, 0);
    return () => window.clearTimeout(timer);
  }, [requiredStage, resolved, router, search, stage, start, t]);
  useEffect(() => { if (resolved && requiredStage === stage) headingRef.current?.focus({ preventScroll: true }); }, [requiredStage, resolved, stage]);

  const closeEditor = () => { setEditorOpen(false); requestAnimationFrame(() => modifyButtonRef.current?.focus()); };
  const submitSearch = (draft: DealsSearch) => {
    const nextFingerprint = buildDealsSearchFingerprint(draft);
    if (nextFingerprint === fingerprint) { setAnnouncement(t("deals.results.editor.unchanged")); closeEditor(); return; }
    removeDealsStagedJourneyPlan(); setPlanState(previous => ({ ...previous, plan: null, storedContextKey: null, persistence: "idle" })); setEditorOpen(false);
    setAnnouncement(t("deals.results.editor.updatedAnnouncement")); start(); router.push(buildDealsJourneyUrl(getFirstDealsJourneyStage(draft.mode), draft));
  };
  const confirmGuidedHotelSelection = useCallback((selection: DealsTripPlanHotel) => {
    const nextStage = getNextDealsJourneyStage("hotel-details", search.mode);
    if (!nextStage) return;
    setConfirmationError("");
    const currentPlan = plan;
    const same = areDealsHotelSelectionsMateriallyEqual(currentPlan?.hotel, selection);
    if (currentPlan && same) {
      setAnnouncement(t("deals.guided.hotelDetails.confirmed")); start(); router.push(buildDealsJourneyUrl(nextStage, search)); return;
    }
    setConfirmingHotel(true);
    let base = currentPlan;
    if (!base) {
      const created = buildGuidedDealsBaseTripPlan({ search, fingerprint, now: Date.now() });
      if (!created) {
        setConfirmingHotel(false);
        setConfirmationError(t("deals.guided.hotelDetails.saveError"));
        setPlanState(previous => ({ ...previous, persistence: "unavailable" }));
        return;
      }
      base = created;
    }
    const nextPlan = replaceDealsHotelSelection(base, selection);
    const wrote = writeDealsStagedJourneyPlan(nextPlan);
    if (!wrote) { setConfirmingHotel(false); setConfirmationError(t("deals.guided.hotelDetails.saveError")); setPlanState(previous => ({ ...previous, persistence: "unavailable" })); return; }
    setPlanState(previous => ({ ...previous, plan: nextPlan, storedContextKey: contextKey, resolvedContextKey: contextKey, persistence: "saved" }));
    setConfirmingHotel(false); setAnnouncement(t("deals.guided.hotelDetails.confirmed")); start(); router.push(buildDealsJourneyUrl(nextStage, search));
  }, [contextKey, fingerprint, plan, router, search, setAnnouncement, setConfirmationError, setConfirmingHotel, setPlanState, start, t]);

  const confirmGuidedFlightSelection = useCallback((selection: DealsTripPlanFlight) => {
    const nextStage = getNextDealsJourneyStage("flight-details", search.mode);
    if (!nextStage) return;
    setFlightConfirmationError("");
    const currentPlan = plan;
    if (currentPlan && areDealsFlightSelectionsMateriallyEqual(currentPlan.flight, selection)) {
      setAnnouncement(t("deals.guided.flightDetails.confirmed")); start(); router.push(buildDealsJourneyUrl(nextStage, search)); return;
    }
    if (getIncludedProducts(search.mode).hotel && !currentPlan?.hotel) {
      setFlightConfirmationError(t("deals.guided.flightDetails.saveError"));
      setPlanState(previous => ({ ...previous, persistence: "unavailable" }));
      return;
    }
    setConfirmingFlight(true);
    const base = currentPlan ?? buildGuidedDealsBaseTripPlan({ search, fingerprint, now: Date.now() });
    if (!base) { setConfirmingFlight(false); setFlightConfirmationError(t("deals.guided.flightDetails.saveError")); setPlanState(previous => ({ ...previous, persistence: "unavailable" })); return; }
    const nextPlan = replaceDealsFlightSelection(base, selection);
    const wrote = writeDealsStagedJourneyPlan(nextPlan);
    if (!wrote) { setConfirmingFlight(false); setFlightConfirmationError(t("deals.guided.flightDetails.saveError")); setPlanState(previous => ({ ...previous, persistence: "unavailable" })); return; }
    setPlanState(previous => ({ ...previous, plan: nextPlan, storedContextKey: contextKey, resolvedContextKey: contextKey, persistence: "saved" }));
    setConfirmingFlight(false); setAnnouncement(t("deals.guided.flightDetails.confirmed")); start(); router.push(buildDealsJourneyUrl(nextStage, search));
  }, [contextKey, fingerprint, plan, router, search, setAnnouncement, setConfirmingFlight, setFlightConfirmationError, setPlanState, start, t]);
  const progress = useMemo(() => getGuidedDealsJourneyProgress(stage, search.mode, resolved ? plan : null), [plan, resolved, search.mode, stage]);
  const previous = getPreviousDealsJourneyStage(stage, search.mode);
  const backHref = stage === "flight-details" ? buildDealsJourneyUrl("flight-results", search) : stage === "car-details" ? buildDealsJourneyUrl("car-results", search) : previous ? buildDealsJourneyUrl(previous, search) : buildLegacyDealsResultsUrl(search);
  const firstStage = getFirstDealsJourneyStage(search.mode);

  return <main className="flex-1 overflow-x-clip bg-[#f6f8fb] pb-12">
    <DealsResultsSearchSummary search={search} locale={locale} t={t} modeLabel={t(modeKeys[search.mode])} onModify={() => setEditorOpen(true)} modifyExpanded={editorOpen} modifyButtonRef={modifyButtonRef} />
    <div className="page-shell max-w-5xl pt-8 sm:pt-10">
      {editorOpen && <DealsModifySearchDialog key={fingerprint} search={search} locale={locale} t={t} onSubmit={submitSearch} onClose={closeEditor} onDraftChange={() => undefined} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold text-[#004BB8]"><ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />{t("deals.guided.back")}</Link>
        <Link href={buildLegacyDealsResultsUrl(search)} className="focus-ring inline-flex min-h-11 items-center rounded-lg px-3 font-bold text-slate-700 underline decoration-slate-300 underline-offset-4">{t("deals.guided.escape")}</Link>
      </div>
      {resolved && <DealsJourneyProgress progress={progress} t={t} />}
      <section className="mt-7 min-w-0">
        <h1 ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-balance text-2xl font-extrabold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8] sm:text-3xl">{t(`deals.guided.heading.${stage}`)}</h1>
        {!resolved ? <div role="status" className="mt-6 min-h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-label={t("deals.guided.loading")} /> : requiredStage === stage && stage === "hotel-results" ? <DealsHotelResultsStage search={search} /> : requiredStage === stage && stage === "hotel-details" ? <DealsHotelDetailsStage search={search} hotelId={hotelId} plan={plan} confirming={confirmingHotel} confirmationError={confirmationError} onConfirm={confirmGuidedHotelSelection} /> : requiredStage === stage && stage === "flight-results" ? <DealsFlightResultsStage search={search} /> : requiredStage === stage && stage === "flight-details" ? <DealsFlightDetailsStage search={search} flightId={flightId} plan={plan} confirming={confirmingFlight} confirmationError={flightConfirmationError} onConfirm={confirmGuidedFlightSelection} /> : requiredStage === stage && stage === "car-results" ? <DealsCarResultsStage search={search} /> : requiredStage === stage && stage === "car-details" ? <div data-deals-guided-car-details-pending className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-8"><h2 className="text-xl font-extrabold text-slate-950">{t("deals.guided.carDetails.pendingTitle")}</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("deals.guided.carDetails.pendingBody")}</p></div> : requiredStage === stage && stage === "review" ? <div data-deals-guided-review-pending className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-8"><h2 className="text-xl font-extrabold text-slate-950">{t("deals.guided.review.pendingTitle")}</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("deals.guided.review.pendingBody")}</p></div> : requiredStage === stage && stage === firstStage ? <div data-deals-guided-journey-foundation className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-8"><p className="text-lg font-extrabold text-slate-950">{t("deals.guided.foundationTitle")}</p><p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("deals.guided.foundationBody")}</p></div> : null}
      </section>
    </div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
  </main>;
}
