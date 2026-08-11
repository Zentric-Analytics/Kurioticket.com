import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultDealsSearch } from "./dealsSearchParams";
import { DEALS_TRIP_PLAN_VERSION } from "./dealsTripPlan";
import { parseDealsTripPlan } from "./dealsTripPlanStorage";
import {
  createDealsTripPlanV2,
  parseDealsTripPlanV2,
  serializeDealsTripPlanV2,
} from "./dealsTripPlanV2";
test("creates and round-trips a canonical revision-zero v2 plan", () => {
  const plan = createDealsTripPlanV2(createDefaultDealsSearch(), 100);
  assert.equal(plan.revision, 0);
  assert.equal(plan.expiresAt - plan.createdAt, 25 * 60 * 1000);
  assert.deepEqual(parseDealsTripPlanV2(serializeDealsTripPlanV2(plan)), plan);
});
test("v1 and v2 parsers remain strictly separate", () => {
  const v2 = createDealsTripPlanV2(createDefaultDealsSearch(), 100);
  assert.equal(DEALS_TRIP_PLAN_VERSION, 1);
  assert.equal(
    parseDealsTripPlanV2(JSON.stringify({ ...v2, version: 1 })),
    null,
  );
  assert.equal(parseDealsTripPlan(JSON.stringify(v2)), null);
});
test("rejects malformed revisions, timestamps, and phases", () => {
  const plan = createDealsTripPlanV2(createDefaultDealsSearch(), 100);
  for (const bad of [
    { ...plan, revision: -1 },
    { ...plan, expiresAt: 100 },
    { ...plan, flightJourney: { ...plan.flightJourney!, phase: "confirmed" } },
  ])
    assert.equal(parseDealsTripPlanV2(JSON.stringify(bad)), null);
});
test("canonicalization drops unknown provider blobs", () => {
  const plan = createDealsTripPlanV2(
    createDefaultDealsSearch(),
    100,
  ) as unknown as Record<string, unknown>;
  plan.rawProviderReference = { secret: "x" };
  const parsed = parseDealsTripPlanV2(JSON.stringify(plan));
  assert.ok(parsed);
  assert.equal("rawProviderReference" in parsed, false);
});
