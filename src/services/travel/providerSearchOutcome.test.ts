import test from "node:test";
import assert from "node:assert/strict";
import { providerSearchWarnings } from "./providerSearchOutcome";
import { searchHotels } from "./hotelAggregator";
import type { ProviderResult, NormalizedHotelResult } from "@/lib/types";

const outcome = (status: ProviderResult<unknown>["status"]): ProviderResult<unknown> => ({ provider: "test", results: [], status, latencyMs: 1 });
test("completed empty, failed, disabled and unsupported searches stay distinct", () => {
  assert.deepEqual(providerSearchWarnings([outcome("success")], 0), []);
  assert.equal(providerSearchWarnings([outcome("failed")], 0).length, 1);
  assert.equal(providerSearchWarnings([outcome("skipped")], 0).length, 1);
  assert.match(providerSearchWarnings([{ ...outcome("skipped"), errorReason: "unsupported_search" }], 0)[0], /change your search/);
  assert.deepEqual(providerSearchWarnings([outcome("skipped"), outcome("success")], 1), []);
  assert.equal(providerSearchWarnings([outcome("failed"), outcome("success")], 1).length, 1);
});

test("hotel search contains only returned provider offers, never catalogue estimates", async () => {
  const offer = { id: "provider-offer", provider: "KAYAK sandbox", name: "Hotel", totalPrice: 100, pricePerNight: 100, currency: "USD" } as NormalizedHotelResult;
  for (const status of ["success", "failed", "skipped"] as const) {
    for (const rows of [[], [offer]]) {
      const result = await searchHotels({ destination: "London", checkIn: "2099-10-12", checkOut: "2099-10-13", guests: 1, rooms: 1 }, {
        dependencies: { searchKayak: async () => ({ ...outcome(status), results: rows }), persist: async () => {} },
      });
      assert.deepEqual(result.results, rows);
      assert.equal(result.providerStatuses.length, 1);
    }
  }
});
