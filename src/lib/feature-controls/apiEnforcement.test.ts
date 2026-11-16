import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

for (const product of ["flights", "hotels", "cars", "packages"]) {
  for (const platform of ["web", "ios", "android"]) test(`${product} shutdown blocks ${platform} before provider or body processing`, async () => {
    const exported: { POST?: (request: Request) => Promise<Response> } = {};
    const source = readFileSync(`src/app/api/${product}/search/route.ts`, "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(compiled, {
      exports: exported, Response, URL, performance, crypto: { randomUUID: () => "request-id" },
      require: (name: string) => {
        if (name === "next/server") return { NextResponse: { json: Response.json } };
        if (name === "@/lib/feature-controls/service") return { isFeatureEnabled: async () => false };
        if (name === "@/lib/search-journey") return { resolveSearchRequestId: () => "request-id" };
        return new Proxy({}, { get: () => () => { throw new Error(`Disabled request touched ${name}`); } });
      },
    });
    const response = await exported.POST!(new Request(`https://kurioticket.com/api/${product}/search`, {
      method: "POST", headers: platform === "web" ? { Origin: "https://kurioticket.com" } : { "X-Mobile-Platform": platform }, body: "invalid-json",
    }));
    assert.equal(response.status, 503);
  });
}
