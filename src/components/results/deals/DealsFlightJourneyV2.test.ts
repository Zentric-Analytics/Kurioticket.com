import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const journeyUrl = new URL("./DealsFlightJourneyV2.tsx", import.meta.url);

test("exact Fare recovery preserves itinerary keys and refreshes without Fare substitution", async () => {
  const source = await readFile(journeyUrl, "utf8");
  const recovery = source.slice(
    source.indexOf("const recoverExactFares = async"),
    source.indexOf("const confirmFlight = async"),
  );
  assert.match(recovery, /selectedFareKey: undefined/);
  assert.match(recovery, /fareChoices: \[\]/);
  assert.doesNotMatch(recovery, /selectedOutboundKey: undefined/);
  assert.doesNotMatch(recovery, /selectedBrandOptionKey: undefined/);
  assert.doesNotMatch(recovery, /selectedReturnKey: undefined/);
  assert.doesNotMatch(recovery, /clearDealsFlightRuntimeV2/);
  assert.match(
    recovery,
    /getFlightBrandFareChoices\([\s\S]*outboundItineraryKey,[\s\S]*brandOptionKey: next\.selectedBrandOptionKey[\s\S]*returnItineraryKey: next\.selectedReturnKey/,
  );
  assert.match(recovery, /getFlightFareChoices\([\s\S]*outboundItineraryKey,/);
  assert.match(recovery, /commitRuntime\(\{ \.\.\.next, fareChoices \}\)/);
  assert.doesNotMatch(recovery, /selectedFareKey:\s*fareChoices/);
});
