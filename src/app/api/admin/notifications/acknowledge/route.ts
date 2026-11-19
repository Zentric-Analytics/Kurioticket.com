import { NextResponse } from "next/server";

import { requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import {
  adminAlertAcknowledgement,
  getCurrentAdminAlertByKey,
} from "@/services/adminAlertService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  try {
    checkAuthRateLimit({
      action: "admin-alert-acknowledgement",
      email: auth.session.user.email || undefined,
      request,
      limit: 60,
      windowMs: 15 * 60_000,
    });
  } catch (error) {
    if (error instanceof AuthRateLimitError) {
      return NextResponse.json(
        { error: "Too many alert changes. Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    throw error;
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const alertKey =
    typeof body.alertKey === "string" ? body.alertKey.trim().slice(0, 160) : "";
  const signalToken =
    typeof body.signalToken === "string" ? body.signalToken.trim().slice(0, 2_000) : "";

  if (!alertKey || !signalToken) {
    return NextResponse.json(
      { error: "Alert key and signal token are required." },
      { status: 400 },
    );
  }

  const alert = await getCurrentAdminAlertByKey(alertKey, auth.session.user.id);

  if (!alert) {
    return NextResponse.json(
      { error: "That operational alert is no longer active." },
      { status: 409 },
    );
  }

  if (alert.signalToken !== signalToken) {
    return NextResponse.json(
      { error: "That operational alert changed. Refresh and review the current signal." },
      { status: 409 },
    );
  }

  if (alert.acknowledged) {
    return NextResponse.json({ ok: true, alreadyAcknowledged: true });
  }

  const persisted = await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action: adminAlertAcknowledgement.action,
    targetType: adminAlertAcknowledgement.targetType,
    targetId: alert.key,
    metadata: {
      alertKey: alert.key,
      signalToken: alert.signalToken,
      severity: alert.severity,
      source: alert.source,
      acknowledgementWindowHours:
        adminAlertAcknowledgement.windowMs / (60 * 60 * 1_000),
    },
    request,
  });

  if (!persisted) {
    return NextResponse.json(
      { error: "Unable to persist alert acknowledgement." },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}
