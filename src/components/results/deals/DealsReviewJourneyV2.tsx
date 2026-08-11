"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import {
  formatCurrency,
  formatDisplayPrice,
} from "@/lib/currency/formatCurrency";
import {
  applyDealsJourneyEventV2,
  getRequiredDealsJourneyStateV2,
} from "@/lib/deals/dealsJourneyEngineV2";
import { buildDealsJourneyUrl } from "@/lib/deals/dealsJourneyRoutes";
import { clearDealsFlightRuntimeV2 } from "@/lib/deals/dealsFlightRuntimeStorageV2";
import {
  getDealsReviewItemsV2,
  getDealsTripPlanV2EstimatedTotal,
} from "@/lib/deals/dealsReviewPresentationV2";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import {
  getDealsTripPlanV2NextDeadline,
  type DealsTripPlanV2,
  type DealsV2DeadlineKind,
} from "@/lib/deals/dealsTripPlanV2";

export function DealsReviewJourneyV2({
  search,
  plan,
  onPlanChange,
  onChangeFlight,
  onChangeCar,
  onSessionExpired,
  onLifecycleInvalidated,
}: {
  search: DealsSearch;
  plan: DealsTripPlanV2;
  onPlanChange: (plan: DealsTripPlanV2) => void;
  onChangeFlight: (plan: DealsTripPlanV2) => void;
  onChangeCar: () => void;
  onSessionExpired: () => void;
  onLifecycleInvalidated: (
    kind: DealsV2DeadlineKind,
    plan: DealsTripPlanV2,
  ) => void;
}) {
  const router = useRouter();
  const { locale } = useLocale();
  const { selectedCurrency } = useRegion();
  const rates = useCurrencyRates();
  const [reviewed, setReviewed] = useState<{
    reviewedRevision: number;
    searchFingerprint: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [blockedBy, setBlockedBy] = useState<DealsV2DeadlineKind | null>(null);
  const items = useMemo(
    () => getDealsReviewItemsV2(plan, locale),
    [locale, plan],
  );
  const total = getDealsTripPlanV2EstimatedTotal(
    plan,
    selectedCurrency,
    rates.rates,
  );

  useEffect(() => {
    const scheduledRevision = plan.revision;
    const scheduledFingerprint = plan.searchFingerprint;
    const deadline = getDealsTripPlanV2NextDeadline(plan);
    const timer = window.setTimeout(
      () => {
        const latest = plan;
        if (
          latest.revision !== scheduledRevision ||
          latest.searchFingerprint !== scheduledFingerprint
        )
          return;
        const now = Date.now();
        const currentDeadline = getDealsTripPlanV2NextDeadline(latest);
        if (currentDeadline.expiresAt > now) return;
        setReviewed(null);
        if (
          currentDeadline.kind === "plan" ||
          currentDeadline.kind === "hotel"
        ) {
          setBlockedBy(currentDeadline.kind);
          return;
        }
        onLifecycleInvalidated(currentDeadline.kind, latest);
      },
      Math.max(0, deadline.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [onLifecycleInvalidated, plan]);

  const confirmReview = () => {
    const now = Date.now();
    setReviewed(null);
    const result = applyDealsJourneyEventV2(
      plan,
      search,
      { type: "REVIEW_CONTINUE_REQUESTED", expectedRevision: plan.revision },
      now,
    );
    if (result.ok && result.nextState === "handoff") {
      setReviewed({
        reviewedRevision: plan.revision,
        searchFingerprint: plan.searchFingerprint,
      });
      setMessage("");
      return;
    }
    setMessage(
      result.ok === false && result.reason === "expired-plan"
        ? "Your package session expired. Refresh availability to continue."
        : "Your selections changed or expired. Review the recovered package before continuing.",
    );
    onPlanChange(result.plan);
    const state = getRequiredDealsJourneyStateV2(result.plan, now);
    if (state.startsWith("flight"))
      onLifecycleInvalidated("flight-offer", result.plan);
    else if (state === "car") onLifecycleInvalidated("car", result.plan);
    else if (state === "hotel") onLifecycleInvalidated("hotel", result.plan);
  };

  if (blockedBy === "plan")
    return (
      <section
        role="alert"
        className="rounded-2xl border border-amber-300 bg-white p-6"
      >
        <p className="font-semibold">
          Your package session expired. Refresh availability to continue.
        </p>
        <button
          type="button"
          onClick={onSessionExpired}
          className="mt-4 min-h-11 rounded-xl bg-[#004BB8] px-5 font-bold text-white"
        >
          Refresh availability
        </button>
      </section>
    );
  if (blockedBy === "hotel")
    return (
      <section
        role="alert"
        className="rounded-2xl border border-amber-300 bg-white p-6"
      >
        <p className="font-semibold">
          Your hotel selection expired. Return to the hotel step to choose it
          again.
        </p>
        <button
          type="button"
          onClick={() => {
            clearDealsFlightRuntimeV2(sessionStorage);
            router.push(buildDealsJourneyUrl("hotel-results", search));
          }}
          className="mt-4 min-h-11 rounded-xl bg-[#004BB8] px-5 font-bold text-white"
        >
          Return to hotel results
        </button>
      </section>
    );

  if (
    reviewed?.reviewedRevision === plan.revision &&
    reviewed.searchFingerprint === plan.searchFingerprint
  )
    return (
      <section
        data-deals-v2-review-confirmed
        className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6"
      >
        <h2 className="text-2xl font-extrabold">Review confirmed</h2>
        <p className="mt-2 font-semibold">
          Your package is ready for the handoff step.
        </p>
        <p className="mt-2 text-sm">
          No provider has been opened and no booking has been started.
        </p>
      </section>
    );

  return (
    <section
      data-deals-v2-review
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="space-y-4">
        <header className="rounded-2xl border border-blue-100 bg-white p-6">
          <h2 className="text-2xl font-extrabold">Review your package</h2>
          <p className="mt-2 text-slate-600">
            Confirm every current component before the handoff step.
          </p>
        </header>
        {items.map((item) => {
          const price = formatDisplayPrice({
            amount: item.sourcePrice,
            sourceCurrency: item.sourceCurrency,
            displayCurrency: selectedCurrency,
            convertSourceEstimate: true,
            rates: rates.rates,
            isFallbackRate: rates.isFallback,
          });
          return (
            <article
              key={item.product}
              className="rounded-2xl border border-slate-200 bg-white p-6"
              data-review-product={item.product}
            >
              <p className="text-sm font-bold uppercase text-blue-800">
                {item.product === "hotel"
                  ? "Hotel"
                  : item.product === "flight"
                    ? "Flight"
                    : "Car"}
              </p>
              <h3 className="mt-1 text-xl font-extrabold">{item.title}</h3>
              <p className="text-slate-600">{item.subtitle}</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase text-slate-500">
                    Provider
                  </dt>
                  <dd className="font-semibold">{item.provider}</dd>
                </div>
                {item.details.map((detail) => (
                  <div key={`${detail.label}-${detail.value}`}>
                    <dt className="text-xs font-bold uppercase text-slate-500">
                      {detail.label}
                    </dt>
                    <dd className="font-semibold">{detail.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Provider/source price
                </p>
                <p className="text-xl font-extrabold" dir="ltr">
                  {price.providerFormatted}
                </p>
                {price.isConvertedEstimate ? (
                  <p className="mt-1 text-sm font-semibold">
                    Estimated in {price.currency}: {price.formatted}
                  </p>
                ) : price.currency !== selectedCurrency.toUpperCase() ? (
                  <p className="mt-1 text-sm">
                    A {selectedCurrency} estimate is unavailable.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="focus-ring mt-5 min-h-11 rounded-xl border border-blue-700 px-4 font-bold text-blue-800"
                onClick={() => {
                  setReviewed(null);
                  if (item.product === "flight") onChangeFlight(plan);
                  else if (item.product === "car") onChangeCar();
                  else {
                    clearDealsFlightRuntimeV2(sessionStorage);
                    router.push(buildDealsJourneyUrl("hotel-results", search));
                  }
                }}
              >
                {item.product === "hotel"
                  ? "Change stay"
                  : item.product === "flight"
                    ? "Change flight"
                    : "Change car"}
              </button>
            </article>
          );
        })}
      </div>
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 xl:sticky xl:top-24">
        <h2 className="text-xl font-extrabold">Estimated package total</h2>
        <p className="mt-3 text-2xl font-extrabold">
          {total === null
            ? "Estimate unavailable"
            : formatCurrency(total, selectedCurrency)}
        </p>
        <p className="mt-4 text-sm text-slate-600">
          This is the sum of the current component estimates. It is not a final
          package quote, and provider prices may change before Handoff or
          booking.
        </p>
        {rates.isFallback && (
          <p className="mt-2 text-sm font-semibold text-amber-900">
            Emergency fallback exchange rates are being used for display
            estimates.
          </p>
        )}
        {message && (
          <p role="alert" className="mt-4 text-sm font-semibold text-amber-900">
            {message}
          </p>
        )}
        <button
          type="button"
          onClick={confirmReview}
          className="focus-ring mt-5 min-h-11 w-full rounded-xl bg-[#004BB8] px-4 font-bold text-white"
        >
          Confirm review
        </button>
      </aside>
    </section>
  );
}
