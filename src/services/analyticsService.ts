import { withOptionalDb } from "@/lib/prisma";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";
import { journeyEventKey, recordJourneyEvent } from "@/services/searchJourneyService";

export async function trackAnalyticsEvent(input: {
  userId?: string | null;
  visitorId?: string | null;
  type:
    | "SEARCH"
    | "REDIRECT"
    | "SAVE"
    | "ALERT_CREATED"
    | "SIGNUP"
    | "SUPPORT_TICKET"
    | "PROVIDER_FAILURE";
  name: string;
  metadata?: Record<string, unknown>;
}) {
  await withOptionalDb(
    async (db) => {
      await db.analyticsEvent.create({
        data: {
          userId: input.userId || undefined,
          visitorId: input.visitorId || undefined,
          type: input.type,
          name: input.name,
          metadata: withEnvironmentMetadata(input.metadata) as never,
        },
      });
      return true;
    },
    false,
  );
}

export async function logProviderCall(input: {
  provider: string;
  service: string;
  endpoint?: string;
  status: "SUCCESS" | "DEGRADED" | "FAILED" | "DISABLED";
  latencyMs?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  await withOptionalDb(
    async (db) => {
      await db.apiProviderLog.create({
        data: {
          ...input,
          metadata: withEnvironmentMetadata(input.metadata) as never,
        },
      });
      return true;
    },
    false,
  );
}

export async function logSearchHistory(input: {
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
}) {
  const history = await withOptionalDb(
    async (db) => {
      return db.searchHistory.create({
        data: {
          userId: input.userId || undefined,
          visitorId: input.visitorId || undefined,
          requestId: input.requestId || undefined,
          type: input.type,
          origin: input.origin || undefined,
          destination: input.destination || undefined,
          checkIn: input.checkIn || undefined,
          checkOut: input.checkOut || undefined,
          query: withEnvironmentMetadata(input.query) as never,
          resultCount: input.resultCount,
          latencyMs: input.latencyMs,
          status: input.status,
        },
        select: { id: true },
      });
    },
    null,
  );

  if (history && input.visitorId) {
    await recordJourneyEvent({
      visitorId: input.visitorId,
      type: "SEARCH_COMPLETED",
      eventKey: journeyEventKey("search", history.id),
      product: input.type,
      searchHistoryId: history.id,
      metadata: {
        requestId: input.requestId || undefined,
        resultCount: input.resultCount,
        status: input.status,
      },
    });
  }

  return history;
}
