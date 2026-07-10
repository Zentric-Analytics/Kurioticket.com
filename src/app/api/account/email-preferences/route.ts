import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  emailPreferenceDefaults,
  getSavedEmailPreferences,
  mergeEmailNotificationPreferences,
  normalizeEmailPreferences,
} from "@/services/emailPreferencesService";

export const runtime = "nodejs";

export {
  emailPreferenceDefaults,
  getSavedEmailPreferences,
  mergeEmailNotificationPreferences,
  normalizeEmailPreferences,
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
