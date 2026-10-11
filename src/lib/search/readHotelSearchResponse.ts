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
  if (data && typeof data === "object" && (data as { warningCategory?: unknown }).warningCategory === "unsupported_search") {
    throw new Error(unsupportedMessage);
  }
  if (data && typeof data === "object" && !response.ok &&
      (data as { warningCategory?: unknown }).warningCategory !== "provider_unavailable" && localizeError) {
    throw new Error(localizeError(data));
  }
  if (!response.ok || !data || typeof data !== "object" ||
      !Array.isArray((data as { results?: unknown }).results) ||
      (data as { status?: unknown }).status === "unavailable" ||
      (data as { warningCategory?: unknown }).warningCategory === "provider_unavailable") {
    throw new Error(unavailableMessage);
  }
  return data as { results: PublicHotelResult[]; warnings?: string[] };
}
