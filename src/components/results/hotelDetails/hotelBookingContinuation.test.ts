import assert from "node:assert/strict";
import test from "node:test";

import type { HotelDetailsProviderOffer } from "./hotelDetailsPresentation";
import {
  buildKurioticketHotelDetailsProviderOffer,
  isActionableExternalHotelProviderOffer,
  resolveHotelBookingContinuation,
} from "./hotelBookingContinuation";

function externalOffer(id: string): HotelDetailsProviderOffer {
  return {
    id: `offer-${id}`,
    providerName: `Test Provider ${id}`,
    nightlyPrice: `$${id}`,
    action: { kind: "provider-handoff", providerOfferId: `opaque-${id}` },
  };
}

test("current static Hotel Details creates exactly one internal Kurioticket offer", () => {
  const offers = [
    buildKurioticketHotelDetailsProviderOffer({
      nightlyPrice: "$230",
      amenities: [],
    }),
  ];
  assert.equal(offers.length, 1);
  assert.equal(offers[0].providerName, "Kurioticket");
  assert.deepEqual(offers[0].action, { kind: "internal-room-flow" });
  assert.equal("deepLink" in offers[0], false);
});

test("zero external offers continues through the internal room flow", () => {
  const current = buildKurioticketHotelDetailsProviderOffer({
    nightlyPrice: "$230",
    amenities: [],
  });
  assert.deepEqual(resolveHotelBookingContinuation([current], true), {
    kind: "internal-room-flow",
  });
});

test("one external offer continues to its opaque provider handoff", () => {
  assert.deepEqual(resolveHotelBookingContinuation([externalOffer("A")], true), {
    kind: "provider-handoff",
    providerOfferId: "opaque-A",
  });
});

test("two or more external offers require a neutral comparison choice", () => {
  assert.deepEqual(
    resolveHotelBookingContinuation([externalOffer("A"), externalOffer("B")], true),
    { kind: "compare-prices" },
  );
  assert.deepEqual(
    resolveHotelBookingContinuation(
      [externalOffer("A"), externalOffer("B"), externalOffer("C")],
      true,
    ),
    { kind: "compare-prices" },
  );
});

test("blank provider identities are not actionable external offers", () => {
  const invalid: HotelDetailsProviderOffer = {
    ...externalOffer("A"),
    action: { kind: "provider-handoff", providerOfferId: "   " },
  };
  assert.equal(isActionableExternalHotelProviderOffer(invalid), false);
  assert.deepEqual(resolveHotelBookingContinuation([invalid], false), {
    kind: "unavailable",
  });
});
