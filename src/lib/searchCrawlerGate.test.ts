import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import type { VerifiedSearchCrawler } from "./verifiedSearchCrawler";

function gate(crawler: VerifiedSearchCrawler | null) {
  const deferred: Array<() => Promise<unknown>> = [];
  const writes: Array<Record<string, unknown>> = [];
  const exported: {
    blockVerifiedCrawlerSearch: (request: Request, product: "FLIGHT" | "HOTEL" | "CAR") => Promise<Response | null>;
  } = {} as never;
  const dependencies: Record<string, unknown> = {
    "next/server": { after: (callback: () => Promise<unknown>) => deferred.push(callback) },
    "@/lib/verifiedSearchCrawler": { verifySearchCrawler: async () => crawler },
    "@/services/analyticsService": { logProviderCall: async (entry: Record<string, unknown>) => { writes.push(entry); } },
  };
  const compiled = ts.transpileModule(readFileSync(new URL("./searchCrawlerGate.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(compiled, {
    exports: exported, require: (key: string) => {
      assert.ok(key in dependencies, "unexpected dependency " + key);
      return dependencies[key];
    }, Response, console,
  });
  return { gate: exported.blockVerifiedCrawlerSearch, deferred, writes };
}

test("verified Google/Bing crawler POSTs are blocked with isolated aggregate telemetry", async () => {
  for (const crawler of ["GOOGLEBOT", "BINGBOT"] as const) {
    for (const product of ["FLIGHT", "HOTEL", "CAR"] as const) {
      const fixture = gate(crawler);
      const request = new Request("https://staging.kurioticket.com/api/flights/search", {
        method: "POST", headers: { "user-agent": crawler },
      });
      const blocked = await fixture.gate(request, product);
      assert.equal(blocked?.status, 403);
      assert.equal(blocked?.headers.get("cache-control"), "no-store");
      assert.deepEqual(await blocked?.json(), { error: "Automated search requests are unavailable.", code: "CRAWLER_SEARCH_BLOCKED" });
      assert.equal(fixture.writes.length, 0, "never delay the HTTP result for diagnostics");
      assert.equal(fixture.deferred.length, 1);
      await fixture.deferred[0]();
      assert.deepEqual(JSON.parse(JSON.stringify(fixture.writes[0])), {
        provider: crawler, service: "crawler-blocked-search", status: "DISABLED",
        metadata: { applicationSource: "CRAWLER", product },
      });
      assert.doesNotMatch(JSON.stringify(fixture.writes), /userAgent|ipAddress|requestId|visitorId|userId/);
    }
  }
});

test("non-crawler searches pass through with no writes, blocks or customer delay", async () => {
  const fixture = gate(null);
  assert.equal(await fixture.gate(new Request("https://staging.kurioticket.com/api/flights/search"), "FLIGHT"), null);
  assert.equal(fixture.deferred.length, 0);
  assert.equal(fixture.writes.length, 0);
});
