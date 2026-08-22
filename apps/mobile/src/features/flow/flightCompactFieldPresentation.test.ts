import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");

test("Flights uses one shared compact presentation for each search field", () => {
  for (const label of ["Origin", "Destination", "Travel dates", "Travelers & Cabin Class"]) {
    assert.equal(panel.match(new RegExp(`<CompactSearchField label="${label}"`, "g"))?.length, 1);
  }
  assert.equal(panel.match(/<CompactSearchField label=/g)?.length, 4);
  assert.doesNotMatch(panel, /<Field label=/);
  assert.doesNotMatch(panel, /<CompactSearchField label="(?:From|To)"/);
  assert.doesNotMatch(panel, /Travelers & Rooms|label="Rooms"/);
});
