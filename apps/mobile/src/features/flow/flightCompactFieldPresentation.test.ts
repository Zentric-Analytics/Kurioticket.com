import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");

test("ordinary Flights retain the shared compact presentation while Multi-city uses a local field", () => {
  assert.equal(panel.match(/<CompactSearchField label="Origin"/g)?.length, 1);
  assert.equal(panel.match(/<CompactSearchField label="Destination"/g)?.length, 1);
  for (const label of ["Travel dates", "Travelers & Cabin Class"]) assert.equal(panel.match(new RegExp(`<CompactSearchField label="${label}"`, "g"))?.length, 1);
  assert.equal(panel.match(/<CompactSearchField label=/g)?.length, 4);
  assert.match(panel, /function MultiCityField/);
  assert.match(panel, /<MultiCityField label="Departure date"/);
  assert.doesNotMatch(panel, /<Field label=/);
  assert.doesNotMatch(panel, /<CompactSearchField label="(?:From|To)"/);
  assert.doesNotMatch(panel, /Travelers & Rooms|label="Rooms"/);
});
