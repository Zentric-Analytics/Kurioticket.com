"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { translations as en } from "@/lib/i18n/en";
import { buildDealsSearchFingerprint, type DealsTripPlanCar, type DealsTripPlanFlight, type DealsTripPlanHotel, type DealsTripPlanProduct } from "@/lib/deals/dealsTripPlan";
import { applyDealsPlanReadResult, buildDealsPlanContextKey, getVisibleDealsPlan, readDealsStagedJourneyPlan, removeDealsStagedJourneyPlan, unresolvedDealsPlanState, writeDealsStagedJourneyPlan } from "@/lib/deals/dealsTripPlanStorage";
import { type DealsSearch } from "@/lib/deals/dealsSearchParams";
import { getGuidedDealsJourneyProgress } from "@/lib/deals/dealsJourneyProgress";
import { buildDealsJourneyUrl, buildLegacyDealsResultsUrl, getEarliestIncompleteDealsJourneyStage, getFirstDealsJourneyStage, getNextDealsJourneyStage, getPreviousDealsJourneyStage, getRequiredDealsJourneyStageAt, type DealsJourneyStage } from "@/lib/deals/dealsJourneyRoutes";
import { DealsResultsSearchSummary } from "./DealsResultsSearchSummary";
import { DealsModifySearchDialog } from "./DealsModifySearchDialog";
import { DealsJourneyProgress } from "./DealsJourneyProgress";
import { DealsHotelResultsStage } from "./DealsHotelResultsStage";
import { DealsHotelDetailsStage } from "./DealsHotelDetailsStage";
import { DealsFlightResultsStage } from "./DealsFlightResultsStage";
import { DealsFlightDetailsStage } from "./DealsFlightDetailsStage";
import { DealsCarResultsStage } from "./DealsCarResultsStage";
import { DealsCarDetailsStage } from "./DealsCarDetailsStage";
import { DealsReviewStage } from "./DealsReviewStage";
import { attemptGuidedConfirmation, type DealsGuidedConfirmationFailure } from "@/lib/deals/dealsGuidedConfirmation";
import { useDealsStagedJourneyLifecycle } from "./useDealsStagedJourneyLifecycle";
import { DealsGuidedConflictState } from "./DealsGuidedConflictState";
import { areDealsGuidedPlansMateriallyEqual, shouldAnnounceDealsCrossTabUpdate, type DealsLifecycleSource } from "@/lib/deals/dealsGuidedJourneyLifecycle";
import { getDealsGuidedConfirmationActionId } from "@/lib/deals/dealsConfirmationIds";
import type { DealsStagedSnapshotResult, DealsTripPlanReadResult } from "@/lib/deals/dealsTripPlanStorage";

type GuidedPlanState = "loading" | "new" | "ready" | "storage-unavailable" | "invalid" | "fingerprint-mismatch" | "expired" | "confirmation-read-failure" | "confirmation-persistence-failure" | "prerequisite-changed";

const modeKeys = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" } as const;

export function DealsJourneyShell({ stage, search, invalid, hotelId, flightId, carId }: { stage: DealsJourneyStage; search: DealsSearch; invalid: boolean; hotelId: string | null; flightId: string | null; carId: string | null }) {
  const router = useRouter(); const { start } = useRouteProgress(); const { t: dictionary, locale } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const fingerprint = buildDealsSearchFingerprint(search); const contextKey = buildDealsPlanContextKey("guided", fingerprint);
  const [planState, setPlanState] = useState(unresolvedDealsPlanState); const resolved = planState.resolvedContextKey === contextKey;
  const [planStatus, setPlanStatus] = useState<GuidedPlanState>("loading");
  const [editorOpen, setEditorOpen] = useState(invalid); const [announcement, setAnnouncement] = useState("");
  const [confirmingHotel, setConfirmingHotel] = useState(false);
  const [confirmingFlight, setConfirmingFlight] = useState(false);
  const [confirmingCar, setConfirmingCar] = useState(false);
  const [confirmationFailure, setConfirmationFailure] = useState<{ product: DealsTripPlanProduct; kind: "read" | "write"; message: string } | null>(null);
  const confirmationAlertRef = useRef<HTMLDivElement>(null);
  const modifyButtonRef = useRef<HTMLButtonElement>(null); const headingRef = useRef<HTMLHeadingElement>(null);
  const plan = getVisibleDealsPlan(planState, contextKey);

  useEffect(() => {
    let active = true; const timer = window.setTimeout(() => {
      const result = readDealsStagedJourneyPlan(fingerprint);
      if (active) { setPlanState(previous => applyDealsPlanReadResult(contextKey, contextKey, previous, result)); setPlanStatus(result.status === "valid" ? "ready" : result.status === "missing" ? "new" : result.status.replace("_", "-") as GuidedPlanState); }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [contextKey, fingerprint]);

  const installLifecycleResult = (result: DealsStagedSnapshotResult | DealsTripPlanReadResult, source: DealsLifecycleSource) => {
    if (result.status === "valid" && areDealsGuidedPlansMateriallyEqual(plan, result.plan)) return;
    if (result.status === "valid" && shouldAnnounceDealsCrossTabUpdate(source, plan, result.plan)) setAnnouncement(t("deals.guided.crossTabUpdated"));
    setPlanStatus(result.status === "valid" ? "ready" : result.status === "missing" ? "new" : result.status.replace("_", "-") as GuidedPlanState);
    setPlanState(previous => applyDealsPlanReadResult(contextKey, contextKey, previous, result));
  };
  const onSnapshot = (result: DealsStagedSnapshotResult, _observedAt: number, source: DealsLifecycleSource) => installLifecycleResult(result, source);
  const onRefresh = (result: DealsTripPlanReadResult, _observedAt: number, source: DealsLifecycleSource) => installLifecycleResult(result, source);
  const lifecycleNow = useDealsStagedJourneyLifecycle({ fingerprint, plan, active: resolved, onSnapshot, onRefresh });

  const requiredStage = resolved ? getRequiredDealsJourneyStageAt(stage, search.mode, plan, { hotelId, flightId, carId }, lifecycleNow) : stage;
  useEffect(() => {
    if (!resolved || requiredStage === stage) return;
    const timer = window.setTimeout(() => { setAnnouncement(t("deals.guided.routeCorrected")); start(); router.replace(buildDealsJourneyUrl(requiredStage, search)); }, 0);
    return () => window.clearTimeout(timer);
  }, [requiredStage, resolved, router, search, stage, start, t]);
  useEffect(() => { if (resolved && requiredStage === stage) headingRef.current?.focus({ preventScroll: true }); }, [requiredStage, resolved, stage]);
  useEffect(() => { if (confirmationFailure) confirmationAlertRef.current?.focus({ preventScroll: true }); }, [confirmationFailure]);

  const closeEditor = () => { setEditorOpen(false); requestAnimationFrame(() => modifyButtonRef.current?.focus()); };
  const submitSearch = (draft: DealsSearch) => {
    const nextFingerprint = buildDealsSearchFingerprint(draft);
    if (nextFingerprint === fingerprint) { setAnnouncement(t("deals.results.editor.unchanged")); closeEditor(); return; }
    removeDealsStagedJourneyPlan(); setPlanState(previous => ({ ...previous, plan: null, storedContextKey: null, persistence: "idle" })); setEditorOpen(false);
    setAnnouncement(t("deals.results.editor.updatedAnnouncement")); start(); router.push(buildDealsJourneyUrl(getFirstDealsJourneyStage(draft.mode), draft));
  };
  const restartCurrentPreview = () => {
    removeDealsStagedJourneyPlan(); setPlanState(unresolvedDealsPlanState()); setPlanStatus("loading"); setConfirmationFailure(null);
    start(); router.replace(buildDealsJourneyUrl(getFirstDealsJourneyStage(search.mode), search));
  };
  const confirm = (product: DealsTripPlanProduct, selection: DealsTripPlanHotel | DealsTripPlanFlight | DealsTripPlanCar) => {
    const nextStage = getNextDealsJourneyStage(`${product}-details` as DealsJourneyStage, search.mode);
    if (!nextStage) return;
    const setConfirming = product === "hotel" ? setConfirmingHotel : product === "flight" ? setConfirmingFlight : setConfirmingCar;
    setConfirmationFailure(null); setConfirming(true);
    const result = attemptGuidedConfirmation({ product, selection, renderedPlan: plan, search, fingerprint, now: Date.now(), read: readDealsStagedJourneyPlan, write: writeDealsStagedJourneyPlan });
    setConfirming(false);
    if (!result.ok) {
      const failure: DealsGuidedConfirmationFailure = result.failure;
      if (result.currentPlan?.searchFingerprint === fingerprint) setPlanState(previous => ({ ...previous, plan: result.currentPlan!, storedContextKey: contextKey, resolvedContextKey: contextKey, persistence: "saved" }));
      if (failure === "storage-read-unavailable") { setPlanStatus("confirmation-read-failure"); setConfirmationFailure({ product, kind: "read", message: t("deals.guided.confirmation.readError") }); }
      else if (failure === "persistence-failed") { setPlanStatus("confirmation-persistence-failure"); setConfirmationFailure({ product, kind: "write", message: t("deals.guided.confirmation.saveError") }); }
      else if (failure === "fingerprint-mismatch") setPlanStatus("fingerprint-mismatch");
      else if (failure === "mode-mismatch" || failure === "plan-invalid") setPlanStatus("invalid");
      else if (failure === "plan-expired") { setPlanStatus("expired"); start(); router.replace(buildDealsJourneyUrl(getFirstDealsJourneyStage(search.mode), search)); }
      else if (failure === "prerequisite-changed") { setPlanStatus("prerequisite-changed"); setAnnouncement(t("deals.guided.prerequisiteChanged")); }
      else { const recoveryPlan = result.currentPlan?.searchFingerprint === fingerprint ? result.currentPlan : plan; const recoveryStage = getEarliestIncompleteDealsJourneyStage(search.mode, recoveryPlan); start(); router.replace(buildDealsJourneyUrl(recoveryStage, search)); }
      return;
    }
    setPlanStatus("ready"); setPlanState(previous => ({ ...previous, plan: result.plan, storedContextKey: contextKey, resolvedContextKey: contextKey, persistence: "saved" }));
    setAnnouncement(t(`deals.guided.${product}Details.confirmed`)); start(); router.push(buildDealsJourneyUrl(nextStage, search));
  };
  const confirmGuidedHotelSelection = (selection: DealsTripPlanHotel) => confirm("hotel", selection);
  const confirmGuidedFlightSelection = (selection: DealsTripPlanFlight) => confirm("flight", selection);
  const confirmGuidedCarSelection = (selection: DealsTripPlanCar) => confirm("car", selection);
  const progress = useMemo(() => getGuidedDealsJourneyProgress(stage, search.mode, resolved ? plan : null), [plan, resolved, search.mode, stage]);
  const previous = getPreviousDealsJourneyStage(stage, search.mode);
  const backHref = stage === "flight-details" ? buildDealsJourneyUrl("flight-results", search) : stage === "car-details" ? buildDealsJourneyUrl("car-results", search) : previous ? buildDealsJourneyUrl(previous, search) : buildLegacyDealsResultsUrl(search);
  const firstStage = getFirstDealsJourneyStage(search.mode);
  const displayPlanStatus: GuidedPlanState = plan && plan.expiresAt <= lifecycleNow ? "expired" : planStatus;
  const clearConfirmationFailure = () => { const product = confirmationFailure?.product; setConfirmationFailure(null); setPlanStatus("ready"); if (product) document.getElementById(getDealsGuidedConfirmationActionId(product))?.focus({ preventScroll: true }); };

  return <main data-deals-guided-journey data-deals-guided-stage={stage} data-deals-guided-plan-state={displayPlanStatus} className="flex-1 overflow-x-clip bg-[#f6f8fb] pb-12">
    <DealsResultsSearchSummary search={search} locale={locale} t={t} modeLabel={t(modeKeys[search.mode])} onModify={() => setEditorOpen(true)} modifyExpanded={editorOpen} modifyButtonRef={modifyButtonRef} />
    <div className="page-shell max-w-5xl pt-8 sm:pt-10">
      {editorOpen && <DealsModifySearchDialog key={fingerprint} search={search} locale={locale} t={t} onSubmit={submitSearch} onClose={closeEditor} onDraftChange={() => undefined} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link onClick={start} href={backHref} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold text-[#004BB8]"><ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />{t("deals.guided.back")}</Link>
        <Link onClick={start} href={buildLegacyDealsResultsUrl(search)} className="focus-ring inline-flex min-h-11 items-center rounded-lg px-3 font-bold text-slate-700 underline decoration-slate-300 underline-offset-4">{t("deals.guided.escape")}</Link>
      </div>
      {resolved && <DealsJourneyProgress progress={progress} t={t} />}
      <section className="mt-7 min-w-0">
        <h1 ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-balance text-2xl font-extrabold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8] sm:text-3xl">{t(`deals.guided.heading.${stage}`)}</h1>
        {confirmationFailure ? <div ref={confirmationAlertRef} tabIndex={-1} role="alert" className="mb-4 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"><p className="font-semibold">{confirmationFailure.message}</p><button type="button" onClick={clearConfirmationFailure} className="focus-ring mt-3 min-h-11 font-bold underline">{t("deals.guided.confirmation.retry")}</button></div> : null}
        {displayPlanStatus === "fingerprint-mismatch" ? <DealsGuidedConflictState t={t} onRestart={restartCurrentPreview} /> : displayPlanStatus === "storage-unavailable" ? <GuidedSafeState title={t("deals.guided.storageUnavailable.title")} body={t("deals.guided.storageUnavailable.body")} action={t("deals.guided.conflict.restart")} onAction={restartCurrentPreview} /> : displayPlanStatus === "invalid" ? <GuidedSafeState title={t("deals.guided.invalid.title")} body={t("deals.guided.invalid.body")} action={t("deals.guided.conflict.restart")} onAction={restartCurrentPreview} /> : displayPlanStatus === "expired" ? <GuidedSafeState title={t("deals.guided.expired.title")} body={t("deals.guided.expired.body")} action={t("deals.guided.conflict.restart")} onAction={restartCurrentPreview} /> : !resolved ? <div role="status" className="mt-6 min-h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-label={t("deals.guided.loading")} /> : requiredStage === stage && stage === "hotel-results" ? <DealsHotelResultsStage search={search} /> : requiredStage === stage && stage === "hotel-details" ? <DealsHotelDetailsStage search={search} hotelId={hotelId} plan={plan} confirming={confirmingHotel} confirmationError="" onConfirm={confirmGuidedHotelSelection} /> : requiredStage === stage && stage === "flight-results" ? <DealsFlightResultsStage search={search} /> : requiredStage === stage && stage === "flight-details" ? <DealsFlightDetailsStage search={search} flightId={flightId} plan={plan} confirming={confirmingFlight} confirmationError="" onConfirm={confirmGuidedFlightSelection} /> : requiredStage === stage && stage === "car-results" ? <DealsCarResultsStage search={search} /> : requiredStage === stage && stage === "car-details" ? <DealsCarDetailsStage search={search} carId={carId} plan={plan} confirming={confirmingCar} confirmationError="" onConfirm={confirmGuidedCarSelection} /> : requiredStage === stage && stage === "review" && plan ? <DealsReviewStage plan={plan} search={search} now={lifecycleNow} /> : requiredStage === stage && stage === firstStage ? <div data-deals-guided-journey-foundation className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-8"><p className="text-lg font-extrabold text-slate-950">{t("deals.guided.foundationTitle")}</p><p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("deals.guided.foundationBody")}</p></div> : null}
      </section>
    </div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
  </main>;
}

function GuidedSafeState({ title, body, action, onAction }: { title: string; body: string; action: string; onAction: () => void }) { return <div role="status" className="mt-6 rounded-2xl border border-amber-300 bg-white p-6"><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 leading-7 text-slate-600">{body}</p><button type="button" onClick={onAction} className="focus-ring mt-5 min-h-11 rounded-xl bg-[#004BB8] px-5 font-bold text-white">{action}</button></div>; }
