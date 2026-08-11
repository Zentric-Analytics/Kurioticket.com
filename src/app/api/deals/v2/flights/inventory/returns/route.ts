import { dealsFlightInventorySessions } from "@/services/travel/dealsFlightInventorySession";
import { body, inventoryFailure, json, selectionSchema } from "../api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const parsed = selectionSchema
    .omit({ returnItineraryKey: true })
    .safeParse(await body(request));
  if (!parsed.success)
    return json({ status: "error", code: "MALFORMED_REQUEST" }, 400);
  try {
    const choices = await dealsFlightInventorySessions.returns(
      parsed.data.inventoryToken,
      parsed.data.sourceSearchKey,
      parsed.data.outboundItineraryKey,
    );
    return json({ status: "success", returnChoices: choices });
  } catch (error) {
    return inventoryFailure(error);
  }
}
