import assert from "node:assert/strict";
import test from "node:test";
import { JourneyEventCoordinator, type JourneyEvent, type JourneyEventResponse } from "./journeyEventCoordinator";
import { journeyResponseContext, rememberJourneyResponseContext } from "./journeyResponseContext";

const turn = () => new Promise<void>(resolve => setImmediate(resolve));
function harness(initialContext: number | null = 1) {
  let context = initialContext;
  let ids = 0;
  const calls: { event: JourneyEvent; context: number; signal: AbortSignal }[] = [];
  const timers: { callback: () => void; delay: number; cancelled: boolean }[] = [];
  const responses: Array<JourneyEventResponse | Error | Promise<JourneyEventResponse>> = [];
  const coordinator = new JourneyEventCoordinator({
    context: () => context,
    createId: () => `00000000-0000-4000-8000-${String(++ids).padStart(12, "0")}`,
    send: async (event, current, signal) => {
      calls.push({ event: structuredClone(event), context: current, signal });
      const response = responses.shift() ?? { accepted: true };
      if (response instanceof Error) throw response;
      return response;
    },
    schedule: (callback, delay) => {
      const timer = { callback, delay, cancelled: false };
      timers.push(timer);
      return () => { timer.cancelled = true; };
    },
  });
  return {
    coordinator, calls, timers, responses,
    ids: () => ids,
    setContext(next: number | null) { context = next; coordinator.contextChanged(); },
    remember(requestId = "server-search-1") { coordinator.rememberSearch(requestId, coordinator.captureContext()); return requestId; },
    async retry() {
      const timer = timers.find(candidate => !candidate.cancelled);
      assert.ok(timer, "a bounded retry is scheduled");
      timer.cancelled = true;
      timer.callback();
      await turn();
    },
  };
}

test("handoffs correlate only known consented search UUIDs and reuse their receipt during retries", () => {
  const h = harness();
  const requestId = h.remember("78e1de9e-6dfe-494f-9fdb-83726d83bf64");
  const handoff = h.coordinator.prepareHandoff(requestId);
  assert.equal(handoff().requestId, requestId);
  assert.deepEqual(handoff(), handoff());
  assert.equal(h.ids(), 1);
  assert.equal(h.coordinator.prepareHandoff("d7f564ce-008f-409c-9a8c-304a7300c319")().requestId, undefined);
  assert.equal(h.coordinator.prepareHandoff(h.remember("local-diagnostic-id"))().requestId, undefined);
  assert.equal(h.calls.length, 0, "preparing metadata does not introduce another optional event request");
});

test("handoff metadata drops a stale account or withdrawn context without cancelling travel", () => {
  const h = harness();
  const requestId = h.remember("78e1de9e-6dfe-494f-9fdb-83726d83bf64");
  const handoff = h.coordinator.prepareHandoff(requestId);
  const receipt = handoff().handoffId;
  h.setContext(2);
  assert.deepEqual(handoff(), { handoffId: receipt });
  assert.equal(h.coordinator.prepareHandoff(requestId)().requestId, undefined);
  h.remember(requestId);
  const beforeRefusal = h.coordinator.prepareHandoff(requestId);
  h.setContext(null); h.setContext(3);
  assert.equal(beforeRefusal().requestId, undefined);
});

test("context-free native handoffs never invent a search reference after a later grant", () => {
  const h = harness(null);
  const handoff = h.coordinator.prepareHandoff(undefined);
  h.setContext(1);
  assert.equal(handoff().requestId, undefined);
  assert.match(handoff().handoffId!, /^[0-9a-f-]{36}$/);
});

test("unknown or declined consent creates no events, UUIDs, retries or retrospective search attribution", async () => {
  const h = harness(null);
  const requestId = h.remember();
  h.coordinator.resultsViewed(requestId, "/flight-results", 3);
  h.coordinator.offerSelected(requestId, "offer-1", "Provider", "/flight-results");
  await turn();
  assert.deepEqual(h.calls, []);
  assert.equal(h.ids(), 0);
  assert.deepEqual(h.timers, []);
  h.setContext(2);
  h.coordinator.resultsViewed(requestId, "/flight-results", 3);
  await turn();
  assert.deepEqual(h.calls, [], "granting later cannot attribute an unconsented cached search");
});

test("actual displayed results use the response ID once across renders, progressive pages and cached navigation", async () => {
  const h = harness();
  const firstPage = { requestId: "server-progressive-track-id", results: ["hotel-1"] };
  h.remember(firstPage.requestId);
  h.coordinator.resultsViewed(firstPage.requestId, "/hotel-results", 0);
  h.coordinator.resultsViewed("local-diagnostic-id", "/hotel-results", 1);
  const first = h.coordinator.resultsViewed(firstPage.requestId, "/hotel-results", firstPage.results.length);
  h.remember(firstPage.requestId);
  const repeated = h.coordinator.resultsViewed(firstPage.requestId, "/hotel-results", 25);
  await turn();
  assert.equal(first, repeated);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].event.requestId, firstPage.requestId);
  assert.equal(h.calls[0].event.type, "RESULTS_VIEWED");
});

test("the first search uses consent restored by its transport, while a late previous-context response remains untracked", async () => {
  const h = harness(null);
  assert.equal(h.coordinator.captureContext(), null, "screen started before persisted identity was restored");
  h.setContext(1);
  const response = { requestId: "first-restored-search", results: ["offer"] };
  rememberJourneyResponseContext(response, h.coordinator.captureContext());
  h.coordinator.rememberSearch(response.requestId, journeyResponseContext(response));
  h.coordinator.resultsViewed(response.requestId, "/flight-results", response.results.length);
  await turn();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(Object.keys(response), ["requestId", "results"], "local context never becomes serialized response data");
  h.setContext(2);
  h.coordinator.rememberSearch(response.requestId, journeyResponseContext(response));
  h.coordinator.offerSelected(response.requestId, "offer", "Provider", "/flight-details");
  await turn();
  assert.equal(h.calls.length, 1);
});

test("history-pending, rate-limit and server retries reuse one UUID and stop after acceptance", async () => {
  const h = harness();
  h.responses.push({ accepted: false, retryable: true }, Object.assign(new Error("rate limit"), { status: 429 }), Object.assign(new Error("unavailable"), { status: 503 }), { accepted: true });
  h.coordinator.resultsViewed(h.remember(), "/flight-results", 2);
  await turn();
  await h.retry();
  await h.retry();
  await h.retry();
  assert.deepEqual(h.timers.map(timer => timer.delay), [250, 1000, 3000]);
  assert.equal(h.calls.length, 4);
  assert.equal(new Set(h.calls.map(call => call.event.eventId)).size, 1);
  assert.equal(h.timers.some(timer => !timer.cancelled), false);
});

test("network failure retries are bounded and permanent rejection is never retried", async () => {
  const h = harness();
  h.responses.push(...Array.from({ length: 4 }, () => Object.assign(new Error("offline"), { status: 0, code: "network" })));
  h.coordinator.resultsViewed(h.remember(), "/hotel-results", 1);
  await turn();
  await h.retry(); await h.retry(); await h.retry();
  assert.equal(h.calls.length, 4);
  assert.equal(h.timers.some(timer => !timer.cancelled), false);
  const rejected = harness();
  rejected.responses.push({ accepted: false });
  rejected.coordinator.resultsViewed(rejected.remember(), "/flight-results", 1);
  await turn();
  assert.equal(rejected.calls.length, 1);
  assert.deepEqual(rejected.timers, []);
});

test("withdrawal cancels scheduled retry and regrant cannot replay old details or a late search response", async () => {
  const h = harness();
  const captured = h.coordinator.captureContext();
  const requestId = h.remember();
  h.responses.push({ accepted: false, retryable: true });
  h.coordinator.resultsViewed(requestId, "/hotel-results", 1);
  await turn();
  h.setContext(null);
  assert.equal(h.calls[0].signal.aborted, true);
  assert.equal(h.timers[0].cancelled, true);
  h.setContext(2);
  h.coordinator.rememberSearch("late-search", captured);
  h.coordinator.offerSelected(requestId, "hotel-rate", "Provider", "/hotel-details");
  h.coordinator.resultsViewed("late-search", "/hotel-results", 1);
  await turn();
  assert.equal(h.calls.length, 1);
});

test("account transition aborts an in-flight event and never sends it under the replacement account", async () => {
  const h = harness();
  let finish!: (response: JourneyEventResponse) => void;
  h.responses.push(new Promise(resolve => { finish = resolve; }));
  const requestId = h.remember();
  h.coordinator.offerSelected(requestId, "flight-a", "Provider A", "/flight-details");
  await turn();
  h.setContext(2);
  finish({ accepted: false, retryable: true });
  await turn();
  assert.equal(h.calls[0].signal.aborted, true);
  assert.deepEqual(h.timers, []);
  h.coordinator.offerSelected(requestId, "flight-a", "Provider A", "/flight-details");
  h.coordinator.offerSelected(h.remember("account-b-search"), "flight-b", "Provider B", "/flight-details");
  await turn();
  assert.deepEqual(h.calls.map(call => call.context), [1, 2]);
  assert.equal(h.calls[1].event.requestId, "account-b-search");
});

test("selected result and chosen detail rates are distinct steps while a repeated booking press is deduplicated", async () => {
  const h = harness();
  const requestId = h.remember();
  h.coordinator.offerSelected(requestId, "hotel-1", "Catalogue", "/hotel-results");
  const selected = h.coordinator.offerSelected(requestId, "rate:hotel-1:offer-a", "Provider A", "/hotel-details");
  const duplicate = h.coordinator.offerSelected(requestId, "rate:hotel-1:offer-a", "Provider A", "/hotel-details");
  h.coordinator.offerSelected(requestId, "rate:hotel-1:offer-b", "Provider B", "/hotel-details");
  await turn();
  assert.equal(selected, duplicate);
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.calls.map(call => call.event.provider), ["Catalogue", "Provider A", "Provider B"]);
  assert.deepEqual(h.calls.map(call => call.event.sourcePage), ["/hotel-results", "/hotel-details", "/hotel-details"]);
  assert.equal(h.calls.every(call => call.event.type === "OFFER_SELECTED"), true);
});

test("event payloads contain path-only source context and no selected offer IDs or client identity", async () => {
  const h = harness();
  const requestId = h.remember();
  h.coordinator.offerSelected(requestId, "local-offer-dedupe-key", "Provider", "/hotel-details?private=value#rate");
  h.coordinator.resultsViewed(requestId, "https://provider.example/checkout", 1);
  await turn();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(Object.keys(h.calls[0].event).sort(), ["eventId", "provider", "requestId", "sourcePage", "type"]);
  assert.equal(h.calls[0].event.sourcePage, "/hotel-details");
  assert.equal(JSON.stringify(h.calls[0].event).includes("private"), false);
  assert.equal(JSON.stringify(h.calls[0].event).includes("local-offer"), false);
});

test("UUID failure cannot interrupt the selected travel action", () => {
  const coordinator = new JourneyEventCoordinator({ context: () => 1, createId: () => { throw new Error("unavailable"); }, send: async () => ({ accepted: true }) });
  coordinator.rememberSearch("search", coordinator.captureContext());
  assert.doesNotThrow(() => coordinator.offerSelected("search", "offer", "Provider", "/flight-results"));
});


test("consented native Car results are recorded once and cannot be replayed after account changes", async () => {
  const h = harness(1);
  const carResponse = { requestId: "9b54f962-3d08-4f82-a53d-829718142bd0", results: ["car-1"] };
  rememberJourneyResponseContext(carResponse, h.coordinator.captureContext());
  h.coordinator.rememberSearch(carResponse.requestId, journeyResponseContext(carResponse));
  const first = h.coordinator.resultsViewed(carResponse.requestId, "/car-results", carResponse.results.length);
  const duplicate = h.coordinator.resultsViewed(carResponse.requestId, "/car-results", 8);
  await turn();
  assert.equal(first, duplicate);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].event.type, "RESULTS_VIEWED");
  assert.equal(h.calls[0].event.sourcePage, "/car-results");
  assert.equal(h.calls[0].event.requestId, carResponse.requestId);
  h.setContext(2);
  h.coordinator.rememberSearch(carResponse.requestId, journeyResponseContext(carResponse));
  h.coordinator.resultsViewed(carResponse.requestId, "/car-results", 1);
  await turn();
  assert.equal(h.calls.length, 1, "old search cannot be attributed to the next signed-in user");
});
