import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const page = fs.readFileSync("src/app/deals/handoff/page.tsx", "utf8");
const pending = fs.readFileSync("src/components/results/deals/DealsGuidedHandoffPending.tsx", "utf8");
const invalid = fs.readFileSync("src/components/results/deals/DealsInvalidHandoffRequest.tsx", "utf8");

test("handoff selects strict legacy, guided, and provider-safe invalid branches", () => {
  assert.match(page, /parseDealsHandoffRequestMode\(query\.journey\)/);
  assert.match(page, /mode === "guided" \? <DealsGuidedHandoffPending/);
  assert.match(page, /mode === "legacy" \? <DealsHandoffClient/);
  assert.match(page, /<DealsInvalidHandoffRequest/);
  assert.doesNotMatch(page, /query\.journey === "guided"/);
});

test("invalid handoff presents one internal action and no provider or storage controls", () => {
  assert.match(invalid, /data-deals-invalid-handoff-request/);
  assert.equal((invalid.match(/<h1/g) ?? []).length, 1);
  assert.match(invalid, /href="\/deals"/);
  assert.doesNotMatch(invalid, /DealsHandoffClient|DealsHandoffStepCard|readDealsTripPlan|readDealsStagedJourneyPlan|writeDealsTripPlan|markDealsProviderOpened|target="_blank"|\/api\/redirect|https?:\/\//);
});

test("guided pending reads only staged storage and exposes no provider controls", () => {
  assert.match(pending, /readDealsStagedJourneyPlan/);
  assert.doesNotMatch(pending, /readDealsTripPlan|writeDealsTripPlan|markDealsProviderOpened|DealsHandoffStepCard|target="_blank"|provider-handoff|\/api\/redirect|bookingUrl|partnerRedirectUrl/);
  assert.match(pending, /getDealsReviewStatus/);
  assert.match(pending, /getFirstDealsJourneyStage/);
  assert.match(pending, /buildLegacyDealsResultsUrl\(search\)/);
  assert.match(pending, /handoffPending\.useCurrentOptions/);
  assert.equal((pending.match(/<h1/g) ?? []).length >= 2, true);
});
