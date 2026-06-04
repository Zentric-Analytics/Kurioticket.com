import { NextResponse } from "next/server";

import { requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import {
  getHomepageFareDateStrategy,
  refreshPhase3AHomepageFareSnapshots,
  type HomepageFareRefreshScope,
} from "@/services/homepageFareSnapshotService";

export const runtime = "nodejs";

const DEFAULT_REFRESH_SCOPE: HomepageFareRefreshScope = "all-phase-3a";
const AUDIT_TARGET_TYPE = "HomepageFareSnapshot";

export async function POST(request: Request) {
  const auth = await requireAdminApiSession();
  if ("response" in auth) return auth.response;

  const scope = await readRefreshScope(request);
  const dateStrategy = getHomepageFareDateStrategy();
  const counts = await refreshPhase3AHomepageFareSnapshots({
    scope,
    dateStrategy,
  });

  await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action: "HOMEPAGE_FARES_REFRESHED",
    targetType: AUDIT_TARGET_TYPE,
    targetId: scope,
    metadata: {
      scope,
      counts,
      departureDate: dateStrategy.departureDate,
    },
    request,
  });

  return NextResponse.json(counts);
}

async function readRefreshScope(
  request: Request,
): Promise<HomepageFareRefreshScope> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return DEFAULT_REFRESH_SCOPE;
  }

  if (!payload || typeof payload !== "object") return DEFAULT_REFRESH_SCOPE;

  const scope = (payload as { scope?: unknown }).scope;

  return scope === "popular" ||
    scope === "discover" ||
    scope === "discover-default" ||
    scope === "discover-first-6" ||
    scope === "all-phase-3a"
    ? scope
    : DEFAULT_REFRESH_SCOPE;
}
