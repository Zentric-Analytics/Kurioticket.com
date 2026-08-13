import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { DealsJourneyShell } from "@/components/results/deals/DealsJourneyShell";
import {
  parseDealsSearchParams,
  validateDealsSearch,
} from "@/lib/deals/dealsSearchParams";
import {
  isDealsJourneyStage,
  normalizeDealsJourneyCarId,
  normalizeDealsJourneyFlightId,
  normalizeDealsJourneyHotelId,
} from "@/lib/deals/dealsJourneyRoutes";
import { buildDealsSearchFingerprint } from "@/lib/deals/dealsTripPlan";
import { buildDealsPlanContextKey } from "@/lib/deals/dealsTripPlanStorage";

export const metadata: Metadata = { robots: { index: false, follow: false } };
type Query = Record<string, string | string[] | undefined>;

export default async function DealsJourneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ stage: string }>;
  searchParams: Promise<Query>;
}) {
  const [{ stage }, query] = await Promise.all([params, searchParams]);
  if (!isDealsJourneyStage(stage)) notFound();
  const search = parseDealsSearchParams(query);
  const invalid = Object.keys(validateDealsSearch(search)).length > 0;
  const hotelId = normalizeDealsJourneyHotelId(query.hotelId);
  const flightId = normalizeDealsJourneyFlightId(query.flightId);
  const carId = normalizeDealsJourneyCarId(query.carId);
  const contextKey = buildDealsPlanContextKey(
    "guided",
    buildDealsSearchFingerprint(search),
  );
  return (
    <>
      <AppHeader flushDesktopBottom hideDesktopTravelNav />
      <DealsJourneyShell
        key={contextKey}
        stage={stage}
        search={search}
        invalid={invalid}
        hotelId={hotelId}
        flightId={flightId}
        carId={carId}
      />
      <Footer />
    </>
  );
}
