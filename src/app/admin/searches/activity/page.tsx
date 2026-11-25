import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { searchWorkspaceTab } from "@/lib/adminSearchWorkspace";

import { resolveSearchActivityLegacyFilters, searchActivityDetailQuery, searchActivityReturnHref } from "@/lib/adminSearchActivityNavigation";
import { searchActivityIdentityLabels } from "@/lib/adminSearchDetailPresentation";
import { buildAdminSearchProviderOptions } from "@/lib/adminSearchProviderOptions";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { AdminOperationalDateRangeFields } from "@/components/admin/AdminOperationalDateRangeFields";
import { SearchMonitorTable } from "@/components/admin/SearchMonitorTable";
import { AdminSearchTimeZoneSync } from "@/components/admin/AdminSearchTimeZoneSync";
import { validViewerTimeZone, viewerTodayStart } from "@/lib/adminLocalTime";

import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Search Activity" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type RangeKey = "24h" | "today" | "7d" | "30d" | "all" | "custom";

const platformOptions = [
  { value: "", label: "All platforms" },
  { value: "WEB", label: "Website" },
  { value: "IOS", label: "iOS" },
  { value: "ANDROID", label: "Android" },
];

const identityOptions = [
  { value: "all", label: "All identities" },
  ...Object.entries(searchActivityIdentityLabels).map(([value, label]) => ({ value, label })),
];

export default async function AdminSearchActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const supplied = await searchParams;
  // Preserve bookmarks to former workspace tabs without duplicating the
  // individual customer views or provider business reporting here.
  const tab = searchWorkspaceTab(supplied.tab);
  if (tab !== "searches") {
    const old = { ...supplied }; delete old.tab;
    const target = tab === "attribution" ? "/admin/providers?view=attribution" : tab === "journeys" ? "/admin/journeys" : "/admin/redirects";
    const keys = tab === "attribution" ? ["days"] : tab === "journeys"
      ? ["range","environment","product","identity","userId","visitorId","provider","stage","from","to"]
      : ["environment","product","identity","userId","visitorId","provider","correlation","from","to"];
    const params = new URLSearchParams();
    for (const key of keys) if (typeof old[key] === "string" && old[key].length <= 200) params.set(key, old[key]);
    redirect(target + (params.size ? (target.includes("?") ? "&" : "?") + params.toString() : ""));
  }
  const raw = { ...supplied };
  delete raw.tab;
  delete raw.environment;
  const legacy = resolveSearchActivityLegacyFilters(raw);
  if (legacy?.kind === "redirect") redirect(legacy.href);
  if (legacy?.kind === "unsupported") {
    return (
      <AdminPageShell title="Search activity" hideHeader>
        <SearchState title="Check the filters" message={legacy.message}>
          <Link href={legacy.href} className="mt-3 inline-block text-sm font-semibold text-[#004BB8] hover:underline">
            {legacy.action}
          </Link>
        </SearchState>
      </AdminPageShell>
    );
  }
  const legacySourceFilter = raw.applicationSource === "UNKNOWN";
  const currentEnvironment = getPublicEnvironment();
  const providerOptions = buildAdminSearchProviderOptions(getProviderIntegrationStatuses(), one(raw.provider) || null);
  const referenceNow = new Date().toISOString();
  const range = resolveRange(raw);
  const params = toBackendParams(raw, range);
  params.set("environment", currentEnvironment);
  const listParams = new URLSearchParams(params);
  listParams.set("limit", "100");
  const [result, summary] = await Promise.all([
    adminOperationalReads.searchActivity.list(listParams),
    adminOperationalReads.searchActivity.summary(params),
  ]);

  return (
    <>
      <Suspense fallback={null}><AdminSearchTimeZoneSync /></Suspense>
      <AdminPageShell title="Search activity" hideHeader>
        <div className="mx-auto w-full max-w-[1500px]">
        
        {result.status === "ok" && summary.status === "ok" ? (
          <>
            <div className="grid grid-cols-2 border-y border-[#E5E7EB] md:grid-cols-4">
              <Metric label="All searches" value={summary.data.total} tone="all" />
              <Metric label="Complete" value={summary.data.success} tone="complete" />
              <Metric label="Partial" value={summary.data.partial} tone="partial" />
              <Metric label="Failed" value={summary.data.failed} tone="failed" />
            </div>

            <form action="/admin/searches/activity" className="border-b border-[#E5E7EB]">
              {one(raw.viewerTimeZone) ? <input type="hidden" name="viewerTimeZone" value={one(raw.viewerTimeZone)} /> : null}
              {one(raw.product) ? <input type="hidden" name="product" value={one(raw.product)} /> : null}
              {one(raw.userId) ? <input type="hidden" name="userId" value={one(raw.userId)} /> : null}
              {one(raw.visitorId) ? <input type="hidden" name="visitorId" value={one(raw.visitorId)} /> : null}

              <div data-testid="search-records-filter-row" className="grid min-w-0 grid-cols-1 items-center gap-2 py-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_120px] lg:gap-2">
                <AdminOperationalDateRangeFields
                  testId="search-records-date-range"
                  initialRange={range}
                  initialFrom={one(raw.from)}
                  initialTo={one(raw.to)}
                  now={new Date().toISOString()}
                  legacyOptions={range === "24h" ? [{ value: "24h", label: "Last 24 hrs (legacy)" }] : []}
                />
                <div className="min-w-0">
                  <SearchMonitorSelect label="Outcome" appearance="fare" name="status"
                    value={one(raw.status)}
                    options={[
                      { value: "", label: "All outcomes" },
                      { value: "SUCCESS", label: "Complete" },
                      { value: "PARTIAL", label: "Partial" },
                      { value: "FAILED", label: "Failed" },
                    ]} truncateLabel />
                </div>
                <div className="min-w-0">
                  <SearchMonitorSelect label="Identity" appearance="fare" name="identity"
                    value={one(raw.identity) || "all"}
                    clearFieldNamesOnChange={["userId", "visitorId"]}
                    options={identityOptions} truncateLabel />
                </div>
                <div className="min-w-0">
                  <SearchMonitorSelect label="Provider" appearance="fare" name="provider"
                    value={one(raw.provider)} options={providerOptions} truncateLabel />
                </div>
                <div className="min-w-0">
                  {legacySourceFilter ? (
                    <div className="flex min-h-10 flex-wrap items-center gap-x-2 text-xs text-[#475569]">
                      <input type="hidden" name="applicationSource" value="UNKNOWN" />
                      <span>Source not recorded (legacy filter)</span>
                      <Link href={searchActivityReturnHref({ ...raw, applicationSource: undefined }, range)}
                        className="font-semibold text-[#004BB8] hover:underline">Clear legacy source filter</Link>
                    </div>
                  ) : (
                    <SearchMonitorSelect label="Platform" appearance="fare" name="applicationSource"
                      value={one(raw.applicationSource)} options={platformOptions} align="end" truncateLabel />
                  )}
                </div>
                <button type="submit"
                  className="inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#003D97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
                  Apply filters
                </button>
              </div>
              <div data-testid="search-records-products-row" className="flex min-w-0 items-center border-t border-[#E5E7EB] py-3">
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
                          "relative pb-2 text-[13px] font-semibold transition-colors " +
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
              </div>
            </form>

            <SearchMonitorTable
              initialItems={result.data.items}
              initialCursor={result.data.nextCursor}
              query={params.toString()}
              referenceNow={referenceNow}
              detailQuery={searchActivityDetailQuery({ ...raw, environment: currentEnvironment }, range)}
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
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
        <span className={"h-1.5 w-1.5 rounded-full " + dot} />
        {label}
      </p>
      <p className="mt-1 text-[24px] font-medium leading-none tracking-[-0.035em] text-[#111827]">{value.toLocaleString()}</p>
    </div>
  );
}

function resolveRange(raw: Record<string, string | string[] | undefined>): RangeKey {
  const requested = one(raw.range);
  if (requested === "24h" || requested === "today" || requested === "7d" || requested === "30d" || requested === "all") return requested;
  if (one(raw.from) || one(raw.to)) return "custom";
  // Filter-only URLs remain scoped to Today; explicit legacy ranges and date bounds are preserved above.
  return "today";
}

function toBackendParams(raw: Record<string, string | string[] | undefined>, range: RangeKey) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "range" || key === "cursor" || key === "limit" || key === "viewerTimeZone") continue;
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
    if (range === "24h") from.setTime(now.getTime() - 24 * 60 * 60 * 1000);
    if (range === "today") {
      const zone = validViewerTimeZone(one(raw.viewerTimeZone));
      if (zone) from.setTime(Date.parse(viewerTodayStart(now, zone)));
      else from.setUTCHours(0, 0, 0, 0);
    }
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

function SearchState({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return (
    <div className="border-b border-[#E5E7EB] py-10 text-center">
      <p className="text-[14px] font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-[12px] text-[#6B7280]">{message}</p>
      {children}
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
