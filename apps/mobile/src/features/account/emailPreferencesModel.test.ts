import assert from "node:assert/strict";
import test from "node:test";
import { defaultEmailPreferences, isDefaultEmailPreferences, isMasterUnsubscribeChecked, toggleEmailCategory, toggleMasterUnsubscribe } from "./emailPreferencesModel";

test("master unsubscribe is inverse and preserves category choices", () => {
  const selected = { ...defaultEmailPreferences, receiveOptionalEmails: true, travelInspiration: true, dealsRecommendations: true };
  const unsubscribed = toggleMasterUnsubscribe(selected, true);
  assert.equal(isMasterUnsubscribeChecked(unsubscribed), true);
  assert.deepEqual(unsubscribed, { ...selected, receiveOptionalEmails: false });
  assert.deepEqual(toggleMasterUnsubscribe(unsubscribed, false), selected);
});

test("category switches stay deterministic while globally unsubscribed", () => {
  const unsubscribed = { ...defaultEmailPreferences, travelInspiration: true, dealsRecommendations: true };
  assert.deepEqual(toggleEmailCategory(unsubscribed, "priceAlerts", true), {
    ...unsubscribed, receiveOptionalEmails: true, priceAlerts: true,
  });
  assert.deepEqual(toggleEmailCategory(unsubscribed, "travelInspiration", false), {
    ...unsubscribed, travelInspiration: false,
  });
});

test("default equality covers the complete preference payload", () => {
  assert.equal(isDefaultEmailPreferences(defaultEmailPreferences), true);
  assert.equal(isDefaultEmailPreferences({ ...defaultEmailPreferences, productUpdates: true }), false);
  assert.deepEqual(Object.keys(defaultEmailPreferences), ["receiveOptionalEmails", "priceAlerts", "travelInspiration", "productUpdates", "dealsRecommendations"]);
});
