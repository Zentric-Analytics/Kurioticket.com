import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { StoredSession } from "../../storage/sessionStorage";
import { createNativePresenceClient, type ExistingGuestPresenceCredentials } from "./nativePresenceClient";

const flush = () => new Promise<void>(resolve => setImmediate(resolve));
const account: StoredSession = { token: "account-bearer", expires: "2099-01-01T00:00:00Z", user: { id: "account-a", email: "account@example.invalid" } };

function fixture(baseUrl = "https://staging.kurioticket.com", initial: StoredSession | null = null) {
  let session = initial;
  let guestToken: string | null = "V".repeat(43);
  let context: number | null = 1;
  let searchToken: string | null = `v2.00000000-0000-4000-8000-000000000001.${Date.now() + 60_000}.staging.ios.${"A".repeat(43)}`;
  let reads = 0;
  let cleanup: (() => void) | undefined;
  const sessions = new Set<(value: StoredSession | null) => void>();
  const visitors = new Set<() => void>();
  const searches = new Set<() => void>();
  const requests: Request[] = [];
  const dependencies: Record<string, unknown> = {
    react: { useEffect: (effect: () => () => void) => { cleanup = effect(); } },
    "react-native": { Platform: { OS: "ios" }, AppState: { currentState: "active", addEventListener: () => ({ remove() {} }) } },
    "../../config/apiUrl": { getApiBaseUrl: () => ({ ok: true, baseUrl }) },
    "../../storage/sessionStorage": {
      readStoredSession: async () => session,
      subscribeStoredSession: (listener: (value: StoredSession | null) => void) => { sessions.add(listener); return () => { sessions.delete(listener); }; },
    },
    "./nativePresenceClient": { createNativePresenceClient: (base: string, platform: "ios" | "android", _fetcher: unknown, read?: () => ExistingGuestPresenceCredentials) =>
      createNativePresenceClient(base, platform, async (input, init) => {
        requests.push(new Request(input, init));
        return new Response(null, { status: 204 });
      }, read),
    },
    "./visitorIdentity": { visitorIdentity: {
      existingGuestToken: () => { reads++; return guestToken; },
      trackingContext: () => context,
      subscribe: (listener: () => void) => { visitors.add(listener); return () => { visitors.delete(listener); }; },
    } },
    "../../api/travelApi": {
      readExistingGuestOperationalSearchCredential: () => { reads++; return searchToken; },
      subscribeOperationalSearchCredential: (listener: () => void) => { searches.add(listener); return () => { searches.delete(listener); }; },
    },
  };
  const source = readFileSync(new URL("./useNativePresence.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exported: { useNativePresence?: () => void } = {};
  runInNewContext(compiled, { exports: exported, __DEV__: false, require: (name: string) => {
    assert.ok(name in dependencies, "unexpected dependency " + name); return dependencies[name];
  } });
  exported.useNativePresence!();
  return {
    requests, reads: () => reads, listeners: () => sessions.size + visitors.size + searches.size,
    setSession: (next: StoredSession | null) => { session = next; sessions.forEach(listener => listener(next)); },
    decline: () => { guestToken = null; context = null; visitors.forEach(listener => listener()); },
    clearSearch: () => { searchToken = null; searches.forEach(listener => listener()); },
    stop: () => cleanup?.(),
  };
}

test("native hook preserves recovery context and wires guest credential updates without account leakage", async context => {
  const h = fixture(undefined, { ...account, recovery: { deadline: "2099-01-01T00:00:00Z" } });
  context.after(h.stop);
  await flush();
  assert.equal(h.requests.length, 0, "recovery hydration must not become guest presence");
  h.setSession(null);
  await flush();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].headers.get("x-kt-visitor"), "V".repeat(43));
  assert.match(h.requests[0].headers.get("x-kt-search-session")!, /^v2\./);
  h.decline();
  await flush();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].headers.get("x-kt-visitor"), null);
  assert.ok(h.requests[1].headers.get("x-kt-search-session"));
  h.clearSearch();
  await flush();
  assert.equal(h.requests.length, 3);
  assert.equal(h.requests[2].headers.get("x-kt-search-session"), null);
  h.setSession(account);
  await flush();
  assert.equal(h.requests.length, 4);
  assert.equal(h.requests[3].headers.get("authorization"), "Bearer account-bearer");
  assert.equal(h.requests[3].headers.get("x-kt-visitor"), null);
  assert.equal(h.requests[3].headers.get("x-kt-search-session"), null);
  h.stop();
  assert.equal(h.listeners(), 0);
});

test("production native hook neither reads nor subscribes to guest history credentials", async context => {
  const h = fixture("https://kurioticket.com");
  context.after(h.stop);
  await flush();
  assert.equal(h.reads(), 0);
  assert.equal(h.listeners(), 1, "only the existing session subscription remains");
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].headers.get("x-kt-visitor"), null);
  assert.equal(h.requests[0].headers.get("x-kt-search-session"), null);
});
