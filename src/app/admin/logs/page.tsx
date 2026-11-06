import Link from "next/link";

import { AdminAuditLogsToolbar } from "@/components/admin/AdminAuditLogsToolbar";
import { formatDateTime } from "@/lib/admin-data";
import type { AdminAuditRead } from "@/services/adminAuditReadContract";
import { adminAuditReads } from "@/services/adminAuditReadService";

export const metadata = { title: "Admin Audit Logs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type AuditRange = "24h" | "7d" | "30d" | "90d" | "custom";

const rowGrid = "md:grid-cols-[minmax(150px,0.72fr)_minmax(360px,1.55fr)_minmax(240px,1.1fr)_minmax(220px,0.95fr)]";

const actionLabels: Record<string, string> = {
  CMS_CONTENT_PUBLISHED: "CMS content published",
  ADMIN_ALERT_CMS_STATE: "CMS alert state changed",
  PROVIDER_RETESTED: "Provider retested",
  CMS_LEGACY_FALLBACK_REACTIVATED: "CMS legacy fallback reactivated",
  EMAIL_DELIVERY_TEST_SENT: "Email delivery test sent",
  USER_ROLE_UPDATED: "User role updated",
  USER_SOFT_DELETED: "User deleted",
  FEATURE_CONTROL_UPDATED: "Feature control updated",
  ADMIN_NOTIFICATION_PREFERENCE_UPDATED: "Notification preference updated",
};

export default async function AdminLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const now = new Date();
  const range = normalizeRange(one(raw.range));
  const fromDate = one(raw.fromDate);
  const toDate = one(raw.toDate);
  const params = auditParams(raw, range, now);
  const result = await adminAuditReads.list(params);
  const pageHref = currentHref(raw, range);

  return (
    <div className="w-full min-w-0 bg-white text-[#020617]">
        <header className="pb-3">
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-[#020617]">Audit Logs</h1>
        </header>

        <AdminAuditLogsToolbar
          action={one(raw.action)}
          adminEmail={one(raw.adminEmail)}
          targetType={one(raw.targetType)}
          targetEmail={one(raw.targetEmail)}
          range={range}
          fromDate={fromDate}
          toDate={toDate}
          pageHref={pageHref}
        />

        {result.status === "ok" ? (
          result.data.items.length === 0 ? (
            <AuditState
              title="No audit entries found"
              message="No recorded admin or system actions match the selected filters and date range."
            />
          ) : (
            <section aria-labelledby="audit-records-heading" className="pt-4">
              <div className="pb-2">
                <h2 id="audit-records-heading" className="text-[15px] font-semibold text-[#020617]">Audit records</h2>
              </div>

              <div role="region" aria-label="Audit log records" tabIndex={0} className="min-w-0 overflow-x-auto border-y border-[#D8E1EC]">
                <div data-audit-header className={"hidden min-w-[1080px] gap-4 border-b border-[#D8E1EC] px-3 py-3 text-[12px] font-medium uppercase text-[#475569] md:grid " + rowGrid}>
                  <span>Created</span>
                  <span>Admin</span>
                  <span>Action</span>
                  <span>Target</span>
                </div>
                <div className="min-w-[1080px] divide-y divide-[#E7ECF5]">
                  {result.data.items.map(log => <AuditRow key={log.id} log={log} />)}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="text-[12px] text-[#64748B]">Newest first · up to 100 records per page.</p>
                <div className="flex items-center gap-4">
                  {one(raw.cursor) ? (
                    <Link href={newestHref(raw, range)} className="text-[13px] font-medium text-[#475569] hover:text-[#020617] hover:underline">
                      Back to newest
                    </Link>
                  ) : null}
                  {result.data.nextCursor ? (
                    <Link href={cursorHref(raw, range, result.data.nextCursor)} className="text-[13px] font-medium text-[#004BB8] hover:underline">
                      Older records ›
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          )
        ) : (
          <AuditState
            tone={result.status === "invalid" ? "warn" : result.status === "forbidden" ? "bad" : "warn"}
            title={result.status === "invalid" ? "Invalid audit filters" : result.status === "forbidden" ? "Admin access required" : "Audit logs unavailable"}
            message={
              "issues" in result
                ? result.issues.map(issue => issue.field + ": " + issue.message).join(" ")
                : result.status === "forbidden"
                  ? "Your current session is not permitted to read the audit trail."
                  : "The audit reader could not verify log data. An unavailable read is not shown as an empty history."
            }
          />
        )}
    </div>
  );
}

function AuditRow({ log }: { log: AdminAuditRead }) {
  const content = (
    <>
      <time dateTime={log.createdAt} className="text-[12px] leading-5 text-[#475569]">{formatDateTime(new Date(log.createdAt))}</time>
      <div className="min-w-0">
        <p className="break-words text-[13px] font-medium text-[#020617] md:whitespace-nowrap">{log.adminEmail}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#020617]">{actionLabel(log.action)}</p>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[#020617]">{identifierLabel(log.targetType)}</p>
      </div>
    </>
  );

  return (
    <details data-audit-row={log.id} className="group">
      <summary
        title="View audit details"
        className={"grid cursor-pointer list-none gap-2 px-3 py-3 transition-colors hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] md:items-start md:gap-4 [&::-webkit-details-marker]:hidden " + rowGrid}
      >
        {content}
      </summary>
      <div className="border-t border-[#EEF2F7] px-3 py-3">
        <dl className="grid max-w-[980px] gap-x-8 gap-y-3 border-l-2 border-[#D8E1EC] pl-3 sm:grid-cols-2 lg:grid-cols-4">
          <AuditTechnicalDetail label="Admin ID" value={log.adminUserId || "System event"} />
          <AuditTechnicalDetail label="Action code" value={log.action} />
          <AuditTechnicalDetail label="Target ID" value={log.targetId || "Not provided"} />
          {log.targetEmail ? <AuditTechnicalDetail label="Target email" value={log.targetEmail} /> : null}
        </dl>
      </div>
    </details>
  );
}

function AuditTechnicalDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-[0.02em] text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-all text-[12px] text-[#020617]">{value}</dd>
    </div>
  );
}

function AuditState({ title, message, tone = "neutral" }: { title: string; message: string; tone?: "neutral" | "warn" | "bad" }) {
  const titleClass = tone === "bad" ? "text-rose-700" : tone === "warn" ? "text-amber-700" : "text-[#020617]";
  return (
    <section role={tone === "neutral" ? undefined : "status"} className="border-b border-[#D8E1EC] py-8">
      <p className={"text-[14px] font-semibold " + titleClass}>{title}</p>
      <p className="mt-1 max-w-[760px] text-[13px] leading-5 text-[#64748B]">{message}</p>
    </section>
  );
}

function actionLabel(action: string) {
  return actionLabels[action] || identifierLabel(action);
}

function identifierLabel(value: string) {
  const acronyms: Record<string, string> = { admin: "Admin", api: "API", cms: "CMS", faq: "FAQ", id: "ID", url: "URL" };
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return words.map((word, index) => acronyms[word] || (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(" ");
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function normalizeRange(value: string): AuditRange {
  return value === "24h" || value === "30d" || value === "90d" || value === "custom" ? value : "7d";
}

function auditParams(raw: Record<string, string | string[] | undefined>, range: AuditRange, now: Date) {
  const params = new URLSearchParams();
  const pageOnlyKeys = new Set(["range", "fromDate", "toDate"]);

  // Preserve the reader's validation boundary: repeated reader filters and
  // unknown query keys must reach parseAdminAuditQuery so they fail closed
  // instead of silently broadening the audit history.
  for (const [key, value] of Object.entries(raw)) {
    if (pageOnlyKeys.has(key) || value === undefined) continue;
    if (Array.isArray(value)) value.forEach(item => params.append(key, item));
    else params.append(key, value);
  }
  if (!params.has("limit")) params.set("limit", "100");

  if (params.has("cursor") || params.has("from") || params.has("to")) return params;

  if (range === "custom") {
    const fromDate = one(raw.fromDate);
    const toDate = one(raw.toDate);
    params.set("from", /^\d{4}-\d{2}-\d{2}$/.test(fromDate) ? fromDate + "T00:00:00.000Z" : fromDate);
    params.set("to", customEndIso(toDate, now));
    return params;
  }

  const durationMs = range === "24h" ? 24 * 60 * 60 * 1000
    : range === "30d" ? 30 * 24 * 60 * 60 * 1000
      : range === "90d" ? 90 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;
  params.set("from", new Date(now.getTime() - durationMs).toISOString());
  params.set("to", now.toISOString());
  return params;
}

function customEndIso(value: string, now: Date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const end = new Date(value + "T00:00:00.000Z");
  end.setUTCDate(end.getUTCDate() + 1);
  return new Date(Math.min(end.getTime(), now.getTime())).toISOString();
}

function currentHref(raw: Record<string, string | string[] | undefined>, range: AuditRange) {
  const params = new URLSearchParams();
  params.set("range", range);
  for (const key of ["action", "adminEmail", "targetType", "targetEmail", "fromDate", "toDate", "cursor"] as const) {
    const value = one(raw[key]);
    if (value) params.set(key, value);
  }
  return "/admin/logs?" + params.toString();
}

function cursorHref(raw: Record<string, string | string[] | undefined>, range: AuditRange, cursor: string) {
  const params = new URLSearchParams(currentHref(raw, range).split("?")[1]);
  params.set("cursor", cursor);
  return "/admin/logs?" + params.toString();
}

function newestHref(raw: Record<string, string | string[] | undefined>, range: AuditRange) {
  const params = new URLSearchParams(currentHref(raw, range).split("?")[1]);
  params.delete("cursor");
  return "/admin/logs?" + params.toString();
}
