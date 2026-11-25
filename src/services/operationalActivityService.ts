import { withOptionalDb } from "@/lib/prisma";
import { withEnvironmentMetadata } from "@/lib/stagingSafety";

// Search history and provider diagnostics are operational, not optional engagement.
export { recordSearchHistory as logSearchHistory } from "@/services/searchJourneyService";

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
