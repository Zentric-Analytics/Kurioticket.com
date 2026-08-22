"use client";

import { useCallback, useMemo } from "react";
import { FlightResultsClient } from "@/components/results/FlightResultsClient";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { buildDealsFlightDetailsSelection } from "@/lib/deals/dealsFlightDetails";
import { buildDealsFlightResultsSearchInput } from "@/lib/deals/dealsFlightResults";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import type { DealsTripPlanFlight } from "@/lib/deals/dealsTripPlan";
import type { PublicFlightResult } from "@/lib/types";
import { translations as en } from "@/lib/i18n/en";

export function DealsStableFlightResultsStage({
  search,
  onSelectFlight,
}: {
  search: DealsSearch;
  onSelectFlight: (selection: DealsTripPlanFlight) => void;
}) {
  const { t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const t = useCallback(
    (key: string) => dictionary[key] ?? en[key] ?? key,
    [dictionary],
  );
  const searchInput = useMemo(
    () => buildDealsFlightResultsSearchInput(search, selectedOption.currency),
    [search, selectedOption.currency],
  );
  const select = useCallback(
    (flight: PublicFlightResult) => {
      const selection = buildDealsFlightDetailsSelection({
        flight,
        requestedFlightId: flight.id,
        search,
        resultReceivedAt: Date.now(),
      });
      if (selection) onSelectFlight(selection);
    },
    [onSelectFlight, search],
  );

  return (
    <FlightResultsClient
      presentationMode="deals-guided"
      searchInput={searchInput}
      actionLabel={t("deals.guided.flightDetails.choose")}
      actionAriaLabel={(flight) =>
        t("deals.guided.flightResults.viewDetailsAria")
          .replace("{{airline}}", flight.airlineName)
          .replace("{{origin}}", flight.originAirport)
          .replace("{{destination}}", flight.destinationAirport)
      }
      onSelectFlight={select}
    />
  );
}
