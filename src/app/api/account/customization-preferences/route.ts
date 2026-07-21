import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { authOptions } from "@/lib/auth";
import { isSupportedDisplayCurrency } from "@/lib/currency/exchangeRates";
import { publicLocaleOptions } from "@/lib/i18n";
import { isAvailableLanguage, normalizeLanguage } from "@/lib/language";
import { getPrisma } from "@/lib/prisma";
import {
  supportedCurrencies,
  supportedRegions,
} from "@/lib/region/supportedRegions";

export const runtime = "nodejs";

export const customizationPreferenceDefaults = {
  locale: "en-us",
  currency: "USD",
  region: "US",
  personalizeRecommendations: true,
};

type CustomizationPreferences = typeof customizationPreferenceDefaults;
type PrismaLike = {
  userCustomizationPreferences: {
    findUnique: <T>(args: T) => Promise<CustomizationPreferences | null>;
    upsert: <T>(args: T) => Promise<CustomizationPreferences>;
  };
};

const supportedPublicLocales = new Set(
  publicLocaleOptions.map((option) => option.code),
);
const supportedDisplayCurrencies = new Set(
  supportedCurrencies.map((option) => option.code),
);
const supportedRegionCodes = new Set(
  supportedRegions.map((option) => option.code),
);

function normalizeLocalePreference(value: string) {
  const trimmed = value.trim();
  const normalized = normalizeLanguage(trimmed);

  if (
    !isAvailableLanguage(trimmed) ||
    !supportedPublicLocales.has(normalized)
  ) {
    throw new Error("Unsupported locale");
  }

  return normalized;
}

function normalizeCurrencyPreference(value: string) {
  const normalized = value.trim().toUpperCase();

  if (
    !supportedDisplayCurrencies.has(normalized) ||
    !isSupportedDisplayCurrency(normalized)
  ) {
    throw new Error("Unsupported currency");
  }

  return normalized;
}

function normalizeRegionPreference(value: string) {
  const normalized = value.trim().toUpperCase();

  if (!supportedRegionCodes.has(normalized)) {
    throw new Error("Unsupported region");
  }

  return normalized;
}

const customizationPreferencesPatchSchema = z
  .object({
    locale: z
      .string()
      .trim()
      .min(1)
      .transform(normalizeLocalePreference)
      .optional(),
    currency: z
      .string()
      .trim()
      .min(1)
      .transform(normalizeCurrencyPreference)
      .optional(),
    region: z
      .string()
      .trim()
      .min(1)
      .transform(normalizeRegionPreference)
      .optional(),
    personalizeRecommendations: z.boolean().optional(),
  })
  .strict()
  .refine(
    (payload) => Object.keys(payload).length > 0,
    "At least one preference must be provided.",
  );

export function serializeCustomizationPreferences(
  preferences: Partial<CustomizationPreferences> | null | undefined,
): CustomizationPreferences {
  return {
    locale: normalizeLocalePreference(
      preferences?.locale ?? customizationPreferenceDefaults.locale,
    ),
    currency: normalizeCurrencyPreference(
      preferences?.currency ?? customizationPreferenceDefaults.currency,
    ),
    region: normalizeRegionPreference(
      preferences?.region ?? customizationPreferenceDefaults.region,
    ),
    personalizeRecommendations:
      preferences?.personalizeRecommendations ??
      customizationPreferenceDefaults.personalizeRecommendations,
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

export async function handleCustomizationPreferencesGet(
  userId: string | null,
  prisma: PrismaLike,
) {
  if (!userId)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );

  try {
    const preferences = await prisma.userCustomizationPreferences.findUnique({
      where: { userId },
      select: {
        locale: true,
        currency: true,
        region: true,
        personalizeRecommendations: true,
      },
    });

    return NextResponse.json({
      hasPreferences: Boolean(preferences),
      preferences: serializeCustomizationPreferences(preferences),
    });
  } catch (error) {
    console.error("[account-customization-preferences:get]", error);
    return NextResponse.json(
      { error: "Unable to load customization preferences." },
      { status: 500 },
    );
  }
}

export async function handleCustomizationPreferencesPatch(
  userId: string | null,
  prisma: PrismaLike,
  rawPayload: unknown,
) {
  if (!userId)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );

  try {
    const payload = customizationPreferencesPatchSchema.parse(rawPayload);
    const createData = {
      userId,
      ...customizationPreferenceDefaults,
      ...payload,
    };

    const preferences = await prisma.userCustomizationPreferences.upsert({
      where: { userId },
      create: createData,
      update: payload,
      select: {
        locale: true,
        currency: true,
        region: true,
        personalizeRecommendations: true,
      },
    });

    return NextResponse.json({
      preferences: serializeCustomizationPreferences(preferences),
    });
  } catch (error) {
    if (
      error instanceof ZodError ||
      (error instanceof Error && error.message.startsWith("Unsupported "))
    ) {
      return NextResponse.json(
        { error: "Please check your customization preferences and try again." },
        { status: 400 },
      );
    }

    console.error("[account-customization-preferences:patch]", error);
    return NextResponse.json(
      { error: "Unable to save customization preferences." },
      { status: 500 },
    );
  }
}

export async function GET() {
  return handleCustomizationPreferencesGet(
    await getAuthenticatedUserId(),
    getPrisma() as unknown as PrismaLike,
  );
}

export async function PATCH(request: Request) {
  return handleCustomizationPreferencesPatch(
    await getAuthenticatedUserId(),
    getPrisma() as unknown as PrismaLike,
    await readJson(request),
  );
}
