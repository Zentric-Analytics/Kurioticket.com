import Link from "next/link";

import {
  AdminDataTable,
  AdminEmptyState,
  AdminMetricCard,
  AdminPageShell,
  AdminSectionCard,
  AdminStatusBadge,
} from "@/components/admin/AdminPageShell";
import { EmailDeliveryTestButton } from "@/components/admin/EmailDeliveryTestButton";
import { getEmailDeliveryHealthSnapshot } from "@/services/emailDeliveryService";

export const metadata = { title: "Admin Email Delivery Operations" };

function formatDateTime(value: Date | string | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusTone(status: string): "good" | "bad" | "warn" | "neutral" | "info" {
  if (["DELIVERED", "OPENED", "CLICKED", "SENT"].includes(status)) return "good";
  if (["FAILED", "BOUNCED", "COMPLAINED", "SUPPRESSED"].includes(status)) return "bad";
  if (status === "DELIVERY_DELAYED") return "warn";
  return "neutral";
}

export default async function AdminEmailDeliveryOperationsPage() {
  const health = await getEmailDeliveryHealthSnapshot();
  const configured = {
    resendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    resendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
    resendWebhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
  };
  const sendingReady = configured.resendApiKey && configured.resendFromEmail;

  return (
    <AdminPageShell
      title="Email Delivery Operations"
      description="Monitor transactional email configuration and delivery health without exposing credentials, raw provider payloads, or customer email addresses."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/system" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            Back to System
          </Link>
          <Link href="/admin/logs" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">
            View audit logs
          </Link>
        </div>
      }
    >
      {!health.dataAvailable ? (
        <AdminEmptyState
          title="Email telemetry unavailable"
          message="The authoritative email-delivery store could not be read. Delivery counts and recent-delivery rows are hidden rather than replaced with zeroes."
        />
      ) : null}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Last 24 hours"
          value={health.dataAvailable ? health.last24Hours : "Unavailable"}
          hint="Tracked transactional email attempts"
          tone={health.dataAvailable ? "info" : "bad"}
        />
        <AdminMetricCard
          label="Failures"
          value={health.dataAvailable ? health.failures : "Unavailable"}
          hint="Failed, bounced, complained or suppressed"
          tone={!health.dataAvailable ? "bad" : health.failures > 0 ? "bad" : "good"}
        />
        <AdminMetricCard
          label="Delayed"
          value={health.dataAvailable ? health.delayed : "Unavailable"}
          hint="Provider-reported delivery delays"
          tone={!health.dataAvailable ? "bad" : health.delayed > 0 ? "warn" : "good"}
        />
        <AdminMetricCard
          label="Suppressions"
          value={health.dataAvailable ? health.suppressed : "Unavailable"}
          hint="Addresses protected from optional sends"
          tone={health.dataAvailable ? "neutral" : "bad"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminSectionCard className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-950">Delivery configuration</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Presence checks only. Credential values are never displayed.
              </p>
            </div>
            <AdminStatusBadge tone={sendingReady ? "good" : "warn"}>
              {sendingReady ? "Sending ready" : "Setup required"}
            </AdminStatusBadge>
          </div>
          <div className="mt-4 space-y-3">
            {([
              ["Resend API key", configured.resendApiKey],
              ["Sender address", configured.resendFromEmail],
              ["Webhook secret", configured.resendWebhookSecret],
            ] as const).map(([label, ready]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <span className="text-sm font-semibold text-slate-600">{String(label)}</span>
                <AdminStatusBadge tone={ready ? "good" : "warn"}>{ready ? "Configured" : "Not configured"}</AdminStatusBadge>
              </div>
            ))}
          </div>
        </AdminSectionCard>

        <AdminSectionCard className="p-5">
          <h2 className="font-black text-slate-950">Test transactional delivery</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Send one real transactional test to the signed-in admin email. Successful sends are written to the admin audit log.
          </p>
          <div className="mt-4">
            <EmailDeliveryTestButton enabled={sendingReady} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <AdminStatusBadge tone="good">Recipient is current admin only</AdminStatusBadge>
            <AdminStatusBadge>No arbitrary recipient input</AdminStatusBadge>
            <AdminStatusBadge>No secrets shown</AdminStatusBadge>
          </div>
        </AdminSectionCard>
      </div>

      <div className="mt-4">
        {health.dataAvailable && health.latest.length > 0 ? (
          <AdminDataTable
            columns={["Template", "Recipient", "Status", "Created", "Sent", "Delivered"]}
            rows={health.latest.map((delivery) => ({
              id: delivery.id,
              cells: [
                <span key="template" className="font-bold text-slate-900">{delivery.template}</span>,
                <span key="recipient" className="font-semibold text-slate-600">{delivery.toEmail}</span>,
                <AdminStatusBadge key="status" tone={statusTone(delivery.status)}>{delivery.status}</AdminStatusBadge>,
                formatDateTime(delivery.createdAt),
                formatDateTime(delivery.sentAt),
                formatDateTime(delivery.deliveredAt),
              ],
            }))}
          />
        ) : health.dataAvailable ? (
          <AdminEmptyState
            title="No tracked email deliveries"
            message="No email-delivery records are available yet in this environment."
          />
        ) : null}
      </div>
    </AdminPageShell>
  );
}
