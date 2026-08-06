"use client";

import Link from "next/link";
import { AlertTriangle, CircleX, DatabaseZap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRouteProgress } from "@/components/layout/RouteProgress";
import { useRegion } from "@/components/region/RegionProvider";
import { DealsHandoffExperience } from "./DealsHandoffExperience";
import { DealsHandoffSkeleton } from "./DealsHandoffSkeleton";
import { getDealsGuidedEstimatedTotal, getDealsGuidedOpenedCount, getDealsGuidedProducts, prepareDealsGuidedActivation, validateDealsGuidedHandoffPlan } from "@/lib/deals/dealsGuidedHandoff";
import { buildDealsJourneyUrl, buildLegacyDealsResultsUrl, getEarliestIncompleteDealsJourneyStage, getFirstDealsJourneyStage } from "@/lib/deals/dealsJourneyRoutes";
import { getDealsReviewChangeHref } from "@/lib/deals/dealsReviewPresentation";
import { buildDealsSearchFingerprint, type DealsTripPlan, type DealsTripPlanProduct } from "@/lib/deals/dealsTripPlan";
import { readDealsStagedJourneyPlan, writeDealsStagedJourneyPlan, type DealsTripPlanReadResult } from "@/lib/deals/dealsTripPlanStorage";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { translations as en } from "@/lib/i18n/en";

export function DealsGuidedHandoffClient({ search }: { search: DealsSearch }) {
  const { t: dictionary, locale } = useLocale();
  const { selectedCurrency } = useRegion();
  const rates = useCurrencyRates();
  const { start } = useRouteProgress();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const fingerprint = buildDealsSearchFingerprint(search);
  const [readResult, setReadResult] = useState<DealsTripPlanReadResult | null>(null);
  const [plan, setPlan] = useState<DealsTripPlan | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [activationError, setActivationError] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const loadedAt = Date.now();
      const result = readDealsStagedJourneyPlan(fingerprint, loadedAt);
      setReadResult(result); setNow(loadedAt);
      if (result.status === "valid") setPlan(result.plan);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fingerprint]);

  const activate = (product: DealsTripPlanProduct): boolean => {
    if (!plan) return false;
    setActivationError(false);
    const activatedAt = Date.now();
    const reread = readDealsStagedJourneyPlan(fingerprint, activatedAt);
    if (reread.status !== "valid") { setActivationError(true); window.setTimeout(() => errorRef.current?.focus(), 0); return false; }
    const prepared = prepareDealsGuidedActivation(reread.plan, plan, product, search, fingerprint, activatedAt, locale);
    if (!prepared.ok || !writeDealsStagedJourneyPlan(prepared.plan)) { setActivationError(true); window.setTimeout(() => errorRef.current?.focus(), 0); return false; }
    setPlan(prepared.plan); setNow(activatedAt);
    setAnnouncement(t("deals.handoff.openedAnnouncement").replace("{{product}}", t(`deals.tripPlan.${product === "hotel" ? "stay" : product}`)).replace("{{opened}}", String(getDealsGuidedOpenedCount(prepared.plan))).replace("{{total}}", String(getDealsGuidedProducts(prepared.plan).length)));
    return true;
  };

  let content;
  if (!readResult || now === null) content = <DealsHandoffSkeleton label={t("deals.guided.handoff.loading")} />;
  else if (readResult.status === "storage_unavailable") content = <State kind="storage" title={t("deals.guided.handoff.storageTitle")} body={t("deals.guided.handoff.storageBody")} action={t("deals.guided.handoff.returnDeals")} href="/deals" start={start} />;
  else if (readResult.status === "expired") content = <State kind="warning" title={t("deals.guided.handoff.expiredTitle")} body={t("deals.guided.handoff.expiredBody")} action={t("deals.guided.handoff.refresh")} href={buildDealsJourneyUrl(getFirstDealsJourneyStage(search.mode), search)} start={start} />;
  else if (readResult.status !== "valid" || !plan) content = <State kind="missing" title={t("deals.guided.handoff.missingTitle")} body={t("deals.guided.handoff.missingBody")} action={t("deals.guided.handoff.returnDeals")} href="/deals" start={start} />;
  else {
    const validation = validateDealsGuidedHandoffPlan(plan, search, fingerprint, now);
    if (!validation.ok && validation.reason === "incomplete") content = <State kind="warning" title={t("deals.guided.handoff.incompleteTitle")} body={t("deals.guided.handoff.incompleteBody")} action={t("deals.guided.handoff.refresh")} href={buildDealsJourneyUrl(getEarliestIncompleteDealsJourneyStage(search.mode, plan), search)} start={start} />;
    else if (!validation.ok && validation.reason === "product-expired") content = <State kind="warning" title={t("deals.guided.handoff.refreshTitle")} body={t("deals.guided.handoff.refreshBody")} action={t("deals.guided.handoff.backReview")} href={buildDealsJourneyUrl("review", search)} start={start} />;
    else if (!validation.ok) content = <State kind="missing" title={t("deals.guided.handoff.missingTitle")} body={t("deals.guided.handoff.missingBody")} action={t("deals.guided.handoff.returnDeals")} href="/deals" start={start} />;
    else content = <>
      <div ref={errorRef} tabIndex={-1}>{activationError && <div id="guided-handoff-activation-error" role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><p className="font-bold">{t("deals.guided.handoff.activationFailedTitle")}</p><p className="mt-1 text-sm leading-6">{t("deals.guided.handoff.activationFailedBody")}</p></div>}</div>
      <DealsHandoffExperience plan={plan} now={now} locale={locale} selectedCurrency={selectedCurrency} rates={rates} t={t} progressUnsaved={false} announcement={announcement} onOpen={activate} orderedProducts={validation.products} guided recoveryHrefs={Object.fromEntries(validation.products.map(product => [product, getDealsReviewChangeHref(product, search)]))} combinedTotal={getDealsGuidedEstimatedTotal(plan, selectedCurrency, rates.rates)} />
      <div className="mt-6 flex flex-wrap gap-3"><Link onClick={start} href={buildDealsJourneyUrl("review", search)} className="focus-ring inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-5 py-2.5 font-bold text-white">{t("deals.guided.handoff.backReview")}</Link><Link onClick={start} href={buildLegacyDealsResultsUrl(search)} className="focus-ring inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700">{t("deals.guided.handoff.useCurrentOptions")}</Link></div>
    </>;
  }
  return <section data-deals-guided-handoff data-deals-guided-handoff-state={readResult?.status ?? "loading"} {...(plan ? { "data-deals-guided-handoff-ready": true } : {})}><h1 className="text-2xl font-extrabold text-slate-950">{t("deals.guided.handoff.title")}</h1><div className="mt-5">{content}</div></section>;
}

function State({ kind, title, body, action, href, start }: { kind: "storage" | "missing" | "warning"; title: string; body: string; action: string; href: string; start: () => void }) {
  const Icon = kind === "storage" ? DatabaseZap : kind === "warning" ? AlertTriangle : CircleX;
  return <div role="status" className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${kind === "warning" ? "border-amber-300" : "border-slate-200"}`}><Icon aria-hidden className="size-8 text-[#004BB8]" /><h2 className="mt-4 text-xl font-bold text-slate-950">{title}</h2><p className="mt-2 max-w-xl leading-7 text-slate-600">{body}</p><Link onClick={start} className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-5 py-2.5 font-bold text-white" href={href}>{action}</Link></div>;
}
