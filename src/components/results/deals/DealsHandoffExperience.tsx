"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { DealsHandoffStepCard } from "./DealsHandoffStepCard";
import { DealsHandoffSummary } from "./DealsHandoffSummary";
import { DealsJourneyProgress } from "./DealsJourneyProgress";
import { formatCurrency, formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { getDealsHandoffSteps } from "@/lib/deals/dealsHandoffPresentation";
import { getHandoffReadyDealsJourneyProgress } from "@/lib/deals/dealsJourneyProgress";
import { getDealsTripPlanEstimatedTotal, getNextDealsProviderStep, type DealsTripPlan, type DealsTripPlanProduct } from "@/lib/deals/dealsTripPlan";

const modeKeys = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" } as const;
type Props = { plan: DealsTripPlan; now: number; locale: string; selectedCurrency: string; rates: ReturnType<typeof useCurrencyRates>; t: (key: string) => string; progressUnsaved: boolean; announcement: string; onOpen: (product: DealsTripPlanProduct) => boolean | void; orderedProducts?: readonly DealsTripPlanProduct[]; guided?: boolean; recoveryHrefs?: Partial<Record<DealsTripPlanProduct, string>>; combinedTotal?: number | null };

export function DealsHandoffExperience({ plan, now, locale, selectedCurrency, rates, t, progressUnsaved, announcement, onOpen, orderedProducts, guided = false, recoveryHrefs, combinedTotal }: Props) {
  const steps = useMemo(() => getDealsHandoffSteps(plan, now, locale, orderedProducts), [plan, now, locale, orderedProducts]);
  const actionable = steps.filter(step => step.status !== "expired");
  const opened = actionable.filter(step => step.status === "opened").length;
  const unavailable = steps.some(step => !step.href || step.status === "expired");
  const legacyNext = getNextDealsProviderStep(plan, now);
  const allOpened = !unavailable && actionable.length > 0 && opened === actionable.length;
  const combined = combinedTotal === undefined ? getDealsTripPlanEstimatedTotal(plan, selectedCurrency, rates.rates) : combinedTotal;
  const progress = t("deals.handoff.progress").replace("{{opened}}", String(opened)).replace("{{total}}", String(steps.length));
  return <>
    <DealsJourneyProgress progress={getHandoffReadyDealsJourneyProgress(plan)} t={t} />
    {guided && <><p className="mt-5 max-w-3xl leading-7 text-slate-600">{t("deals.guided.handoff.introduction")}</p>{allOpened && <div role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-950"><p className="font-bold">{t("deals.guided.handoff.allOpened")}</p><p className="mt-1 text-sm leading-6">{t("deals.guided.handoff.allOpenedBody")}</p></div>}</>}
    <div data-deals-handoff-ready-grid className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
      <DealsHandoffSummary modeLabel={t(modeKeys[plan.mode])} opened={opened} total={steps.length} totalLabel={combined === null ? null : formatCurrency(combined, selectedCurrency)} progressLabel={progress} allOpened={guided ? allOpened : legacyNext.allOpened} hasExpired={unavailable} t={t} />
      <div className="order-2 min-w-0 xl:order-1">
        <p className="sr-only" aria-live="polite">{announcement}</p>
        {progressUnsaved && <div id="guided-handoff-activation-error" role="alert" tabIndex={-1} className="mb-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{t(guided ? "deals.guided.handoff.progressUnsaved" : "deals.handoff.progressUnsaved")}</div>}
        <ol id="provider-steps" aria-label={t("deals.handoff.providerSteps")} className="space-y-4">{steps.map(step => <li key={step.product}><DealsHandoffStepCard step={step} displayCurrency={selectedCurrency} resultsPath={plan.resultsPath} t={t} onOpen={() => onOpen(step.product)} unavailableHref={guided ? recoveryHrefs?.[step.product] : undefined} unavailableLabel={guided ? t(`deals.guided.handoff.change${step.product === "hotel" ? "Stay" : step.product === "flight" ? "Flight" : "Car"}`) : undefined} unavailableBody={guided ? t("deals.guided.handoff.actionUnavailable") : undefined} price={Number.isFinite(step.sourcePrice) && step.sourcePrice > 0 && step.sourceCurrency.trim() ? formatDisplayPrice({ amount: step.sourcePrice, sourceCurrency: step.sourceCurrency, displayCurrency: selectedCurrency, convertSourceEstimate: true, rates: rates.rates, isFallbackRate: rates.isFallback }) : null} /></li>)}</ol>
        {!guided && plan.carsResultsPath && <Link href={plan.carsResultsPath} className="mt-4 inline-flex min-h-11 items-center font-bold text-[#004BB8] underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{t("deals.handoff.compareCars")}</Link>}
        {guided && <p className="mt-5 text-sm leading-6 text-slate-600">{t("deals.guided.handoff.openedDisclosure")}</p>}
      </div>
    </div>
  </>;
}
