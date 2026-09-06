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

test("compact locales do not fall back to English Flight Results controls", () => {
  const locales = ["hi", "tr", "pl", "sv", "id", "th", "vi"] as const;
  const english = flightResultsUiCopy("en-us");
  for (const locale of locales) {
    const copy = flightResultsUiCopy(locale);
    assert.notEqual(copy.sortFlights, english.sortFlights, `${locale}.sortFlights`);
    assert.notEqual(copy.filters, english.filters, `${locale}.filters`);
    assert.notEqual(copy.reset, english.reset, `${locale}.reset`);
    assert.notEqual(copy.apply, english.apply, `${locale}.apply`);
  }
});

test("price prefix is independent from airport-origin copy", () => {
  const es = flightResultsUiCopy("es-es");
  const fr = flightResultsUiCopy("fr");
  assert.equal(es.fromPrice("€100"), "Desde €100");
  assert.equal(fr.fromPrice("€100"), "Dès €100");
  assert.equal(es.from, "ORIGEN");
  assert.equal(fr.from, "DÉPART");
});

test("flight counts use locale-aware plural categories", () => {
  const pl = flightResultsUiCopy("pl");
  assert.equal(pl.flightCount(1), "1 lot");
  assert.equal(pl.flightCount(2), "2 loty");
  assert.equal(pl.flightCount(5), "5 lotów");

  const ar = flightResultsUiCopy("ar");
  assert.equal(ar.flightCount(1), "1 رحلة");
  assert.equal(ar.flightCount(2), "2 رحلتان");
  assert.match(ar.flightCount(3), /رحلات/);
});

test("migrated Results components do not own core English UI copy", () => {
  const files = ["FlightResultsState.tsx", "FlightSortSheet.tsx", "FlightFilterSheet.tsx", "FlightResultsQuickControls.tsx"];
  const forbidden = ["No flights found", "Sort flights", "Choose how results are ordered", "Maximum travel time", "Search airlines", "Flexible / refundable"];
  for (const file of files) {
    const source = readFileSync(`src/features/search/${file}`, "utf8");
    for (const phrase of forbidden) assert.equal(source.includes(phrase), false, `${file}: ${phrase}`);
  }
});
