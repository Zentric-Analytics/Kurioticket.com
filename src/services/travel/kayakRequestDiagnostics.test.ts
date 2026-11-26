import test from "node:test";
import assert from "node:assert/strict";
import { KayakSandboxClient, KayakError } from "./kayakSandbox";
import { kayakAgentKind, kayakCorrelation, type KayakPhaseDiagnostic } from "./kayakRequestDiagnostics";
const id = "00000000-0000-4000-8000-000000000001";
test("recognizes truthful Android agents without declaring entitlement", () => {
  assert.equal(kayakAgentKind("KurioticketMobile/0.3.0 (Android; Native) OkHttp"), "android_application");
  assert.equal(kayakAgentKind("Dalvik/2.1"), "android_transport");
  assert.deepEqual(kayakCorrelation("private\nurl?token=secret"), {});
});
test("correlates initial supplier rejection and preserves 403 without retry or secrets", async () => {
  const events: KayakPhaseDiagnostic[] = [];
  let calls = 0;
  const client = new KayakSandboxClient("private-key", async () => { calls++; return new Response("Forbidden private-key", { status: 403 }); },
    async () => {}, "KurioticketMobile/0.3.0 (Android; Native) OkHttp", "192.0.2.1", () => {}, () => {}, () => {}, { requestId: id }, event => events.push(event));
  await assert.rejects(client.search({ vertical: "flights", origin: "LAX", destination: "SFO", departure: "2026-12-25", adults: 1 }, "private-track"),
    (error: unknown) => error instanceof KayakError && error.httpStatus === 403);
  assert.equal(calls, 1);
  assert.equal(events.every(event => event.requestId === id && event.phase === "initial" && event.product === "flights"), true);
  assert.equal(events.some(event => event.httpStatus === 403), true);
  assert.doesNotMatch(JSON.stringify(events), /private|192\.0\.2|apiKey|userTrackId/);
});
test("phase diagnostic sink failures cannot reject successful location lookup", async () => {
  const client = new KayakSandboxClient("key", async () => Response.json({ results: [] }), undefined, undefined, undefined,
    undefined, undefined, undefined, { requestId: id }, () => { throw new Error("sink"); });
  assert.deepEqual(await client.places("hotels", "New York", "track"), []);
});
test("links continuation failure to the same search while distinguishing initial creation", async () => {
  const events: KayakPhaseDiagnostic[] = [];
  let calls = 0;
  const client = new KayakSandboxClient("private-key", async () => ++calls === 1
    ? Response.json({ status: "first-phase", searchId: "private-search", cluster: "4" })
    : new Response("Forbidden", { status: 403 }),
    async () => {}, "Dalvik/2.1", "192.0.2.1", () => {}, () => {}, () => {}, { requestId: id }, event => events.push(event));
  await assert.rejects(client.search({ vertical: "flights", origin: "LAX", destination: "SFO", departure: "2026-12-25", adults: 1 }, "private-track"));
  assert.deepEqual(events.filter(event => event.outcome === "started").map(event => event.phase), ["initial", "poll"]);
  assert.equal(events.find(event => event.httpStatus === 403)?.phase, "poll");
  assert.equal(events.every(event => event.requestId === id), true);
});
test("progressive hotel pages retain correlation across batch execution", async () => {
  const events: KayakPhaseDiagnostic[] = [];
  const client = new KayakSandboxClient("private-key", async () => Response.json({ isComplete: true, totalFilteredResults: 0, currencyCode: "USD", results: [] }),
    async () => {}, undefined, undefined, () => {}, () => {}, () => {}, { requestId: id }, event => events.push(event));
  const batch = await client.searchHotelBatch({ vertical: "hotels", destination: "kplace:1", departure: "2026-12-25", returnDate: "2026-12-29", adults: 2 }, "private-track");
  assert.equal(batch.offers.length, 0);
  assert.equal(events.some(event => event.phase === "initial" && event.product === "hotels" && event.requestId === id), true);
});
