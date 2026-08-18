import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const resultsSource = () => readFileSync("src/features/search/ApprovedResultsScreen.tsx", "utf8");
const productsSource = () => readFileSync("src/features/flow/ProductScreens.tsx", "utf8");

test("Hotel Results Edit search opens the editable Hotels form with the current search values", () => {
  const source = resultsSource();
  const start = source.indexOf("const edit = () =>");
  const end = source.indexOf("const sorted =", start);
  const edit = source.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(edit, /pathname: "\/hotels"/);
  for (const key of ["destination", "checkIn", "checkOut", "guests", "rooms"] as const) {
    assert.match(edit, new RegExp(`${key}: one\\(params\\.${key}\\) \\|\\| ""`));
  }
  assert.doesNotMatch(edit, /router\.canGoBack\(\) \? router\.back\(\)/);
  assert.match(edit, /pathname: "\/edit-flight-search"/);
});

test("Hotels form accepts every value forwarded from Hotel Results", () => {
  const source = productsSource();
  for (const key of ["destination", "checkIn", "checkOut", "guests", "rooms"] as const) {
    assert.match(source, new RegExp(`${key}\\?: string \\| string\\[\\]`));
  }
  assert.match(source, /<HotelSearchPanel ref=\{panel\} params=\{params\} \/>/);
});
