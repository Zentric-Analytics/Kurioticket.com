import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { BlockList, isIP } from "node:net";
import { edgeRequest } from "../../tools/cloudflare/bot-edge.mjs";
import { loadIsolatedModule } from "../test-support/loadIsolatedModule";
import type * as botEdge from "./botEdge";
import * as registry from "./botRegistry";
import * as actualPolicy from "./botPolicy";
import { crawlerPolicy, knownCrawler, recognizedCrawler, currentBotAccess } from "./botRegistry";
import { declaredSearchCrawler, searchCrawlerMetadata } from "./searchCrawlerGate";
const engines = ["Googlebot", "Bingbot", "Applebot", "DuckDuckBot", "YandexBot", "Baiduspider", "Slurp"];
const other = ["GoogleOther", "Google-InspectionTool", "Mediapartners-Google", "PerplexityBot", "Perplexity-User", "Meta-WebIndexer", "Meta-ExternalAgent", "Meta-ExternalFetcher", "FacebookExternalHit", "GPTBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Twitterbot", "LinkedInBot", "Bytespider", "AhrefsBot", "SemrushBot", "ia_archiver", "MJ12bot", "OAI-SearchBot", "AASA-Bot"];
type Identity = { name: string; evidence: "VERIFIED_DNS" | "DECLARED_USER_AGENT" };
function load<T>(path: string, dependencies: Record<string, unknown>): T {
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {} as T;
  runInNewContext(compiled, { exports, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, Request, Response, URL, Buffer, performance, console: { error() {} }, process });
  return exports;
}
function fixture(
  identify?: typeof import("./searchCrawlerGate").identifySearchCrawler,
  edge: Pick<typeof botEdge, "trustedBotEdge" | "trustedBotIngress"> =
    { trustedBotEdge: () => null, trustedBotIngress: () => null },
) {
  const policy = identify ? load<typeof actualPolicy>("src/lib/botPolicy.ts", {
    "@/lib/operatorCrawlerNetwork": { confirmedOperatorNetwork: async () => false },
    "@/lib/searchCrawlerGate": { declaredSearchCrawler, identifySearchCrawler: identify },
    "@/lib/botRegistry": { crawlerPolicy, knownCrawler, recognizedCrawler },
    "@/lib/botEdge": edge,
  }) : actualPolicy;
  const counts = { records: 0, reservations: 0, dispatches: 0 };
  const api = load<{ withBotSearch: (request: Request, task: (bot?: { reserve: () => Promise<Response | null> }) => Promise<Response>) => Promise<Response> }>("src/lib/botSecurity.ts", {
    "@/lib/botPolicy": policy, "@/lib/searchCrawlerGate": { searchCrawlerMetadata },
    "@/services/botActivityStore": {
      recordBotAttempt: async (_request: Request, _bot: unknown, _target: unknown, reason: string | null) => { counts.records++; return { id: "fixture", botId: "fixture", status: reason ? 403 : null }; },
      reserveBotSearch: async () => { counts.reservations++; return { status: 0 }; }, finishBotSearch: async () => {},
    },
  });
  const search = (request: Request) => api.withBotSearch(request, async bot => {
    const denied = await bot?.reserve(); if (denied) return denied;
    counts.dispatches++; return new Response(null, { status: 204 });
  });
  return { counts, search };
}
for (const environment of ["staging", "production"]) test(environment + ": all categories preserve supplier and protected-route boundaries", async t => {
  const config = { TRAVEL_PROVIDER_MODE: environment, NEXT_PUBLIC_APP_URL: environment === "staging" ? "https://staging.kurioticket.com" : "https://kurioticket.com", NEXTAUTH_URL: environment === "staging" ? "https://staging.kurioticket.com" : "https://kurioticket.com", BOT_TRUST_RENDER_WORKSPACE_INGRESS: "false", BOT_EDGE_SECRET: "fixture".repeat(8) };
  const prior = Object.fromEntries(Object.keys(config).map(key => [key, process.env[key]])); Object.assign(process.env, config);
  t.after(() => { for (const [key, value] of Object.entries(prior)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  assert.equal(engines.length, 7); assert.equal(other.length, 22);
  const req = (agent: string, path: string, headers: Record<string, string> = {}) => new Request(config.NEXT_PUBLIC_APP_URL + path, { method: path === "/admin" ? "GET" : "POST", headers: { "User-Agent": agent, ...headers } });
  const denied = fixture();
  for (const agent of [...engines, ...other, "NovelSpider", "python-requests"]) {
    for (const product of ["flights", "hotels", "cars", "packages"]) assert.equal((await denied.search(req(agent, "/api/" + product + "/search"))).status, 403, agent);
    for (const path of ["/admin", "/api/mobile/v1/hotels/progressive", "/api/flights/nearby-fare", "/api/deals/v2/flights/inventory"]) assert.equal((await denied.search(req(agent, path))).status, 403);
  }
  assert.equal(denied.counts.reservations, 0); assert.equal(denied.counts.dispatches, 0);
  const untrustedHeaders: Record<string, string>[] = [
    { "CF-Connecting-IP": "66.249.66.1" },
    { "X-Forwarded-For": "66.249.66.1" },
    { "X-Kurioticket-Edge-Auth": "forged", "X-Kurioticket-Edge-IP": "66.249.66.1" },
    { "X-Kurioticket-Edge-Auth": config.BOT_EDGE_SECRET, "X-Kurioticket-Edge-Version": "unsupported", "X-Kurioticket-Edge-IP": "66.249.66.1" },
    { "X-Kurioticket-Edge-Version": "1", "X-Kurioticket-Edge-IP": "66.249.66.1" },
  ];
  for (const headers of untrustedHeaders) assert.equal((await denied.search(req("Googlebot", "/api/flights/search", headers))).status, 403);
  assert.equal(denied.counts.reservations, 0); assert.equal(denied.counts.dispatches, 0);
  const verified = fixture(async request => ({ name: declaredSearchCrawler(request.headers.get("user-agent"))!, evidence: "VERIFIED_DNS" }));
  for (const agent of engines) for (const product of ["flights", "hotels", "cars", "packages"]) assert.equal((await verified.search(req(agent, "/api/" + product + "/search"))).status, 204);
  assert.equal(verified.counts.reservations, 28); assert.equal(verified.counts.dispatches, 28);
  for (const agent of engines) assert.equal((await verified.search(req(agent, "/api/mobile/v1/hotels/progressive"))).status, 403);
  assert.equal(verified.counts.dispatches, 28);
  const outage = fixture(async () => { throw Error("synthetic verification outage"); });
  for (const agent of engines) assert.equal((await outage.search(req(agent, "/api/flights/search"))).status, 503);
  assert.equal(outage.counts.reservations, 0); assert.equal(outage.counts.dispatches, 0);
  for (const agent of ["Mozilla/5.0 Chrome/133.0", "okhttp/4.12", "KurioticketPreview/53 CFNetwork"]) {
    const ordinary = fixture(); assert.equal((await ordinary.search(req(agent, "/api/flights/search"))).status, 204); assert.equal(ordinary.counts.reservations, 0);
  }
  for (const verification of ["DECLARED", "UNVERIFIED", "SUSPICIOUS"]) assert.equal(currentBotAccess({ name: "GOOGLEBOT", group: "SEARCH_ENGINE", access: "CRAWL_AND_LIMITED_SEARCH", verification }, environment), "CRAWL_ONLY");
});

test("a pending verification cannot reserve or dispatch before it settles", async () => {
  let release!: (identity: Identity) => void; let started = false;
  const f = fixture(async () => { started = true; return new Promise<Identity>(resolve => { release = resolve; }); });
  const response = f.search(new Request("https://staging.kurioticket.com/api/flights/search", { method: "POST", headers: { "User-Agent": "Applebot" } }));
  await Promise.resolve(); assert.equal(started, true); assert.equal(f.counts.reservations, 0); assert.equal(f.counts.dispatches, 0);
  release({ name: "APPLEBOT", evidence: "DECLARED_USER_AGENT" });
  assert.equal((await response).status, 403); assert.equal(f.counts.reservations, 0); assert.equal(f.counts.dispatches, 0);
});

test("authenticated Cloudflare client addresses reach the existing search gate for all seven engines", async (t) => {
  const origin = "https://staging.kurioticket.com";
  const config = { BOT_EDGE_HOST: new URL(origin).hostname, BOT_EDGE_SECRET: "fixture".repeat(8) };
  const edge = loadIsolatedModule<typeof botEdge>("src/lib/botEdge.ts", {
    "node:crypto": await import("node:crypto"),
    "node:net": await import("node:net"),
    "./geo/ipinfo": await import("./geo/ipinfo"),
    "./geo/context": await import("./geo/context"),
  }, { ...config, BOT_TRUST_RENDER_WORKSPACE_INGRESS: "false" });
  const fixtures = [
    ["Googlebot", "66.249.66.1", "crawl-66-249-66-1.googlebot.com"],
    ["Bingbot", "157.55.39.1", "msnbot-157-55-39-1.search.msn.com"],
    ["Applebot", "17.58.96.1", "crawler.applebot.apple.com"],
    ["DuckDuckBot", "20.191.45.212", ""],
    ["YandexBot", "5.255.253.1", "spider.yandex.com"],
    ["Baiduspider", "123.125.71.1", "spider.crawl.baidu.com"],
    ["Slurp", "74.6.18.1", "crawler.crawl.yahoo.net"],
  ] as const;
  let dnsLookups = 0;
  const verifier = loadIsolatedModule<typeof import("./verifiedSearchCrawler")>("src/lib/verifiedSearchCrawler.ts", {
    "node:net": { isIP },
    "@/lib/botEdge": edge,
    "@/lib/botRegistry": registry,
    "node:dns/promises": {
      reverse: async (ip: string) => {
        dnsLookups++;
        if (ip === "8.8.8.8") throw Error("Fixture DNS outage");
        if (ip === "8.8.4.4") return [fixtures[0][2]];
        const host = fixtures.find(([, address]) => address === ip)?.[2];
        return host ? [host] : [];
      },
      lookup: async (host: string) => fixtures.filter(([, , name]) => name === host).map(([, address]) => ({ address })),
    },
  });
  const officialFeeds = loadIsolatedModule<typeof import("./operatorCrawlerNetwork")>("src/lib/operatorCrawlerNetwork.ts", {
    "node:net": { BlockList, isIP },
  });
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url === "https://duckduckgo.com/duckduckbot.json") return Response.json({ prefixes: [{ ipv4Prefix: fixtures[3][1] + "/32" }] });
    if (url === "https://developers.google.com/crawling/ipranges/common-crawlers.json") {
      return Response.json({ prefixes: [{ ipv4Prefix: "66.249.67.0/24" }] });
    }
    assert.fail("Unexpected fixture fetch: " + url);
  });
  const gate = loadIsolatedModule<typeof import("./searchCrawlerGate")>("src/lib/searchCrawlerGate.ts", {
    "@/lib/botEdge": edge,
    "@/lib/operatorCrawlerNetwork": officialFeeds,
    "@/lib/botRegistry": registry,
    "@/lib/verifiedSearchCrawler": verifier,
  });
  const { search, counts } = fixture(gate.identifySearchCrawler, edge);
  const request = (agent: string, path: string, headers: Record<string, string>) =>
    new Request(origin + path, { method: "POST", headers: { ...headers, "User-Agent": agent } });
  const forwarded = (agent: string, path: string, ip: string, headers: Record<string, string> = {}) => {
    const visitor = request(agent, path, {
      ...headers, "CF-Connecting-IP": ip, "X-Kurioticket-Edge-IP": "8.8.8.8", "X-Kurioticket-Edge-Auth": "client-input",
    });
    Object.defineProperty(visitor, "cf", { value: { country: "US" } });
    const upstream = edgeRequest(visitor, config);
    assert.ok(upstream);
    const rewrites = new Headers(upstream.headers);
    rewrites.set("CF-Connecting-IP", "8.8.8.8");
    return new Request(upstream, { headers: rewrites });
  };
  const path = "/api/flights/search";
  for (const [agent, ip] of fixtures) {
    for (const product of ["flights", "hotels", "cars", "packages"]) {
      const originRequest = forwarded(agent, "/api/" + product + "/search", ip);
      assert.equal(edge.trustedBotIngress(originRequest)?.ip, ip, agent);
      assert.equal((await search(originRequest)).status, 204, agent + " " + product);
    }
    const lookupsBeforeForgery = dnsLookups;
    assert.equal((await search(request(agent, path, {
      "CF-Connecting-IP": ip, "X-Forwarded-For": ip, "X-Kurioticket-Edge-Version": "1",
      "X-Kurioticket-Edge-IP": ip, "X-Kurioticket-Edge-Auth": "forged", "Rndr-Id": "fixture",
    }))).status, 403, agent);
    assert.equal(dnsLookups, lookupsBeforeForgery, "Untrusted IPs never reach DNS");
    assert.equal((await search(forwarded(agent, path, ip, { "CF-Worker": "example.com" }))).status, 403, agent);
  }
  assert.equal((await search(forwarded("Googlebot", path, "66.249.67.1"))).status, 204, "Official IP range fallback");
  assert.equal(counts.reservations, 29);
  assert.equal(counts.dispatches, 29);
  assert.equal(await verifier.matchReportedSearchCrawlerAddress("GOOGLEBOT", fixtures[0][1]), "FORWARD_CONFIRMED_DNS");
  assert.equal((await search(request("Googlebot", path, { "CF-Connecting-IP": fixtures[0][1] }))).status, 403);
  for (const ip of ["8.8.8.8", "8.8.4.4", "2a06:98c0:3600::103"]) {
    assert.equal((await search(forwarded("Googlebot", path, ip))).status, 403, ip);
  }
  for (const agent of ["GPTBot", "NovelSpider"]) {
    assert.equal((await search(forwarded(agent, path, fixtures[0][1]))).status, 403, agent);
  }
  assert.equal(counts.reservations, 29);
  assert.equal(counts.dispatches, 29);
  for (const agent of ["Mozilla/5.0 Chrome/133.0", "okhttp/4.12", "KurioticketPreview/53 CFNetwork"]) {
    assert.equal((await search(forwarded(agent, path, fixtures[0][1]))).status, 204, agent);
  }
  assert.equal(counts.reservations, 29);
  assert.equal(counts.dispatches, 32);
});
