import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const page = fs.readFileSync("src/app/deals/handoff/page.tsx", "utf8");
const pending = fs.readFileSync("src/components/results/deals/DealsGuidedHandoffPending.tsx", "utf8");

test("handoff keeps legacy client unless journey=guided is present", () => {
  assert.match(page, /query\.journey === "guided"/);
  assert.match(page, /<DealsGuidedHandoffPending/);
  assert.match(page, /<DealsHandoffClient/);
});

test("guided pending reads only staged storage and exposes no provider controls", () => {
  assert.match(pending, /readDealsStagedJourneyPlan/);
  assert.doesNotMatch(pending, /readDealsTripPlan|writeDealsTripPlan|markDealsProviderOpened|DealsHandoffStepCard|target="_blank"|provider-handoff|\/api\/redirect|bookingUrl|partnerRedirectUrl/);
  assert.match(pending, /buildDealsSearchFingerprint/);
  assert.match(pending, /getDealsTripPlanReadiness/);
  assert.match(pending, /storage_unavailable/);
  assert.match(pending, /status === "expired"/);
  assert.match(pending, /incompleteTitle/);
  assert.match(pending, /buildDealsJourneyUrl\("review", search\)/);
});
