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
import type { DealsTripPlanV2 } from "@/lib/deals/dealsTripPlanV2";
import { DealsCarDetailsStage } from "./DealsCarDetailsStage";
import { DealsCarResultsStage } from "./DealsCarResultsStage";

export function DealsCarJourneyV2({
  search,
  plan,
  onPlanChange,
  onFlightExpired,
}: {
  search: DealsSearch;
  plan: DealsTripPlanV2;
  onPlanChange: (plan: DealsTripPlanV2) => void;
  onFlightExpired: () => void;
}) {
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(!plan.car);
  const [confirmationError, setConfirmationError] = useState("");

  useEffect(() => {
    const expiresAt = plan.flightJourney?.confirmedOffer?.offerExpiresAt;
    if (!expiresAt) return;
    const timer = window.setTimeout(
      onFlightExpired,
      Math.max(0, expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [onFlightExpired, plan.flightJourney?.confirmedOffer?.offerExpiresAt]);

  const confirm = (car: DealsTripPlanCar) => {
    const now = Date.now();
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

  if (plan.car && !showResults) {
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
        {getRequiredDealsJourneyStateV2(plan) === "review" && (
          <p className="mt-2 text-sm font-semibold">
            Your package selections are ready for review.
          </p>
        )}
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
