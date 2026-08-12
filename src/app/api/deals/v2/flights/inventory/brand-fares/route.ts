import { dealsFlightInventorySessions } from "@/services/travel/dealsFlightInventorySession";
import { body, brandSelectionSchema, inventoryFailure, json } from "../api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = brandSelectionSchema
    .required({ returnItineraryKey: true })
    .safeParse(await body(request));
  if (!parsed.success)
    return json({ status: "error", code: "MALFORMED_REQUEST" }, 400);
  try {
    const fares = await dealsFlightInventorySessions.brandFares(
      parsed.data.inventoryToken,
      parsed.data.sourceSearchKey,
      parsed.data.outboundItineraryKey,
      parsed.data.brandOptionKey,
      parsed.data.returnItineraryKey,
    );
    return fares.length
      ? json({ status: "success", fares })
      : json({ status: "error", code: "INVALID_SELECTION" }, 422);
  } catch (error) {
    return inventoryFailure(error);
  }
}
