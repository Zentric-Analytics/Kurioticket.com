import assert from "node:assert/strict";
import test from "node:test";
import type { FlightResult } from "../../api/travelApi";
import { deriveFlightResultHighlights } from "./flightResultHighlights";

const flight = (id: string, price: number, durationMinutes: number, valueScore?: number) =>
  ({ id, price, durationMinutes, valueScore }) as FlightResult;

test("uses normalized fares, structured duration, and authoritative value ranking", () => {
  const displayed = [flight("best", 300, 300, 95), flight("cheap", 90, 200, 70), flight("fast", 200, 80, 80)];
  const normalized = new Map([["best", 250], ["cheap", 100], ["fast", 150]]);
  assert.deepEqual([...deriveFlightResultHighlights(displayed, (result) => normalized.get(result.id) ?? null)], [
    ["best", "Best"], ["cheap", "Cheapest"], ["fast", "Fastest"],
  ]);
});

test("does not fabricate labels when corresponding values are absent", () => {
  const displayed = [flight("unknown-a", Number.NaN, Number.NaN), flight("unknown-b", Number.NaN, Number.NaN)];
  assert.deepEqual([...deriveFlightResultHighlights(displayed, () => null)], []);
});

test("assigns one label per card using Best, Cheapest, Fastest priority", () => {
  const displayed = [flight("winner", 50, 60, 100), flight("runner-up", 80, 90, 90)];
  assert.deepEqual([...deriveFlightResultHighlights(displayed, (result) => result.price)], [["winner", "Best"]]);
});

test("resolves ties by displayed order without mutating results", () => {
  const displayed = [flight("filtered-first", 100, 60, 80), flight("filtered-second", 100, 60, 80)];
  const before = displayed.slice();
  assert.deepEqual([...deriveFlightResultHighlights(displayed, (result) => result.price)], [["filtered-first", "Best"]]);
  assert.deepEqual(displayed, before);
});

test("classification composes with the currently displayed filtered subset", () => {
  const loaded = [flight("hidden", 40, 40, 95), flight("visible-a", 90, 100, 70), flight("visible-b", 80, 120, 60)];
  const labels = deriveFlightResultHighlights(loaded.filter((result) => result.id.startsWith("visible")), (result) => result.price);
  assert.equal(labels.get("visible-a"), "Best");
  assert.equal(labels.get("visible-b"), "Cheapest");
  assert.equal(labels.has("hidden"), false);
});
