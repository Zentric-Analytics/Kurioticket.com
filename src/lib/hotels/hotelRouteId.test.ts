import assert from "node:assert/strict";
import test from "node:test";
import { decodeHotelRouteId } from "./hotelRouteId";
import { buildDealsHotelDetailsApiParams, isCurrentDealsHotelDetailsResponse } from "../deals/dealsHotelDetails";

test("encoded sandbox route IDs reach the details API and response check unchanged", () => {
  const providerId = "kayak-sandbox:1:3";
  const id = decodeHotelRouteId(encodeURIComponent(providerId));
  const params = buildDealsHotelDetailsApiParams({ id, checkIn: "2026-10-21", checkOut: "2026-10-28", guests: "1", rooms: "1" });
  assert.equal(new URLSearchParams(params.toString()).get("id"), providerId);
  assert.equal(isCurrentDealsHotelDetailsResponse(id, { id: providerId }), true);
  assert.equal(params.toString().includes("%253A"), false);
});

test("plain hotel IDs and already decoded provider IDs remain usable", () => {
  for (const id of ["pod-times-square", "kayak-sandbox:1:3"])
    assert.equal(decodeHotelRouteId(id), id);
});

test("route decoding is bounded and malformed escapes do not crash the page", () => {
  assert.equal(decodeHotelRouteId("hotel%253A1"), "hotel%3A1");
  assert.equal(decodeHotelRouteId("hotel%invalid"), "hotel%invalid");
});
