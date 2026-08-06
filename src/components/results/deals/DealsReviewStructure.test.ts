import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const shell = fs.readFileSync("src/components/results/deals/DealsJourneyShell.tsx", "utf8");
const stage = fs.readFileSync("src/components/results/deals/DealsReviewStage.tsx", "utf8");
const card = fs.readFileSync("src/components/results/deals/DealsReviewItemCard.tsx", "utf8");
const summary = fs.readFileSync("src/components/results/deals/DealsReviewSummary.tsx", "utf8");
const presentation = fs.readFileSync("src/lib/deals/dealsReviewPresentation.ts", "utf8");
const handoff = fs.readFileSync("src/components/results/deals/DealsGuidedHandoffPending.tsx", "utf8");

test("guided Review replaces the placeholder and keeps shell-owned page structure", () => {
  assert.doesNotMatch(shell, /data-deals-guided-review-pending/);
  assert.match(shell, /<DealsReviewStage/);
  assert.doesNotMatch(stage, /<main|<h1|AppHeader|Footer/);
  assert.match(shell, /<h1/);
  assert.match(card, /<h3/);
  assert.match(summary, /aria-labelledby="deals-review-summary-title"/);
});

test("guided Review uses safe internal builders and no provider exits or writes", () => {
  assert.match(presentation, /getIncludedProductList/);
  assert.match(presentation, /buildDealsJourneyUrl/);
  assert.match(stage, /getDealsTripPlanEstimatedTotal/);
  assert.match(stage + card, /formatDisplayPrice/);
  assert.match(presentation + stage, /isDealsTripPlanProductExpired|getDealsReviewStatus/);
  assert.doesNotMatch(stage + card + summary + presentation, /bookingUrl|partnerRedirectUrl|buildDealsInternalRedirectHref|getNextDealsProviderStep|markDealsProviderOpened|writeDealsTripPlan|target="_blank"|rel="noopener noreferrer"|\/api\/redirect|window\.open|location\.assign|location\.replace/);
});

test("guided handoff-pending marker and provider suppression remain explicit", () => {
  assert.match(handoff, /data-deals-guided-handoff-pending/);
  assert.match(handoff, /readDealsStagedJourneyPlan/);
  assert.doesNotMatch(handoff, /readDealsTripPlan|writeDealsTripPlan|markDealsProviderOpened|DealsHandoffStepCard|target="_blank"|\/api\/redirect|buildDealsInternalRedirectHref/);
});

test("Review detail labels are translated keys rather than hard-coded English", () => {
  assert.match(presentation, /labelKey:/);
  assert.match(card, /t\(detail\.labelKey\)/);
  for (const label of ["Package", "Included options", "Location", "Check-in", "Check-out", "Route", "Departure", "Arrival", "Model", "Pickup", "Return"]) {
    assert.doesNotMatch(stage + card + summary + presentation, new RegExp(`(?:label:|>)[^\\n]*${label}`));
  }
});
