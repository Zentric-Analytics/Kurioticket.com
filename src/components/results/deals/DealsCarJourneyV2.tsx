"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { buildDealsProductSearchKeys } from "@/lib/deals/dealsProductSearchKeys";
import {
  applyDealsJourneyEventV2,
  getRequiredDealsJourneyStateV2,
} from "@/lib/deals/dealsJourneyEngineV2";
import type { DealsTripPlanCar } from "@/lib/deals/dealsTripPlan";
import {
  getDealsTripPlanV2NextDeadline,
  type DealsTripPlanV2,
  type DealsV2DeadlineKind,
} from "@/lib/deals/dealsTripPlanV2";
import { DealsCarDetailsStage } from "./DealsCarDetailsStage";
import { DealsCarResultsStage } from "./DealsCarResultsStage";

export function DealsCarJourneyV2({
  search,
  plan,
  onPlanChange,
  onFlightExpired,
  onSessionExpired,
}: {
  search: DealsSearch;
  plan: DealsTripPlanV2;
  onPlanChange: (plan: DealsTripPlanV2) => void;
  onFlightExpired: () => void;
  onSessionExpired: () => void;
}) {
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(!plan.car);
  const [confirmationError, setConfirmationError] = useState("");
  const [lifecycleNow, setLifecycleNow] = useState(() => Date.now());
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
        setLifecycleNow(now);
        const current = getDealsTripPlanV2NextDeadline(plan);
        if (current.expiresAt > now) return;
        setCandidateId(null);
        setConfirmationError("");
        setShowResults(true);
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
      setCandidateId(null);
      setRecovery({ revision: plan.revision, kind: "plan" });
      return;
    }
    if (deadline.expiresAt <= now && deadline.kind === "hotel") {
      setCandidateId(null);
      setRecovery({ revision: plan.revision, kind: "hotel" });
      return;
    }
    if (
      plan.flightJourney?.phase !== "confirmed" ||
      !plan.flightJourney.confirmedOffer ||
      plan.flightJourney.confirmedOffer.offerExpiresAt <= now
    ) {
      setCandidateId(null);
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
            : "This car could not be confirmed. Refresh it and try again.",
      );
      return;
    }
    onPlanChange(result.plan);
    setCandidateId(null);
    setShowResults(false);
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

  const requiredState = getRequiredDealsJourneyStateV2(plan, lifecycleNow);
  if (plan.car && !showResults && requiredState === "review") {
    const car = plan.car;
    return (
      <section
        aria-labelledby="confirmed-car-heading"
        className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6"
        data-deals-v2-car-confirmed
      >
        <h2 id="confirmed-car-heading" className="text-xl font-extrabold">
          Car confirmed
        </h2>
        <p className="mt-2 font-semibold">
          {car.rentalCompany} · {car.modelName}
        </p>
        <p className="mt-1">{car.categoryLabel}</p>
        <p className="mt-2">
          {car.pickupLocation} → {car.returnLocation}
        </p>
        <p className="mt-1">
          {car.pickupDate} {car.pickupTime} – {car.dropoffDate}{" "}
          {car.dropoffTime}
        </p>
        <p className="mt-2 text-lg font-extrabold">
          Car component: {car.sourceCurrency} {car.sourcePrice}
        </p>
        <p className="mt-2 text-sm font-semibold">
          Your package selections are ready for review.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => setShowResults(true)}
        >
          Choose another car
        </Button>
      </section>
    );
  }

  if (candidateId) {
    return (
      <section data-deals-v2-car-details>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setCandidateId(null)}
        >
          Back to car results
        </Button>
        <DealsCarDetailsStage
          search={search}
          carId={candidateId}
          plan={plan}
          confirming={false}
          confirmationError={confirmationError}
          onConfirm={confirm}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="v2-car-results-heading" data-deals-v2-car-results>
      <h2 id="v2-car-results-heading" className="text-2xl font-extrabold">
        Choose your car
      </h2>
      <DealsCarResultsStage
        search={search}
        onSelectCar={(car) => {
          setConfirmationError("");
          setCandidateId(car.id);
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
