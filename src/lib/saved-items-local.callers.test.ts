import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { readSavedItemIds, toggleSavedItemId, writeSavedItemIds } from "./saved-items-local";

// Execute the actual production handler AST with explicit UI/network boundaries.
// Legacy storage is deliberately unchanged; result saves must not use it for guests.
const surfaces = [
  { label: "homepage discovery", path: "src/app/page.tsx", handler: "handleSavedItemToggle", reportsConfirmedAction: false },
  { label: "flight discovery", path: "src/components/results/FlightResultsClient.tsx", handler: "handleSavedRouteToggle", reportsConfirmedAction: false },
  { label: "flight details", path: "src/components/results/flightDetails/StandaloneFlightDetails.tsx", handler: "toggleSavedFlight", reportsConfirmedAction: true },
  { label: "flight result card", path: "src/components/results/useSavedFlightResult.ts", handler: "toggleSavedFlight", reportsConfirmedAction: true },
] as const;

function productionHandler(path: string, name: string, boundaries: Record<string, unknown>) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const matches: ts.Node[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer) matches.push(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.equal(matches.length, 1, `exact production handler must exist: ${path}:${name}`);
  const compiled = ts.transpileModule(`const invoke = (${matches[0].getText(source)}); invoke;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  return runInNewContext(compiled, boundaries) as (...args: unknown[]) => Promise<void>;
}

async function runHandler(surface: typeof surfaces[number], mode: "quota" | "blocked" | "normal", initiallySaved: boolean, authenticated = false) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const key = "fixture-item";
  const initial = initiallySaved ? [key] : [];
  const stored = new Map([["kurioticket_saved_items_v1", JSON.stringify(initial)]]);
  let state = [...initial];
  let error: string | null = null;
  let pending = false;
  const actions: string[] = [];
  const backendCalls: string[] = [];
  const signIns: unknown[] = [];
  const events: string[] = [];
  const analyticsConsent = authenticated && mode !== "blocked" ? new AbortController().signal : null;
  const browser = Object.defineProperty({
    dispatchEvent(event: Event) { events.push(event.type); },
    location: { pathname: "/flights/details/fixture-item", search: "", href: "https://example.test/flights/details/fixture-item" },
  }, "localStorage", { get() {
    if (mode === "blocked") throw new DOMException("Fixture storage denied", "SecurityError");
    return {
      getItem(name: string) { return stored.get(name) ?? null; },
      setItem(name: string, value: string) { if (mode === "quota") throw new DOMException("Fixture storage full", "QuotaExceededError"); stored.set(name, value); },
      removeItem(name: string) { stored.delete(name); },
    };
  } });
  const setIds = (update: string[] | ((current: string[]) => string[])) => { state = typeof update === "function" ? update(state) : update; };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
    const handler = productionHandler(surface.path, surface.handler, {
      readSavedItemIds, toggleSavedItemId, writeSavedItemIds,
      signIn: async (_provider: unknown, options: unknown) => { signIns.push(options); },
      sessionStatus: authenticated ? "authenticated" : "unauthenticated",
      status: authenticated ? "authenticated" : "unauthenticated",
      savedItemIds: initial, backendSavedItemIds: { [key]: "fixture-server-item" },
      setSavedItemIds: setIds, setLocalSavedFlightIds: setIds,
      setLocalSaved(value: boolean) { state = value ? [key] : []; },
      setSavedItemError(value: string) { error = value; },
      setSavedFlightError(value: string | null) { error = value; },
      setSavedFlightPending(value: boolean) { pending = value; },
      setPending(value: boolean) { pending = value; },
      pending: false, savedFlightPending: false,
      selectedOffer: { id: key }, savedFlightKey: key, flight: { id: key }, id: key,
      savedItem: initiallySaved ? { id: "fixture-server-item" } : null,
      savedFlightBackendId: initiallySaved ? "fixture-server-item" : null,
      savedFlightsCache: initiallySaved ? [{ id: "fixture-server-item" }] : [],
      setSavedItem(value: unknown) { state = value ? [key] : []; },
      setSavedFlightBackendId(value: unknown) { state = value ? [key] : []; },
      setBackendSavedItemIds() {}, invalidateSavedFlightsClientCache() {}, publishSavedFlights() {},
      journeyEvents: { interactionRequestId: () => null }, searchRequestId: null, observedResult: undefined,
      beginCustomerInteraction: () => analyticsConsent,
      recordCustomerInteraction(consent: AbortSignal | null, value: { action: string }) {
        assert.equal(consent, analyticsConsent);
        if (consent && !consent.aborted) actions.push(value.action);
      },
      deleteBackendDiscovery: async (id: string) => { backendCalls.push(id); return { ok: true }; },
      fetch: async (url: string) => { backendCalls.push(url); return { ok: true }; },
      SavedFlightTimeError: class SavedFlightTimeError extends Error {},
      window: browser, Event, LOCAL_SAVED_FLIGHTS_CHANGED_EVENT: "fixture-local-saves-changed",
    });
    await handler({ preventDefault() {}, stopPropagation() {} }, key);
    return { state, error, pending, actions, backendCalls, signIns, events, stored: stored.get("kurioticket_saved_items_v1"), initial };
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous); else Reflect.deleteProperty(globalThis, "window");
  }
}

for (const surface of surfaces) {
  test(`${surface.label} requires sign-in and never writes or records a guest save`, async () => {
    for (const mode of ["normal", "quota", "blocked"] as const) for (const saved of [false, true]) {
      const result = await runHandler(surface, mode, saved);
      assert.deepEqual(result.state, result.initial);
      assert.equal(result.stored, JSON.stringify(result.initial));
      assert.ok(!result.error);
      assert.equal(result.pending, false);
      assert.deepEqual(result.actions, []);
      assert.deepEqual(result.events, []);
      assert.deepEqual(result.backendCalls, []);
      assert.equal(result.signIns.length, 1);
      assert.equal((result.signIns[0] as { callbackUrl: string }).callbackUrl, "https://example.test/flights/details/fixture-item");
    }
  });

  test(`${surface.label} keeps signed-in backend updates independent of local storage`, async () => {
    for (const mode of ["normal", "quota", "blocked"] as const) {
      const result = await runHandler(surface, mode, true, true);
      assert.deepEqual(result.state, []);
      assert.equal(result.backendCalls.length, 1);
      assert.equal(result.stored, '["fixture-item"]', "account backend update must not mutate guest persistence");
      assert.ok(!result.error);
      assert.deepEqual(result.actions, surface.reportsConfirmedAction && mode !== "blocked" ? ["saved_item_removed"] : []);
    }
  });
}
