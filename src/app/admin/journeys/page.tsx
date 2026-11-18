import Link from "next/link";

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { CopyIdentityId } from "@/components/admin/CopyIdentityId";
import { JourneyDateRangeFields } from "@/components/admin/JourneyDateRangeFields";
import { journeyWindow, selectedJourneyRange } from "@/lib/adminJourneyDateRange";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { SearchWorkspacePanelFrame } from "@/components/admin/SearchWorkspacePanelFrame";
import { formatDateTime } from "@/lib/admin-data";
import { buildAdminSearchProviderOptions } from "@/lib/adminSearchProviderOptions";
import { getProviderIntegrationStatuses } from "@/services/travel/providerIntegrationStatus";
import { getPublicEnvironment } from "@/lib/stagingSafety";
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
  const providerOptions = buildAdminSearchProviderOptions(getProviderIntegrationStatuses(), one(raw.provider) || null);
  // Always constrain this view to the deployment's configured environment.
  // Historical environment URLs must not silently switch staging into production.
  const environment = getPublicEnvironment();
  const input: Record<string, unknown> = { ...withoutPagination(raw), ...fixed, environment, limit: one(raw.limit) || "25" };
  if (one(raw.cursor)) input.cursor = one(raw.cursor);
  const list = await adminJourneys.list(input);
  const summary = list.status === "ok"
    ? await adminJourneys.summary({ ...withoutPagination(raw), ...list.data.scope, environment })
    : null;

  return (
    <SearchWorkspacePanelFrame embedded={embedded} title="Visitor Journeys" hideHeader>
      <div className="w-full min-w-0 bg-white text-[#020617]">
        <form action={embedded ? "/admin/searches/activity" : "/admin/journeys"} method="get"
          aria-label="Filter visitor journeys" className="min-w-0">
          {embedded ? <input type="hidden" name="tab" value="journeys" /> : null}
          {one(raw.userId) ? <input type="hidden" name="userId" value={one(raw.userId)} /> : null}
          {one(raw.visitorId) ? <input type="hidden" name="visitorId" value={one(raw.visitorId)} /> : null}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 pb-3">
            <h2 className="text-[20px] font-semibold leading-7 text-[#020617]">Visitor Journeys</h2>
            <JourneyDateRangeFields initialRange={range}
              initialFrom={one(raw.from) || (range === "custom" ? (list.status === "ok" ? list.data.scope.from : "") : "")}
              initialTo={one(raw.to) || (range === "custom" ? (list.status === "ok" ? list.data.scope.to : "") : "")}
              now={now.toISOString()} />
          </div>
        {summary?.status === "ok" ? (
          <section aria-label="Journey summary" className="grid min-w-0 grid-cols-2 gap-y-3 border-y border-[#D8E1EC] py-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-y-0">
            <Metric label="Journeys" value={summary.data.journeys} />
            <Metric label="Searches in journeys" value={summary.data.recordedSearches.total} />
            <Metric label="Results viewed" value={summary.data.stages.RESULTS_VIEWED.events} />
            <Metric label="Offers selected" value={summary.data.stages.OFFER_SELECTED.events} />
            <Metric label="Provider handoffs" value={summary.data.stages.PROVIDER_HANDOFF_STARTED.events} />
          </section>
        ) : null}

        <p className="py-3 text-[12px] leading-5 text-[#64748B]">
          Only eligible consented journeys are included. Stages count recorded events, not confirmed bookings.
          Necessary operational guest searches remain available in Search Activity.
        </p>

        <div data-testid="journey-filters-toolbar" className="grid min-w-0 grid-cols-1 items-center gap-2 border-y border-[#D8E1EC] py-3 sm:grid-cols-2 xl:flex xl:flex-nowrap xl:items-stretch">
          <div className="min-w-0 xl:flex-1">
            <SearchMonitorSelect label="Product" name="product" appearance="fare"
              value={one(raw.product)} options={[
                { value: "", label: "All products" },
                { value: "FLIGHT", label: "Flights" },
                { value: "HOTEL", label: "Hotels" },
                { value: "CAR", label: "Cars" },
                { value: "PACKAGE", label: "Packages" },
              ]} truncateLabel />
          </div>
          <div className="min-w-0 xl:flex-1">
            <SearchMonitorSelect label="Identity" name="identity"
              value={one(raw.identity) || "all"} appearance="fare"
              clearFieldNamesOnChange={["userId", "visitorId"]}
              options={[
                { value: "all", label: "All identities" },
                { value: "registered", label: "Registered" },
                { value: "guest", label: "Guest" },
              ]} truncateLabel />
          </div>
          <div className="min-w-0 xl:flex-[1.25_1_0%]">
            <SearchMonitorSelect label="Observed stage" name="stage" appearance="fare"
              value={one(raw.stage)} options={[
                { value: "", label: "All observed stages" },
                ...stages.map(stage => ({ value: stage.value, label: stage.label })),
              ]} truncateLabel />
          </div>
          <div className="min-w-0 xl:flex-1">
            <SearchMonitorSelect label="Provider" name="provider" appearance="fare"
              value={one(raw.provider)} options={providerOptions} align="end" truncateLabel />
          </div>
          <button type="submit"
            className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white transition hover:bg-[#003D97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] sm:col-span-2 xl:w-[132px] xl:shrink-0">
            Apply filters
          </button>
        </div>
        </form>

        {summary?.status === "ok" ? (
          <p className="py-3 text-[12px] leading-5 text-[#64748B]">
            Provider handoffs: {summary.data.operationalHandoffs.total} recorded redirects in this environment and time window;
            {" "}{summary.data.operationalHandoffs.inConsentedJourneys} in eligible journeys and
            {" "}{summary.data.operationalHandoffs.outsideConsentedJourneys} outside eligible journeys.
            Missing identity or consent is never inferred.
          </p>
        ) : null}

        {list.status === "ok" ? (
          list.data.items.length === 0 ? (
            <AdminEmptyState title="No journeys found" message="No consented journeys match this environment, time window and filter set." />
          ) : (
            <section aria-label="Visitor journeys directory" className="min-w-0 pt-2">
              <div className="admin-responsive-records min-w-0 max-w-full overflow-x-auto" role="region" aria-label="Journey records" tabIndex={0}>
                <table className="w-full min-w-0 table-fixed text-left text-[13px]">
                  <caption className="sr-only">Eligible visitor journeys matching the selected filters</caption>
                  <colgroup>
                    <col className="w-[15%]" /><col className="w-[16%]" /><col className="w-[9%]" />
                    <col className="w-[14%]" /><col className="w-[7%]" /><col className="w-[22%]" />
                    <col className="w-[6%]" /><col className="w-[11%]" />
                  </colgroup>
                  <thead className="border-b border-[#D8E1EC] bg-white text-[12px] text-[#475569]">
                    <tr>
                      {["Last activity", "Identity", "Products", "Providers", "Searches", "Observed stages", "Events", "Action"].map(label => (
                        <th key={label} scope="col" className="px-2 py-2.5 text-left font-medium uppercase">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7ECF5]">
                    {list.data.items.map(journey => {
                      const identityId = journey.identity.userId || journey.identity.visitorId;
                      return (
                      <tr key={journey.id} className="min-h-[56px] align-top transition-colors hover:bg-[#F8FAFC]">
                        <td data-label="Last activity" className="px-2 py-2.5">
                          <p className="font-medium leading-5 text-[#020617]">{formatDateTime(new Date(journey.lastEventAt))}</p>
                          <p className="mt-1 text-[12px] leading-4 text-[#64748B]">Started {formatDateTime(new Date(journey.startedAt))}</p>
                        </td>
                        <td data-label="Identity" className="px-2 py-2.5">
                          <p className="font-medium capitalize text-[#020617]">{journey.identity.kind}</p>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1">
                            <span className="block min-w-0 flex-1 overflow-hidden text-ellipsis [white-space:nowrap] text-[11px] text-[#64748B]"
                              title={identityId || undefined}>
                              {identityId || "—"}
                            </span>
                            {identityId ? <CopyIdentityId id={identityId} kind={journey.identity.kind === "registered" ? "user" : "guest"} /> : null}
                          </div>
                        </td>
                        <td data-label="Products" className="px-2 py-2.5 text-[#334155]">{journey.products.join(", ") || "—"}</td>
                        <td data-label="Providers" className="px-2 py-2.5 text-[#334155] [overflow-wrap:anywhere]">
                          {journey.providers.length
                            ? journey.providers.join(", ") + (journey.providerCount > journey.providers.length ? " +" + (journey.providerCount - journey.providers.length) : "")
                            : "—"}
                        </td>
                        <td data-label="Searches" className="px-2 py-2.5 tabular-nums text-[#334155]">{journey.searchCount}</td>
                        <td data-label="Observed stages" className="px-2 py-2.5">
                          <div className="flex min-w-0 flex-wrap gap-1">
                            {stages.filter(stage => journey.stages[stage.value] > 0).map(stage => (
                              <span key={stage.value}
                                className={"inline-flex max-w-full items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-4 [overflow-wrap:anywhere] " +
                                  (stage.value === "PROVIDER_HANDOFF_STARTED"
                                    ? "border-[#A7E6D1] bg-[#F0FDF8] text-[#047857]"
                                    : "border-[#D8E1EC] bg-white text-[#475569]")}>
                                {stage.label}: {journey.stages[stage.value]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td data-label="Events" className="px-2 py-2.5 tabular-nums text-[#334155]">{journey.eventCount}</td>
                        <td data-label="Action" className="px-2 py-2.5">
                          <Link href={detailHref(journey.id, list.data.scope, range)}
                            aria-label={`View activity for ${journey.identity.kind} journey ${journey.id}`}
                            className="inline-flex min-h-8 items-center text-[12px] font-medium text-[#004BB8] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
                            View activity
                          </Link>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {list.data.nextCursor ? (
                <div className="flex justify-end border-t border-[#E7ECF5] py-3">
                  <Link href={embedded ? workspaceCursorHref(raw, list.data.nextCursor, "journeys") : cursorHref(raw, list.data.nextCursor)}
                    className="inline-flex h-9 items-center rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]">
                    Next page
                  </Link>
                </div>
              ) : null}
            </section>
          )
        ) : (
          <AdminEmptyState title={list.status === "invalid" ? "Invalid journey filters" : list.status === "forbidden" ? "Admin access required" : "Journey data unavailable"}
            message={"issues" in list ? list.issues.map(issue => issue.field + ": " + issue.message).join(" ") : "The journey reader could not return data. An unavailable read is not shown as a false zero."} />
        )}
      </div>
    </SearchWorkspacePanelFrame>
  );
}

function one(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
function withoutPagination(raw: Record<string, string | string[] | undefined>) {
  const copy: Record<string, unknown> = {};
  for (const key of ["identity","product","stage","provider","userId","visitorId","from","to"]) {
    if (raw[key] !== undefined) copy[key] = raw[key];
  }
  return copy;
}
function Metric({label,value}:{label:string;value:number}) {
  return <div className="min-w-0 px-3 py-1 lg:border-r lg:border-[#E7ECF5] lg:px-5 lg:last:border-r-0">
    <p className="text-[12px] font-normal text-[#64748B]">{label}</p>
    <p className="mt-1 text-[18px] font-medium leading-6 tabular-nums text-[#020617]">{value.toLocaleString()}</p>
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
