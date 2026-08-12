import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseUnavailableError } from "@/lib/prisma";
import { DealsFlightInventoryError } from "@/services/travel/dealsFlightInventorySession";

export const noStore = { "Cache-Control": "no-store" };
export const selectionSchema = z
  .object({
    inventoryToken: z.string().min(32).max(256),
    sourceSearchKey: z.string().min(1).max(1000),
    outboundItineraryKey: z.string().min(1).max(4000),
    returnItineraryKey: z.string().min(1).max(4000).optional(),
  })
  .strict();
export const brandSelectionSchema = selectionSchema.extend({
  brandOptionKey: z.string().startsWith("flight-brand-v1:").max(256),
});
export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: noStore });
export function inventoryFailure(error: unknown) {
  if (error instanceof DealsFlightInventoryError) {
    const status =
      error.code === "unknown-inventory"
        ? 404
        : error.code === "inventory-expired"
          ? 410
          : error.code === "stale-search"
            ? 409
            : 500;
    return json(
      { status: "error", code: error.code.toUpperCase().replaceAll("-", "_") },
      status,
    );
  }
  if (
    error instanceof DatabaseUnavailableError ||
    (error instanceof Error && /database|prisma|connect/i.test(error.message))
  )
    return json({ status: "unavailable", code: "STORAGE_UNAVAILABLE" }, 503);
  return json({ status: "unavailable", code: "STORAGE_UNAVAILABLE" }, 503);
}
export async function body(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
