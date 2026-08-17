import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stageUrl = new URL(
  "./DealsStableFlightResultsStage.tsx",
  import.meta.url,
);
const shellUrl = new URL("./DealsJourneyShell.tsx", import.meta.url);

test("stable Deals Flights reuse the authoritative standalone inventory path", async () => {
  const [stage, results] = await Promise.all([
    readFile(stageUrl, "utf8"),
    readFile(new URL("../FlightResultsClient.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(stage, /<FlightResultsClient/);
  assert.match(stage, /presentationMode="deals-guided"/);
  assert.match(stage, /buildDealsFlightResultsSearchInput/);
  assert.match(results, /fetch\("\/api\/flights\/search"/);
  assert.doesNotMatch(stage, /inventoryToken|fareBrand|returnChoices/);
});

test("a real round-trip result is selected without leaving Deals", async () => {
  const [stage, shell] = await Promise.all([
    readFile(stageUrl, "utf8"),
    readFile(shellUrl, "utf8"),
  ]);

  assert.match(stage, /onSelectFlight=\{select\}/);
  assert.match(stage, /requestedFlightId: flight\.id/);
  assert.match(stage, /buildDealsFlightDetailsSelection/);
  assert.match(shell, /confirm\("flight", selection\)/);
  assert.match(shell, /getGuidedDealsProductOrder\(search\.mode\)/);
  assert.match(shell, /buildDealsJourneyUrl\(nextStage, search\)/);
  assert.doesNotMatch(stage, /router\.(?:push|replace)|\/flights\/results/);
});

test("the guided plan carries Hotel through Flight and preserves Car ordering", async () => {
  const shell = await readFile(shellUrl, "utf8");

  assert.match(shell, /renderedPlan: plan/);
  assert.match(shell, /attemptGuidedConfirmation/);
  assert.match(shell, /<DealsStableFlightResultsStage/);
  assert.match(shell, /<DealsCarResultsStage/);
  assert.match(shell, /<DealsReviewStage/);
});

test("provider failure taxonomy remains server authoritative", async () => {
  const providerFailure = await readFile(
    new URL(
      "../../../app/api/packages/v2/flights/inventory/providerFailure.ts",
      import.meta.url,
    ),
    "utf8",
  );

  for (const code of [
    "NO_INVENTORY",
    "PROVIDER_TEMPORARILY_UNAVAILABLE",
    "PROVIDER_CONFIGURATION_UNAVAILABLE",
    "PROVIDER_RESPONSE_UNUSABLE",
  ]) {
    assert.match(providerFailure, new RegExp(code));
  }
  assert.doesNotMatch(providerFailure, /DUFFEL_API_KEY\s*:/);
});
