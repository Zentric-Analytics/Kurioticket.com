import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("DOB picker keeps partial selections visible and clamps completed under-18 dates", () => {
  const quick = readFileSync(
    "src/features/personal-details/PersonalDetailsQuickEditor.tsx",
    "utf8",
  );
  assert.match(quick, /type DateDraft = \{/);
  assert.match(screen, /\[dateDraft, setDateDraft\] = useState<DateDraft>/);
  for (const part of ["day", "month", "year"]) {
    assert.ok(quick.includes("value={dateDraft." + part + "}"));
    assert.ok(quick.includes('onDateChange("' + part + '", value)'));
  }
  assert.match(screen, /onDateChange=\{updateDateDraft\}/);
  const update = screen.slice(
    screen.indexOf("const updateDateDraft"),
    screen.indexOf("const saveCountrySelection"),
  );
  assert.match(update, /setDateDraft\(next\)/);
  assert.match(
    update,
    /if \(!next\.year \|\| !next\.month \|\| !next\.day\) return/,
  );
  assert.match(
    update,
    /const candidate = `\$\{next\.year\}-\$\{next\.month\}-\$\{next\.day\}`/,
  );
  assert.match(
    update,
    /const clamped = clampPersonalDetailsDateOfBirth\(candidate\)/,
  );
  assert.match(update, /patch\("dateOfBirth", candidate\)/);
  assert.match(update, /patch\("dateOfBirth", clamped\)/);
});

test("DOB draft is restored from authoritative profile values", () => {
  assert.match(
    screen,
    /setDateDraft\(dateDraftFromValue\(next\.dateOfBirth\)\)/,
  );
  assert.match(
    screen,
    /setDateDraft\(dateDraftFromValue\(authoritative\.dateOfBirth\)\)/,
  );
  assert.match(
    screen,
    /setDateDraft\(dateDraftFromValue\(saved\.dateOfBirth\)\)/,
  );
});

test("unchanged legacy DOB does not block unrelated mobile Personal details saves", () => {
  const save = screen.slice(
    screen.indexOf("const save = async"),
    screen.indexOf("const goBack"),
  );
  assert.match(save, /const dateOfBirthChanged =/);
  assert.match(
    save,
    /\(draft\.dateOfBirth \|\| ""\) !== \(saved\.dateOfBirth \|\| ""\)/,
  );
  assert.match(
    save,
    /dateOfBirthChanged &&[\s\S]*?!isEligiblePersonalDetailsDateOfBirth\(draft\.dateOfBirth\)/,
  );
});
