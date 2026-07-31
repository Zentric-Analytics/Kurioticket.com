"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { translations as en } from "@/lib/i18n/en";
import { buildDealsInternalRedirectHref } from "@/lib/deals/dealsProviderHandoff";
import { getDealsTripPlanReadiness, getNextDealsProviderStep, isDealsTripPlanProductExpired, markDealsProviderOpened, type DealsTripPlan, type DealsTripPlanProduct } from "@/lib/deals/dealsTripPlan";
import { readDealsTripPlan, writeDealsTripPlan, type DealsTripPlanReadResult } from "@/lib/deals/dealsTripPlanStorage";

export function DealsHandoffClient() {
  const { t: dictionary } = useLocale();
  const { selectedCurrency } = useRegion();
  const rates = useCurrencyRates();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const [readResult, setReadResult] = useState<DealsTripPlanReadResult | null>(null);
  const [plan, setPlan] = useState<DealsTripPlan | null>(null);
  const [progressUnsaved, setProgressUnsaved] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => { const result = readDealsTripPlan(); setReadResult(result); setNow(Date.now()); if (result.status === "valid" || result.status === "expired") setPlan(result.plan); }, 0); return () => window.clearTimeout(timer); }, []);
  if (!readResult) return <p role="status">{t("deals.handoff.loading")}</p>;
  if (readResult.status === "storage_unavailable") return <div><p>{t("deals.handoff.storageUnavailable")}</p><Link href="/deals">{t("deals.handoff.returnSearch")}</Link></div>;
  if (readResult.status === "missing" || readResult.status === "invalid" || readResult.status === "fingerprint_mismatch" || !plan || now === null) return <div><p>{t("deals.handoff.empty")}</p><Link href="/deals">{t("deals.handoff.returnSearch")}</Link></div>;
  if (readResult.status === "expired") return <div><p>{t("deals.handoff.expired")}</p><Link href={plan.resultsPath}>{t("deals.handoff.refresh")}</Link></div>;
  const readiness = getDealsTripPlanReadiness(plan.mode, plan);
  if (!readiness.ready) return <div><p>{t("deals.handoff.incomplete")} {readiness.missing.map(product => t(`deals.tripPlan.${product}`)).join(", ")}</p><Link href={plan.resultsPath}>{t("deals.handoff.returnResults")}</Link></div>;

  const open = (product: DealsTripPlanProduct) => {
    const updated = markDealsProviderOpened(plan, product);
    setPlan(updated);
    setProgressUnsaved(!writeDealsTripPlan(updated));
  };
  const price = (sourcePrice: number, sourceCurrency: string) => Number.isFinite(sourcePrice) && sourcePrice > 0 && sourceCurrency.trim() ? formatDisplayPrice({ amount: sourcePrice, sourceCurrency, displayCurrency: selectedCurrency, convertSourceEstimate: true, rates: rates.rates, isFallbackRate: rates.isFallback }) : null;
  const next = getNextDealsProviderStep(plan, now);
  const steps: Array<{ product: DealsTripPlanProduct; title: string; summary: string; provider: string; id: string; expired: boolean; priceLabel: string; displayPrice: ReturnType<typeof formatDisplayPrice> | null }> = [];
  if (plan.flight) steps.push({ product: "flight", title: t("deals.tripPlan.flight"), summary: `${plan.flight.airline}${plan.flight.flightNumber ? ` · ${plan.flight.flightNumber}` : ""} · ${plan.flight.origin} → ${plan.flight.destination} · ${plan.flight.departure}`, provider: plan.flight.provider, id: plan.flight.id, expired: isDealsTripPlanProductExpired(plan.flight.resultReceivedAt, now), priceLabel: t("deals.handoff.flightPrice"), displayPrice: price(plan.flight.sourcePrice, plan.flight.sourceCurrency) });
  if (plan.hotel) steps.push({ product: "hotel", title: t("deals.tripPlan.stay"), summary: `${plan.hotel.name} · ${plan.hotel.location} · ${plan.hotel.checkIn}–${plan.hotel.checkOut}${plan.hotel.roomType ? ` · ${plan.hotel.roomType}` : ""}`, provider: plan.hotel.provider, id: plan.hotel.id, expired: isDealsTripPlanProductExpired(plan.hotel.resultReceivedAt, now), priceLabel: t("deals.handoff.stayPrice"), displayPrice: price(plan.hotel.sourcePrice, plan.hotel.sourceCurrency) });
  if (plan.car) steps.push({ product: "car", title: t("deals.tripPlan.car"), summary: `${plan.car.rentalCompany} · ${plan.car.modelName} · ${plan.car.pickupLocation}`, provider: plan.car.provider, id: plan.car.id, expired: isDealsTripPlanProductExpired(plan.car.resultReceivedAt, now), priceLabel: t("deals.handoff.carPrice"), displayPrice: price(plan.car.sourcePrice, plan.car.sourceCurrency) });
  return <>
    <section aria-labelledby="deals-next-provider" className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <h2 id="deals-next-provider" className="font-extrabold">{t("deals.handoff.openNext")}</h2>
      {next.product && next.href ? <a href={next.href} target="_blank" rel="noopener noreferrer" onClick={() => open(next.product!)} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-5 font-bold text-white">{t(next.product === "flight" ? "deals.handoff.openFlight" : next.product === "hotel" ? "deals.handoff.openStay" : "deals.handoff.openCar")} <span className="sr-only">({t("deals.handoff.newTab")})</span></a> : <a href="#provider-steps" className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-[#004BB8] px-5 font-bold text-[#004BB8]">{t("deals.handoff.reviewSteps")}</a>}
      {progressUnsaved && <p role="status" className="mt-3 text-sm text-amber-800">{t("deals.handoff.progressUnsaved")}</p>}
    </section>
    <ol id="provider-steps" className="mt-6 space-y-4">{steps.map(step => { const opened = Boolean(plan.opened[step.product]); const href = step.product === "car" ? plan.car?.detailsPath ?? null : buildDealsInternalRedirectHref(step.id, step.product); return <li key={step.product} className="rounded-2xl border bg-white p-5"><h2 className="font-extrabold">{step.title}</h2><p className="mt-1" dir={step.product === "flight" ? "ltr" : undefined}>{step.summary}</p><p className="mt-2 text-sm text-slate-600">{t("deals.handoff.provider").replace("{{provider}}", step.provider)}</p><div className="mt-3"><p className="text-xs font-bold text-slate-500">{step.priceLabel}</p>{step.displayPrice ? <><p aria-label={step.displayPrice.ariaLabel} className="text-xl font-extrabold text-[#004BB8]">{step.displayPrice.formatted}</p>{step.displayPrice.isConvertedEstimate && <><p className="text-xs text-slate-600">{t("deals.handoff.estimatedPrice")}</p><p className="text-xs text-slate-600">{t("deals.handoff.sourcePrice")}: {step.displayPrice.providerFormatted}</p></>}</> : <p>{t("deals.handoff.priceUnavailable")}</p>}</div><p className="mt-2 text-sm font-bold">{t(opened ? "deals.handoff.opened" : "deals.handoff.notOpened")}</p>{!step.expired && href ? <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => open(step.product)} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[#004BB8] px-4 font-bold text-white">{t(opened ? "deals.handoff.openAgain" : "deals.handoff.openProvider")} <span className="sr-only">({t("deals.handoff.newTab")})</span></a> : <div className="mt-3"><p className="text-sm text-amber-800">{t(step.product === "flight" ? "deals.handoff.flightExpired" : step.product === "hotel" ? "deals.handoff.stayExpired" : "deals.handoff.carExpired")}</p><Link href={plan.resultsPath} className="font-bold text-[#004BB8] underline">{t("deals.handoff.refresh")}</Link></div>}</li>; })}</ol>{plan.carsResultsPath && <Link href={plan.carsResultsPath} className="mt-4 inline-block font-bold text-[#004BB8] underline">{t("deals.handoff.compareCars")}</Link>}
    <Link href={plan.resultsPath} className="mt-6 inline-block font-bold text-[#004BB8] underline">{t("deals.handoff.returnResults")}</Link>
  </>;
}
