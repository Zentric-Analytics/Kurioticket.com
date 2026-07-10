import { getPrisma } from "@/lib/prisma";

export const emailPreferenceDefaults = {
  receiveOptionalEmails: true,
  priceAlerts: true,
  savedTripReminders: true,
  routeWatchUpdates: false,
  travelInspiration: false,
  productUpdates: true,
  dealsRecommendations: false,
};

export type EmailPreferences = typeof emailPreferenceDefaults;

export type EmailPreferenceChange = {
  key: keyof EmailPreferences;
  previousValue: boolean;
  nextValue: boolean;
};

export const emailPreferenceKeys = Object.keys(emailPreferenceDefaults) as Array<keyof EmailPreferences>;

export const emailPreferenceLabels = {
  receiveOptionalEmails: "Optional emails",
  priceAlerts: "Price alerts",
  savedTripReminders: "Saved trip reminders",
  routeWatchUpdates: "Route watch updates",
  travelInspiration: "Travel inspiration",
  productUpdates: "Product updates",
  dealsRecommendations: "Deals and recommendations",
} as const satisfies Record<keyof EmailPreferences, string>;

export type OptionalEmailCategory =
  | "priceAlerts"
  | "savedTripReminders"
  | "routeWatchUpdates"
  | "travelInspiration"
  | "productUpdates"
  | "dealsRecommendations";

type NotificationPreferences = Record<string, unknown>;

type EmailPreferencesPrismaClient = {
  travelPreferences: {
    findUnique(args: {
      where: { userId: string };
      select: { notificationPreferences: true };
    }): Promise<{ notificationPreferences: unknown } | null>;
  };
};

let prismaClientForTesting: EmailPreferencesPrismaClient | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeEmailPreferences(value: unknown): EmailPreferences {
  if (!isRecord(value)) return emailPreferenceDefaults;

  const normalized = { ...emailPreferenceDefaults };

  for (const key of emailPreferenceKeys) {
    if (typeof value[key] === "boolean") {
      normalized[key] = value[key];
    }
  }

  return normalized;
}

export function getEmailPreferenceChanges(
  previous: EmailPreferences,
  next: EmailPreferences,
): EmailPreferenceChange[] {
  return emailPreferenceKeys.flatMap((key) =>
    previous[key] === next[key]
      ? []
      : [
          {
            key,
            previousValue: previous[key],
            nextValue: next[key],
          },
        ],
  );
}

function normalizeNotificationPreferences(value: unknown): NotificationPreferences {
  return isRecord(value) ? { ...value } : {};
}

export function mergeEmailNotificationPreferences(value: unknown, email: EmailPreferences): NotificationPreferences {
  return {
    ...normalizeNotificationPreferences(value),
    email,
  };
}

export function getSavedEmailPreferences(value: unknown) {
  const notificationPreferences = normalizeNotificationPreferences(value);
  const hasPreferences = isRecord(notificationPreferences.email);

  return {
    hasPreferences,
    preferences: hasPreferences
      ? normalizeEmailPreferences(notificationPreferences.email)
      : emailPreferenceDefaults,
  };
}

export async function getEmailPreferencesForUser(userId: string) {
  const preferences = await getEmailPreferencesPrisma().travelPreferences.findUnique({
    where: { userId },
    select: { notificationPreferences: true },
  });

  return getSavedEmailPreferences(preferences?.notificationPreferences);
}

export async function canSendOptionalEmail(userId: string, category: OptionalEmailCategory) {
  const { preferences } = await getEmailPreferencesForUser(userId);
  return preferences.receiveOptionalEmails === true && preferences[category] === true;
}

function getEmailPreferencesPrisma(): EmailPreferencesPrismaClient {
  return prismaClientForTesting ?? (getPrisma() as unknown as EmailPreferencesPrismaClient);
}

export const __emailPreferencesServiceTest = {
  setPrismaClientForTesting(prisma: EmailPreferencesPrismaClient | null) {
    prismaClientForTesting = prisma;
  },
};
