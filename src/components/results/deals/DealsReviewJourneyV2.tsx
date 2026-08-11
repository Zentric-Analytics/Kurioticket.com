"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import {
  formatCurrency,
  formatDisplayPrice,
} from "@/lib/currency/formatCurrency";
import {
  buildDealsReviewSnapshotV2,
  type DealsReviewSnapshotV2,
} from "@/lib/deals/dealsReviewLifecycleV2";
import {
  getDealsReviewItemsV2,
  getDealsTripPlanV2EstimatedTotal,
} from "@/lib/deals/dealsReviewPresentationV2";
import {
  getDealsTripPlanV2NextDeadline,
  type DealsTripPlanV2,
} from "@/lib/deals/dealsTripPlanV2";

export type DealsReviewActionOutcomeV2 =
  | { status: "stale" | "recovered" }
  | { status: "confirmed"; snapshot: DealsReviewSnapshotV2 };

export function DealsReviewJourneyV2({
  plan,
  onChangeFlight,
  onChangeCar,
  onChangeStay,
  onConfirmReview,
  onLifecycleDeadline,
}: {
  plan: DealsTripPlanV2;
  onChangeFlight: (snapshot: DealsReviewSnapshotV2) => void;
  onChangeCar: (snapshot: DealsReviewSnapshotV2) => void;
  onChangeStay: (snapshot: DealsReviewSnapshotV2) => void;
  onConfirmReview: (
    snapshot: DealsReviewSnapshotV2,
  ) => DealsReviewActionOutcomeV2;
  onLifecycleDeadline: (snapshot: DealsReviewSnapshotV2) => void;
}) {
  const { locale } = useLocale();
  const { selectedCurrency } = useRegion();
  const rates = useCurrencyRates();
  const [reviewed, setReviewed] = useState<DealsReviewSnapshotV2 | null>(null);
  const [message, setMessage] = useState("");
  const snapshot = useMemo(() => buildDealsReviewSnapshotV2(plan), [plan]);
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
    const deadline = getDealsTripPlanV2NextDeadline(plan);
    const timer = window.setTimeout(
      () => onLifecycleDeadline(snapshot),
      Math.max(0, deadline.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [onLifecycleDeadline, plan, snapshot]);

  const confirmReview = () => {
    setReviewed(null);
    const result = onConfirmReview(snapshot);
    if (result.status === "confirmed") {
      setReviewed(result.snapshot);
      setMessage("");
    } else if (result.status === "recovered") {
      setMessage(
        "Your selections changed or expired. Review the recovered package before continuing.",
      );
    }
  };

  if (
    reviewed?.revision === plan.revision &&
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
                  if (item.product === "flight") onChangeFlight(snapshot);
                  else if (item.product === "car") onChangeCar(snapshot);
                  else onChangeStay(snapshot);
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
