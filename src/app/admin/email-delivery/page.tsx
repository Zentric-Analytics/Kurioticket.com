import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { EmailDeliveryTestButton } from "@/components/admin/EmailDeliveryTestButton";
import { getEmailDeliveryHealthSnapshot } from "@/services/emailDeliveryService";

export const metadata = { title: "Admin Email Delivery Operations" };

type StatusTone = "good" | "bad" | "warn" | "neutral" | "info";

const statusStyles: Record<StatusTone, { text: string; dot: string }> = {
  good: { text: "text-emerald-700", dot: "bg-emerald-500" },
  bad: { text: "text-rose-700", dot: "bg-rose-500" },
  warn: { text: "text-amber-700", dot: "bg-amber-500" },
  neutral: { text: "text-[#475569]", dot: "bg-slate-400" },
  info: { text: "text-[#004BB8]", dot: "bg-[#004BB8]" },
};

const statusLabels: Record<string, string> = {
  DELIVERED: "Delivered",
  OPENED: "Opened",
  CLICKED: "Clicked",
  SENT: "Sent",
  FAILED: "Failed",
  BOUNCED: "Bounced",
  COMPLAINED: "Complained",
  SUPPRESSED: "Suppressed",
  DELIVERY_DELAYED: "Delayed",
  QUEUED: "Queued",
};

function formatDateTime(value: Date | string | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusTone(status: string): StatusTone {
  if (["DELIVERED", "OPENED", "CLICKED", "SENT"].includes(status)) return "good";
  if (["FAILED", "BOUNCED", "COMPLAINED", "SUPPRESSED"].includes(status)) return "bad";
  if (status === "DELIVERY_DELAYED") return "warn";
  return "neutral";
}

function StatusIndicator({ value, tone }: { value: string; tone: StatusTone }) {
  const style = statusStyles[tone];
  return (
    <span className={"inline-flex items-center gap-1.5 text-[12px] font-medium " + style.text}>
      <span aria-hidden="true" className={"h-1.5 w-1.5 shrink-0 rounded-full " + style.dot} />
      {value}
    </span>
  );
}

export default async function AdminEmailDeliveryOperationsPage() {
  const health = await getEmailDeliveryHealthSnapshot();
  const configured = {
    resendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    resendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
    resendWebhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
  };
  const sendingReady = configured.resendApiKey && configured.resendFromEmail;

  const metrics = [
    {
      label: "Last 24 hours",
      value: health.dataAvailable ? health.last24Hours.toLocaleString() : "Unavailable",
      hint: "Tracked transactional email attempts",
    },
    {
      label: "Failures",
      value: health.dataAvailable ? health.failures.toLocaleString() : "Unavailable",
      hint: "Failed, bounced, complained or suppressed in 24 hours",
    },
    {
      label: "Delayed",
      value: health.dataAvailable ? health.delayed.toLocaleString() : "Unavailable",
      hint: "Provider-reported delays in 24 hours",
    },
    {
      label: "Suppressions",
      value: health.dataAvailable ? health.suppressed.toLocaleString() : "Unavailable",
      hint: "Current addresses protected from optional sends",
    },
  ];

  return (
    <AdminPageShell
      title="Email Delivery Operations"
      description="Monitor transactional email configuration and delivery health without exposing credentials, raw provider payloads, or customer email addresses."
    >
      <div className="w-full min-w-0 bg-white text-[#020617]">
        {!health.dataAvailable ? (
          <section aria-labelledby="email-telemetry-unavailable" className="border-b border-[#D8E1EC] pb-4">
            <h2 id="email-telemetry-unavailable" className="text-[14px] font-semibold text-amber-700">Email telemetry unavailable</h2>
            <p className="mt-1 max-w-[860px] text-[13px] leading-5 text-[#64748B]">
              The authoritative email-delivery store could not be read. Delivery counts and recent-delivery rows are unavailable rather than shown as zero activity.
            </p>
          </section>
        ) : null}

        <section aria-label="Email delivery summary" className="border-b border-[#D8E1EC] py-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-0">
                <p className="text-[12px] text-[#64748B]">{metric.label}</p>
                <p className="mt-1 text-[20px] font-semibold leading-none tabular-nums text-[#020617]">{metric.value}</p>
                <p className="mt-1.5 text-[11px] leading-4 text-[#64748B]">{metric.hint}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid border-b border-[#D8E1EC] lg:grid-cols-2" aria-label="Email delivery controls">
          <div className="py-4 lg:border-r lg:border-[#E7ECF5] lg:pr-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[#020617]">Delivery configuration</h2>
                <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Presence checks only. Credential values are never displayed.</p>
              </div>
              <StatusIndicator value={sendingReady ? "Sending ready" : "Setup required"} tone={sendingReady ? "good" : "warn"} />
            </div>

            <div className="mt-3 divide-y divide-[#E7ECF5] border-y border-[#E7ECF5]">
              {([
                ["Resend API key", configured.resendApiKey],
                ["Sender address", configured.resendFromEmail],
                ["Webhook secret", configured.resendWebhookSecret],
              ] as const).map(([label, ready]) => (
                <div key={String(label)} className="flex min-h-11 items-center justify-between gap-4 px-1 py-2.5">
                  <span className="text-[13px] font-medium text-[#020617]">{String(label)}</span>
                  <StatusIndicator value={ready ? "Configured" : "Not configured"} tone={ready ? "good" : "warn"} />
                </div>
              ))}
            </div>
          </div>

          <div className="py-4 lg:pl-8">
            <h2 className="text-[15px] font-semibold text-[#020617]">Test transactional delivery</h2>
            <p className="mt-1 max-w-[620px] text-[12px] leading-5 text-[#64748B]">
              Send one real transactional test to the signed-in admin email. Successful sends are written to the admin audit log.
            </p>
            <div className="mt-3">
              <EmailDeliveryTestButton enabled={sendingReady} />
            </div>
            <p className="mt-3 max-w-[620px] text-[12px] leading-5 text-[#64748B]">
              Safety: only the current signed-in admin can receive this test; arbitrary recipients and credential values are never exposed.
            </p>
          </div>
        </section>

        <section aria-labelledby="recent-deliveries-heading" className="py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2">
            <h2 id="recent-deliveries-heading" className="text-[15px] font-semibold text-[#020617]">Recent deliveries</h2>
            <p className="text-[12px] text-[#64748B]">Latest 10 deliveries</p>
          </div>

          {health.dataAvailable && health.latest.length > 0 ? (
            <div role="region" aria-labelledby="recent-deliveries-heading" tabIndex={0} className="min-w-0 overflow-x-auto border-y border-[#D8E1EC]">
              <table className="w-full min-w-[980px] table-fixed text-[13px]">
                <caption className="sr-only">Latest tracked transactional email deliveries.</caption>
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[22%]" />
                  <col className="w-[14%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#D8E1EC] text-left text-[12px] font-medium uppercase text-[#475569]">
                    <th scope="col" className="px-3 py-3">Template</th>
                    <th scope="col" className="px-3 py-3">Recipient</th>
                    <th scope="col" className="px-3 py-3">Status</th>
                    <th scope="col" className="px-3 py-3">Created</th>
                    <th scope="col" className="px-3 py-3">Sent</th>
                    <th scope="col" className="px-3 py-3">Delivered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7ECF5]">
                  {health.latest.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="px-3 py-3 font-medium text-[#020617]">{delivery.template}</td>
                      <td className="px-3 py-3 text-[#475569]">{delivery.toEmail}</td>
                      <td className="px-3 py-3">
                        <StatusIndicator value={statusLabels[delivery.status] || delivery.status} tone={statusTone(delivery.status)} />
                      </td>
                      <td className="px-3 py-3 text-[12px] text-[#475569]">{formatDateTime(delivery.createdAt)}</td>
                      <td className="px-3 py-3 text-[12px] text-[#475569]">{formatDateTime(delivery.sentAt)}</td>
                      <td className="px-3 py-3 text-[12px] text-[#475569]">{formatDateTime(delivery.deliveredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : health.dataAvailable ? (
            <div className="border-y border-[#D8E1EC] py-6">
              <p className="text-[13px] font-medium text-[#020617]">No tracked email deliveries</p>
              <p className="mt-1 text-[12px] text-[#64748B]">No email-delivery records are available yet in this environment.</p>
            </div>
          ) : (
            <div className="border-y border-[#D8E1EC] py-6">
              <p className="text-[13px] font-medium text-amber-700">Delivery history unavailable</p>
              <p className="mt-1 text-[12px] text-[#64748B]">Recent deliveries are hidden until the authoritative delivery store can be read again.</p>
            </div>
          )}
        </section>
      </div>
    </AdminPageShell>
  );
}
