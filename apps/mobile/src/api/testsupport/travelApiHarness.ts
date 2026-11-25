import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {URL as NodeURL} from "node:url";
import ts from "typescript";
export function nativeTravelApiHarness(platform = "android", version = "0.3.0", baseUrl = "https://staging.kurioticket.com", respond?: (url:string,init:RequestInit)=>Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const dependencies: Record<string, unknown> = {
    "../config/apiUrl": { getApiBaseUrl: () => ({ ok: true, baseUrl }) },
    "../storage/sessionStorage": { readSession: async () => ({ user: { id: "test-user" }, token: "test-session" }) },
    "react-native": { Platform: { OS: platform } },
    "expo-constants": { default: { expoConfig: { version } } },
    "expo-crypto": { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    "./exploreCatalogueContract": { parseMobileExploreCatalogue: () => null },
    "../features/search/flightSearchDiagnostics": { logFlightSearchCheckpoint: () => {} },
    "../features/privacy/visitorIdentity": { visitorIdentity: { headers: async () => ({}), trackingContext: () => null } },
    "../features/privacy/journeyResponseContext": { rememberJourneyResponseContext: () => {} },
    "../../../../src/lib/providerHandoffClient": { createProviderHandoffMetadata: () => () => ({}) },
  };
  const compiled = ts.transpileModule(readFileSync(new NodeURL("../travelApi.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: any = {};
  runInNewContext(compiled, { exports: exported, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, __DEV__: false, AbortController, setTimeout, clearTimeout, Date, performance, URLSearchParams, console,
    fetch: async (url: string, init: RequestInit) => { calls.push({ url, init }); return respond ? respond(url,init) : Response.json({ results: [], status: "empty" }); },
  });
  return { api: exported.travelApi, headers: exported.carSearchClientHeaders as (platform: string, version?: string) => Record<string,string>, calls };
}