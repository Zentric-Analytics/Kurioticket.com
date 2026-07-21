import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import {
  __emailPreferencesServiceTest,
  canSendOptionalEmail,
  emailPreferenceDefaults,
  getSavedEmailPreferences,
  type EmailPreferences,
  type OptionalEmailCategory,
} from "@/services/emailPreferencesService";

afterEach(() => {
  __emailPreferencesServiceTest.setPrismaClientForTesting(null);
});

function mockPreferences(notificationPreferences: unknown) {
  __emailPreferencesServiceTest.setPrismaClientForTesting({
    travelPreferences: {
      async findUnique() {
        return notificationPreferences === undefined ? null : { notificationPreferences };
      },
    },
  });
}

function preferences(overrides: Partial<EmailPreferences>) {
  return { ...emailPreferenceDefaults, ...overrides };
}

test("canSendOptionalEmail returns true when master and category are true", async () => {
  mockPreferences({ email: preferences({ receiveOptionalEmails: true, priceAlerts: true }) });

  assert.equal(await canSendOptionalEmail("user-1", "priceAlerts"), true);
});

test("canSendOptionalEmail returns false when master receiveOptionalEmails is false", async () => {
  mockPreferences({ email: preferences({ receiveOptionalEmails: false, priceAlerts: true }) });

  assert.equal(await canSendOptionalEmail("user-1", "priceAlerts"), false);
});

test("canSendOptionalEmail returns false when category toggle is false", async () => {
  mockPreferences({ email: preferences({ receiveOptionalEmails: true, savedTripReminders: false }) });

  assert.equal(await canSendOptionalEmail("user-1", "savedTripReminders"), false);
});

test("emailPreferenceDefaults has every email preference set to false", () => {
  assert.deepEqual(emailPreferenceDefaults, {
    receiveOptionalEmails: false,
    priceAlerts: false,
    savedTripReminders: false,
    routeWatchUpdates: false,
    travelInspiration: false,
    productUpdates: false,
    dealsRecommendations: false,
  });
});

test("missing preferences use all-false defaults and block new-user optional emails", async () => {
  mockPreferences(undefined);

  assert.deepEqual(getSavedEmailPreferences(null), {
    hasPreferences: false,
    preferences: emailPreferenceDefaults,
  });
  assert.equal(await canSendOptionalEmail("user-1", "priceAlerts"), false);
  assert.equal(await canSendOptionalEmail("user-1", "travelInspiration"), false);
});

test("malformed saved preferences normalize against all-false defaults", async () => {
  mockPreferences({ email: [] });

  assert.deepEqual(getSavedEmailPreferences({ email: [] }), {
    hasPreferences: false,
    preferences: emailPreferenceDefaults,
  });
  assert.equal(await canSendOptionalEmail("user-1", "priceAlerts"), false);
  assert.equal(await canSendOptionalEmail("user-1", "routeWatchUpdates"), false);
});

test("saved true and false values are preserved while partial missing fields default to false", () => {
  assert.deepEqual(
    getSavedEmailPreferences({
      email: {
        receiveOptionalEmails: true,
        priceAlerts: true,
        savedTripReminders: false,
      },
    }),
    {
      hasPreferences: true,
      preferences: {
        ...emailPreferenceDefaults,
        receiveOptionalEmails: true,
        priceAlerts: true,
        savedTripReminders: false,
      },
    },
  );
});

test("each optional category checks only its own toggle", async () => {
  const categories: OptionalEmailCategory[] = [
    "priceAlerts",
    "savedTripReminders",
    "routeWatchUpdates",
    "travelInspiration",
    "productUpdates",
    "dealsRecommendations",
  ];

  for (const enabledCategory of categories) {
    mockPreferences({
      email: {
        receiveOptionalEmails: true,
        priceAlerts: false,
        savedTripReminders: false,
        routeWatchUpdates: false,
        travelInspiration: false,
        productUpdates: false,
        dealsRecommendations: false,
        [enabledCategory]: true,
      },
    });

    for (const category of categories) {
      assert.equal(
        await canSendOptionalEmail("user-1", category),
        category === enabledCategory,
        `${enabledCategory} should not enable ${category}`,
      );
    }
  }
});
