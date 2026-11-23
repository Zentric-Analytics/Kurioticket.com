import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Route } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { JourneyDateRangeFields } from "@/components/admin/JourneyDateRangeFields";
import { SearchMonitorSelect } from "@/components/admin/SearchMonitorSelect";
import { formatDateTime } from "@/lib/admin-data";
import { decodeActivityJourneyReturn, encodeActivityJourneyReturn } from "@/lib/adminActivityJourneyNavigation";
import { JOURNEY_ALL_TIME_FROM } from "@/lib/adminJourneyDateRange";
import { identityJourneyHistoryHref, identityJourneyHistoryQuery } from "@/lib/adminIdentityJourneyHistory";
import { validActivityIdentity, type ActivityFilters } from "@/lib/adminIdentityActivity";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { requireAdminSession } from "@/lib/auth-guards";
import { adminJourneys } from "@/services/adminJourneyService";
import { parseAdminJourneyQuery, type AdminJourneyRow, type AdminJourneyScope } from "@/services/adminJourneyContract";
import { loadAdminIdentityActivity } from "@/services/adminIdentityActivityService";

export const metadata = { title: "Admin User Journey History" };

type RawQuery = Record<string, string | string[] | undefined>;
type PageProps = {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<RawQuery>;
};

const stages = [
  { value: "SEARCH_COMPLETED", label: "Search completed" },
  { value: "RESULTS_VIEWED", label: "Results viewed" },
  { value: "OFFER_SELECTED", label: "Offer selected" },
  { value: "PROVIDER_HANDOFF_STARTED", label: "Provider handoff" },
] as const;

const products = [
  { value: "", label: "All products" },
  { value: "FLIGHT", label: "Flights" },
  { value: "HOTEL", label: "Hotels" },
  { value: "CAR", label: "Cars" },
  { value: "PACKAGE", label: "Packages" },
];

const linkStyle = "inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#D8E1EC] bg-white px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]";
const one = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

function metric(label: string, count: number) {
  return <div key={label} className="min-w-0 px-3 py-2 lg:border-r lg:border-[#E7ECF5] lg:last:border-r-0">
    <p className="text-[12px] text-[#64748B]">{label}</p>
    <p className="mt-1 text-[18px] font-medium tabular-nums text-[#020617]">{count.toLocaleString()}</p>
  </div>;
}

function detailHref(
  item: AdminJourneyRow,
  scope: AdminJourneyScope,
  returnPath: string,
) {
  const query = new URLSearchParams();
  // Journey Details shows the complete recorded chronology of this
  // selected journey, not only events matching the history-list filters.
  // Keep environment/identity authorization scoped to the selected owner.
  query.set("from", JOURNEY_ALL_TIME_FROM);
  query.set("to", new Date().toISOString());
  query.set("environment", scope.environment);
  query.set("identity", scope.identity);
  if (scope.userId) query.set("userId", scope.userId);
  if (scope.visitorId) query.set("visitorId", scope.visitorId);
  const back = encodeActivityJourneyReturn(returnPath);
  if (back) query.set("activityReturn", back);
  return "/admin/journeys/" + encodeURIComponent(item.id) + "?" + query.toString();
}

export default async function AdminIdentityJourneyHistoryPage({ params, searchParams }: PageProps) {
  const { kind, id } = await params;
  if (!validActivityIdentity(kind, id)) notFound();
  const route = "/admin/users/" + kind + "/" + encodeURIComponent(id);
  await requireAdminSession(route + "/journeys");
  const raw = await searchParams;
  const now = new Date();
  const environment = getPublicEnvironment();
  const requested = identityJourneyHistoryQuery(kind, id, raw, now, environment);
  const incomingReturn = decodeActivityJourneyReturn(raw.activityReturn);
  // Navigation context can never switch the selected identity.
  const backHref = incomingReturn && (
    incomingReturn === route + "/activity"
    || incomingReturn.startsWith(route + "/activity?")
  ) ? incomingReturn : route + "/activity";
  const returnLink = <Link href={backHref} className={linkStyle}><ArrowLeft size={15} aria-hidden="true" /> Back to Activity</Link>;

  if (!requested.ok) return <div className="min-w-0 space-y-4 bg-white">
    {returnLink}
    <AdminEmptyState title="Invalid journey filters"
      message="Choose a valid date range and filters, then try again."
      action={<Link href={route + "/journeys"} className={linkStyle}>Reset journey filters</Link>} />
  </div>;

  // Validate every scoped query before reading identity or activity. This also
  // pins a continuation to the selected user, date window and environment.
  const validated = parseAdminJourneyQuery(requested.input, "list", now, environment);
  if (validated.status !== "ok") return <div className="min-w-0 space-y-4 bg-white">
    {returnLink}
    <AdminEmptyState title="Invalid journey filters"
      message="The selected date range, filter or history page is not valid for this visitor."
      action={<Link href={route + "/journeys"} className={linkStyle}>Return to journey history</Link>} />
  </div>;

  const scope = validated.data.scope;
  const activityFilters: ActivityFilters = {
    tab: "all", stage: scope.stage ?? "all", product: scope.product ?? "all",
    from: scope.from, to: scope.to, q: "", order: "newest",
  };
  // The existing reader establishes whether this is a registered account,
  // consented guest, or essential-only operational session. Never infer it
  // from the record's UUID or from a zero journey count.
  const identity = await loadAdminIdentityActivity(
    kind, id, activityFilters, one(raw.activityCursor) || undefined, "page",
  );
  if (identity.status === "not_found") notFound();
  if (identity.status !== "ok") return <div className="min-w-0 space-y-4 bg-white">
    {returnLink}
    <AdminEmptyState title="Journey history unavailable"
      message={identity.status === "invalid_cursor"
        ? "This activity page link is no longer valid. Reopen the visitor's journey history."
        : "The identity activity reader is temporarily unavailable. This does not mean there is no history."}
      action={<Link href={route + "/journeys"} className={linkStyle}>Retry history</Link>} />
  </div>;

  const operational = identity.data.source === "operational";
  // Account-only actions are a separate authorized ledger, not an inferred
  // search journey. Use the complete reader so the history is not silently
  // truncated by the normal 20-row activity-page cursor. Never mix this
  // section with a requested stage/provider filter that it cannot satisfy.
  const accountActions = !operational && !scope.stage && !scope.provider
    ? await loadAdminIdentityActivity(kind, id, {
        ...activityFilters, tab: "all", stage: "ACCOUNT_ACTIVITY",
      }, undefined, "all")
    : null;
  const otherActions = accountActions?.status === "ok"
    ? accountActions.data.events.filter(event => event.stage === "ACCOUNT_ACTIVITY")
    : [];
  const list = operational ? null : await adminJourneys.list(requested.input);
  const summary = list?.status === "ok"
    ? await adminJourneys.summary(list.data.scope)
    : null;
  const filterContext = { ...raw, range: requested.range };
  const preserved = identityJourneyHistoryHref(kind, id, filterContext);
  const returnToken = encodeActivityJourneyReturn(backHref);
  const returnQuery = new URL(preserved, "https://admin.kurioticket.invalid");
  if (returnToken && !returnQuery.searchParams.has("activityReturn")) {
    returnQuery.searchParams.set("activityReturn", returnToken);
  }
  const returnPath = returnQuery.pathname + returnQuery.search;

  const nextOperationalHref = operational && identity.data.nextCursor
    ? (() => {
      const path = identityJourneyHistoryHref(kind, id, {
        ...filterContext, from: scope.from, to: scope.to,
      });
      return path + (path.includes("?") ? "&" : "?")
        + "activityCursor=" + encodeURIComponent(identity.data.nextCursor!);
    })()
    : null;

  return <div className="min-w-0 space-y-5 bg-white pb-5 text-[#020617]">
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px] text-[#475569]">
      <Link href={backHref} className="inline-flex items-center gap-1 hover:text-[#004BB8] focus-visible:outline-2">
        <ArrowLeft size={15} aria-hidden="true" /> Activity
      </Link>
      <span aria-hidden="true">/</span>
      <span className="font-medium text-[#020617]">Journey history</span>
    </nav>
    {!operational && summary?.status === "ok" ? (
      <section aria-label="Selected visitor journey summary" className="grid min-w-0 grid-cols-2 border-y border-[#D8E1EC] sm:grid-cols-3 lg:grid-cols-5">
        {[
          ["Journeys", summary.data.journeys],
          ["Searches in journeys", summary.data.recordedSearches.total],
          ["Results viewed", summary.data.stages.RESULTS_VIEWED.events],
          ["Offers selected", summary.data.stages.OFFER_SELECTED.events],
          ["Provider handoffs", summary.data.stages.PROVIDER_HANDOFF_STARTED.events],
        ].map(([label, value]) => metric(String(label), Number(value)))}
      </section>
    ) : null}

    <section aria-label="Selected visitor" className="min-w-0 rounded-xl border border-[#D8E1EC] bg-white p-4 sm:p-5">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[#334155]"><Route size={18} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h1 className="text-[19px] font-semibold leading-7">Journey history</h1>
            <p className="mt-1 break-words text-[13px] text-[#475569]">{identity.data.title}</p>
            <p className="mt-1 break-all text-[11px] text-[#64748B]">{id}</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-5 text-[#64748B]">
        {operational
          ? "This essential-only guest session contains recorded operational activity. It does not establish a consented tracked journey."
          : "Journey records belong to this selected identity only. A recorded handoff is not a confirmed booking. Unlinked activity is separate from tracked journeys."}
      </p>
    </section>

    <form action={route + "/journeys"} method="get" aria-label="Filter this visitor's journeys"
      className="grid min-w-0 grid-cols-1 items-center gap-2 border-y border-[#D8E1EC] py-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,1fr))_125px]">
      {returnToken ? <input type="hidden" name="activityReturn" value={returnToken}/> : null}
      <JourneyDateRangeFields initialRange={requested.range}
        initialFrom={one(raw.from) || (requested.range === "custom" ? scope.from : "")}
        initialTo={one(raw.to) || (requested.range === "custom" ? scope.to : "")}
        now={now.toISOString()} />
      <SearchMonitorSelect label="Product" name="product" appearance="fare"
        value={one(raw.product)} options={products} truncateLabel />
      <SearchMonitorSelect label="Observed stage" name="stage" appearance="fare"
        value={one(raw.stage)} options={[
          { value: "", label: "All observed stages" }, ...stages,
        ]} truncateLabel />
      <button type="submit" className="inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-3 text-[13px] font-medium text-white hover:bg-[#003D97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">
        Apply filters
      </button>
    </form>

    {operational ? (
      <section aria-label="Operational guest session history" className="min-w-0 rounded-xl border border-[#E2E8F0] p-4">
        <h2 className="mb-2 text-[16px] font-semibold">Recorded session activity</h2>
        <p className="mb-4 text-[12px] leading-5 text-[#64748B]">
          These records are searches and handoffs associated with this operational session. They are not reconstructed or attributed to a consented journey.
        </p>
        <ActivityTimeline events={identity.data.events} nextHref={nextOperationalHref}
          environment={environment} order="newest" />
      </section>
    ) : list?.status !== "ok" ? (
      <AdminEmptyState title="Journey records unavailable"
        message="The journey reader could not return the selected visitor's records. No missing records have been treated as zero." />
    ) : list.data.items.length === 0 ? (
      <AdminEmptyState title="No tracked journeys in this range"
        message="No eligible consented journeys match these filters. Unlinked account activity remains available from the Activity page."
      />
    ) : (
      <section aria-label="Selected visitor journey records" className="min-w-0">
        <h2 className="pb-3 text-[16px] font-semibold">Recorded journeys</h2>
        <div className="admin-responsive-records min-w-0 overflow-x-auto" role="region" aria-label="Journey history table" tabIndex={0}>
          <table className="w-full min-w-[880px] table-fixed text-left text-[13px]">
            <thead className="border-b border-[#D8E1EC] text-[11px] uppercase text-[#475569]">
              <tr>
                <th scope="col" className="w-[18%] px-3 py-3 font-medium">Started / Last activity</th>
                <th scope="col" className="w-[14%] px-3 py-3 font-medium">Products</th>
                <th scope="col" className="w-[18%] px-3 py-3 font-medium">Providers</th>
                <th scope="col" className="w-[12%] px-3 py-3 font-medium">Searches / Events</th>
                <th scope="col" className="w-[25%] px-3 py-3 font-medium">Observed stages</th>
                <th scope="col" className="w-[13%] px-3 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7ECF5]">
              {list.data.items.map(item => (
                <tr key={item.id} className="align-top hover:bg-[#F8FAFC]">
                  <td className="px-3 py-3">
                    <p className="font-medium">{formatDateTime(new Date(item.startedAt))}</p>
                    <p className="mt-1 text-[11px] text-[#64748B]">Last {formatDateTime(new Date(item.lastEventAt))}</p>
                  </td>
                  <td className="break-words px-3 py-3 text-[#334155]">{item.products.join(", ") || "—"}</td>
                  <td className="break-words px-3 py-3 text-[#334155]">
                    {item.providers.join(", ") || "—"}
                    {item.providerCount > item.providers.length ? " +" + (item.providerCount - item.providers.length) : ""}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-[#334155]">{item.searchCount} / {item.eventCount}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {stages.filter(stage => item.stages[stage.value] > 0).map(stage => (
                        <span key={stage.value} className="rounded-md border border-[#D8E1EC] px-1.5 py-1 text-[11px] text-[#475569]">
                          {stage.label}: {item.stages[stage.value]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <Link href={detailHref(item, list.data.scope, returnPath)}
                      className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap text-[12px] font-medium text-[#004BB8] hover:underline focus-visible:outline-2">
                      View journey <ChevronRight size={14} aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.data.nextCursor ? <div className="flex justify-end border-t border-[#E7ECF5] pt-3">
          <Link className={linkStyle} href={identityJourneyHistoryHref(kind, id, {
            ...filterContext, from: list.data.scope.from, to: list.data.scope.to,
          }, list.data.nextCursor)}>Next journeys <ChevronRight size={14} aria-hidden="true" /></Link>
        </div> : null}
      </section>
    )}
    {!operational && !scope.stage && !scope.provider ? (
      accountActions?.status === "ok" && otherActions.length ? (
        <section aria-label="Other recorded account actions" className="min-w-0 border-t border-[#D8E1EC] pt-4">
          <h2 className="text-[16px] font-semibold">Other recorded account actions</h2>
          <p className="mt-1 mb-3 text-[12px] text-[#64748B]">
            Verified account actions without an eligible exact journey link are shown separately.
            They are not assigned to searches by time, route or device.
          </p>
          <ActivityTimeline events={otherActions} nextHref={null} environment={environment} order="newest" />
        </section>
      ) : accountActions?.status !== "ok" ? (
        <p role="status" className="text-[12px] text-[#64748B]">Other recorded account actions are temporarily unavailable; this does not mean there are no records.</p>
      ) : null
    ) : null}
  </div>;
}
