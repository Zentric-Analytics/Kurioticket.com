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

test("V2 review has one neutral Continue action and no redundant confirmation state", () => {
  assert.match(flight, /requiredState === "review"/);
  assert.match(review, /onClick=\{continueJourney\}/);
  assert.equal((review.match(/>\s*Continue\s*</g) ?? []).length, 1);
  assert.doesNotMatch(
    review,
    /Confirm review|Review confirmed|const \[reviewed/,
  );
});

test("atomic review continuation persists only after the canonical handoff state", () => {
  assert.match(flight, /planRef\.current/);
  assert.match(flight, /evaluateDealsReviewLifecycleV2/);
  assert.match(flight, /REVIEW_CONTINUE_REQUESTED/);
  assert.match(flight, /result\.nextState === "handoff"/);
  assert.ok(
    flight.indexOf('result.nextState === "handoff"') <
      flight.indexOf(
        "writeDealsHandoffSnapshotV2",
        flight.indexOf("const continueReview"),
      ),
  );
  assert.match(flight, /journey", "guided-v2"/);
});

test("review lifecycle delegates precise recovery to the canonical parent", () => {
  assert.match(review, /getDealsTripPlanV2NextDeadline/);
  assert.match(review, /onLifecycleDeadline\(snapshot\)/);
  assert.doesNotMatch(flight, /setPlan\(\{ \.\.\.reviewPlan \}\)/);
});
