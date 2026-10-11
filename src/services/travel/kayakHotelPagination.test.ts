import test from "node:test";
import assert from "node:assert/strict";
import { KayakSandboxClient, KayakPartialSearchError } from "./kayakSandbox";
import { paginateHotelResults } from "@/lib/hotels/hotelResultsPagination";
import { paginateFlightResults } from "@/lib/flights/flightResultsPagination";
import { paginateCarResults } from "@/lib/cars/carResultsPagination";

test("every retrieved result remains reachable across hotel, flight and car display pages", () => {
  for (const count of [0, 1, 18, 20, 21, 57, 500, 501]) {
    const all = Array.from({ length: count }, (_, i) => `offer-${i}`);
    for (const paginate of [paginateHotelResults, paginateFlightResults, (items: string[], page: number) => paginateCarResults(items, page).pageResults]) {
      const visible = Array.from({ length: Math.ceil(count / 20) }, (_, i) => paginate(all, i + 1)).flat();
      assert.deepEqual(visible, all);
    }
  }
});

const search = { vertical: "hotels" as const, destination: "kplace:123", departure: "2026-12-01", returnDate: "2026-12-03", adults: 1 };
const hotel = (n: number) => ({ name: `Hotel ${n}`, rates: [{ totalRate: n + 1, bookUri: "https://affiliates.kayak.com/sandbox-clickout" }] });

for (const total of [0, 1, 249, 250, 251, 500, 1311]) {
  test(`maximum hotel page size preserves all ${total} properties without concurrent requests`, async () => {
    const pages: number[] = [];
    let active = 0;
    let maxActive = 0;
    const client = new KayakSandboxClient("test", async input => {
      const url = new URL(String(input));
      active++;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active--;
      if (url.pathname.includes("constants-mapping")) return Response.json({});
      assert.equal(url.searchParams.get("pageSize"), "250");
      const index = Number(url.searchParams.get("pageIndex"));
      pages.push(index);
      return Response.json({ isComplete: true, totalFilteredResults: total, currencyCode: "USD",
        results: Array.from({ length: Math.min(250, Math.max(0, total - index * 250)) }, (_, n) => hotel(index * 250 + n)) });
    }, async () => {});
    const results = await client.search(search, "session");
    assert.equal(results.length, total);
    assert.equal(new Set(results.map(result => result.id)).size, total);
    assert.deepEqual(pages, Array.from({ length: Math.max(1, Math.ceil(total / 250)) }, (_, n) => n));
    assert.equal(maxActive, 1);
  });
}

test("incomplete hotel response is polled without publishing its partial rows", async () => {
  let requests = 0;
  const pauses: number[] = [];
  const client = new KayakSandboxClient("test", async input => {
    if (new URL(String(input)).pathname.includes("constants-mapping")) return Response.json({});
    requests++;
    return Response.json({ isComplete: requests > 1, totalFilteredResults: 1,
      currencyCode: "USD", results: [hotel(requests === 1 ? 99 : 0)] });
  }, async ms => { pauses.push(ms); });
  const results = await client.search(search, "session");
  assert.deepEqual(pauses, [750]);
  assert.equal(results.length, 1);
  assert.equal(results[0].title, "Hotel 0");
});

for (const status of [429, 503]) {
  test(`completed hotel pages survive a later ${status} without claiming completion`, async () => {
    const client = new KayakSandboxClient("test", async input => {
      const url = new URL(String(input));
      if (url.pathname.includes("constants-mapping")) return Response.json({});
      if (url.searchParams.get("pageIndex") !== "0") return new Response(null, { status });
      return Response.json({ isComplete: true, totalFilteredResults: 251, currencyCode: "USD", results: Array.from({ length: 250 }, (_, n) => hotel(n)) });
    }, async () => {});
    await assert.rejects(client.search(search, "session"), error => {
      assert.ok(error instanceof KayakPartialSearchError);
      assert.equal(error.offers.length, 250);
      assert.equal(error.code, status === 429 ? "rate_limited" : "server_error");
      return true;
    });
  });
}

for (const vertical of ["flights", "cars"] as const) {
  test(`${vertical} retrieves subsequent completed pages using the documented page base`, async () => {
    const calls: number[] = [];
    const client = new KayakSandboxClient("test", async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      const page = body.resultParameters?.pageNumber ?? (vertical === "cars" ? 0 : 1);
      calls.push(page);
      const index = calls.length - 1;
      return Response.json({ status: "complete", searchId: "s", cluster: "4", totalCount: 3, pageSize: 1, currency: "USD", priceMode: "total", results: [{ id: `result-${index}`, bookingOptions: [{ type: "regular", bookingUrl: "https://affiliates.kayak.com/sandbox-clickout", price: { price: 100 + index }, displayPrice: { price: 100 + index }, car: { brand: "Car" } }] }] });
    }, async () => {});
    const result = await client.search({ vertical, origin: "BOS", destination: "JFK", departure: "2026-12-01", returnDate: "2026-12-03", adults: 1 }, "session");
    assert.equal(result.length, 3);
    assert.deepEqual(calls, vertical === "cars" ? [0, 1, 2] : [1, 2, 3]);
  });
}

test("all hotel pages and rates survive, including unique fallback IDs beyond page one", async () => {
  const pages: number[] = [];
  const client = new KayakSandboxClient("test", async input => {
    const url = new URL(String(input));
    if (url.pathname.includes("constants-mapping")) return Response.json({ facility: { features: [] } });
    const index = Number(url.searchParams.get("pageIndex"));
    pages.push(index);
    assert.equal(url.searchParams.get("pageSize"), "250");
    assert.equal(url.searchParams.get("destination"), search.destination);
    assert.equal(url.searchParams.get("userTrackId"), "session");
    return Response.json({ isComplete: true, totalFilteredResults: 507, currencyCode: "USD", results: Array.from({ length: index < 2 ? 250 : 7 }, (_, n) => hotel(index * 250 + n)) });
  }, async () => {});
  const result = await client.search(search, "session");
  assert.deepEqual(pages, [0, 1, 2]);
  assert.equal(result.length, 507);
  assert.equal(new Set(result.map(x => x.id)).size, 507);
  assert.equal(result.at(-1)?.title, "Hotel 506");
});

test("repeated pages cannot silently masquerade as complete inventory", async () => {
  const client = new KayakSandboxClient("test", async input => new URL(String(input)).pathname.includes("constants-mapping")
    ? Response.json({}) : Response.json({ isComplete: true, totalFilteredResults: 500, currencyCode: "USD", results: Array.from({ length: 250 }, (_, n) => hotel(n)) }), async () => {});
  await assert.rejects(client.search(search, "session"), { code: "invalid_response" });
});

test("missing later page fails rather than reporting partial inventory as complete", async () => {
  const client = new KayakSandboxClient("test", async input => {
    const url = new URL(String(input));
    if (url.pathname.includes("constants-mapping")) return Response.json({});
    return Response.json({ isComplete: true, totalFilteredResults: 251, currencyCode: "USD", results: url.searchParams.get("pageIndex") === "0" ? Array.from({ length: 250 }, (_, n) => hotel(n)) : [] });
  }, async () => {});
  await assert.rejects(client.search(search, "session"), { code: "invalid_response" });
});

test("hotel pagination counts provider rows, not the number of bookable rates", async () => {
  const pages: number[] = [];
  const client = new KayakSandboxClient("test", async input => {
    const url = new URL(String(input));
    if (url.pathname.includes("constants-mapping")) return Response.json({});
    const index = Number(url.searchParams.get("pageIndex"));
    pages.push(index);
    const results = index === 0
      ? Array.from({ length: 250 }, (_, n) => ({ ...hotel(n), rates: [] }))
      : [{ ...hotel(250), rates: [
          { totalRate: 100, bookUri: "https://affiliates.kayak.com/sandbox-clickout" },
          { totalRate: 200, bookUri: "https://affiliates.kayak.com/sandbox-clickout" },
        ] }];
    return Response.json({ isComplete: true, totalFilteredResults: 251, currencyCode: "USD", results });
  }, async () => {});
  const result = await client.search(search, "session");
  assert.deepEqual(pages, [0, 1]);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(offer => offer.price), [100, 200]);
  assert.equal(new Set(result.map(offer => offer.id)).size, 2);
});
