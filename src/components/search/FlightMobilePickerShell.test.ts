import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  "src/components/search/FlightMobilePickerShell.tsx",
  "utf8",
);

test("navigation headers show Cancel by default for airport pickers", () => {
  assert.match(source, /showCancelAction\?: boolean/);
  assert.match(source, /showCancelAction = true/);
  assert.match(source, /showCancelAction \? \(\s*<button/);
  assert.match(source, /\{t\.cancel\}/);
});

test("navigation headers use a non-interactive spacer when Cancel is suppressed", () => {
  assert.match(
    source,
    /<span\s+aria-hidden="true"\s+className="min-h-10"\s+data-mobile-picker-header-spacer\s*\/>/,
  );
  assert.match(source, /grid-cols-\[1fr_auto_1fr\]/);
  assert.doesNotMatch(
    source,
    /data-mobile-picker-header-spacer[^>]*(?:role=|tabIndex=|onClick=|aria-label=)/,
  );
});
