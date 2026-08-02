import assert from "node:assert/strict";
import test from "node:test";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import type { ContractResult, TravelResultPolicy } from "@/lib/travel/searchContract";
import { createDealsTripPlan, updateDealsTripPlan, type DealsTripPlanFlight, type DealsTripPlanHotel } from "./dealsTripPlan";
import { reconcileDealsFlightSelection, reconcileDealsHotelSelection } from "./dealsTripPlanReconciliation";

const flightSelection: DealsTripPlanFlight = { id: "f", provider: "P", airline: "A", origin: "A", destination: "B", departure: "d", arrival: "a", duration: "1h", sourcePrice: 1, sourceCurrency: "USD", resultReceivedAt: 100, detailsPath: "/flights/details/f" };
const hotelSelection: DealsTripPlanHotel = { id: "h", provider: "P", name: "H", location: "L", checkIn: "in", checkOut: "out", sourcePrice: 2, sourceCurrency: "USD", resultReceivedAt: 100, detailsPath: "/hotels/details/h" };
const plan = { ...updateDealsTripPlan(createDealsTripPlan({ mode: "hotel-flight", searchFingerprint: "x", resultsPath: "/deals/results?q=x" }, 100), { flight: flightSelection, hotel: hotelSelection }, 101), opened: { flight: 101, hotel: 101 } };
const policy = (href: string, overrides: Partial<TravelResultPolicy> = {}): TravelResultPolicy => ({ source: "duffel", bookable: true, action: { kind: "internal-detail", href, enabled: true }, ...overrides });
const flight = { id: "f", provider: "P", price: 1, currency: "USD", partnerRedirectUrl: "https://provider.test/flight", searchPolicy: policy("/flights/details/f") } as ContractResult<PublicFlightResult>;
const hotel = { id: "h", provider: "P", totalPrice: 2, currency: "USD", inventoryKind: "bookable", partnerRedirectUrl: "https://provider.test/hotel", searchPolicy: policy("/hotels/details/h") } as ContractResult<PublicHotelResult>;

test("flight reconciliation follows the server policy and preserves the stay", () => { assert.equal(reconcileDealsFlightSelection(plan, [flight]), plan); const removed = reconcileDealsFlightSelection(plan, []); assert.equal(removed.flight, undefined); assert.equal(removed.hotel, plan.hotel); assert.equal(removed.opened.flight, undefined); assert.equal(removed.opened.hotel, 101); assert.equal(reconcileDealsFlightSelection(plan, [{ ...flight, searchPolicy: policy("javascript:x") }]).flight, undefined); });
test("hotel reconciliation rejects unavailable server policy", () => { assert.equal(reconcileDealsHotelSelection(plan, [hotel]), plan); for (const results of [[], [{ ...hotel, searchPolicy: policy("/hotels/details/h", { source: "hotelbeds", bookable: false }) }], [{ ...hotel, searchPolicy: policy("/hotels/details/h", { source: "kurioticket-static-cars", bookable: false }) }]]) { const removed = reconcileDealsHotelSelection(plan, results); assert.equal(removed.hotel, undefined); assert.equal(removed.flight, plan.flight); assert.equal(removed.opened.hotel, undefined); } });
