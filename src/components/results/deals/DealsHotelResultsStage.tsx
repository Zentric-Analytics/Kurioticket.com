"use client";

import { useMemo } from "react";
import { HotelResultsExperience } from "@/components/results/HotelResultsClient";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import { buildDealsHotelResultsSearchInput } from "@/lib/deals/dealsHotelResults";
import { buildDealsHotelDetailsJourneyUrl } from "@/lib/deals/dealsJourneyRoutes";

export function DealsHotelResultsStage({ search }: { search: DealsSearch }) {
  const searchInput = useMemo(() => buildDealsHotelResultsSearchInput(search), [search]);
  return (
    <HotelResultsExperience
      guided
      searchInput={searchInput}
      buildDetailsHref={(hotelId) => buildDealsHotelDetailsJourneyUrl(search, hotelId)}
    />
  );
}
