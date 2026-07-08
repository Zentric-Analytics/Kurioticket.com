import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const emailPreferenceDefaults = {
  receiveOptionalEmails: true,
  priceAlerts: true,
  savedTripReminders: true,
  routeWatchUpdates: false,
  travelInspiration: false,
  productUpdates: true,
  dealsRecommendations: false,
};

export const emailPreferencesSchema = z
  .object({
    receiveOptionalEmails: z.boolean(),
    priceAlerts: z.boolean(),
    savedTripReminders: z.boolean(),
    routeWatchUpdates: z.boolean(),
    travelInspiration: z.boolean(),
    productUpdates: z.boolean(),
    dealsRecommendations: z.boolean(),
  })
  .strict();

type EmailPreferences = z.infer<typeof emailPreferencesSchema>;
type NotificationPreferences = Record<string, unknown>;

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

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ZodError([]);
  }
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const preferences = await getPrisma().travelPreferences.findUnique({
      where: { userId },
      select: { notificationPreferences: true },
    });

    return NextResponse.json(getSavedEmailPreferences(preferences?.notificationPreferences));
  } catch (error) {
    console.error("[account-email-preferences:get]", error);
    return NextResponse.json({ error: "Unable to load email preferences." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const payload = emailPreferencesSchema.parse(await readJson(request));
    const prisma = getPrisma();
    const existingPreferences = await prisma.travelPreferences.findUnique({
      where: { userId },
      select: { notificationPreferences: true },
    });
    const notificationPreferences = mergeEmailNotificationPreferences(
      existingPreferences?.notificationPreferences,
      payload,
    ) as InputJsonValue;

    const preferences = await prisma.travelPreferences.upsert({
      where: { userId },
      create: {
        userId,
        notificationPreferences,
      },
      update: {
        notificationPreferences,
      },
      select: { notificationPreferences: true },
    });

    return NextResponse.json({
      preferences: getSavedEmailPreferences(preferences.notificationPreferences).preferences,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Please check your email preferences and try again." }, { status: 400 });
    }

    console.error("[account-email-preferences:patch]", error);
    return NextResponse.json({ error: "Unable to save email preferences." }, { status: 500 });
  }
}
