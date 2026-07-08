import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getHomepageFaresCronSecret } from "@/lib/env";
import {
  buildSafeHomepageFareRefreshErrorResponse,
  refreshPhase3AHomepageFareSnapshots,
} from "@/services/homepageFareSnapshotService";

export const runtime = "nodejs";

let refreshInProgress = false;

export async function POST(request: Request) {
  const secret = getHomepageFaresCronSecret();

  if (!secret) {
    return NextResponse.json(
      {
        error: "Homepage fare refresh is not configured.",
        errorCode: "homepage_fare_refresh_not_configured",
        safeReason: "Set HOMEPAGE_FARES_CRON_SECRET before scheduling homepage fare refreshes.",
      },
      { status: 503 },
    );
  }

  if (!isAuthorizedBearer(request.headers.get("authorization"), secret)) {
    return NextResponse.json(
      {
        error: "Unauthorized homepage fare refresh request.",
        errorCode: "homepage_fare_refresh_unauthorized",
        safeReason: "Use the configured HOMEPAGE_FARES_CRON_SECRET as a Bearer token.",
      },
      { status: 401 },
    );
  }

  if (refreshInProgress) {
    return NextResponse.json(
      {
        error: "Homepage fare refresh is already running.",
        errorCode: "homepage_fare_refresh_in_progress",
        safeReason: "Wait for the active refresh to finish before starting another run.",
      },
      { status: 409 },
    );
  }

  refreshInProgress = true;

  try {
    const counts = await refreshPhase3AHomepageFareSnapshots();

    return NextResponse.json(counts);
  } catch (error) {
    console.error("[homepage-fares:cron-refresh]", error);
    return NextResponse.json(
      buildSafeHomepageFareRefreshErrorResponse(error),
      { status: 500 },
    );
  } finally {
    refreshInProgress = false;
  }
}

function isAuthorizedBearer(authorization: string | null, secret: string) {
  if (!authorization) return false;

  const [scheme, ...credentials] = authorization.split(" ");
  if (scheme !== "Bearer" || credentials.length !== 1) return false;

  return timingSafeCompare(credentials[0].trim(), secret);
}

function timingSafeCompare(value: string, expected: string) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);

  return (
    valueBuffer.length === expectedBuffer.length &&
    timingSafeEqual(valueBuffer, expectedBuffer)
  );
}
