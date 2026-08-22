"use client";

import { HotelDetailsClient } from "@/components/results/HotelDetailsClient";
import { buildDealsHotelDetailsRequestContext, getEffectiveDealsHotelDetailsId } from "@/lib/deals/dealsHotelDetails";
import type { DealsSearch } from "@/lib/deals/dealsSearchParams";
import type { DealsTripPlan, DealsTripPlanHotel } from "@/lib/deals/dealsTripPlan";

export function DealsHotelDetailsStage({ search, hotelId, plan, confirming, confirmationError, onConfirm }: { search: DealsSearch; hotelId: string | null; plan: DealsTripPlan | null; confirming: boolean; confirmationError: string; onConfirm: (selection: DealsTripPlanHotel) => void }) {
  const effectiveHotelId = getEffectiveDealsHotelDetailsId(hotelId, plan?.hotel ?? null);
  if (!effectiveHotelId) return null;
  const requestContext = buildDealsHotelDetailsRequestContext(search, effectiveHotelId);
  return (
    <section aria-labelledby="guided-hotel-details-stage" className="mt-6 min-w-0">
      <h2 id="guided-hotel-details-stage" className="sr-only">Hotel room details</h2>
      <HotelDetailsClient id={effectiveHotelId} mode="guided" requestContext={requestContext} searchContext={{ destination: search.hotelDestination, checkIn: search.hotelCheckIn, checkOut: search.hotelCheckOut, guests: requestContext.guests, rooms: requestContext.rooms }} guidedSearch={search} confirming={confirming} confirmationError={confirmationError} onGuidedSelection={onConfirm} />
    </section>
  );
}
