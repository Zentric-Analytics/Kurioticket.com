import type { EmailPreferences } from "../../api/travelApi";

export type EmailCategoryKey = Exclude<keyof EmailPreferences, "receiveOptionalEmails">;

export const defaultEmailPreferences: EmailPreferences = {
  receiveOptionalEmails: false,
  priceAlerts: false,
  travelInspiration: false,
  productUpdates: false,
  dealsRecommendations: false,
};

export function isMasterUnsubscribeChecked(value: EmailPreferences) {
  return !value.receiveOptionalEmails;
}

export function toggleMasterUnsubscribe(value: EmailPreferences, checked: boolean): EmailPreferences {
  return { ...value, receiveOptionalEmails: !checked };
}

export function toggleEmailCategory(value: EmailPreferences, key: EmailCategoryKey, checked: boolean): EmailPreferences {
  return {
    ...value,
    [key]: checked,
    receiveOptionalEmails: checked ? true : value.receiveOptionalEmails,
  };
}

export function isDefaultEmailPreferences(value: EmailPreferences) {
  return Object.keys(defaultEmailPreferences).every(
    key => value[key as keyof EmailPreferences] === defaultEmailPreferences[key as keyof EmailPreferences],
  );
}
