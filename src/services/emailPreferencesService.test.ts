import assert from "node:assert/strict";
import test from "node:test";
import { emailPreferenceDefaults, getEmailPreferenceChanges, getSavedEmailPreferences, mergeEmailNotificationPreferences, normalizeEmailPreferences } from "./emailPreferencesService";

test("supported optional email preferences retain strict defaults", () => {
  assert.deepEqual(emailPreferenceDefaults, { receiveOptionalEmails: false, priceAlerts: false, travelInspiration: false, productUpdates: false, dealsRecommendations: false });
  assert.deepEqual(normalizeEmailPreferences({ receiveOptionalEmails: true, priceAlerts: true, unknown: true }), { ...emailPreferenceDefaults, receiveOptionalEmails: true, priceAlerts: true });
});

test("preference persistence preserves unrelated notification settings", () => {
  const merged = mergeEmailNotificationPreferences({ mandatory: { security: true }, email: { old: true } }, { ...emailPreferenceDefaults, productUpdates: true });
  assert.deepEqual((merged as { mandatory: unknown }).mandatory, { security: true });
  assert.equal(getSavedEmailPreferences(merged).preferences.productUpdates, true);
});

test("preference audit changes contain only supported changed keys", () => {
  const next = { ...emailPreferenceDefaults, receiveOptionalEmails: true, dealsRecommendations: true };
  assert.deepEqual(getEmailPreferenceChanges(emailPreferenceDefaults, next).map(change => change.key), ["receiveOptionalEmails", "dealsRecommendations"]);
});
