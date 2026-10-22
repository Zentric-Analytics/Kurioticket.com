import "server-only";

import { getOptionalPrisma } from "@/lib/prisma";
import { getPublicEnvironment, type PublicEnvironment } from "@/lib/stagingSafety";
import { readProviderOperationalSnapshot } from "@/services/providerOperationalStatusCore";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";

export type {
  ProviderOperationalState,
  ProviderOperationalStatus,
} from "@/services/providerOperationalStatusCore";

export async function getProviderOperationalStatuses(
  windowHours = 24,
  environment: PublicEnvironment = getPublicEnvironment(),
) {
  const db = getOptionalPrisma();
  if (!db) return null;

  const readiness = getProviderIntegrationStatuses().map(integration => ({
    id: integration.id,
    provider: integration.provider,
    state: integration.state,
  }));
  const now = new Date();

  return db.$transaction(
    tx =>
      readProviderOperationalSnapshot({
        database: tx,
        readiness,
        environment,
        now,
        windowHours,
      }),
    { isolationLevel: "RepeatableRead" },
  );
}
