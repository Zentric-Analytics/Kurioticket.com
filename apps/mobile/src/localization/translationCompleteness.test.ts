import assert from "node:assert/strict";
import test from "node:test";
import { dictionaries, mobileLocaleCodes, type MobileLocale } from "./mobileLocalizationCatalog";
import { mobileTranslationCorrectionKeys } from "./mobileTranslationCorrectionKeys";
import { mobileTranslationCorrections, translatedMobileValue } from "./mobileTranslationCorrections";
import { securityCopy } from "../features/profile/securityLocalization";
import { localizedSecurityCopy } from "../features/profile/securityTranslationCorrections";

const expandedLocales = mobileLocaleCodes.filter(
  (locale): locale is Exclude<MobileLocale, "en-us" | "es-es"> => locale !== "en-us" && locale !== "es-es",
);

test("every expanded locale corrects the shared English mobile placeholders", () => {
  for (const locale of expandedLocales) {
    const corrections = mobileTranslationCorrections[locale];
    assert.ok(corrections, `${locale} corrections`);
    for (const key of mobileTranslationCorrectionKeys) {
      const value: string | undefined = corrections[key];
      assert.equal(typeof value, "string", `${locale}.${key}`);
      assert.ok(value!.trim(), `${locale}.${key}`);
      assert.notEqual(value, dictionaries["en-us"][key], `${locale}.${key} must not retain English placeholder copy`);
      assert.equal(translatedMobileValue(locale, key, dictionaries[locale][key]), value, `${locale}.${key} runtime value`);
    }
  }
});

const sharedSecurityFallbackKeys = [
  "loading", "loadError", "back", "configured", "notConfigured", "current", "show", "hide", "changing",
  "passwordRules", "passwordInvalid", "passwordSuccess", "oauth", "reset", "resetSent", "yourDevices", "devicesHelp",
  "currentDevice", "lastActive", "remove", "removeTitle", "removeBody", "removeFailed", "signOutAll", "signOutAllHelp",
  "signOutTitle", "signOutBody", "signOutFailed", "alertsHelp", "saveFailed", "activity", "activityHelp", "empty",
  "openFailed", "unknown", "enabled", "disabled", "twoFactorSetupHelp", "setupTwoFactor", "setupInstructions",
  "authenticatorCode", "confirmSetup", "codeInvalid", "twoFactorError", "recoveryTitle", "recoveryHelp", "disable",
  "disableTitle", "disableBody", "disableHelp", "verification", "deletionHelp", "requestDeletion", "deletionConfirmTitle",
  "deletionConfirmBody", "pendingDeletion", "scheduledDate", "keepAccount", "reactivated", "deletionError", "addPasskey",
  "passkeyPreviewRequired", "passkeysLoadError",
] as const;

test("every expanded locale replaces the shared English Security fallbacks", () => {
  for (const locale of expandedLocales) {
    const localized = localizedSecurityCopy(locale, securityCopy[locale]);
    for (const key of sharedSecurityFallbackKeys) {
      assert.ok(localized[key].trim(), `${locale}.${key}`);
      assert.notEqual(localized[key], securityCopy["en-us"][key], `${locale}.${key} must not retain English Security copy`);
    }
  }
});

test("representative corrected strings are localized in the runtime path", () => {
  assert.equal(translatedMobileValue("fr", "logoutConfirm", dictionaries.fr.logoutConfirm), "Se déconnecter ?");
  assert.equal(translatedMobileValue("de-de", "faqSearch", dictionaries["de-de"].faqSearch), "Fragen und Antworten durchsuchen");
  assert.equal(translatedMobileValue("ar", "saving", dictionaries.ar.saving), "جارٍ الحفظ…");
  assert.equal(translatedMobileValue("ja", "airportSearch", dictionaries.ja.airportSearch), "空港を検索");
  assert.equal(localizedSecurityCopy("zh-cn", securityCopy["zh-cn"]).title, "安全");
  assert.equal(localizedSecurityCopy("ko", securityCopy.ko).loadError, "보안 설정을 불러올 수 없습니다.");
});
