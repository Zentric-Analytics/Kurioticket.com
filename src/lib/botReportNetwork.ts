import { renderGuestCountryIp } from "./guestLiveCountry";
import { searchNetworkObservation } from "./searchNetworkObservation";
import { confirmedOperatorNetwork } from "./operatorCrawlerNetwork";
import type { PublicEnvironment } from "./stagingSafety";

/** Reuse the reviewed staging ingress gate for reporting only. Its opt-in is
 * not proof of bot identity; private callers can bypass the public proxy.
 * No XFF fallback, new credentials, provider call or authorization change. */
export function botReportNetwork(request: Request, environment: PublicEnvironment) {
  if (environment !== "staging") return {};
  const ip = renderGuestCountryIp(request);
  if (!ip) return {};
  const observed = searchNetworkObservation(request, true).searchNetwork;
  if (!observed || observed.ipAddress !== ip) return {};
  return { reportedIp: ip, reportedCountry: observed.countryCode };
}

/** Positive network evidence for the exact reported address. This is never
 * a verified request, a negative verdict or a source of access permissions. */
export async function reportedCrawlerNetworkMatch(declaredName: string | null, ip: string | null | undefined) {
  if (!declaredName || !ip) return null;
  return await confirmedOperatorNetwork(declaredName, ip) ? "OFFICIAL_CRAWLER_RANGE_MATCH" : null;
}
