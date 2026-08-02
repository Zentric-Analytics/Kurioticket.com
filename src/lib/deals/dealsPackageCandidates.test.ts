import assert from "node:assert/strict";
import test from "node:test";
import type { ContractResult, TravelResultPolicy } from "@/lib/travel/searchContract";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { buildDealsPackageCandidates, isDealsFlightEligible, isDealsHotelEligible } from "./dealsPackageCandidates";

const policy = (href: string, overrides: Partial<TravelResultPolicy> = {}): TravelResultPolicy => ({ source: "duffel", bookable: true, action: { kind: "internal-detail", href, enabled: true }, ...overrides });
const flight = (searchPolicy = policy("/flights/details/duffel-1"), overrides: Partial<PublicFlightResult> = {}) => ({ id: "duffel-1", price: 125, currency: "USD", provider: "Duffel", partnerRedirectUrl: "https://provider.test/flight", searchPolicy, ...overrides } as ContractResult<PublicFlightResult>);
const hotel = (searchPolicy = policy("/hotels/details/hotel-1"), overrides: Partial<PublicHotelResult> = {}) => ({ id: "hotel-1", totalPrice: 320, currency: "USD", provider: "Hotelbeds", inventoryKind: "bookable", partnerRedirectUrl: "https://provider.test/hotel", searchPolicy, ...overrides } as ContractResult<PublicHotelResult>);

test("live flights with safe details and provider handoffs are package eligible", () => { assert.equal(isDealsFlightEligible(flight()), true); });
test("package eligibility rejects unpriced, disabled, and unsafe flight inventory", () => {
  assert.equal(isDealsFlightEligible(flight(policy("/flights/details/duffel-1", { source: "kurioticket-static-cars", bookable: false }))), false);
  assert.equal(isDealsFlightEligible({ ...flight(), price: 0 }), false);
  assert.equal(isDealsFlightEligible(flight({ ...policy("/flights/details/duffel-1"), action: { kind: "none", enabled: false } })), false);
  assert.equal(isDealsFlightEligible(flight(policy("https://evil.test/flights/details/duffel-1"))), false);
  assert.equal(isDealsFlightEligible(flight(undefined, { partnerRedirectUrl: "", bookingUrl: "" })), false);
  assert.equal(isDealsFlightEligible(flight(undefined, { partnerRedirectUrl: "javascript:alert(1)" })), false);
});
test("only Hotelbeds results with their safe internal details path are eligible", () => {
  assert.equal(isDealsHotelEligible(hotel()), true);
  assert.equal(isDealsHotelEligible(hotel(policy("/hotels/details/hotel-1", { source: "hotelbeds", bookable: false }))), false);
  assert.equal(isDealsHotelEligible(hotel(policy("/hotels/details/another-hotel"))), false);
  assert.equal(isDealsHotelEligible(hotel(undefined, { partnerRedirectUrl: "", bookingUrl: "" })), false);
  assert.equal(isDealsHotelEligible(hotel(undefined, { inventoryKind: "discovery" })), false);
});

test("generated combinations always use separate-provider booking without package fields", () => {
  const candidates = buildDealsPackageCandidates({
    mode: "hotel-flight",
    flights: [flight()],
    hotels: [hotel()],
    cars: [],
    displayCurrency: "USD",
    rates: { USD: 1 },
  });

  assert.ok(candidates.length > 0);
  assert.ok(candidates.every(candidate => candidate.bookingFlow === "separate-providers"));
  assert.equal(candidates[0].providerCount, 2);
  assert.equal(candidates[0].estimatedTotal, 445);
  for (const candidate of candidates) {
    assert.equal("packageOfferId" in candidate, false);
    assert.equal("packageCheckoutHref" in candidate, false);
    assert.equal("combinedCheckout" in candidate, false);
    assert.equal("packageBookable" in candidate, false);
  }
});

test("matching normalized provider names and providerCount one never imply a package", () => {
  const candidates = buildDealsPackageCandidates({
    mode: "hotel-flight",
    flights: [{ ...flight(), provider: " Same Provider " }],
    hotels: [{ ...hotel(), provider: "same provider" }],
    cars: [],
    displayCurrency: "USD",
    rates: { USD: 1 },
  });

  assert.ok(candidates.length > 0);
  assert.equal(candidates[0].providerCount, 1);
  assert.equal(candidates[0].bookingFlow, "separate-providers");
  assert.equal(candidates[0].estimatedTotal, 445);
});
