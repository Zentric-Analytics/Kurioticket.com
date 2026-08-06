"use client";

import Link from "next/link";
import { AlertTriangle, CircleX, DatabaseZap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { DetailsBackLink } from "@/components/results/DetailsBackLink";
import { DealsHandoffSkeleton } from "./DealsHandoffSkeleton";
import { DealsHandoffExperience } from "./DealsHandoffExperience";
import { getDealsHandoffSteps } from "@/lib/deals/dealsHandoffPresentation";
import { getDealsTripPlanReadiness, markDealsProviderOpened, type DealsTripPlan } from "@/lib/deals/dealsTripPlan";
import { readDealsTripPlan, writeDealsTripPlan, type DealsTripPlanReadResult } from "@/lib/deals/dealsTripPlanStorage";
import { translations as en } from "@/lib/i18n/en";


export function DealsHandoffClient() {
  const { t: dictionary, locale } = useLocale();
  const { selectedCurrency } = useRegion();
  const rates = useCurrencyRates();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const [readResult, setReadResult] = useState<DealsTripPlanReadResult | null>(null);
  const [plan, setPlan] = useState<DealsTripPlan | null>(null);
  const [progressUnsaved, setProgressUnsaved] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = readDealsTripPlan();
      setReadResult(result); setNow(Date.now());
      if (result.status === "valid" || result.status === "expired") setPlan(result.plan);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  let content;
  if (!readResult) content = <DealsHandoffSkeleton label={t("deals.handoff.loading")} />;
  else if (readResult.status === "storage_unavailable") content = <StatePanel kind="storage" title={t("deals.handoff.storageTitle")} body={t("deals.handoff.storageUnavailable")} action={t("deals.handoff.returnSearch")} href="/deals" />;
  else if (readResult.status === "missing" || readResult.status === "invalid" || readResult.status === "fingerprint_mismatch" || !plan || now === null) content = <StatePanel kind="missing" title={t("deals.handoff.missingTitle")} body={t("deals.handoff.missingBody")} action={t("deals.handoff.returnSearch")} href="/deals" />;
  else if (readResult.status === "expired") content = <StatePanel kind="warning" title={t("deals.handoff.expiredTitle")} body={t("deals.handoff.expiredBody")} action={t("deals.handoff.refresh")} href={plan.resultsPath} />;
  else {
    const readiness = getDealsTripPlanReadiness(plan.mode, plan);
    content = readiness.ready
      ? <DealsHandoffExperience plan={plan} now={now} locale={locale} selectedCurrency={selectedCurrency} rates={rates} t={t} progressUnsaved={progressUnsaved} announcement={announcement} onOpen={(product) => setPlan(current => { if (!current) return current; const updated = markDealsProviderOpened(current, product); setProgressUnsaved(!writeDealsTripPlan(updated)); const count = Object.keys(updated.opened).length; setAnnouncement(t("deals.handoff.openedAnnouncement").replace("{{product}}", t(`deals.tripPlan.${product === "hotel" ? "stay" : product}`)).replace("{{opened}}", String(count)).replace("{{total}}", String(getDealsHandoffSteps(updated, now, locale).length))); return updated; })} />
      : <StatePanel kind="warning" title={t("deals.handoff.incompleteTitle")} body={t("deals.handoff.incompleteBody")} action={t("deals.handoff.returnResults")} href={plan.resultsPath} missing={readiness.missing.map(product => t(`deals.tripPlan.${product === "hotel" ? "stay" : product}`))} />;
  }

  return <>
    {plan ? <DetailsBackLink href={plan.resultsPath}>{t("deals.handoff.returnResults")}</DetailsBackLink> : null}
    <h1 className="sr-only">{t("deals.handoff.title")}</h1>
    {content}
  </>;
}


function StatePanel({ kind, title, body, action, href, missing }: { kind: "storage" | "missing" | "warning"; title: string; body: string; action: string; href: string; missing?: string[] }) {
  const Icon = kind === "storage" ? DatabaseZap : kind === "warning" ? AlertTriangle : CircleX;
  return <section aria-labelledby="handoff-state-title" className={`mt-7 rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${kind === "warning" ? "border-amber-300" : "border-slate-200"}`}><span className={`flex size-12 items-center justify-center rounded-xl ${kind === "warning" ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-[#004BB8]"}`}><Icon aria-hidden className="size-6" /></span><h2 id="handoff-state-title" className="mt-5 text-2xl font-bold text-slate-950">{title}</h2><p className="mt-2 max-w-xl leading-7 text-slate-600">{body}</p>{missing && <ul className="mt-4 flex flex-wrap gap-2">{missing.map(item => <li key={item} className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">{item}</li>)}</ul>}<Link href={href} className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-5 py-2.5 font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{action}</Link></section>;
}
