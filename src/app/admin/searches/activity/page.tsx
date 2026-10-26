import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Search Activity" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const controlClass =
  "h-10 w-full rounded-[8px] border border-[#D8E1EC] bg-white px-3 text-[14px] font-medium text-[#1A1A1A] outline-none transition-colors placeholder:text-[#7A8491] focus:border-violet-500 focus:ring-2 focus:ring-violet-100";

export default async function AdminSearchActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = toParams(raw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminOperationalReads.searches.list(params);
  const identity = one(raw.identity);
  const hasFilters = Boolean(
    one(raw.product) ||
    one(raw.status) ||
    one(raw.provider) ||
    one(raw.environment) ||
    (identity && identity !== "all"),
  );

  return (
    <>
      <SearchWorkspaceBackLink />
      <AdminPageShell
        title="Search activity"
        description="Review recent searches, providers, results and outcomes."
      >
        <div className="space-y-5">
          <div className="flex justify-end">
            {hasFilters ? (
              <Link
                href="/admin/searches/activity"
                className="w-fit text-[13px] font-semibold text-[#595959] underline-offset-4 hover:text-violet-700 hover:underline"
              >
                Clear filters
              </Link>
            ) : null}
          </div>

          <form
            action="/admin/searches/activity"
            className="grid gap-3 border-y border-[#E2E8F0] py-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.1fr_1fr_auto] lg:items-center"
          >
            <label className="sr-only" htmlFor="search-product">Product</label>
            <select id="search-product" name="product" defaultValue={one(raw.product)} className={controlClass}>
              <option value="">All products</option>
              <option value="FLIGHT">Flights</option>
              <option value="HOTEL">Hotels</option>
              <option value="CAR">Cars</option>
              <option value="PACKAGE">Packages</option>
            </select>

            <label className="sr-only" htmlFor="search-status">Outcome</label>
            <select id="search-status" name="status" defaultValue={one(raw.status)} className={controlClass}>
              <option value="">All outcomes</option>
              <option value="SUCCESS">Success</option>
              <option value="PARTIAL">Partial</option>
              <option value="FAILED">Failed</option>
            </select>

            <label className="sr-only" htmlFor="search-identity">Identity</label>
            <select id="search-identity" name="identity" defaultValue={identity || "all"} className={controlClass}>
              <option value="all">All identities</option>
              <option value="registered">Registered</option>
              <option value="guest">Guest</option>
              <option value="unattributed">Unattributed</option>
            </select>

            <label className="sr-only" htmlFor="search-provider">Provider</label>
            <input
              id="search-provider"
              name="provider"
              defaultValue={one(raw.provider)}
              placeholder="Provider"
              className={controlClass}
            />

            <label className="sr-only" htmlFor="search-environment">Environment</label>
            <select id="search-environment" name="environment" defaultValue={one(raw.environment)} className={controlClass}>
              <option value="">Current environment</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>

            <button
              type="submit"
              className="h-10 cursor-pointer rounded-[8px] border border-[#021C2B] bg-[#021C2B] px-4 text-[14px] font-semibold text-white transition-colors hover:border-violet-700 hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
            >
              Apply
            </button>
          </form>

          {result.status === "ok" ? (
            result.data.items.length === 0 ? (
              <SearchState title="No searches found" message="No recorded searches match these filters." />
            ) : (
              <>
                <div className="overflow-x-auto border-y border-[#E2E8F0]">
                  <table className="w-full min-w-[840px] text-left">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-[12px] font-semibold text-[#697386]">
                        <th className="px-3 py-3 font-semibold sm:px-4">Search</th>
                        <th className="px-3 py-3 font-semibold sm:px-4">Identity</th>
                        <th className="px-3 py-3 font-semibold sm:px-4">Providers</th>
                        <th className="px-3 py-3 text-right font-semibold sm:px-4">Results</th>
                        <th className="px-3 py-3 font-semibold sm:px-4">Status</th>
                        <th className="px-3 py-3 font-semibold sm:px-4">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.data.items.map((search) => {
                        const detailHref = "/admin/searches/" + search.id + "?environment=" + search.environment;
                        return (
                          <tr key={search.id} className="border-b border-[#EEF1F4] align-top last:border-b-0 hover:bg-[#FAFBFC]">
                            <td className="px-3 py-4 sm:px-4">
                              <Link
                                href={detailHref}
                                className="text-[14px] font-semibold leading-5 text-[#1A1A1A] underline-offset-4 hover:text-violet-700 hover:underline"
                              >
                                {routeLabel(search.origin, search.destination)}
                              </Link>
                              <p className="mt-1 text-[12px] font-normal leading-5 text-[#697386]">
                                {searchMeta(search.product, search.checkIn, search.checkOut, search.market, search.currency)}
                              </p>
                            </td>
                            <td className="px-3 py-4 sm:px-4">
                              <p className="text-[13px] font-medium leading-5 text-[#1A1A1A]">{identityLabel(search.identity.kind)}</p>
                              <p className="mt-0.5 max-w-44 truncate text-[12px] font-normal leading-5 text-[#697386]">
                                {search.identity.userId || search.identity.visitorId || "No linked ID"}
                              </p>
                            </td>
                            <td className="max-w-[240px] px-3 py-4 text-[13px] font-normal leading-5 text-[#475569] sm:px-4">
                              {search.providers.length ? search.providers.join(", ") : "—"}
                            </td>
                            <td className="px-3 py-4 text-right text-[13px] font-semibold leading-5 text-[#1A1A1A] sm:px-4">
                              {search.resultCount}
                            </td>
                            <td className="px-3 py-4 sm:px-4">
                              <SearchStatus status={search.status} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-[12px] font-normal leading-5 text-[#595959] sm:px-4">
                              {formatDateTime(new Date(search.createdAt))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {result.data.nextCursor ? (
                  <div className="flex justify-end pt-4">
                    <Link
                      href={cursorHref("/admin/searches/activity", raw, result.data.nextCursor)}
                      className="inline-flex h-10 cursor-pointer items-center border border-[#D8E1EC] bg-white px-4 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:border-violet-600 focus-visible:border-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-100"
                    >
                      Next page
                    </Link>
                  </div>
                ) : null}
              </>
            )
          ) : (
            <ReadError status={result.status} issues={"issues" in result ? result.issues : undefined} />
          )}
        </div>
      </AdminPageShell>
    </>
  );
}

function SearchStatus({ status }: { status: "SUCCESS" | "PARTIAL" | "FAILED" }) {
  const classes = {
    SUCCESS: "border-emerald-200 text-emerald-700",
    PARTIAL: "border-amber-200 text-amber-700",
    FAILED: "border-rose-200 text-rose-700",
  }[status];

  return (
    <span className={"inline-flex items-center border bg-white px-2.5 py-1 text-[12px] font-semibold leading-4 " + classes}>
      {status === "SUCCESS" ? "Success" : status === "PARTIAL" ? "Partial" : "Failed"}
    </span>
  );
}

function SearchState({ title, message }: { title: string; message: string }) {
  return (
    <div className="border-y border-[#E2E8F0] py-10 text-center">
      <p className="text-[15px] font-semibold text-[#1A1A1A]">{title}</p>
      <p className="mt-1 text-[13px] font-normal leading-5 text-[#595959]">{message}</p>
    </div>
  );
}

function ReadError({ status, issues }: { status: string; issues?: Array<{ field: string; message: string }> }) {
  const title =
    status === "invalid"
      ? "Check the filters"
      : status === "forbidden"
        ? "Admin access required"
        : "Search activity unavailable";
  const message =
    status === "invalid" && issues?.length
      ? issues.map((issue) => issue.field + ": " + issue.message).join(" ")
      : status === "forbidden"
        ? "Your current admin session cannot view these records."
        : "Search records could not be loaded right now.";

  return <SearchState title={title} message={message} />;
}

function routeLabel(origin: string | null, destination: string | null) {
  if (origin && destination) return origin + " → " + destination;
  return destination || origin || "Search request";
}

function searchMeta(
  product: string,
  checkIn: string | null,
  checkOut: string | null,
  market: string | null,
  currency: string | null,
) {
  const productLabel =
    product === "FLIGHT" ? "Flight" :
    product === "HOTEL" ? "Hotel" :
    product === "CAR" ? "Car" :
    product === "PACKAGE" ? "Package" :
    product;
  const dates = formatSearchDates(checkIn, checkOut);
  const marketCurrency = [market, currency].filter(Boolean).join(" · ");
  return [productLabel, dates, marketCurrency].filter(Boolean).join(" · ");
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

function one(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function toParams(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  return params;
}

function cursorHref(path: string, raw: Record<string, string | string[] | undefined>, cursor: string) {
  const params = toParams(raw);
  params.set("cursor", cursor);
  params.set("limit", "50");
  return path + "?" + params.toString();
}
