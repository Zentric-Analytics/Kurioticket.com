import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("FlightCard action distinguishes undefined string and null contracts", async () => {
  const card = await readFile(
    new URL("../FlightCard.tsx", import.meta.url),
    "utf8",
  );
  assert.match(card, /detailsHref\?: string \| null/);
  assert.match(card, /detailsHref === undefined\s*\? `\/flights\/details/);
  assert.match(card, /onAction \? \(\s*<button/);
  assert.match(card, /detailsHref \? \(\s*<LinkButton/);
  assert.match(card, /disabled\s*aria-disabled="true"/);
});

test("guided shell mounts stable shared Flight results and removes legacy Flight details", async () => {
  const shell = await readFile(
    new URL("./DealsJourneyShell.tsx", import.meta.url),
    "utf8",
  );
  const client = await readFile(
    new URL("../FlightDetailsClient.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    shell,
    /stage === "flight-results" \? \([\s\S]*<DealsStableFlightResultsStage/,
  );
  assert.doesNotMatch(shell, /DealsFlightJourneyV2|flightV2Enabled/);
  assert.doesNotMatch(shell, /DealsFlightDetailsStage|flightId/);
  assert.match(shell, /<DealsCarResultsStage/);
  assert.match(shell, /<DealsReviewStage/);
  assert.doesNotMatch(shell, /data-deals-guided-flight-details-pending/);
  assert.match(client, /export function FlightDetailsExperience/);
});
