import { getOptionalPrisma } from "@/lib/prisma";
import { journeySourcePath } from "@/lib/search-journey";
import { getPublicEnvironment } from "@/lib/stagingSafety";

const defaultDays = 30;
const maximumDays = 90;

type AttributionGroupRow = {
  provider: string;
  type: "FLIGHT" | "HOTEL";
  sourcePage: string;
  _count: { _all: number };
};
type ReferralAttributionTransaction = {
  redirectLog: {
    count(args: unknown): Promise<number>;
    groupBy(args: unknown): Promise<AttributionGroupRow[]>;
  };
  journeyEvent: { count(args: unknown): Promise<number> };
};

type ReferralAttributionDatabase = {
  $transaction<T>(
    operation: (tx: ReferralAttributionTransaction) => Promise<T>,
    options?: { isolationLevel?: "RepeatableRead" },
  ): Promise<T>;
};

export type ReferralAttributionSummary = {
  dataAvailable: boolean;
  environment: "staging" | "production";
  window: { start: string; end: string; days: number };
  handoffs: { total: number; linkedToSearch: number; notLinkedToSearch: number };
  providers: Array<{
    provider: string;
    product: "flight" | "hotel";
    handoffs: number;
  }>;
  sourcePages: Array<{ sourcePage: string; handoffs: number }>;
};

export function parseAttributionDays(value: string | null): number | null {
  if (value === null) return defaultDays;
  if (!/^[1-9]\d*$/.test(value)) return null;
  const days = Number(value);
  return days <= maximumDays ? days : null;
}

function summarizeGroups(groups: AttributionGroupRow[]) {
  const providers = new Map<string, { provider: string; product: "flight" | "hotel"; handoffs: number }>();
  const sourcePages = new Map<string, number>();

  for (const group of groups) {
    const product = group.type === "FLIGHT" ? "flight" : "hotel";
    const provider = group.provider.trim().slice(0, 100) || "Unknown provider";
    const providerKey = `${provider}\u0000${product}`;
    const existingProvider = providers.get(providerKey);
    if (existingProvider) existingProvider.handoffs += group._count._all;
    else providers.set(providerKey, { provider, product, handoffs: group._count._all });

    const sourcePage = journeySourcePath(group.sourcePage) ?? "unknown";
    sourcePages.set(sourcePage, (sourcePages.get(sourcePage) ?? 0) + group._count._all);
  }

  return {
    providers: [...providers.values()].sort((left, right) =>
      right.handoffs - left.handoffs || left.provider.localeCompare(right.provider)),
    sourcePages: [...sourcePages.entries()]
      .map(([sourcePage, handoffs]) => ({ sourcePage, handoffs }))
      .sort((left, right) => right.handoffs - left.handoffs || left.sourcePage.localeCompare(right.sourcePage)),
  };
}

function emptySummary(
  days: number,
  environment: ReferralAttributionSummary["environment"],
  end: Date,
): ReferralAttributionSummary {
  const start = new Date(end.getTime() - days * 86_400_000);
  return {
    dataAvailable: false,
    environment,
    window: { start: start.toISOString(), end: end.toISOString(), days },
    handoffs: { total: 0, linkedToSearch: 0, notLinkedToSearch: 0 },
    providers: [],
    sourcePages: [],
  };
}

/**
 * Reports verified provider handoffs, not bookings. A provider-controlled
 * confirmation is handled separately, so this API never infers a conversion.
 */
export function createReferralAttributionService(
  getDatabase: () => ReferralAttributionDatabase | null,
  now: () => Date = () => new Date(),
) {
  async function getSummary(
    days: number,
    environment: ReferralAttributionSummary["environment"],
  ): Promise<ReferralAttributionSummary> {
    const end = now();
    const unavailable = emptySummary(days, environment, end);
    const db = getDatabase();
    if (!db) return unavailable;

    const start = new Date(end.getTime() - days * 86_400_000);
    // New handoff records carry their originating environment. Excluding legacy,
    // unlabelled rows avoids combining staging and production attribution.
    const redirectWhere = {
      createdAt: { gte: start, lte: end },
      metadata: { path: ["environment"], equals: environment },
    };

    try {
      const [total, linkedToSearch, groups] = await db.$transaction(
        async tx => Promise.all([
          tx.redirectLog.count({ where: redirectWhere }),
          tx.journeyEvent.count({
            where: {
              type: "PROVIDER_HANDOFF_STARTED",
              searchHistoryId: { not: null },
              createdAt: { gte: start, lte: end },
              redirectLog: { is: redirectWhere },
            },
          }),
          tx.redirectLog.groupBy({
            by: ["provider", "type", "sourcePage"],
            where: redirectWhere,
            _count: { _all: true },
          }),
        ]),
        { isolationLevel: "RepeatableRead" },
      );

      const summary = summarizeGroups(groups);
      const safelyLinked = Math.min(linkedToSearch, total);
      return {
        dataAvailable: true,
        environment,
        window: { start: start.toISOString(), end: end.toISOString(), days },
        handoffs: {
          total,
          linkedToSearch: safelyLinked,
          notLinkedToSearch: total - safelyLinked,
        },
        ...summary,
      };
    } catch {
      console.warn("[referral-attribution]", { outcome: "query_unavailable" });
      return unavailable;
    }
  }

  return { getSummary };
}

export const { getSummary: getReferralAttributionSummary } = createReferralAttributionService(
  () => getOptionalPrisma() as unknown as ReferralAttributionDatabase | null,
);

export function currentReferralAttributionEnvironment() {
  return getPublicEnvironment();
}
