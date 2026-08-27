import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync("src/features/flow/FlightSearchPanel.tsx", "utf8");

test("Flights and every Multi-city leg use the shared compact presentation", () => {
  assert.equal(panel.match(/<CompactSearchField label="Origin"/g)?.length, 2);
  assert.equal(panel.match(/<CompactSearchField label="Destination"/g)?.length, 2);
  for (const label of ["Travel dates", "Travelers & Cabin Class"]) assert.equal(panel.match(new RegExp(`<CompactSearchField label="${label}"`, "g"))?.length, 1);
  assert.equal(panel.match(/<CompactSearchField label=/g)?.length, 7);
  assert.doesNotMatch(panel, /MultiCityField|multiField/);
  assert.doesNotMatch(panel, /<Field label=/);
});
