export type EditablePreferenceKey =
  | "receiveOptionalEmails"
  | "priceAlerts"
  | "savedTripReminders"
  | "routeWatchUpdates"
  | "travelInspiration"
  | "productUpdates"
  | "dealsRecommendations";

export type EmailPreferences = Record<EditablePreferenceKey, boolean>;

export const defaultEmailPreferences: EmailPreferences = {
  receiveOptionalEmails: false,
  priceAlerts: false,
  savedTripReminders: false,
  routeWatchUpdates: false,
  travelInspiration: false,
  productUpdates: false,
  dealsRecommendations: false,
};

export const emailPreferenceKeys = Object.keys(
  defaultEmailPreferences,
) as EditablePreferenceKey[];

export const emailPreferenceCategoryKeys = emailPreferenceKeys.filter(
  (key) => key !== "receiveOptionalEmails",
) as Exclude<EditablePreferenceKey, "receiveOptionalEmails">[];

export function areEmailPreferencesEqual(
  first: EmailPreferences,
  second: EmailPreferences,
) {
  return emailPreferenceKeys.every((key) => first[key] === second[key]);
}

export function isMasterUnsubscribeChecked(preferences: EmailPreferences) {
  return !preferences.receiveOptionalEmails;
}

export function toReceiveOptionalEmailsFromMasterUnsubscribe(checked: boolean) {
  return !checked;
}

function withAllCategoriesDisabled(preferences: EmailPreferences) {
  return emailPreferenceCategoryKeys.reduce<EmailPreferences>(
    (nextPreferences, key) => ({ ...nextPreferences, [key]: false }),
    preferences,
  );
}

export function getNextEmailPreferencesForMasterUnsubscribe(
  preferences: EmailPreferences,
  checked: boolean,
): EmailPreferences {
  if (checked) {
    return withAllCategoriesDisabled({
      ...preferences,
      receiveOptionalEmails: toReceiveOptionalEmailsFromMasterUnsubscribe(true),
    });
  }

  return {
    ...preferences,
    receiveOptionalEmails: toReceiveOptionalEmailsFromMasterUnsubscribe(false),
  };
}

export function getNextEmailPreferencesForToggle(
  preferences: EmailPreferences,
  id: EditablePreferenceKey,
): EmailPreferences {
  if (id === "receiveOptionalEmails") {
    return getNextEmailPreferencesForMasterUnsubscribe(
      preferences,
      !isMasterUnsubscribeChecked(preferences),
    );
  }

  if (!preferences.receiveOptionalEmails) {
    return {
      ...withAllCategoriesDisabled(preferences),
      receiveOptionalEmails: true,
      [id]: true,
    };
  }

  return { ...preferences, [id]: !preferences[id] };
}
