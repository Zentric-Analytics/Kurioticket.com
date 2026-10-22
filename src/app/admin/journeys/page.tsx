import Link from "next/link";

import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminMetricCard, AdminPageShell, AdminSelect, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { formatDateTime } from "@/lib/admin-data";
import { adminJourneys } from "@/services/adminJourneyService";
import type { AdminJourneyStage } from "@/services/adminJourneyContract";

export const metadata = { title: "Admin Journeys" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const stages: Array<{ value: AdminJourneyStage; label: string }> = [
  { value: "SEARCH_COMPLETED", label: "Search completed" },
  { value: "RESULTS_VIEWED", label: "Results viewed" },
  { value: "OFFER_SELECTED", label: "Offer selected" },
  { value: "PROVIDER_HANDOFF_STARTED", label: "Provider handoff" },
];

export default async function AdminJourneysPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const input: Record<string, unknown> = { ...raw, limit: one(raw.limit) || "25" };
  const [list, summary] = await Promise.all([
    adminJourneys.list(input),
    adminJourneys.summary(withoutPagination(raw)),
  ]);

  return (
    <AdminPageShell
      title="Journeys"
      description="Trace consented user journeys across recorded search, result-view, offer-selection and provider-handoff events. Observed stages are evidence of activity, not proof of booking completion."
      actions={<Link href="/admin/searches" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Back to searches</Link>}
    >
      <div className="space-y-4">
        <AdminFilterBar action="/admin/journeys">
          <AdminSelect name="product" defaultValue={one(raw.product)}>
            <option value="">All products</option><option value="FLIGHT">Flights</option><option value="HOTEL">Hotels</option><option value="CAR">Cars</option><option value="PACKAGE">Packages</option>
          </AdminSelect>
          <AdminSelect name="identity" defaultValue={one(raw.identity) || "all"}>
            <option value="all">All identities</option><option value="registered">Registered</option><option value="guest">Guest</option>
          </AdminSelect>
          <AdminSelect name="stage" defaultValue={one(raw.stage)}>
            <option value="">All observed stages</option>
            {stages.map((stage) => <option key={stage.value} value={stage.value}>{stage.label}</option>)}
          </AdminSelect>
          <AdminInput name="provider" defaultValue={one(raw.provider)} placeholder="Provider" />
          <AdminSelect name="environment" defaultValue={one(raw.environment)}>
            <option value="">Current environment</option><option value="staging">Staging</option><option value="production">Production</option>
          </AdminSelect>
          <AdminButton type="submit">Apply filters</AdminButton>
        </AdminFilterBar>

        {summary.status === "ok" ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <AdminMetricCard label="Journeys" value={summary.data.journeys} hint="Matched consented journeys" tone="info" />
            <AdminMetricCard label="Identities" value={summary.data.identities.total} hint={summary.data.identities.registered + " registered · " + summary.data.identities.guests + " guest"} />
            <AdminMetricCard label="Recorded searches" value={summary.data.recordedSearches.total} hint={summary.data.recordedSearches.failed + " failed"} tone={summary.data.recordedSearches.failed ? "warn" : "neutral"} />
            <AdminMetricCard label="Exact handoffs" value={summary.data.handoffCorrelation.exactEvents} hint="Explicitly linked to a search" tone="good" />
            <AdminMetricCard label="Uncorrelated handoffs" value={summary.data.handoffCorrelation.uncorrelatedEvents} hint="No exact originating search link" tone="neutral" />
          </div>
        ) : null}

        {list.status === "ok" ? (
          list.data.items.length === 0 ? (
            <AdminEmptyState title="No journeys found" message="No consented journeys match this environment, time window and filter set." />
          ) : (
            <>
              <AdminDataTable
                columns={["Last activity", "Identity", "Products", "Providers", "Searches", "Observed stages", "Events", "Action"]}
                rows={list.data.items.map((journey) => ({
                  id: journey.id,
                  cells: [
                    <div key="time"><p className="font-semibold text-slate-950">{formatDateTime(new Date(journey.lastEventAt))}</p><p className="text-xs text-slate-500">Started {formatDateTime(new Date(journey.startedAt))}</p></div>,
                    <div key="identity"><p className="font-semibold capitalize">{journey.identity.kind}</p><p className="max-w-40 truncate text-xs text-slate-500">{journey.identity.userId || journey.identity.visitorId}</p></div>,
                    journey.products.join(", ") || "—",
                    journey.providers.length ? journey.providers.join(", ") + (journey.providerCount > journey.providers.length ? " +" + (journey.providerCount - journey.providers.length) : "") : "—",
                    journey.searchCount,
                    <div key="stages" className="flex max-w-64 flex-wrap gap-1">{stages.filter((stage) => journey.stages[stage.value] > 0).map((stage) => <AdminStatusBadge key={stage.value} tone={stage.value === "PROVIDER_HANDOFF_STARTED" ? "good" : "info"}>{stage.label}: {journey.stages[stage.value]}</AdminStatusBadge>)}</div>,
                    journey.eventCount,
                    <Link key="action" href={detailHref(journey.id, list.data.scope)} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                  ],
                }))}
              />
              {list.data.nextCursor ? <div className="flex justify-end"><Link href={cursorHref(raw, list.data.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Next page</Link></div> : null}
            </>
          )
        ) : (
          <AdminEmptyState title={list.status === "invalid" ? "Invalid journey filters" : list.status === "forbidden" ? "Admin access required" : "Journey data unavailable"} message={"issues" in list ? list.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The journey reader could not return data. An unavailable read is not shown as a false zero."} />
        )}
      </div>
    </AdminPageShell>
  );
}

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function withoutPagination(raw: Record<string, string | string[] | undefined>) {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) if (key !== "cursor" && key !== "limit") copy[key] = value;
  return copy;
}
function detailHref(id: string, scope: { from: string; to: string; environment: string; identity: string; product?: string; provider?: string; stage?: string; userId?: string; visitorId?: string }) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(scope)) if (value) p.set(key, value);
  return "/admin/journeys/" + id + "?" + p.toString();
}
function cursorHref(raw: Record<string, string | string[] | undefined>, cursor: string) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && value && key !== "cursor") p.set(key, value);
  p.set("cursor", cursor); p.set("limit", one(raw.limit) || "25");
  return "/admin/journeys?" + p.toString();
}
