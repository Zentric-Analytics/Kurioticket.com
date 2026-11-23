import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("./StandaloneFlightSearchForm.tsx", import.meta.url),
  "utf8",
);

test("multi-city landing restores traveler and cabin query context into committed and draft state", () => {
  assert.match(
    source,
    /const restoredTravelerCabinState = \(params: URLSearchParams\) => \{/,
  );
  assert.match(source, /params\.get\("adults"\)/);
  assert.match(source, /params\.get\("children"\)/);
  assert.match(source, /params\.get\("infants"\)/);
  assert.match(source, /params\.get\("cabinClass"\)/);

  const restoreStart = source.indexOf(
    'if (params.get("tripType") !== "multi-city") return;',
  );
  const restoreEnd = source.indexOf("}, []);", restoreStart);
  const restore = source.slice(restoreStart, restoreEnd);

  assert.match(restore, /const restoredTravelers = restoredTravelerCabinState\(params\)/);
  assert.match(restore, /setAdultCount\(restoredTravelers\.adults\)/);
  assert.match(restore, /setChildCount\(restoredTravelers\.children\)/);
  assert.match(restore, /setInfantCount\(restoredTravelers\.infants\)/);
  assert.match(restore, /setDraftAdultCount\(restoredTravelers\.adults\)/);
  assert.match(restore, /setDraftChildCount\(restoredTravelers\.children\)/);
  assert.match(restore, /setDraftInfantCount\(restoredTravelers\.infants\)/);
  assert.match(restore, /setCabinClass\(restoredTravelers\.cabinClass\)/);
  assert.match(restore, /setDraftCabinClass\(restoredTravelers\.cabinClass\)/);
});

test("restored traveler query values remain bounded by the flight party rules", () => {
  assert.match(
    source,
    /const adults = parseTravelerCount\(params\.get\("adults"\), 1, 1, 9\)/,
  );
  assert.match(
    source,
    /Math\.max\(0, 9 - adults\)/,
  );
  assert.match(
    source,
    /Math\.max\(0, Math\.min\(adults, 9 - adults - children\)\)/,
  );
  assert.match(
    source,
    /normalizeCabinClass\(params\.get\("cabinClass"\) \?\? "economy"\)/,
  );
});
