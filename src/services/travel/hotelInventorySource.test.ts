import assert from "node:assert/strict";
import test from "node:test";
import { isProviderHotelResult } from "./hotelInventorySource";

test("provider hotel provenance accepts sandbox and live data without relabeling it", () => {
  for (const dataSource of ["demo", "live", undefined] as const) {
    assert.equal(isProviderHotelResult({ id: "kayak-sandbox:provider-discovery", provider: "KAYAK sandbox", dataSource }), true);
  }
  assert.equal(isProviderHotelResult({ id: "other-provider:offer", provider: "Other Provider", dataSource: "live" }), true);
});

test("historical catalogue results cannot become provider inventory through a live label", () => {
  for (const provider of ["Kurioticket catalogue", "Kurioticket static catalogue", "Kurioticket verified destination coverage"]) {
    for (const dataSource of ["demo", "live", undefined] as const) {
      assert.equal(isProviderHotelResult({ id: "retired-hotel", provider, dataSource }), false);
    }
  }
  assert.equal(isProviderHotelResult({ id: "retired-hotel", provider: "KAYAK sandbox", dataSource: "demo" }), false);
});
