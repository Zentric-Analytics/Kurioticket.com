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

test("verified crawler package search never fans out to flight, hotel or car providers", async () => {
  let gated = 0, providerCalls = 0, featureCalls = 0, rateCalls = 0;
  const modules: Record<string, unknown> = {
    "@/lib/deals/dealsSearchParams": {
      getIncludedProducts: () => { throw Error("must not inspect package details"); },
      parseDealsSearchParams: () => { throw Error("must not parse package"); },
      validateDealsSearch: () => { throw Error("must not validate package"); },
    },
    "@/services/travel/packageOrchestrator": {
      searchPackage: async () => { providerCalls++; throw Error("no provider fan-out"); },
    },
    "@/lib/feature-controls/service": {
      isFeatureEnabled: async () => { featureCalls++; return true; },
    },
    "@/lib/rate-limit": {
      checkRateLimit: () => { rateCalls++; return { allowed: true }; },
      getClientIp: () => "203.0.113.1",
    },
    "@/lib/searchCrawlerGate": {
      blockVerifiedCrawlerSearch: async (_request: Request, product: string) => {
        gated++;
        assert.equal(product, "PACKAGE");
        return Response.json({ code: "CRAWLER_SEARCH_BLOCKED" }, { status: 403 });
      },
    },
  };
  const compiled = ts.transpileModule(readFileSync("src/lib/deals/packageSearchHandler.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  runInNewContext(compiled, {
    exports, Response, URL, crypto, require: (name: string) => {
      assert.ok(name in modules, name);
      return modules[name];
    },
  });
  const result = await exports.POST!(new Request("https://staging.kurioticket.com/api/packages/search", {
    method: "POST", headers: { "user-agent": "Googlebot/2.1" }, body: "{unparseable",
  }));
  assert.equal(result.status, 403);
  assert.equal((await result.json()).code, "CRAWLER_SEARCH_BLOCKED");
  assert.equal(gated, 1);
  assert.equal(providerCalls, 0);
  assert.equal(featureCalls, 0);
  assert.equal(rateCalls, 0);
});
