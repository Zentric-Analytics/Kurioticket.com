import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPageShell, AdminSectionCard, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { AdminAlertAcknowledgeButton } from "@/components/admin/AdminAlertAcknowledgeButton";
import { isProtectedAdminEmail } from "@/lib/admin";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminAlertSnapshot, type AdminAlertSnapshot } from "@/services/adminAlertService";
import { getPartnerConfirmationBinding } from "@/services/partnerConfirmationDeliveryService";

export const metadata = { title: "Admin Confirmation Alerts" };

const deliveryHealthHref = "/admin/confirmed-trips#confirmation-delivery-health-title";

function formatAlertTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function AdminConfirmedTripAlertsPage() {
  const session = await requireAdminSession("/admin/confirmed-trips/alerts");
  if (!isProtectedAdminEmail(session.user.email)) redirect("/dashboard");

  const binding = getPartnerConfirmationBinding();
  let snapshot: AdminAlertSnapshot | null = null;
  let alertsUnavailable = false;

  if (binding.configured) {
    try {
      snapshot = await getAdminAlertSnapshot(session.user.id);
    } catch (error) {
      console.error("[admin:confirmation-alerts] alert data unavailable", error instanceof Error ? error.name : "unknown");
      alertsUnavailable = true;
    }
  }

  // The global alert feed includes System, Provider, Email, CMS, and other alerts.
  // Never present those unrelated alerts as confirmed-trip delivery problems.
  const alerts = snapshot?.alerts.filter((alert) => alert.source === "CONFIRMED_TRIPS") ?? [];

  return (
    <AdminPageShell title="Confirmation alerts" hideHeader>
      <div role="group" aria-label="Confirmation alert navigation" className="mb-3 flex min-w-0 justify-end">
        <Link href={deliveryHealthHref} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2">
          <ArrowLeft size={15} aria-hidden="true" />
          Back to Confirmed Trips
        </Link>
      </div>

      <AdminSectionCard className="min-w-0 p-4 sm:p-5 lg:p-6">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-6 tracking-tight text-slate-950">Confirmation alerts</h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-600">Issues with authenticated provider confirmation deliveries.</p>
          </div>
          <AdminStatusBadge tone={!binding.configured ? "neutral" : alertsUnavailable ? "warn" : alerts.length ? "warn" : "good"}>
            {!binding.configured
              ? "Monitoring inactive"
              : alertsUnavailable
                ? "Alert data unavailable"
                : alerts.length === 0
                  ? "No alerts reported"
                  : <>{alerts.length} current alert{alerts.length === 1 ? "" : "s"}</>}
          </AdminStatusBadge>
        </div>

        {!binding.configured ? (
          <p role="status" className="mt-4 rounded-lg bg-slate-50 px-3 py-3 text-[13px] leading-5 text-slate-700">
            No confirmation provider feed is configured. Confirmation alert monitoring is inactive.
          </p>
        ) : alertsUnavailable ? (
          <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-[13px] leading-5 text-amber-900">
            Confirmation alerts could not be loaded. No alert count is assumed.
          </p>
        ) : alerts.length === 0 ? (
          <p role="status" className="mt-4 rounded-lg bg-slate-50 px-3 py-3 text-[13px] leading-5 text-slate-700">
            No confirmation delivery alerts are currently reported. This does not prove that provider callbacks are arriving.
          </p>
        ) : (
          <div aria-label="Confirmation delivery alerts" className="mt-4 space-y-3">
            {alerts.map((alert) => (
              <section key={alert.id} className="min-w-0 rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <AdminStatusBadge tone={alert.severity === "CRITICAL" ? "bad" : "warn"}>{alert.severity}</AdminStatusBadge>
                  <AdminStatusBadge tone={alert.acknowledged ? "neutral" : "info"}>{alert.acknowledged ? "ACKNOWLEDGED" : "UNREAD"}</AdminStatusBadge>
                </div>
                <h3 className="mt-2 text-sm font-semibold leading-5 text-slate-950">{alert.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-slate-600">{alert.message}</p>
                {alert.signalAt ? (
                  <p className="mt-1 text-xs leading-5 text-slate-500">Latest signal: {formatAlertTime(alert.signalAt)}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Link href={deliveryHealthHref} className="inline-flex min-h-9 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-indigo-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400">
                    Review delivery health
                  </Link>
                  <AdminAlertAcknowledgeButton alertKey={alert.key} signalToken={alert.signalToken} acknowledged={alert.acknowledged} />
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Confirmation alerts cover rejected authenticated callbacks or unavailable receipt telemetry when a provider is configured. Acknowledging an alert does not resolve its cause.
        </p>
      </AdminSectionCard>
    </AdminPageShell>
  );
}
