import { withOptionalDb } from "@/lib/prisma";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";
export { recordSearchHistory as logSearchHistory } from "@/services/searchJourneyService";

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
