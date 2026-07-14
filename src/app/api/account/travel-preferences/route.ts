import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const notificationDefaults = {
  emailUpdates: false,
  priceAlertEmails: false,
  travelInspirationEmails: false,
};

const notificationPreferencesSchema = z
  .object({
    emailUpdates: z.boolean().default(notificationDefaults.emailUpdates),
    priceAlertEmails: z
      .boolean()
      .default(notificationDefaults.priceAlertEmails),
    travelInspirationEmails: z
      .boolean()
      .default(notificationDefaults.travelInspirationEmails),
  })
  .strict();

const notificationPreferencesReadSchema = notificationPreferencesSchema
  .partial()
  .passthrough();

export const travelPreferencesPatchSchema = z
  .object({
    homeAirport: z.string().trim().max(80).optional(),
    preferredAirlines: z
      .array(z.string().trim().min(1).max(80))
      .max(10)
      .optional(),
    notificationPreferences: notificationPreferencesSchema.optional(),
  })
  .strict()
  .refine(
    (payload) => Object.keys(payload).length > 0,
    "At least one preference must be provided.",
  );

type TravelPreferencesPatch = z.infer<typeof travelPreferencesPatchSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNotifications(value: unknown) {
  const parsed = notificationPreferencesReadSchema.safeParse(value);

  return parsed.success
    ? { ...notificationDefaults, ...parsed.data }
    : notificationDefaults;
}

export function mergeLegacyNotificationPreferences(
  existingNotifications: unknown,
  legacyNotifications: NonNullable<
    TravelPreferencesPatch["notificationPreferences"]
  >,
) {
  return {
    ...(isRecord(existingNotifications) ? existingNotifications : {}),
    emailUpdates: legacyNotifications.emailUpdates,
    priceAlertEmails: legacyNotifications.priceAlertEmails,
    travelInspirationEmails: legacyNotifications.travelInspirationEmails,
  };
}

function serializePreferences(preferences: {
  homeAirport: string | null;
  preferredAirlines: string[];
  notificationPreferences: unknown;
}) {
  return {
    homeAirport: preferences.homeAirport ?? "",
    preferredAirlines: preferences.preferredAirlines,
    notificationPreferences: normalizeNotifications(
      preferences.notificationPreferences,
    ),
  };
}

function buildCreateData(userId: string, payload: TravelPreferencesPatch) {
  return {
    userId,
    homeAirport: payload.homeAirport ?? "",
    preferredAirlines: payload.preferredAirlines ?? [],
    notificationPreferences:
      payload.notificationPreferences ?? notificationDefaults,
  };
}

function buildUpdateData(
  payload: TravelPreferencesPatch,
  existingNotifications: unknown,
) {
  const data: Partial<ReturnType<typeof buildCreateData>> = {};

  if (payload.homeAirport !== undefined) data.homeAirport = payload.homeAirport;
  if (payload.preferredAirlines !== undefined)
    data.preferredAirlines = payload.preferredAirlines;
  if (payload.notificationPreferences !== undefined) {
    data.notificationPreferences = mergeLegacyNotificationPreferences(
      existingNotifications,
      payload.notificationPreferences,
    );
  }

  return data;
}

const travelPreferencesSelect = {
  homeAirport: true,
  preferredAirlines: true,
  notificationPreferences: true,
} as const;

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );

  try {
    const preferences = await getPrisma().travelPreferences.findUnique({
      where: { userId },
      select: travelPreferencesSelect,
    });

    return NextResponse.json({
      hasPreferences: Boolean(preferences),
      preferences: preferences
        ? serializePreferences(preferences)
        : serializePreferences({
            homeAirport: null,
            preferredAirlines: [],
            notificationPreferences: null,
          }),
    });
  } catch (error) {
    console.error("[account-travel-preferences:get]", error);
    return NextResponse.json(
      { error: "Unable to load travel preferences." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );

  try {
    const payload = travelPreferencesPatchSchema.parse(await request.json());
    const prisma = getPrisma();
    const existingPreferences =
      payload.notificationPreferences !== undefined
        ? await prisma.travelPreferences.findUnique({
            where: { userId },
            select: { notificationPreferences: true },
          })
        : null;
    const preferences = await prisma.travelPreferences.upsert({
      where: { userId },
      create: buildCreateData(userId, payload),
      update: buildUpdateData(
        payload,
        existingPreferences?.notificationPreferences,
      ),
      select: travelPreferencesSelect,
    });

    return NextResponse.json({
      preferences: serializePreferences(preferences),
    });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: "Please check your travel preferences and try again." },
        { status: 400 },
      );
    console.error("[account-travel-preferences:patch]", error);
    return NextResponse.json(
      { error: "Unable to save travel preferences." },
      { status: 500 },
    );
  }
}
