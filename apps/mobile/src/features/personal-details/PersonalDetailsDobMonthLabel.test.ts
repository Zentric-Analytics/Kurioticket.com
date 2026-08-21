import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("DOB month edit field shows a readable month name while preserving numeric draft storage", () => {
  assert.match(
    screen,
    /function dateMonthLabel\(value: string, locale: string\)/,
  );
  assert.match(
    screen,
    /value=\{dateMonthLabel\(dateDraft\.month, locale\) \|\| c\.month\}/,
  );
  assert.match(
    screen,
    /value: String\(i \+ 1\)\.padStart\(2, "0"\)/,
  );
  assert.match(
    screen,
    /patch\("dateOfBirth", `\$\{next\.year\}-\$\{next\.month\}-\$\{next\.day\}`\)/,
  );
});
