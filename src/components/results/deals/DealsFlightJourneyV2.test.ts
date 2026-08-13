import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const journeyUrl = new URL("./DealsFlightJourneyV2.tsx", import.meta.url);

test("round trips gate Return behind Fare Brand and exact Fare behind Return", async () => {
  const source = await readFile(journeyUrl, "utf8");
  const outbound = source.indexOf('title="Choose your departing flight"');
  const brand = source.indexOf('title="Choose a fare option"');
  const inbound = source.indexOf('title="Choose your return flight"');
  const exact = source.indexOf('"Choose your final flight fare"');

  assert.ok(outbound < brand && brand < inbound && inbound < exact);
  assert.match(
    source,
    /runtime\.tripType === "round-trip" && runtime\.selectedBrandOptionKey && \(\s*<ChoiceSection\s*title="Choose your return flight"/,
  );
  assert.match(
    source,
    /runtime\.selectedOutboundKey &&\s*\(runtime\.tripType === "one-way" \|\| runtime\.selectedReturnKey\) && \(/,
  );
});

test("one-way trips proceed from Outbound directly to exact Fare", async () => {
  const source = await readFile(journeyUrl, "utf8");
  assert.match(
    source,
    /runtime\.tripType === "round-trip" && runtime\.selectedOutboundKey && \(\s*<ChoiceSection title="Choose a fare option"/,
  );
  assert.match(
    source,
    /runtime\.tripType === "round-trip" && runtime\.selectedBrandOptionKey && \(/,
  );
  assert.match(
    source,
    /runtime\.tripType === "one-way" \|\| runtime\.selectedReturnKey/,
  );
});

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

test("outbound converted prices are identified as source estimates", async () => {
  const source = await readFile(journeyUrl, "utf8");
  assert.match(source, /Source estimate: \{displayPrice\.providerFormatted\}/);
  assert.doesNotMatch(
    source,
    /Provider price: \{displayPrice\.providerFormatted\}/,
  );
});
