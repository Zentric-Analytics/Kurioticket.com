import type { PublicHotelResult } from "@/lib/types";

/** Gateway HTML and malformed payloads must never become customer-facing errors. */
export async function readHotelSearchResponse(
  response: Response,
  unavailableMessage: string,
  localizeError?: (data: { error?: unknown }) => string,
  unsupportedMessage = unavailableMessage,
) {
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(unavailableMessage);
  }
  const body = data && typeof data === "object"
    ? data as { error?: unknown; results?: unknown; warningCategory?: unknown; status?: unknown; requestId?: unknown }
    : undefined;
  const publicResults = (results: PublicHotelResult[], requestId: unknown) => ({
    results,
    ...(typeof requestId === "string" ? { requestId } : {}),
  });
  // Older servers can attach a failure category to a partial response.
  if (response.ok && Array.isArray(body?.results) && body.results.length > 0) return publicResults(body.results, body.requestId);
  if (body?.warningCategory === "unsupported_search") {
    throw new Error(unsupportedMessage);
  }
  if (body && !response.ok && body.warningCategory !== "provider_unavailable" && localizeError) {
    throw new Error(localizeError(body));
  }
  if (!response.ok || !Array.isArray(body?.results) ||
      body.status === "unavailable" || body.warningCategory === "provider_unavailable") {
    throw new Error(unavailableMessage);
  }
  return publicResults(body.results, body.requestId);
}
