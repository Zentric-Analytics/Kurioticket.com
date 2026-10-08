import assert from "node:assert/strict";
import test from "node:test";
import type { MobilePriceAlert } from "../../api/travelApi";
import { availableFlightAlertCurrencies, buildAutomaticFlightPriceAlertPayload, buildFlightPriceAlertPayload, flightAlertPresentation, flightPriceAlertMatchesPlan, matchingFlightPriceAlert, MAX_PRICE_ALERT_TARGET, parseTargetPrice, selectAutomaticFlightBaseline, pauseActiveFlightPriceAlerts } from "./flightPriceAlertModel";

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
  const result = (currency: string) => ({ price: 100, currency, searchPolicy: { source: "duffel", bookable: true } }) as never;
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

const alert = (overrides: Record<string, unknown> = {}) => ({
  id: "alert-1", type: "FLIGHT", origin: "JFK", destination: "CDG", targetPrice: null, mode: "AUTOMATIC", currency: "EUR", status: "ACTIVE",
  createdAt: "", updatedAt: "", lastSeenPrice: null, lastCheckedAt: null,
  query: { ...plan.payload, currency: "EUR" }, ...overrides,
}) as MobilePriceAlert;

test("turning tracking off pauses every active target and automatic identity match", async () => {
  const alerts = [alert({ id: "target", mode: "TARGET" }), alert({ id: "automatic" }), alert({ id: "paused", status: "PAUSED" }), alert({ id: "other", query: { ...plan.payload, destination: "LAX" } })];
  const ids: string[] = [];
  const updated = await pauseActiveFlightPriceAlerts(alerts, plan, async (id) => {
    ids.push(id);
    return alert({ ...alerts.find((item) => item.id === id), id, status: "PAUSED" });
  });
  assert.deepEqual(ids.sort(), ["automatic", "target"]);
  assert.equal(matchingFlightPriceAlert(updated, plan)?.status, "PAUSED");
  assert.equal(updated.find((item) => item.id === "other")?.status, "ACTIVE");
});

test("a partial pause failure attempts all matches and never reports success", async () => {
  const ids: string[] = [];
  await assert.rejects(pauseActiveFlightPriceAlerts([alert({ id: "target", mode: "TARGET" }), alert({ id: "automatic" })], plan, async (id) => {
    ids.push(id);
    if (id === "target") throw new Error("Network failure");
    return alert({ id, status: "PAUSED" });
  }), /Network failure/);
  assert.deepEqual(ids.sort(), ["automatic", "target"]);
});

test("an unconfirmed pause cannot turn tracking off", async () => {
  await assert.rejects(pauseActiveFlightPriceAlerts([alert()], plan, async () => alert()), /not paused/);
});

test("matches the exact canonical route, dates, trip type, passenger composition, and cabin", () => {
  assert.equal(flightPriceAlertMatchesPlan(alert(), plan), true);
  assert.equal(flightPriceAlertMatchesPlan(alert({ query: { ...plan.payload, departureDate: "2030-01-02" } }), plan), false);
  assert.equal(flightPriceAlertMatchesPlan(alert({ query: { ...plan.payload, cabinClass: "business" } }), plan), false);
  assert.equal(flightPriceAlertMatchesPlan(alert({ query: { ...plan.payload, adults: 1 } }), plan), false);
  assert.equal(flightPriceAlertMatchesPlan(alert({ query: { ...plan.payload, tripType: "one-way" } }), plan), false);
});

test("matching selection prefers ACTIVE over PAUSED without depending on object property order", () => {
  const reordered = { cabinClass: "premium-economy", infants: 0, destination: "CDG", adults: 2, departureDate: "2030-01-01", tripType: "round-trip", returnDate: "2030-01-08", children: 1, origin: "JFK" };
  const paused = alert({ id: "paused", status: "PAUSED", query: reordered });
  const active = alert({ id: "active", status: "ACTIVE", query: reordered });
  assert.equal(matchingFlightPriceAlert([paused, active], plan)?.id, "active");
  assert.equal(matchingFlightPriceAlert([paused], plan)?.status, "PAUSED");
});

test("automatic payload carries the lowest live Duffel baseline in its source currency", () => {
  const result = (price: number, currency: string, source = "duffel", bookable = true) => ({ price, currency, searchPolicy: { source, bookable } }) as never;
  const baseline = selectAutomaticFlightBaseline([result(700, "EUR"), result(600, "EUR"), result(1, "EUR", "kayak-sandbox", false)], "EUR");
  assert.equal(baseline?.price, 600);
  const payload = buildAutomaticFlightPriceAlertPayload(plan, baseline!.price, baseline!.currency);
  assert.equal(payload.mode, "AUTOMATIC");
  assert.equal(payload.baselinePrice, 600);
  assert.equal(payload.currency, "EUR");
  assert.equal(payload.query.currency, "EUR");
});

test("Flight Results prefers active targets while retaining legacy automatic controls", () => {
  const target = alert({ id: "target", mode: "TARGET", targetPrice: "540" });
  const automatic = alert({ id: "automatic", mode: "AUTOMATIC" });
  assert.equal(matchingFlightPriceAlert([automatic, target], plan)?.id, "target");
  assert.equal(matchingFlightPriceAlert([automatic], plan)?.id, "automatic");
  assert.equal(matchingFlightPriceAlert([alert({ id: "target", mode: "TARGET", targetPrice: "540", status: "PAUSED" }), automatic], plan)?.id, "automatic");
  assert.equal(matchingFlightPriceAlert([alert({ id: "target", mode: "TARGET", targetPrice: "540", status: "PAUSED" })], plan)?.id, "target");
});

test("new native Flight alerts explicitly save a target rather than an automatic baseline", () => {
  const payload = buildFlightPriceAlertPayload(plan, 540, "EUR");
  assert.equal(payload.mode, "TARGET");
  assert.equal(payload.targetPrice, 540);
  assert.equal("baselinePrice" in payload, false);
});
