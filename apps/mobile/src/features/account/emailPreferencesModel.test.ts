import assert from "node:assert/strict";
import test from "node:test";
import { areAllEmailCategoriesEnabled, defaultEmailPreferences, toggleAllEmailCategories, toggleEmailCategory } from "./emailPreferencesModel";

const partial = { ...defaultEmailPreferences, receiveOptionalEmails: true, priceAlerts: true, travelInspiration: true };

test("master is checked only when every category is enabled", () => {
  assert.equal(areAllEmailCategoriesEnabled(defaultEmailPreferences), false);
  assert.equal(areAllEmailCategoriesEnabled(partial), false);
  assert.equal(areAllEmailCategoriesEnabled(toggleAllEmailCategories(partial, true)), true);
});

test("master toggle sets every category and the server master flag", () => {
  assert.deepEqual(toggleAllEmailCategories(partial, false), defaultEmailPreferences);
  assert.deepEqual(toggleAllEmailCategories(defaultEmailPreferences, true), { receiveOptionalEmails: true, priceAlerts: true, travelInspiration: true, productUpdates: true, dealsRecommendations: true });
});

test("category ON preserves peers and enables the server master flag", () => {
  assert.deepEqual(toggleEmailCategory(defaultEmailPreferences, "priceAlerts", true), { ...defaultEmailPreferences, receiveOptionalEmails: true, priceAlerts: true });
});

test("category OFF preserves peers and derives the server master flag", () => {
  assert.deepEqual(toggleEmailCategory(partial, "priceAlerts", false), { ...partial, priceAlerts: false, receiveOptionalEmails: true });
  assert.deepEqual(toggleEmailCategory({ ...defaultEmailPreferences, receiveOptionalEmails: true, priceAlerts: true }, "priceAlerts", false), defaultEmailPreferences);
});

test("default object is the complete canonical API payload", () => {
  assert.deepEqual(Object.keys(defaultEmailPreferences), ["receiveOptionalEmails", "priceAlerts", "travelInspiration", "productUpdates", "dealsRecommendations"]);
});
