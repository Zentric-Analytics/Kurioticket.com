import test from "node:test";
import assert from "node:assert/strict";
import { dedupeHotels } from "./hotelAggregator";
import type { NormalizedHotelResult } from "@/lib/types";

test("hotel deduplication preserves live offers beside catalogue names and distinct rates", () => {
  const catalogue = { id: "catalogue", provider: "catalogue", name: "Same Hotel", location: "New York" } as NormalizedHotelResult;
  const first = { ...catalogue, id: "offer-1", provider: "KAYAK sandbox", price: 100 };
  const second = { ...first, id: "offer-2", price: 150 };
  assert.deepEqual(dedupeHotels([catalogue, first, second, first]), [catalogue, first, second]);
});

test("offer identifiers are scoped by provider rather than shared display names", () => {
  const first = { id: "1", provider: "A", name: "Hotel", location: "City" } as NormalizedHotelResult;
  const second = { ...first, provider: "B" };
  assert.deepEqual(dedupeHotels([first, second]), [first, second]);
});
