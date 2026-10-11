import test from "node:test";
import assert from "node:assert/strict";
import { KayakSandboxClient, KayakPartialSearchError } from "./kayakSandbox";

const click = "https://affiliates.kayak.com/sandbox-clickout";
for (const vertical of ["cars", "flights"] as const) {
  const search = vertical === "cars"
    ? { vertical, origin: "LAX", departure: "2026-12-01", returnDate: "2026-12-03" }
    : { vertical, origin: "LHR", destination: "CDG", departure: "2026-12-01", adults: 1 };
  const page = {
    status: "complete", totalCount: 2, pageSize: 1, searchId: "search", cluster: "cluster",
    currency: "USD", priceMode: vertical === "cars" ? "perDayTotal" : "total",
    legs: { l: { segments: [{ id: "s" }] } },
    segments: { s: { origin: "LHR", destination: "CDG", airline: "BA" } },
    results: [{ legs: [{ id: "l" }], bookingOptions: [{
      type: "regular", car: { brand: "Test car" }, price: { price: 50 },
      displayPrice: { price: 50 }, bookingUrl: click,
    }] }],
  };
  for (const status of [429, 503]) {
    test(`${vertical} preserves completed offers after later HTTP ${status}`, async () => {
      let calls = 0;
      const client = new KayakSandboxClient("test", async () => ++calls === 1
        ? Response.json(page) : new Response(null, { status }), async () => {});
      await assert.rejects(client.search(search, "test-track"), error => {
        assert.ok(error instanceof KayakPartialSearchError);
        assert.equal(error.offers.length, 1);
        assert.equal(error.offers[0].price, 50);
        assert.equal(error.code, status === 429 ? "rate_limited" : "server_error");
        return true;
      });
      assert.equal(calls, vertical === "cars" && status === 503 ? 3 : 2);
    });
  }
  test(`${vertical} preserves completed offers when the later request times out`, async () => {
    let calls = 0;
    const controller = new AbortController();
    const client = new KayakSandboxClient("test", async () => {
      if (++calls === 1) return Response.json(page);
      controller.abort();
      throw new Error("credential-bearing transport exception must not escape");
    }, async () => {});
    await assert.rejects(client.search(search, "test-track", controller.signal), error => {
      assert.ok(error instanceof KayakPartialSearchError);
      assert.equal(error.code, "timeout");
      assert.equal(error.offers.length, 1);
      assert.doesNotMatch(error.message, /credential-bearing/);
      return true;
    });
    assert.equal(calls, 2);
  });
  test(`${vertical} does not preserve an inconsistent repeated page`, async () => {
    const client = new KayakSandboxClient("test", async () => Response.json(page), async () => {});
    await assert.rejects(client.search(search, "test-track"), error => {
      assert.ok(!(error instanceof KayakPartialSearchError));
      assert.equal((error as { code: string }).code, "invalid_response");
      return true;
    });
  });
}
