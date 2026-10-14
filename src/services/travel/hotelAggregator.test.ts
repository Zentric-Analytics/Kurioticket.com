import assert from "node:assert/strict";
import test from "node:test";
import { searchHotels, searchHotelsByProvider } from "./hotelAggregator";
import type { NormalizedHotelResult } from "@/lib/types";

const search = { destination: "Paris", checkIn: "2027-06-01", checkOut: "2027-06-04", guests: 2, rooms: 1 };
for (const status of ["success", "failed", "skipped"] as const) {
  test(status + " with zero provider hotels never fabricates offers", async () => {
    const dependencies = {
      searchKayak: async () => ({ provider: "KAYAK sandbox", status, results: [], latencyMs: 1 }),
      persist: async (rows: NormalizedHotelResult[]) => { assert.deepEqual(rows, []); },
    };
    for (const result of [await searchHotels(search, { dependencies }), await searchHotelsByProvider(search, "kayak-sandbox", { dependencies })]) {
      assert.deepEqual(result.results, []);
      assert.equal(result.providerStatuses[0].status, status);
    }
  });
}
test("provider hotel rates and discovery records remain intact", async () => {
  const rows = [
    { id: "kayak-sandbox:priced", provider: "KAYAK sandbox", dataSource: "demo", totalPrice: 300, currency: "USD" },
    { id: "kayak-sandbox:discovery", provider: "KAYAK sandbox", dataSource: "demo", inventoryKind: "discovery" },
  ] as NormalizedHotelResult[];
  const result = await searchHotels(search, { dependencies: {
    searchKayak: async () => ({ provider: "KAYAK sandbox", status: "success", results: rows, latencyMs: 1 }),
    persist: async (received) => { assert.deepEqual(received, rows); },
  } });
  assert.deepEqual(result.results, rows);
});
