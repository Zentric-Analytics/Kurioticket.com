import Link from "next/link";

import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminPageShell, AdminSelect, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Provider Handoffs" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminRedirectsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = toParams(raw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminOperationalReads.handoffs.list(params);

  return (
    <>
      <SearchWorkspaceBackLink />
      <AdminPageShell
        title="Provider Handoffs"
        description="Review verified outbound provider handoffs. A handoff records leaving Kurioticket for a provider; it is not proof of a completed booking or payment."
      >
      <div className="space-y-4">
        <AdminFilterBar action="/admin/redirects">
          <AdminSelect name="product" defaultValue={one(raw.product)}>
            <option value="">All products</option><option value="FLIGHT">Flights</option><option value="HOTEL">Hotels</option>
          </AdminSelect>
          <AdminSelect name="identity" defaultValue={one(raw.identity) || "all"}>
            <option value="all">All identities</option><option value="registered">Registered</option><option value="guest">Guest</option><option value="unattributed">Unattributed</option>
          </AdminSelect>
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
              {result.data.nextCursor ? <div className="flex justify-end"><Link href={cursorHref("/admin/redirects", raw, result.data.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Next page</Link></div> : null}
            </>
          )
        ) : (
          <AdminEmptyState title={result.status === "invalid" ? "Invalid filters" : result.status === "forbidden" ? "Admin access required" : "Handoff data unavailable"} message={"issues" in result ? result.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The safe admin reader could not return handoff data. No empty result was invented."} />
        )}
      </div>
      </AdminPageShell>
    </>
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
