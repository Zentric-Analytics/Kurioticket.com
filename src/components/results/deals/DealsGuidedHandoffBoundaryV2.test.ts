import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const boundary = readFileSync(
  new URL("./DealsGuidedHandoffBoundaryV2.tsx", import.meta.url),
  "utf8",
);
const storage = readFileSync(
  new URL("../../../lib/deals/dealsHandoffSnapshotV2.ts", import.meta.url),
  "utf8",
);

test("V2 handoff is a neutral, fail-closed boundary", () => {
  assert.match(boundary, /Ready for the next step/);
  assert.match(
    boundary,
    /No provider has been opened and no booking or payment has started/,
  );
  assert.match(boundary, /hotel-results|flight-results|car-results/);
  for (const forbidden of [
    "window.open",
    "/api/redirect",
    "attemptGuidedHandoffActivation",
    "providerOfferId",
    "Duffel Order",
  ])
    assert.doesNotMatch(boundary, new RegExp(forbidden, "i"));
});

test("V2 handoff storage uses canonical serialization, parsing, fingerprint and lifecycle validation", () => {
  assert.match(storage, /session|STORAGE_KEY/i);
  assert.match(storage, /serializeDealsTripPlanV2/);
  assert.match(storage, /parseDealsTripPlanV2/);
  assert.match(storage, /searchFingerprint !== expectedFingerprint/);
  assert.match(storage, /plan\.expiresAt <= now/);
  assert.match(storage, /getRequiredDealsJourneyStateV2\(plan, now\)/);
});
