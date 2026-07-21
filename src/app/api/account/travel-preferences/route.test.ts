import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeLegacyNotificationPreferences,
  travelPreferencesPatchSchema,
} from "@/app/api/account/travel-preferences/route";

const nestedEmailPreferences = {
  receiveOptionalEmails: false,
  priceAlerts: true,
  savedTripReminders: true,
  routeWatchUpdates: false,
  travelInspiration: false,
  productUpdates: true,
  dealsRecommendations: false,
};

test("travel preferences PATCH merge preserves existing nested notificationPreferences.email", () => {
  assert.deepEqual(
    mergeLegacyNotificationPreferences(
      {
        emailUpdates: true,
        priceAlertEmails: true,
        travelInspirationEmails: false,
        email: nestedEmailPreferences,
      },
      {
        emailUpdates: false,
        priceAlertEmails: true,
        travelInspirationEmails: true,
      },
    ),
    {
      emailUpdates: false,
      priceAlertEmails: true,
      travelInspirationEmails: true,
      email: nestedEmailPreferences,
    },
  );
});

test("travel preferences PATCH merge updates only legacy notification keys", () => {
  assert.deepEqual(
    mergeLegacyNotificationPreferences(
      {
        emailUpdates: true,
        priceAlertEmails: false,
        travelInspirationEmails: false,
        email: nestedEmailPreferences,
        futureNestedPreference: { enabled: true },
      },
      {
        emailUpdates: false,
        priceAlertEmails: true,
        travelInspirationEmails: true,
      },
    ),
    {
      emailUpdates: false,
      priceAlertEmails: true,
      travelInspirationEmails: true,
      email: nestedEmailPreferences,
      futureNestedPreference: { enabled: true },
    },
  );
});

test("travel preferences PATCH schema still rejects invalid legacy notification payloads", () => {
  assert.equal(
    travelPreferencesPatchSchema.safeParse({
      notificationPreferences: {
        emailUpdates: false,
        priceAlertEmails: true,
        travelInspirationEmails: true,
        email: nestedEmailPreferences,
      },
    }).success,
    false,
  );
  assert.equal(
    travelPreferencesPatchSchema.safeParse({
      notificationPreferences: {
        emailUpdates: "false",
        priceAlertEmails: true,
        travelInspirationEmails: true,
      },
    }).success,
    false,
  );
});

test("travel preferences PATCH schema accepts only active profile defaults", () => {
  assert.equal(
    travelPreferencesPatchSchema.safeParse({
      homeAirport: "IAH",
      preferredAirlines: ["Delta", "United"],
    }).success,
    true,
  );
});

test("travel preferences PATCH schema rejects removed preference fields", () => {
  for (const removedField of [
    "budgetStyle",
    "directVsCheaper",
    "comfortVsSavings",
    "travelFrequency",
    "travelPurpose",
  ]) {
    assert.equal(
      travelPreferencesPatchSchema.safeParse({
        homeAirport: "IAH",
        [removedField]: "balanced",
      }).success,
      false,
      `${removedField} should not be accepted`,
    );
  }
});
