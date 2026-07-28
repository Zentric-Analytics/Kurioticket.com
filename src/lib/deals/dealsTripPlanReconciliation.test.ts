import assert from "node:assert/strict";
import test from "node:test";
import type { PublicFlightResult, PublicHotelResult } from "@/lib/types";
import { createDealsTripPlan, updateDealsTripPlan, type DealsTripPlanFlight, type DealsTripPlanHotel } from "./dealsTripPlan";
import { reconcileDealsFlightSelection, reconcileDealsHotelSelection } from "./dealsTripPlanReconciliation";

const flightSelection: DealsTripPlanFlight = { id: "f", provider: "P", airline: "A", origin: "A", destination: "B", departure: "d", arrival: "a", duration: "1h", sourcePrice: 1, sourceCurrency: "USD", resultReceivedAt: 100 };
const hotelSelection: DealsTripPlanHotel = { id: "h", provider: "P", name: "H", location: "L", checkIn: "in", checkOut: "out", sourcePrice: 2, sourceCurrency: "USD", resultReceivedAt: 100 };
const plan = { ...updateDealsTripPlan(createDealsTripPlan({ mode: "hotel-flight", searchFingerprint: "x", resultsPath: "/deals/results?q=x" }, 100), { flight: flightSelection, hotel: hotelSelection }, 101), opened: { flight: 101, hotel: 101 } };
const flight = { id: "f", provider: "P", bookingUrl: "https://p.test" } as PublicFlightResult;
const hotel = { id: "h", provider: "P", bookingUrl: "https://p.test", inventoryKind: "bookable" } as PublicHotelResult;
test("flight reconciliation is deterministic and preserves the stay", () => { assert.equal(reconcileDealsFlightSelection(plan, [flight]), plan); const removed = reconcileDealsFlightSelection(plan, []); assert.equal(removed.flight, undefined); assert.equal(removed.hotel, plan.hotel); assert.equal(removed.opened.flight, undefined); assert.equal(removed.opened.hotel, 101); assert.deepEqual(reconcileDealsFlightSelection(plan, []), removed); assert.equal(reconcileDealsFlightSelection(plan, [{ ...flight, bookingUrl: "javascript:x" }]).flight, undefined); });
test("hotel reconciliation rejects absent, discovery and demo inventory", () => { assert.equal(reconcileDealsHotelSelection(plan, [hotel]), plan); for (const result of [[], [{ ...hotel, inventoryKind: "discovery" }], [{ ...hotel, dataSource: "demo" }]]) { const removed = reconcileDealsHotelSelection(plan, result as PublicHotelResult[]); assert.equal(removed.hotel, undefined); assert.equal(removed.flight, plan.flight); assert.equal(removed.opened.hotel, undefined); assert.equal(removed.opened.flight, 101); } });
