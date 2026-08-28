import assert from "node:assert/strict";
import test from "node:test";

import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";
import {
  buildKurioticketHotelDetailsProviderOffer,
  isActionableExternalHotelProviderOffer,
  resolveHotelBookingContinuation,
  resolveSelectedHotelProviderOfferId,
} from "./hotelBookingContinuation";

function externalOffer(id: string): HotelDetailsProviderOffer {
  return { id: `offer-${id}`, providerName: `Test Provider ${id}`, nightlyPrice: `$${id}`, action: { kind: "provider-handoff", providerOfferId: `opaque-${id}` } };
}

const current = buildKurioticketHotelDetailsProviderOffer({ nightlyPrice: "$230", amenities: [] });

test("current static Hotel Details creates exactly one internal Kurioticket offer", () => {
  assert.equal(current.providerName, "Kurioticket");
  assert.deepEqual(current.action, { kind: "internal-room-flow" });
  assert.equal("deepLink" in current, false);
});

test("a sole actionable Kurioticket offer is selected and continues internally", () => {
  const selectedOfferId = resolveSelectedHotelProviderOfferId({ selectedOfferId: null, offers: [current], internalRoomFlowAvailable: true });
  assert.equal(selectedOfferId, "kurioticket");
  assert.deepEqual(resolveHotelBookingContinuation({ selectedOfferId, offers: [current], internalRoomFlowAvailable: true }), { kind: "internal-room-flow" });
});

test("multiple providers begin without a selection and require one", () => {
  const offers = [current, externalOffer("A")];
  const selectedOfferId = resolveSelectedHotelProviderOfferId({ selectedOfferId: null, offers, internalRoomFlowAvailable: true });
  assert.equal(selectedOfferId, null);
  assert.deepEqual(resolveHotelBookingContinuation({ selectedOfferId, offers, internalRoomFlowAvailable: true }), { kind: "selection-required" });
});

test("the selected offer alone controls continuation", () => {
  const offers = [current, externalOffer("A"), externalOffer("B")];
  assert.deepEqual(resolveHotelBookingContinuation({ selectedOfferId: "kurioticket", offers, internalRoomFlowAvailable: true }), { kind: "internal-room-flow" });
  assert.deepEqual(resolveHotelBookingContinuation({ selectedOfferId: "offer-B", offers, internalRoomFlowAvailable: true }), { kind: "provider-handoff", providerOfferId: "opaque-B" });
});

test("selection is preserved while actionable and cleared when it disappears among multiple offers", () => {
  const offers = [current, externalOffer("A")];
  assert.equal(resolveSelectedHotelProviderOfferId({ selectedOfferId: "offer-A", offers, internalRoomFlowAvailable: true }), "offer-A");
  assert.equal(resolveSelectedHotelProviderOfferId({ selectedOfferId: "missing", offers, internalRoomFlowAvailable: true }), null);
});

test("a disappeared selection falls back to the sole remaining actionable offer", () => {
  assert.equal(resolveSelectedHotelProviderOfferId({ selectedOfferId: "missing", offers: [externalOffer("A")], internalRoomFlowAvailable: false }), "offer-A");
});

test("invalid or absent actions are unavailable", () => {
  const invalid: HotelDetailsProviderOffer = { ...externalOffer("A"), action: { kind: "provider-handoff", providerOfferId: "   " } };
  assert.equal(isActionableExternalHotelProviderOffer(invalid), false);
  assert.deepEqual(resolveHotelBookingContinuation({ selectedOfferId: invalid.id, offers: [invalid], internalRoomFlowAvailable: false }), { kind: "unavailable" });
  assert.deepEqual(resolveHotelBookingContinuation({ selectedOfferId: current.id, offers: [current], internalRoomFlowAvailable: false }), { kind: "unavailable" });
});
