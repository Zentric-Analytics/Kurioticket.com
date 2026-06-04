import { isIP } from "node:net";

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

const isPrivateOrInternalIpv4 = (ip: string) => {
  const octets = ip.split(".").map((part) => Number(part));
  const [first, second, third] = octets;

  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
  );
};

const isPrivateOrInternalIpv6 = (ip: string) => {
  const lower = ip.toLowerCase();
  const mappedIpv4 = lower.startsWith("::ffff:") ? lower.slice("::ffff:".length) : null;

  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:") ||
    lower.startsWith("2001:db8:") ||
    (mappedIpv4 ? isPrivateOrInternalIpv4(mappedIpv4) : false)
  );
};

const isPublicIp = (value: string) => {
  const ip = normalizeIpCandidate(value);
  if (!ip) return null;

  const version = isIP(ip);
  if (version === 4 && !isPrivateOrInternalIpv4(ip)) return ip;
  if (version === 6 && !isPrivateOrInternalIpv6(ip)) return ip;

  return null;
};

const firstPublicIp = (value: string | null) => splitHeaderValues(value).map(isPublicIp).find(Boolean) || null;

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

export const resolveIpinfoLiteCountryContext = async (visitorIp?: string | null): Promise<CountryContext | null> => {
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
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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

    if (visitorIp && initialResult.type === "non_ok_status" && initialResult.status === 403) {
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
