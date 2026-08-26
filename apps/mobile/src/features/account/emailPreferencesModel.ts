import type { EmailPreferences } from "../../api/travelApi";

export type EmailCategoryKey = Exclude<keyof EmailPreferences, "receiveOptionalEmails">;

export const defaultEmailPreferences: EmailPreferences = {
  receiveOptionalEmails: false,
  priceAlerts: false,
  travelInspiration: false,
  productUpdates: false,
  dealsRecommendations: false,
};

export function areAllEmailCategoriesEnabled(value: EmailPreferences) {
  return value.priceAlerts && value.travelInspiration && value.productUpdates && value.dealsRecommendations;
}

export function toggleAllEmailCategories(value: EmailPreferences, checked: boolean): EmailPreferences {
  return {
    ...value,
    receiveOptionalEmails: checked,
    priceAlerts: checked,
    travelInspiration: checked,
    productUpdates: checked,
    dealsRecommendations: checked,
  };
}

export function toggleEmailCategory(value: EmailPreferences, key: EmailCategoryKey, checked: boolean): EmailPreferences {
  const next = {
    ...value,
    [key]: checked,
  };
  return {
    ...next,
    receiveOptionalEmails: next.priceAlerts || next.travelInspiration || next.productUpdates || next.dealsRecommendations,
  };
}
