import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getOptionalPrisma, withOptionalDb } from "@/lib/prisma";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";
export { recordSearchHistory as logSearchHistory } from "@/services/searchJourneyService";

export type AnalyticsEventInput = {
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
};

/** The production writer and lifecycle tests share the same transactional check. */
export function createAnalyticsEventRecorder(getDatabase: () => Pick<PrismaClient, "$transaction"> | null) {
  return async function trackAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
    try {
      const db = getDatabase();
      if (!db) return;
      await db.$transaction(async tx => {
        const userId = input.userId || null;
        const visitorId = input.visitorId && await lockConsentedVisitor(tx, input.visitorId, userId)
          ? input.visitorId : null;
        await tx.analyticsEvent.create({ data: {
          userId: userId || undefined,
          visitorId: visitorId || undefined,
          type: input.type,
          name: input.name,
          metadata: withEnvironmentMetadata(input.metadata) as Prisma.InputJsonValue,
        } });
      });
    } catch {
      // Optional analytics cannot interrupt travel, support or account actions.
      // Retain no database payloads or identity credentials in error output.
    }
  };
}

export const trackAnalyticsEvent = createAnalyticsEventRecorder(getOptionalPrisma);

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
