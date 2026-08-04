"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { translations as en } from "@/lib/i18n/en";
import { buildDealsSearchFingerprint, type DealsTripPlan } from "@/lib/deals/dealsTripPlan";
import { buildDealsPlanContextKey, getVisibleDealsPlan, readDealsStagedJourneyPlan, removeDealsStagedJourneyPlan } from "@/lib/deals/dealsTripPlanStorage";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { getGuidedDealsJourneyProgress } from "@/lib/deals/dealsJourneyProgress";
import { buildDealsJourneyUrl, buildLegacyDealsResultsUrl, getFirstDealsJourneyStage, getPreviousDealsJourneyStage, getRequiredDealsJourneyStage, type DealsJourneyStage } from "@/lib/deals/dealsJourneyRoutes";
import { DealsResultsSearchSummary } from "./DealsResultsSearchSummary";
import { DealsModifySearchDialog } from "./DealsModifySearchDialog";
import { DealsJourneyProgress } from "./DealsJourneyProgress";

const modeKeys = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" } as const;

export function DealsJourneyShell({ stage, search, invalid }: { stage: DealsJourneyStage; search: DealsSearch; invalid: boolean }) {
  const router = useRouter(); const { start } = useRouteProgress(); const { t: dictionary, locale } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const fingerprint = buildDealsSearchFingerprint(search); const contextKey = buildDealsPlanContextKey("guided", fingerprint);
  const [storedPlan, setStoredPlan] = useState<DealsTripPlan | null>(null); const [storedContextKey, setStoredContextKey] = useState<string | null>(null);
  const [resolvedContextKey, setResolvedContextKey] = useState<string | null>(null); const resolved = resolvedContextKey === contextKey;
  const [editorOpen, setEditorOpen] = useState(invalid); const [announcement, setAnnouncement] = useState("");
  const modifyButtonRef = useRef<HTMLButtonElement>(null); const headingRef = useRef<HTMLHeadingElement>(null);
  const plan = getVisibleDealsPlan(storedPlan, storedContextKey, contextKey);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = readDealsStagedJourneyPlan(fingerprint);
      if (result.status === "valid") { setStoredPlan(result.plan); setStoredContextKey(contextKey); }
      setResolvedContextKey(contextKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [contextKey, fingerprint]);

  const requiredStage = resolved ? getRequiredDealsJourneyStage(stage, search.mode, plan) : stage;
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
    removeDealsStagedJourneyPlan(); setStoredPlan(null); setStoredContextKey(null); setEditorOpen(false);
    setAnnouncement(t("deals.results.editor.updatedAnnouncement")); start(); router.push(buildDealsJourneyUrl(getFirstDealsJourneyStage(draft.mode), draft));
  };
  const progress = useMemo(() => getGuidedDealsJourneyProgress(stage, search.mode, plan), [plan, search.mode, stage]);
  const previous = getPreviousDealsJourneyStage(stage, search.mode);
  const backHref = previous ? buildDealsJourneyUrl(previous, search) : buildLegacyDealsResultsUrl(search);
  const firstStage = getFirstDealsJourneyStage(search.mode);

  return <main className="flex-1 overflow-x-clip bg-[#f6f8fb] pb-12">
    <DealsResultsSearchSummary search={search} locale={locale} t={t} modeLabel={t(modeKeys[search.mode])} onModify={() => setEditorOpen(true)} modifyExpanded={editorOpen} modifyButtonRef={modifyButtonRef} />
    <div className="page-shell max-w-5xl pt-8 sm:pt-10">
      {editorOpen && <DealsModifySearchDialog key={fingerprint} search={search} locale={locale} t={t} onSubmit={submitSearch} onClose={closeEditor} onDraftChange={() => undefined} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold text-[#004BB8]"><ArrowLeft aria-hidden className="size-4 rtl:rotate-180" />{t("deals.guided.back")}</Link>
        <Link href={buildLegacyDealsResultsUrl(search)} className="focus-ring inline-flex min-h-11 items-center rounded-lg px-3 font-bold text-slate-700 underline decoration-slate-300 underline-offset-4">{t("deals.guided.escape")}</Link>
      </div>
      <DealsJourneyProgress progress={progress} t={t} />
      <section className="mt-7 min-w-0">
        <h1 ref={headingRef} tabIndex={-1} className="scroll-mt-24 text-balance text-2xl font-extrabold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8] sm:text-3xl">{t(`deals.guided.heading.${stage}`)}</h1>
        {!resolved ? <div role="status" className="mt-6 min-h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" aria-label={t("deals.guided.loading")} /> : requiredStage === stage && stage === firstStage ? <div data-deals-guided-journey-foundation className="mt-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-8"><p className="text-lg font-extrabold text-slate-950">{t("deals.guided.foundationTitle")}</p><p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("deals.guided.foundationBody")}</p></div> : null}
      </section>
    </div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
  </main>;
}
