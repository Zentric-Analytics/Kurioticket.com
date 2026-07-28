import assert from "node:assert/strict";
import test from "node:test";

import {
  HOMEPAGE_FARE_REFRESH_OUTCOME_PRESENTATION,
  classifyHomepageFareRefreshOutcome,
  createHomepageFareRefreshFailureOutcome,
  type HomepageFareRefreshOutcomeInput,
} from "./homepageFareRefreshOutcome";

const completeCounts: HomepageFareRefreshOutcomeInput = {
  refreshed: 24,
  failed: 0,
  unavailable: 0,
  retained: 0,
  stoppedReason: "completed",
  globalReadinessStatus: "ready",
  marketsNeedingAnotherRun: [],
};

test("a complete refresh is classified as full success", () => {
  const outcome = classifyHomepageFareRefreshOutcome(completeCounts);
  assert.equal(outcome.kind, "success");
  assert.equal(outcome.primaryMessage, "Refresh completed successfully");
  assert.match(
    HOMEPAGE_FARE_REFRESH_OUTCOME_PRESENTATION[outcome.kind].className,
    /emerald/,
  );
});

test("failed or unavailable routes are classified as completed with issues", () => {
  for (const counts of [
    { ...completeCounts, failed: 1 },
    { ...completeCounts, unavailable: 1 },
  ]) {
    const outcome = classifyHomepageFareRefreshOutcome(counts);
    assert.equal(outcome.kind, "warning");
    assert.equal(outcome.primaryMessage, "Refresh completed with issues");
    assert.doesNotMatch(
      HOMEPAGE_FARE_REFRESH_OUTCOME_PRESENTATION[outcome.kind].className,
      /emerald/,
    );
  }
});

test("an incomplete stopped reason is a warning with a safe explanation", () => {
  const outcome = classifyHomepageFareRefreshOutcome({
    ...completeCounts,
    stoppedReason: "provider_budget_exhausted",
  });
  assert.equal(outcome.kind, "warning");
  assert.equal(outcome.explanation, "Stopped: Provider budget exhausted");
});

test("incomplete coverage and markets needing another run are warnings", () => {
  const partial = classifyHomepageFareRefreshOutcome({
    ...completeCounts,
    globalReadinessStatus: "partial",
  });
  const needsRun = classifyHomepageFareRefreshOutcome({
    ...completeCounts,
    marketsNeedingAnotherRun: [{ market: "US", needed: true }],
  });
  assert.equal(partial.kind, "warning");
  assert.match(partial.explanation ?? "", /Coverage: Partially ready/);
  assert.equal(needsRun.kind, "warning");
  assert.match(needsRun.explanation ?? "", /Markets needing another run: US/);
});

test("target met is a complete stopped reason and retained LKG alone is not a warning", () => {
  const outcome = classifyHomepageFareRefreshOutcome({
    ...completeCounts,
    retained: 4,
    stoppedReason: "target_met",
  });
  assert.equal(outcome.kind, "success");
  assert.match(outcome.details.join(" "), /4 retained as last-known-good/);
});

test("HTTP, network, and parsing failures use the explicit error outcome", () => {
  for (const safeDetail of [
    "Could not refresh homepage fares. Status 500.",
    "Could not refresh homepage fares. Please try again or check provider status.",
  ]) {
    const outcome = createHomepageFareRefreshFailureOutcome(safeDetail);
    assert.equal(outcome.kind, "error");
    assert.equal(outcome.primaryMessage, "Refresh failed");
    assert.match(
      HOMEPAGE_FARE_REFRESH_OUTCOME_PRESENTATION[outcome.kind].className,
      /rose/,
    );
    assert.equal(
      HOMEPAGE_FARE_REFRESH_OUTCOME_PRESENTATION[outcome.kind].role,
      "alert",
    );
  }
});
