import assert from "node:assert/strict";
import test from "node:test";

import {
  emailPreferenceCategoryKeys,
  getNextEmailPreferencesForMasterUnsubscribe,
  getNextEmailPreferencesForToggle,
  isMasterUnsubscribeChecked,
  type EditablePreferenceKey,
  type EmailPreferences,
} from "./EmailPreferencesState";

const basePreferences: EmailPreferences = {
  receiveOptionalEmails: true,
  priceAlerts: true,
  savedTripReminders: true,
  routeWatchUpdates: false,
  travelInspiration: true,
  productUpdates: false,
  dealsRecommendations: true,
};

function expectOnlyCategoryEnabled(
  preferences: EmailPreferences,
  enabledKey: Exclude<EditablePreferenceKey, "receiveOptionalEmails">,
) {
  assert.equal(preferences.receiveOptionalEmails, true);

  for (const key of emailPreferenceCategoryKeys) {
    assert.equal(preferences[key], key === enabledKey, key);
  }
}

test("master unsubscribe ON clears every category", () => {
  const next = getNextEmailPreferencesForMasterUnsubscribe(basePreferences, true);

  assert.equal(next.receiveOptionalEmails, false);
  assert.equal(isMasterUnsubscribeChecked(next), true);

  for (const key of emailPreferenceCategoryKeys) {
    assert.equal(next[key], false, key);
  }
});

test("cleared category values are included in the save payload", () => {
  const payload = getNextEmailPreferencesForMasterUnsubscribe(basePreferences, true);

  assert.deepEqual(payload, {
    receiveOptionalEmails: false,
    priceAlerts: false,
    savedTripReminders: false,
    routeWatchUpdates: false,
    travelInspiration: false,
    productUpdates: false,
    dealsRecommendations: false,
  });
});

test("master unsubscribe OFF enables only receiveOptionalEmails", () => {
  const previous = getNextEmailPreferencesForMasterUnsubscribe(basePreferences, true);
  const next = getNextEmailPreferencesForMasterUnsubscribe(previous, false);

  assert.equal(next.receiveOptionalEmails, true);

  for (const key of emailPreferenceCategoryKeys) {
    assert.equal(next[key], false, key);
  }
});

test("turning master unsubscribe OFF does not restore previous categories", () => {
  const unsubscribed = getNextEmailPreferencesForMasterUnsubscribe(basePreferences, true);
  const resubscribed = getNextEmailPreferencesForMasterUnsubscribe(
    unsubscribed,
    false,
  );

  assert.deepEqual(resubscribed, {
    receiveOptionalEmails: true,
    priceAlerts: false,
    savedTripReminders: false,
    routeWatchUpdates: false,
    travelInspiration: false,
    productUpdates: false,
    dealsRecommendations: false,
  });
});

test("clicking one category while master unsubscribe is ON enables only that category", () => {
  const previous = getNextEmailPreferencesForMasterUnsubscribe(basePreferences, true);
  const next = getNextEmailPreferencesForToggle(previous, "dealsRecommendations");

  expectOnlyCategoryEnabled(next, "dealsRecommendations");
});

test("clicking a different category from the unsubscribed state enables only that category", () => {
  const previous = getNextEmailPreferencesForMasterUnsubscribe(basePreferences, true);
  const next = getNextEmailPreferencesForToggle(previous, "priceAlerts");

  expectOnlyCategoryEnabled(next, "priceAlerts");
});

test("normal category toggling while receiveOptionalEmails is true preserves unrelated categories", () => {
  const next = getNextEmailPreferencesForToggle(basePreferences, "priceAlerts");

  assert.equal(next.receiveOptionalEmails, true);
  assert.equal(next.priceAlerts, false);
  assert.equal(next.savedTripReminders, basePreferences.savedTripReminders);
  assert.equal(next.routeWatchUpdates, basePreferences.routeWatchUpdates);
  assert.equal(next.travelInspiration, basePreferences.travelInspiration);
  assert.equal(next.productUpdates, basePreferences.productUpdates);
  assert.equal(next.dealsRecommendations, basePreferences.dealsRecommendations);
});

test("turning the final active category off does not automatically enable master unsubscribe", () => {
  const previous: EmailPreferences = {
    receiveOptionalEmails: true,
    priceAlerts: true,
    savedTripReminders: false,
    routeWatchUpdates: false,
    travelInspiration: false,
    productUpdates: false,
    dealsRecommendations: false,
  };

  const next = getNextEmailPreferencesForToggle(previous, "priceAlerts");

  assert.equal(next.receiveOptionalEmails, true);
  assert.equal(isMasterUnsubscribeChecked(next), false);

  for (const key of emailPreferenceCategoryKeys) {
    assert.equal(next[key], false, key);
  }
});

test("revert changes restores the last persisted complete state", () => {
  const persisted: EmailPreferences = {
    receiveOptionalEmails: true,
    priceAlerts: false,
    savedTripReminders: true,
    routeWatchUpdates: false,
    travelInspiration: false,
    productUpdates: true,
    dealsRecommendations: false,
  };
  const edited = getNextEmailPreferencesForMasterUnsubscribe(persisted, true);

  assert.notDeepEqual(edited, persisted);
  assert.deepEqual(persisted, {
    receiveOptionalEmails: true,
    priceAlerts: false,
    savedTripReminders: true,
    routeWatchUpdates: false,
    travelInspiration: false,
    productUpdates: true,
    dealsRecommendations: false,
  });
});

test("accessible switch behavior remains backed by boolean checked state", () => {
  const unsubscribed = getNextEmailPreferencesForMasterUnsubscribe(
    basePreferences,
    true,
  );
  const categoryClicked = getNextEmailPreferencesForToggle(
    unsubscribed,
    "travelInspiration",
  );

  assert.equal(isMasterUnsubscribeChecked(unsubscribed), true);
  assert.equal(unsubscribed.travelInspiration, false);
  assert.equal(isMasterUnsubscribeChecked(categoryClicked), false);
  assert.equal(categoryClicked.travelInspiration, true);
});
