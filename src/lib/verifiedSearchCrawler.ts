import { lookup, reverse } from "node:dns/promises";
import { isIP } from "node:net";
import { trustedBotEdge } from "@/lib/botEdge";
import { crawlerSignatures, knownCrawler, type SearchEngine } from "@/lib/botRegistry";

export type VerifiedSearchCrawler = SearchEngine;
type DnsResult = { address: string };
type NetworkLookup = {
  reverseIp: (ip: string) => Promise<string[]>;
  forwardHost: (hostname: string) => Promise<DnsResult[]>;
};
type CrawlerLookup = NetworkLookup & { clientIp: (request: Request) => string };
const dns: CrawlerLookup = {
  clientIp: (request) => trustedBotEdge(request)?.ip ?? "",
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
  const name = crawlerSignatures.find(([, signature]) => signature.test(userAgent))?.[0] ?? null;
  return knownCrawler(name)?.category === "search" ? name as SearchEngine : null;
}
function validCrawlerHostname(name: string, crawler: VerifiedSearchCrawler) {
  const host = name.toLowerCase().replace(/\.$/, "");
  // Google common-crawler names only: not generic google.com/cloud-hosted VMs.
  if (crawler === "GOOGLEBOT") return /^(?:crawl-[a-z0-9-]+\.googlebot\.com|geo-crawl-[a-z0-9-]+\.geo\.googlebot\.com)$/.test(host);
  if (crawler === "BINGBOT") return /^[a-z0-9-]+\.search\.msn\.com$/.test(host);
  if (crawler === "APPLEBOT") return /^[a-z0-9-]+\.applebot\.apple\.com$/.test(host);
  if (crawler === "YANDEXBOT") return /^[a-z0-9.-]+\.(?:yandex\.ru|yandex\.net|yandex\.com)$/.test(host);
  if (crawler === "BAIDUSPIDER") return /^[a-z0-9.-]+\.crawl\.baidu\.(?:com|jp)$/.test(host);
  if (crawler === "SLURP") return /^[a-z0-9.-]+\.crawl\.yahoo\.net$/.test(host);
  return false;
}
function canonicalIp(value: string): string | null {
  const version = isIP(value);
  if (!version) return null;
  if (version === 4) return value;
  try {
    // WHATWG IPv6 host parsing normalizes expanded, compressed and IPv4-
    // mapped forms into the same canonical address; no DNS or extra module.
    return new URL("http://[" + value + "]/").hostname;
  } catch { return null; }
}
async function confirmReverseAndForward(ip: string, crawler: VerifiedSearchCrawler, resolver: NetworkLookup) {
  try {
    const names = await resolver.reverseIp(ip);
    for (const hostname of names.slice(0, 5)) {
      if (!validCrawlerHostname(hostname, crawler)) continue;
      const addresses = await resolver.forwardHost(hostname.replace(/\.$/, ""));
      const client = canonicalIp(ip);
      if (client && addresses.some(entry => canonicalIp(entry.address) === client)) return crawler;
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

let duckAddresses: { addresses: Set<string>; expires: number } | undefined;
let duckRefresh: Promise<Set<string>> | undefined;

async function duckDuckBotAddresses() {
  if (duckAddresses && duckAddresses.expires > Date.now()) return duckAddresses.addresses;
  return duckRefresh ??= (async () => {
    const response = await fetch("https://duckduckgo.com/duckduckbot.json", {
      signal: AbortSignal.timeout(verificationTimeoutMs), redirect: "error", cache: "no-store",
    });
    if (!response.ok) return new Set<string>();
    const document: unknown = await response.json();
    const rows = (document as { prefixes?: unknown })?.prefixes;
    if (!Array.isArray(rows) || rows.length > 512) return new Set<string>();
    const addresses = new Set<string>();
    for (const row of rows) {
      for (const [value, bits] of [[row?.ipv4Prefix, 32], [row?.ipv6Prefix, 128]]) {
        if (typeof value !== "string") continue;
        const [ip, prefix] = value.split("/");
        const canonical = canonicalIp(ip);
        if (canonical && Number(prefix) === bits) addresses.add(canonical);
      }
    }
    if (addresses.size) duckAddresses = { addresses, expires: Date.now() + positiveTtlMs };
    return addresses;
  })().catch(() => new Set<string>()).finally(() => { duckRefresh = undefined; });
}

/** Require an authenticated ingress address and official network evidence. */
export async function verifySearchCrawler(
  request: Request, resolver: CrawlerLookup = dns,
): Promise<VerifiedSearchCrawler | null> {
  const claimed = claimedCrawler(request.headers.get("user-agent"));
  if (!claimed) return null;
  // The production request entry point still requires the authenticated edge.
  return matchCrawlerAddress(claimed, resolver.clientIp(request), resolver);
}

/** Network evidence only: a matching recorded address is not proof that
 * the current caller owns it. Never use this reporting entry point to
 * authorize searches or populate authenticated request metadata. */
export async function matchReportedSearchCrawlerAddress(
  declaredName: string | null, ip: string | null, resolver: NetworkLookup = dns,
): Promise<"FORWARD_CONFIRMED_DNS" | "OFFICIAL_IP_LIST" | null> {
  if (!ip || knownCrawler(declaredName)?.category !== "search") return null;
  const crawler = declaredName as SearchEngine;
  const match = await matchCrawlerAddress(crawler, ip, resolver);
  return match === crawler ? crawler === "DUCKDUCKBOT" ? "OFFICIAL_IP_LIST" : "FORWARD_CONFIRMED_DNS" : null;
}

async function matchCrawlerAddress(claimed: SearchEngine, ip: string, resolver: NetworkLookup) {
  if (!isIP(ip)) return null;
  if (claimed === "DUCKDUCKBOT") {
    return (await duckDuckBotAddresses()).has(canonicalIp(ip)!) ? claimed : null;
  }
  const key = claimed + ":" + ip;
  // Alternate resolvers must not reuse production DNS cache observations.
  if (resolver !== dns) return boundedVerification(confirmReverseAndForward(ip, claimed, resolver));
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const existing = inflight.get(key);
  if (existing) return existing;
  if (inflight.size >= 64) return null;
  const pending = boundedVerification(confirmReverseAndForward(ip, claimed, resolver))
    .then(result => {
      if (cache.size >= 512) cache.delete(cache.keys().next().value!);
      cache.set(key, { result, expiresAt: Date.now() + (result ? positiveTtlMs : negativeTtlMs) });
      return result;
    }).finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}
