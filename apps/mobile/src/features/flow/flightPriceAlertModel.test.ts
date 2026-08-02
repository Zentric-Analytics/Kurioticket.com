import assert from "node:assert/strict";
import test from "node:test";
import { availableFlightAlertCurrencies, buildFlightPriceAlertPayload, flightAlertPresentation, MAX_PRICE_ALERT_TARGET, parseTargetPrice } from "./flightPriceAlertModel";

const plan = { key: "flight", summary: "JFK → CDG", payload: { tripType: "round-trip", origin: "JFK", destination: "CDG", departureDate: "2030-01-01", returnDate: "2030-01-08", adults: 2, children: 1, infants: 0, travelers: 3, cabinClass: "premium-economy" } };
test("builds canonical premium economy round-trip payload", () => {
  const payload = buildFlightPriceAlertPayload(plan, 900.25, "eur");
  assert.deepEqual(payload.query, { ...plan.payload, currency: "EUR" });
  assert.equal(payload.currency, payload.query.currency);
  assert.equal("provider" in payload, false); assert.equal("price" in payload.query, false);
});
test("one-way omits return date", () => {
  const payload = buildFlightPriceAlertPayload({ ...plan, payload: { ...plan.payload, tripType: "one-way" } }, 100, "USD");
  assert.equal("returnDate" in payload.query, false);
});
test("validates target prices", () => {
  for (const invalid of ["", "0", "-1", "1.234", "hello", "1,000", String(MAX_PRICE_ALERT_TARGET + 0.01)]) assert.ok(parseTargetPrice(invalid).error, invalid);
  for (const valid of ["1", "1.2", "1.23", String(MAX_PRICE_ALERT_TARGET)]) assert.equal(parseTargetPrice(valid).value, Number(valid));
});
test("extracts only returned supported currencies", () => {
  const result = (currency: string) => ({ currency }) as never;
  assert.deepEqual(availableFlightAlertCurrencies([result("EUR"), result("EUR"), result("USD"), result("ZZZ")]), ["EUR", "USD"]);
  assert.deepEqual(availableFlightAlertCurrencies([]), []);
});
test("flight alert stays visible while unsupported currency only disables its action", () => {
  const result = (currency: string) => ({ currency, searchPolicy: { source: "duffel", bookable: true } }) as never;
  const unavailable = flightAlertPresentation("flight", true, [result("ZZZ")]);
  assert.equal(unavailable.visible, true); assert.equal(unavailable.enabled, false);
  const available = flightAlertPresentation("flight", true, [result("USD")]);
  assert.equal(available.visible, true); assert.equal(available.enabled, true);
});
test("hotel and car products never expose the flight alert", () => {
  const live = [{ currency: "USD", searchPolicy: { source: "duffel", bookable: true } }] as never;
  assert.equal(flightAlertPresentation("hotel", true, live).visible, false);
  assert.equal(flightAlertPresentation("car", true, live).visible, false);
});
