import test from "node:test";
import assert from "node:assert/strict";
import { KayakSandboxClient, type KayakSearchTiming } from "./kayakSandbox";

test("car transient retry backoff is measured as local wait, not provider time", async () => {
  let calls = 0;
  const reports: KayakSearchTiming[] = [];
  const client = new KayakSandboxClient("test", async () => ++calls === 1
    ? new Response(null, { status: 503 })
    : Response.json({ status: "complete", totalCount: 0, results: [], currency: "USD", priceMode: "total" }),
  async ms => { assert.equal(ms, 300); await new Promise(resolve => setTimeout(resolve, 40)); },
  undefined, undefined, timing => reports.push(timing));
  await client.search({ vertical: "cars", origin: "LAX", departure: "2026-12-01", returnDate: "2026-12-03" }, "track");
  assert.equal(calls, 2);
  const timing = reports[0];
  assert.equal(timing.status, "success");
  assert.ok(timing.waitMs >= 20);
  assert.ok(timing.stages.initial.elapsedMs + timing.waitMs <= timing.elapsedMs + 2);
});

for (const vertical of ["flights", "cars", "hotels"] as const) {
  test(`${vertical} does not sleep after exhausting its polling attempts`, async () => {
    let calls = 0;
    let waits = 0;
    const client = new KayakSandboxClient("test", async () => {
      calls++;
      return Response.json(vertical === "hotels" ? { isComplete: false }
        : { status: "first-phase", searchId: "s", cluster: "4" });
    }, async () => { waits++; }, undefined, undefined, () => {});
    const search = vertical === "hotels"
      ? { vertical, destination: "kplace:123", departure: "2026-12-01", returnDate: "2026-12-03", adults: 1 }
      : { vertical, origin: "LAX", destination: "JFK", departure: "2026-12-01", returnDate: "2026-12-03", adults: 1 };
    await assert.rejects(client.search(search, "track"), { code: "timeout" });
    assert.equal(calls, 12);
    assert.equal(waits, 11);
  });
  test(`${vertical} reports bounded stage timings without search or credential data`, async () => {
    const reports: KayakSearchTiming[] = [];
    let calls = 0;
    const client = new KayakSandboxClient("private-key", async () => {
      calls++;
      return Response.json(vertical === "hotels"
        ? { isComplete: calls > 1, totalFilteredResults: 0, results: [], currencyCode: "USD" }
        : calls === 1 ? { status: "first-phase", searchId: "private-search", cluster: "4" }
          : { status: "complete", totalCount: 0, results: [], currency: "USD", priceMode: "total" });
    }, async () => {}, undefined, "127.0.0.1", timing => reports.push(timing));
    const search = vertical === "hotels"
      ? { vertical, destination: "kplace:123", departure: "2026-12-01", returnDate: "2026-12-03", adults: 1 }
      : { vertical, origin: "LAX", destination: "JFK", departure: "2026-12-01", returnDate: "2026-12-03", adults: 1 };
    assert.deepEqual(await client.search(search, "private-track"), []);
    assert.equal(calls, 2);
    assert.equal(reports.length, 1);
    assert.equal(reports[0].status, "success");
    assert.equal(reports[0].stages.initial.operations, 1);
    assert.equal(reports[0].stages.poll.operations, 1);
    assert.equal(reports[0].stages.metadata.operations, 0);
    assert.ok(reports[0].elapsedMs >= 0);
    assert.doesNotMatch(JSON.stringify(reports), /private|127\.0\.0\.1|LAX|kplace|apiKey/);
  });
  test(`${vertical} reports failed searches without raw errors`, async () => {
    const reports: KayakSearchTiming[] = [];
    const client = new KayakSandboxClient("private-key", async () => new Response(null, { status: 429 }),
      async () => {}, undefined, undefined, timing => reports.push(timing));
    const search = vertical === "hotels"
      ? { vertical, destination: "kplace:123", departure: "2026-12-01", returnDate: "2026-12-03", adults: 1 }
      : { vertical, origin: "LAX", destination: "JFK", departure: "2026-12-01", returnDate: "2026-12-03", adults: 1 };
    await assert.rejects(client.search(search, "track"));
    assert.equal(reports.length, 1);
    assert.equal(reports[0].status, "failed");
    assert.equal(reports[0].stages.initial.operations, 1);
    assert.equal(reports[0].resultCount, 0);
  });
}

test("empty hotel search skips optional metadata and diagnostic errors cannot break results", async () => {
  let calls = 0;
  const client = new KayakSandboxClient("test", async () => {
    calls++;
    return Response.json({ isComplete: true, totalFilteredResults: 0, results: [], currencyCode: "USD" });
  }, undefined, undefined, undefined, () => { throw new Error("sink unavailable"); });
  assert.deepEqual(await client.search({ vertical: "hotels", destination: "kplace:123", departure: "2026-12-01", returnDate: "2026-12-03", adults: 1 }, "track"), []);
  assert.equal(calls, 1);
});
