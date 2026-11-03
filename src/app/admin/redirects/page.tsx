import Link from "next/link";

import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminPageShell, AdminSelect, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { SearchWorkspacePanelFrame } from "@/components/admin/SearchWorkspacePanelFrame";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Provider Handoffs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminRedirectsPage({ searchParams, embedded = false }: { embedded?: boolean; searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = toParams(raw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminOperationalReads.handoffs.list(params);

  if (embedded) return (
    <>
      {!embedded ? <SearchWorkspaceBackLink href="/admin/providers?view=attribution" label="Provider reports" /> : null}
      <SearchWorkspacePanelFrame embedded={embedded}
        title="Provider Handoffs"
        description="Review verified outbound provider handoffs. A handoff records leaving Kurioticket for a provider; it is not proof of a completed booking or payment."
      >
      <div className="space-y-4">
        <AdminFilterBar action={embedded ? "/admin/searches/activity" : "/admin/redirects"}>
          {embedded ? <input type="hidden" name="tab" value="handoffs" /> : null}
          {one(raw.userId) ? <input type="hidden" name="userId" value={one(raw.userId)} /> : null}
          {one(raw.visitorId) ? <input type="hidden" name="visitorId" value={one(raw.visitorId)} /> : null}
          {one(raw.from) ? <input type="hidden" name="from" value={one(raw.from)} /> : null}
          {one(raw.to) ? <input type="hidden" name="to" value={one(raw.to)} /> : null}
          <AdminSelect name="product" defaultValue={one(raw.product)}>
            <option value="">All products</option><option value="FLIGHT">Flights</option><option value="HOTEL">Hotels</option>
          </AdminSelect>
          <SearchMonitorSelect
            label="Identity"
            name="identity"
            value={one(raw.identity) || "all"}
            appearance="plain"
            clearFieldNamesOnChange={["userId", "visitorId"]}
            options={[
              { value: "all", label: "All identities" },
              { value: "registered", label: "Registered" },
              { value: "guest", label: "Guest" },
              { value: "unattributed", label: "Unattributed" },
            ]}
          />
          <AdminSelect name="correlation" defaultValue={one(raw.correlation)}>
            <option value="">All correlations</option><option value="exact">Linked to search</option><option value="unavailable">Search link unavailable</option>
          </AdminSelect>
          <AdminInput name="provider" defaultValue={one(raw.provider)} placeholder="Provider" />
          <AdminSelect name="environment" defaultValue={one(raw.environment)}>
            <option value="">Current environment</option><option value="staging">Staging</option><option value="production">Production</option>
          </AdminSelect>
          <AdminButton type="submit">Apply filters</AdminButton>
        </AdminFilterBar>

        {result.status === "ok" ? (
          result.data.items.length === 0 ? (
            <AdminEmptyState title="No provider handoffs found" message="No recorded provider handoffs match this environment and filter set." />
          ) : (
            <>
              <AdminDataTable
                columns={["Created", "Product", "Provider", "Route", "Price", "Source", "Destination", "Identity", "Search link", "Action"]}
                rows={result.data.items.map((handoff) => ({
                  id: handoff.id,
                  cells: [
                    formatDateTime(new Date(handoff.createdAt)),
                    <AdminStatusBadge key="product" tone="info">{handoff.product}</AdminStatusBadge>,
                    <span key="provider" className="font-semibold text-slate-950">{handoff.provider}</span>,
                    handoff.route || "—",
                    handoff.price ? handoff.currency + " " + handoff.price : "—",
                    handoff.sourcePage || "—",
                    handoff.destinationDomain || "—",
                    <div key="identity"><p className="font-semibold">{handoff.identity.kind}</p><p className="max-w-40 truncate text-xs text-slate-500">{handoff.identity.userId || handoff.identity.visitorId || "—"}</p></div>,
                    <AdminStatusBadge key="correlation" tone={handoff.searchCorrelation.kind === "exact" ? "good" : "neutral"}>{handoff.searchCorrelation.kind === "exact" ? "Exact" : "Unavailable"}</AdminStatusBadge>,
                    <Link key="action" href={"/admin/redirects/" + handoff.id + "?environment=" + handoff.environment} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                  ],
                }))}
              />
              {result.data.nextCursor ? <div className="flex justify-end"><Link href={cursorHref(embedded ? "/admin/searches/activity" : "/admin/redirects", embedded ? { ...raw, tab: "handoffs" } : raw, result.data.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Next page</Link></div> : null}
            </>
          )
        ) : (
          <AdminEmptyState title={result.status === "invalid" ? "Invalid filters" : result.status === "forbidden" ? "Admin access required" : "Handoff data unavailable"} message={"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The safe admin reader could not return handoff data. No empty result was invented."} />
        )}
      </div>
      </SearchWorkspacePanelFrame>
    </>
  );
  return (
    <section className="w-full min-w-0 bg-white text-[#0F172A]">
      <SearchWorkspaceBackLink href="/admin/providers?view=attribution" label="Provider reports" />
      <div className="mb-4">
        <h1 className="text-[18px] font-semibold">Provider Handoffs</h1>
        <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
          Recorded outbound referrals only — not confirmation of a booking or payment.
        </p>
      </div>
      <form action="/admin/redirects" method="get"
        aria-label="Filter provider handoffs"
        className="flex min-w-0 flex-wrap items-center gap-2 border-y border-[#D8E1EC] py-3">
        {one(raw.userId) ? <input type="hidden" name="userId" value={one(raw.userId)} /> : null}
        {one(raw.visitorId) ? <input type="hidden" name="visitorId" value={one(raw.visitorId)} /> : null}
        {one(raw.from) ? <input type="hidden" name="from" value={one(raw.from)} /> : null}
        {one(raw.to) ? <input type="hidden" name="to" value={one(raw.to)} /> : null}
        <label htmlFor="handoff-product" className="sr-only">Product</label>
        <select id="handoff-product" name="product" defaultValue={one(raw.product)}
          className="h-9 min-w-[118px] rounded-md border border-[#D8E1EC] bg-white px-2 text-[12px]">
          <option value="">All products</option>
          <option value="FLIGHT">Flights</option>
          <option value="HOTEL">Hotels</option>
        </select>
        <div className="flex h-9 min-w-[132px] items-center rounded-md border border-[#D8E1EC] px-3">
          <SearchMonitorSelect label="Identity" name="identity"
            value={one(raw.identity) || "all"} appearance="plain"
            clearFieldNamesOnChange={["userId", "visitorId"]}
            options={[
              { value: "all", label: "All identities" },
              { value: "registered", label: "Registered" },
              { value: "guest", label: "Guest" },
              { value: "unattributed", label: "Unattributed" },
            ]}
          />
        </div>
        <label htmlFor="handoff-correlation" className="sr-only">Search link</label>
        <select id="handoff-correlation" name="correlation" defaultValue={one(raw.correlation)}
          className="h-9 min-w-[175px] rounded-md border border-[#D8E1EC] bg-white px-2 text-[12px]">
          <option value="">All correlations</option>
          <option value="exact">Linked to search</option>
          <option value="unavailable">Search link unavailable</option>
        </select>
        <label htmlFor="handoff-provider" className="sr-only">Provider</label>
        <input id="handoff-provider" name="provider" type="search"
          defaultValue={one(raw.provider)} placeholder="Provider"
          className="h-9 min-w-[130px] flex-1 rounded-md border border-[#D8E1EC] bg-white px-3 text-[12px] placeholder:text-[#94A3B8] sm:max-w-[220px]" />
        <label htmlFor="handoff-environment" className="sr-only">Environment</label>
        <select id="handoff-environment" name="environment" defaultValue={one(raw.environment)}
          className="h-9 min-w-[146px] rounded-md border border-[#D8E1EC] bg-white px-2 text-[12px]">
          <option value="">Current environment</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </select>
        <button type="submit"
          className="h-9 rounded-md bg-[#004BB8] px-4 text-[12px] font-medium text-white hover:bg-[#003F9E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
          Apply filters
        </button>
      </form>
      {result.status === "ok" ? (
        result.data.items.length === 0 ? (
          <div className="py-5">
            <AdminEmptyState title="No provider handoffs found"
              message="No recorded provider handoffs match this environment and filter set." />
          </div>
        ) : (
          <>
            <div className="mt-3 w-full min-w-0 overflow-x-auto" role="region"
              aria-label="Provider handoff records" tabIndex={0}>
              <table className="w-full min-w-[1080px] table-fixed text-[12px] leading-5">
                <caption className="sr-only">
                  Recorded provider handoffs including the recorded time, product,
                  provider, route, price, source, destination, identity, search correlation and record action.
                </caption>
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[7%]" />
                  <col className="w-[13%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                  <col className="w-[11%]" />
                  <col className="w-[13%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                  <col className="w-[4%]" />
                </colgroup>
                <thead className="border-y border-[#D8E1EC] text-[#475569]">
                  <tr>
                    {["Created", "Product", "Provider", "Route", "Price", "Source", "Destination", "Identity", "Search link", "Action"].map(label => (
                      <th key={label} scope="col" className="px-2 py-3 text-left font-medium first:pl-0">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7ECF5]">
                  {result.data.items.map(handoff => (
                    <tr key={handoff.id} className="align-top hover:bg-[#FAFBFD]">
                      <td className="py-3 pr-2 tabular-nums">{formatDateTime(new Date(handoff.createdAt))}</td>
                      <td className="break-words px-2 py-3 font-medium">{handoff.product}</td>
                      <th scope="row" className="break-words px-2 py-3 text-left font-medium">{handoff.provider}</th>
                      <td className="break-words px-2 py-3">{handoff.route || "—"}</td>
                      <td className="break-words px-2 py-3 tabular-nums">
                        {handoff.price ? handoff.currency + " " + handoff.price : "—"}
                      </td>
                      <td className="break-all px-2 py-3 text-[#475569]">{handoff.sourcePage || "—"}</td>
                      <td className="break-all px-2 py-3 text-[#475569]">{handoff.destinationDomain || "—"}</td>
                      <td className="min-w-0 px-2 py-3">
                        <span className="block font-medium">{handoff.identity.kind}</span>
                        <span className="block break-all text-[11px] text-[#64748B]">
                          {handoff.identity.userId || handoff.identity.visitorId || "—"}
                        </span>
                      </td>
                      <td className="break-words px-2 py-3">
                        <span className={handoff.searchCorrelation.kind === "exact"
                          ? "font-medium text-emerald-700" : "text-[#64748B]"}>
                          {handoff.searchCorrelation.kind === "exact" ? "Exact" : "Unavailable"}
                        </span>
                      </td>
                      <td className="py-3 pl-2">
                        <Link href={"/admin/redirects/" + handoff.id + "?environment=" + handoff.environment}
                          className="font-medium text-[#004BB8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.data.nextCursor ? (
              <div className="flex justify-end border-t border-[#E7ECF5] py-3">
                <Link href={cursorHref("/admin/redirects", raw, result.data.nextCursor)}
                  className="text-[13px] font-medium text-[#004BB8] hover:underline">
                  Next page ›
                </Link>
              </div>
            ) : null}
          </>
        )
      ) : (
        <div className="py-5">
          <AdminEmptyState
            title={result.status === "invalid" ? "Invalid filters"
              : result.status === "forbidden" ? "Admin access required" : "Handoff data unavailable"}
            message={"issues" in result
              ? result.issues.map(issue => issue.field + ": " + issue.message).join(" ")
              : "The safe admin reader could not return handoff data. No empty result was invented."}
          />
        </div>
      )}
    </section>
  );

}

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function toParams(raw: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  return params;
}
function cursorHref(path: string, raw: Record<string, string | string[] | undefined>, cursor: string) {
  const params = toParams(raw); params.set("cursor", cursor); params.set("limit", "50"); return path + "?" + params.toString();
}
