"use client";

import { useCallback, useMemo } from "react";
import type { PublicFlightResult } from "@/lib/types";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { FlightResultsClient } from "@/components/results/FlightResultsClient";
import { buildDealsFlightDetailsJourneyUrl, buildDealsFlightResultsSearchInput } from "@/lib/deals/dealsFlightResults";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { translations as en } from "@/lib/i18n/en";

export function DealsFlightResultsStage({ search }: { search: DealsSearch }) {
  const { t: dictionary } = useLocale();
  const { selectedOption } = useRegion();
  const t = useCallback((key: string) => dictionary[key] ?? en[key] ?? key, [dictionary]);
  const searchInput = useMemo(() => buildDealsFlightResultsSearchInput(search, selectedOption.currency), [search, selectedOption.currency]);
  const buildDetailsHref = useCallback((flight: PublicFlightResult) => buildDealsFlightDetailsJourneyUrl(search, flight.id), [search]);
  const actionAriaLabel = useCallback((flight: PublicFlightResult) => t("deals.guided.flightResults.viewDetailsAria").replace("{{airline}}", flight.airlineName).replace("{{origin}}", flight.originAirport).replace("{{destination}}", flight.destinationAirport), [t]);
  return <FlightResultsClient presentationMode="deals-guided" searchInput={searchInput} buildDetailsHref={buildDetailsHref} actionLabel={t("deals.guided.flightResults.viewDetails")} actionAriaLabel={actionAriaLabel} />;
}
