import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./MobileResultsEditRow.tsx", import.meta.url),
  "utf8",
);

test("mobile result edit rows show their disclosure chevron by default", () => {
  assert.match(source, /showChevron = true/);
  assert.match(source, /\{showChevron \? \([\s\S]*?<ChevronRight/);
});

test("disabling the decorative chevron leaves the accessible button intact", () => {
  assert.match(source, /showChevron\?: boolean/);
  assert.match(source, /<button[\s\S]*?aria-hidden="true" \/>/);
  assert.match(source, /\) : \(\s*<span aria-hidden="true" \/>/);
});
