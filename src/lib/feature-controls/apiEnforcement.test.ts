import { withProductionSandboxRequest } from "@/lib/productionSandboxPolicy";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function loadModule<T>(path: string) {
  const source = readFileSync(path, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported = {};
  runInNewContext(compiled, {
    exports: exported, Response, URL, performance, crypto: { randomUUID: () => "request-id" },
    require: (name: string) => {
      if (name === "@/lib/productionSandboxPolicy") return {withProductionSandboxRequest};
      if (name === "next/server") return { NextResponse: { json: Response.json } };
      if (name === "@/lib/feature-controls/service") return { isFeatureEnabled: async () => false };
      if (name === "@/lib/searchCrawlerGate") return { blockVerifiedCrawlerSearch: async () => null };
      if (name === "@/lib/search-journey") return { resolveSearchRequestId: () => "request-id" };
      if (name === "./handler" || name === "../search/handler") return loadModule("src/app/api/flights/search/handler.ts");
      return new Proxy({}, { get: () => () => { throw new Error(`Disabled request touched ${name}`); } });
    },
  });
  return exported as T;
}

for (const endpoint of ["flights/search", "flights/nearby-fare", "hotels/search", "cars/search", "packages/search"]) {
  for (const platform of ["web", "ios", "android"]) test(`${endpoint} shutdown blocks ${platform} before provider or body processing`, async () => {
    const path = endpoint === "packages/search" ? "src/lib/deals/packageSearchHandler.ts" : `src/app/api/${endpoint}/route.ts`;
    const { POST } = loadModule<{ POST(request: Request): Promise<Response> }>(path);
    const response = await POST(new Request(`https://kurioticket.com/api/${endpoint}`, {
      method: "POST", headers: platform === "web" ? { Origin: "https://kurioticket.com" } : { "X-Mobile-Platform": platform }, body: "invalid-json",
    }));
    assert.equal(response.status, 503);
  });
}
