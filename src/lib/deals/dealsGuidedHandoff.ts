import type { ExchangeRates } from "@/lib/currency/exchangeRates";
import { getIncludedProductList, type DealsSearch } from "./dealsSearchParams";
import { getDealsHandoffSteps } from "./dealsHandoffPresentation";
import { getDealsReviewTotalPlan } from "./dealsReviewPresentation";
import { getDealsTripPlanEstimatedTotal, getDealsTripPlanReadiness, isDealsTripPlanExpired, isDealsTripPlanProductExpired, markDealsProviderOpened, type DealsTripPlan, type DealsTripPlanProduct } from "./dealsTripPlan";

export type DealsGuidedHandoffValidation =
  | { ok: true; products: readonly DealsTripPlanProduct[] }
  | { ok: false; reason: "fingerprint-mismatch" | "mode-mismatch" | "incomplete" | "expired" | "product-expired" };

export function getDealsGuidedProducts(plan: DealsTripPlan): readonly DealsTripPlanProduct[] {
  return getIncludedProductList(plan.mode) as DealsTripPlanProduct[];
}

export function validateDealsGuidedHandoffPlan(plan: DealsTripPlan, search: DealsSearch, fingerprint: string, now: number): DealsGuidedHandoffValidation {
  if (plan.searchFingerprint !== fingerprint) return { ok: false, reason: "fingerprint-mismatch" };
  if (plan.mode !== search.mode) return { ok: false, reason: "mode-mismatch" };
  if (isDealsTripPlanExpired(plan, now)) return { ok: false, reason: "expired" };
  const readiness = getDealsTripPlanReadiness(plan.mode, plan);
  if (!readiness.ready) return { ok: false, reason: "incomplete" };
  const products = getDealsGuidedProducts(plan);
  if (products.some(product => isDealsTripPlanProductExpired(plan[product]!.resultReceivedAt, now))) return { ok: false, reason: "product-expired" };
  return { ok: true, products };
}

export type DealsGuidedActivationResult = { ok: true; plan: DealsTripPlan; href: string } | { ok: false; reason: "fingerprint-mismatch" | "mode-mismatch" | "incomplete" | "expired" | "product-expired" | "product-missing" | "selection-changed" | "action-unavailable" };

export function prepareDealsGuidedActivation(currentPlan: DealsTripPlan, renderedPlan: DealsTripPlan, product: DealsTripPlanProduct, search: DealsSearch, fingerprint: string, now: number, locale: string): DealsGuidedActivationResult {
  const validation = validateDealsGuidedHandoffPlan(currentPlan, search, fingerprint, now);
  if (!validation.ok) return validation;
  const current = currentPlan[product], rendered = renderedPlan[product];
  if (!current || !rendered) return { ok: false, reason: "product-missing" };
  if (current.id !== rendered.id) return { ok: false, reason: "selection-changed" };
  const currentStep = getDealsHandoffSteps(currentPlan, now, locale, validation.products).find(step => step.product === product);
  const renderedStep = getDealsHandoffSteps(renderedPlan, now, locale, validation.products).find(step => step.product === product);
  if (!currentStep?.href || currentStep.href !== renderedStep?.href) return { ok: false, reason: "action-unavailable" };
  return { ok: true, plan: markDealsProviderOpened(currentPlan, product, now), href: currentStep.href };
}

export const getDealsGuidedOpenedCount = (plan: DealsTripPlan) => getDealsGuidedProducts(plan).filter(product => Boolean(plan.opened[product])).length;
export const getDealsGuidedEstimatedTotal = (plan: DealsTripPlan, currency: string, rates: ExchangeRates) => getDealsTripPlanEstimatedTotal(getDealsReviewTotalPlan(plan), currency, rates);
