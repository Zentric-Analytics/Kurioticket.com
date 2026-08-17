import assert from "node:assert/strict";
import test from "node:test";

import {
  canHydrateLocaleFromAccount,
  resolveExplicitLocalePreference,
} from "./localePreference";

test("explicit locale precedence preserves cookie and current choices", () => {
  assert.equal(
    resolveExplicitLocalePreference({
      cookie: "fr",
      currentStorage: "ja",
      legacyStorage: "es-es",
    }),
    "fr",
  );
  assert.equal(
    resolveExplicitLocalePreference({
      currentStorage: "fr",
      legacyStorage: "vi",
    }),
    "fr",
  );
  assert.equal(resolveExplicitLocalePreference({ legacyStorage: "vi" }), "vi");
});

test("invalid storage is ignored and explicit English remains explicit", () => {
  assert.equal(
    resolveExplicitLocalePreference({ legacyStorage: "not-a-locale" }),
    null,
  );
  assert.equal(
    resolveExplicitLocalePreference({
      cookie: "en-us",
      currentStorage: "fr",
      legacyStorage: "fr",
    }),
    "en-us",
  );
});

test("account hydration only applies after migration and without a local choice", () => {
  assert.equal(canHydrateLocaleFromAccount("manual", true), false);
  assert.equal(canHydrateLocaleFromAccount("default", false), false);
  assert.equal(canHydrateLocaleFromAccount("default", true), true);
  assert.equal(canHydrateLocaleFromAccount("account", true), false);
});
