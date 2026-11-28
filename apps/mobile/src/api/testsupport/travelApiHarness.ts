import { abortTravelRequest, travelAbortReason, describeTransportFailure } from "../travelTransportFailure";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {URL as NodeURL} from "node:url";
import ts from "typescript";
import { createSearchDiagnostics } from "../../../../../src/shared/search/diagnostics";
export function nativeTravelApiHarness(platform = "android", version = "0.3.0", baseUrl = "https://staging.kurioticket.com", respond?: (url:string,init:RequestInit)=>Promise<Response>,options:{registered?:boolean;signedSearchCredential?:string;abortController?:typeof AbortController;visitor?:{headers: (path: string) => Promise<Record<string, string>>;trackingContext: () => number | null}}={}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const journeyResponses:unknown[]=[];
  const journeyContexts: Array<number | null> = [];
  type HarnessSession = { user: { id: string }; token: string } | null;
  let session: HarnessSession = options.registered === false ? null : { user: { id: "test-user" }, token: "test-session" };
  const sessionListeners = new Set<(next: HarnessSession) => void>();
  const dependencies: Record<string, unknown> = {
    "../../../../src/shared/search/diagnostics": { createSearchDiagnostics },
    "./travelTransportFailure": { abortTravelRequest, travelAbortReason, describeTransportFailure },
    "../config/apiUrl": { getApiBaseUrl: () => ({ ok: true, baseUrl }) },
    "../storage/sessionStorage": { readSession: async () => session, subscribeSession: (listener: (next: HarnessSession) => void) => {
      sessionListeners.add(listener); return () => { sessionListeners.delete(listener); };
    } },
    "react-native": { Platform: { OS: platform } },
    "expo-constants": { default: { expoConfig: { version } } },
    "expo-crypto": { randomUUID: () => "00000000-0000-4000-8000-000000000001" },
    "./exploreCatalogueContract": { parseMobileExploreCatalogue: () => null },
    "../features/search/flightSearchDiagnostics": { logFlightSearchCheckpoint: () => {} },
    "../features/privacy/visitorIdentity": { visitorIdentity: options.visitor ?? { headers: async () => ({}), trackingContext: () => null } },
    "../features/privacy/journeyResponseContext": { rememberJourneyResponseContext: (data:unknown, context: number | null) => {
      journeyResponses.push(data);
      journeyContexts.push(context);
    } },
    "../features/auth/authApi": {},
    "../../../../src/lib/providerHandoffClient": { createProviderHandoffMetadata: () => () => ({}) },
  };
  const compiled = ts.transpileModule(readFileSync(new NodeURL("../travelApi.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: any = {};
  runInNewContext(compiled, { exports: exported, require: (name: string) => { assert.ok(name in dependencies, name); return dependencies[name]; }, __DEV__: false, AbortController: options.abortController ?? AbortController, setTimeout, clearTimeout, Date, performance, URLSearchParams, console,
    fetch: async (url: string, init: RequestInit) => { calls.push({ url, init }); return respond ? respond(url,init) : Response.json({ results: [], status: "empty" },{headers:options.signedSearchCredential?{"X-Kt-Search-Session":options.signedSearchCredential}:{}}); },
  });
  return { api: exported.travelApi, headers: exported.carSearchClientHeaders as (platform: string, version?: string) => Record<string,string>, calls,journeyResponses,journeyContexts,
    existingOperationalCredential: exported.readExistingGuestOperationalSearchCredential as () => string | null,
    subscribeOperationalCredential: exported.subscribeOperationalSearchCredential as (listener: () => void) => () => void,
    setSession: (next: HarnessSession) => { session = next; sessionListeners.forEach(listener => listener(next)); },
  };
}
