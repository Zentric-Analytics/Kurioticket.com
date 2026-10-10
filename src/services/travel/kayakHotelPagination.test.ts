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

for (const status of [429, 503]) {
  test(`completed hotel pages survive a later ${status} without claiming completion`, async () => {
    const client = new KayakSandboxClient("test", async input => {
      const url = new URL(String(input));
      if (url.pathname.includes("constants-mapping")) return Response.json({});
      if (url.searchParams.get("pageIndex") !== "0") return new Response(null, { status });
      return Response.json({ isComplete: true, totalFilteredResults: 26, currencyCode: "USD", results: Array.from({ length: 25 }, (_, n) => hotel(n)) });
    }, async () => {});
    await assert.rejects(client.search(search, "session"), error => {
      assert.ok(error instanceof KayakPartialSearchError);
      assert.equal(error.offers.length, 25);
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
    assert.equal(url.searchParams.get("pageSize"), "25");
    assert.equal(url.searchParams.get("destination"), search.destination);
    assert.equal(url.searchParams.get("userTrackId"), "session");
    return Response.json({ isComplete: true, totalFilteredResults: 57, currencyCode: "USD", results: Array.from({ length: index < 2 ? 25 : 7 }, (_, n) => hotel(index * 25 + n)) });
  }, async () => {});
  const result = await client.search(search, "session");
  assert.deepEqual(pages, [0, 1, 2]);
  assert.equal(result.length, 57);
  assert.equal(new Set(result.map(x => x.id)).size, 57);
  assert.equal(result.at(-1)?.title, "Hotel 56");
});

test("repeated pages cannot silently masquerade as complete inventory", async () => {
  const client = new KayakSandboxClient("test", async input => new URL(String(input)).pathname.includes("constants-mapping")
    ? Response.json({}) : Response.json({ isComplete: true, totalFilteredResults: 50, currencyCode: "USD", results: Array.from({ length: 25 }, (_, n) => hotel(n)) }), async () => {});
  await assert.rejects(client.search(search, "session"), { code: "invalid_response" });
});

test("missing later page fails rather than reporting partial inventory as complete", async () => {
  const client = new KayakSandboxClient("test", async input => {
    const url = new URL(String(input));
    if (url.pathname.includes("constants-mapping")) return Response.json({});
    return Response.json({ isComplete: true, totalFilteredResults: 26, currencyCode: "USD", results: url.searchParams.get("pageIndex") === "0" ? Array.from({ length: 25 }, (_, n) => hotel(n)) : [] });
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
      ? Array.from({ length: 25 }, (_, n) => ({ ...hotel(n), rates: [] }))
      : [{ ...hotel(25), rates: [
          { totalRate: 100, bookUri: "https://affiliates.kayak.com/sandbox-clickout" },
          { totalRate: 200, bookUri: "https://affiliates.kayak.com/sandbox-clickout" },
        ] }];
    return Response.json({ isComplete: true, totalFilteredResults: 26, currencyCode: "USD", results });
  }, async () => {});
  const result = await client.search(search, "session");
  assert.deepEqual(pages, [0, 1]);
  assert.equal(result.length, 2);
  assert.deepEqual(result.map(offer => offer.price), [100, 200]);
  assert.equal(new Set(result.map(offer => offer.id)).size, 2);
});
