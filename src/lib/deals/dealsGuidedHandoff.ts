import type { ExchangeRates } from "@/lib/currency/exchangeRates";
import { getIncludedProductList, type DealsSearch } from "./dealsSearchParams";
import { getDealsHandoffSteps } from "./dealsHandoffPresentation";
import { getDealsReviewTotalPlan } from "./dealsReviewPresentation";
import { getDealsTripPlanEstimatedTotal, getDealsTripPlanReadiness, isDealsTripPlanExpired, isDealsTripPlanProductExpired, markDealsProviderOpened, type DealsTripPlan, type DealsTripPlanProduct } from "./dealsTripPlan";
import type { DealsTripPlanReadResult } from "./dealsTripPlanStorage";

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

export type GuidedActivationFailure =
  | { kind: "storage-read-unavailable" | "persistence-failed"; product: DealsTripPlanProduct }
  | { kind: "plan-missing" | "plan-invalid" | "fingerprint-mismatch" | "mode-mismatch" | "incomplete" | "plan-expired" }
  | { kind: "product-expired" | "selection-changed" | "action-unavailable"; product: DealsTripPlanProduct };

export type AttemptGuidedHandoffActivationResult =
  | { ok: true; plan: DealsTripPlan; href: string }
  | { ok: false; failure: GuidedActivationFailure; currentPlan?: DealsTripPlan };

export function attemptGuidedHandoffActivation(input: {
  renderedPlan: DealsTripPlan; product: DealsTripPlanProduct; search: DealsSearch;
  fingerprint: string; now: number; locale: string;
  read: (fingerprint: string, now: number) => DealsTripPlanReadResult;
  write: (plan: DealsTripPlan) => boolean;
}): AttemptGuidedHandoffActivationResult {
  const reread = input.read(input.fingerprint, input.now);
  if (reread.status === "storage_unavailable") return { ok: false, failure: { kind: "storage-read-unavailable", product: input.product } };
  if (reread.status === "missing") return { ok: false, failure: { kind: "plan-missing" } };
  if (reread.status === "invalid") return { ok: false, failure: { kind: "plan-invalid" } };
  if (reread.status === "fingerprint_mismatch") return { ok: false, failure: { kind: "fingerprint-mismatch" } };
  if (reread.status === "expired") return { ok: false, failure: { kind: "plan-expired" }, currentPlan: reread.plan };
  const prepared = prepareDealsGuidedActivation(reread.plan, input.renderedPlan, input.product, input.search, input.fingerprint, input.now, input.locale);
  if (!prepared.ok) {
    const kind = prepared.reason === "expired" ? "plan-expired" : prepared.reason === "product-missing" ? "incomplete" : prepared.reason;
    const productFailure = kind === "product-expired" || kind === "selection-changed" || kind === "action-unavailable";
    return { ok: false, failure: productFailure ? { kind, product: input.product } : { kind }, currentPlan: reread.plan };
  }
  if (!input.write(prepared.plan)) return { ok: false, failure: { kind: "persistence-failed", product: input.product } };
  return prepared;
}

export function prepareDealsGuidedActivation(currentPlan: DealsTripPlan, renderedPlan: DealsTripPlan, product: DealsTripPlanProduct, search: DealsSearch, fingerprint: string, now: number, locale: string): DealsGuidedActivationResult {
  const validation = validateDealsGuidedHandoffPlan(currentPlan, search, fingerprint, now);
  if (!validation.ok) return validation;
  const current = currentPlan[product], rendered = renderedPlan[product];
  if (!current || !rendered) return { ok: false, reason: "product-missing" };
  if (current.id !== rendered.id) return { ok: false, reason: "selection-changed" };
  const currentStep = getDealsHandoffSteps(currentPlan, now, locale, validation.products).find(step => step.product === product);
  const renderedStep = getDealsHandoffSteps(renderedPlan, now, locale, validation.products).find(step => step.product === product);
  if (!currentStep?.href) return { ok: false, reason: "action-unavailable" };
  if (currentStep.href !== renderedStep?.href) return { ok: false, reason: "selection-changed" };
  return { ok: true, plan: markDealsProviderOpened(currentPlan, product, now), href: currentStep.href };
}

export const getDealsGuidedOpenedCount = (plan: DealsTripPlan) => getDealsGuidedProducts(plan).filter(product => Boolean(plan.opened[product])).length;
export const getDealsGuidedEstimatedTotal = (plan: DealsTripPlan, currency: string, rates: ExchangeRates) => getDealsTripPlanEstimatedTotal(getDealsReviewTotalPlan(plan), currency, rates);
