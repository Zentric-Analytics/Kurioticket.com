import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Searches" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type RangeKey = "today" | "7d" | "30d" | "all" | "custom";

const filterControl =
  "h-9 min-w-0 border-0 border-b border-[#CAD3DF] bg-transparent px-0 text-[13px] font-medium text-[#475569] outline-none focus:border-[#021C2B] focus:ring-0";

export default async function AdminSearchActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const range = resolveRange(raw);
  const params = toBackendParams(raw, range);
  const result = await loadAllSearches(params);

  return (
    <AdminPageShell title="Searches" hideHeader>
      <div className="mx-auto w-full max-w-[1500px]">
        <div className="flex items-start justify-between gap-6 border-b border-[#C7CDD6] pb-4">
          <div>
            <h1 className="text-[34px] font-medium leading-none tracking-[-0.035em] text-[#111827]">Searches</h1>
            <p className="mt-2 max-w-[600px] text-[12px] leading-[1.45] text-[#6B7280]">
              Every recorded search, read through the admin search monitor. Private raw search payloads are not shown here.
            </p>
          </div>
          <Link
            href="/admin/searches"
            className="mt-1 inline-flex items-center gap-1.5 border-b border-[#9CA3AF] pb-1 text-[12px] font-semibold text-[#111827] transition-colors hover:border-violet-600 hover:text-violet-700"
          >
            <span aria-hidden="true">←</span>
            Searches
          </Link>
        </div>

        {result.status === "ok" ? (
          <>
            <div className="grid grid-cols-2 border-b border-[#D7DCE3] md:grid-cols-4">
              <Metric label="All searches" value={result.data.items.length} tone="all" />
              <Metric label="Complete" value={result.data.items.filter((item) => item.status === "SUCCESS").length} tone="complete" />
              <Metric label="Partial" value={result.data.items.filter((item) => item.status === "PARTIAL").length} tone="partial" />
              <Metric label="Failed" value={result.data.items.filter((item) => item.status === "FAILED").length} tone="failed" />
            </div>

            <form action="/admin/searches/activity" className="border-b border-[#D7DCE3]">
              <input type="hidden" name="product" value={one(raw.product)} />
              {range === "custom" ? (
                <>
                  {one(raw.from) ? <input type="hidden" name="from" value={one(raw.from)} /> : null}
                  {one(raw.to) ? <input type="hidden" name="to" value={one(raw.to)} /> : null}
                </>
              ) : null}

              <div className="flex flex-col gap-4 border-b border-[#E5E7EB] py-3 lg:flex-row lg:items-end lg:justify-between">
                <nav aria-label="Search products" className="flex items-center gap-5">
                  {[
                    { label: "All", value: "" },
                    { label: "Flights", value: "FLIGHT" },
                    { label: "Hotels", value: "HOTEL" },
                    { label: "Cars", value: "CAR" },
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

                <div className="flex items-center gap-5">
                  <label className="sr-only" htmlFor="search-range">Date range</label>
                  <select id="search-range" name="range" defaultValue={range === "custom" ? "all" : range} className={filterControl + " w-[86px]"}>
                    <option value="today">Today</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                  </select>

                  <label className="sr-only" htmlFor="search-environment">Environment</label>
                  <select
                    id="search-environment"
                    name="environment"
                    defaultValue={one(raw.environment) || result.data.scope.environment}
                    className={filterControl + " w-[92px]"}
                  >
                    <option value="staging">Staging</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-x-7 gap-y-3 py-3 sm:grid-cols-2 lg:grid-cols-[150px_150px_minmax(180px,1fr)_auto] lg:items-end">
                <label>
                  <span className="sr-only">Outcome</span>
                  <select name="status" defaultValue={one(raw.status)} className={filterControl + " w-full"}>
                    <option value="">All outcomes</option>
                    <option value="SUCCESS">Complete</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </label>

                <label>
                  <span className="sr-only">Identity</span>
                  <select name="identity" defaultValue={one(raw.identity) || "all"} className={filterControl + " w-full"}>
                    <option value="all">All identities</option>
                    <option value="registered">Registered</option>
                    <option value="guest">Guest</option>
                    <option value="unattributed">Unattributed</option>
                  </select>
                </label>

                <label>
                  <span className="sr-only">Provider</span>
                  <input
                    name="provider"
                    defaultValue={one(raw.provider)}
                    placeholder="Provider"
                    className={filterControl + " w-full placeholder:text-[#9CA3AF]"}
                  />
                </label>

                <button
                  type="submit"
                  className="h-9 cursor-pointer bg-[#111827] px-6 text-[12px] font-semibold text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
                >
                  Apply filters
                </button>
              </div>
            </form>

            {result.data.items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#D7DCE3] text-[10px] uppercase tracking-[0.12em] text-[#6B7280]">
                      <th className="px-2 py-3 font-semibold">Created</th>
                      <th className="px-2 py-3 font-semibold">Product</th>
                      <th className="px-2 py-3 font-semibold">Route / stay</th>
                      <th className="px-2 py-3 font-semibold">Market</th>
                      <th className="px-2 py-3 font-semibold">Results</th>
                      <th className="px-2 py-3 font-semibold">Providers</th>
                      <th className="px-2 py-3 font-semibold">Time</th>
                      <th className="px-2 py-3 font-semibold">Identity</th>
                      <th className="px-2 py-3 font-semibold">Status</th>
                      <th className="px-2 py-3 font-semibold"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.items.map((search) => (
                      <tr key={search.id} className="border-b border-[#E5E7EB] text-[12px] text-[#374151] hover:bg-[#FAFAFA]">
                        <td className="whitespace-nowrap px-2 py-3 align-top">{formatCreated(search.createdAt)}</td>
                        <td className="px-2 py-3 align-top font-semibold text-[#111827]">{productLabel(search.product)}</td>
                        <td className="max-w-[260px] px-2 py-3 align-top">
                          <p className="font-semibold text-[#111827]">{routeLabel(search.origin, search.destination)}</p>
                          {formatSearchDates(search.checkIn, search.checkOut) ? (
                            <p className="mt-0.5 text-[10px] leading-4 text-[#9CA3AF]">{formatSearchDates(search.checkIn, search.checkOut)}</p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 align-top">{search.currency || search.market || "—"}</td>
                        <td className="px-2 py-3 align-top">{search.resultCount.toLocaleString()}</td>
                        <td className="px-2 py-3 align-top">{search.providers.length ? search.providers.length : "—"}</td>
                        <td className="whitespace-nowrap px-2 py-3 align-top">{formatLatency(search.latencyMs)}</td>
                        <td className="px-2 py-3 align-top">{identityLabel(search.identity.kind)}</td>
                        <td className="px-2 py-3 align-top"><MonitorStatus status={search.status} /></td>
                        <td className="whitespace-nowrap px-2 py-3 text-right align-top">
                          <Link
                            href={"/admin/searches/" + search.id + "?environment=" + search.environment}
                            className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <SearchState title="No searches found" message="No recorded searches match these filters." />
            )}
          </>
        ) : (
          <ReadError status={result.status} issues={"issues" in result ? result.issues : undefined} />
        )}
      </div>
    </AdminPageShell>
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

function MonitorStatus({ status }: { status: "SUCCESS" | "PARTIAL" | "FAILED" }) {
  const value = {
    SUCCESS: { label: "Complete", dot: "bg-emerald-500", text: "text-emerald-700" },
    PARTIAL: { label: "Partial", dot: "bg-amber-400", text: "text-amber-700" },
    FAILED: { label: "Failed", dot: "bg-rose-500", text: "text-rose-700" },
  }[status];

  return (
    <span className={"inline-flex items-center gap-1.5 font-semibold " + value.text}>
      <span className={"h-1.5 w-1.5 rounded-full " + value.dot} />
      {value.label}
    </span>
  );
}

async function loadAllSearches(params: URLSearchParams) {
  const query = new URLSearchParams(params);
  query.delete("cursor");
  query.set("limit", "100");

  const first = await adminOperationalReads.searches.list(query);
  if (first.status !== "ok") return first;

  const items = [...first.data.items];
  let nextCursor = first.data.nextCursor;
  const seen = new Set<string>();

  while (nextCursor && !seen.has(nextCursor)) {
    seen.add(nextCursor);
    const nextQuery = new URLSearchParams(query);
    nextQuery.set("cursor", nextCursor);
    const next = await adminOperationalReads.searches.list(nextQuery);
    if (next.status !== "ok") return next;
    items.push(...next.data.items);
    nextCursor = next.data.nextCursor;
  }

  return {
    status: "ok" as const,
    data: {
      scope: first.data.scope,
      items,
      nextCursor: null,
    },
  };
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

  if (!params.has("from") && !params.has("to") && range !== "all" && range !== "custom") {
    const now = new Date();
    const from = new Date(now);
    if (range === "today") from.setHours(0, 0, 0, 0);
    if (range === "7d") from.setDate(from.getDate() - 7);
    if (range === "30d") from.setDate(from.getDate() - 30);
    params.set("from", from.toISOString());
  }

  return params;
}

function productHref(raw: Record<string, string | string[] | undefined>, product: string, range: RangeKey) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "cursor" || key === "limit" || key === "product") continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  if (product) params.set("product", product);
  if (range !== "custom") params.set("range", range);
  const query = params.toString();
  return "/admin/searches/activity" + (query ? "?" + query : "");
}

function formatCreated(value: string) {
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
  if (sameDay) return "Today, " + time;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date) + ", " + time;
}

function formatLatency(value: number | null) {
  if (value === null) return "—";
  return (value / 1000).toFixed(1) + "s";
}

function productLabel(product: string) {
  return product === "FLIGHT" ? "Flight" : product === "HOTEL" ? "Hotel" : product === "CAR" ? "Car" : product === "PACKAGE" ? "Package" : product;
}

function routeLabel(origin: string | null, destination: string | null) {
  if (origin && destination) return origin + " → " + destination;
  return destination || origin || "Search request";
}

function formatSearchDates(checkIn: string | null, checkOut: string | null) {
  if (!checkIn) return "";
  const format = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  };
  return format(checkIn) + (checkOut ? " → " + format(checkOut) : "");
}

function identityLabel(kind: "registered" | "guest" | "unattributed") {
  return kind === "registered" ? "Registered" : kind === "guest" ? "Guest" : "Unattributed";
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
