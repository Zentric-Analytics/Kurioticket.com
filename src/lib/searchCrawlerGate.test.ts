import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import type { VerifiedSearchCrawler } from "./verifiedSearchCrawler";

function identification(crawler: VerifiedSearchCrawler | null) {
  const requests: Request[] = [];
  const exported: {
    identifyVerifiedCrawlerSearch: (request: Request) => Promise<VerifiedSearchCrawler | null>;
  } = {} as never;
  const compiled = ts.transpileModule(readFileSync(new URL("./searchCrawlerGate.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(compiled, {
    exports: exported, require: (key: string) => {
      assert.equal(key, "@/lib/verifiedSearchCrawler");
      return { verifySearchCrawler: async (request: Request) => {
        requests.push(request);
        return crawler;
      } };
    },
  });
  return { identify: exported.identifyVerifiedCrawlerSearch, requests };
}

test("verified Googlebot and Bingbot are identified without blocking search execution", async () => {
  for (const crawler of ["GOOGLEBOT", "BINGBOT"] as const) {
    const fixture = identification(crawler);
    const request = new Request("https://staging.kurioticket.com/api/flights/search", {
      method: "POST", headers: { "user-agent": crawler },
    });
    assert.equal(await fixture.identify(request), crawler);
    assert.deepEqual(fixture.requests, [request]);
  }
});

test("unverified requests remain ordinary searches, never BOT", async () => {
  const fixture = identification(null);
  const request = new Request("https://staging.kurioticket.com/api/flights/search", { method: "POST" });
  assert.equal(await fixture.identify(request), null);
  assert.deepEqual(fixture.requests, [request]);
});
