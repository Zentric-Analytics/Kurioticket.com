import { trustedBotEdge } from "./botEdge";
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
