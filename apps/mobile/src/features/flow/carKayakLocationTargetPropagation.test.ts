import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { carSearchParams, initializeCarsPageForm } from "./carSearchModel";
import { buildSearchPlan } from "./travelSearchModel";

const today = new Date("2026-09-16T12:00:00Z");
const target = JSON.stringify({
  id: "place:paris-france",
  kind: "city",
  primaryLabel: "Paris",
  supportingLabel: "France",
  submittedValue: "Paris, France",
  providerBindings: [],
  verification: "verified",
  selectionToken: "a".repeat(64),
});
const base = {
  pickupLocation: "Paris, France",
  pickupLocationTarget: target,
  pickupDate: "2026-09-18",
  pickupTime: "10:00",
  dropoffDate: "2026-09-20",
  dropoffTime: "10:00",
  driverAge: "30",
};

test("native Cars preserves a selected canonical pickup target through route serialization", () => {
  const form = initializeCarsPageForm(base, today).form;
  assert.equal(form.pickupLocationTarget, target);
  const params = carSearchParams(form);
  assert.equal(params.pickupLocationTarget, target);
  assert.equal(params.dropoffLocationTarget, target);
});

test("native Cars preserves independent pickup and drop-off targets", () => {
  const returnTarget = JSON.stringify({ ...JSON.parse(target), id: "airport:CDG", kind: "airport", primaryLabel: "Charles de Gaulle Airport", submittedValue: "Charles de Gaulle Airport (CDG)", selectionToken: "b".repeat(64) });
  const form = initializeCarsPageForm({ ...base, dropoffLocation: "Charles de Gaulle Airport (CDG)", dropoffLocationTarget: returnTarget }, today).form;
  const params = carSearchParams(form);
  assert.equal(params.pickupLocationTarget, target);
  assert.equal(params.dropoffLocationTarget, returnTarget);
});

test("Cars API search plans reconstruct canonical targets instead of sending JSON strings", () => {
  const plan = buildSearchPlan("car", base, today).plan!;
  assert.equal(typeof plan.payload.pickupLocationTarget, "object");
  assert.equal((plan.payload.pickupLocationTarget as { selectionToken?: string }).selectionToken, "a".repeat(64));
  assert.deepEqual(plan.payload.dropoffLocationTarget, plan.payload.pickupLocationTarget);
});

test("malformed carried target is ignored without invalidating an otherwise valid Cars search", () => {
  const plan = buildSearchPlan("car", { ...base, pickupLocationTarget: "not-json" }, today).plan!;
  assert.equal("pickupLocationTarget" in plan.payload, false);
  assert.equal("dropoffLocationTarget" in plan.payload, false);
});

test("Cars location picker commits the selected canonical suggestion, not only display text", () => {
  const panel = readFileSync(`${process.cwd()}/src/features/flow/CarSearchPanel.tsx`, "utf8");
  assert.match(panel, /const locationTarget = \(suggestion: CarLocationSuggestion\) => suggestion\.canonical \? JSON\.stringify\(suggestion\.canonical\) : undefined/);
  assert.match(panel, /onChoose\(item\)/);
  assert.doesNotMatch(panel, /onChoose\(item\.value\)/);
  assert.match(panel, /pickupLocationTarget: target/);
  assert.match(panel, /dropoffLocationTarget: target/);
});

test("Cars server diagnostics retain the request id and provider skip reason", () => {
  const root = `${process.cwd()}/../..`;
  const aggregator = readFileSync(`${root}/src/services/travel/carAggregator.ts`, "utf8");
  const route = readFileSync(`${root}/src/app/api/cars/search/route.ts`, "utf8");
  assert.match(aggregator, /\[car-search:provider-diagnostics\]/);
  assert.match(aggregator, /errorReason: kayak\.errorReason/);
  assert.match(aggregator, /pickupLocationTargetPresent: Boolean\(search\.pickupLocationTarget\)/);
  assert.match(route, /searchCars\(search, \{ requestId, kayak:/);
});
