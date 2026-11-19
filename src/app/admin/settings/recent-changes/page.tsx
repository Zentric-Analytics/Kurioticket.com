import Link from "next/link";
import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { SettingsHistoryRangeControl } from "@/components/admin/SettingsHistoryRangeControl";

import { adminSettingsHistory } from "@/services/adminSettingsHistoryService";
import type { SettingsHistoryCategory, SettingsHistoryEntry, SettingsHistoryRange } from "@/services/adminSettingsHistoryCore";

export const metadata = { title: "Admin Settings - Settings History" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const ranges = ["24h", "7d", "30d", "all", "custom", "90d"] as const;
const categories = ["all", "product", "automation", "team", "legacy"] as const;
const categoryLabels: Record<SettingsHistoryCategory, string> = {
  all: "All Settings", product: "Product availability", automation: "Travel automation",
  team: "Team Access", legacy: "Legacy notifications",
};
const fullHistoryPath = "/admin/settings/recent-changes";
const rowGrid = "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(145px,0.8fr)]";

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}
function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
}
function historyHref(range: SettingsHistoryRange, category: SettingsHistoryCategory, cursor?: string, fromDate = "", toDate = "") {
  const params = new URLSearchParams({ range, category });
  if (cursor) params.set("cursor", cursor);
  if (range === "custom") {
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
  }
  return fullHistoryPath + "?" + params.toString();
}
function ReadOnlyDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</dt>
      <dd className="mt-1 break-words text-[12px] text-[#334155]">{value}</dd>
    </div>
  );
}
function SettingsHistoryRow({ item }: { item: SettingsHistoryEntry }) {
  return (
    <details data-settings-history-record={item.id} className="group min-w-0">
      <summary className={"grid min-w-0 cursor-pointer list-none gap-x-3 gap-y-1 px-3 py-3 hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] lg:items-start [&::-webkit-details-marker]:hidden " + rowGrid}>
        <span className="min-w-0 text-[13px] font-semibold text-[#020617]">{item.section}</span>
        <span className="min-w-0 text-[12px] text-[#475569]">{item.change}</span>
        <span className="min-w-0 break-all text-[12px] text-[#475569]">{item.adminEmail}</span>
        <span className="flex min-w-0 flex-wrap items-center justify-between gap-1 text-[12px] text-[#64748B]">
          <time dateTime={item.createdAt}>{formatAuditDate(item.createdAt)}</time>
          <span className="text-[#004BB8] group-open:hidden">Details ▾</span>
          <span className="hidden text-[#004BB8] group-open:inline">Close ▴</span>
        </span>
      </summary>
      <div className="border-t border-[#E7ECF5] bg-[#F8FAFC] px-3 py-4">
        <h3 className="mb-3 text-[13px] font-semibold text-[#020617]">Read-only change record</h3>
        <dl className="grid min-w-0 gap-x-5 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          <ReadOnlyDetail label="Section" value={item.section} />
          <ReadOnlyDetail label="Change" value={item.change} />
          <ReadOnlyDetail label="Changed by" value={item.adminEmail} />
          <ReadOnlyDetail label="Date & time" value={formatAuditDate(item.createdAt)} />
          <ReadOnlyDetail label="Action code" value={item.action} />
          <ReadOnlyDetail label="Target type" value={item.targetType} />
          {item.targetId ? <ReadOnlyDetail label="Target ID" value={item.targetId} /> : null}
          {item.targetEmail ? <ReadOnlyDetail label="Affected member" value={item.targetEmail} /> : null}
          {item.details.map(detail => <ReadOnlyDetail key={detail.label} {...detail} />)}
        </dl>
        {!item.details.length ? (
          <p className="mt-3 text-[12px] text-[#64748B]">No additional safe change details were recorded for this event.</p>
        ) : null}
      </div>
    </details>
  );
}

export default async function AdminRecentSettingsChangesPage({ searchParams }: { searchParams?: SearchParams }) {
  const raw = await searchParams ?? {};
  const requestedRange = single(raw.range);
  const requestedCategory = single(raw.category);
  const fromDate = single(raw.fromDate) || "";
  const toDate = single(raw.toDate) || "";
  const range: SettingsHistoryRange = ranges.includes(requestedRange as SettingsHistoryRange)
    ? requestedRange as SettingsHistoryRange : "24h";
  const category: SettingsHistoryCategory = categories.includes(requestedCategory as SettingsHistoryCategory)
    ? requestedCategory as SettingsHistoryCategory : "all";
  const invalid = Object.keys(raw).some(key => !["range", "category", "view", "cursor", "fromDate", "toDate"].includes(key)) ||
    Object.values(raw).some(value => Array.isArray(value)) ||
    (requestedRange !== undefined && !ranges.includes(requestedRange as SettingsHistoryRange)) ||
    (requestedCategory !== undefined && !categories.includes(requestedCategory as SettingsHistoryCategory)) ||
    (single(raw.view) !== undefined && single(raw.view) !== "full") ||
    ((fromDate || toDate) && range !== "custom");
  const result = invalid ? { status: "invalid" as const } : await adminSettingsHistory.list({
    range, category, cursor: single(raw.cursor), limit: 25,
    fromDate, toDate,
  });

  return (
    <section aria-labelledby="settings-section-title" className="min-w-0">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D8E1EC] pb-4">
        <div className="min-w-0">
          <h2 id="settings-section-title" className="text-[17px] font-semibold leading-6 tracking-[-0.01em] text-[#020617]">Settings History</h2>
          <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Review recorded Settings and Team Access changes, who made them, and when.</p>
        </div>
      </header>

      <form action={fullHistoryPath} method="get" aria-label="Settings history filters"
          data-testid="settings-history-filter-row"
          className="grid w-full min-w-0 grid-cols-1 items-center gap-2 border-b border-[#E7ECF5] py-3 sm:grid-cols-2 lg:grid-cols-[190px_220px_136px]">
          <SettingsHistoryRangeControl range={range} fromDate={fromDate} toDate={toDate}
            today={new Date().toISOString().slice(0, 10)} />
          <div className="min-w-0" data-testid="settings-history-category-control">
            <AdminDirectorySelect label="Section" name="category" value={category}
              options={categories.map(value => ({ value, label: categoryLabels[value] }))}
              compact attached />
          </div>
          <button type="submit" className="focus-ring h-10 w-full min-w-0 whitespace-nowrap rounded-lg bg-[#004BB8] px-3 text-[13px] font-medium text-white hover:bg-[#003D97]">Apply filters</button>
        </form>

      {result.status !== "ok" ? (
        <p role="status" className="border-b border-[#D8E1EC] py-5 text-[13px] text-[#64748B]">
          {result.status === "forbidden" ? "Administrator access is required to view Settings history."
            : result.status === "invalid" ? "These history filters are invalid. Choose a supported time range and section."
            : "Settings history is temporarily unavailable. No unverified records are shown."}
        </p>
      ) : result.items.length ? (
        <>
          <div className="min-w-0 border-b border-[#D8E1EC]">
            <div className={"hidden gap-3 border-b border-[#E7ECF5] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#64748B] lg:grid " + rowGrid}>
              <span>Section</span><span>Change</span><span>Changed by</span><span>Date & time</span>
            </div>
            <div className="min-w-0 divide-y divide-[#E7ECF5]">
              {result.items.map(item => <SettingsHistoryRow key={item.id} item={item} />)}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-[12px] text-[#64748B]">
            <span>Newest first · {result.items.length} recorded changes shown · Read only</span>
            <div className="flex flex-wrap gap-3">
              {single(raw.cursor) ? <Link href={historyHref(range, category, undefined, fromDate, toDate)} className="font-medium text-[#004BB8] hover:underline">Back to newest</Link> : null}
              {result.nextCursor ? <Link href={historyHref(range, category, result.nextCursor, fromDate, toDate)} className="font-medium text-[#004BB8] hover:underline">Older records →</Link> : null}
            </div>
          </div>
        </>
      ) : (
        <p role="status" className="border-b border-[#D8E1EC] py-5 text-[13px] text-[#64748B]">
          No recorded changes match this selection. Choose a longer time range to review older records.
        </p>
      )}
    </section>
  );
}
