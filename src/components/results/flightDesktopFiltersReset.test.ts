import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("./DesktopFlightFilters.tsx", import.meta.url),
  "utf8",
);

test("desktop filter reset is hidden when activeFilterCount is zero", () => {
  assert.match(source, /const hasActiveFilters = activeFilterCount > 0;/);
  assert.match(source, /\{hasActiveFilters \? \(/);
  assert.doesNotMatch(source, /disabled=\{activeFilterCount === 0\}/);
});

test("desktop filter reset reuses the clear handler with an accessible name", () => {
  assert.match(source, /aria-label="Reset filters"/);
  assert.match(source, /onClick=\{onClear\}/);
});
