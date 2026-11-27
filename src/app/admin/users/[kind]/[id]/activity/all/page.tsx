import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { normalizeUserActivityQuery, safeActivityQueryParams } from "@/lib/adminActivityDateQuery";
import { activityHref, parseActivityFilters, validActivityIdentity } from "@/lib/adminIdentityActivity";
import { journeyHistoryHrefFromActivity } from "@/lib/adminActivityOverview";
import { pageHistoryHrefFromActivity } from "@/lib/adminPageHistory";
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
  const raw = normalizeUserActivityQuery(input,now,timeZone);
  if (cursor) {
    if (typeof input.from === "string") raw.from = input.from;
    if (typeof input.to === "string") raw.to = input.to;
  }
  if (!raw.to) raw.to = now.toISOString();
  const parsed = parseActivityFilters(raw,timeZone);
  const accessOrPages = parsed.ok && (parsed.filters.tab === "access" || parsed.filters.tab === "pages");
  const incompatible = accessOrPages && (parsed.filters.product !== "all" ||
    (parsed.filters.stage !== "all" && !(parsed.filters.tab === "pages" && parsed.filters.stage === "PAGE_VIEW")));
  const queryParams = safeActivityQueryParams(raw);
  const back = activityHref(base + "/activity",queryParams,{tab:null,stage:null,q:null,product:null});
  const breadcrumb = <Link href={back} className={linkClass}><ArrowLeft size={15} aria-hidden="true"/> Back to Activity</Link>;
  if (!parsed.ok || Array.isArray(input.cursor) || incompatible) return <div className="space-y-4">{breadcrumb}<AdminEmptyState title="Invalid activity filters" message={!parsed.ok ? parsed.error : incompatible ? "Product and travel activity types do not apply to this category." : "Invalid activity page."} action={<Link href={path} className={linkClass}>Reset filters</Link>}/></div>;
  const filters = parsed.filters;
  const result = await loadAdminUnifiedActivity(kind,id,filters,cursor,now);
  if (result.status === "not_found") notFound();
  if (result.status !== "ok") return <div className="space-y-4">{breadcrumb}<AdminEmptyState title="Activity history unavailable" message={result.status === "invalid_cursor" ? "The page link no longer matches the selected filters." : "Recorded activity could not be loaded. This does not mean no activity exists."} action={<Link href={activityHref(path,queryParams,{cursor:null})} className={linkClass}>Return to newest activity</Link>}/></div>;
  const data = result.data;
  const operational = data.source === "operational";
  // This is the identity's dated all-time location summary, not a filter result.
  const locations = kind === "guest" ? await loadAdminGuestRecordedLocations([id], { range: "all", page: 1 }, data.environment, now, timeZone) : null;
  const recordedLocation = locations?.get(guestRecordedLocationKey(id, operational ? "operational" : "consented"));
  const returnHref = activityHref(path,queryParams,{cursor:cursor ?? null});
  const range = typeof raw.range === "string" ? raw.range : "today";
  const pagesHref = pageHistoryHrefFromActivity(kind,id,{...filters,tab:"pages",stage:"all",product:"all",q:""},range,returnHref);
  const journeysHref = journeyHistoryHrefFromActivity(kind,id,filters,range,returnHref);
  const nextHref = data.nextCursor ? activityHref(path,queryParams,{cursor:data.nextCursor}) : null;
  const accessHref = base + "/devices?range=all&activityReturn=" + encodeURIComponent(returnHref);
  return <AdminFullActivityWorkspace backHref={back} title={data.title}
    identityType={operational ? "Essential operational activity" : data.source === "visitor" ? "Consented guest" : "Registered account"}
    identityDetails={kind === "guest" ? <AdminRecordedGuestLocation location={recordedLocation} timeZone={timeZone}/> : null}
    journeyAction={{label:"View journey history",href:journeysHref}}
    filters={{timeZone,now:now.toISOString(),path,directory:queryParams.directory ?? "",
      initial:{tab:filters.tab,q:filters.q,product:filters.product,stage:filters.stage,order:"newest",from:filters.from,to:filters.to,range}}}
    activeCategory={filters.tab}
    categories={FULL_ACTIVITY_CATEGORIES.map(tab=>({...tab,...(operational && tab.value === "pages"
      ? {unavailableReason:"Pages visited are unavailable for an operational guest session."}
      : {href:activityHref(path,queryParams,{tab:tab.value,cursor:null,stage:null,product:tab.value==="access"||tab.value==="pages"?null:queryParams.product ?? null,q:tab.value==="access"||tab.value==="pages"?null:queryParams.q ?? null})})}))}
    historyActions={[
      {label:"Device & Access history",href:accessHref},
      operational ? {label:"Pages visited history",unavailableReason:"Pages visited are unavailable for an operational guest session."}
        : {label:"Pages visited history",href:pagesHref},
      ...(cursor ? [{label:"Newest activity",href:activityHref(path,queryParams,{cursor:null})}] : []),
    ]}>
    {kind==="guest"&&filters.tab==="access"?<p className="text-[12px] text-[#64748B]">Guest access observations describe recorded evidence, not authenticated device sessions.</p>:null}
    <AdminUnifiedActivityList events={data.events} timeZone={timeZone} environment={data.environment}
      accessHref={accessHref} pagesHref={!operational?pagesHref:undefined} nextHref={nextHref}/>
  </AdminFullActivityWorkspace>;
}
