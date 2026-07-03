import { z } from "zod";
import type { InputJsonValue } from "@prisma/client/runtime/client";

import { getPrisma } from "@/lib/prisma";
import type { SearchType as PrismaSearchType } from "@/generated/prisma/enums";

const MAX_RECENT_SEARCHES = 5;

const recentSearchTypeToPrisma = {
  flight: "FLIGHT",
} as const satisfies Record<"flight", PrismaSearchType>;

const prismaSearchTypeToPublic = {
  FLIGHT: "flight",
  HOTEL: "hotel",
} as const satisfies Record<PrismaSearchType, "flight" | "hotel">;

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const recentSearchInputSchema = z.object({
  id: z.string().trim().min(1).max(1024),
  type: z.literal("flight"),
  label: z.string().trim().min(1).max(256),
  subtitle: z.string().trim().min(1).max(512),
  href: z.string().trim().min(1).max(2048),
  params: jsonObjectSchema,
  image: z.string().trim().max(2048).optional().nullable(),
  imageAlt: z.string().trim().max(512).optional().nullable(),
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

export async function listUserRecentSearches(userId: string): Promise<PublicRecentSearch[]> {
  const prisma = getPrisma();
  const searches = await prisma.recentSearch.findMany({
    where: { userId, type: "FLIGHT" },
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

export async function deleteUserRecentSearch(userId: string, clientSearchId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.recentSearch.deleteMany({ where: { userId, clientSearchId } });
}

export async function clearUserRecentSearches(userId: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.recentSearch.deleteMany({ where: { userId, type: "FLIGHT" } });
}

async function trimUserRecentSearches(userId: string) {
  const prisma = getPrisma();
  const extras = await prisma.recentSearch.findMany({
    where: { userId, type: "FLIGHT" },
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
