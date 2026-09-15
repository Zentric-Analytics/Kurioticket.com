import type { NormalizedFlightResult } from "@/lib/types";
import {
  refreshExactFlightOffer,
  type RefreshExactFlightOffer,
} from "./flightOfferRevalidation";
import { resolveFlightHandoff, type FlightHandoff } from "./flightHandoff";
import { deriveFlightSearchFromOffer } from "./standaloneFlightDetails";
import { isFlightProviderOfferUsableAt } from "./flightOfferInventory";

export type FlightRedirectHandoffOutcome =
  | { status: "ready"; offer: NormalizedFlightResult; handoff: FlightHandoff }
  | { status: "changed" | "unavailable" };

export async function revalidateFlightRedirectHandoff({
  cachedOffer,
  now = Date.now(),
  refresh = refreshExactFlightOffer,
}: {
  cachedOffer: NormalizedFlightResult;
  now?: number;
  refresh?: RefreshExactFlightOffer;
}): Promise<FlightRedirectHandoffOutcome> {
  if (cachedOffer.provider === "KAYAK sandbox") {
    const handoff = isFlightProviderOfferUsableAt(cachedOffer, now)
      ? resolveFlightHandoff(cachedOffer)
      : null;
    return handoff ? { status: "ready", offer: cachedOffer, handoff } : { status: "unavailable" };
  }
  const search = deriveFlightSearchFromOffer(cachedOffer);
  if (!search) return { status: "unavailable" };
  const refreshed = await refresh({ cachedOffer, search, now });
  if (!refreshed.offer) return { status: "unavailable" };
  if (refreshed.status === "changed") return { status: "changed" };
  const handoff = resolveFlightHandoff(refreshed.offer);
  return handoff
    ? { status: "ready", offer: refreshed.offer, handoff }
    : { status: "unavailable" };
}
