import { z } from "zod";
import { dealsFlightInventorySessions } from "@/services/travel/dealsFlightInventorySession";
import { revalidateFlightOffer } from "@/services/travel/flightOfferRevalidation";
import { body, inventoryFailure, json, selectionSchema } from "../api";
export const runtime = "nodejs";
const schema = selectionSchema.extend({
  fareKey: z.string().startsWith("flight-fare-v3:").max(256),
  brandOptionKey: z.string().startsWith("flight-brand-v1:").max(256).optional(),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await body(request));
  if (!parsed.success) return json({ status: "invalid-selection" }, 422);
  try {
    const p = parsed.data;
    const session = await dealsFlightInventorySessions.load(
      p.inventoryToken,
      p.sourceSearchKey,
    );
    if (
      session.itineraryGraph &&
      session.search.tripType === "round-trip" &&
      !p.brandOptionKey
    )
      return json({ status: "invalid-selection" }, 422);
    const loaded = p.brandOptionKey
      ? p.returnItineraryKey
        ? await dealsFlightInventorySessions.resolveBrandFare(
            p.inventoryToken,
            p.sourceSearchKey,
            p.outboundItineraryKey,
            p.brandOptionKey,
            p.returnItineraryKey,
            p.fareKey,
          )
        : null
      : await dealsFlightInventorySessions.resolve(
          p.inventoryToken,
          p.sourceSearchKey,
          p.outboundItineraryKey,
          p.returnItineraryKey,
          p.fareKey,
        );
    if (!loaded) return json({ status: "invalid-selection" }, 422);
    if (!loaded.offer) return json({ status: "invalid-selection" }, 422);
    const outcome = await revalidateFlightOffer({
      cachedOffer: loaded.offer,
      search: loaded.search,
      outboundItineraryKey: p.outboundItineraryKey,
      returnItineraryKey: p.returnItineraryKey,
      fareKey: p.fareKey,
      now: Date.now(),
    });
    return json(outcome);
  } catch (error) {
    return inventoryFailure(error);
  }
}
