import assert from "node:assert/strict";
import test from "node:test";
import type { ContractResult, TravelResultPolicy } from "@/lib/travel/searchContract";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { isDealsFlightEligible, isDealsHotelEligible } from "./dealsPackageCandidates";

const policy = (href: string, overrides: Partial<TravelResultPolicy> = {}): TravelResultPolicy => ({ mode: "live", bookable: true, sourceLabel: "Live provider", action: { kind: "internal-detail", href, enabled: true }, ...overrides });
const flight = (searchPolicy = policy("/flights/details/duffel-1")) => ({ id: "duffel-1", price: 125, currency: "USD", provider: "Duffel", searchPolicy } as ContractResult<PublicFlightResult>);
const hotel = (searchPolicy = policy("/hotels/details/hotel-1")) => ({ id: "hotel-1", totalPrice: 320, currency: "USD", provider: "Hotelbeds", inventoryKind: "bookable", searchPolicy } as ContractResult<PublicHotelResult>);

test("live internal Flight Details actions are package eligible without affiliate URLs", () => { assert.equal(isDealsFlightEligible(flight()), true); });
test("package eligibility rejects demo, unpriced, disabled, and unsafe flight inventory", () => {
  assert.equal(isDealsFlightEligible(flight(policy("/flights/details/duffel-1", { mode: "demo", bookable: false }))), false);
  assert.equal(isDealsFlightEligible({ ...flight(), price: 0 }), false);
  assert.equal(isDealsFlightEligible(flight({ ...policy("/flights/details/duffel-1"), action: { kind: "none", enabled: false } })), false);
  assert.equal(isDealsFlightEligible(flight(policy("https://evil.test/flights/details/duffel-1"))), false);
});
test("only live bookable hotels with their safe internal details path are eligible", () => {
  assert.equal(isDealsHotelEligible(hotel()), true);
  assert.equal(isDealsHotelEligible(hotel(policy("/hotels/details/hotel-1", { mode: "discovery", bookable: false }))), false);
  assert.equal(isDealsHotelEligible(hotel(policy("/hotels/details/another-hotel"))), false);
});
