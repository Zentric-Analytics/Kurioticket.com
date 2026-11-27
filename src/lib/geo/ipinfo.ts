import { BlockList, isIP } from "node:net";

import { normalizeCountryCode } from "@/lib/geo/context";

export type CountryContext = {
  countryCode: string;
  country: string;
  continentCode?: string;
  continent?: string;
  source: "ipinfo-lite";
};

type IpinfoLiteResponse = {
  country_code?: unknown;
  country?: unknown;
  continent_code?: unknown;
  continent?: unknown;
};

type IpinfoLiteFallbackReason =
  | "missing_token"
  | "timeout"
  | "ip_lookup_forbidden_retrying_me"
  | "me_lookup_non_ok_status"
  | "non_ok_status"
  | "invalid_json"
  | "missing_country"
  | "request_error";

type IpinfoLiteEndpointMode = "ip" | "me";

type IpinfoLiteFallbackDiagnostic = {
  reason: IpinfoLiteFallbackReason;
  status?: number;
  hasVisitorIp: boolean;
  mode: IpinfoLiteEndpointMode;
  retriedMe?: boolean;
};

const DEFAULT_BASE_URL = "https://api.ipinfo.io/lite";
const REQUEST_TIMEOUT_MS = 5000;

const splitHeaderValues = (value: string | null) =>
  value
    ?.split(",")
    .map((item) => item.trim())
    .filter((item) => item && item.toLowerCase() !== "unknown") || [];

const normalizeIpCandidate = (value: string) => {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  const lower = trimmed.toLowerCase();

  if (!trimmed || lower === "localhost") return null;

  const bracketedIpv6 = trimmed.match(/^\[([^\]]+)](?::\d+)?$/);
  if (bracketedIpv6?.[1]) return bracketedIpv6[1];

  const ipv4WithPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (ipv4WithPort?.[1]) return ipv4WithPort[1];

  return trimmed;
};

// Numeric subnet checks normalize compressed, expanded and mixed IPv6 forms.
// Node also applies IPv4 rules to IPv4-mapped IPv6, so a different spelling
// cannot turn a private address into a public lookup input.
// Registries: https://www.iana.org/assignments/iana-ipv4-special-registry/
// https://www.iana.org/assignments/iana-ipv6-special-registry/
const nonPublicAddresses = new BlockList();
const publicExceptions = new BlockList();
const publicIpv6Space = new BlockList();
const mappedIpv4Space = new BlockList();
mappedIpv4Space.addSubnet("::ffff:0:0", 96, "ipv6");
publicIpv6Space.addSubnet("2000::", 3, "ipv6");
publicIpv6Space.addSubnet("64:ff9b::", 96, "ipv6");

for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) {
  nonPublicAddresses.addSubnet(network, prefix, "ipv4");
  // A well-known NAT64 address must not conceal a nonpublic IPv4 destination.
  nonPublicAddresses.addSubnet("64:ff9b::" + network, 96 + prefix, "ipv6");
}
for (const address of ["192.0.0.9", "192.0.0.10"]) {
  publicExceptions.addAddress(address, "ipv4");
  publicExceptions.addAddress("64:ff9b::" + address, "ipv6");
}
for (const [network, prefix] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
] as const) nonPublicAddresses.addSubnet(network, prefix, "ipv6");
// More-specific globally reachable assignments inside the IETF protocol block.
for (const address of ["2001:1::1", "2001:1::2", "2001:1::3"]) {
  publicExceptions.addAddress(address, "ipv6");
}
for (const [network, prefix] of [
  ["2001:3::", 32], ["2001:4:112::", 48], ["2001:20::", 28], ["2001:30::", 28],
] as const) publicExceptions.addSubnet(network, prefix, "ipv6");

const isPublicIp = (value: string) => {
  const ip = normalizeIpCandidate(value);
  // Zone identifiers describe a local interface, not a public visitor address.
  if (!ip || ip.includes("%")) return null;

  const version = isIP(ip);
  if (version !== 4 && version !== 6) return null;
  const family = version === 4 ? "ipv4" : "ipv6";
  // Only global-unicast/translation candidates and mapped IPv4 are eligible;
  // local, multicast, discard-only and compatible-address space is excluded.
  if (version === 6 && !mappedIpv4Space.check(ip, family) && !publicIpv6Space.check(ip, family)) return null;
  return !nonPublicAddresses.check(ip, family) || publicExceptions.check(ip, family) ? ip : null;
};

const firstPublicIp = (value: string | null) => splitHeaderValues(value).map(isPublicIp).find(Boolean) || null;

/** Enforce public routable IPs for search-level network observations. */
export const publicVisitorIp = (value: string | null): string | null =>
  value ? isPublicIp(value) : null;

export const extractVisitorIp = (headers: Pick<Headers, "get">): string | null =>
  firstPublicIp(headers.get("cf-connecting-ip")) ||
  firstPublicIp(headers.get("x-real-ip")) ||
  firstPublicIp(headers.get("x-forwarded-for")) ||
  firstPublicIp(headers.get("fly-client-ip"));

const readString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const logFallback = (diagnostic: IpinfoLiteFallbackDiagnostic) => {
  console.warn("[location] IPinfo Lite fallback", diagnostic);
};

const isAbortError = (error: unknown) => error instanceof Error && error.name === "AbortError";

type IpinfoLiteLookupResult =
  | { type: "success"; context: CountryContext }
  | { type: "non_ok_status"; status: number }
  | { type: "invalid_json" }
  | { type: "missing_country" };

const buildIpinfoLiteEndpoint = (token: string, mode: IpinfoLiteEndpointMode, visitorIp?: string) => {
  const path = mode === "ip" && visitorIp ? encodeURIComponent(visitorIp) : "me";

  return `${DEFAULT_BASE_URL}/${path}?token=${encodeURIComponent(token)}`;
};

const fetchIpinfoLiteCountryContext = async ({
  token,
  visitorIp,
  mode,
  signal,
}: {
  token: string;
  visitorIp?: string;
  mode: IpinfoLiteEndpointMode;
  signal: AbortSignal;
}): Promise<IpinfoLiteLookupResult> => {
  const response = await fetch(buildIpinfoLiteEndpoint(token, mode, visitorIp), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    return { type: "non_ok_status", status: response.status };
  }

  let payload: IpinfoLiteResponse;
  try {
    payload = (await response.json()) as IpinfoLiteResponse;
  } catch {
    return { type: "invalid_json" };
  }

  const countryCode = normalizeCountryCode(readString(payload.country_code));
  const country = readString(payload.country);

  if (!countryCode || !country) {
    return { type: "missing_country" };
  }

  const continentCode = normalizeCountryCode(readString(payload.continent_code));
  const continent = readString(payload.continent) || undefined;

  return {
    type: "success",
    context: {
      countryCode,
      country,
      continentCode,
      continent,
      source: "ipinfo-lite",
    },
  };
};

const logLookupFailure = ({
  result,
  hasVisitorIp,
  mode,
  retriedMe,
}: {
  result: Exclude<IpinfoLiteLookupResult, { type: "success" }>;
  hasVisitorIp: boolean;
  mode: IpinfoLiteEndpointMode;
  retriedMe?: boolean;
}) => {
  const reason =
    result.type === "non_ok_status" && mode === "me" && retriedMe ? "me_lookup_non_ok_status" : result.type;

  logFallback({
    reason,
    status: result.type === "non_ok_status" ? result.status : undefined,
    hasVisitorIp,
    mode,
    retriedMe,
  });
};

/** Resolve a country using the exact IP supplied for a request.
 * Strict callers disable the legacy /me fallback so the origin server's country
 * can never be mistaken for the search user's country. */
export const resolveIpinfoLiteCountryContext = async (
  visitorIp?: string | null, options: { allowMeFallback?: boolean; timeoutMs?: number } = {},
): Promise<CountryContext | null> => {
  const token = process.env.IPINFO_TOKEN?.trim();
  const hasVisitorIp = Boolean(visitorIp);
  const initialMode: IpinfoLiteEndpointMode = visitorIp ? "ip" : "me";
  let activeMode = initialMode;
  let retriedMe = false;

  if (!token) {
    logFallback({ reason: "missing_token", hasVisitorIp, mode: initialMode, retriedMe: false });
    return null;
  }

  const controller = new AbortController();
  const requestedTimeout = options.timeoutMs;
  const timeoutMs = typeof requestedTimeout === "number" && Number.isFinite(requestedTimeout)
    ? Math.max(1, Math.min(REQUEST_TIMEOUT_MS, requestedTimeout)) : REQUEST_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const initialResult = await fetchIpinfoLiteCountryContext({
      token,
      visitorIp: visitorIp || undefined,
      mode: initialMode,
      signal: controller.signal,
    });

    if (initialResult.type === "success") {
      return initialResult.context;
    }

    if (options.allowMeFallback !== false && visitorIp && initialResult.type === "non_ok_status" && initialResult.status === 403) {
      logFallback({
        reason: "ip_lookup_forbidden_retrying_me",
        status: initialResult.status,
        hasVisitorIp,
        mode: "ip",
        retriedMe: true,
      });

      activeMode = "me";
      retriedMe = true;

      const meResult = await fetchIpinfoLiteCountryContext({
        token,
        mode: "me",
        signal: controller.signal,
      });

      if (meResult.type === "success") {
        return meResult.context;
      }

      logLookupFailure({ result: meResult, hasVisitorIp, mode: "me", retriedMe: true });
      return null;
    }

    logLookupFailure({ result: initialResult, hasVisitorIp, mode: initialMode, retriedMe: false });
    return null;
  } catch (error) {
    logFallback({
      reason: isAbortError(error) ? "timeout" : "request_error",
      hasVisitorIp,
      mode: activeMode,
      retriedMe,
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
