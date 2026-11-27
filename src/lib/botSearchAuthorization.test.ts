import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
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
function fixture(identify?: (request: Request) => Promise<Identity>) {
  const policy = identify ? load<typeof actualPolicy>("src/lib/botPolicy.ts", {
    "@/lib/operatorCrawlerNetwork": { confirmedOperatorNetwork: async () => false },
    "@/lib/searchCrawlerGate": { declaredSearchCrawler, identifySearchCrawler: identify },
    "@/lib/botRegistry": { crawlerPolicy, knownCrawler, recognizedCrawler },
    "@/lib/botEdge": { trustedBotEdge: () => null, trustedBotIngress: () => null },
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
