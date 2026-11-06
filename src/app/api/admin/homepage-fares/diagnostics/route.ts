import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin";
import { getOptionalPrisma } from "@/lib/prisma";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const REFRESH_ACTION = "HOMEPAGE_FARES_REFRESHED";
const REFRESH_TARGET = "HomepageFareSnapshot";
const MAX_RUN_MARKETS = 50;

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function arrayCount(value: unknown): number | null {
  return Array.isArray(value) ? value.length : null;
}

function sumCounts(value: unknown): number | null {
  const source = object(value);
  if (!source || Object.keys(source).length > MAX_RUN_MARKETS) return null;
  const values = Object.values(source).map(count);
  return values.every((item): item is number => item !== null)
    ? values.reduce((sum, item) => sum + item, 0)
    : null;
}

function marketCodes(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.slice(0, MAX_RUN_MARKETS).filter(
    (item): item is string => typeof item === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(item),
  );
}

function lastRunMetrics(metadata: unknown) {
  const raw = object(object(metadata)?.counts);
  if (!raw) return null;

  const budgets = object(raw.refreshBudget);
  return {
    providerCalls: count(raw.providerCalls),
    routeAttempts: count(raw.routeAttempts),
    stoppedReason: typeof raw.stoppedReason === "string" && /^[a-z_]{1,50}$/.test(raw.stoppedReason)
      ? raw.stoppedReason
      : null,
    providerCallLimit: count(budgets?.maxProviderCallsPerRun),
    routeAttemptLimit: count(budgets?.maxRouteAttemptsPerRun),
    visibleGapsAttempted: arrayCount(raw.visibleGapsAttempted),
    immediateReplacementsAttempted: arrayCount(raw.replacementsUsed),
    replacementCandidatesUsed: sumCounts(raw.replacementCandidatesUsedByMarket),
    timeouts: sumCounts(raw.timeoutByMarket),
    targetedMarkets: marketCodes(raw.targetedMarkets),
  };
}

export async function GET() {
  const auth = await requireAdminApiSession();
  if ("response" in auth) return auth.response;

  const db = getOptionalPrisma();
  if (!db) {
    return NextResponse.json(
      { dataAvailable: false, lastManualRun: null },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const latest = await db.adminAuditLog.findFirst({
      where: { action: REFRESH_ACTION, targetType: REFRESH_TARGET },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, metadata: true },
    });

    return NextResponse.json(
      {
        dataAvailable: true,
        lastManualRun: latest
          ? { completedAt: latest.createdAt.toISOString(), metrics: lastRunMetrics(latest.metadata) }
          : null,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("[homepage-fares:diagnostics-read]", error);
    return NextResponse.json(
      { dataAvailable: false, lastManualRun: null },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
}
