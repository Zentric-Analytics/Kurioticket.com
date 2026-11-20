import { lookup, reverse } from "node:dns/promises";
import { isIP } from "node:net";
import { getKayakClientIp } from "@/lib/kayak-client-ip";

export type VerifiedSearchCrawler = "GOOGLEBOT" | "BINGBOT";
type DnsResult = { address: string };
type CrawlerLookup = {
  clientIp: (request: Request) => string;
  reverseIp: (ip: string) => Promise<string[]>;
  forwardHost: (hostname: string) => Promise<DnsResult[]>;
};
const dns: CrawlerLookup = {
  clientIp: getKayakClientIp,
  reverseIp: reverse,
  forwardHost: (hostname) => lookup(hostname, { all: true }),
};
const positiveTtlMs = 30 * 60_000;
const negativeTtlMs = 60_000;
const verificationTimeoutMs = 2_500;
const cache = new Map<string, { result: VerifiedSearchCrawler | null; expiresAt: number }>();
const inflight = new Map<string, Promise<VerifiedSearchCrawler | null>>();

function claimedCrawler(userAgent: string | null): VerifiedSearchCrawler | null {
  if (!userAgent || userAgent.length > 2_048) return null;
  if (/\bGooglebot(?:[-/][A-Za-z0-9.]+)?\b/i.test(userAgent)) return "GOOGLEBOT";
  if (/\bbingbot(?:[-/][A-Za-z0-9.]+)?\b/i.test(userAgent)) return "BINGBOT";
  return null;
}
function validCrawlerHostname(name: string, crawler: VerifiedSearchCrawler) {
  const host = name.toLowerCase().replace(/\.$/, "");
  // Google common-crawler names only: not generic google.com/cloud-hosted VMs.
  if (crawler === "GOOGLEBOT") return /^(?:crawl-[a-z0-9-]+\.googlebot\.com|geo-crawl-[a-z0-9-]+\.geo\.googlebot\.com)$/.test(host);
  return /^[a-z0-9-]+\.search\.msn\.com$/.test(host);
}
async function confirmReverseAndForward(ip: string, crawler: VerifiedSearchCrawler, resolver: CrawlerLookup) {
  try {
    const names = await resolver.reverseIp(ip);
    for (const hostname of names.slice(0, 5)) {
      if (!validCrawlerHostname(hostname, crawler)) continue;
      const addresses = await resolver.forwardHost(hostname.replace(/\.$/, ""));
      if (addresses.some(entry => entry.address === ip)) return crawler;
    }
  } catch { /* DNS errors do not establish verified identity. */ }
  return null;
}
function boundedVerification(promise: Promise<VerifiedSearchCrawler | null>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>(resolve => {
    timer = setTimeout(() => resolve(null), verificationTimeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => { if (timer) clearTimeout(timer); });
}

/**
 * Only a Google/Bing search crawler with forward-confirmed reverse DNS can
 * bypass the customer-search writer. User-Agent is merely a cheap prefilter.
 *
 * The connecting IP is the same Cloudflare ingress IP already used for KAYAK
 * provider forwarding; never use X-Mobile-Platform, raw XFF or client claims
 * as crawler proof. An unavailable DNS lookup fails open as unverified, never
 * labels a legitimate user or historical record as a crawler.
 */
export async function verifySearchCrawler(
  request: Request, resolver: CrawlerLookup = dns,
): Promise<VerifiedSearchCrawler | null> {
  const claimed = claimedCrawler(request.headers.get("user-agent"));
  if (!claimed) return null;
  const ip = resolver.clientIp(request);
  if (!isIP(ip)) return null;
  const key = claimed + ":" + ip;
  // Test-only resolvers must not reuse production DNS cache observations.
  if (resolver !== dns) return boundedVerification(confirmReverseAndForward(ip, claimed, resolver));
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const existing = inflight.get(key);
  if (existing) return existing;
  const pending = boundedVerification(confirmReverseAndForward(ip, claimed, resolver))
    .then(result => {
      if (cache.size >= 512) cache.delete(cache.keys().next().value!);
      cache.set(key, { result, expiresAt: Date.now() + (result ? positiveTtlMs : negativeTtlMs) });
      return result;
    }).finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}
