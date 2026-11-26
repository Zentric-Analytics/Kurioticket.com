import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { isSameOriginRequest } from "@/lib/visitor-identity";
import type { PublicEnvironment } from "@/lib/stagingSafety";
import type { OnlinePresencePlatform } from "./onlinePresence";
import { sessionDeviceObservation, type SessionDeviceObservation } from "./sessionDeviceObservation";
import { guestFirstAccessObservation, guestFirstAccessPreviewEnabled, type GuestAccessObservation } from "./guestFirstAccessObservation";
import { guestLiveCountryEnabled, reportGuestCountryDiagnostic, resolveGuestLiveCountry, safeGuestLiveCountry } from "./guestLiveCountry";
import {
  equalPresenceSignatures,
  presenceTokenHeader,
  renewPresenceCredential,
  type PresenceTransport,
} from "./onlinePresenceCredential";

export type OnlinePresenceHeartbeat = {
  environment: PublicEnvironment;
  sourceId: string;
  platform: OnlinePresencePlatform;
  accountSessionId: string | null;
  now: Date;
  /** Only attached to a verified account session, never an anonymous presence ID. */
  device?: SessionDeviceObservation;
  guestAccess?: GuestAccessObservation;
  /** Country only, separate from the first-access/device preview. */
  guestLiveCountryCode?: string | null;
};

type Dependencies = {
  environment: () => PublicEnvironment;
  secret: () => string | undefined;
  automationSecret: () => string | undefined;
  enabled?: () => boolean;
  now?: () => Date;
  authenticate: (request: Request) => Promise<{ id: string; platform: string | null } | null>;
  admit?: (request: Request, sourceId: string, newSource: boolean) => boolean;
  resolveGuestCountry?: typeof resolveGuestLiveCountry;
  record: (heartbeat: OnlinePresenceHeartbeat) => Promise<void>;
  onFailure?: (environment: PublicEnvironment) => void;
};

const browserHeaders = ["origin", "sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest"];
const webSessionCookie = /^(?:__Secure-)?next-auth\.session-token(?:\.\d+)?$/;

function requestCookies(request: Request) {
  const cookies = new Map<string, string>();
  for (const pair of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
  }
  return cookies;
}

function nativePlatform(value: string | null) {
  return value === "ios" || value === "android" ? value : null;
}

function requestPlatform(request: Request, transport: PresenceTransport): OnlinePresencePlatform | null {
  if (transport === "native") {
    if (request.headers.has("cookie") || browserHeaders.some(name => request.headers.has(name))) return null;
    return nativePlatform(request.headers.get("x-mobile-platform"));
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (!request.headers.has("origin") || (fetchSite && fetchSite !== "same-origin")
      || request.headers.has("authorization") || request.headers.has("x-mobile-platform")
      || !isSameOriginRequest(request)) return null;
  const mobileHint = request.headers.get("sec-ch-ua-mobile");
  const mobile = mobileHint === "?1" || /Android|Mobile|iPad|iPhone|iPod/i.test(request.headers.get("user-agent") ?? "");
  return mobile ? "mobile_web" : "desktop_web";
}

/** Only a trusted classifier with the dedicated ingress key can mark a request as verified automation. */
function verifiedAutomation(request: Request, secret: string | undefined, environment: PublicEnvironment, now: Date) {
  if (!secret || secret.length < 32) return false;
  const proof = /^(\d{13})\.([\w-]{43})$/.exec(request.headers.get("x-kt-verified-automation") ?? "");
  if (!proof || Math.abs(now.getTime() - Number(proof[1])) > 60_000) return false;
  const path = new URL(request.url).pathname;
  const message = ["verified-automation-v1", environment, path, proof[1]].join("\n");
  const expected = createHmac("sha256", secret).update(message).digest("base64url");
  return equalPresenceSignatures(proof[2], expected);
}

function admitHeartbeat(request: Request, sourceId: string, newSource: boolean) {
  // Fixed buckets bound process memory even when callers forge forwarding headers.
  if (!newSource) return checkRateLimit("presence-heartbeat:" + sourceId.slice(0, 4), 12, 60_000).allowed;
  // As with provider requests, Render's managed Cloudflare ingress owns this
  // header. Forwarding headers elsewhere are only load-control hints.
  const ip = process.env.RENDER === "true" ? request.headers.get("cf-connecting-ip")?.trim() ?? "" : getClientIp(request);
  const group = isIP(ip) ? createHash("sha256").update(ip).digest("hex").slice(0, 3) : "unknown";
  return checkRateLimit("presence-admission:" + group, group === "unknown" ? 500 : 120, 60_000).allowed
    && checkRateLimit("presence-admission-total", 4000, 60_000).allowed;
}

export function createOnlinePresenceHandler(transport: PresenceTransport, dependencies: Dependencies) {
  return async (request: Request) => {
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    const response = (status: number, retryAfter?: string) => {
      if (retryAfter) headers.set("Retry-After", retryAfter);
      return new Response(null, { status, headers });
    };

    if (dependencies.enabled && !dependencies.enabled()) return response(503, "60");
    const platform = requestPlatform(request, transport);
    if (!platform) return response(403);
    const now = dependencies.now?.() ?? new Date();
    const environment = dependencies.environment();
    if (verifiedAutomation(request, dependencies.automationSecret(), environment, now)) return response(204);
    const secret = dependencies.secret();
    if (!secret) return response(503, "60");

    // The browser holds the signed credential only in page memory. Do not set a new
    // tracking cookie or use analytics consent identifiers for operational presence.
    const cookies = transport === "web" ? requestCookies(request) : null;
    const supplied = request.headers.get(presenceTokenHeader);
    const credential = renewPresenceCredential(supplied, { environment, transport, now: now.getTime(), secret });
    const admit = dependencies.admit ?? admitHeartbeat;
    if (!admit(request, credential.sourceId, credential.newSource)) return response(429, "30");

    const signedIn = cookies
      ? Array.from(cookies.keys()).some(name => webSessionCookie.test(name))
      : request.headers.has("authorization");
    try {
      const account = signedIn ? await dependencies.authenticate(request) : null;
      if (signedIn && !account) return response(401);
      // A lost response or blocked cookie must not create a phantom session.
      if (!credential.newSource) {
        const verifiedPlatform = transport === "native" && account ? nativePlatform(account.platform) ?? platform : platform;
        // Optional geolocation must never turn a valid heartbeat into a failed
        // request. Only the server's verified current request may supply a country.
        let country: string | null | undefined;
        if (!account && environment === "staging") {
          if (!guestLiveCountryEnabled(environment)) {
            reportGuestCountryDiagnostic(environment, "disabled", verifiedPlatform);
          } else {
            try {
              country = safeGuestLiveCountry(await (dependencies.resolveGuestCountry ?? resolveGuestLiveCountry)(request, environment));
            } catch {
              country = null;
              reportGuestCountryDiagnostic(environment, "resolver_failed", verifiedPlatform);
            }
            reportGuestCountryDiagnostic(environment, country ? "heartbeat_country" : "heartbeat_country_unavailable", verifiedPlatform);
          }
        }
        await dependencies.record({
          environment,
          sourceId: credential.sourceId,
          platform: verifiedPlatform,
          accountSessionId: account?.id ?? null,
          ...(account ? { device: sessionDeviceObservation(request, verifiedPlatform) } : {}),
          ...(!account && guestFirstAccessPreviewEnabled(environment) ? {
            guestAccess: guestFirstAccessObservation(request, verifiedPlatform, false),
          } : {}),
          ...(country !== undefined ? { guestLiveCountryCode: country } : {}),
          now,
        });
      }

      if (credential.renewed) {
        headers.set(presenceTokenHeader, credential.token);
      }
      return response(credential.newSource ? 202 : 204);
    } catch {
      dependencies.onFailure?.(environment);
      return response(503, "30");
    }
  };
}
