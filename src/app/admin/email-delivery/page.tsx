import Link from "next/link";

import { EmailDeliveryRangeFilter, type EmailDeliveryRange } from "@/components/admin/EmailDeliveryRangeFilter";
import { EmailDeliveryTestButton } from "@/components/admin/EmailDeliveryTestButton";
import { adminLocalDate, formatAdminTimeZoneLabel, formatViewerTimestamp } from "@/lib/adminLocalTime";
import { adminCustomDateRange, adminRollingRange } from "@/lib/adminReportingRanges";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { getEmailDeliveryOperationsSnapshot } from "@/services/emailDeliveryService";

export const metadata = { title: "Admin Email Delivery" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type StatusTone = "good" | "bad" | "warn" | "neutral" | "info";

const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

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

function DeliveryTime({ value, timeZone }: { value: Date | null; timeZone: string }) {
  if (!value || !Number.isFinite(value.getTime())) return "—";
  return <time dateTime={value.toISOString()}>{formatViewerTimestamp(value, timeZone)}</time>;
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

export default async function AdminEmailDeliveryPage({ searchParams }: { searchParams: SearchParams }) {
  const [raw, timeZone] = await Promise.all([searchParams, getAdminViewerTimeZone()]);
  const now = new Date();
  const rangeState = resolveRange(raw, now, timeZone);
  const requestedHistoryPage = parseHistoryPage(one(raw.historyPage));
  const operations = rangeState.error
    ? null
    : await getEmailDeliveryOperationsSnapshot({
        from: rangeState.from,
        to: rangeState.to,
        page: requestedHistoryPage,
      });
  const configured = {
    resendApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    resendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
    resendWebhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET?.trim()),
  };
  const sendingReady = configured.resendApiKey && configured.resendFromEmail;
  const configurationChecks = [
    ["Resend API key", configured.resendApiKey],
    ["Sender address", configured.resendFromEmail],
    ["Webhook secret", configured.resendWebhookSecret],
  ] as const;
  const missingConfiguration = configurationChecks.filter(([, ready]) => !ready);

  const metrics = operations ? [
    { label: "Email deliveries", value: operations.dataAvailable ? operations.deliveries.toLocaleString() : "Unavailable", dot: "bg-[#004BB8]" },
    { label: "Delivered", value: operations.dataAvailable ? operations.delivered.toLocaleString() : "Unavailable", dot: "bg-emerald-500" },
    { label: "Delayed", value: operations.dataAvailable ? operations.delayed.toLocaleString() : "Unavailable", dot: "bg-amber-500" },
    { label: "Failed", value: operations.dataAvailable ? operations.failures.toLocaleString() : "Unavailable", dot: "bg-rose-500" },
  ] : [];

  return (
    <div className="w-full min-w-0 bg-white text-[#020617]">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D8E1EC] pb-3">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-[#020617]">Email Delivery</h1>
        <EmailDeliveryRangeFilter
          range={rangeState.range}
          fromDate={rangeState.fromDate}
          toDate={rangeState.toDate}
          today={adminLocalDate(now, timeZone)}
          timeZone={timeZone}
          timeZoneLabel={formatAdminTimeZoneLabel(timeZone, now)}
        />
      </header>

      {rangeState.error ? (
        <section role="status" className="border-b border-[#D8E1EC] py-5">
          <p className="text-[14px] font-semibold text-amber-700">Invalid date range</p>
          <p className="mt-1 text-[13px] leading-5 text-[#64748B]">{rangeState.error}</p>
        </section>
      ) : !operations?.dataAvailable ? (
        <section aria-labelledby="email-telemetry-unavailable" className="border-b border-[#D8E1EC] py-5">
          <h2 id="email-telemetry-unavailable" className="text-[14px] font-semibold text-amber-700">Email telemetry unavailable</h2>
          <p className="mt-1 max-w-[860px] text-[13px] leading-5 text-[#64748B]">
            The authoritative email-delivery store could not be read. Delivery counts and history are unavailable rather than shown as zero activity.
          </p>
        </section>
      ) : (
        <section aria-label="Email delivery summary" className="border-b border-[#D8E1EC]">
          <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-[#D8E1EC]">
            {metrics.map((metric) => (
              <div key={metric.label} className="min-w-0 px-3 py-4 first:pl-0 md:px-7 md:first:pl-3">
                <p className="inline-flex items-center gap-2 text-[12px] font-medium text-[#475569]">
                  <span aria-hidden="true" className={"h-1.5 w-1.5 rounded-full " + metric.dot} />
                  {metric.label}
                </p>
                <p className="mt-1 text-[22px] font-semibold leading-none tabular-nums text-[#020617]">{metric.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid border-b border-[#D8E1EC] lg:grid-cols-2" aria-label="Current email delivery state">
        <div className="py-4 lg:border-r lg:border-[#E7ECF5] lg:pr-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[#020617]">Current setup</h2>
            <StatusIndicator value={sendingReady ? "Sending ready" : "Setup required"} tone={sendingReady ? "good" : "warn"} />
          </div>

          {missingConfiguration.length > 0 ? (
            <div className="mt-3 divide-y divide-[#E7ECF5] border-y border-[#E7ECF5]">
              {missingConfiguration.map(([label]) => (
                <div key={String(label)} className="flex min-h-11 items-center justify-between gap-4 px-1 py-2.5">
                  <span className="text-[13px] font-medium text-[#020617]">{String(label)}</span>
                  <StatusIndicator value="Not configured" tone="warn" />
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex min-h-11 items-center justify-between gap-4 border-y border-[#E7ECF5] px-1 py-2.5">
            <span className="text-[13px] font-medium text-[#020617]">Suppressed addresses</span>
            <span className="text-[13px] tabular-nums text-[#475569]">
              {operations?.dataAvailable ? operations.currentSuppressed.toLocaleString() : "Unavailable"}
            </span>
          </div>
        </div>

        <div className="py-4 lg:pl-8">
          <h2 className="text-[15px] font-semibold text-[#020617]">Test email delivery</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Send a test to your admin email.</p>
          <div className="mt-3">
            <EmailDeliveryTestButton enabled={sendingReady} />
          </div>
        </div>
      </section>

      <section aria-labelledby="delivery-history-heading" className="py-4">
        <div className="pb-2">
          <h2 id="delivery-history-heading" className="text-[15px] font-semibold text-[#020617]">Delivery history</h2>
        </div>

        {rangeState.error ? (
          <div className="border-y border-[#D8E1EC] py-6">
            <p className="text-[13px] font-medium text-[#020617]">Select a valid date range</p>
            <p className="mt-1 text-[12px] text-[#64748B]">Delivery history will update after the range is valid.</p>
          </div>
        ) : operations?.dataAvailable && operations.latest.length > 0 ? (
          <>
            <div role="region" aria-labelledby="delivery-history-heading" tabIndex={0} className="min-w-0 overflow-x-auto border-y border-[#D8E1EC]">
              <table className="w-full min-w-[980px] table-fixed text-[13px]">
                <caption className="sr-only">Tracked transactional email activity in the selected date range.</caption>
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
                {operations.latest.map((delivery) => (
                  <tr key={delivery.id}>
                    <td className="px-3 py-3 font-medium text-[#020617]">{delivery.template}</td>
                    <td className="px-3 py-3 text-[#475569]">{delivery.toEmail}</td>
                    <td className="px-3 py-3">
                      <StatusIndicator value={statusLabels[delivery.status] || delivery.status} tone={statusTone(delivery.status)} />
                    </td>
                    <td className="px-3 py-3 text-[12px] text-[#475569]"><DeliveryTime value={delivery.createdAt} timeZone={timeZone} /></td>
                    <td className="px-3 py-3 text-[12px] text-[#475569]"><DeliveryTime value={delivery.sentAt} timeZone={timeZone} /></td>
                    <td className="px-3 py-3 text-[12px] text-[#475569]"><DeliveryTime value={delivery.deliveredAt} timeZone={timeZone} /></td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            {operations.historyTotalPages > 1 ? (
              <nav aria-label="Delivery history pages" className="flex items-center justify-end gap-4 border-b border-[#D8E1EC] py-3 text-[12px]">
                {operations.historyPage > 1 ? (
                  <Link
                    href={historyPageHref(raw, operations.historyPage - 1)}
                    className="font-medium text-[#004BB8] hover:underline"
                  >
                    ‹ Previous
                  </Link>
                ) : (
                  <span className="text-[#94A3B8]">‹ Previous</span>
                )}
                <span className="tabular-nums text-[#475569]">
                  Page {operations.historyPage.toLocaleString()} of {operations.historyTotalPages.toLocaleString()}
                </span>
                {operations.historyPage < operations.historyTotalPages ? (
                  <Link
                    href={historyPageHref(raw, operations.historyPage + 1)}
                    className="font-medium text-[#004BB8] hover:underline"
                  >
                    Next ›
                  </Link>
                ) : (
                  <span className="text-[#94A3B8]">Next ›</span>
                )}
              </nav>
            ) : null}
          </>
        ) : operations?.dataAvailable ? (
          <div className="border-y border-[#D8E1EC] py-6">
            <p className="text-[13px] font-medium text-[#020617]">No deliveries in this range</p>
            <p className="mt-1 text-[12px] text-[#64748B]">No tracked email-delivery activity falls inside the selected date range.</p>
          </div>
        ) : (
          <div className="border-y border-[#D8E1EC] py-6">
            <p className="text-[13px] font-medium text-amber-700">Delivery history unavailable</p>
            <p className="mt-1 text-[12px] text-[#64748B]">Delivery history is hidden until the authoritative delivery store can be read again.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function historyPageHref(raw: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "historyPage") continue;
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized) params.set(key, normalized);
  }
  if (page > 1) params.set("historyPage", String(page));
  const query = params.toString();
  return query ? `/admin/email-delivery?${query}` : "/admin/email-delivery";
}

function parseHistoryPage(value: string) {
  if (!/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function normalizeRange(value: string): EmailDeliveryRange {
  return value === "today" || value === "24h" || value === "7d" || value === "30d" || value === "90d" || value === "custom" ? value : "today";
}

function resolveRange(raw: Record<string, string | string[] | undefined>, now: Date, timeZone: string) {
  const range = normalizeRange(one(raw.range));

  if (range !== "custom") {
    const from = range === "90d" ? new Date(now.getTime() - MAX_RANGE_MS)
      : new Date(adminRollingRange(range, now, timeZone).from);
    return {
      range,
      from,
      to: now,
      fromDate: "",
      toDate: "",
      error: "",
    };
  }

  const fromDate = one(raw.fromDate);
  const toDate = one(raw.toDate);
  const custom = adminCustomDateRange(fromDate, toDate, now, timeZone);
  if (!custom) {
    return { range, from: now, to: now, fromDate, toDate, error: "Choose valid dates up to today for a range of at most 90 days." };
  }

  return { range, ...custom, fromDate, toDate, error: "" };
}
