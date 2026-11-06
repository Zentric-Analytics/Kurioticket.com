import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { EmailDeliveryRangeFilter, type EmailDeliveryRange } from "@/components/admin/EmailDeliveryRangeFilter";
import { EmailDeliveryTestButton } from "@/components/admin/EmailDeliveryTestButton";
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

export default async function AdminEmailDeliveryPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const rangeState = resolveRange(raw);
  const requestedHistoryPage = parseHistoryPage(one(raw.historyPage));
  const operations = rangeState.error
    ? null
    : await getEmailDeliveryOperationsSnapshot({
        from: rangeState.from,
        to: rangeState.to,
        page: requestedHistoryPage,
      });
  const historyStart = operations?.dataAvailable && operations.historyTotal > 0
    ? (operations.historyPage - 1) * operations.historyPageSize + 1
    : 0;
  const historyEnd = operations?.dataAvailable
    ? Math.min(operations.historyPage * operations.historyPageSize, operations.historyTotal)
    : 0;

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
      <Link
        href="/admin/system"
        className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded-sm text-[12px] font-medium text-[#64748B] hover:text-[#004BB8]"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to System
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#D8E1EC] pb-3">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-[#020617]">Email Delivery</h1>
        <EmailDeliveryRangeFilter
          range={rangeState.range}
          fromDate={rangeState.fromDate}
          toDate={rangeState.toDate}
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
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-2">
          <h2 id="delivery-history-heading" className="text-[15px] font-semibold text-[#020617]">Delivery history</h2>
          {operations?.dataAvailable ? (
            <p className="text-[12px] text-[#64748B]">
              {operations.historyTotal > 0
                ? `Showing ${historyStart.toLocaleString()}–${historyEnd.toLocaleString()} of ${operations.historyTotal.toLocaleString()} deliveries in ${rangeState.label.toLowerCase()}`
                : `0 deliveries in ${rangeState.label.toLowerCase()}`}
            </p>
          ) : null}
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
                    <td className="px-3 py-3 text-[12px] text-[#475569]">{formatDateTime(delivery.createdAt)}</td>
                    <td className="px-3 py-3 text-[12px] text-[#475569]">{formatDateTime(delivery.sentAt)}</td>
                    <td className="px-3 py-3 text-[12px] text-[#475569]">{formatDateTime(delivery.deliveredAt)}</td>
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
  return value === "7d" || value === "30d" || value === "90d" || value === "custom" ? value : "24h";
}

function resolveRange(raw: Record<string, string | string[] | undefined>) {
  const range = normalizeRange(one(raw.range));
  const now = new Date();

  if (range !== "custom") {
    const durationMs =
      range === "7d" ? 7 * 24 * 60 * 60 * 1000
        : range === "30d" ? 30 * 24 * 60 * 60 * 1000
          : range === "90d" ? 90 * 24 * 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;
    return {
      range,
      from: new Date(now.getTime() - durationMs),
      to: now,
      fromDate: "",
      toDate: "",
      label: range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : range === "90d" ? "Last 90 days" : "Last 24 hours",
      error: "",
    };
  }

  const fromDate = one(raw.fromDate);
  const toDate = one(raw.toDate);
  if (!validDate(fromDate) || !validDate(toDate)) {
    return { range, from: now, to: now, fromDate, toDate, label: "Custom range", error: "Choose both a valid start date and end date." };
  }

  const from = new Date(fromDate + "T00:00:00.000Z");
  const requestedEnd = new Date(toDate + "T00:00:00.000Z");
  requestedEnd.setUTCDate(requestedEnd.getUTCDate() + 1);
  const to = new Date(Math.min(requestedEnd.getTime(), now.getTime()));

  if (from.getTime() >= to.getTime()) {
    return { range, from, to, fromDate, toDate, label: "Custom range", error: "The start date must be before the end of the selected range." };
  }
  if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
    return { range, from, to, fromDate, toDate, label: "Custom range", error: "Custom ranges can cover up to 90 days." };
  }

  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return {
    range,
    from,
    to,
    fromDate,
    toDate,
    label: formatter.format(from) + " – " + formatter.format(new Date(to.getTime() - 1)),
    error: "",
  };
}

function validDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
