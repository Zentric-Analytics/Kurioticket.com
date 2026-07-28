"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";
import { buildDealsInternalRedirectHref } from "@/lib/deals/dealsProviderHandoff";
import { getDealsTripPlanReadiness, isDealsTripPlanExpired, isDealsTripPlanProductExpired, markDealsProviderOpened, type DealsTripPlan, type DealsTripPlanProduct } from "@/lib/deals/dealsTripPlan";
import { readDealsTripPlan, writeDealsTripPlan } from "@/lib/deals/dealsTripPlanStorage";

export function DealsHandoffClient() {
  const { t: dictionary } = useLocale(); const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const [hydrated, setHydrated] = useState(false); const [plan, setPlan] = useState<DealsTripPlan | null>(null); const [expired, setExpired] = useState(false);
  useEffect(() => { const value = readDealsTripPlan(); setPlan(value); setExpired(Boolean(value && isDealsTripPlanExpired(value))); setHydrated(true); }, []);
  if (!hydrated) return <p role="status">{t("deals.handoff.loading")}</p>;
  if (!plan) return <div><p>{t("deals.handoff.empty")}</p><Link href="/deals">{t("deals.handoff.returnSearch")}</Link></div>;
  if (expired) return <div><p>{t("deals.handoff.expired")}</p><Link href={plan.resultsPath}>{t("deals.handoff.refresh")}</Link></div>;
  const readiness = getDealsTripPlanReadiness(plan.mode, plan);
  if (!readiness.ready) return <div><p>{t("deals.handoff.incomplete")} {readiness.missing.map(x => t(`deals.tripPlan.${x}`)).join(", ")}</p><Link href={plan.resultsPath}>{t("deals.handoff.returnResults")}</Link></div>;
  const open = (product: DealsTripPlanProduct) => { const updated = markDealsProviderOpened(plan, product); setPlan(updated); writeDealsTripPlan(updated); };
  const steps: Array<{ product: DealsTripPlanProduct; title: string; summary: string; provider: string; id: string; expired: boolean }> = [];
  if (plan.flight) steps.push({ product: "flight", title: t("deals.tripPlan.flight"), summary: `${plan.flight.airline}${plan.flight.flightNumber ? ` · ${plan.flight.flightNumber}` : ""} · ${plan.flight.origin} → ${plan.flight.destination} · ${plan.flight.departure}`, provider: plan.flight.provider, id: plan.flight.id, expired: isDealsTripPlanProductExpired(plan.flight.resultReceivedAt) });
  if (plan.hotel) steps.push({ product: "hotel", title: t("deals.tripPlan.stay"), summary: `${plan.hotel.name} · ${plan.hotel.location} · ${plan.hotel.checkIn}–${plan.hotel.checkOut}${plan.hotel.roomType ? ` · ${plan.hotel.roomType}` : ""}`, provider: plan.hotel.provider, id: plan.hotel.id, expired: isDealsTripPlanProductExpired(plan.hotel.resultReceivedAt) });
  return <><ol className="mt-6 space-y-4">{steps.map(step => { const opened = Boolean(plan.opened[step.product]); const href = buildDealsInternalRedirectHref(step.id, step.product); return <li key={step.product} className="rounded-2xl border bg-white p-5"><h2 className="font-extrabold">{step.title}</h2><p className="mt-1" dir={step.product === "flight" ? "ltr" : undefined}>{step.summary}</p><p className="mt-2 text-sm text-slate-600">{t("deals.handoff.provider").replace("{{provider}}", step.provider)}</p><p className="mt-2 text-sm font-bold">{t(opened ? "deals.handoff.opened" : "deals.handoff.notOpened")}</p>{!step.expired && href ? <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => open(step.product)} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-4 font-bold text-white">{t(opened ? "deals.handoff.openAgain" : step.product === "flight" ? "deals.handoff.openFlight" : "deals.handoff.openStay")} <span className="sr-only">({t("deals.handoff.newTab")})</span></a> : <p className="mt-3 text-sm text-amber-800">{t("deals.handoff.productExpired")}</p>}</li>; })}{plan.carsResultsPath && <li className="rounded-2xl border bg-white p-5"><h2 className="font-extrabold">{t("deals.handoff.carsStep")}</h2><p className="mt-1 text-sm text-slate-600">{t("deals.handoff.carsExplanation")}</p><Link href={plan.carsResultsPath} className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-[#004BB8] px-4 font-bold text-[#004BB8]">{t("deals.handoff.compareCars")}</Link></li>}</ol><Link href={plan.resultsPath} className="mt-6 inline-block font-bold text-[#004BB8] underline">{t("deals.handoff.returnResults")}</Link></>;
}
