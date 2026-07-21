import { z } from "zod";

import { getPrisma } from "@/lib/prisma";
import { parseSavedFlightSearchQuery } from "@/lib/saved-searches";
import type { RouteWatchStatus } from "@/generated/prisma/enums";

type SavedSearchRecord = {
  id: string;
  userId: string;
  type: "FLIGHT" | "HOTEL";
  origin: string | null;
  destination: string | null;
  query: unknown;
};

type RouteWatchRecord = {
  id: string;
  savedSearchId: string;
  status: RouteWatchStatus;
  lastCheckedAt: Date | null;
  nextCheckAt: Date | null;
};

type RouteWatchPrismaClient = {
  savedSearch: {
    findFirst(args: unknown): Promise<SavedSearchRecord | null>;
    delete(args: unknown): Promise<unknown>;
  };
  routeWatchState: {
    findUnique(args: unknown): Promise<RouteWatchRecord | null>;
    findMany(args: unknown): Promise<RouteWatchRecord[]>;
    create(args: unknown): Promise<RouteWatchRecord>;
    update(args: unknown): Promise<RouteWatchRecord>;
    deleteMany(args: unknown): Promise<{ count: number }>;
  };
};

let prismaClientForTesting: RouteWatchPrismaClient | null = null;

export type RouteWatchSummary = {
  id: string;
  savedSearchId: string;
  status: RouteWatchStatus;
  isWatching: boolean;
  lastCheckedAt: string | null;
  nextCheckAt: string | null;
};

export class RouteWatchNotFoundError extends Error {
  constructor() {
    super("Saved trip was not found.");
    this.name = "RouteWatchNotFoundError";
  }
}

export class RouteWatchValidationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "RouteWatchValidationError";
    this.code = code;
  }
}

const toggleSchema = z.object({ enabled: z.boolean() }).strict();
export const routeWatchToggleSchema = toggleSchema;

const selectSavedSearch = {
  id: true,
  userId: true,
  type: true,
  origin: true,
  destination: true,
  query: true,
} as const;

const selectRouteWatch = {
  id: true,
  savedSearchId: true,
  status: true,
  lastCheckedAt: true,
  nextCheckAt: true,
} as const;

export async function getRouteWatchForSavedSearch(userId: string, savedSearchId: string) {
  await getOwnedSavedSearch(userId, savedSearchId);
  const watch = await getRouteWatchPrisma().routeWatchState.findUnique({ where: { savedSearchId }, select: selectRouteWatch });
  return watch ? serializeRouteWatch(watch) : null;
}

export async function listRouteWatchSummariesForSavedSearches(userId: string, savedSearchIds: string[]) {
  if (savedSearchIds.length === 0) return new Map<string, RouteWatchSummary>();
  const watches = await getRouteWatchPrisma().routeWatchState.findMany({
    where: { userId, savedSearchId: { in: savedSearchIds } },
    select: selectRouteWatch,
  });
  return new Map(watches.map((watch) => [watch.savedSearchId, serializeRouteWatch(watch)]));
}

export async function enableRouteWatch(userId: string, savedSearchId: string) {
  const search = await getOwnedSavedSearch(userId, savedSearchId);
  validateSavedSearchForRouteWatch(search);
  const existing = await getRouteWatchPrisma().routeWatchState.findUnique({ where: { savedSearchId }, select: selectRouteWatch });
  if (existing?.status === "ACTIVE") return { watch: serializeRouteWatch(existing), created: false };
  if (existing) {
    const watch = await getRouteWatchPrisma().routeWatchState.update({
      where: { savedSearchId },
      data: { status: "ACTIVE", nextCheckAt: null },
      select: selectRouteWatch,
    });
    return { watch: serializeRouteWatch(watch), created: false };
  }
  const watch = await getRouteWatchPrisma().routeWatchState.create({
    data: { userId, savedSearchId, status: "ACTIVE", nextCheckAt: null },
    select: selectRouteWatch,
  });
  return { watch: serializeRouteWatch(watch), created: true };
}

export async function pauseRouteWatch(userId: string, savedSearchId: string) {
  await getOwnedSavedSearch(userId, savedSearchId);
  const existing = await getRouteWatchPrisma().routeWatchState.findUnique({ where: { savedSearchId }, select: selectRouteWatch });
  if (!existing) {
    const watch = await getRouteWatchPrisma().routeWatchState.create({
      data: { userId, savedSearchId, status: "PAUSED", nextCheckAt: null },
      select: selectRouteWatch,
    });
    return serializeRouteWatch(watch);
  }
  if (existing.status === "PAUSED" && existing.nextCheckAt === null) return serializeRouteWatch(existing);
  const watch = await getRouteWatchPrisma().routeWatchState.update({
    where: { savedSearchId },
    data: { status: "PAUSED", nextCheckAt: null },
    select: selectRouteWatch,
  });
  return serializeRouteWatch(watch);
}

export function validateSavedSearchForRouteWatch(search: SavedSearchRecord) {
  if (search.type !== "FLIGHT") throw new RouteWatchValidationError("INVALID_SEARCH_TYPE", "Only flight trips can be watched.");
  const parsed = parseSavedFlightSearchQuery(search.query);
  if (!parsed) throw new RouteWatchValidationError("MALFORMED_FLIGHT_QUERY", "This trip can’t be watched. Run the search again and save it.");
  if (!parsed.origin || !parsed.destination || !search.origin || !search.destination) {
    throw new RouteWatchValidationError("MISSING_ROUTE", "This trip can’t be watched. Run the search again and save it.");
  }
  const departure = new Date(`${parsed.departureDate}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (!Number.isFinite(departure.getTime()) || departure < today) {
    throw new RouteWatchValidationError("EXPIRED_DEPARTURE", "This departure date has passed.");
  }
  return parsed;
}

async function getOwnedSavedSearch(userId: string, savedSearchId: string) {
  const search = await getRouteWatchPrisma().savedSearch.findFirst({ where: { id: savedSearchId, userId }, select: selectSavedSearch });
  if (!search) throw new RouteWatchNotFoundError();
  return search;
}

function serializeRouteWatch(watch: RouteWatchRecord): RouteWatchSummary {
  return {
    id: watch.id,
    savedSearchId: watch.savedSearchId,
    status: watch.status,
    isWatching: watch.status === "ACTIVE",
    lastCheckedAt: watch.lastCheckedAt?.toISOString() ?? null,
    nextCheckAt: watch.nextCheckAt?.toISOString() ?? null,
  };
}

function getRouteWatchPrisma(): RouteWatchPrismaClient {
  return prismaClientForTesting ?? (getPrisma() as unknown as RouteWatchPrismaClient);
}

export const __routeWatchServiceTest = {
  setPrismaClientForTesting(prisma: RouteWatchPrismaClient | null) {
    prismaClientForTesting = prisma;
  },
};
