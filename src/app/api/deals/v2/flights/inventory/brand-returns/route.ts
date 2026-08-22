import { dealsFlightInventorySessions } from "@/services/travel/dealsFlightInventorySession";
import { body, brandSelectionSchema, inventoryFailure, json } from "../api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = brandSelectionSchema
    .omit({ returnItineraryKey: true })
    .safeParse(await body(request));
  if (!parsed.success)
    return json({ status: "error", code: "MALFORMED_REQUEST" }, 400);
  try {
    const returnChoices = await dealsFlightInventorySessions.brandReturns(
      parsed.data.inventoryToken,
      parsed.data.sourceSearchKey,
      parsed.data.outboundItineraryKey,
      parsed.data.brandOptionKey,
    );
    return returnChoices.length
      ? json({ status: "success", returnChoices })
      : json({ status: "error", code: "INVALID_SELECTION" }, 422);
  } catch (error) {
    return inventoryFailure(error);
  }
}
