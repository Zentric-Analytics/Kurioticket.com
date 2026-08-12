"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { buildDealsProductSearchKeys } from "@/lib/deals/dealsProductSearchKeys";
import { applyDealsJourneyEventV2 } from "@/lib/deals/dealsJourneyEngineV2";
import type { DealsTripPlanCar } from "@/lib/deals/dealsTripPlan";
import {
  getDealsTripPlanV2NextDeadline,
  type DealsTripPlanV2,
  type DealsV2DeadlineKind,
} from "@/lib/deals/dealsTripPlanV2";
import { DealsCarResultsStage } from "./DealsCarResultsStage";

export function DealsCarJourneyV2({
  search,
  plan,
  onPlanChange,
  onFlightExpired,
  onSessionExpired,
  editing = false,
  onBackToReview,
}: {
  search: DealsSearch;
  plan: DealsTripPlanV2;
  onPlanChange: (plan: DealsTripPlanV2) => void;
  onFlightExpired: () => void;
  onSessionExpired: () => void;
  editing?: boolean;
  onBackToReview?: () => void;
}) {
  const [confirmationError, setConfirmationError] = useState("");
  const [recovery, setRecovery] = useState<{
    revision: number;
    kind: DealsV2DeadlineKind;
  } | null>(null);

  useEffect(() => {
    if (recovery?.revision === plan.revision) return;
    const deadline = getDealsTripPlanV2NextDeadline(plan);
    const timer = window.setTimeout(
      () => {
        const now = Date.now();
        const current = getDealsTripPlanV2NextDeadline(plan);
        if (current.expiresAt > now) return;
        setConfirmationError("");
        if (current.kind === "flight-offer") onFlightExpired();
        else setRecovery({ revision: plan.revision, kind: current.kind });
      },
      Math.max(0, deadline.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [onFlightExpired, plan, recovery]);

  const confirm = (car: DealsTripPlanCar) => {
    const now = Date.now();
    const deadline = getDealsTripPlanV2NextDeadline(plan);
    if (plan.expiresAt <= now) {
      setRecovery({ revision: plan.revision, kind: "plan" });
      return;
    }
    if (deadline.expiresAt <= now && deadline.kind === "hotel") {
      setRecovery({ revision: plan.revision, kind: "hotel" });
      return;
    }
    if (
      plan.flightJourney?.phase !== "confirmed" ||
      !plan.flightJourney.confirmedOffer ||
      plan.flightJourney.confirmedOffer.offerExpiresAt <= now
    ) {
      onFlightExpired();
      return;
    }
    const result = applyDealsJourneyEventV2(
      plan,
      search,
      {
        type: "CAR_CONFIRMED",
        car,
        sourceSearchKey: buildDealsProductSearchKeys(search).car,
        expectedRevision: plan.revision,
      },
      now,
    );
    if (!result.ok) {
      setConfirmationError(
        result.nextState === "hotel"
          ? "Your hotel selection is no longer current. Return to the hotel step."
          : result.nextState.startsWith("flight")
            ? "Your flight must be confirmed again before choosing this car."
            : "This car option could not be added to your Trip Plan. Refresh the options and try again.",
      );
      return;
    }
    onPlanChange(result.plan);
    setConfirmationError("");
  };

  if (recovery?.revision === plan.revision && recovery.kind === "plan")
    return (
      <LifecycleRecovery
        message="Your package session expired. Refresh availability to continue."
        action="Refresh availability"
        onAction={onSessionExpired}
      />
    );

  if (recovery?.revision === plan.revision && recovery.kind === "hotel")
    return (
      <LifecycleRecovery message="Your hotel selection expired. Return to the hotel step to choose it again." />
    );

  return (
    <section aria-labelledby="v2-car-results-heading" data-deals-v2-car-results>
      {editing && plan.car && onBackToReview && (
        <Button
          type="button"
          variant="secondary"
          className="mb-4"
          onClick={onBackToReview}
        >
          Back to review
        </Button>
      )}
      <h2 id="v2-car-results-heading" className="text-2xl font-extrabold">
        Car options for your trip
      </h2>
      {confirmationError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-900"
        >
          {confirmationError}
        </p>
      )}
      <DealsCarResultsStage
        search={search}
        onSelectCar={(car) => {
          setConfirmationError("");
          confirm(car);
        }}
      />
    </section>
  );
}

function LifecycleRecovery({
  message,
  action,
  onAction,
}: {
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-amber-300 bg-white p-6"
    >
      <p className="font-semibold">{message}</p>
      {action && onAction && (
        <Button type="button" className="mt-4" onClick={onAction}>
          {action}
        </Button>
      )}
    </section>
  );
}
