import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("src/components/results/useSavedFlightResult.ts", "utf8");

test("desktop Flight result save state uses the existing canonical flight backend", () => {
  assert.match(source, /useSession/);
  assert.match(source, /\/api\/dashboard\/saved\?type=flight/);
  assert.match(source, /body: JSON\.stringify\(\{ type: "flight", id: previous\.id \}\)/);
  assert.match(source, /type: "flight"/);
  assert.match(source, /provider: flight\.provider/);
  assert.match(source, /airlineName: flight\.airlineName/);
  assert.match(source, /flightResultId: flight\.id/);
  assert.match(source, /detailsHref/);
});

test("desktop Flight result save state preserves the guest local fallback used by Flight Details", () => {
  assert.match(source, /readSavedItemIds/);
  assert.match(source, /toggleSavedItemId/);
  assert.match(source, /writeSavedItemIds/);
  assert.match(source, /LOCAL_SAVED_FLIGHTS_CHANGED_EVENT/);
});

test("saved Flight loading is shared across visible result cards", () => {
  assert.match(source, /let savedFlightsRequest: Promise<SavedFlightItem\[\]> \| null/);
  assert.match(source, /if \(savedFlightsRequest\) return savedFlightsRequest/);
  assert.match(source, /SAVED_FLIGHTS_CHANGED_EVENT/);
  assert.match(source, /savedFlightsRevision === revision/);
  assert.match(source, /publishSavedFlights/);
});
