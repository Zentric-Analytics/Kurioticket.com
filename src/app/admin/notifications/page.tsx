import Link from "next/link";
import { redirect } from "next/navigation";

import {
  AdminEmptyState,
  AdminMetricCard,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { AdminAlertAcknowledgeButton } from "@/components/admin/AdminAlertAcknowledgeButton";
import { requireAdminSession } from "@/lib/auth-guards";
import { isProtectedAdminEmail } from "@/lib/admin";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { getCurrentDatabaseOutageAdminToken } from "@/lib/adminDatabaseOutageAccess";
import {
  getAdminAlertSnapshot,
  getDatabaseOutageAlertSnapshot,
  type AdminAlertSnapshot,
} from "@/services/adminAlertService";

export const metadata = { title: "Admin Notifications & Alerts" };

function severityTone(severity: "CRITICAL" | "WARNING") {
  return severity === "CRITICAL" ? "bad" : "warn";
}

function sourceLabel(source: string) {
  return source.replaceAll("_", " ");
}

function formatDateTime(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function AdminNotificationsPage() {
  let snapshot: AdminAlertSnapshot;

  try {
    const session = await requireAdminSession("/admin/notifications");
    if (!isProtectedAdminEmail(session.user.email)) redirect("/dashboard");
    snapshot = await getAdminAlertSnapshot(session.user.id);
  } catch (error) {
    const system = await getSafeSystemStatus();
    if (!system.databaseConfigured || system.databaseConnected) throw error;

    const token = await getCurrentDatabaseOutageAdminToken("/admin/notifications");
    if (!token) throw error;

    snapshot = getDatabaseOutageAlertSnapshot();
  }

  return (
    <AdminPageShell
      title="Notifications & Alerts"
      description="Active internal operational alerts derived from authoritative Kurioticket health signals. Acknowledging an alert hides that exact signal for 24 hours; it does not resolve the underlying condition."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/system"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            System health
          </Link>
          <Link
            href="/admin/logs"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            Audit logs
          </Link>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Active alerts"
          value={snapshot.activeCount}
          hint="Current operational conditions"
          tone={snapshot.activeCount > 0 ? "warn" : "good"}
        />
        <AdminMetricCard
          label="Unread"
          value={snapshot.unreadCount}
          hint="Not acknowledged by you"
          tone={snapshot.unreadCount > 0 ? "warn" : "good"}
        />
        <AdminMetricCard
          label="Critical"
          value={snapshot.criticalCount}
          hint="Requires prompt attention"
          tone={snapshot.criticalCount > 0 ? "bad" : "good"}
        />
        <AdminMetricCard
          label="Warnings"
          value={snapshot.warningCount}
          hint="Operational degradation or incomplete readiness"
          tone={snapshot.warningCount > 0 ? "warn" : "good"}
        />
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-500">
        Snapshot generated {formatDateTime(snapshot.generatedAt)}. Alerts clear automatically when the underlying authoritative signal clears.
      </p>

      <div className="mt-4 space-y-4">
        {snapshot.alerts.length === 0 ? (
          <AdminEmptyState
            title="No active operational alerts"
            message="The monitored Kurioticket operational signals currently have no alert conditions."
          />
        ) : (
          snapshot.alerts.map((alert) => (
            <AdminSectionCard
              key={alert.id}
              className={`p-5 ${alert.acknowledged ? "opacity-70" : ""}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminStatusBadge tone={severityTone(alert.severity)}>
                      {alert.severity}
                    </AdminStatusBadge>
                    <AdminStatusBadge>{sourceLabel(alert.source)}</AdminStatusBadge>
                    {alert.acknowledged ? (
                      <AdminStatusBadge tone="neutral">ACKNOWLEDGED</AdminStatusBadge>
                    ) : (
                      <AdminStatusBadge tone="info">UNREAD</AdminStatusBadge>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg font-black text-slate-950">
                    {alert.title}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                    {alert.message}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                    {alert.signalAt ? (
                      <span>Signal: {formatDateTime(alert.signalAt)}</span>
                    ) : null}
                    {alert.acknowledgedAt ? (
                      <span>Acknowledged: {formatDateTime(alert.acknowledgedAt)}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={alert.actionHref}
                    className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                  >
                    Open source
                  </Link>
                  {alert.key === "system.database.unavailable" ? null : (
                    <AdminAlertAcknowledgeButton
                      alertKey={alert.key}
                      signalToken={alert.signalToken}
                      acknowledged={alert.acknowledged}
                    />
                  )}
                </div>
              </div>
            </AdminSectionCard>
          ))
        )}
      </div>

      <AdminSectionCard className="mt-4 p-5">
        <h2 className="font-black text-slate-950">Phase 1 monitoring boundaries</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Alerts are currently derived from System/database health, ready provider operational health, Email Delivery, CMS integrity, Homepage Fare readiness, and configured Flight Status telemetry. Kurioticket does not fabricate alerts for integrations that are intentionally not configured or for booking-confirmation volume where no trustworthy expected cadence exists.
        </p>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
