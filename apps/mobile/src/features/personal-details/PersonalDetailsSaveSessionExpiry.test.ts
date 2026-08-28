import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

test("Save redirects an expired session through the Personal details sign-in intent", () => {
  const mainSave = screen.slice(
    screen.indexOf("const save = async"),
    screen.indexOf("const goBack"),
  );

  assert.match(mainSave, /catch \(e\)/);
  assert.match(
    mainSave,
    /e instanceof TravelApiError && e\.status === 401/,
  );
  assert.match(
    mainSave,
    /router\.replace\(signInHref\("\/personal-information"\)\)/,
  );
  assert.match(mainSave, /setError\(c\.saveFailure\)/);
  assert.ok(
    mainSave.indexOf('router.replace(signInHref("/personal-information"))') <
      mainSave.indexOf("setError(c.saveFailure)"),
  );
});
