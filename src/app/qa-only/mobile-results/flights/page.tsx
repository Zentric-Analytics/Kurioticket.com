import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { FlightResultsClient } from "@/components/results/FlightResultsClient";

export default function QaFlightResultsPage() {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.QA_MOBILE_RESULTS_FIXTURE !== "1"
  ) {
    notFound();
  }

  return (
    <>
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
      />
      <FlightResultsClient
        searchInput={{
          tripType: "round-trip",
          origin: "SFO",
          destination: "LAX",
          departureDate: "2026-09-10",
          returnDate: "2026-09-12",
          adults: 1,
          children: 0,
          infants: 0,
          travelers: 1,
          cabinClass: "economy",
        }}
      />
    </>
  );
}
