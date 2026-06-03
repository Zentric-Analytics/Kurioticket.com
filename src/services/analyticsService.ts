import { withOptionalDb } from "@/lib/prisma";

export async function trackAnalyticsEvent(input: {
  userId?: string | null;
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
          type: input.type,
          name: input.name,
          metadata: (input.metadata || {}) as never,
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
          metadata: (input.metadata || {}) as never,
        },
      });
      return true;
    },
    false,
  );
}

export async function logSearchHistory(input: {
  userId?: string | null;
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
  await withOptionalDb(
    async (db) => {
      await db.searchHistory.create({
        data: {
          userId: input.userId || undefined,
          type: input.type,
          origin: input.origin || undefined,
          destination: input.destination || undefined,
          checkIn: input.checkIn || undefined,
          checkOut: input.checkOut || undefined,
          query: input.query as never,
          resultCount: input.resultCount,
          latencyMs: input.latencyMs,
          status: input.status,
        },
      });
      return true;
    },
    false,
  );
}
