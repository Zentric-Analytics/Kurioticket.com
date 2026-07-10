import { createHash } from "node:crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import type { InputJsonValue } from "@prisma/client/runtime/client";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import {
  emailPreferenceLabels,
  emailPreferenceDefaults,
  getEmailPreferenceChanges,
  getSavedEmailPreferences,
  mergeEmailNotificationPreferences,
  normalizeEmailPreferences,
  type EmailPreferences,
} from "@/services/emailPreferencesService";
import {
  emailPreferencesUpdatedEmail,
  sendTransactionalEmail,
} from "@/services/emailService";

export const runtime = "nodejs";

export {
  emailPreferenceDefaults,
  getSavedEmailPreferences,
  getEmailPreferenceChanges,
  mergeEmailNotificationPreferences,
  normalizeEmailPreferences,
};

const EMAIL_PREFERENCES_UPDATED_SUBJECT = "Your Kurioticket email preferences were updated";

type EmailPreferencesRoutePrisma = ReturnType<typeof getPrisma>;
type AuthenticatedUser = { id: string } | null;

let prismaForTesting: EmailPreferencesRoutePrisma | null = null;
let authenticatedUserForTesting: (() => Promise<AuthenticatedUser>) | null = null;
let sendTransactionalEmailForTesting: typeof sendTransactionalEmail | null = null;

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
  if (authenticatedUserForTesting) return (await authenticatedUserForTesting())?.id || null;
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

function getRoutePrisma() {
  return prismaForTesting ?? getPrisma();
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new ZodError([]);
  }
}

function getAppBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function buildEmailPreferencesUrl() {
  return new URL("/dashboard/preferences/email", getAppBaseUrl()).toString();
}

function fingerprintEmailPreferences(preferences: EmailPreferences) {
  return JSON.stringify(
    Object.fromEntries(
      Object.keys(emailPreferenceDefaults).map((key) => [
        key,
        preferences[key as keyof EmailPreferences],
      ]),
    ),
  );
}

function buildEmailPreferencesUpdatedIdempotencyKey(input: {
  userId: string;
  previous: EmailPreferences;
  next: EmailPreferences;
  existingUpdatedAt?: Date | string | null;
}) {
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        userId: input.userId,
        existingUpdatedAt: input.existingUpdatedAt
          ? new Date(input.existingUpdatedAt).toISOString()
          : "new",
        previous: fingerprintEmailPreferences(input.previous),
        next: fingerprintEmailPreferences(input.next),
      }),
    )
    .digest("hex");

  return `email-preferences-updated:${fingerprint}`;
}

async function sendEmailPreferencesUpdatedConfirmation(input: {
  userId: string;
  user: { email?: string | null; name?: string | null };
  previous: EmailPreferences;
  next: EmailPreferences;
  existingUpdatedAt?: Date | string | null;
  changedAt: Date;
}) {
  const email = input.user.email?.trim();
  if (!email) {
    console.warn("[account-email-preferences:confirmation-email] missing user email", {
      userId: input.userId,
    });
    return;
  }

  const changes = getEmailPreferenceChanges(input.previous, input.next);
  if (!changes.length) return;

  const enabledPreferenceKeys = changes
    .filter((change) => change.nextValue)
    .map((change) => change.key);
  const disabledPreferenceKeys = changes
    .filter((change) => !change.nextValue)
    .map((change) => change.key);
  const sendEmail = sendTransactionalEmailForTesting ?? sendTransactionalEmail;

  await sendEmail({
    to: email,
    subject: EMAIL_PREFERENCES_UPDATED_SUBJECT,
    html: emailPreferencesUpdatedEmail({
      name: input.user.name,
      enabledLabels: enabledPreferenceKeys.map((key) => emailPreferenceLabels[key]),
      disabledLabels: disabledPreferenceKeys.map((key) => emailPreferenceLabels[key]),
      changedAt: input.changedAt,
      preferencesUrl: buildEmailPreferencesUrl(),
      masterDisabled: input.next.receiveOptionalEmails === false,
    }),
    template: "email_preferences_updated",
    idempotencyKey: buildEmailPreferencesUpdatedIdempotencyKey({
      userId: input.userId,
      previous: input.previous,
      next: input.next,
      existingUpdatedAt: input.existingUpdatedAt,
    }),
    metadata: {
      userId: input.userId,
      changedPreferenceKeys: changes.map((change) => change.key),
      enabledPreferenceKeys,
      disabledPreferenceKeys,
    },
  });
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const preferences = await getRoutePrisma().travelPreferences.findUnique({
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
    const prisma = getRoutePrisma();
    const existingPreferences = await prisma.travelPreferences.findUnique({
      where: { userId },
      select: { notificationPreferences: true, updatedAt: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    const previousPreferences = getSavedEmailPreferences(
      existingPreferences?.notificationPreferences,
    ).preferences;
    const changes = getEmailPreferenceChanges(previousPreferences, payload);
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

    if (changes.length && user) {
      try {
        await sendEmailPreferencesUpdatedConfirmation({
          userId,
          user,
          previous: previousPreferences,
          next: payload,
          existingUpdatedAt: existingPreferences?.updatedAt,
          changedAt: new Date(),
        });
      } catch (error) {
        console.error("[account-email-preferences:confirmation-email]", error);
      }
    }

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

export const __emailPreferencesRouteTest = {
  setPrismaForTesting(prisma: EmailPreferencesRoutePrisma | null) {
    prismaForTesting = prisma;
  },
  setAuthenticatedUserForTesting(getUser: (() => Promise<AuthenticatedUser>) | null) {
    authenticatedUserForTesting = getUser;
  },
  setSendTransactionalEmailForTesting(sendEmail: typeof sendTransactionalEmail | null) {
    sendTransactionalEmailForTesting = sendEmail;
  },
  buildEmailPreferencesUpdatedIdempotencyKey,
};
