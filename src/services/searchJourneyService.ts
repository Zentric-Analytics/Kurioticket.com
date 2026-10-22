import "server-only";

import { getOptionalPrisma, withOptionalDb } from "@/lib/prisma";
import {
  clientJourneyEventTypes,
  getJourneyActivityCutoff,
  journeyEventKey,
  type ClientJourneyEventType,
} from "@/lib/search-journey";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";

export { clientJourneyEventTypes, journeyEventKey, type ClientJourneyEventType };

type JourneyEventType = ClientJourneyEventType | "SEARCH_COMPLETED" | "PROVIDER_HANDOFF_STARTED";

export async function recordJourneyEvent(input: {
  visitorId?: string | null;
  type: JourneyEventType;
  eventKey: string;
  product?: "FLIGHT" | "HOTEL" | "CAR" | "PACKAGE";
  provider?: string | null;
  searchHistoryId?: string | null;
  redirectLogId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!input.visitorId) return null;

  return withOptionalDb(async (db) => {
    const now = new Date();
    const cutoff = getJourneyActivityCutoff(now);

    return db.$transaction(async (tx) => {
      const existing = await tx.journeyEvent.findUnique({
        where: { eventKey: input.eventKey },
        select: { journeyId: true },
      });

      if (existing) {
        await tx.searchJourney.update({
          where: { id: existing.journeyId },
          data: { lastActivityAt: now },
        });
        return { journeyId: existing.journeyId, created: false };
      }

      const activeJourney = await tx.searchJourney.findFirst({
        where: {
          visitorId: input.visitorId,
          lastActivityAt: { gte: cutoff },
        },
        orderBy: { lastActivityAt: "desc" },
        select: { id: true },
      });

      const journey = activeJourney
        ? await tx.searchJourney.update({
            where: { id: activeJourney.id },
            data: { lastActivityAt: now },
            select: { id: true },
          })
        : await tx.searchJourney.create({
            data: {
              visitorId: input.visitorId,
              startedAt: now,
              lastActivityAt: now,
            },
            select: { id: true },
          });

      await tx.journeyEvent.create({
        data: {
          journeyId: journey.id,
          type: input.type,
          eventKey: input.eventKey,
          product: input.product,
          provider: input.provider || undefined,
          searchHistoryId: input.searchHistoryId || undefined,
          redirectLogId: input.redirectLogId || undefined,
          metadata: input.metadata ? (withEnvironmentMetadata(input.metadata) as never) : undefined,
        },
      });

      return { journeyId: journey.id, created: true };
    });
  }, null);
}

export async function recordClientJourneyEvent(input: {
  visitorId?: string | null;
  eventId: string;
  type: ClientJourneyEventType;
  requestId: string;
  provider?: string;
  sourcePage?: string;
}) {
  if (!input.visitorId) return false;
  const db = getOptionalPrisma();
  if (!db) return false;

  try {
    const search = await db.searchHistory.findFirst({
      where: {
        requestId: input.requestId,
        visitorId: input.visitorId,
      },
      select: { id: true, type: true },
    });
    if (!search) return false;

    const result = await recordJourneyEvent({
      visitorId: input.visitorId,
      type: input.type,
      eventKey: journeyEventKey("client", input.eventId),
      product: search.type,
      provider: input.provider,
      searchHistoryId: search.id,
      metadata: input.sourcePage ? { sourcePage: input.sourcePage } : undefined,
    });

    return Boolean(result);
  } catch (error) {
    console.error("[search-journey:client-event]", error);
    return false;
  }
}
