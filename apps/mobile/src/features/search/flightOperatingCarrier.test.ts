import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { flightOperatingCarrierPresentation } from "./flightOperatingCarrier";

type Carrier = { name: string; iataCode?: string };
const carrier = (name: string, iataCode?: string): Carrier => ({ name, ...(iataCode ? { iataCode } : {}) });
const segment = (marketingCarrier?: Carrier, operatingCarrier?: Carrier) => ({ marketingCarrier, operatingCarrier });
const result = (...legs: ReturnType<typeof segment>[][]) => ({
  airlineName: "British Airways",
  legs: legs.map((segments) => ({ segments })),
}) as unknown as FlightResult;
const presentation = (...legs: ReturnType<typeof segment>[][]) => flightOperatingCarrierPresentation(result(...legs));

test("same carrier is suppressed when authoritative IATA codes match", () => {
  assert.equal(presentation([segment(carrier("British Airways", "BA"), carrier("British Airways PLC", "ba"))]), null);
});

test("same carrier is suppressed by normalized names when IATA is unavailable", () => {
  assert.equal(presentation([segment(carrier("American Airlines"), carrier(" american airlines "))]), null);
});

test("a simple codeshare names its operator", () => {
  assert.deepEqual(presentation([segment(carrier("British Airways", "BA"), carrier("American Airlines", "AA"))]), {
    text: "Operated by American Airlines", accessibilityText: "operated by American Airlines",
  });
});

test("all segments with the same external operator name that operator", () => {
  const ba = carrier("British Airways", "BA");
  const aa = carrier("American Airlines", "AA");
  assert.equal(presentation([segment(ba, aa), segment(ba, aa)])?.text, "Operated by American Airlines");
});

test("a partially partner-operated journey uses qualified copy", () => {
  const ba = carrier("British Airways", "BA");
  assert.equal(presentation([segment(ba, ba), segment(ba, carrier("American Airlines", "AA"))])?.text, "Includes flight operated by American Airlines");
});

test("multiple external operators use compact truthful copy", () => {
  const ba = carrier("British Airways", "BA");
  assert.equal(presentation([segment(ba, carrier("American Airlines", "AA")), segment(ba, carrier("Iberia", "IB"))])?.text, "Includes partner-operated flights");
});

test("missing operating carrier suppresses presentation", () => {
  assert.equal(presentation([segment(carrier("British Airways", "BA"))]), null);
});

test("missing marketing carrier suppresses presentation", () => {
  assert.equal(presentation([segment(undefined, carrier("American Airlines", "AA"))]), null);
});

test("no legs suppresses presentation", () => assert.equal(flightOperatingCarrierPresentation(result()), null));

test("round trip with one external operator names it", () => {
  const ba = carrier("British Airways", "BA");
  const aa = carrier("American Airlines", "AA");
  assert.equal(presentation([segment(ba, aa)], [segment(ba, aa)])?.text, "Operated by American Airlines");
});

test("round trip with mixed operator status uses qualified copy", () => {
  const ba = carrier("British Airways", "BA");
  assert.equal(presentation([segment(ba, carrier("American Airlines", "AA"))], [segment(ba, ba)])?.text, "Includes flight operated by American Airlines");
});

test("presentation does not mutate provider results", () => {
  const input = result([segment(carrier("British Airways", "BA"), carrier("American Airlines", "AA"))]);
  const before = JSON.stringify(input);
  flightOperatingCarrierPresentation(input);
  assert.equal(JSON.stringify(input), before);
});
