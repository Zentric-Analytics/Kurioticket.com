import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { mobileLocaleCodes } from "../../localization/mobileLocalizationCatalog";
import { flightResultsUiCopy } from "./flightResultsSummary";

test("every supported mobile locale has complete Flight Results copy and resolved counts", () => {
  for (const locale of mobileLocaleCodes) {
    const copy = flightResultsUiCopy(locale);
    for (const [key, value] of Object.entries(copy)) {
      if (typeof value === "string") assert.ok(value.trim(), `${locale}.${key}`);
    }
    assert.match(copy.flightCount(0), /0/);
    assert.match(copy.flightCount(1), /1/);
    assert.match(copy.flightCount(12), /12/);
    assert.match(copy.viewFlights(12), /12/);
    assert.match(copy.appliedCount(3), /3/);
    assert.match(copy.flightNumber(5), /5/);
    assert.equal(/\{\{[^}]+\}\}/.test(Object.values(copy).join(" ")), false);
  }
});

test("migrated Results components do not own core English UI copy", () => {
  const files = ["FlightResultsState.tsx", "FlightSortSheet.tsx", "FlightFilterSheet.tsx", "FlightResultsQuickControls.tsx"];
  const forbidden = ["No flights found", "Sort flights", "Choose how results are ordered", "Maximum travel time", "Search airlines", "Flexible / refundable"];
  for (const file of files) {
    const source = readFileSync(`src/features/search/${file}`, "utf8");
    for (const phrase of forbidden) assert.equal(source.includes(phrase), false, `${file}: ${phrase}`);
  }
});
