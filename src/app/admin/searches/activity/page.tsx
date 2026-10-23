import Link from "next/link";

import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminPageShell, AdminSelect, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { adminOperationalReads } from "@/services/adminOperationalReadService";

export const metadata = { title: "Admin Search Activity" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminSearchActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const params = toParams(raw);
  if (!params.has("limit")) params.set("limit", "50");
  const result = await adminOperationalReads.searches.list(params);

  return (
    <AdminPageShell
      title="Search Activity"
      description="Review recorded search activity through the safe admin read contract. Raw search JSON and private tracking tokens are never exposed."

    >
      <div className="space-y-4">
        <AdminFilterBar action="/admin/searches/activity">
          <AdminSelect name="product" defaultValue={one(raw.product)}>
            <option value="">All products</option><option value="FLIGHT">Flights</option><option value="HOTEL">Hotels</option><option value="CAR">Cars</option><option value="PACKAGE">Packages</option>
          </AdminSelect>
          <AdminSelect name="status" defaultValue={one(raw.status)}>
            <option value="">All outcomes</option><option value="SUCCESS">Success</option><option value="PARTIAL">Partial</option><option value="FAILED">Failed</option>
          </AdminSelect>
          <AdminSelect name="identity" defaultValue={one(raw.identity) || "all"}>
            <option value="all">All identities</option><option value="registered">Registered</option><option value="guest">Guest</option><option value="unattributed">Unattributed</option>
          </AdminSelect>
          <AdminInput name="provider" defaultValue={one(raw.provider)} placeholder="Provider" />
          <AdminSelect name="environment" defaultValue={one(raw.environment)}>
            <option value="">Current environment</option><option value="staging">Staging</option><option value="production">Production</option>
          </AdminSelect>
          <AdminButton type="submit">Apply filters</AdminButton>
        </AdminFilterBar>

        {result.status === "ok" ? (
          result.data.items.length === 0 ? (
            <AdminEmptyState title="No searches found" message="No recorded searches match this environment and filter set." />
          ) : (
            <>
              <AdminDataTable
                columns={["Created", "Product", "Route / stay", "Market", "Results", "Providers", "Identity", "Status", "Action"]}
                rows={result.data.items.map((search) => ({
                  id: search.id,
                  cells: [
                    formatDateTime(new Date(search.createdAt)),
                    <AdminStatusBadge key="product" tone="info">{search.product}</AdminStatusBadge>,
                    <div key="route"><p className="font-semibold text-slate-950">{search.origin || "—"}{search.destination ? " → " + search.destination : ""}</p><p className="text-xs text-slate-500">{search.checkIn ? search.checkIn + (search.checkOut ? " → " + search.checkOut : "") : search.requestId || "No request ID"}</p></div>,
                    (search.market || "—") + " / " + (search.currency || "—"),
                    search.resultCount,
                    search.providers.length ? search.providers.join(", ") : "—",
                    <div key="identity"><p className="font-semibold">{search.identity.kind}</p><p className="max-w-40 truncate text-xs text-slate-500">{search.identity.userId || search.identity.visitorId || "—"}</p></div>,
                    <AdminStatusBadge key="status" tone={search.status === "SUCCESS" ? "good" : search.status === "FAILED" ? "bad" : "warn"}>{search.status}</AdminStatusBadge>,
                    <Link key="action" href={"/admin/searches/" + search.id + "?environment=" + search.environment} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                  ],
                }))}
              />
              {result.data.nextCursor ? <div className="flex justify-end"><Link href={cursorHref("/admin/searches/activity", raw, result.data.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Next page</Link></div> : null}
            </>
          )
        ) : (
          <ReadError status={result.status} issues={"issues" in result ? result.issues : undefined} />
        )}
      </div>
    </AdminPageShell>
  );
}

function ReadError({ status, issues }: { status: string; issues?: Array<{ field: string; message: string }> }) {
  return <AdminEmptyState title={status === "invalid" ? "Invalid filters" : status === "forbidden" ? "Admin access required" : "Search data unavailable"} message={issues?.map((issue) => issue.field + ": " + issue.message).join(" ") || "The safe admin reader could not return search data. No empty result was invented."} />;
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
