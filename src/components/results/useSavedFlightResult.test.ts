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

test("flight result favorites require sign-in and ignore guest local storage", () => {
  assert.match(source, /if \(status === "unauthenticated"\) \{[\s\S]*?await signIn\(undefined, \{ callbackUrl: window.location.href \}\)/);
  assert.doesNotMatch(source, /readSavedItemIds|toggleSavedItemId|writeSavedItemIds|LOCAL_SAVED_FLIGHTS_CHANGED_EVENT|local_saved|local_unsaved/);
  assert.match(source, /isSaved: status === "authenticated" && Boolean\(savedItem\)/);
});

test("saved Flight loading is shared across visible result cards", () => {
  assert.match(source, /let savedFlightsRequest: Promise<SavedFlightItem\[\]> \| null/);
  assert.match(source, /if \(savedFlightsRequest\) return savedFlightsRequest/);
  assert.match(source, /SAVED_FLIGHTS_CHANGED_EVENT/);
  assert.match(source, /savedFlightsRevision === revision/);
  assert.match(source, /publishSavedFlights/);
});


test("saved Flight result state waits for session resolution before sign-in or account mutation", () => {
  assert.match(source, /if \(status === "loading"\) return;/);
  assert.match(source, /if \(pending \|\| status === "loading"\) return;/);
  assert.match(source, /pending: pending \|\| status === "loading"/);
  assert.match(source, /status === "unauthenticated"/);
});

test("saved Flight result state revalidates after cross-surface invalidation", () => {
  assert.match(source, /SAVED_FLIGHTS_INVALIDATED_EVENT/);
  assert.match(source, /clearSavedFlightsCache\(owner\)/);
  assert.match(source, /loadSavedFlights\(owner\)/);
});


test("saved Flight cache invalidation survives unmounted result cards", () => {
  assert.match(source, /getSavedFlightsInvalidationRevision/);
  assert.match(source, /savedFlightsLoadedInvalidationRevision/);
  assert.match(source, /savedFlightsLoadedInvalidationRevision !== invalidationRevision/);
});
