import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("guided Deals page has no Flight feature gate", async () => {
  const source = await readFile(
    new URL("./journey/[stage]/page.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /DEALS_V2_FLIGHT_UI_ENABLED|flightV2Enabled/);
  assert.match(source, /<DealsJourneyShell/);
});
