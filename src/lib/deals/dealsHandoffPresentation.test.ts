import assert from "node:assert/strict";
import test from "node:test";
import { DEALS_TRIP_PLAN_TTL_MS, type DealsTripPlan } from "./dealsTripPlan";
import { getDealsHandoffSteps } from "./dealsHandoffPresentation";

const now = 1_000;
const plan: DealsTripPlan = {
  version: 1, mode: "hotel-flight-car", searchFingerprint: "x", resultsPath: "/deals/results?q=x", createdAt: 0, updatedAt: 0, expiresAt: 99_999_999, opened: {},
  flight: { id: "flight /?&=✓", provider: "Duffel", airline: "Brussels Airlines", flightNumber: "SN7261", origin: "LOS", destination: "LAX", departure: "2026-08-01T23:35:00", arrival: "2026-08-02T06:15:00", duration: "10h 40m", sourcePrice: 6400.33, sourceCurrency: "USD", resultReceivedAt: now, detailsPath: "/flights/details/example" },
  hotel: { id: "hotel /?&=✓", provider: "Kurioticket static catalogue", name: "Planning Hotel", location: "Los Angeles - CA", checkIn: "2026-08-01", checkOut: "2026-08-03", roomType: "DELUXE KING ROOM", sourcePrice: 500, sourceCurrency: "USD", resultReceivedAt: now, detailsPath: "/hotels/details/example" },
  car: { id: "c1", provider: "CarTrawler", rentalCompany: "Avis", modelName: "Corolla", categoryLabel: "COMPACT CAR", pickupLocation: "LAX", returnLocation: "Downtown", pickupDate: "2026-08-03", pickupTime: "09:30", dropoffDate: "2026-08-05", dropoffTime: "11:00", sourcePrice: 200, sourceCurrency: "USD", resultReceivedAt: now, detailsPath: "/cars/details/c1?pickupLocation=LAX&dropoffLocation=Downtown&pickupDate=2026-08-03&pickupTime=09%3A30&dropoffDate=2026-08-05&dropoffTime=11%3A00&driverAge=30" },
};

test("builds structured localized flight, hotel, and car steps without mutating the plan", () => {
  const before = structuredClone(plan);
  const steps = getDealsHandoffSteps(plan, now, "en-US");
  assert.deepEqual(steps.map(step => step.product), ["flight", "hotel", "car"]);
  const flight = steps[0]; assert.equal(flight.product, "flight"); if (flight.product !== "flight") return;
  assert.equal(flight.actionKind, "provider-handoff"); assert.equal(flight.href, "/redirect?id=flight+%2F%3F%26%3D%E2%9C%93&type=flight"); assert.notEqual(flight.href, plan.flight?.detailsPath);
  assert.equal(flight.routeLabel, "LOS → LAX"); assert.equal(flight.flightNumber, "SN7261"); assert.match(flight.departureLabel, /Aug 1, 2026/); assert.match(flight.departureLabel, /11:35 PM/); assert.doesNotMatch(flight.departureLabel, /T23:35/); assert.equal(flight.status, "next");
  const hotel = steps[1]; assert.equal(hotel.product, "hotel"); if (hotel.product !== "hotel") return;
  assert.equal(hotel.actionKind, "internal-details"); assert.equal(hotel.href, plan.hotel?.detailsPath); assert.doesNotMatch(hotel.href ?? "", /\/redirect|type=hotel/);
  assert.match(hotel.checkInLabel, /Aug 1, 2026/); assert.match(hotel.checkOutLabel, /Aug 3, 2026/); assert.equal(hotel.nights, 2); assert.equal(hotel.roomType, "Deluxe King Room");
  const car = steps[2]; assert.equal(car.product, "car"); if (car.product !== "car") return;
  assert.equal(car.actionKind, "internal-details"); assert.equal(car.href, plan.car?.detailsPath); assert.doesNotMatch(car.href ?? "", /\/redirect|type=car/);
  assert.equal(car.pickupLocation, "LAX"); assert.equal(car.returnLocation, "Downtown"); assert.match(car.pickupLabel, /9:30 AM/); assert.equal(car.rentalDays, 2); assert.equal(car.category, "Compact Car");
  assert.deepEqual(plan, before); assert.doesNotMatch(JSON.stringify(steps), /booked|confirmed|completed/i);
});

test("keeps cars without a details path classified as internal details", () => {
  const steps = getDealsHandoffSteps({ ...plan, car: { ...plan.car!, detailsPath: undefined } }, now, "en-US");
  const car = steps[2];
  assert.equal(car.product, "car");
  assert.equal(car.actionKind, "internal-details");
  assert.equal(car.href, null);
});

test("keeps hotels without a details path classified as internal details", () => {
  const hotelWithoutDetails = { ...plan.hotel! };
  delete (hotelWithoutDetails as Partial<typeof hotelWithoutDetails>).detailsPath;
  const steps = getDealsHandoffSteps({ ...plan, hotel: hotelWithoutDetails as DealsTripPlan["hotel"] }, now, "en-US");
  const hotel = steps[1];
  assert.equal(hotel.product, "hotel");
  assert.equal(hotel.actionKind, "internal-details");
  assert.equal(hotel.href, null);
});

test("derives opened and expired state using canonical semantics", () => {
  const opened = getDealsHandoffSteps({ ...plan, opened: { flight: 500 } }, now, "en-US");
  assert.equal(opened[0].status, "opened"); assert.equal(opened[1].status, "next");
  const expired = getDealsHandoffSteps({ ...plan, flight: { ...plan.flight!, resultReceivedAt: now - DEALS_TRIP_PLAN_TTL_MS } }, now, "en-US");
  assert.equal(expired[0].status, "expired"); assert.equal(expired[1].status, "next");
});

test("date-only and malformed values remain safe and readable", () => {
  const steps = getDealsHandoffSteps({ ...plan, flight: { ...plan.flight!, departure: "unexpected date" }, hotel: { ...plan.hotel!, checkIn: "2026-08-01", checkOut: "bad checkout" } }, now, "en-US");
  const flight = steps[0]; if (flight.product !== "flight") return; assert.equal(flight.departureLabel, "unexpected date"); assert.doesNotMatch(flight.departureLabel, /Invalid Date/);
  const hotel = steps[1]; if (hotel.product !== "hotel") return; assert.equal(hotel.checkOutLabel, "bad checkout"); assert.equal(hotel.nights, null);
});
