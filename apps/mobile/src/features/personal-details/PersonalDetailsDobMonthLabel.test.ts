import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("DOB month edit field shows a readable month name while preserving numeric draft storage", () => {
  const quick = readFileSync(
    "src/features/personal-details/PersonalDetailsQuickEditor.tsx",
    "utf8",
  );
  assert.match(quick, /month: "short"/);
  assert.match(quick, /locale === "es-es" \? "es-ES" : "en-US"/);
  assert.match(quick, /value: String\(i \+ 1\)\.padStart\(2, "0"\)/);
  assert.match(
    screen,
    /const candidate = `\$\{next\.year\}-\$\{next\.month\}-\$\{next\.day\}`/,
  );
  assert.match(screen, /clampPersonalDetailsDateOfBirth\(candidate\)/);
  assert.match(screen, /patch\("dateOfBirth", candidate\)/);
  assert.match(screen, /patch\("dateOfBirth", clamped\)/);
});
