import { applicationMetadata, type ApplicationAttribution } from "@/lib/application-source";

export type SavedActivityType = "flight" | "hotel" | "car" | "search";
export type SavedActivityProduct = "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";

function safeReference(value: unknown): string | undefined {
  return typeof value === "string" && value.length >= 1 && value.length <= 128
    && /^[A-Za-z0-9._:-]+$/.test(value) ? value : undefined;
}

export function savedResultReference(
  type: SavedActivityType, payload: unknown, explicitCarResultId?: unknown,
): string | undefined {
  if (type === "car") {
    const direct = safeReference(explicitCarResultId);
    if (direct) return direct;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const data = payload as Record<string, unknown>;
  const field = type === "flight" ? data.flightResultId
    : type === "hotel" ? data.hotelResultId : undefined;
  const direct = safeReference(field);
  if (direct) return direct;
  const result = data.result;
  if (result && typeof result === "object" && !Array.isArray(result))
    return safeReference((result as Record<string, unknown>).id);
  return undefined;
}

/** Only explicit, bounded identifiers and confirmed server facts enter the audit event.
 * Saved/unsaved events share the same product contract on web, Android and iOS.
 * Historical events remain unchanged. Missing source attribution stays UNKNOWN.
 */
export function confirmedSavedActivityMetadata(input: {
  savedType: SavedActivityType;
  product: SavedActivityProduct;
  savedItemId: string;
  payload?: unknown;
  resultId?: unknown;
}, source: ApplicationAttribution = {}) {
  const resultId = savedResultReference(input.savedType, input.payload, input.resultId);
  return {
    product: input.product,
    savedType: input.savedType,
    savedItemId: input.savedItemId,
    ...(resultId ? { resultId } : {}),
    outcome: "confirmed",
    ...applicationMetadata(source),
  };
}
