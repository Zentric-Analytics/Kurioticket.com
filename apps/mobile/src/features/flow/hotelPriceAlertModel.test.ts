import assert from "node:assert/strict";
import test from "node:test";
import type { MobilePriceAlert } from "../../api/travelApi";
import { buildHotelPriceAlertPayload, hotelAlertPresentation, hotelPriceAlertMatchesPlan, matchingHotelPriceAlert } from "./hotelPriceAlertModel";

const plan = { key: "hotel", summary: "Paris", payload: { destination: "Paris", checkIn: "2030-04-01", checkOut: "2030-04-03", guests: 2, rooms: 1 } };
const hotel = { id: "hotel-42", name: "Hotel Paris" };

function propertyAlert(overrides: Partial<MobilePriceAlert> = {}): MobilePriceAlert {
  return {
    id: "property-alert", type: "HOTEL", origin: null, destination: "Paris",
    targetPrice: "450", currency: "USD", status: "ACTIVE",
    createdAt: "2030-03-01T00:00:00.000Z", updatedAt: "2030-03-01T00:00:00.000Z",
    lastSeenPrice: null, lastCheckedAt: null,
    query: { ...plan.payload, hotelId: hotel.id, hotelName: hotel.name },
    ...overrides,
  };
}

test("Hotel alert creation preserves destination dates occupancy currency and target", () => {
  assert.deepEqual(buildHotelPriceAlertPayload(plan, 450, "usd"), { type: "HOTEL", destination: "Paris", targetPrice: 450, mode: "TARGET", currency: "USD", query: plan.payload });
});

test("Hotel alert UI requires a comparable canonical result", () => {
  assert.equal(hotelAlertPresentation("hotel", plan, [] as never[]).enabled, false);
  assert.equal(hotelAlertPresentation("hotel", plan, [{ id: "map-only", totalPrice: undefined, currency: undefined }] as never[]).enabled, false);
  assert.equal(hotelAlertPresentation("hotel", plan, [{ totalPrice: 450, currency: "USD" }] as never[]).enabled, true);
});

test("Hotel alert reconciliation is bound to the complete search identity", () => {
  const alert = { id: "a", type: "HOTEL", status: "ACTIVE", query: plan.payload };
  assert.equal(matchingHotelPriceAlert([alert as never], plan), alert);
  assert.equal(matchingHotelPriceAlert([{ ...alert, query: { ...plan.payload, hotelId: "hotel-42", hotelName: "Hotel Paris" } } as never], plan), undefined);
  assert.equal(matchingHotelPriceAlert([{ ...alert, query: { ...plan.payload, rooms: 2 } } as never], plan), undefined);
});

test("Hotel alert reconciliation prefers ACTIVE but retains a PAUSED match for resuming", () => {
  const paused = { id: "paused", type: "HOTEL", status: "PAUSED", query: plan.payload };
  const active = { id: "active", type: "HOTEL", status: "ACTIVE", query: plan.payload };
  assert.equal(matchingHotelPriceAlert([paused as never], plan), paused);
  assert.equal(matchingHotelPriceAlert([paused as never, active as never], plan), active);
});

test("Hotel details alert creation includes the selected property and current stay", () => {
  const editedPlan = { ...plan, payload: { ...plan.payload, checkIn: "2030-04-05", checkOut: "2030-04-09", guests: 4, rooms: 2 } };
  assert.deepEqual(
    buildHotelPriceAlertPayload(editedPlan, 720, " eur ", { id: ` ${hotel.id} `, name: ` ${hotel.name} ` }),
    {
      type: "HOTEL", destination: "Paris", targetPrice: 720, mode: "TARGET", currency: "EUR",
      query: { ...editedPlan.payload, hotelId: hotel.id, hotelName: hotel.name },
    },
  );
});

test("Hotel details reconciliation isolates properties sharing the same search", () => {
  const first = propertyAlert();
  const second = propertyAlert({ id: "another-property", query: { ...plan.payload, hotelId: "hotel-84", hotelName: "Another Paris Hotel" } });
  assert.equal(matchingHotelPriceAlert([first, second], plan, hotel.id), first);
  assert.equal(matchingHotelPriceAlert([first, second], plan, "hotel-84"), second);
  assert.equal(matchingHotelPriceAlert([first], plan, "hotel-84"), undefined);
  assert.equal(hotelPriceAlertMatchesPlan(propertyAlert({ type: "FLIGHT" }), plan, hotel.id), false);
});

test("Destination-wide and selected-property alerts do not activate one another", () => {
  const property = propertyAlert();
  const destination = propertyAlert({ id: "destination-alert", query: plan.payload });
  assert.equal(matchingHotelPriceAlert([property], plan), undefined);
  assert.equal(matchingHotelPriceAlert([destination], plan, hotel.id), undefined);
  assert.equal(matchingHotelPriceAlert([property, destination], plan), destination);
  assert.equal(matchingHotelPriceAlert([destination, property], plan, hotel.id), property);
});

test("Property alert matching uses canonical property ID and not its display name", () => {
  const alert = propertyAlert({ query: { ...plan.payload, hotelId: " HOTEL-42 ", hotelName: "Previous property name" } });
  assert.equal(hotelPriceAlertMatchesPlan(alert, plan, hotel.id), true);
  assert.equal(hotelPriceAlertMatchesPlan(alert, plan, "hotel-84"), false);
});

test("Property alerts remain bound to destination dates guests and rooms after stay edits", () => {
  const alert = propertyAlert();
  const changedStayValues = {
    destination: "London", checkIn: "2030-04-02", checkOut: "2030-04-04", guests: 3, rooms: 2,
  };
  for (const [field, value] of Object.entries(changedStayValues)) {
    const editedPlan = { ...plan, payload: { ...plan.payload, [field]: value } };
    assert.equal(hotelPriceAlertMatchesPlan(alert, editedPlan, hotel.id), false, `${field} changed`);
    assert.equal(matchingHotelPriceAlert([alert], editedPlan, hotel.id), undefined, `${field} changed`);
  }
});

test("Property alert reconciliation prefers its ACTIVE alert and retains its PAUSED target", () => {
  const paused = propertyAlert({ id: "paused-property", status: "PAUSED" });
  const active = propertyAlert({ id: "active-property", status: "ACTIVE" });
  const anotherProperty = propertyAlert({ id: "other-active", query: { ...plan.payload, hotelId: "hotel-84" } });
  assert.equal(matchingHotelPriceAlert([anotherProperty, paused], plan, hotel.id), paused);
  assert.equal(matchingHotelPriceAlert([anotherProperty, paused, active], plan, hotel.id), active);
});
