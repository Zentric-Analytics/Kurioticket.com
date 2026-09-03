import assert from "node:assert/strict";
import test from "node:test";
import { mobileLocaleCodes } from "./mobileLocalizationCatalog";
import { securityCopy } from "../features/profile/securityLocalization";
import "./applySecurityTranslationCorrections";

test("active session management copy is localized across supported non-English locales", () => {
  const english = securityCopy["en-us"];
  for (const locale of mobileLocaleCodes) {
    const copy = securityCopy[locale];
    for (const key of ["manageSession", "removeSession", "noActiveSessions", "noActiveSessionsHelp", "removeTitle", "removeBody", "removeFailed"] as const) {
      assert.ok(copy[key].trim(), `${locale}:${key} must not be empty`);
      if (locale !== "en-us") assert.notEqual(copy[key], english[key], `${locale}:${key} must not fall back to English`);
    }
  }
});
