import assert from "node:assert/strict";
import test from "node:test";
import { createDealsJourneyProgress, getDealsJourneyStepIds, getHandoffReadyDealsJourneyProgress } from "./dealsJourneyProgress";
import { createDealsTripPlan } from "./dealsTripPlan";

test("every mode has only selected products in canonical order and review last", () => {
  assert.deepEqual(getDealsJourneyStepIds("hotel-flight"), ["hotel", "flight", "review"]);
  assert.deepEqual(getDealsJourneyStepIds("hotel-flight-car"), ["hotel", "flight", "car", "review"]);
  assert.deepEqual(getDealsJourneyStepIds("flight-car"), ["flight", "car", "review"]);
  assert.deepEqual(getDealsJourneyStepIds("hotel-car"), ["hotel", "car", "review"]);
});
test("progress derives indexes and default completed, current, and upcoming states", () => { const value = createDealsJourneyProgress("hotel-flight-car", { hotel: { status: "completed" }, flight: { status: "current", substate: "choose-outbound" } }); assert.equal(value.currentStepIndex, 2); assert.equal(value.total, 4); assert.deepEqual(value.steps.map(step => step.status), ["completed", "current", "upcoming", "upcoming"]); });
test("needs-attention and summaries survive while excluded product status is normalized away", () => { const value = createDealsJourneyProgress("hotel-car", { flight: { status: "current" }, hotel: { status: "needs-attention", summary: "Choose another room" } }); assert.deepEqual(value.steps.map(step => step.id), ["hotel", "car", "review"]); assert.equal(value.steps[0].status, "needs-attention"); assert.equal(value.steps[0].summary, "Choose another room"); });
test("ready handoff completes products and makes review current", () => { const plan = createDealsTripPlan({ mode: "flight-car", searchFingerprint: "x", resultsPath: "/deals/results" }); const value = getHandoffReadyDealsJourneyProgress({ ...plan, flight: {} as never, car: {} as never }); assert.deepEqual(value.steps.map(step => [step.id, step.status]), [["flight", "completed"], ["car", "completed"], ["review", "current"]]); assert.equal(value.currentStepIndex, 3); });
