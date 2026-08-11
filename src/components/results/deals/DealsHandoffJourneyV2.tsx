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
  activateFlightHandoffV2,
  type DealsFlightHandoffOutcomeV2,
} from "@/lib/deals/dealsFlightInventoryClientV2";
import {
  getDealsReviewItemsV2,
  getDealsTripPlanV2EstimatedTotal,
} from "@/lib/deals/dealsReviewPresentationV2";
import type { DealsReviewSnapshotV2 } from "@/lib/deals/dealsReviewLifecycleV2";
import {
  getDealsTripPlanV2NextDeadline,
  type DealsTripPlanV2,
} from "@/lib/deals/dealsTripPlanV2";
import type { DealsFlightRuntimeV2 } from "@/lib/deals/dealsFlightRuntimeStorageV2";

export function DealsHandoffJourneyV2({
  plan,
  runtime,
  reviewedSnapshot,
  authorizeAction,
  onLifecycleDeadline,
  onFlightOutcome,
  onBackToReview,
}: {
  plan: DealsTripPlanV2;
  runtime: DealsFlightRuntimeV2;
  reviewedSnapshot: DealsReviewSnapshotV2;
  authorizeAction: (product: "hotel" | "flight" | "car") => boolean;
  onLifecycleDeadline: (snapshot: DealsReviewSnapshotV2) => void;
  onFlightOutcome: (outcome: DealsFlightHandoffOutcomeV2) => void;
  onBackToReview: () => void;
}) {
  const { locale } = useLocale();
  const { selectedCurrency } = useRegion();
  const rates = useCurrencyRates();
  const items = useMemo(
    () => getDealsReviewItemsV2(plan, locale),
    [locale, plan],
  );
  const [opened, setOpened] = useState<
    Partial<Record<"hotel" | "flight" | "car", boolean>>
  >({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const total = getDealsTripPlanV2EstimatedTotal(
    plan,
    selectedCurrency,
    rates.rates,
  );

  useEffect(() => {
    const deadline = getDealsTripPlanV2NextDeadline(plan);
    const timer = window.setTimeout(
      () => onLifecycleDeadline(reviewedSnapshot),
      Math.max(0, deadline.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [onLifecycleDeadline, plan, reviewedSnapshot]);

  const openInternal = (product: "hotel" | "car", path: string | undefined) => {
    if (!path || !authorizeAction(product)) return;
    const tab = window.open(path, "_blank", "noopener,noreferrer");
    if (!tab)
      return setMessage(
        "Your browser blocked the new tab. Allow popups and try again.",
      );
    tab.opener = null;
    setOpened((current) => ({ ...current, [product]: true }));
    setMessage("");
  };
  const openFlight = async () => {
    if (!authorizeAction("flight")) return;
    const tab = window.open("about:blank", "_blank");
    if (!tab)
      return setMessage(
        "Your browser blocked the new tab. Allow popups and try again.",
      );
    tab.opener = null;
    setBusy(true);
    setMessage("");
    try {
      const offer = plan.flightJourney?.confirmedOffer;
      if (!offer) throw new Error("invalid selection");
      const outcome = await activateFlightHandoffV2({
        inventoryToken: runtime.inventoryToken,
        sourceSearchKey: runtime.sourceSearchKey,
        outboundItineraryKey: offer.outboundItineraryKey,
        ...(offer.returnItineraryKey
          ? { returnItineraryKey: offer.returnItineraryKey }
          : {}),
        fareKey: offer.fareKey,
      });
      if (outcome.status === "ready" && authorizeAction("flight")) {
        tab.location.replace(outcome.url);
        setOpened((current) => ({ ...current, flight: true }));
      } else {
        tab.close();
        onFlightOutcome(outcome);
        setMessage(
          outcome.status === "action-unavailable"
            ? "A supported external booking link is not available for this flight right now."
            : outcome.status === "temporary-failure"
              ? "We couldn't refresh this flight right now. Try again."
              : "Your flight must be selected and confirmed again.",
        );
      }
    } catch {
      tab.close();
      setMessage("We couldn't activate this flight handoff. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const allOpened =
    items.length > 0 && items.every((item) => opened[item.product]);
  return (
    <section data-deals-v2-handoff className="space-y-6">
      <header className="rounded-2xl border border-blue-100 bg-white p-6">
        <h2 className="text-2xl font-extrabold">Open your handoff steps</h2>
        <p className="mt-2 text-slate-600">
          Open each provider or selected details page separately. No booking has
          been made and final prices remain with each provider.
        </p>
        <button
          type="button"
          onClick={onBackToReview}
          className="focus-ring mt-4 min-h-11 font-bold text-blue-800 underline"
        >
          Back to review
        </button>
      </header>
      {allOpened && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 font-bold">
          Handoff steps opened. Complete each booking with the provider or
          selected details page.
        </p>
      )}
      {message && (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 p-4 font-semibold text-amber-950"
        >
          {message}
        </p>
      )}
      <div className="grid gap-4">
        {items.map((item, index) => {
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
              data-handoff-product={item.product}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <p className="text-sm font-bold uppercase text-blue-800">
                Step {index + 1} of {items.length} ·{" "}
                {opened[item.product] ? "Opened" : "Next"}
              </p>
              <h3 className="mt-2 text-xl font-extrabold">
                {item.product === "hotel"
                  ? "Hotel"
                  : item.product === "flight"
                    ? "Flight"
                    : "Car"}
                : {item.title}
              </h3>
              <p className="mt-1 text-slate-600">{item.subtitle}</p>
              <p className="mt-3 font-bold" dir="ltr">
                Provider/source price: {price.providerFormatted}
              </p>
              <button
                type="button"
                disabled={busy && item.product === "flight"}
                onClick={() =>
                  item.product === "flight"
                    ? void openFlight()
                    : openInternal(
                        item.product,
                        item.product === "hotel"
                          ? plan.hotel?.detailsPath
                          : plan.car?.detailsPath,
                      )
                }
                className="focus-ring mt-4 min-h-11 rounded-xl bg-[#004BB8] px-4 font-bold text-white disabled:opacity-60"
              >
                {item.product === "flight"
                  ? busy
                    ? "Refreshing flight…"
                    : "Continue to flight provider"
                  : `Open selected ${item.product} details`}
              </button>
            </article>
          );
        })}
      </div>
      <aside className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="text-xl font-extrabold">Estimated package total</h3>
        <p className="mt-2 text-2xl font-extrabold">
          {total === null
            ? "Estimate unavailable"
            : formatCurrency(total, selectedCurrency)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          This is not a final package quote or a single package checkout.
        </p>
      </aside>
    </section>
  );
}
