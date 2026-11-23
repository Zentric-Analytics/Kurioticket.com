import assert from "node:assert/strict";
import test from "node:test";
import { createJourneyEventSender, displayedJourneyRequest, forgetJourneySelections, journeyRequestId, journeySourcePath, readJourneySelection, rememberJourneySelection } from "./journeyEventClient";
import { analyticsConsentAccountKey, createVisitorConsentSynchronizer } from "./analyticsConsentClient";
import { readFlightResultsSessionSnapshot, writeFlightResultsSessionSnapshot } from "./flights/flightResultsSessionCache";
import { readHotelReturnSnapshot, rememberHotelReturnSnapshot } from "./hotels/hotelReturnSnapshot";

const tick = () => new Promise<void>(resolve => setImmediate(resolve));
const accepted = () => Response.json({ accepted: true }, { status: 202 });
const requestId = "31d323d2-733b-48c1-b8bf-98f0b5e7dc26";
const secondRequestId = "ac4323ce-d396-4b70-a545-9dcb7ba2a5cb";
const viewed = { type: "RESULTS_VIEWED" as const, requestId, sourcePage: "/flights/results?email=private@example.com#details" };

function fixture(respond: (attempt: number, init: RequestInit) => Promise<Response> = async () => accepted()) {
  const calls: Array<{ url: string; init: RequestInit; body: Record<string, unknown> }> = [];
  const timers = new Map<number, { delay: number; callback: () => void }>();
  let timerId = 0;
  let id = 0;
  let allowed = true;
  const sender = createJourneyEventSender({
    allowed: () => allowed,
    eventId: () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
    request: async (url, init) => { calls.push({ url, init, body: JSON.parse(init.body as string) }); return respond(calls.length, init); },
    schedule: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId as unknown as ReturnType<typeof setTimeout>; },
    cancel: (timer) => { timers.delete(timer as unknown as number); },
  });
  return {
    sender, calls, timers,
    allow: (next: boolean) => { allowed = next; },
    enable: () => { sender.setContext("guest"); sender.setConsent(true); },
    runTimer: async () => {
      const next = [...timers.entries()].sort((a, b) => a[1].delay - b[1].delay)[0];
      assert.ok(next, "expected a scheduled retry");
      timers.delete(next[0]); next[1].callback(); await tick();
      return next[1].delay;
    },
  };
}

test("unknown and declined consent cannot create pending or transmitted events", () => {
  const f = fixture();
  assert.equal(f.sender.send(viewed), false);
  f.sender.setContext("guest");
  f.allow(false);
  assert.equal(f.sender.send(viewed), false);
  f.sender.setConsent(true);
  assert.equal(f.sender.send({ ...viewed, type: "OFFER_SELECTED" }), false);
  assert.equal(f.calls.length, 0);
  assert.equal(f.timers.size, 0);
});

test("an explicit grant holds and deduplicates observations until canonical confirmation", async () => {
  const f = fixture(); f.sender.setContext("guest");
  assert.equal(f.sender.send(viewed), true);
  assert.equal(f.sender.send(viewed), false);
  assert.equal(f.calls.length, 0);
  assert.equal(f.timers.size, 1);
  f.sender.setConsent(true); await tick();
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].body.requestId, requestId);
  assert.equal(f.timers.size, 0);
});

test("real selection and detail context survive navigation while the consent bridge confirms", async () => {
  let confirm!: (response: Response) => void;
  const f = fixture(); f.sender.setContext("guest");
  const bridge = createVisitorConsentSynchronizer({
    readChoice: () => "granted",
    request: async () => new Promise<Response>(resolve => { confirm = resolve; }),
    onSaved: context => f.sender.setConsent(context.choice === "granted"),
  });
  const sync = bridge.sync({ choice: "granted", accountKey: "guest" });
  await tick();
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  f.sender.send(viewed);
  if (f.sender.send({ ...viewed, type: "OFFER_SELECTED", provider: "Duffel" })) {
    rememberJourneySelection("flight", "offer-1", requestId, "guest", storage);
  }
  const detailRequest = readJourneySelection("flight", "offer-1", "guest", storage);
  assert.equal(detailRequest, requestId);
  assert.equal(f.sender.send({ type: "OFFER_SELECTED", requestId: detailRequest!, provider: "Duffel", sourcePage: "/flights/details/offer-1" }), true);
  assert.equal(f.calls.length, 0);
  confirm(Response.json({ analyticsTracking: "enabled" }));
  await sync; await tick();
  assert.deepEqual(f.calls.map(call => call.body.type), ["RESULTS_VIEWED", "OFFER_SELECTED", "OFFER_SELECTED"]);
  assert.ok(f.calls.every(call => call.body.requestId === requestId));
  assert.equal(f.calls[2].body.sourcePage, "/flights/details/offer-1");
  assert.equal(f.timers.size, 0);
});

test("unconfirmed intent expires and its queue is bounded during a slow or failed consent sync", async () => {
  const f = fixture(); f.sender.setContext("guest");
  for (let index = 0; index < 128; index += 1) assert.equal(f.sender.send({ ...viewed, type: "OFFER_SELECTED" }), true);
  assert.equal(f.sender.send({ ...viewed, type: "OFFER_SELECTED" }), false);
  assert.equal(f.calls.length, 0);
  assert.equal(f.timers.size, 128);
  while (f.timers.size) assert.equal(await f.runTimer(), 30_000);
  f.sender.setConsent(true); await tick();
  assert.equal(f.calls.length, 0);
});

test("withdrawal and account changes discard unconfirmed intent before any HTTP request", async () => {
  for (const change of ["withdrawal", "account", "unmount"] as const) {
    const f = fixture(); f.sender.setContext("guest");
    f.sender.send({ ...viewed, type: "OFFER_SELECTED" });
    if (change === "withdrawal") { f.allow(false); f.sender.setConsent(false); }
    else f.sender.setContext(change === "account" ? "account-b" : null);
    f.allow(true); f.sender.setConsent(true); await tick();
    assert.equal(f.calls.length, 0);
    assert.equal(f.timers.size, 0);
  }
});

test("results rerenders deduplicate while distinct user selections keep distinct event IDs", async () => {
  const f = fixture(); f.enable();
  assert.equal(f.sender.send(viewed), true);
  assert.equal(f.sender.send(viewed), false);
  await tick();
  assert.equal(f.sender.send(viewed), false);
  assert.equal(f.sender.send({ ...viewed, type: "OFFER_SELECTED", provider: "Duffel" }), true);
  assert.equal(f.sender.send({ ...viewed, type: "OFFER_SELECTED", provider: "Duffel" }), true);
  await tick();
  assert.equal(f.calls.length, 3);
  assert.equal(new Set(f.calls.map(call => call.body.eventId)).size, 3);
  assert.deepEqual(Object.keys(f.calls[1].body).sort(), ["eventId", "provider", "requestId", "sourcePage", "type"]);
  assert.equal(f.calls[0].body.sourcePage, "/flights/results");
  assert.equal(f.calls[0].url, "/api/journey/events");
  assert.equal(f.calls[0].init.credentials, "same-origin");
  assert.equal(f.calls[0].init.keepalive, true);
});

test("the deferred-history race retries the same event UUID and stops after acceptance", async () => {
  const f = fixture(async attempt => attempt === 1 ? Response.json({ accepted: false, retryable: true }, { status: 202 }) : accepted());
  f.enable(); f.sender.send(viewed); await tick();
  assert.equal(await f.runTimer(), 250);
  assert.equal(f.calls.length, 2);
  assert.deepEqual(f.calls[0].body, f.calls[1].body);
  assert.equal(f.timers.size, 0);
});

test("network, rate-limit, and server failures use bounded retries without blocking the action", async () => {
  const f = fixture(async attempt => {
    if (attempt === 1) throw new Error("Offline");
    return new Response(null, { status: attempt === 2 ? 429 : 503 });
  });
  f.enable();
  assert.equal(f.sender.send({ ...viewed, type: "OFFER_SELECTED" }), true);
  await tick();
  assert.equal(await f.runTimer(), 250);
  assert.equal(await f.runTimer(), 1000);
  assert.equal(await f.runTimer(), 3000);
  assert.equal(f.calls.length, 4);
  assert.equal(new Set(f.calls.map(call => call.body.eventId)).size, 1);
  assert.equal(f.timers.size, 0);
});

test("permanent identity rejection and invalid requests are not retried", async () => {
  for (const response of [Response.json({ accepted: false }, { status: 202 }), new Response(null, { status: 400 }), new Response(null, { status: 403 })]) {
    const f = fixture(async () => response); f.enable(); f.sender.send(viewed); await tick();
    assert.equal(f.calls.length, 1);
    assert.equal(f.timers.size, 0);
  }
});

test("withdrawal cancels an in-flight event and does not revive its retry after a late response", async () => {
  let finish!: (response: Response) => void;
  const f = fixture(async () => new Promise<Response>(resolve => { finish = resolve; }));
  f.enable(); f.sender.send(viewed); await tick();
  f.allow(false); f.sender.setConsent(false);
  assert.equal(f.calls[0].init.signal?.aborted, true);
  finish(Response.json({ accepted: false, retryable: true })); await tick();
  assert.equal(f.timers.size, 0);
  assert.equal(f.sender.send(viewed), false);
});

test("account changes and app unmount cancel queued retries from the previous context", async () => {
  for (const next of ["account-b", null]) {
    const f = fixture(async () => Response.json({ accepted: false, retryable: true }));
    f.enable(); f.sender.send(viewed); await tick();
    assert.equal(f.timers.size, 1);
    f.sender.setContext(next);
    assert.equal(f.timers.size, 0);
    assert.equal(f.calls.length, 1);
  }
});

test("a same-tab refusal is rechecked before retry even if the notification has not fired", async () => {
  const f = fixture(async () => Response.json({ accepted: false, retryable: true }));
  f.enable(); f.sender.send(viewed); await tick();
  f.allow(false); await f.runTimer();
  assert.equal(f.calls.length, 1);
  assert.equal(f.timers.size, 0);
});

test("same-account loading refresh reannounces readiness without another results impression", async () => {
  const f = fixture();
  const user = { id: "account-a", status: "ACTIVE", emailVerified: true, accountSessionId: "session-a" };
  const actor = analyticsConsentAccountKey("authenticated", user);
  f.sender.setContext(actor);
  let identityRequests = 0;
  const bridge = createVisitorConsentSynchronizer({
    readChoice: () => "granted",
    request: async url => { identityRequests += 1; return Response.json(url.endsWith("merge") ? { merged: true } : { analyticsTracking: "enabled" }); },
    onSaved: context => { f.sender.setConsent(context.choice === "granted"); },
  });
  await bridge.sync({ choice: "granted", accountKey: actor });
  f.sender.send(viewed); await tick();
  f.sender.setContext(analyticsConsentAccountKey("loading", user));
  await bridge.sync({ choice: "granted", accountKey: null });
  f.sender.setContext(actor);
  assert.equal(f.sender.send({ ...viewed, type: "OFFER_SELECTED" }), true);
  assert.equal(f.calls.length, 1);
  await bridge.sync({ choice: "granted", accountKey: actor }); await tick();
  assert.equal(f.sender.send(viewed), false);
  assert.equal(identityRequests, 2);
  assert.deepEqual(f.calls.map(call => call.body.type), ["RESULTS_VIEWED", "OFFER_SELECTED"]);
});

test("a cached display cannot become a new observation after withdrawal and regrant", async () => {
  const f = fixture(); f.enable(); f.sender.send(viewed); await tick();
  f.allow(false); f.sender.setConsent(false);
  assert.equal(f.sender.send({ ...viewed, requestId: secondRequestId }), false);
  f.allow(true); f.sender.setConsent(true);
  assert.equal(f.sender.send(viewed), false);
  assert.equal(f.sender.send({ ...viewed, requestId: secondRequestId }), false);
  assert.equal(f.sender.send({ ...viewed, requestId: "327a0ec9-080d-4151-97f1-83922aa993c9" }), true);
  await tick(); assert.equal(f.calls.length, 2);
});

test("only a current, completed, nonempty results display supplies a journey request", () => {
  const input = { response: { searchKey: "current", requestId }, currentSearchKey: "current", loading: false, error: "", visibleCount: 2 };
  assert.equal(displayedJourneyRequest(input), requestId);
  for (const changed of [{ response: null }, { currentSearchKey: "new-search" }, { loading: true }, { error: "unavailable" }, { visibleCount: 0 }]) {
    assert.equal(displayedJourneyRequest({ ...input, ...changed }), null);
  }
});

test("detail selection carries the real request ID only within the same actor and freshness window", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  rememberJourneySelection("hotel", "hotel-1", requestId, "account-a", storage, 1000);
  assert.equal(readJourneySelection("hotel", "hotel-1", "account-a", storage, 2000), requestId);
  assert.equal(readJourneySelection("hotel", "hotel-1", "account-b", storage, 2000), null);
  assert.equal(readJourneySelection("flight", "hotel-1", "account-a", storage, 2000), null);
  assert.equal(readJourneySelection("hotel", "hotel-1", "account-a", storage, 2_000_000), null);
});

test("revocation forgets only journey detail context and preserves unrelated session state", () => {
  const values = new Map<string, string>([["unrelated", "keep"]]);
  const storage = {
    get length() { return values.size; }, key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  rememberJourneySelection("hotel", "hotel-1", requestId, "guest", storage);
  rememberJourneySelection("flight", "flight-1", requestId, "guest", storage);
  forgetJourneySelections(storage);
  assert.equal(readJourneySelection("hotel", "hotel-1", "guest", storage), null);
  assert.deepEqual([...values], [["unrelated", "keep"]]);
});

test("flight and hotel return snapshots retain their actual response request ID", () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  writeFlightResultsSessionSnapshot("flight-search", [], [], 10000, storage, 1000, requestId);
  assert.equal(readFlightResultsSessionSnapshot("flight-search", storage, 2000)?.requestId, requestId);
  rememberHotelReturnSnapshot("hotel-search", [], 1000, secondRequestId);
  assert.equal(readHotelReturnSnapshot("hotel-search", 2000)?.requestId, secondRequestId);
});

test("only actual opaque server UUIDs qualify as search request context", () => {
  assert.equal(journeyRequestId(requestId.toUpperCase()), requestId);
  for (const value of [null, "search-123", "private@example.com", "" , `${requestId}?token=private`]) assert.equal(journeyRequestId(value), null);
  const f = fixture(); f.enable();
  assert.equal(f.sender.send({ ...viewed, requestId: "search-123" }), false);
  assert.equal(f.calls.length, 0);
});

test("source paths exclude query data, fragments, and external URLs", () => {
  assert.equal(journeySourcePath("/hotels/results?destination=private#rates"), "/hotels/results");
  assert.equal(journeySourcePath("https://provider.example/checkout"), undefined);
  assert.equal(journeySourcePath("//provider.example/checkout"), undefined);
  assert.equal(journeySourcePath("/\\provider.example/checkout"), undefined);
  assert.equal(journeySourcePath("/hotels/private details"), undefined);
});
