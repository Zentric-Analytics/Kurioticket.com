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

export function getNextEmailPreferencesForToggle(
  preferences: EmailPreferences,
  id: EditablePreferenceKey,
): EmailPreferences {
  if (id === "receiveOptionalEmails") {
    return {
      ...preferences,
      receiveOptionalEmails: !preferences.receiveOptionalEmails,
    };
  }

  if (!preferences.receiveOptionalEmails) {
    return {
      ...preferences,
      receiveOptionalEmails: true,
      [id]: true,
    };
  }

  return { ...preferences, [id]: !preferences[id] };
}
