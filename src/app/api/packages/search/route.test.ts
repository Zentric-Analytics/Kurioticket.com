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

test("verified bot package search executes once and records one BOT search, not each component", async () => {
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
          status: "success", mode: "hotel-flight", query: { mode: "hotel-flight" },
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
    "@/lib/searchCrawlerGate": { identifyVerifiedCrawlerSearch: async () => {
      verificationCalls++;
      return "GOOGLEBOT";
    } },
    "next/server": { after: (callback: () => Promise<unknown>) => deferred.push(callback) },
    "@/services/analyticsService": { logSearchHistory: async (value: Record<string, unknown>) => {
      recorded.push(value);
    } },
  };
  const compiled = ts.transpileModule(readFileSync("src/lib/deals/packageSearchHandler.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  runInNewContext(compiled, {
    exports, Response, URL, crypto, performance, require: (name: string) => {
      assert.ok(name in modules, name);
      return modules[name];
    },
  });
  const response = await exports.POST!(new Request("https://staging.kurioticket.com/api/packages/search", {
    method: "POST", headers: { "user-agent": "Googlebot/2.1" },
    body: JSON.stringify({ mode: "hotel-flight" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(providerCalls, 1);
  assert.equal(verificationCalls, 1);
  assert.equal(rateCalls, 1);
  assert.equal(recorded.length, 0, "history is deferred until after the response");
  assert.equal(deferred.length, 1);
  await deferred[0]();
  assert.equal(recorded.length, 1, "one package search, not component count");
  assert.equal(recorded[0].applicationSource, "BOT");
  assert.equal(recorded[0].type, "PACKAGE");
  assert.equal(recorded[0].resultCount, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(recorded[0].query)), {
    mode: "hotel-flight", verifiedCrawler: "GOOGLEBOT", searchPurpose: "package",
  });
});
