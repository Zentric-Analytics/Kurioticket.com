import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("DOB wheels update a complete clamped draft without saving it", () => {
  const update = screen.slice(
    screen.indexOf("const updateDateDraft"),
    screen.indexOf("const saveCountrySelection"),
  );
  assert.match(update, /normalizeBirthDate/);
  assert.match(update, /dateDraftRef.current/);
  assert.match(update, /setDateDraft\(next\)/);
  assert.match(update, /patch\("dateOfBirth", dateDraftValue\(next\)\)/);
  assert.doesNotMatch(update, /updateProfile/);
  assert.match(screen, /onDateChange=\{updateDateDraft\}/);
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
  assert.match(screen, /setDateDraft\(nextDate\)/);
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
