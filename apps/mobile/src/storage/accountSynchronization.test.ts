import { createSearchDiagnostics } from "../../../../src/shared/search/diagnostics";
import { abortTravelRequest, travelAbortReason, describeTransportFailure } from "../api/travelTransportFailure";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

test("account lifecycle refreshes on focus/resume and clears state on account replacement", async () => {
  const cleanups: Array<() => void> = [];
  let onSession: (session: { user: { id: string } } | null) => void = () => undefined;
  let onApp: (state: string) => void = () => undefined;
  let refreshes = 0, resets = 0;
  const modules: Record<string, unknown> = {
    react: { useRef: (current: unknown) => ({ current }), useCallback: (fn: unknown) => fn, useEffect: (fn: () => () => void) => { cleanups.push(fn()); } },
    "expo-router": { useFocusEffect: (fn: () => () => void) => { cleanups.push(fn()); } },
    "react-native": { AppState: { addEventListener: (_name: string, fn: typeof onApp) => { onApp = fn; return { remove: () => undefined }; } } },
    "./sessionStorage": { readSession: async () => ({ user: { id: "a" } }), subscribeSession: (fn: typeof onSession) => { onSession = fn; return () => undefined; } },
  };
  const exports: { useAccountRefresh: (refresh: () => void, reset: () => void) => void } = {} as never;
  runInNewContext(ts.transpileModule(readFileSync("src/storage/useAccountRefresh.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: (name: string) => modules[name] });
  exports.useAccountRefresh(() => { refreshes++; }, () => { resets++; });
  await Promise.resolve(); assert.equal(refreshes, 1);
  onApp("active"); assert.equal(refreshes, 2);
  onSession({ user: { id: "b" } }); assert.equal(resets, 1); assert.equal(refreshes, 3);
  onSession(null); assert.equal(resets, 2);
  cleanups.forEach(cleanup => cleanup());
});

test("saved transport refuses wrong-owner work and discards a response after sign-out", async () => {
  let actor: { token: string; user: { id: string } } | null = { token: "a-token", user: { id: "a" } };
  let onSession = () => undefined;
  let finish!: (response: Response) => void;
  let requests = 0;
  const modules: Record<string, unknown> = {
    "./travelTransportFailure": { abortTravelRequest, travelAbortReason, describeTransportFailure },
    "../config/apiUrl": { getApiBaseUrl: () => ({ ok: true, baseUrl: "https://kurioticket.com" }) },
    "../storage/sessionStorage": { readSession: async () => actor, subscribeSession: (fn: typeof onSession) => { onSession = fn; } },
    "react-native": { Platform: { OS: "ios" } }, "expo-constants": { default: { expoConfig: { version: "0.3.0" } } }, "expo-crypto": { randomUUID: () => "request" },
    "./exploreCatalogueContract": {}, "../features/search/flightSearchDiagnostics": {},
    "../../../../src/shared/search/diagnostics": { createSearchDiagnostics },
    "../features/privacy/visitorIdentity": { visitorIdentity: { headers: async () => ({}), trackingContext: () => null } },
    "../features/privacy/journeyResponseContext": {}, "../features/auth/authApi": {}, "../../../../src/lib/providerHandoffClient": {},
  };
  const exports: { travelApi: { savedItems: (owner?: string) => Promise<unknown> } } = {} as never;
  runInNewContext(ts.transpileModule(readFileSync("src/api/travelApi.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; }, __DEV__: false,
    Date, performance, AbortController, setTimeout, clearTimeout, console, URLSearchParams,
    fetch: () => { requests++; return new Promise<Response>(resolve => { finish = resolve; }); },
  });
  await assert.rejects(exports.travelApi.savedItems("b"), /Account changed/); assert.equal(requests, 0);
  const pending = exports.travelApi.savedItems("a");
  const rejected = assert.rejects(pending, /Account changed/);
  while (!finish) await Promise.resolve();
  actor = null; onSession(); finish(Response.json({ items: [{ private: "a" }] })); await rejected;
});

test("a slow secure-store read cannot restore an account after a newer session event", async () => {
  let revision = 0, calls = 0;
  let finish!: (value: string) => void;
  const account = (id: string) => JSON.stringify({ token: id, expires: "2099-01-01T00:00:00Z", user: { id, email: `${id}@example.com` } });
  const modules: Record<string, unknown> = {
    "react-native": { Platform: { OS: "ios" } },
    "expo-secure-store": { getItemAsync: async () => ++calls === 1 ? new Promise<string>(resolve => { finish = resolve; }) : account("b") },
    "./sessionEvents": { publishSession: () => { revision++; }, getSessionRevision: () => revision },
  };
  const exports: { readSession: () => Promise<{ user: { id: string } }> } = {} as never;
  runInNewContext(ts.transpileModule(readFileSync("src/storage/sessionStorage.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, require: (name: string) => modules[name] });
  const pending = exports.readSession(); revision++; finish(account("a"));
  assert.equal((await pending).user.id, "b"); assert.equal(calls, 2);
});
