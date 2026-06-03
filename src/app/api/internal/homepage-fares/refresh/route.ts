import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getHomepageFaresCronSecret } from "@/lib/env";
import { refreshPhase3AHomepageFareSnapshots } from "@/services/homepageFareSnapshotService";

export const runtime = "nodejs";

let refreshInProgress = false;

export async function POST(request: Request) {
  const secret = getHomepageFaresCronSecret();

  if (!secret) {
    return NextResponse.json(
      { error: "Homepage fare refresh is not configured." },
      { status: 503 },
    );
  }

  if (!isAuthorizedBearer(request.headers.get("authorization"), secret)) {
    return NextResponse.json(
      { error: "Unauthorized homepage fare refresh request." },
      { status: 401 },
    );
  }

  if (refreshInProgress) {
    return NextResponse.json(
      { error: "Homepage fare refresh is already running." },
      { status: 409 },
    );
  }

  refreshInProgress = true;

  try {
    const counts = await refreshPhase3AHomepageFareSnapshots();

    return NextResponse.json(counts);
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
