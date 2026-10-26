import Link from "next/link";

import { searchActivityDetailQuery } from "@/lib/adminSearchActivityNavigation";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SearchMonitorSelect, SearchMonitorProviderInput } from "@/components/admin/SearchMonitorSelect";
import { SearchMonitorTable } from "@/components/admin/SearchMonitorTable";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Searches" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type RangeKey = "today" | "7d" | "30d" | "all" | "custom";

export default async function AdminSearchActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const referenceNow = new Date().toISOString();
  const range = resolveRange(raw);
  const params = toBackendParams(raw, range);
  const listParams = new URLSearchParams(params);
  listParams.set("limit", "100");
  const [result, summary] = await Promise.all([
    adminOperationalReads.searches.list(listParams),
    adminOperationalReads.searches.summary(params),
  ]);

  return (
    <>
      <SearchWorkspaceBackLink />
      <AdminPageShell title="Search activity" hideHeader>
        <div className="mx-auto w-full max-w-[1500px]">
        {result.status === "ok" && summary.status === "ok" ? (
          <>
            <div className="grid grid-cols-2 border-y border-[#D7DCE3] md:grid-cols-4">
              <Metric label="All searches" value={summary.data.total} tone="all" />
              <Metric label="Complete" value={summary.data.success} tone="complete" />
              <Metric label="Partial" value={summary.data.partial} tone="partial" />
              <Metric label="Failed" value={summary.data.failed} tone="failed" />
            </div>

            <form action="/admin/searches/activity" className="border-b border-[#D7DCE3]">
              {one(raw.product) ? <input type="hidden" name="product" value={one(raw.product)} /> : null}
              {one(raw.userId) ? <input type="hidden" name="userId" value={one(raw.userId)} /> : null}
              {one(raw.visitorId) ? <input type="hidden" name="visitorId" value={one(raw.visitorId)} /> : null}
              {range === "custom" ? (
                <>
                  {one(raw.from) ? <input type="hidden" name="from" value={one(raw.from)} /> : null}
                  {one(raw.to) ? <input type="hidden" name="to" value={one(raw.to)} /> : null}
                </>
              ) : null}

              <div className="flex flex-col gap-3 border-b border-[#E5E7EB] py-3 lg:flex-row lg:items-center lg:justify-between">
                <nav aria-label="Search products" className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {[
                    { label: "All", value: "" },
                    { label: "Flights", value: "FLIGHT" },
                    { label: "Hotels", value: "HOTEL" },
                    { label: "Cars", value: "CAR" },
                    { label: "Packages", value: "PACKAGE" },
                  ].map((item) => {
                    const active = one(raw.product) === item.value;
                    return (
                      <Link
                        key={item.label}
                        href={productHref(raw, item.value, range)}
                        className={
                          "relative pb-2 text-[12px] font-semibold transition-colors " +
                          (active
                            ? "text-[#004BB8] after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-[#004BB8]"
                            : "text-[#475569] hover:text-[#111827]")
                        }
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
                <div className="flex shrink-0 items-center gap-5 lg:self-center">
                  <SearchMonitorSelect
                    label="Date range"
                    name="range"
                    value={range}
                    appearance="plain"
                    align="end"
                    autoSubmit
                    options={[
                      { value: "today", label: "Today" },
                      { value: "7d", label: "Last 7 days" },
                      { value: "30d", label: "Last 30 days" },
                      { value: "all", label: "All time" },
                      ...(range === "custom" ? [{ value: "custom", label: "Custom" }] : []),
                    ]}
                  />
                  <SearchMonitorSelect
                    label="Environment"
                    name="environment"
                    value={one(raw.environment) || result.data.scope.environment}
                    appearance="plain"
                    align="end"
                    autoSubmit
                    options={[
                      { value: "staging", label: "Staging" },
                      { value: "production", label: "Production" },
                    ]}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-x-6 gap-y-3 py-3">
                <div className="w-[170px] max-w-full">
                  <SearchMonitorSelect
                    label="Outcome"
                    name="status"
                    value={one(raw.status)}
                    options={[
                      { value: "", label: "All outcomes" },
                      { value: "SUCCESS", label: "Complete" },
                      { value: "PARTIAL", label: "Partial" },
                      { value: "FAILED", label: "Failed" },
                    ]}
                  />
                </div>
                <div className="w-[170px] max-w-full">
                  <SearchMonitorSelect
                    label="Identity"
                    name="identity"
                    value={one(raw.identity) || "all"}
                    clearFieldNamesOnChange={["userId", "visitorId"]}
                    options={[
                      { value: "all", label: "All identities" },
                      { value: "registered", label: "Registered" },
                      { value: "guest", label: "Guest" },
                      { value: "unattributed", label: "Unattributed" },
                    ]}
                  />
                </div>
                <div className="w-[170px] max-w-full">
                  <SearchMonitorProviderInput value={one(raw.provider)} />
                </div>
                <button
                  type="submit"
                  className="h-9 w-[146px] cursor-pointer bg-[#111827] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
                >
                  Apply filters
                </button>
              </div>
            </form>

            <SearchMonitorTable
              initialItems={result.data.items}
              initialCursor={result.data.nextCursor}
              query={params.toString()}
              referenceNow={referenceNow}
              detailQuery={searchActivityDetailQuery(raw, range)}
            />
          </>
        ) : (
          <ReadError
            status={result.status !== "ok" ? result.status : summary.status}
            issues={result.status === "invalid" ? result.issues : summary.status === "invalid" ? summary.issues : undefined}
          />
        )}
        </div>
      </AdminPageShell>
    </>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "all" | "complete" | "partial" | "failed" }) {
  const dot = {
    all: "bg-[#004BB8]",
    complete: "bg-emerald-500",
    partial: "bg-amber-400",
    failed: "bg-rose-500",
  }[tone];

  return (
    <div className="min-h-[84px] border-r border-[#E5E7EB] px-3 py-3 last:border-r-0 md:px-5">
      <p className="flex items-center gap-1.5 text-[10px] font-medium text-[#6B7280]">
        <span className={"h-1.5 w-1.5 rounded-full " + dot} />
        {label}
      </p>
      <p className="mt-1 text-[26px] font-medium leading-none tracking-[-0.035em] text-[#111827]">{value.toLocaleString()}</p>
    </div>
  );
}

function resolveRange(raw: Record<string, string | string[] | undefined>): RangeKey {
  const requested = one(raw.range);
  if (requested === "today" || requested === "7d" || requested === "30d" || requested === "all") return requested;
  if (one(raw.from) || one(raw.to)) return "custom";
  const hasLegacyScope = Object.entries(raw).some(([key, value]) => key !== "range" && Boolean(Array.isArray(value) ? value.length : value));
  return hasLegacyScope ? "all" : "today";
}

function toBackendParams(raw: Record<string, string | string[] | undefined>, range: RangeKey) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "range" || key === "cursor" || key === "limit") continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }

  if (range !== "custom") {
    params.delete("from");
    params.delete("to");
  }

  if (range !== "all" && range !== "custom") {
    const now = new Date();
    const from = new Date(now);
    if (range === "today") from.setUTCHours(0, 0, 0, 0);
    if (range === "7d") from.setUTCDate(from.getUTCDate() - 7);
    if (range === "30d") from.setUTCDate(from.getUTCDate() - 30);
    params.set("from", from.toISOString());
  }

  return params;
}

function productHref(raw: Record<string, string | string[] | undefined>, product: string, range: RangeKey) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "cursor" || key === "limit" || key === "product") continue;
    if (range !== "custom" && (key === "from" || key === "to")) continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  if (product) params.set("product", product);
  if (range !== "custom") params.set("range", range);
  const query = params.toString();
  return "/admin/searches/activity" + (query ? "?" + query : "");
}

function SearchState({ title, message }: { title: string; message: string }) {
  return (
    <div className="border-b border-[#D7DCE3] py-10 text-center">
      <p className="text-[14px] font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-[12px] text-[#6B7280]">{message}</p>
    </div>
  );
}

function ReadError({ status, issues }: { status: string; issues?: Array<{ field: string; message: string }> }) {
  const title =
    status === "invalid"
      ? "Check the filters"
      : status === "forbidden"
        ? "Admin access required"
        : "Search data unavailable";
  const message =
    status === "invalid" && issues?.length
      ? issues.map((issue) => issue.field + ": " + issue.message).join(" ")
      : status === "forbidden"
        ? "Your current admin session cannot view these records."
        : "Search records could not be loaded right now.";

  return <SearchState title={title} message={message} />;
}

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}
