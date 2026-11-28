import assert from "node:assert/strict";
import test from "node:test";
import { nativeTravelApiHarness } from "./testsupport/travelApiHarness";
async function started(check: () => boolean) { for (let i = 0; i < 50 && !check(); i++) await Promise.resolve(); assert.ok(check(), "transport must enter the controlled boundary"); }
for (const phase of ["fetch", "body"] as const) test(`${phase}: actual 35000 ms timer preserves timeout classification`, async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); let waiting = false;
  const harness = nativeTravelApiHarness("android", "0.3.0", undefined, async (_url, init) => {
    const wait = () => new Promise<never>((_resolve, reject) => { waiting = true; init.signal!.addEventListener("abort", () => reject(new Error("private transport material")), { once: true }); });
    if (phase === "fetch") return wait();
    const response = Response.json({ results: [] }); response.json = wait; return response;
  });
  const promise = harness.api.searchFlights({});
  const failure = assert.rejects(promise, (e: { code: string; message: string }) => { assert.equal(e.code, "timeout"); assert.doesNotMatch(e.message, /private/); return true; });
  await started(() => waiting); t.mock.timers.tick(35000); await failure;
});
for (const [reason, code] of [["caller", "cancelled"], ["superseded", "superseded"], ["ui-deadline", "ui-deadline"]] as const) test(`body interruption preserves ${code}`, async () => {
  let waiting = false; const controller = new AbortController();
  const harness = nativeTravelApiHarness("android", "0.3.0", undefined, async (_url, init) => {
    const response = Response.json({ results: [] });
    response.json = () => new Promise((_resolve, reject) => { waiting = true; init.signal!.addEventListener("abort", () => reject(new Error("private URL")), { once: true }); });
    return response;
  });
  const result = harness.api.searchFlights({}, { signal: controller.signal });
  const failure = assert.rejects(result, (e: { code: string }) => e.code === code);
  await started(() => waiting); controller.abort(reason); await failure;
});
test("malformed JSON, invalid schema, network failure and HTTP denial remain distinct", async () => {
  for (const [respond, code] of [
    [async () => new Response("{"), "invalid-json"],
    [async () => Response.json([]), "invalid-schema"],
    [async () => Response.json({ results: null }), "invalid-schema"],
    [async () => { throw new Error("private network detail"); }, "network"],
    [async () => Response.json({ error: "denied" }, { status: 403 }), "http"],
  ] as const) {
    const harness = nativeTravelApiHarness("android", "0.3.0", undefined, respond);
    await assert.rejects(harness.api.searchFlights({}), (e: { code: string }) => e.code === code);
  }
});
test("partial inventory and genuine empty responses are preserved", async () => {
  for (const body of [{ results: [{ id: "synthetic-duffel" }], partial: true, status: "partial" }, { results: [], status: "empty" }]) {
    const harness = nativeTravelApiHarness("ios", "0.3.0", undefined, async () => Response.json(body));
    const result = await harness.api.searchFlights({});
    assert.deepEqual(result.results, body.results); assert.equal(result.status, body.status); assert.equal(result.partial, body.partial);
  }
});

// Exercise the same installed polyfill used by React Native, not Node's signal.reason.
import { AbortController as NativeAbortController } from "abort-controller";
import { abortTravelRequest } from "./travelTransportFailure";
for (const phase of ["fetch", "body"] as const) test(`native polyfill: ${phase} timeout remains terminal timeout`, async t => {
  t.mock.timers.enable({ apis: ["setTimeout"] }); let waiting = false;
  const harness = nativeTravelApiHarness("android", "0.3.0", undefined, async (_url, init) => {
    const wait = () => new Promise<never>((_resolve, reject) => { waiting = true; init.signal!.addEventListener("abort", () => reject(new Error("synthetic native abort")), { once: true }); });
    if (phase === "fetch") return wait();
    const response = Response.json({ results: [] }); response.json = wait; return response;
  }, { abortController: NativeAbortController as unknown as typeof AbortController });
  const result = assert.rejects(harness.api.searchFlights({}), (e: { code: string }) => e.code === "timeout");
  await started(() => waiting); t.mock.timers.tick(35000); await result;
});
for (const [reason, code] of [["caller", "cancelled"], ["superseded", "superseded"], ["ui-deadline", "ui-deadline"]] as const) test(`native polyfill preserves explicit ${code} during body consumption`, async () => {
  const parent = new NativeAbortController() as unknown as AbortController;
  let waiting = false;
  const harness = nativeTravelApiHarness("android", "0.3.0", undefined, async (_url, init) => {
    const response = Response.json({ results: [] }); response.json = () => new Promise((_resolve, reject) => { waiting = true; init.signal!.addEventListener("abort", () => reject(new Error("synthetic native abort")), { once: true }); }); return response;
  }, { abortController: NativeAbortController as unknown as typeof AbortController });
  const result = assert.rejects(harness.api.searchFlights({}, { signal: parent.signal }), (e: { code: string }) => e.code === code);
  await started(() => waiting); abortTravelRequest(parent, reason); await result;
});
