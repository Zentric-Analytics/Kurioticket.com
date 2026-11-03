import { AlertTriangle, ChevronDown } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminAlertAcknowledgeButton } from "@/components/admin/AdminAlertAcknowledgeButton";
import { AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { isProtectedAdminEmail } from "@/lib/admin";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminAlertSnapshot, type AdminOperationalAlert } from "@/services/adminAlertService";

function formatSignalTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/**
 * Render only real, confirmation-specific alerts within Delivery Health.
 * The caller renders this component only for a configured confirmation feed.
 * No alert means no extra panel or duplicate inactive-monitoring message.
 */
export async function ConfirmedTripDeliveryAlerts() {
  const session = await requireAdminSession("/admin/confirmed-trips");
  if (!isProtectedAdminEmail(session.user.email)) redirect("/dashboard");

  let alerts: AdminOperationalAlert[];
  try {
    const snapshot = await getAdminAlertSnapshot(session.user.id);
    alerts = snapshot.alerts.filter((alert) => alert.source === "CONFIRMED_TRIPS");
  } catch (error) {
    console.error(
      "[admin:confirmed-trips:delivery-alerts] alert data unavailable",
      error instanceof Error ? error.name : "unknown",
    );
    return (
      <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-5 text-amber-900">
        Confirmation alerts could not be checked. Do not assume there are no alerts.
      </p>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <details className="group mt-3 min-w-0 rounded-lg border border-amber-200 bg-amber-50/40">
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold leading-5 text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          <span>{alerts.length} active confirmation alert{alerts.length === 1 ? "" : "s"}</span>
        </span>
        <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-2 border-t border-amber-200/70 p-3">
        {alerts.map((alert) => (
          <section key={alert.id} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <AdminStatusBadge tone={alert.severity === "CRITICAL" ? "bad" : "warn"}>{alert.severity}</AdminStatusBadge>
              <AdminStatusBadge tone={alert.acknowledged ? "neutral" : "info"}>{alert.acknowledged ? "ACKNOWLEDGED" : "UNREAD"}</AdminStatusBadge>
            </div>
            <h3 className="mt-2 text-sm font-semibold leading-5 text-slate-950">{alert.title}</h3>
            <p className="mt-1 break-words text-[13px] leading-5 text-slate-600">{alert.message}</p>
            {alert.signalAt ? (
              <p className="mt-1 text-xs leading-5 text-slate-500">Latest signal: {formatSignalTime(alert.signalAt)}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <AdminAlertAcknowledgeButton alertKey={alert.key} signalToken={alert.signalToken} acknowledged={alert.acknowledged} />
            </div>
          </section>
        ))}
        <p className="text-xs leading-5 text-slate-600">
          Acknowledging an alert does not resolve its cause.
        </p>
      </div>
    </details>
  );
}
