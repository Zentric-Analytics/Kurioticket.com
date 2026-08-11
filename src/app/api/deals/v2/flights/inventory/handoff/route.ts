import { z } from "zod";
import { isStagingEnvironment } from "@/lib/stagingSafety";
import { activateDealsFlightHandoffV2 } from "@/services/travel/dealsFlightHandoffV2";
import { body, inventoryFailure, json, selectionSchema } from "../api";

export const runtime = "nodejs";
const schema = selectionSchema.extend({
  fareKey: z.string().startsWith("flight-fare-v3:").max(256),
});

export async function POST(request: Request) {
  if (isStagingEnvironment())
    return json(
      { status: "action-unavailable", code: "PREVIEW_DISABLED" },
      403,
    );
  const parsed = schema.safeParse(await body(request));
  if (!parsed.success) return json({ status: "invalid-selection" }, 422);
  try {
    const outcome = await activateDealsFlightHandoffV2(parsed.data);
    return json(outcome, outcome.status === "invalid-selection" ? 422 : 200);
  } catch (error) {
    return inventoryFailure(error);
  }
}
