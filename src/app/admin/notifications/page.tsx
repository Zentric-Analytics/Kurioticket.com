import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { AdminAlertAcknowledgeButton } from "@/components/admin/AdminAlertAcknowledgeButton";
import { requireAdminSession } from "@/lib/auth-guards";
import { isProtectedAdminEmail } from "@/lib/admin";
import { getSafeSystemStatus } from "@/lib/admin-data";
import { alertSourceHref } from "@/lib/adminAlertNavigation";
import { getCurrentDatabaseOutageAdminToken } from "@/lib/adminDatabaseOutageAccess";
import {
  getAdminAlertSnapshot,
  getDatabaseOutageAlertSnapshot,
  type AdminAlertSnapshot,
} from "@/services/adminAlertService";

export const metadata = { title: "Admin Notifications & Alerts" };

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

  const metrics = [
    { label: "Active alerts", value: snapshot.activeCount, dot: "bg-[#004BB8]" },
    { label: "Unread", value: snapshot.unreadCount, dot: snapshot.unreadCount > 0 ? "bg-amber-500" : "bg-emerald-500" },
    { label: "Critical", value: snapshot.criticalCount, dot: snapshot.criticalCount > 0 ? "bg-rose-500" : "bg-emerald-500" },
    { label: "Warnings", value: snapshot.warningCount, dot: snapshot.warningCount > 0 ? "bg-amber-500" : "bg-emerald-500" },
  ];

  return (
    <AdminPageShell title="Notifications & Alerts" hideHeader>
      <div className="mx-auto w-full min-w-0 max-w-[1500px] bg-white text-[#020617]">
        <header className="pb-4">
          <h2 className="text-[20px] font-semibold leading-7 tracking-[-0.02em]">Notifications &amp; Alerts</h2>
          <p className="mt-1 max-w-4xl text-[13px] leading-5 text-[#64748B]">
            Review active operational issues. Acknowledging an alert hides that exact signal for 24 hours; it does not resolve the underlying condition.
          </p>
        </header>

        <section aria-label="Alert summary" className="border-y border-[#D8E1EC]">
          <dl className="grid grid-cols-2 md:grid-cols-4">
            {metrics.map((metric, index) => (
              <div
                key={metric.label}
                className={
                  "min-w-0 px-3 py-3 md:px-5 md:py-4 " +
                  (index < 2 ? "border-b border-[#E7ECF5] md:border-b-0 " : "") +
                  (index % 2 === 0 || index === 1 ? "border-r border-[#E7ECF5] " : "") +
                  (index === 1 ? "border-r-0 md:border-r " : "") +
                  (index === 2 ? "md:border-r " : "")
                }
              >
                <dt className="flex items-center gap-2 text-[12px] font-medium text-[#64748B]">
                  <span aria-hidden="true" className={"h-1.5 w-1.5 shrink-0 rounded-full " + metric.dot} />
                  {metric.label}
                </dt>
                <dd className="mt-1 text-[24px] font-medium leading-none tracking-[-0.035em] text-[#020617]">
                  {metric.value.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="active-alerts-heading" className="mt-5 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[#D8E1EC] pb-2.5">
            <h2 id="active-alerts-heading" className="text-[15px] font-semibold text-[#020617]">Active alerts</h2>
            <p className="text-[11px] leading-5 text-[#64748B]">Snapshot generated {formatDateTime(snapshot.generatedAt)}</p>
          </div>
          <p className="py-2 text-[12px] leading-5 text-[#64748B]">
            Alerts clear automatically when the underlying authoritative signal clears.
          </p>

          {snapshot.alerts.length === 0 ? (
            <div role="status" className="border-y border-[#E7ECF5] py-5">
              <h3 className="text-[14px] font-semibold text-[#020617]">No active operational alerts</h3>
              <p className="mt-1 text-[13px] leading-5 text-[#64748B]">
                The monitored Kurioticket operational signals currently have no alert conditions.
              </p>
            </div>
          ) : (
            <ul aria-label="Operational alerts" className="divide-y divide-[#E7ECF5] border-b border-[#D8E1EC]">
              {snapshot.alerts.map((alert) => {
                const sourceHref = alertSourceHref(alert.actionHref);
                const critical = alert.severity === "CRITICAL";
                return (
                  <li key={alert.id} data-alert-row className="min-w-0 py-4">
                    <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium leading-4">
                          <span className={"inline-flex items-center gap-1.5 " + (critical ? "text-rose-700" : "text-amber-700")}>
                            <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + (critical ? "bg-rose-500" : "bg-amber-500")} />
                            {critical ? "Critical" : "Warning"}
                          </span>
                          <span aria-hidden="true" className="text-[#94A3B8]">·</span>
                          <span className="text-[#475569]">{sourceLabel(alert.source)}</span>
                          <span aria-hidden="true" className="text-[#94A3B8]">·</span>
                          <span className={alert.acknowledged ? "text-[#64748B]" : "font-semibold text-[#004BB8]"}>
                            {alert.acknowledged ? "Acknowledged" : "Unread"}
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-[14px] font-semibold leading-5 text-[#020617]">{alert.title}</h3>
                        <p className="mt-1 max-w-4xl break-words text-[13px] leading-5 text-[#475569]">{alert.message}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] leading-4 text-[#64748B]">
                          {alert.signalAt ? <span>Signal: {formatDateTime(alert.signalAt)}</span> : null}
                          {alert.acknowledgedAt ? <span>Acknowledged: {formatDateTime(alert.acknowledgedAt)}</span> : null}
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
                        {sourceHref ? (
                          <Link
                            href={sourceHref}
                            className="inline-flex min-h-9 shrink-0 items-center rounded-md border border-[#D8E1EC] bg-white px-3 text-[12px] font-semibold text-[#334155] transition-colors hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
                          >
                            Open source
                          </Link>
                        ) : null}
                        {alert.key === "system.database.unavailable" ? null : alert.signalToken.startsWith("unpersisted:") ? (
                          <span className="max-w-xs text-[12px] leading-5 text-[#64748B]">
                            Acknowledgement is unavailable until monitoring-state storage recovers.
                          </span>
                        ) : (
                          <AdminAlertAcknowledgeButton
                            alertKey={alert.key}
                            signalToken={alert.signalToken}
                            acknowledged={alert.acknowledged}
                            rowStyle
                          />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <details data-monitoring-boundaries className="group mt-4 border-b border-[#D8E1EC] py-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-[#020617]">Monitoring boundaries</span>
              <span className="mt-0.5 block text-[12px] leading-5 text-[#64748B]">Coverage, limitations, and alert behavior</span>
            </span>
            <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-[#64748B] transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-2 pb-2 pt-3 text-[12px] leading-6 text-[#475569]">
            <p>
              Alerts are derived from authoritative System/database health, ready provider operational health, Email Delivery, CMS integrity, Homepage Fare readiness, configured Flight Status telemetry, and authenticated Confirmed Trips delivery failures when a provider is explicitly configured. Kurioticket does not fabricate alerts for inactive integrations or for booking-confirmation volume where no trustworthy expected cadence exists.
            </p>
            <p>
              Global coverage also includes sustained failures in enabled flight, hotel and car searches in this deployment, explicitly urgent support tickets awaiting team action, and active administrators whose two-factor protection was disabled within the last 24 hours and remains disabled. Account and support records are scoped to the current database. Routine activity and isolated low-volume search failures do not create alerts. Unavailable monitoring data is reported separately, never as a healthy zero.
            </p>
          </div>
        </details>
      </div>
    </AdminPageShell>
  );
}
