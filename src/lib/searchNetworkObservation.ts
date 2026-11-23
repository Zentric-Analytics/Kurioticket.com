import { isIP } from "node:net";
import { isIsoCountryCode, normalizeCountryCode } from "@/lib/geo/context";
import { publicVisitorIp, resolveIpinfoLiteCountryContext } from "@/lib/geo/ipinfo";

/** Capture only a trusted ingress observation at search time. Never infer a
 * search IP/country from account sessions, a destination, or untrusted XFF. */
export type SearchNetworkObservation = { ipAddress: string | null; countryCode: string | null };

export function searchNetworkObservation(request: Request, trustedEdge = process.env.RENDER === "true") {
  if (!trustedEdge) return {};
  const ip = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  const country = normalizeCountryCode(request.headers.get("cf-ipcountry"));
  const ipAddress = publicVisitorIp(ip);
  const countryCode = country && isIsoCountryCode(country) ? country : null;
  if (!ipAddress && !countryCode) return {};
  return { searchNetwork: { ipAddress, countryCode } };
}

/** Read only the allowlisted, validated fields from a saved search's JSON.
 * Call from the admin-authorized detail read, never from list or public APIs. */
export function recordedSearchNetwork(query: unknown): SearchNetworkObservation {
  if (!query || typeof query !== "object" || Array.isArray(query)) {
    return { ipAddress: null, countryCode: null };
  }
  const value = (query as Record<string, unknown>).searchNetwork;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ipAddress: null, countryCode: null };
  }
  const record = value as Record<string, unknown>;
  const ipAddress = typeof record.ipAddress === "string" && isIP(record.ipAddress)
    ? record.ipAddress : null;
  const country = typeof record.countryCode === "string" ? normalizeCountryCode(record.countryCode) : undefined;
  const countryCode = country && isIsoCountryCode(country) ? country : null;
  return { ipAddress, countryCode };
}

type SearchCountryLookup = (ip: string) => Promise<string | null>;

/** Enrich only a verified search-time public IP, never the current user's
 * account location or this application's server location. Called by the
 * optional history writer after the search response has been prepared.
 * The injected lookup allows fully offline, deterministic tests. */
export async function completeSearchNetworkObservation(
  query: Record<string, unknown>,
  countryLookup: SearchCountryLookup = async ip =>
    (await resolveIpinfoLiteCountryContext(ip, { allowMeFallback: false }))?.countryCode ?? null,
): Promise<Record<string, unknown>> {
  const observed = recordedSearchNetwork(query);
  if (!observed.ipAddress || observed.countryCode || publicVisitorIp(observed.ipAddress) !== observed.ipAddress) {
    return query;
  }
  try {
    const lookedUp = normalizeCountryCode(await countryLookup(observed.ipAddress));
    if (!isIsoCountryCode(lookedUp)) return query;
    return {
      ...query,
      searchNetwork: { ipAddress: observed.ipAddress, countryCode: lookedUp },
    };
  } catch {
    // Optional geolocation is never allowed to suppress a legitimate search.
    return query;
  }
}
