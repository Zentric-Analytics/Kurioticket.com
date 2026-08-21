import type { NormalizedFlightResult } from "@/lib/types";

export type FlightHandoff = { providerName: string; url: URL };

function configuredPartners() {
  const raw = process.env.FLIGHT_HANDOFF_PARTNERS_JSON?.trim();
  if (!raw) return new Map<string, string>();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return new Map(
      Object.entries(parsed).flatMap(([hostname, name]) =>
        typeof name === "string" && name.trim()
          ? [[hostname.trim().toLowerCase(), name.trim()] as const]
          : [],
      ),
    );
  } catch {
    return new Map<string, string>();
  }
}
/** Resolves only an explicitly configured end-user booking destination. */
export function resolveFlightHandoff(
  offer: Pick<NormalizedFlightResult, "partnerRedirectUrl" | "bookingUrl">,
): FlightHandoff | null {
  const rawUrl = offer.partnerRedirectUrl.trim() || offer.bookingUrl.trim();
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const providerName = configuredPartners().get(url.hostname.toLowerCase());
  return providerName ? { providerName, url } : null;
}
