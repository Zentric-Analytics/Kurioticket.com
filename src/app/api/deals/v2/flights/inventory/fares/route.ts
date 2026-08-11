import { dealsFlightInventorySessions } from "@/services/travel/dealsFlightInventorySession";
import { body, inventoryFailure, json, selectionSchema } from "../api";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const parsed = selectionSchema.safeParse(await body(request));
  if (!parsed.success)
    return json({ status: "error", code: "MALFORMED_REQUEST" }, 400);
  try {
    const fares = await dealsFlightInventorySessions.fares(
      parsed.data.inventoryToken,
      parsed.data.sourceSearchKey,
      parsed.data.outboundItineraryKey,
      parsed.data.returnItineraryKey,
    );
    return fares.length
      ? json({ status: "success", fares })
      : json({ status: "error", code: "INVALID_SELECTION" }, 422);
  } catch (error) {
    return inventoryFailure(error);
  }
}
