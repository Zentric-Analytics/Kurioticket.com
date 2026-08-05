"use client";

import { useCallback, useMemo, useState } from "react";
import { FlightDetailsExperience } from "@/components/results/FlightDetailsClient";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as en } from "@/lib/i18n/en";
import { buildDealsFlightDetailsSelection, getEffectiveDealsFlightDetailsId, isCurrentDealsFlightDetailsResponse } from "@/lib/deals/dealsFlightDetails";
import { getIncludedProducts, type DealsSearch } from "@/lib/deals/dealsSearchParams";
import type { DealsTripPlan, DealsTripPlanFlight } from "@/lib/deals/dealsTripPlan";
import type { PublicFlightResult } from "@/lib/types";

export function DealsFlightDetailsStage({ search, flightId, plan, confirming, confirmationError, onConfirm }: { search: DealsSearch; flightId: string | null; plan: DealsTripPlan | null; confirming: boolean; confirmationError: string; onConfirm: (selection: DealsTripPlanFlight) => void }) {
  const { t: dictionary } = useLocale();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const effectiveId = getEffectiveDealsFlightDetailsId(flightId, plan?.flight ?? null);
  const [loaded, setLoaded] = useState<{ flight: PublicFlightResult; receivedAt: number } | null>(null);
  const handleFlightLoaded = useCallback((flight: PublicFlightResult | null, resultReceivedAt: number | null) => {
    setLoaded(flight && resultReceivedAt !== null ? { flight, receivedAt: resultReceivedAt } : null);
  }, []);
  const selection = useMemo(() => loaded && effectiveId ? buildDealsFlightDetailsSelection({ flight: loaded.flight, requestedFlightId: effectiveId, search, resultReceivedAt: loaded.receivedAt }) : null, [effectiveId, loaded, search]);
  const includesCar = getIncludedProducts(search.mode).car;
  const label = includesCar ? t("deals.guided.flightDetails.confirmCars") : t("deals.guided.flightDetails.confirmReview");
  const accessibleLabel = selection ? (includesCar ? t("deals.guided.flightDetails.confirmCarsA11y") : t("deals.guided.flightDetails.confirmReviewA11y")).replace("{airline}", selection.airline).replace("{origin}", selection.origin).replace("{destination}", selection.destination) : label;
  const unavailableMessage = t("deals.guided.flightDetails.unavailableConfirm");
  return <FlightDetailsExperience id={effectiveId} mode="guided" onFlightLoaded={handleFlightLoaded} primaryAction={{ kind: "guided-flight", enabled: Boolean(selection && effectiveId && isCurrentDealsFlightDetailsResponse(effectiveId, loaded?.flight)), pending: confirming, label, accessibleLabel, unavailableMessage, error: confirmationError, onActivate: () => { if (selection && !confirming) onConfirm(selection); } }} />;
}
