import { isIP } from "node:net";
import { isIsoCountryCode, normalizeCountryCode } from "@/lib/geo/context";

/** Capture only a trusted ingress observation at search time. Never infer a
 * search IP/country from account sessions, a destination, or untrusted XFF. */
export type SearchNetworkObservation = { ipAddress: string | null; countryCode: string | null };

export function searchNetworkObservation(request: Request, trustedEdge = process.env.RENDER === "true") {
  if (!trustedEdge) return {};
  const ip = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  const country = normalizeCountryCode(request.headers.get("cf-ipcountry"));
  const ipAddress = isIP(ip) ? ip : null;
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
