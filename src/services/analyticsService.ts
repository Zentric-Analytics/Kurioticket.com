import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getOptionalPrisma } from "@/lib/prisma";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";
import { lockConsentedVisitor } from "@/services/visitorActivityIdentity";
import { applicationMetadata, type ApplicationAttribution } from "@/lib/application-source";

export type AnalyticsEventInput = ApplicationAttribution & {
  userId?: string | null;
  visitorId?: string | null;
  type: "SEARCH" | "REDIRECT";
  name: string;
  metadata?: Record<string, unknown>;
};

/** The production writer and lifecycle tests share the same transactional check. */
export function createAnalyticsEventRecorder(getDatabase: () => Pick<PrismaClient, "$transaction"> | null) {
  return async function trackAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
    // Account identity or an operational session is not analytics consent.
    const visitorId = input.visitorId;
    if (!visitorId || (input.type !== "SEARCH" && input.type !== "REDIRECT")) return;
    try {
      const db = getDatabase();
      if (!db) return;
      await db.$transaction(async tx => {
        const userId = input.userId || null;
        if (!await lockConsentedVisitor(tx, visitorId, userId)) return;
        await tx.analyticsEvent.create({ data: {
          userId: userId || undefined,
          visitorId,
          type: input.type,
          name: input.name,
          metadata: withEnvironmentMetadata({ ...input.metadata, ...applicationMetadata(input), recordPurpose: "optional_analytics" }) as Prisma.InputJsonValue,
        } });
      });
    } catch {
      // Optional analytics cannot interrupt travel, support or account actions.
      // Retain no database payloads or identity credentials in error output.
    }
  };
}

export const trackAnalyticsEvent = createAnalyticsEventRecorder(getOptionalPrisma);
