import test from "node:test";
import assert from "node:assert/strict";
import { KayakSandboxClient } from "./kayakSandbox";

for (const acceptedSize of [10, 50]) {
  for (const total of [0, 1, 50, 51, 451]) {
    test(`cars request documented size and preserve ${total} groups at provider size ${acceptedSize}`, async () => {
      let calls = 0;
      let active = 0;
      let maxActive = 0;
      const pages: number[] = [];
      const client = new KayakSandboxClient("test", async (_url, init) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        const body = JSON.parse(String(init?.body));
        const page = body.resultParameters.pageNumber ?? 0;
        assert.equal(body.resultParameters.pageSize, calls === 0 ? 50 : acceptedSize);
        assert.equal(body.resultParameters.priceMode, "total");
        assert.equal(body.resultParameters.currency, "USD");
        pages.push(page);
        calls++;
        const results = Array.from({ length: Math.min(acceptedSize, Math.max(0, total - page * acceptedSize)) }, (_, n) => ({
          id: `car-${page * acceptedSize + n}`,
          bookingOptions: [1, 2].map(rate => ({
            type: "regular", car: { brand: "Test car" }, price: { price: rate + page * acceptedSize + n },
            bookingUrl: "https://affiliates.kayak.com/sandbox-clickout",
          })),
        }));
        active--;
        return Response.json({ status: "complete", searchId: "s", cluster: "4", totalCount: total,
          pageSize: acceptedSize, currency: "USD", priceMode: "total", results });
      }, async () => {}, undefined, undefined, () => {});
      const offers = await client.search({ vertical: "cars", origin: "LAX", departure: "2026-12-01", returnDate: "2026-12-03" }, "track");
      assert.equal(offers.length, total * 2);
      assert.equal(new Set(offers.map(offer => offer.id)).size, total * 2);
      assert.deepEqual(pages, Array.from({ length: Math.max(1, Math.ceil(total / acceptedSize)) }, (_, n) => n));
      assert.equal(maxActive, 1);
    });
  }
}
