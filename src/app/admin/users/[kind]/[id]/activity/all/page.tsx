import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { safeActivityQueryParams } from "@/lib/adminActivityDateQuery";
import { normalizeLiveUserActivityQuery, liveActivityQueryParams } from "@/lib/adminActivityLiveQuery";
import { activityHref, parseActivityFilters, validActivityIdentity } from "@/lib/adminIdentityActivity";
import { journeyHistoryHrefFromActivity } from "@/lib/adminActivityOverview";
import { pageHistoryHrefFromActivity } from "@/lib/adminPageHistory";
import { deviceHistoryHrefFromActivity } from "@/lib/adminDeviceHistory";
import { loadAdminUnifiedActivity } from "@/services/adminUnifiedActivityService";
import { AdminFullActivityWorkspace, FULL_ACTIVITY_CATEGORIES } from "@/components/admin/AdminFullActivityWorkspace";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AdminUnifiedActivityList } from "@/components/admin/AdminUnifiedActivityList";
import { AdminLiveGuestActivity } from "@/components/admin/AdminLiveGuestActivity";
import { AdminRecordedGuestLocation } from "@/components/admin/AdminRecordedGuestLocation";
import { loadAdminGuestRecordedLocations, guestRecordedLocationKey } from "@/services/adminGuestRecordedLocationsService";

export const metadata = { title: "Admin All User Activity" };
// Live session reads must not be served from a static route cache.
export const dynamic = "force-dynamic";
const linkClass = "focus-ring inline-flex items-center gap-1.5 text-[13px] font-medium text-[#004BB8] hover:underline";
type Props = {params:Promise<{kind:string;id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};

export default async function AdminAllActivityPage({params,searchParams}:Props) {
  const {kind,id} = await params;
  if (kind === "live-guest") return <AdminLiveGuestActivity reference={id} full input={await searchParams}/>;
  if (!validActivityIdentity(kind,id)) notFound();
  const base = "/admin/users/" + kind + "/" + encodeURIComponent(id);
  const path = base + "/activity/all";
  const session = await requireAdminSession(path);
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const now = new Date();
  const input = await searchParams;
  const cursor = typeof input.cursor === "string" ? input.cursor : undefined;
  // A continuation keeps the exact reporting cutoff, not a new rolling range.
  const raw = normalizeLiveUserActivityQuery(input,now,timeZone);
  if (!raw.to) raw.to = now.toISOString();
  const parsed = parseActivityFilters(raw,timeZone);
  const accessOrPages = parsed.ok && (parsed.filters.tab === "access" || parsed.filters.tab === "pages");
  const incompatible = accessOrPages && (parsed.filters.product !== "all" || parsed.filters.interface ||
    (parsed.filters.stage !== "all" && !(parsed.filters.tab === "pages" && parsed.filters.stage === "PAGE_VIEW")));
  const queryParams = safeActivityQueryParams(raw);
  const newestParams = liveActivityQueryParams(raw);
  const back = activityHref(base + "/activity",newestParams,{tab:null,stage:null,q:null,product:null,interface:null});
  const breadcrumb = <Link href={back} className={linkClass}><ArrowLeft size={15} aria-hidden="true"/> Back to Activity</Link>;
  if (!parsed.ok || Array.isArray(input.cursor) || incompatible) return <div className="space-y-4">{breadcrumb}<AdminEmptyState title="Invalid activity filters" message={!parsed.ok ? parsed.error : incompatible ? "Product, interface and travel activity filters do not apply to this category." : "Invalid activity page."} action={<Link href={path} className={linkClass}>Reset filters</Link>}/></div>;
  const filters = parsed.filters;
  const result = await loadAdminUnifiedActivity(kind,id,filters,cursor,now);
  if (result.status === "not_found") notFound();
  if (result.status !== "ok") return <div className="space-y-4">{breadcrumb}<AdminEmptyState title="Activity history unavailable" message={result.status === "invalid_cursor" ? "The page link no longer matches the selected filters." : "Recorded activity could not be loaded. This does not mean no activity exists."} action={<Link href={activityHref(path,newestParams,{cursor:null})} className={linkClass}>Return to newest activity</Link>}/></div>;
  const data = result.data;
  const operational = data.source === "operational";
  // This is the identity's dated all-time location summary, not a filter result.
  const locations = kind === "guest" ? await loadAdminGuestRecordedLocations([id], { range: "all", page: 1 }, data.environment, now, timeZone) : null;
  const recordedLocation = locations?.get(guestRecordedLocationKey(id, operational ? "operational" : "consented"));
  const returnHref = activityHref(path,cursor ? queryParams : newestParams,{cursor:cursor ?? null});
  const range = typeof raw.range === "string" ? raw.range : "today";
  const pagesHref = pageHistoryHrefFromActivity(kind,id,{...filters,tab:"pages",stage:"all",product:"all",q:""},range,returnHref);
  const journeysHref = journeyHistoryHrefFromActivity(kind,id,filters,range,returnHref);
  const nextHref = data.nextCursor ? activityHref(path,queryParams,{cursor:data.nextCursor}) : null;
  const newestHref = cursor ? activityHref(path,newestParams,{cursor:null}) : undefined;
  const accessHref = deviceHistoryHrefFromActivity(kind,id,filters,range,returnHref,timeZone);
  const unavailableCategory = operational && ["pages","selections","interactions"].includes(filters.tab);
  const unavailableStage = operational && !["all","SEARCH_COMPLETED","PROVIDER_HANDOFF_STARTED"].includes(filters.stage);
  const operationalUnavailable = "This activity is not collected for an essential guest session. Choose All activity to see its recorded searches and handoffs.";
  return <AdminFullActivityWorkspace backHref={back} title={data.title}
    identityType={operational ? "Essential operational activity" : data.source === "visitor" ? "Consented guest" : "Registered account"}
    coverage={operational ? "operational" : kind === "guest" ? "consented" : "registered"}
    identityDetails={kind === "guest" ? <AdminRecordedGuestLocation location={recordedLocation} timeZone={timeZone}/> : null}
    journeyAction={filters.tab === "access" ? {label:"View access history",href:accessHref}
      : filters.tab === "pages" && !operational ? {label:"View page history",href:pagesHref}
      : !operational ? {label:"View journey history",href:journeysHref} : undefined}
    filters={{timeZone,now:now.toISOString(),path,directory:queryParams.directory ?? "",usersReturn:queryParams.usersReturn,allowInterface:kind === "user",
      availableStages:operational ? ["SEARCH_COMPLETED","PROVIDER_HANDOFF_STARTED"] : undefined,
      initial:{tab:filters.tab,q:filters.q,product:filters.product,stage:filters.stage,interface:filters.interface,order:"newest",from:filters.from,to:filters.to,range}}}
    activeCategory={filters.tab}
    categories={FULL_ACTIVITY_CATEGORIES.map(tab=>({...tab,...(operational && ["pages","selections","interactions"].includes(tab.value)
      ? {unavailableReason:"Not collected for this essential guest session."}
      : {href:activityHref(path,newestParams,{tab:tab.value,cursor:null,stage:null,
        product:tab.value==="access"||tab.value==="pages"?null:queryParams.product ?? null,
        q:tab.value==="access"||tab.value==="pages"?null:queryParams.q ?? null,
        interface:tab.value==="access"||tab.value==="pages"?null:queryParams.interface ?? null})})}))}>
    {cursor ? <p className="rounded-lg bg-[#F1F6FF] px-3 py-2.5 text-[13px] leading-5 text-[#475569]">You’re browsing older activity. This page keeps its position as new actions arrive. <Link href={newestHref!} className="font-medium text-[#004BB8] hover:underline">View newest activity</Link></p> : null}
    {kind==="guest"&&filters.tab==="access"?<p className="text-[12px] text-[#64748B]">Guest access observations describe recorded evidence, not authenticated device sessions.</p>:null}
    <AdminUnifiedActivityList events={data.events} timeZone={timeZone} environment={data.environment} identity={operational ? undefined : { kind, id }} now={now}
      accessHref={accessHref} pagesHref={!operational?pagesHref:undefined} nextHref={nextHref} newestHref={newestHref} returnHref={returnHref}
      historyUnavailable={unavailableCategory || unavailableStage ? operationalUnavailable : undefined}/>
  </AdminFullActivityWorkspace>;
}
