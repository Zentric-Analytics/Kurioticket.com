import Link from "next/link";

import { AdminButton, AdminDataTable, AdminEmptyState, AdminFilterBar, AdminInput, AdminPageShell, AdminSelect, AdminStatusBadge } from "@/components/admin/AdminPageShell";
import { JourneyDateRangeFields } from "@/components/admin/JourneyDateRangeFields";
import { journeyWindow, selectedJourneyRange } from "@/lib/adminJourneyDateRange";
import { SearchWorkspaceBackLink } from "@/components/admin/SearchWorkspaceBackLink";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { SearchWorkspacePanelFrame } from "@/components/admin/SearchWorkspacePanelFrame";
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

export default async function AdminJourneysPage({ searchParams, embedded = false }: { embedded?: boolean; searchParams: SearchParams }) {
  const raw = await searchParams;
  const now = new Date();
  // The legacy backend defaults each call to its own moving seven-day window.
  // Pin both reads to the same explicit bounds, including cursor continuations.
  const range = selectedJourneyRange(raw);
  const fixed = journeyWindow(raw, now);
  const input: Record<string, unknown> = { ...withoutPagination(raw), ...fixed, limit: one(raw.limit) || "25" };
  if (one(raw.cursor)) input.cursor = one(raw.cursor);
  const list = await adminJourneys.list(input);
  const summary = list.status === "ok"
    ? await adminJourneys.summary({ ...withoutPagination(raw), ...list.data.scope })
    : null;

  return (
    <>
      {!embedded ? <SearchWorkspaceBackLink href="/admin/users" label="Users" /> : null}
      <SearchWorkspacePanelFrame embedded={embedded}
        title="Journeys"
        hideHeader
      >
      <div className="mx-auto w-full max-w-[1500px] text-[#374151]">
        {summary?.status === "ok" ? (
          <div className="grid grid-cols-2 border-y border-[#E5E7EB] md:grid-cols-5">
            <Metric label="Journeys" value={summary.data.journeys} />
            <Metric label="Searches in journeys" value={summary.data.recordedSearches.total} />
            <Metric label="Results viewed" value={summary.data.stages.RESULTS_VIEWED.events} />
            <Metric label="Offers selected" value={summary.data.stages.OFFER_SELECTED.events} />
            <Metric label="Provider handoffs" value={summary.data.stages.PROVIDER_HANDOFF_STARTED.events} />
          </div>
        ) : null}
        <p className="border-b border-[#E5E7EB] px-2 py-3 text-[12px] leading-5 text-[#6B7280]">Only eligible consented journeys are included in these figures. Stages count recorded events, not assumed customer actions or confirmed bookings. Necessary operational guest searches remain available in Search Activity.</p>
        <AdminFilterBar action={embedded ? "/admin/searches/activity" : "/admin/journeys"}>
          {embedded ? <input type="hidden" name="tab" value="journeys" /> : null}

          {one(raw.userId) ? <input type="hidden" name="userId" value={one(raw.userId)} /> : null}
          {one(raw.visitorId) ? <input type="hidden" name="visitorId" value={one(raw.visitorId)} /> : null}
          <JourneyDateRangeFields initialRange={range} initialFrom={one(raw.from) || (range === "custom" ? (list.status === "ok" ? list.data.scope.from : "") : "")} initialTo={one(raw.to) || (range === "custom" ? (list.status === "ok" ? list.data.scope.to : "") : "")} now={now.toISOString()} />
          <AdminSelect name="product" defaultValue={one(raw.product)}>
            <option value="">All products</option><option value="FLIGHT">Flights</option><option value="HOTEL">Hotels</option><option value="CAR">Cars</option><option value="PACKAGE">Packages</option>
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
            ]}
          />
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


        {summary?.status === "ok" ? (
          <p className="border-b border-[#E5E7EB] px-2 py-3 text-[12px] leading-5 text-[#6B7280]">
            These handoff counts include only consented journey events, not all provider redirects.
            {" "}In the selected environment and date window, {summary.data.operationalHandoffs.total} redirect records were stored,
            {" "}{summary.data.operationalHandoffs.inConsentedJourneys} appear in eligible journeys and
            {" "}{summary.data.operationalHandoffs.outsideConsentedJourneys} are outside eligible journeys.
            Missing identity or consent is never reconstructed from timing.
          </p>
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
                    <Link key="action" href={detailHref(journey.id, list.data.scope, range)} className="font-black text-indigo-700 hover:text-indigo-900">Open</Link>,
                  ],
                }))}
              />
              {list.data.nextCursor ? <div className="flex justify-end"><Link href={embedded ? workspaceCursorHref(raw, list.data.nextCursor, "journeys") : cursorHref(raw, list.data.nextCursor)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">Next page</Link></div> : null}
            </>
          )
        ) : (
          <AdminEmptyState title={list.status === "invalid" ? "Invalid journey filters" : list.status === "forbidden" ? "Admin access required" : "Journey data unavailable"} message={"issues" in list ? list.issues.map((issue) => issue.field + ": " + issue.message).join(" ") : "The journey reader could not return data. An unavailable read is not shown as a false zero."} />
        )}
      </div>
      </SearchWorkspacePanelFrame>
    </>
  );
}

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function withoutPagination(raw: Record<string, string | string[] | undefined>) {
  const copy: Record<string, unknown> = {};
  for (const key of ["environment","identity","product","stage","provider","userId","visitorId","from","to"]) {
    if (raw[key] !== undefined) copy[key] = raw[key];
  }
  return copy;
}
function Metric({label,value}:{label:string;value:number}) {
  return <div className="min-h-[84px] border-r border-[#E5E7EB] px-3 py-3 last:border-r-0">
    <p className="text-[11px] font-medium text-[#6B7280]">{label}</p>
    <p className="mt-1 text-[24px] font-medium text-[#111827]">{value.toLocaleString()}</p>
  </div>;
}
function detailHref(id: string, scope: { from: string; to: string; environment: string; identity: string; product?: string; provider?: string; stage?: string; userId?: string; visitorId?: string }, range: string) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(scope)) if (value) p.set(key, value);
  p.set("range", range);
  return "/admin/journeys/" + id + "?" + p.toString();
}
function cursorHref(raw: Record<string, string | string[] | undefined>, cursor: string) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) if (typeof value === "string" && value && key !== "cursor") p.set(key, value);
  p.set("cursor", cursor); p.set("limit", one(raw.limit) || "25");
  return "/admin/journeys?" + p.toString();
}

function workspaceCursorHref(raw: Record<string,string|string[]|undefined>, cursor: string, tab: string) {
  return cursorHref({...raw, tab}, cursor).replace("/admin/journeys?", "/admin/searches/activity?");
}
