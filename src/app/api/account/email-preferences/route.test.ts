import assert from "node:assert/strict";
import test from "node:test";

import {
  emailPreferenceDefaults,
  emailPreferencesSchema,
  getSavedEmailPreferences,
  mergeEmailNotificationPreferences,
  normalizeEmailPreferences,
} from "@/app/api/account/email-preferences/route";

test("email preference normalization returns defaults for missing or malformed values", () => {
  assert.deepEqual(normalizeEmailPreferences(null), emailPreferenceDefaults);
  assert.deepEqual(normalizeEmailPreferences([]), emailPreferenceDefaults);
  assert.deepEqual(getSavedEmailPreferences(null), {
    hasPreferences: false,
    preferences: emailPreferenceDefaults,
  });
});

test("email preference normalization merges saved booleans over defaults only", () => {
  assert.deepEqual(
    normalizeEmailPreferences({
      receiveOptionalEmails: false,
      priceAlerts: "no",
      savedTripReminders: false,
      routeWatchUpdates: true,
      extra: true,
    }),
    {
      ...emailPreferenceDefaults,
      receiveOptionalEmails: false,
      savedTripReminders: false,
      routeWatchUpdates: true,
    },
  );
});

test("saved email preferences are read from nested notificationPreferences.email", () => {
  assert.deepEqual(
    getSavedEmailPreferences({
      emailUpdates: false,
      priceAlertEmails: false,
      travelInspirationEmails: true,
      email: {
        receiveOptionalEmails: false,
        priceAlerts: false,
        productUpdates: false,
      },
    }),
    {
      hasPreferences: true,
      preferences: {
        ...emailPreferenceDefaults,
        receiveOptionalEmails: false,
        priceAlerts: false,
        productUpdates: false,
      },
    },
  );
});


test("email preferences PATCH schema rejects missing, non-boolean, and unknown keys", () => {
  assert.equal(emailPreferencesSchema.safeParse({ ...emailPreferenceDefaults, extra: true }).success, false);
  assert.equal(emailPreferencesSchema.safeParse({ ...emailPreferenceDefaults, priceAlerts: "true" }).success, false);

  const missingProductUpdates = { ...emailPreferenceDefaults } as Partial<typeof emailPreferenceDefaults>;
  delete missingProductUpdates.productUpdates;
  assert.equal(emailPreferencesSchema.safeParse(missingProductUpdates).success, false);
});

test("email notification merge preserves existing legacy notification keys", () => {
  assert.deepEqual(
    mergeEmailNotificationPreferences(
      {
        emailUpdates: false,
        priceAlertEmails: true,
        travelInspirationEmails: false,
        email: { receiveOptionalEmails: false },
      },
      emailPreferenceDefaults,
    ),
    {
      emailUpdates: false,
      priceAlertEmails: true,
      travelInspirationEmails: false,
      email: emailPreferenceDefaults,
    },
  );
});
