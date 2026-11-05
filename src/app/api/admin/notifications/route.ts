import { NextRequest, NextResponse } from "next/server";

import { requireAdminApiSession, writeAdminAuditLog } from "@/lib/admin";
import { AuthRateLimitError, checkAuthRateLimit } from "@/lib/auth-rate-limit";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getDatabaseOutageAdminToken } from "@/lib/adminDatabaseOutageAccess";
import {
  getAdminAlertSnapshot,
  getAdminAlertSummary,
  getDatabaseOutageAlertSnapshot,
  getCurrentAdminAlertByKey,
  adminAlertDismissal,
  adminAlertDismissalKey,
} from "@/services/adminAlertService";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const summaryOnly = params.get("summary") === "1";
  const panelOnly = params.get("panel") === "1";

  let canonicalError: unknown = null;

  try {
    const auth = await requireAdminApiSession();
    if (!auth.response) {
      if (summaryOnly) {
        return NextResponse.json(
          await getAdminAlertSummary(auth.session.user.id),
        );
      }

      return NextResponse.json(
        await getAdminAlertSnapshot(auth.session.user.id, new Date(), {
          forceRefreshCandidates: !panelOnly,
        }),
      );
    }
    canonicalError = auth.response;
  } catch (error) {
    canonicalError = error;
  }

  const system = await getSafeSystemStatus();
  if (!system.databaseConfigured || system.databaseConnected) {
    if (canonicalError instanceof Response) return canonicalError;
    throw canonicalError;
  }

  const token = await getDatabaseOutageAdminToken(new NextRequest(request));
  if (!token) {
    if (canonicalError instanceof Response) return canonicalError;
    throw canonicalError;
  }

  const outage = getDatabaseOutageAlertSnapshot();
  if (summaryOnly) {
    const { alerts: _alerts, ...summary } = outage;
    return NextResponse.json(summary);
  }

  return NextResponse.json(outage);
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApiSession();
  if (auth.response) return auth.response;

  try {
    checkAuthRateLimit({ action: "admin-alert-deletion", email: auth.session.user.email || undefined, request, limit: 60, windowMs: 15 * 60_000 });
  } catch (error) {
    if (error instanceof AuthRateLimitError) return NextResponse.json({ error: "Too many notification changes. Try again later." }, {
      status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) },
    });
    throw error;
  }

  const body: unknown = await request.json().catch(() => null);
  const raw = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  const alertKey = typeof raw.alertKey === "string" ? raw.alertKey.trim() : "";
  const signalToken = typeof raw.signalToken === "string" ? raw.signalToken.trim() : "";
  if (!alertKey || alertKey.length > 160 || !signalToken || signalToken.length > 2_000) {
    return NextResponse.json({ error: "A valid notification key and signal are required." }, { status: 400 });
  }

  // Validate the authoritative signal independently of the caller's current list.
  // Retrying a successful deletion is safe and cannot hide a newer occurrence.
  const alert = await getCurrentAdminAlertByKey(alertKey);
  if (!alert || alert.signalToken !== signalToken) return NextResponse.json({ error: "This notification changed. Refresh and try again." }, { status: 409 });
  if (alert.key === "system.database.unavailable" || alert.signalToken.startsWith("unpersisted:")) {
    return NextResponse.json({ error: "Deletion is unavailable until monitoring storage recovers." }, { status: 503 });
  }

  const persisted = await writeAdminAuditLog({
    adminUserId: auth.session.user.id,
    adminEmail: auth.session.user.email,
    action: adminAlertDismissal.action,
    targetType: adminAlertDismissal.targetType,
    targetId: adminAlertDismissalKey(alert.key, alert.signalToken),
    metadata: { alertKey: alert.key, signalToken: alert.signalToken, severity: alert.severity, source: alert.source },
    request,
  });
  if (!persisted) return NextResponse.json({ error: "Unable to delete this notification. Please try again." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
