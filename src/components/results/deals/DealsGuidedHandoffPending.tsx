"use client";

import Link from "next/link";
import { AlertTriangle, CircleX, DatabaseZap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { buildDealsJourneyUrl, getEarliestIncompleteDealsJourneyStage } from "@/lib/deals/dealsJourneyRoutes";
import { buildDealsSearchFingerprint, getDealsTripPlanReadiness, isDealsTripPlanProductExpired } from "@/lib/deals/dealsTripPlan";
import { readDealsStagedJourneyPlan, type DealsTripPlanReadResult } from "@/lib/deals/dealsTripPlanStorage";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { translations as en } from "@/lib/i18n/en";

export function DealsGuidedHandoffPending({ search }: { search: DealsSearch }) {
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const fingerprint = buildDealsSearchFingerprint(search);
  const [result, setResult] = useState<DealsTripPlanReadResult | null>(null);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => { setResult(readDealsStagedJourneyPlan(fingerprint)); setNow(Date.now()); }, 0); return () => window.clearTimeout(timer); }, [fingerprint]);
  if (!result || now === null) return <section data-deals-guided-handoff-pending className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div role="status" tabIndex={0} className="font-bold text-slate-700">{t("deals.guided.handoffPending.loading")}</div></section>;
  if (result.status === "storage_unavailable") return <State kind="storage" title={t("deals.guided.handoffPending.storageTitle")} body={t("deals.guided.handoffPending.storageBody")} action={t("deals.guided.handoffPending.returnDeals")} href="/deals" />;
  if (result.status === "expired") return <State kind="warning" title={t("deals.guided.handoffPending.expiredTitle")} body={t("deals.guided.handoffPending.expiredBody")} action={t("deals.guided.handoffPending.returnDeals")} href={buildDealsJourneyUrl(getEarliestIncompleteDealsJourneyStage(search.mode, result.plan), search)} />;
  if (result.status !== "valid") return <State kind="missing" title={t("deals.guided.handoffPending.missingTitle")} body={t("deals.guided.handoffPending.missingBody")} action={t("deals.guided.handoffPending.returnDeals")} href="/deals" />;
  const plan = result.plan;
  const readiness = plan.mode === search.mode && plan.searchFingerprint === fingerprint ? getDealsTripPlanReadiness(plan.mode, plan) : { ready: false, missing: [] };
  const expired = ([plan.hotel, plan.flight, plan.car].filter(Boolean) as Array<{ resultReceivedAt: number }>).some(item => isDealsTripPlanProductExpired(item.resultReceivedAt, now));
  if (!readiness.ready) return <State kind="warning" title={t("deals.guided.handoffPending.incompleteTitle")} body={t("deals.guided.handoffPending.incompleteBody")} action={t("deals.guided.handoffPending.backReview")} href={buildDealsJourneyUrl(getEarliestIncompleteDealsJourneyStage(search.mode, plan), search)} />;
  if (expired) return <State kind="warning" title={t("deals.guided.handoffPending.expiredTitle")} body={t("deals.guided.handoffPending.expiredBody")} action={t("deals.guided.handoffPending.backReview")} href={buildDealsJourneyUrl("review", search)} />;
  return <section data-deals-guided-handoff-pending aria-labelledby="guided-handoff-pending-title" className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8"><h1 id="guided-handoff-pending-title" className="text-2xl font-extrabold text-slate-950">{t("deals.guided.handoffPending.title")}</h1><p className="mt-3 max-w-2xl leading-7 text-slate-600">{t("deals.guided.handoffPending.body")}</p><div className="mt-6 flex flex-wrap gap-3"><Link className="focus-ring inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-5 py-2.5 font-bold text-white" href={buildDealsJourneyUrl("review", search)}>{t("deals.guided.handoffPending.backReview")}</Link><Link className="focus-ring inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 py-2.5 font-bold text-slate-700" href="/deals/results">{t("deals.guided.handoffPending.returnDeals")}</Link></div></section>;
}
function State({ kind, title, body, action, href }: { kind: "storage" | "missing" | "warning"; title: string; body: string; action: string; href: string }) {
  const Icon = kind === "storage" ? DatabaseZap : kind === "warning" ? AlertTriangle : CircleX;
  return <section data-deals-guided-handoff-pending aria-labelledby="guided-handoff-state-title" className={`rounded-2xl border bg-white p-6 shadow-sm sm:p-8 ${kind === "warning" ? "border-amber-300" : "border-slate-200"}`}><Icon aria-hidden className="size-8 text-[#004BB8]" /><h1 id="guided-handoff-state-title" className="mt-4 text-2xl font-extrabold text-slate-950">{title}</h1><p className="mt-2 max-w-xl leading-7 text-slate-600">{body}</p><Link className="focus-ring mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-5 py-2.5 font-bold text-white" href={href}>{action}</Link></section>;
}
