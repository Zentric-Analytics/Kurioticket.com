import { z } from "zod";
import { dealsFlightInventorySessions } from "@/services/travel/dealsFlightInventorySession";
import { revalidateFlightOffer } from "@/services/travel/flightOfferRevalidation";
import { body, inventoryFailure, json, selectionSchema } from "../api";
export const runtime = "nodejs";
const schema = selectionSchema.extend({
  fareKey: z.string().startsWith("flight-fare-v3:").max(256),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await body(request));
  if (!parsed.success) return json({ status: "invalid-selection" }, 422);
  try {
    const p = parsed.data;
    const loaded = await dealsFlightInventorySessions.resolve(
      p.inventoryToken,
      p.sourceSearchKey,
      p.outboundItineraryKey,
      p.returnItineraryKey,
      p.fareKey,
    );
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
