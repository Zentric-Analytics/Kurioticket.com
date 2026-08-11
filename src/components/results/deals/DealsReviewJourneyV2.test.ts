import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const review = readFileSync(
  new URL("./DealsReviewJourneyV2.tsx", import.meta.url),
  "utf8",
);
const flight = readFileSync(
  new URL("./DealsFlightJourneyV2.tsx", import.meta.url),
  "utf8",
);

test("V2 review is canonically gated and confirmation is user initiated", () => {
  assert.match(flight, /requiredState === "review"/);
  assert.match(review, /onClick=\{confirmReview\}/);
  assert.doesNotMatch(
    review,
    /useEffect\([\s\S]{0,500}REVIEW_CONTINUE_REQUESTED/,
  );
});

test("review confirmation stops locally before every handoff side effect", () => {
  assert.match(flight, /nextState === "handoff"/);
  assert.match(review, /reviewed\?\.revision/);
  assert.doesNotMatch(
    review,
    /\/deals\/handoff|\/api\/redirect|buildGuidedDealsHandoffPendingUrl|window\.open|provider opened/,
  );
});

test("review lifecycle delegates snapshot actions to the canonical parent", () => {
  assert.match(review, /getDealsTripPlanV2NextDeadline/);
  assert.match(review, /onLifecycleDeadline\(snapshot\)/);
  assert.match(flight, /planRef\.current/);
  assert.match(flight, /evaluateDealsReviewLifecycleV2/);
  assert.doesNotMatch(flight, /setPlan\(\{ \.\.\.reviewPlan \}\)/);
});
