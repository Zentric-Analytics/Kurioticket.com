import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import {
  clientJourneyEventTypes,
  getJourneyActivityCutoff,
  journeyEventKey,
  type ClientJourneyEventType,
  type JourneyEventReceipt,
} from "@/lib/search-journey";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";

export { clientJourneyEventTypes, journeyEventKey, type ClientJourneyEventType };
export type SearchJourneyDatabase = Pick<PrismaClient, "$transaction">;

type JourneyEventType = ClientJourneyEventType | "SEARCH_COMPLETED" | "PROVIDER_HANDOFF_STARTED";
export type JourneyEventInput = {
  visitorId?: string | null;
  userId?: string | null;
  type: JourneyEventType;
  eventKey: string;
  product?: "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";
  provider?: string | null;
  searchHistoryId?: string | null;
  redirectLogId?: string | null;
  metadata?: Record<string, unknown>;
};
export type ClientJourneyEventInput = {
  visitorId?: string | null;
  userId?: string | null;
  eventId: string;
  type: ClientJourneyEventType;
  requestId: string;
  provider?: string;
  sourcePage?: string;
};
export type SearchHistoryInput = {
  userId?: string | null;
  visitorId?: string | null;
  requestId?: string | null;
  type: "FLIGHT" | "HOTEL";
  origin?: string | null;
  destination?: string | null;
  checkIn?: Date | null;
  checkOut?: Date | null;
  query: Record<string, unknown>;
  resultCount: number;
  latencyMs: number;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  progressive?: boolean;
  completed?: boolean;
};

type OwnedActivity = { visitorId: string | null; userId: string | null };
function ownsActivity(activity: OwnedActivity, visitorId: string, userId: string | null) {
  return activity.visitorId === visitorId && (!activity.userId || activity.userId === userId);
}

async function lockConsentedVisitor(tx: Prisma.TransactionClient, visitorId: string, userId: string | null) {
  // Identity linking and withdrawal update this same row. Holding its lock through
  // the event write prevents stale consent and serialises first-journey creation.
  await tx.$queryRaw`SELECT "id" FROM "Visitor" WHERE "id" = ${visitorId} FOR UPDATE`;
  const visitor = await tx.visitor.findUnique({
    where: { id: visitorId },
    select: { currentUserId: true, consentStatus: true, trackingDisabledAt: true, identityLinks: { select: { userId: true } } },
  });
  return Boolean(visitor
    && visitor.consentStatus === "GRANTED" && visitor.trackingDisabledAt === null
    && (!visitor.currentUserId || visitor.currentUserId === userId)
    && visitor.identityLinks.every(link => link.userId === userId));
}

async function appendEvent(tx: Prisma.TransactionClient, input: JourneyEventInput & { visitorId: string }, now: Date) {
  const existing = await tx.journeyEvent.findUnique({
    where: { eventKey: input.eventKey },
    select: { journeyId: true, type: true, searchHistoryId: true, redirectLogId: true, provider: true, journey: { select: { visitorId: true } } },
  });
  if (existing) {
    // A reused key is an acknowledgement only for the same owner and activity;
    // retries must never extend a session or touch another visitor's journey.
    if (existing.journey.visitorId !== input.visitorId || existing.type !== input.type
      || existing.searchHistoryId !== (input.searchHistoryId ?? null)
      || existing.redirectLogId !== (input.redirectLogId ?? null)
      || existing.provider !== (input.provider ?? null)) return null;
    return { journeyId: existing.journeyId, created: false };
  }

  const activeJourney = await tx.searchJourney.findFirst({
    where: { visitorId: input.visitorId, lastActivityAt: { gte: getJourneyActivityCutoff(now) } },
    orderBy: { lastActivityAt: "desc" },
    select: { id: true },
  });
  const journey = activeJourney
    ? await tx.searchJourney.update({ where: { id: activeJourney.id }, data: { lastActivityAt: now }, select: { id: true } })
    : await tx.searchJourney.create({ data: { visitorId: input.visitorId, startedAt: now, lastActivityAt: now }, select: { id: true } });
  await tx.journeyEvent.create({
    data: {
      journeyId: journey.id,
      type: input.type,
      eventKey: input.eventKey,
      product: input.product,
      provider: input.provider || undefined,
      searchHistoryId: input.searchHistoryId || undefined,
      redirectLogId: input.redirectLogId || undefined,
      metadata: input.metadata ? (withEnvironmentMetadata(input.metadata) as Prisma.InputJsonValue) : undefined,
    },
  });
  return { journeyId: journey.id, created: true };
}

/** The same transactional implementation is used by production and lifecycle tests. */
export function createSearchJourneyService(getDatabase: () => SearchJourneyDatabase | null, now = () => new Date()) {
  async function recordJourneyEvent(input: JourneyEventInput) {
    const visitorId = input.visitorId;
    if (!visitorId) return null;
    try {
      const db = getDatabase();
      if (!db) return null;
      return await db.$transaction(async tx => {
        if (!(await lockConsentedVisitor(tx, visitorId, input.userId ?? null))) return null;
        if (input.searchHistoryId) {
          const search = await tx.searchHistory.findUnique({ where: { id: input.searchHistoryId }, select: { visitorId: true, userId: true } });
          if (!search || !ownsActivity(search, visitorId, input.userId ?? null)) return null;
        }
        if (input.redirectLogId) {
          const redirect = await tx.redirectLog.findUnique({ where: { id: input.redirectLogId }, select: { visitorId: true, userId: true } });
          if (!redirect || !ownsActivity(redirect, visitorId, input.userId ?? null)) return null;
        }
        return appendEvent(tx, { ...input, visitorId }, now());
      });
    } catch {
      // Optional analytics cannot reject searches or expose database/identity data.
      return null;
    }
  }

  async function recordClientJourneyEvent(input: ClientJourneyEventInput): Promise<JourneyEventReceipt> {
    const visitorId = input.visitorId;
    if (!visitorId) return { accepted: false };
    try {
      const db = getDatabase();
      if (!db) return { accepted: false, retryable: true };
      return await db.$transaction(async tx => {
        if (!(await lockConsentedVisitor(tx, visitorId, input.userId ?? null))) return { accepted: false };
        const search = await tx.searchHistory.findUnique({
          where: { requestId: input.requestId },
          select: { id: true, type: true, visitorId: true, userId: true },
        });
        // Search responses are deliberately sent before optional history writes.
        // Retry this race, but never retry an already-known ownership mismatch.
        if (!search) return { accepted: false, retryable: true };
        if (!ownsActivity(search, visitorId, input.userId ?? null)) return { accepted: false };
        const result = await appendEvent(tx, {
          visitorId,
          userId: input.userId,
          type: input.type,
          eventKey: journeyEventKey("client", `${visitorId}:${input.eventId.toLowerCase()}`),
          product: search.type,
          provider: input.provider,
          searchHistoryId: search.id,
          metadata: input.sourcePage ? { sourcePage: input.sourcePage } : undefined,
        }, now());
        return { accepted: Boolean(result) };
      });
    } catch {
      return { accepted: false, retryable: true };
    }
  }

  async function recordSearchHistory(input: SearchHistoryInput) {
    try {
      const db = getDatabase();
      if (!db) return null;
      const userId = input.userId ?? null;
      const history = await db.$transaction(async tx => {
        // The request key is unique globally. A duplicate may never overwrite a
        // different identity's search; progressive pages update the same row.
        if (input.requestId) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('search-history-request'), hashtext(${input.requestId}))`;
        }
        const visitorId = input.visitorId && await lockConsentedVisitor(tx, input.visitorId, userId) ? input.visitorId : null;
        const existing = input.requestId ? await tx.searchHistory.findUnique({ where: { requestId: input.requestId } }) : null;
        if (existing) {
          const sameOwner = existing.visitorId === visitorId
            && (existing.userId === userId || (!existing.userId && Boolean(visitorId)));
          if (!sameOwner || existing.type !== input.type) return null;
          // A completed success wins over delayed partial/failure callbacks.
          // A completed failure also cannot be reopened by an earlier page.
          if (input.progressive && existing.status !== "SUCCESS"
            && !(existing.status === "FAILED" && input.completed === false)) {
            return tx.searchHistory.update({
              where: { id: existing.id },
              data: {
                resultCount: Math.max(existing.resultCount, input.resultCount),
                latencyMs: Math.max(existing.latencyMs ?? 0, input.latencyMs),
                status: input.completed === false ? "PARTIAL" : input.status,
              },
            });
          }
          return existing;
        }
        return tx.searchHistory.create({ data: {
          userId,
          visitorId,
          requestId: input.requestId || undefined,
          type: input.type,
          origin: input.origin || undefined,
          destination: input.destination || undefined,
          checkIn: input.checkIn || undefined,
          checkOut: input.checkOut || undefined,
          query: withEnvironmentMetadata(input.query) as Prisma.InputJsonValue,
          resultCount: input.resultCount,
          latencyMs: input.latencyMs,
          status: input.completed === false ? "PARTIAL" : input.status,
        } });
      });
      if (history?.visitorId && input.completed !== false) {
        await recordJourneyEvent({
          visitorId: history.visitorId,
          userId,
          type: "SEARCH_COMPLETED",
          eventKey: journeyEventKey("search", history.id),
          product: history.type,
          searchHistoryId: history.id,
          metadata: { requestId: input.requestId || undefined, resultCount: history.resultCount, status: history.status },
        });
      }
      return history ? { id: history.id } : null;
    } catch {
      return null;
    }
  }

  return { recordJourneyEvent, recordClientJourneyEvent, recordSearchHistory };
}

export const { recordJourneyEvent, recordClientJourneyEvent, recordSearchHistory } = createSearchJourneyService(getOptionalPrisma);
