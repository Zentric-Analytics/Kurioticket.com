import { createHmac, randomBytes } from "node:crypto";
import { trustedBotEdge } from "./botEdge";
import { publicVisitorIp, resolveIpinfoLiteCountryContext } from "./geo/ipinfo";
import { isIsoCountryCode, normalizeCountryCode } from "./geo/context";
import type { PublicEnvironment } from "./stagingSafety";

/** Independently approved staging-only country observation. */
export function guestLiveCountryEnabled(environment: PublicEnvironment) {
  return environment === "staging" && process.env.GUEST_LIVE_COUNTRY_ENABLED === "true";
}
export function safeGuestLiveCountry(value: string | null | undefined): string | null {
  const country = normalizeCountryCode(value);
  return country && isIsoCountryCode(country) ? country : null;
}
/** Authenticated edge only. RENDER=true, market preferences and bare headers
 * are not evidence of the customer's current country. */
export function guestLiveCountryObservation(request: Request, environment: PublicEnvironment): string | null {
  if (!guestLiveCountryEnabled(environment)) return null;
  return safeGuestLiveCountry(trustedBotEdge(request)?.country);
}

type CountryLookup = (ip: string) => Promise<string | null>;
const maxEntries = 1024;
const cacheMs = 90_000;
// A transient provider failure is not evidence of an unknown location for the
// entire live window. Retry on the next normal heartbeat without hammering it.
const negativeCacheMs = 5_000;
const lookupTimeoutMs = 1200;
const maxPending = 8;
const cacheSecret = randomBytes(32);

type GuestCountryDiagnostic = "disabled" | "edge_country" | "render_ingress_not_verified" |
  "no_trusted_public_ip" | "ipinfo_unconfigured" | "lookup_busy" |
  "lookup_country" | "lookup_unavailable" | "resolver_failed" |
  "heartbeat_country" | "heartbeat_country_unavailable" | "roster_country_read_failed";
const diagnosticLastAt = new Map<string, number>();
/** Staging-only, bounded operational diagnostics. Never log a location, IP,
 * source credential, visitor identifier, request header, or provider response. */
export function reportGuestCountryDiagnostic(
  environment: PublicEnvironment, status: GuestCountryDiagnostic,
  platform?: "desktop_web" | "mobile_web" | "ios" | "android",
) {
  if (environment !== "staging") return;
  const key = status + ":" + (platform ?? "shared");
  const now = Date.now();
  if (now - (diagnosticLastAt.get(key) ?? -Infinity) < 60_000) return;
  diagnosticLastAt.set(key, now);
  console.info("[guest-live-country]", { status, ...(platform ? { platform } : {}) });
}

/** Render's public Cloudflare ingress rejects client-supplied CF-Connecting-IP.
 * Private-network requests bypass this protection. RENDER and Host alone are
 * not proof of public ingress. Explicitly opt in ONLY after confirming that
 * these heartbeat endpoints cannot be reached via an untrusted private path.
 * https://render.com/articles/host-pocketbase-on-render
 * Country estimate only; never authentication or bot verification. */
export function renderGuestCountryIp(request: Request): string | null {
  if (process.env.RENDER !== "true" || process.env.GUEST_LIVE_RENDER_INGRESS_VERIFIED !== "true") return null;
  try {
    const host = new URL(request.url).hostname.toLowerCase();
    const configured = process.env.NEXT_PUBLIC_APP_URL;
    const publicHost = configured ? new URL(configured).hostname.toLowerCase() : "";
    const renderHost = process.env.RENDER_EXTERNAL_HOSTNAME?.trim().toLowerCase() ?? "";
    if (host !== publicHost && host !== renderHost) return null;
  } catch { return null; }
  if (request.headers.has("cf-worker")) return null;
  const ip = publicVisitorIp(request.headers.get("cf-connecting-ip"));
  return ip && ip.toLowerCase() !== "2a06:98c0:3600::103" ? ip : null;
}

const defaultLookup: CountryLookup = async ip => {
  if (!process.env.IPINFO_TOKEN?.trim()) return null;
  return (await resolveIpinfoLiteCountryContext(ip, {
    allowMeFallback: false, timeoutMs: lookupTimeoutMs,
  }))?.countryCode ?? null;
};

/** Short-lived process-local country cache keyed by a random-process HMAC.
 * No raw IP cache key, permanent identity or association to guest history. */
export function createGuestCountryResolver(lookup: CountryLookup = defaultLookup) {
  const cache = new Map<string,{country:string|null;expiresAt:number}>();
  const pending = new Map<string,Promise<string|null>>();
  return async (request: Request, environment: PublicEnvironment): Promise<string | null> => {
    if (!guestLiveCountryEnabled(environment)) return null;
    const edge = trustedBotEdge(request);
    const country = safeGuestLiveCountry(edge?.country);
    if (country) {
      reportGuestCountryDiagnostic(environment, "edge_country");
      return country;
    }
    const ip = edge ? publicVisitorIp(edge.ip) : renderGuestCountryIp(request);
    if (!ip || ip.toLowerCase() === "2a06:98c0:3600::103") {
      reportGuestCountryDiagnostic(environment, !edge && process.env.RENDER === "true" &&
        process.env.GUEST_LIVE_RENDER_INGRESS_VERIFIED !== "true"
        ? "render_ingress_not_verified" : "no_trusted_public_ip");
      return null;
    }
    if (lookup === defaultLookup && !process.env.IPINFO_TOKEN?.trim()) {
      reportGuestCountryDiagnostic(environment, "ipinfo_unconfigured");
      return null;
    }
    const key = createHmac("sha256",cacheSecret).update(ip).digest("base64url");
    const now = Date.now();
    for (const [k,v] of cache) if (v.expiresAt <= now) cache.delete(k);
    const hit = cache.get(key);
    if (hit) return hit.country;
    const running = pending.get(key);
    if (running) return running;
    if (pending.size >= maxPending) {
      reportGuestCountryDiagnostic(environment, "lookup_busy");
      return null;
    }
    let timeout: ReturnType<typeof setTimeout>;
    const deadline = new Promise<null>(resolve => { timeout = setTimeout(() => resolve(null),lookupTimeoutMs); });
    const work = Promise.resolve().then(() => lookup(ip)).then(safeGuestLiveCountry, () => null);
    const result = Promise.race([work,deadline]).then(value => {
      clearTimeout(timeout!);
      if (cache.size >= maxEntries) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      cache.set(key,{country:value,expiresAt:Date.now()+(value ? cacheMs : negativeCacheMs)});
      reportGuestCountryDiagnostic(environment, value ? "lookup_country" : "lookup_unavailable");
      return value;
    });
    pending.set(key,result);
    // Do not free a provider slot before its underlying lookup settles.
    void work.then(() => {pending.delete(key);}, () => {pending.delete(key);});
    return result;
  };
}
export const resolveGuestLiveCountry = createGuestCountryResolver();
