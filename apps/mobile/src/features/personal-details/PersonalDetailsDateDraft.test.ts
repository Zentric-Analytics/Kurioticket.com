import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("DOB picker keeps partial selections visible and clamps completed under-18 dates", () => {
  assert.match(screen, /type DateDraft = \{/);
  assert.match(screen, /\[dateDraft, setDateDraft\] = useState<DateDraft>/);
  assert.match(screen, /value=\{dateDraft\.day \|\| c\.day\}/);
  assert.match(
    screen,
    /value=\{dateMonthLabel\(dateDraft\.month, locale\) \|\| c\.month\}/,
  );
  assert.match(screen, /value=\{dateDraft\.year \|\| c\.year\}/);

  const update = screen.slice(
    screen.indexOf("const updateDateDraft"),
    screen.indexOf("const saveCountrySelection"),
  );
  assert.match(update, /setDateDraft\(next\)/);
  assert.match(update, /if \(!next\.year \|\| !next\.month \|\| !next\.day\) return/);
  assert.match(update, /const candidate = `\$\{next\.year\}-\$\{next\.month\}-\$\{next\.day\}`/);
  assert.match(update, /const clamped = clampPersonalDetailsDateOfBirth\(candidate\)/);
  assert.match(update, /patch\("dateOfBirth", candidate\)/);
  assert.match(update, /patch\("dateOfBirth", clamped\)/);

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

test("unchanged legacy DOB does not block unrelated mobile Personal details saves", () => {
  const save = screen.slice(screen.indexOf("const save = async"), screen.indexOf("const goBack"));
  assert.match(save, /const dateOfBirthChanged =/);
  assert.match(save, /\(draft\.dateOfBirth \|\| ""\) !== \(saved\.dateOfBirth \|\| ""\)/);
  assert.match(save, /dateOfBirthChanged &&[\s\S]*?!isEligiblePersonalDetailsDateOfBirth\(draft\.dateOfBirth\)/);
});
