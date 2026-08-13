import { flightSearchSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isFeatureEnabled } from "@/lib/feature-controls/service";
import { searchDuffelDealsItineraryInventory } from "@/services/travel/providers/duffelProvider";
import { dealsFlightInventorySessions } from "@/services/travel/dealsFlightInventorySession";
import { body, inventoryFailure, json } from "./api";
import {
  classifyDealsInventoryProviderFailure,
  logDealsInventoryProviderFailure,
} from "./providerFailure";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!(await isFeatureEnabled("FLIGHT_SEARCH_ENABLED")))
    return json({ status: "unavailable", code: "FEATURE_DISABLED" }, 503);
  if (
    !checkRateLimit(`deals-v2-flight:${getClientIp(request)}`, 35, 60_000)
      .allowed
  )
    return json({ status: "error", code: "RATE_LIMITED" }, 429);
  const parsed = flightSearchSchema.safeParse(await body(request));
  if (!parsed.success || parsed.data.tripType === "multi-city")
    return json({ status: "error", code: "MALFORMED_REQUEST" }, 400);
  try {
    const provider = await searchDuffelDealsItineraryInventory(parsed.data);
    if (provider.status !== "success") {
      logDealsInventoryProviderFailure(provider);
      const failure = classifyDealsInventoryProviderFailure(provider);
      return json(failure.body, failure.statusCode);
    }
    const inventory = provider.results[0];
    const created = inventory
      ? await dealsFlightInventorySessions.create(
          parsed.data,
          inventory.exactOffers,
          inventory.itineraryGraph,
        )
      : null;
    return created
      ? json({ status: "success", ...created })
      : json({ status: "empty", code: "NO_INVENTORY", outboundChoices: [] });
  } catch (error) {
    return inventoryFailure(error);
  }
}
