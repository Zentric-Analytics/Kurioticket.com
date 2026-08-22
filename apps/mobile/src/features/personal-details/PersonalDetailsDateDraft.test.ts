import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("DOB picker keeps partial day month and year selections visible until complete", () => {
  assert.match(screen, /type DateDraft = \{/);
  assert.match(screen, /\[dateDraft, setDateDraft\] = useState<DateDraft>/);
  assert.match(screen, /value=\{dateDraft\.day \|\| c\.day\}/);
  assert.match(
    screen,
    /value=\{dateMonthLabel\(dateDraft\.month, locale\) \|\| c\.month\}/,
  );
  assert.match(screen, /value=\{dateDraft\.year \|\| c\.year\}/);

  assert.match(
    screen,
    /const updateDateDraft = \(part: keyof DateDraft, value: string\) => \{[\s\S]*?setDateDraft\(next\)[\s\S]*?if \(next\.year && next\.month && next\.day\)[\s\S]*?patch\("dateOfBirth", `\$\{next\.year\}-\$\{next\.month\}-\$\{next\.day\}`\)/,
  );

  assert.match(screen, /selector === "year"\) updateDateDraft\("year", value\)/);
  assert.match(screen, /selector === "month"\) updateDateDraft\("month", value\)/);
  assert.match(screen, /selector === "day"\) updateDateDraft\("day", value\)/);
});

test("DOB draft is restored from authoritative profile values", () => {
  assert.match(screen, /setDateDraft\(dateDraftFromValue\(next\.dateOfBirth\)\)/);
  assert.match(
    screen,
    /setDateDraft\(dateDraftFromValue\(authoritative\.dateOfBirth\)\)/,
  );
  assert.match(screen, /setDateDraft\(dateDraftFromValue\(saved\.dateOfBirth\)\)/);
});
