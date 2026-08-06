"use client";

import { useCallback, useMemo } from "react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatCurrency, formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { getDealsTripPlanEstimatedTotal, type DealsTripPlan } from "@/lib/deals/dealsTripPlan";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { translations as en } from "@/lib/i18n/en";
import { DealsReviewItemCard } from "./DealsReviewItemCard";
import { DealsReviewSummary } from "./DealsReviewSummary";
import { buildGuidedDealsHandoffPendingUrl, getDealsReviewItems, getDealsReviewStatus, getDealsReviewTotalPlan } from "@/lib/deals/dealsReviewPresentation";

const modeKeys = { "hotel-flight": "deals.package.hotelFlight", "hotel-flight-car": "deals.package.hotelFlightCar", "flight-car": "deals.package.flightCar", "hotel-car": "deals.package.hotelCar" } as const;

export function DealsReviewStage({ plan, search, now }: { plan: DealsTripPlan; search: DealsSearch; now: number }) {
  const { t: dictionary, locale } = useLocale();
  const { selectedCurrency } = useRegion();
  const rates = useCurrencyRates();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const items = useMemo(() => getDealsReviewItems(plan, search, now, locale), [plan, search, now, locale]);
  const status = useMemo(() => getDealsReviewStatus(plan, now), [plan, now]);
  const total = getDealsTripPlanEstimatedTotal(getDealsReviewTotalPlan(plan), selectedCurrency, rates.rates);
  const prices = new Map(items.map(item => [item.product, formatDisplayPrice({ amount: item.sourcePrice, sourceCurrency: item.sourceCurrency, displayCurrency: selectedCurrency, convertSourceEstimate: true, rates: rates.rates, isFallbackRate: rates.isFallback })]));
  return <div data-deals-guided-review-stage data-deals-guided-review-state={status.canContinue ? "ready" : "product-expired"} className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
    <div className="min-w-0 space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-2xl font-extrabold text-slate-950">{t("deals.guided.review.title")}</h2><p className="mt-2 leading-7 text-slate-600">{t("deals.guided.review.introduction")}</p></div>
      {items.map(item => <DealsReviewItemCard key={item.product} item={item} price={prices.get(item.product) ?? null} t={t} />)}
    </div>
    <DealsReviewSummary modeLabel={t(modeKeys[plan.mode])} count={items.length} totalLabel={total === null ? null : formatCurrency(total, selectedCurrency)} disclosure={rates.isFallback ? t("deals.guided.review.fallbackDisclosure") : t("deals.guided.review.estimateDisclosure")} canContinue={status.canContinue} continueHref={buildGuidedDealsHandoffPendingUrl(search)} expiredNames={status.expired.map(product => t(product === "hotel" ? "deals.guided.review.stay" : product === "flight" ? "deals.guided.review.flight" : "deals.guided.review.car"))} t={t} />
  </div>;
}
