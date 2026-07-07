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

const budgetStyleSchema = z.enum(["", "budget", "balanced", "premium"]);
const directVsCheaperSchema = z.enum(["", "direct", "cheaper", "balanced"]);
const travelFrequencySchema = z.enum(["", "rarely", "monthly", "frequent"]);
const comfortVsSavingsSchema = z.enum(["", "savings", "balanced", "comfort"]);
const travelPurposeSchema = z.enum(["", "leisure", "business", "family", "mixed"]);

const notificationPreferencesSchema = z
  .object({
    emailUpdates: z.boolean().default(notificationDefaults.emailUpdates),
    priceAlertEmails: z.boolean().default(notificationDefaults.priceAlertEmails),
    travelInspirationEmails: z.boolean().default(notificationDefaults.travelInspirationEmails),
  })
  .strict();

const notificationPreferencesReadSchema = notificationPreferencesSchema.partial().passthrough();

const travelPreferencesPatchSchema = z
  .object({
    homeAirport: z.string().trim().max(80).optional(),
    preferredAirlines: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
    budgetStyle: budgetStyleSchema.optional(),
    directVsCheaper: directVsCheaperSchema.optional(),
    travelFrequency: travelFrequencySchema.optional(),
    comfortVsSavings: comfortVsSavingsSchema.optional(),
    travelPurpose: travelPurposeSchema.optional(),
    notificationPreferences: notificationPreferencesSchema.optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, "At least one preference must be provided.");

type TravelPreferencesPatch = z.infer<typeof travelPreferencesPatchSchema>;

function normalizeNotifications(value: unknown) {
  const parsed = notificationPreferencesReadSchema.safeParse(value);

  return parsed.success ? { ...notificationDefaults, ...parsed.data } : notificationDefaults;
}

function serializePreferences(preferences: {
  homeAirport: string | null;
  preferredAirlines: string[];
  budgetStyle: string | null;
  directVsCheaper: string | null;
  travelFrequency: string | null;
  comfortVsSavings: string | null;
  travelPurpose: string | null;
  notificationPreferences: unknown;
}) {
  return {
    homeAirport: preferences.homeAirport ?? "",
    preferredAirlines: preferences.preferredAirlines,
    budgetStyle: preferences.budgetStyle ?? "",
    directVsCheaper: preferences.directVsCheaper ?? "",
    travelFrequency: preferences.travelFrequency ?? "",
    comfortVsSavings: preferences.comfortVsSavings ?? "",
    travelPurpose: preferences.travelPurpose ?? "",
    notificationPreferences: normalizeNotifications(preferences.notificationPreferences),
  };
}

function buildCreateData(userId: string, payload: TravelPreferencesPatch) {
  return {
    userId,
    homeAirport: payload.homeAirport ?? "",
    preferredAirlines: payload.preferredAirlines ?? [],
    budgetStyle: payload.budgetStyle ?? "",
    directVsCheaper: payload.directVsCheaper ?? "",
    travelFrequency: payload.travelFrequency ?? "",
    comfortVsSavings: payload.comfortVsSavings ?? "",
    travelPurpose: payload.travelPurpose ?? "",
    notificationPreferences: payload.notificationPreferences ?? notificationDefaults,
  };
}

function buildUpdateData(payload: TravelPreferencesPatch) {
  const data: Partial<ReturnType<typeof buildCreateData>> = {};

  if (payload.homeAirport !== undefined) data.homeAirport = payload.homeAirport;
  if (payload.preferredAirlines !== undefined) data.preferredAirlines = payload.preferredAirlines;
  if (payload.budgetStyle !== undefined) data.budgetStyle = payload.budgetStyle;
  if (payload.directVsCheaper !== undefined) data.directVsCheaper = payload.directVsCheaper;
  if (payload.travelFrequency !== undefined) data.travelFrequency = payload.travelFrequency;
  if (payload.comfortVsSavings !== undefined) data.comfortVsSavings = payload.comfortVsSavings;
  if (payload.travelPurpose !== undefined) data.travelPurpose = payload.travelPurpose;
  if (payload.notificationPreferences !== undefined) data.notificationPreferences = payload.notificationPreferences;

  return data;
}

const travelPreferencesSelect = {
  homeAirport: true,
  preferredAirlines: true,
  budgetStyle: true,
  directVsCheaper: true,
  travelFrequency: true,
  comfortVsSavings: true,
  travelPurpose: true,
  notificationPreferences: true,
} as const;

async function getAuthenticatedUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const preferences = await getPrisma().travelPreferences.findUnique({
      where: { userId },
      select: travelPreferencesSelect,
    });

    return NextResponse.json({
      hasPreferences: Boolean(preferences),
      preferences: preferences ? serializePreferences(preferences) : serializePreferences({ homeAirport: null, preferredAirlines: [], budgetStyle: null, directVsCheaper: null, travelFrequency: null, comfortVsSavings: null, travelPurpose: null, notificationPreferences: null }),
    });
  } catch (error) {
    console.error("[account-travel-preferences:get]", error);
    return NextResponse.json({ error: "Unable to load travel preferences." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  try {
    const payload = travelPreferencesPatchSchema.parse(await request.json());
    const preferences = await getPrisma().travelPreferences.upsert({
      where: { userId },
      create: buildCreateData(userId, payload),
      update: buildUpdateData(payload),
      select: travelPreferencesSelect,
    });

    return NextResponse.json({ preferences: serializePreferences(preferences) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Please check your travel preferences and try again." }, { status: 400 });
    console.error("[account-travel-preferences:patch]", error);
    return NextResponse.json({ error: "Unable to save travel preferences." }, { status: 500 });
  }
}
