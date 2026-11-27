import { trustedBotEdge } from "@/lib/botEdge";
import { confirmedOperatorNetwork } from "@/lib/operatorCrawlerNetwork";
import { crawlerSignatures } from "@/lib/botRegistry";
import { verifySearchCrawler } from "@/lib/verifiedSearchCrawler";

export type SearchCrawlerIdentity = {
  name: string;
  /** DNS confirmation is stronger than a declared User-Agent. Neither grants access rights. */
  evidence: "VERIFIED_DNS" | "VERIFIED_IP_RANGE" | "DECLARED_USER_AGENT";
};

/** The parser is attribution-only. A User-Agent never authenticates a caller. */
export function declaredSearchCrawler(agent: string | null): string | null {
  if (!agent || agent.length > 2_048) return null;
  for (const [name, signature] of crawlerSignatures) if (signature.test(agent)) return name;

  // Cover less familiar bots too, while keeping plain browsers and native
  // transport strings (CFNetwork, okhttp, KurioticketPreview) out of Bots.
  const namedToken = agent.match(/(?<![a-z0-9_-])([a-z0-9_-]{2,48}(?:bot|crawler|spider))(?![a-z0-9_-])/i);
  return namedToken ? namedToken[1].toUpperCase() : null;
}

/** Attribution never exempts a request based on credentials or platform hints. */
export async function identifySearchCrawler(request: Request): Promise<SearchCrawlerIdentity | null> {
  const declared = declaredSearchCrawler(request.headers.get("user-agent"));
  if (!declared) return null;
  const verified = await verifySearchCrawler(request);
  if (verified) return { name: verified, evidence: verified === "DUCKDUCKBOT" ? "VERIFIED_IP_RANGE" : "VERIFIED_DNS" };
  if ((declared === "GOOGLEBOT" || declared === "BINGBOT") &&
      await confirmedOperatorNetwork(declared, trustedBotEdge(request)?.ip ?? null)) {
    return { name: declared, evidence: "VERIFIED_IP_RANGE" };
  }
  return { name: declared, evidence: "DECLARED_USER_AGENT" };
}

export function searchCrawlerMetadata(crawler: SearchCrawlerIdentity | null) {
  return crawler ? {
    identifiedCrawler: crawler.name,
    crawlerEvidence: crawler.evidence,
    ...(crawler.evidence !== "DECLARED_USER_AGENT" ? { verifiedCrawler: crawler.name } : {}),
  } : {};
}
