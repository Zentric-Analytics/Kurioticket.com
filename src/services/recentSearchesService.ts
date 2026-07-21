import { z } from "zod";
import type { InputJsonValue } from "@prisma/client/runtime/client";

import { getPrisma } from "@/lib/prisma";
import type { SearchType as PrismaSearchType } from "@/generated/prisma/enums";

const MAX_RECENT_SEARCHES = 5;

const recentSearchTypeToPrisma = {
  flight: "FLIGHT",
  hotel: "HOTEL",
} as const satisfies Record<"flight" | "hotel", PrismaSearchType>;

const prismaSearchTypeToPublic = {
  FLIGHT: "flight",
  HOTEL: "hotel",
} as const satisfies Record<PrismaSearchType, "flight" | "hotel">;

const nonNegativeIntegerSchema = z.number().int().min(0);
const positiveIntegerSchema = z.number().int().min(1);

const recentSearchBaseInputSchema = z.object({
  id: z.string().trim().min(1).max(1024),
  label: z.string().trim().min(1).max(256),
  subtitle: z.string().trim().min(1).max(512),
  href: z.string().trim().min(1).max(2048),
  image: z.string().trim().max(2048).optional().nullable(),
  imageAlt: z.string().trim().max(512).optional().nullable(),
});

const recentFlightParamsSchema = z.object({
  tripType: z.enum(["round-trip", "one-way"]),
  origin: z.string().trim().min(1).max(64),
  destination: z.string().trim().min(1).max(64),
  departureDate: z.string().trim().min(1).max(32),
  returnDate: z.string().trim().max(32).optional(),
  adults: positiveIntegerSchema,
  children: nonNegativeIntegerSchema,
  infants: nonNegativeIntegerSchema,
  travelers: positiveIntegerSchema,
  cabinClass: z.string().trim().min(1).max(64),
});

const recentHotelParamsSchema = z.object({
  destination: z.string().trim().min(1).max(256),
  checkIn: z.string().trim().min(1).max(32),
  checkOut: z.string().trim().min(1).max(32),
  guests: positiveIntegerSchema,
  rooms: positiveIntegerSchema,
});

const recentSearchResultPathByType = {
  flight: "/flights/results",
  hotel: "/hotels/results",
} as const;

function isInternalResultHrefForType(
  href: string,
  type: keyof typeof recentSearchResultPathByType,
) {
  if (!href.startsWith("/") || href.startsWith("//")) return false;

  const expectedPath = recentSearchResultPathByType[type];
  return (
    href === expectedPath ||
    href.startsWith(`${expectedPath}?`) ||
    href.startsWith(`${expectedPath}#`) ||
    href.startsWith(`${expectedPath}/`)
  );
}

export const recentSearchInputSchema = z
  .discriminatedUnion("type", [
    recentSearchBaseInputSchema.extend({
      type: z.literal("flight"),
      params: recentFlightParamsSchema,
    }),
    recentSearchBaseInputSchema.extend({
      type: z.literal("hotel"),
      params: recentHotelParamsSchema,
    }),
  ])
  .superRefine((input, context) => {
    if (isInternalResultHrefForType(input.href, input.type)) return;

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["href"],
      message: "Recent search href must be an internal results URL for its type.",
    });
  });

export const deleteRecentSearchInputSchema = z.object({
  id: z.string().trim().min(1).max(1024),
});

export type RecentSearchInput = z.infer<typeof recentSearchInputSchema>;

export type PublicRecentSearch = {
  id: string;
  type: "flight" | "hotel";
  createdAt: string;
  updatedAt: string;
  label: string;
  subtitle: string;
  image?: string;
  imageAlt?: string;
  href: string;
  params: unknown;
};

type RecentSearchRecord = {
  clientSearchId: string;
  type: PrismaSearchType;
  label: string;
  subtitle: string;
  href: string;
  params: unknown;
  image: string | null;
  imageAlt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const recentSearchSelect = {
  clientSearchId: true,
  type: true,
  label: true,
  subtitle: true,
  href: true,
  params: true,
  image: true,
  imageAlt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const toPrismaJson = (value: Record<string, unknown>): InputJsonValue =>
  value as InputJsonValue;

export async function listUserRecentSearches(
  userId: string,
): Promise<PublicRecentSearch[]> {
  const prisma = getPrisma();
  const searches = await prisma.recentSearch.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: MAX_RECENT_SEARCHES,
    select: recentSearchSelect,
  });

  return searches.map(serializeRecentSearch);
}

export async function upsertUserRecentSearch(
  userId: string,
  input: RecentSearchInput,
): Promise<PublicRecentSearch> {
  const prisma = getPrisma();
  const now = new Date();

  const search = await prisma.recentSearch.upsert({
    where: {
      userId_clientSearchId: {
        userId,
        clientSearchId: input.id,
      },
    },
    create: {
      userId,
      clientSearchId: input.id,
      type: recentSearchTypeToPrisma[input.type],
      label: input.label,
      subtitle: input.subtitle,
      href: input.href,
      params: toPrismaJson(input.params),
      image: input.image || null,
      imageAlt: input.imageAlt || null,
      updatedAt: now,
    },
    update: {
      type: recentSearchTypeToPrisma[input.type],
      label: input.label,
      subtitle: input.subtitle,
      href: input.href,
      params: toPrismaJson(input.params),
      image: input.image || null,
      imageAlt: input.imageAlt || null,
      updatedAt: now,
    },
    select: recentSearchSelect,
  });

  await trimUserRecentSearches(userId);

  return serializeRecentSearch(search);
}

export async function deleteUserRecentSearch(
  userId: string,
  clientSearchId: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.recentSearch.deleteMany({ where: { userId, clientSearchId } });
}

export async function clearUserRecentSearches(userId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.recentSearch.deleteMany({ where: { userId } });
}

async function trimUserRecentSearches(userId: string) {
  const prisma = getPrisma();
  const extras = await prisma.recentSearch.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    skip: MAX_RECENT_SEARCHES,
    select: { id: true },
  });

  if (!extras.length) return;

  await prisma.recentSearch.deleteMany({
    where: { id: { in: extras.map((search) => search.id) }, userId },
  });
}

function serializeRecentSearch(search: RecentSearchRecord): PublicRecentSearch {
  return {
    id: search.clientSearchId,
    type: prismaSearchTypeToPublic[search.type],
    createdAt: search.createdAt.toISOString(),
    updatedAt: search.updatedAt.toISOString(),
    label: search.label,
    subtitle: search.subtitle,
    image: search.image ?? undefined,
    imageAlt: search.imageAlt ?? undefined,
    href: search.href,
    params: search.params,
  };
}
