import { confirmedOperatorNetwork } from "@/lib/operatorCrawlerNetwork";
import { declaredSearchCrawler, identifySearchCrawler } from "@/lib/searchCrawlerGate";
import { knownCrawler, recognizedCrawler, crawlerPolicy } from "@/lib/botRegistry";
import { trustedBotEdge, trustedBotIngress } from "@/lib/botEdge";

type BotSearchProduct = "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";

const searchEndpoints: Readonly<Partial<Record<string, BotSearchProduct>>> = {
  "/api/flights/search": "FLIGHT",
  "/api/hotels/search": "HOTEL",
  "/api/cars/search": "CAR",
  "/api/packages/search": "PACKAGE",
};

const alternativeSearch: Readonly<Partial<Record<string, BotSearchProduct>>> = {
  "/api/flights/nearby-fare": "FLIGHT",
  "/api/mobile/v1/hotels/progressive": "HOTEL",
  "/api/flights/destination-prices": "FLIGHT",
  "/api/flights/home-discovery-fares": "FLIGHT",
};

export const publicCrawlerPaths = [
  "/", "/flights", "/hotels", "/cars", "/packages", "/deals",
  "/destinations", "/explore", "/guides", "/about", "/contact", "/how-it-works",
  "/more-service-info", "/support", "/service-guarantee", "/faq", "/privacy", "/terms",
  "/legal", "/legal-center", "/flights/results", "/hotels/results", "/cars/results",
  "/packages/results", "/deals/results", "/robots.txt", "/sitemap.xml", "/favicon.ico",
  "/manifest.json",
] as const;

export const publicCrawlerPrefixes = [
  "/images/", "/brand/", "/flags/", "/_next/static/", "/api/cms/images/",
] as const;

const restrictedDynamicPages = new Set(["/flights/handoff", "/hotels/handoff", "/flights/details", "/hotels/details"]);
const publicResources = new Set(["/robots.txt", "/sitemap.xml", "/favicon.ico", "/manifest.json"]);
const publicReadApis = new Set(["/api/content/faqs", "/api/content/homepage"]);

export function botTarget(request: Request) {
  const url = new URL(request.url);
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  const mainSearch = Object.hasOwn(searchEndpoints, pathname) && request.method === "POST";
  const product = (Object.hasOwn(searchEndpoints, pathname) ? searchEndpoints[pathname] : undefined)
    ?? (Object.hasOwn(alternativeSearch, pathname) ? alternativeSearch[pathname] : undefined)
    ?? (pathname.startsWith("/api/deals/v2/flights/inventory") ? "FLIGHT" : null);
  const dynamic = pathname.match(/^\/(flights|hotels|guides|legal)\/[a-z0-9-]{1,150}$/i);
  const prefix = publicCrawlerPrefixes.find(value => pathname.startsWith(value));
  // The optimizer can internally retrieve local paths. Limit its input to public assets.
  const imageInput = url.searchParams.get("url") ?? "";
  const publicImage = pathname === "/_next/image" && (
    /^\/(?:images|brand|flags|api\/cms\/images)\/[a-z0-9_./%-]+(?:\?v=[a-z0-9-]+)?$/i.test(imageInput)
    && !/(?:\.\.|%2e|%2f|%5c)/i.test(imageInput)
  );
  const publicPath = publicCrawlerPaths.some(value => value === pathname);
  const resource = Boolean(prefix) || publicResources.has(pathname) || pathname === "/_next/image";
  const api = pathname === "/api" || pathname.startsWith("/api/");
  const publicRead = publicPath || Boolean(prefix) || publicImage || publicReadApis.has(pathname)
    || Boolean(dynamic && !restrictedDynamicPages.has(pathname));
  const crawl = (request.method === "GET" || request.method === "HEAD") && publicRead;
  const endpoint = prefix ? prefix + ":resource"
    : publicPath || mainSearch || Object.hasOwn(searchEndpoints, pathname) || Object.hasOwn(alternativeSearch, pathname)
      || publicReadApis.has(pathname) || pathname === "/_next/image" ? pathname
    : dynamic ? "/" + dynamic[1] + "/:slug"
    : /^\/api\/deals\/v2\/flights\/inventory(?:\/|$)/.test(pathname) ? "/api/deals/v2/flights/inventory/:operation"
    : api ? "/api/:restricted" : "/:restricted";
  return { mainSearch, product, crawl, endpoint, kind: product ? "SEARCH_ATTEMPT" : resource ? "RESOURCE" : api ? "API" : "PAGE" };
}

export function automationSignal(request: Request) {
  const agent = request.headers.get("user-agent");
  const declared = declaredSearchCrawler(agent?.slice(0, 2048) ?? null);
  const edge = trustedBotEdge(request);
  const automationAgent = /\b(?:headlesschrome|selenium|phantomjs|scrapy|python-requests|aiohttp|wget|crawler|spider|bot)\b/i.test(agent?.slice(0, 2048) ?? "");
  return declared || edge?.automated || automationAgent ? { declared, edge } : null;
}

export async function observeBot(request: Request, signal: NonNullable<ReturnType<typeof automationSignal>>) {
  const catalog = recognizedCrawler(signal.declared);
  const ingress = trustedBotIngress(request);
  const crawler = catalog?.category === "search" ? await identifySearchCrawler(request) : null;
  const verified = Boolean(crawler && crawler.evidence !== "DECLARED_USER_AGENT");
  const operatorConfirmed = catalog?.category !== "search" && !signal.edge?.automated && await confirmedOperatorNetwork(signal.declared, ingress?.ip ?? null);
  // Search eligibility requires independent verification in every environment.
  // Reporting observations and a declared User-Agent cannot supply that proof.
  const policy = crawlerPolicy(signal.declared, verified);
  // Keep evidence cohorts separate; the quota store shares the allowance by crawler name.
  const keyGroup = verified ? "SEARCH_ENGINE" : knownCrawler(signal.declared) && catalog?.category !== "search" && !signal.edge?.automated
    ? "OTHER_RECOGNIZED" : "UNKNOWN";
  return {
    crawler: policy.access === "CRAWL_AND_LIMITED_SEARCH" ? crawler : null,
    identityKey: keyGroup !== "UNKNOWN" ? keyGroup + ":" + signal.declared : "UNKNOWN:" + (signal.declared ?? "UNATTRIBUTED"),
    name: signal.declared,
    ...policy,
    verification: verified || operatorConfirmed ? "VERIFIED" : signal.edge?.automated && catalog ? "SUSPICIOUS"
      : catalog?.category === "search" && ingress?.ip ? "UNVERIFIED"
      : signal.declared ? "DECLARED" : "UNVERIFIED",
    evidence: verified ? (crawler?.evidence === "VERIFIED_IP_RANGE" ? "OFFICIAL_IP_LIST" : "FORWARD_CONFIRMED_DNS")
      : operatorConfirmed ? "OFFICIAL_CRAWLER_NETWORK" : signal.edge?.automated ? "TRUSTED_EDGE_AUTOMATION" : signal.declared ? "USER_AGENT" : "AUTOMATION_SIGNATURE",
    ip: ingress?.ip ?? null,
    country: ingress?.country ?? null,
    edgeRay: ingress?.ray ?? null,
    networkAsn: ingress?.networkAsn ?? null,
    networkOrganization: ingress?.networkOrganization ?? null,
    networkSource: ingress && (ingress.ip || ingress.country || ingress.ray
      || ingress.networkAsn || ingress.networkOrganization) ? ingress.source : null,
    declaredName: signal.declared,
    // Keep crawler product tokens only. An arbitrary UA can contain secrets or personal data.
    userAgent: catalog?.agent ?? signal.declared,
  };
}

export function botAccess(bot: Awaited<ReturnType<typeof observeBot>>, target: ReturnType<typeof botTarget>) {
  if (bot.group === "UNKNOWN") return "UNAPPROVED_BOT";
  if (target.mainSearch && bot.group === "SEARCH_ENGINE" && bot.access === "CRAWL_AND_LIMITED_SEARCH") return null;
  if (target.crawl) return null;
  return target.product ? "SEARCH_NOT_ALLOWED" : "PATH_NOT_ALLOWED";
}
