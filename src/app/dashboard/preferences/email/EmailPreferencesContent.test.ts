import assert from "node:assert/strict";
import test from "node:test";

import {
  getNextEmailPreferencesForToggle,
  isMasterUnsubscribeChecked,
  type EmailPreferences,
} from "./EmailPreferencesState";

const basePreferences: EmailPreferences = {
  receiveOptionalEmails: true,
  priceAlerts: false,
  savedTripReminders: true,
  routeWatchUpdates: false,
  travelInspiration: false,
  productUpdates: true,
  dealsRecommendations: false,
};

test("enabling an individual preference while optional emails are disabled reenables optional emails", () => {
  const previous: EmailPreferences = {
    ...basePreferences,
    receiveOptionalEmails: false,
    priceAlerts: false,
    routeWatchUpdates: false,
    travelInspiration: false,
  };

  const next = getNextEmailPreferencesForToggle(previous, "travelInspiration");

  assert.equal(next.receiveOptionalEmails, true);
  assert.equal(next.travelInspiration, true);
});

test("enabling an individual preference while optional emails are disabled preserves unrelated preferences", () => {
  const previous: EmailPreferences = {
    ...basePreferences,
    receiveOptionalEmails: false,
    priceAlerts: false,
    routeWatchUpdates: false,
    travelInspiration: false,
  };

  const next = getNextEmailPreferencesForToggle(previous, "travelInspiration");

  assert.equal(next.priceAlerts, false);
  assert.equal(next.routeWatchUpdates, false);
  assert.equal(next.savedTripReminders, true);
  assert.equal(next.productUpdates, true);
  assert.equal(next.dealsRecommendations, false);
});

test("enabling the master unsubscribe still blocks optional emails", () => {
  const next = getNextEmailPreferencesForToggle(basePreferences, "receiveOptionalEmails");

  assert.equal(next.receiveOptionalEmails, false);
  assert.equal(isMasterUnsubscribeChecked(next), true);
});

test("master unsubscribe does not erase individual category preferences", () => {
  const next = getNextEmailPreferencesForToggle(basePreferences, "receiveOptionalEmails");

  assert.equal(next.savedTripReminders, true);
  assert.equal(next.productUpdates, true);
  assert.equal(next.priceAlerts, false);
});

test("save payload includes reenabled optional emails and only the clicked category change", () => {
  const previous: EmailPreferences = {
    ...basePreferences,
    receiveOptionalEmails: false,
    priceAlerts: false,
    routeWatchUpdates: false,
    travelInspiration: false,
  };

  const payload = getNextEmailPreferencesForToggle(previous, "travelInspiration");

  assert.deepEqual(payload, {
    receiveOptionalEmails: true,
    priceAlerts: false,
    savedTripReminders: true,
    routeWatchUpdates: false,
    travelInspiration: true,
    productUpdates: true,
    dealsRecommendations: false,
  });
});

test("normal individual preference toggling remains unchanged when optional emails are enabled", () => {
  const next = getNextEmailPreferencesForToggle(basePreferences, "priceAlerts");

  assert.equal(next.receiveOptionalEmails, true);
  assert.equal(next.priceAlerts, true);
  assert.equal(next.savedTripReminders, basePreferences.savedTripReminders);
  assert.equal(next.productUpdates, basePreferences.productUpdates);
});
