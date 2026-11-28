import { publicVisitorIp } from "./geo/ipinfo";
import { confirmedOperatorNetwork, matchesReportedMetaNetwork } from "./operatorCrawlerNetwork";
import { matchReportedSearchCrawlerAddress } from "./verifiedSearchCrawler";

export const reportEvidenceSelect = {
  timestamp: true, declaredName: true, verification: true,
} as const;

type Observation = {
  timestamp: Date; declaredName: string | null; verification: string; ip: string | null;
  reportedIp: string | null; reportedNetworkMatch: string | null;
  renderLogIp: string | null; renderLogCorroboration: string | null;
};
type Identity = { name: string | null; group: string; verification: string; lastSeen: Date };
type Evidence = { label: string; detail: string | null };
const recoveredMatches = new Set(["FORWARD_CONFIRMED_DNS", "OFFICIAL_IP_LIST", "OFFICIAL_CRAWLER_NETWORK"]);

/** Read-only corroboration of a single existing request. This function cannot
 * authenticate ingress, modify registry identity, or grant search privileges.
 * Prefer independent log IP evidence over a reported header. Never transfer
 * evidence between different requests or declaration cohorts. */
export async function activityNetworkEvidence(
  row: Observation,
  matchSearchCrawler: typeof matchReportedSearchCrawlerAddress = matchReportedSearchCrawlerAddress,
): Promise<Evidence | null> {
  if (!row.declaredName || row.verification === "VERIFIED" || row.verification === "SUSPICIOUS") return null;
  const logged = publicVisitorIp(row.renderLogIp);
  const reported = publicVisitorIp(row.reportedIp);
  const authenticated = publicVisitorIp(row.ip);
  const ip = authenticated ?? logged ?? reported;
  if (!ip) return null;
  const source = authenticated ? "Authenticated IP" : logged ? "Render log IP" : "Reported IP";
  const detail = source + " · network evidence only; does not change access permissions";
  if ((!authenticated && logged && recoveredMatches.has(row.renderLogCorroboration ?? "")) ||
      (!authenticated && !logged && reported && row.reportedNetworkMatch === "OFFICIAL_CRAWLER_RANGE_MATCH")) {
    return { label: "Crawler network matched", detail };
  }
  try {
    if (await confirmedOperatorNetwork(row.declaredName, ip)) {
      return { label: "Crawler network matched", detail };
    }
    // The same bounded DNS/official-address rules used for all seven search
    // engines are now available to the report, without granting authentication.
    const match = await matchSearchCrawler(row.declaredName, ip);
    if (match) {
      return { label: "Crawler network matched", detail: detail + (match === "FORWARD_CONFIRMED_DNS"
        ? " · Forward-confirmed reverse DNS" : " · Official crawler IP list") };
    }
    if (await matchesReportedMetaNetwork(row.declaredName, ip)) {
      return { label: "Meta network matched", detail: source + " · recent AS32934 routing evidence; specific crawler not authenticated" };
    }
    // GoogleOther shares the common crawler network; this is not proof of
    // the specific product and must not be used by the authorization gate.
    if (row.declaredName === "GOOGLEOTHER" && await confirmedOperatorNetwork("GOOGLEBOT", ip)) {
      return { label: "Google network matched", detail: source + " · shared crawler network; specific crawler not authenticated" };
    }
  } catch { /* unavailable evidence cannot authenticate or condemn a caller */ }
  return null;
}

/** Binary recorded verification only. Report-only network checks are never
 * authentication. A matching latest observation may refine the registry
 * status; a different name or timestamp cannot supply verification.
 * A verified historical registry record is not proof of a current caller. */
export function botReportVerification(
  bot: Identity,
  latest?: Pick<Observation, "declaredName" | "verification" | "timestamp"> | null,
): "Verified" | "Unverified" {
  if (!bot.name || bot.group === "UNKNOWN" || bot.verification === "SUSPICIOUS") return "Unverified";
  const matches = latest && latest.timestamp.getTime() === bot.lastSeen.getTime() && latest.declaredName === bot.name;
  const state = matches ? latest.verification : bot.verification;
  return state === "VERIFIED" ? "Verified" : "Unverified";
}
