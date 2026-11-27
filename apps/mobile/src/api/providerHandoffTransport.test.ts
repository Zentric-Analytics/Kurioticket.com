import { abortTravelRequest, travelAbortReason, describeTransportFailure } from "./travelTransportFailure";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { URL as NodeURL } from "node:url";
import test from "node:test";
import ts from "typescript";
import { createProviderHandoffMetadata, type ProviderHandoffMetadataReader } from "../../../../src/lib/providerHandoffClient";
import { JourneyEventCoordinator } from "../features/privacy/journeyEventCoordinator";

const searchId = "78e1de9e-6dfe-494f-9fdb-83726d83bf64";
const receipt = "46080b3a-d572-400e-bd8a-7de5d07cb2a5";
type RedirectOptions = { handoff?: ProviderHandoffMetadataReader; operationalRequestId?: string };

function fixture() {
  let context: number | null = 1;
  let onIdentity = () => undefined;
  let failRequest = false;
  let now = Date.now();
  let sessionListener: ((session: { token: string } | null) => void) | undefined;
  const credential = `v2.78e1de9e-6dfe-494f-9fdb-83726d83bf64.${now + 30 * 60_000}.staging.ios.${"a".repeat(43)}`;
  const calls: Array<{ url: string; body: Record<string, unknown>; headers: Record<string, string> }> = [];
  const coordinator = new JourneyEventCoordinator({ context: () => context, createId: () => receipt, send: async () => ({ accepted: true }) });
  coordinator.rememberSearch(searchId, coordinator.captureContext());
  const dependencies: Record<string, unknown> = {
    "./travelTransportFailure": { abortTravelRequest, travelAbortReason, describeTransportFailure },
    "../config/apiUrl": { getApiBaseUrl: () => ({ ok: true, baseUrl: "https://staging.kurioticket.com" }) },
    "../storage/sessionStorage": { readSession: async () => ({ token: "test-session" }), subscribeSession: (listener: typeof sessionListener) => { sessionListener = listener; } },
    "react-native": { Platform: { OS: "ios" } },
    "expo-constants": { default: { expoConfig: { version: "0.1.0" } } },
    "expo-crypto": { randomUUID: () => receipt },
    "./exploreCatalogueContract": { parseMobileExploreCatalogue: () => null },
    "../features/search/flightSearchDiagnostics": { logFlightSearchCheckpoint: () => undefined },
    "../features/privacy/visitorIdentity": { visitorIdentity: {
      headers: async () => { onIdentity(); return context === null ? {} : { "x-kt-visitor": "test-visitor" }; },
      trackingContext: () => context,
    } },
    "../features/privacy/journeyResponseContext": { rememberJourneyResponseContext: () => undefined },
    "../features/auth/authApi": {},
    "../../../../src/lib/providerHandoffClient": { createProviderHandoffMetadata },
  };
  const compiled = ts.transpileModule(readFileSync(new NodeURL("./travelApi.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported: { travelApi?: { searchFlights: (body: Record<string, unknown>) => Promise<{ requestId: string }>; flightRedirect: (id: string, options?: RedirectOptions) => Promise<{ url: string }>; hotelRedirect: (id: string, options?: RedirectOptions) => Promise<{ url: string }> } } = {};
  runInNewContext(compiled, {
    exports: exported,
    require: (name: string) => { assert.ok(name in dependencies, `unexpected dependency ${name}`); return dependencies[name]; },
    __DEV__: false, AbortController, setTimeout, clearTimeout, Date: class extends Date { static now() { return now; } }, performance, URLSearchParams, console,
    fetch: async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(init.body as string), headers: { ...init.headers } as Record<string, string> });
      if (failRequest) { failRequest = false; throw new Error("network failure"); }
      if (url.endsWith("/api/flights/search")) return Response.json({ requestId: searchId, results: [] }, { headers: { "X-Kt-Search-Session": credential } });
      return Response.json({ url: "https://provider.test/booking" });
    },
  });
  return {
    api: exported.travelApi!, coordinator, calls,
    switchDuringIdentity: (next: number | null) => { onIdentity = () => { context = next; }; },
    failOnce: () => { failRequest = true; },
    advanceTime: () => { now += 30 * 60_000; },
    switchAccount: () => { sessionListener?.({ token: "replacement" }); },
    switchAccountDuringIdentity: () => { onIdentity = () => { sessionListener?.({ token: "replacement" }); }; },
  };
}

test("native handoff sends the actual original search UUID only in the first-party POST body", async () => {
  const h = fixture();
  const response = await h.api.flightRedirect("alternate-fare", { handoff: h.coordinator.prepareHandoff(searchId) });
  assert.equal(response.url, "https://provider.test/booking");
  assert.deepEqual(h.calls[0].body, { id: "alternate-fare", type: "flight", sourcePage: "native_flight_details", handoffId: receipt, requestId: searchId });
  assert.equal(h.calls[0].url, "https://staging.kurioticket.com/api/redirect");
  assert.equal(h.calls[0].headers["X-Search-Request-Id"], undefined);
  assert.equal(h.calls.length, 1, "the transport never sends optional identity to the provider URL");
});

test("native transport rechecks correlation after session/identity awaits and still returns the provider link", async () => {
  for (const next of [2, null]) {
    const h = fixture();
    const handoff = h.coordinator.prepareHandoff(searchId);
    h.switchDuringIdentity(next);
    assert.equal((await h.api.hotelRedirect("actual-room-rate", { handoff })).url, "https://provider.test/booking");
    assert.equal(h.calls[0].body.requestId, undefined);
    assert.equal(h.calls[0].body.handoffId, receipt);
  }
});

test("retrying a native logical handoff reuses its receipt while context-free actions omit search correlation", async () => {
  const h = fixture();
  const handoff = h.coordinator.prepareHandoff(searchId);
  h.failOnce();
  await assert.rejects(h.api.hotelRedirect("rate", { handoff }));
  await h.api.hotelRedirect("rate", { handoff });
  assert.equal(h.calls[0].body.handoffId, h.calls[1].body.handoffId);
  await h.api.flightRedirect("saved-or-deep-linked-offer");
  assert.equal(h.calls[2].body.requestId, undefined);
  assert.equal(h.calls[2].body.handoffId, receipt);
});

test("native Essential handoff uses an actual operational search response without analytics consent", async () => {
  const h = fixture();
  h.switchDuringIdentity(null);
  await h.api.searchFlights({});
  const handoff = h.coordinator.prepareHandoff(searchId);
  await h.api.flightRedirect("fare", { handoff, operationalRequestId: searchId });
  assert.equal(h.calls[1].body.operationalRequestId, searchId);
  assert.equal(h.calls[1].body.requestId, undefined, "no optional journey correlation");
  assert.equal(h.calls[1].headers["x-kt-visitor"], undefined);
  assert.ok(h.calls[1].headers["X-Kt-Search-Session"]);
  assert.equal(h.calls[1].url, "https://staging.kurioticket.com/api/redirect");
});
test("native operational reference is absent for unknown, expired or replaced account context", async () => {
  for (const scenario of ["unknown", "expired", "account-switch"] as const) {
    const h = fixture();
    if (scenario !== "unknown") await h.api.searchFlights({});
    if (scenario === "expired") h.advanceTime();
    if (scenario === "account-switch") h.switchAccount();
    await h.api.hotelRedirect("rate", { operationalRequestId: searchId });
    assert.equal(h.calls.at(-1)?.body.operationalRequestId, undefined);
  }
});

test("native account change during identity restoration cannot send the previous operational reference", async () => {
  const h = fixture();
  await h.api.searchFlights({});
  h.switchAccountDuringIdentity();
  await h.api.flightRedirect("fare", { operationalRequestId: searchId });
  assert.equal(h.calls.at(-1)?.body.operationalRequestId, undefined);
  assert.equal(h.calls.at(-1)?.headers["X-Kt-Search-Session"], undefined);
});
