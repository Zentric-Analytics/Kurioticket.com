import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(
  "src/features/personal-details/PersonalDetailsScreen.tsx",
  "utf8",
);

const mainSave = screen.slice(
  screen.indexOf("const save = async"),
  screen.indexOf("const goBack"),
);

test("save-time 401 redirects to sign-in with Personal details return intent", () => {
  assert.match(mainSave, /catch \(e\)/);
  assert.match(
    mainSave,
    /e instanceof TravelApiError && e\.status === 401/,
  );
  assert.match(mainSave, /readSession\(\)\.catch\(\(\) => null\)/);
  assert.match(
    mainSave,
    /router\.replace\(signInHref\("\/personal-information"\)\)/,
  );

  const redirect = mainSave.indexOf(
    'router.replace(signInHref("/personal-information"))',
  );
  const genericFailure = mainSave.indexOf("setError(c.saveFailure)");
  assert.ok(redirect >= 0 && genericFailure > redirect);
});

test("non-auth save failures keep the existing generic failure path", () => {
  assert.match(mainSave, /setError\(c\.saveFailure\)/);
  assert.match(
    mainSave,
    /AccessibilityInfo\.announceForAccessibility\(c\.saveFailure\)/,
  );
});
