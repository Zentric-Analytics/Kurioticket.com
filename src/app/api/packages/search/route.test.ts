import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createPackageSearchHandler } from "@/lib/deals/packageSearchHandler";
const POST = createPackageSearchHandler(async () => true);

test("package search rejects incomplete component context", async () => {
  const response = await POST(new Request("http://local/api/packages/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "hotel-flight", sharedDestination: "London" }) }));
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.error, "Package search needs more detail.");
  assert.ok(body.issues.flight);
  assert.ok(body.issues.hotel);
});

test("package search rejects malformed JSON", async () => {
  const response = await POST(new Request("http://local/api/packages/search", { method: "POST", body: "{" }));
  assert.equal(response.status, 400);
});

test("package search rejects unknown journey scopes and hotel-first flight-car requests", async () => {
  for (const body of [{ mode: "hotel-flight", journey: "everything" }, { mode: "flight-car", journey: "staged" }]) {
    const response = await POST(new Request("http://local/api/packages/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});

function packageRouteFixture(options: {
  bot?: boolean;
  identity?: { userId: string | null; visitorId: string | null; applicationSource: string };
  status?: string;
} = {}) {
  const deferred: Array<() => Promise<unknown>> = [];
  const recorded: Array<Record<string, unknown>> = [];
  let providerCalls = 0, verificationCalls = 0, rateCalls = 0;
  const modules: Record<string, unknown> = {
    "@/lib/deals/dealsSearchParams": {
      getIncludedProducts: () => ({ hotel: true }),
      parseDealsSearchParams: () => ({ mode: "hotel-flight" }),
      validateDealsSearch: () => ({}),
    },
    "@/services/travel/packageOrchestrator": {
      searchPackage: async () => {
        providerCalls++;
        return {
          status: options.status ?? "success", mode: "hotel-flight", query: { mode: "hotel-flight" },
          components: { flight: { status: "success", results: [1, 2] },
            hotel: { status: "success", results: [3] } },
          packageOffers: [],
        };
      },
    },
    "@/lib/feature-controls/service": { isFeatureEnabled: async () => true },
    "@/lib/rate-limit": {
      checkRateLimit: () => { rateCalls++; return { allowed: true }; },
      getClientIp: () => "203.0.113.1",
    },
    "@/lib/botSecurity": { withBotSearch: async (_: Request, run: (value: unknown) => unknown) => {
      verificationCalls++;
      return run(options.bot ? { crawler: { name: "GOOGLEBOT", evidence: "VERIFIED_DNS" }, requestId: "bot-package",
        reserve: async () => null, outcome: () => undefined } : null);
    } },
    "@/lib/searchCrawlerGate": {
      searchCrawlerMetadata: (crawler: { name: string; evidence: string } | null) => crawler ? ({
        identifiedCrawler: crawler.name, crawlerEvidence: crawler.evidence,
        ...(crawler.evidence === "VERIFIED_DNS" ? { verifiedCrawler: crawler.name } : {}),
      }) : {},
    },
    "@/lib/search-journey": { resolveSearchRequestId: (value: string | null) => value || crypto.randomUUID() },
    "@/lib/visitor-identity": { isSameOriginRequest: (request: Request) => request.headers.get("sec-fetch-site") !== "cross-site" },
    "@/services/requestActivityIdentity": { resolveRequestActivityIdentity: async () => options.identity ?? {
      userId: null, visitorId: null, applicationSource: "WEB",
    } },
    "next/server": { after: (callback: () => Promise<unknown>) => deferred.push(callback) },
    "@/services/operationalActivityService": { logSearchHistory: async (value: Record<string, unknown>) => {
      recorded.push(value);
    } },
  };
  const compiled = ts.transpileModule(readFileSync("src/lib/deals/packageSearchHandler.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  runInNewContext(compiled, {
    exports, Response, URL, URLSearchParams, crypto, performance, require: (name: string) => {
      assert.ok(name in modules, name);
      return modules[name];
    },
  });
  return { post: exports.POST!, deferred, recorded, getCounts: () => ({ providerCalls, verificationCalls, rateCalls }) };
}

test("verified bot package search executes once and records one BOT search, not each component", async () => {
  const { post, deferred, recorded, getCounts } = packageRouteFixture({ bot: true });
  const response = await post(new Request("https://staging.kurioticket.com/api/packages/search", {
    method: "POST", headers: { "user-agent": "Googlebot/2.1" },
    body: JSON.stringify({ mode: "hotel-flight" }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(getCounts(), { providerCalls: 1, verificationCalls: 1, rateCalls: 0 });
  assert.equal(recorded.length, 0, "history is deferred until after the response");
  assert.equal(deferred.length, 1);
  await deferred[0]();
  assert.equal(recorded.length, 1, "one package search, not component count");
  assert.equal(recorded[0].applicationSource, "BOT");
  assert.equal(recorded[0].type, "PACKAGE");
  assert.equal(recorded[0].resultCount, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(recorded[0].query)), {
    mode: "hotel-flight", identifiedCrawler: "GOOGLEBOT", crawlerEvidence: "VERIFIED_DNS", verifiedCrawler: "GOOGLEBOT",
    searchPurpose: "package", packageScope: "all", resultUnit: "component_results",
  });
});

test("canonical customer package returns the same ID as one parent search with a verified owner", async () => {
  const requestId = crypto.randomUUID();
  const fixture = packageRouteFixture({
    identity: { userId: "registered-account", visitorId: "eligible-visitor", applicationSource: "IOS" },
    status: "partial",
  });
  const response = await fixture.post(new Request("http://local/api/packages/search", {
    method: "POST", headers: { "x-search-request-id": requestId },
    body: JSON.stringify({ mode: "hotel-flight", journey: "staged" }),
  }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).requestId, requestId);
  assert.equal(fixture.recorded.length, 0);
  await Promise.all(fixture.deferred.map(run => run()));
  assert.equal(fixture.recorded.length, 1);
  const [row] = fixture.recorded;
  assert.equal(row.requestId, requestId);
  assert.equal(row.type, "PACKAGE");
  assert.equal(row.userId, "registered-account");
  assert.equal(row.visitorId, "eligible-visitor");
  assert.equal(row.applicationSource, "IOS");
  assert.equal(row.status, "PARTIAL");
  assert.equal(row.resultCount, 3);
  assert.equal(row.requiresActivityOwner, true);
  assert.deepEqual(JSON.parse(JSON.stringify(row.query)), {
    mode: "hotel-flight", searchPurpose: "package", packageScope: "hotel_only", resultUnit: "component_results",
  });
});

test("canonical package search does not add a history for unidentified callers or cross-site requests", async () => {
  for (const crossSite of [false, true]) {
    const fixture = packageRouteFixture(crossSite ? {
      identity: { userId: "registered-account", visitorId: "eligible-visitor", applicationSource: "WEB" },
    } : {});
    const response = await fixture.post(new Request("http://local/api/packages/search", {
      method: "POST", headers: crossSite ? { "sec-fetch-site": "cross-site" } : {},
      body: JSON.stringify({ mode: "hotel-flight" }),
    }));
    assert.equal(response.status, 200);
    await Promise.all(fixture.deferred.map(run => run()));
    assert.equal(fixture.recorded.length, 0);
  }
});
