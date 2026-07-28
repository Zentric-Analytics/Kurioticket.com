import assert from "node:assert/strict";
import test from "node:test";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { getDealsProviderHandoff } from "./dealsProviderHandoff";

const flight = (values: Record<string, unknown> = {}) => ({ id: "flight-1", provider: "Sky Provider", partnerRedirectUrl: "https://provider.test/flight/secret", bookingUrl: "", ...values } as unknown as PublicFlightResult);
const hotel = (values: Record<string, unknown> = {}) => ({ id: "hotel-1", provider: "Stay Provider", inventoryKind: "bookable", partnerRedirectUrl: "https://provider.test/hotel/secret", bookingUrl: "", ...values } as unknown as PublicHotelResult);

test("flight handoffs use an internal redirect for HTTPS partner and fallback booking targets", () => {
  assert.deepEqual(getDealsProviderHandoff(flight(), "flight"), { available: true, href: "/redirect?id=flight-1&type=flight", provider: "Sky Provider" });
  assert.equal(getDealsProviderHandoff(flight({ partnerRedirectUrl: "", bookingUrl: "https://booking.test/private" }), "flight").available, true);
});

test("flight IDs are encoded deterministically and raw targets are never exposed", () => {
  const rawTarget = "https://provider.test/private?affiliate=secret";
  const handoff = getDealsProviderHandoff(flight({ id: "fare /?&=✓", partnerRedirectUrl: rawTarget }), "flight");
  assert.deepEqual(handoff, { available: true, href: "/redirect?id=fare+%2F%3F%26%3D%E2%9C%93&type=flight", provider: "Sky Provider" });
  assert.doesNotMatch(JSON.stringify(handoff), /affiliate|provider\.test|secret/);
});

test("flight handoffs reject missing IDs and missing or unsafe targets", () => {
  for (const id of ["", "   "]) assert.deepEqual(getDealsProviderHandoff(flight({ id }), "flight"), { available: false, reason: "missing_id" });
  for (const target of ["", "   "]) assert.deepEqual(getDealsProviderHandoff(flight({ partnerRedirectUrl: target }), "flight"), { available: false, reason: "missing_target" });
  for (const target of ["#", "/relative", "javascript:alert(1)", "data:text/plain,x", "not a url", "ftp://provider.test/fare"]) {
    assert.deepEqual(getDealsProviderHandoff(flight({ partnerRedirectUrl: target }), "flight"), { available: false, reason: "unsafe_target" });
  }
});

test("HTTP targets remain eligible under the redirect server contract", () => {
  assert.equal(getDealsProviderHandoff(flight({ partnerRedirectUrl: "http://provider.test/fare" }), "flight").available, true);
});

test("bookable hotels get exact internal handoffs with encoded IDs", () => {
  assert.deepEqual(getDealsProviderHandoff(hotel({ id: "stay / 7" }), "hotel"), { available: true, href: "/redirect?id=stay+%2F+7&type=hotel", provider: "Stay Provider" });
});

test("discovery, demo, unidentified, and invalid-target hotels have no handoff", () => {
  assert.deepEqual(getDealsProviderHandoff(hotel({ inventoryKind: "discovery" }), "hotel"), { available: false, reason: "discovery_inventory" });
  assert.deepEqual(getDealsProviderHandoff(hotel({ dataSource: "demo" }), "hotel"), { available: false, reason: "demo_inventory" });
  assert.deepEqual(getDealsProviderHandoff(hotel({ id: "" }), "hotel"), { available: false, reason: "missing_id" });
  assert.deepEqual(getDealsProviderHandoff(hotel({ partnerRedirectUrl: "" }), "hotel"), { available: false, reason: "missing_target" });
  assert.deepEqual(getDealsProviderHandoff(hotel({ partnerRedirectUrl: "https://" }), "hotel"), { available: false, reason: "unsafe_target" });
});
