import Link from "next/link";

import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminSelect, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { ProviderHandoffFilters } from "@/components/admin/ProviderHandoffFilters";
import { resolveHandoffDateRange, withHandoffDateScope } from "@/lib/adminHandoffDateRange";
import { buildHandoffProviderOptions } from "@/lib/adminHandoffProviderOptions";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { SearchWorkspacePanelFrame } from "@/components/admin/SearchWorkspacePanelFrame";
import { formatDateTime } from "@/lib/admin-data";
import { handoffDetailHref } from "@/lib/adminReferralHandoffNavigation";
import { handoffNextPageHref, handoffPreviousPageHref } from "@/lib/adminHandoffPagination";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Provider Handoffs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminRedirectsPage({ searchParams, embedded = false }: { embedded?: boolean; searchParams: SearchParams }) {
  const raw = await searchParams;
  const now = new Date();
  const dateWindow = resolveHandoffDateRange(raw, now);
  const scopedRaw = embedded ? raw : withHandoffDateScope(raw, now);
  const params = toParams(scopedRaw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminOperationalReads.handoffs.list(params);

  if (embedded) return (
    <>
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
      {one(scopedRaw.sourcePage) ? (
        <p className="mb-2 text-[12px] text-[#475569]">Source page: <span className="font-semibold text-[#020617]">{one(scopedRaw.sourcePage)}</span> <Link href={"/admin/redirects?" + (() => { const params = toParams(scopedRaw); if (one(scopedRaw.range)) params.set("range", one(scopedRaw.range)); params.delete("sourcePage"); params.delete("cursor"); return params.toString(); })()} className="ml-2 font-medium text-[#004BB8] hover:underline">Clear source</Link></p>
      ) : null}
      <ProviderHandoffFilters
        key={JSON.stringify([
          dateWindow.range, one(raw.range), one(raw.product), one(raw.identity),
          one(raw.correlation), one(raw.provider), one(raw.environment),
          one(raw.userId), one(raw.visitorId), one(raw.from), one(raw.to), one(raw.sourcePage),
        ])}
        initial={{
          product: one(scopedRaw.product),
          identity: one(scopedRaw.identity) || "all",
          correlation: one(scopedRaw.correlation),
          provider: one(scopedRaw.provider),
          environment: one(scopedRaw.environment),
        }}
        scope={{
          userId: one(scopedRaw.userId),
          visitorId: one(scopedRaw.visitorId),
          from: one(scopedRaw.from),
          to: one(scopedRaw.to),
          sourcePage: one(scopedRaw.sourcePage),
        }}
        range={dateWindow.range}
        providerOptions={buildHandoffProviderOptions(getProviderIntegrationStatuses(), one(scopedRaw.provider) || null)}
      />
      {result.status === "ok" ? (
        result.data.items.length === 0 ? (
          <div className="py-5">
            <AdminEmptyState title="No provider handoffs found"
              message="No recorded provider handoffs match this environment and filter set." />
          </div>
        ) : (
          <>
            <div className="mt-3 w-full min-w-0 max-w-full overflow-x-auto" role="region"
              aria-label="Provider handoff records" tabIndex={0}>
              <table className="w-full min-w-[1320px] table-fixed text-[12px] leading-5">
                <caption className="sr-only">
                  Recorded provider handoffs including the recorded time, product,
                  provider, route, price, source, destination, identity, search correlation and record action.
                </caption>
                <colgroup>
                  <col className="w-[12%]" />
                  <col className="w-[7%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                  <col className="w-[7%]" />
                  <col className="w-[11%]" />
                  <col className="w-[12%]" />
                  <col className="w-[13%]" />
                  <col className="w-[9%]" />
                  <col className="w-[5%]" />
                </colgroup>
                <thead className="border-y border-[#D8E1EC] text-[#475569]">
                  <tr>
                    {["Created", "Product", "Provider", "Route / property", "Price", "Source", "Destination", "Identity", "Search link", "Action"].map(label => (
                      <th key={label} scope="col" className="whitespace-nowrap px-2 py-3 text-left font-medium first:pl-0">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7ECF5]">
                  {result.data.items.map(handoff => (
                    <tr key={handoff.id} className="align-top hover:bg-[#FAFBFD]">
                      <td data-label="Created" className="py-3 pr-2 tabular-nums">{formatDateTime(new Date(handoff.createdAt))}</td>
                      <td data-label="Product" className="break-words px-2 py-3 font-medium">{handoff.product}</td>
                      <th scope="row" data-label="Provider" className="break-words px-2 py-3 text-left font-medium">{handoff.provider}</th>
                      <td data-label="Route / property" className="break-words px-2 py-3">{handoff.route || "—"}</td>
                      <td data-label="Price" className="break-words px-2 py-3 tabular-nums">
                        {handoff.price ? handoff.currency + " " + handoff.price : "—"}
                      </td>
                      <td data-label="Source" className="break-all px-2 py-3 text-[#475569]">{handoff.sourcePage || "—"}</td>
                      <td data-label="Destination" className="break-words px-2 py-3 text-[#475569]">{handoff.destinationDomain || "—"}</td>
                      <td data-label="Identity" className="min-w-0 px-2 py-3">
                        <span className="block font-medium">{handoff.identity.kind}</span>
                        <span className="block break-all text-[11px] text-[#64748B]">
                          {handoff.identity.userId || handoff.identity.visitorId || "—"}
                        </span>
                      </td>
                      <td data-label="Search link" className="whitespace-nowrap px-2 py-3">
                        <span className={handoff.searchCorrelation.kind === "exact"
                          ? "font-medium text-emerald-700" : "text-[#64748B]"}>
                          {handoff.searchCorrelation.kind === "exact" ? "Exact" : "Unavailable"}
                        </span>
                      </td>
                      <td data-label="Action" className="whitespace-nowrap py-3 pl-2 pr-2">
                        <Link href={handoffDetailHref(handoff.id, handoff.environment, scopedRaw)}
                          className="font-medium text-[#004BB8] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {handoffPreviousPageHref(scopedRaw) || result.data.nextCursor ? (
              <nav aria-label="Provider handoff pagination" className="flex justify-end gap-5 border-t border-[#E7ECF5] py-3">
                {handoffPreviousPageHref(scopedRaw) ? (
                  <Link href={handoffPreviousPageHref(scopedRaw)!}
                    className="text-[13px] font-medium text-[#004BB8] hover:underline">‹ Previous page</Link>
                ) : null}
                {result.data.nextCursor ? (
                  <Link href={handoffNextPageHref(scopedRaw, result.data.nextCursor)}
                    className="text-[13px] font-medium text-[#004BB8] hover:underline">Next page ›</Link>
                ) : null}
              </nav>
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
    if (key === "pageTrail" || key === "range") continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else if (value) params.set(key, value);
  }
  return params;
}


/** Embedded Search Activity handoffs retain their existing cursor links.
 * Standalone Handoff Records use the separate previous/next cursor history. */
function cursorHref(path: string, raw: Record<string, string | string[] | undefined>, cursor: string) {
  const params = toParams(raw);
  params.set("cursor", cursor);
  params.set("limit", "50");
  return path + "?" + params.toString();
}
