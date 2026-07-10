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

  for (const key of Object.keys(emailPreferenceDefaults) as Array<keyof EmailPreferences>) {
    if (typeof value[key] === "boolean") {
      normalized[key] = value[key];
    }
  }

  return normalized;
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
