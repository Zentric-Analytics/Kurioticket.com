import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { normalizeUserActivityQuery, safeActivityQueryParams } from "@/lib/adminActivityDateQuery";
import { activityHref, parseActivityFilters, validActivityIdentity } from "@/lib/adminIdentityActivity";
import { journeyHistoryHrefFromActivity } from "@/lib/adminActivityOverview";
import { pageHistoryHrefFromActivity } from "@/lib/adminPageHistory";
import { loadAdminUnifiedActivity } from "@/services/adminUnifiedActivityService";
import { ActivityFiltersBar } from "@/components/admin/ActivityFiltersBar";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AdminUnifiedActivityList } from "@/components/admin/AdminUnifiedActivityList";

export const metadata = { title: "Admin All User Activity" };
const tabs = [
  {value:"all",label:"All activity"},{value:"access",label:"Device & Access"},
  {value:"pages",label:"Pages visited"},{value:"searches",label:"Searches"},
  {value:"selections",label:"Selections"},{value:"handoffs",label:"Provider handoffs"},
  {value:"interactions",label:"Saved, shared & alerts"},
] as const;
const linkClass = "focus-ring inline-flex items-center gap-1.5 text-[13px] font-medium text-[#004BB8] hover:underline";
type Props = {params:Promise<{kind:string;id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};

export default async function AdminAllActivityPage({params,searchParams}:Props) {
  const {kind,id} = await params;
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
  const queryParams = safeActivityQueryParams(raw);
  const back = activityHref(base + "/activity",queryParams,{tab:null,stage:null,q:null,product:null});
  const breadcrumb = <Link href={back} className={linkClass}><ArrowLeft size={15} aria-hidden="true"/> Back to Activity</Link>;
  if (!parsed.ok || Array.isArray(input.cursor)) return <div className="space-y-4">{breadcrumb}<AdminEmptyState title="Invalid activity filters" message={parsed.ok ? "Invalid activity page." : parsed.error} action={<Link href={path} className={linkClass}>Reset filters</Link>}/></div>;
  const filters = parsed.filters;
  const result = await loadAdminUnifiedActivity(kind,id,filters,cursor,now);
  if (result.status === "not_found") notFound();
  if (result.status !== "ok") return <div className="space-y-4">{breadcrumb}<AdminEmptyState title="Activity history unavailable" message={result.status === "invalid_cursor" ? "The page link no longer matches the selected filters." : "Recorded activity could not be loaded. This does not mean no activity exists."} action={<Link href={activityHref(path,queryParams,{cursor:null})} className={linkClass}>Return to newest activity</Link>}/></div>;
  const data = result.data;
  const operational = data.source === "operational";
  const returnHref = activityHref(path,queryParams,{cursor:cursor ?? null});
  const range = typeof raw.range === "string" ? raw.range : "today";
  const pagesHref = pageHistoryHrefFromActivity(kind,id,{...filters,tab:"pages",stage:"all",product:"all",q:""},range,returnHref);
  const journeysHref = journeyHistoryHrefFromActivity(kind,id,filters,range,returnHref);
  const nextHref = data.nextCursor ? activityHref(path,queryParams,{cursor:data.nextCursor}) : null;
  return <div className="min-w-0 space-y-5 bg-white pb-5 text-[#0F172A]">
    <nav aria-label="Breadcrumb">{breadcrumb}</nav>
    <section className="min-w-0 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0"><h1 className="text-[20px] font-semibold">All activity</h1><p className="mt-1 break-words text-[13px] text-[#475569]">{data.title} · {operational ? "Essential operational activity" : data.source === "visitor" ? "Consented guest" : "Registered account"}</p></div>
        <Link href={journeysHref} className={linkClass}>View journey history <ChevronRight size={14} aria-hidden="true"/></Link>
      </header>
      <ActivityFiltersBar timeZone={timeZone} now={now.toISOString()} path={path} directory={queryParams.directory ?? ""}
        initial={{tab:filters.tab,q:filters.q,product:filters.product,stage:filters.stage,order:"newest",from:filters.from,to:filters.to,range}}
        tabs={<nav aria-label="Activity categories" className="flex flex-wrap gap-x-5 gap-y-1">
          {tabs.filter(tab=>!operational || tab.value !== "pages").map(tab=><Link key={tab.value}
            href={activityHref(path,queryParams,{tab:tab.value,cursor:null,stage:null,product:tab.value==="access"?null:queryParams.product ?? null,q:tab.value==="access"?null:queryParams.q ?? null})}
            aria-current={filters.tab===tab.value?"page":undefined}
            className={"focus-ring whitespace-nowrap border-b-2 px-1 py-2 text-[13px] font-medium " + (filters.tab===tab.value?"border-[#004BB8] text-[#004BB8]":"border-transparent text-[#475569]")}>{tab.label}</Link>)}
        </nav>}/>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href={base+"/devices?range=all&activityReturn="+encodeURIComponent(returnHref)} className={linkClass}>Device &amp; Access history</Link>
        {!operational?<Link href={pagesHref} className={linkClass}>Pages visited history</Link>:null}
        {cursor?<Link href={activityHref(path,queryParams,{cursor:null})} className={linkClass}>Newest activity</Link>:null}
      </div>
      {kind==="guest"&&filters.tab==="access"?<p className="text-[12px] text-[#64748B]">Guest access observations describe recorded evidence, not authenticated device sessions.</p>:null}
      <AdminUnifiedActivityList events={data.events} timeZone={timeZone} environment={data.environment}
        accessHref={base+"/devices?range=all&activityReturn="+encodeURIComponent(returnHref)} pagesHref={!operational?pagesHref:undefined} nextHref={nextHref}/>
    </section>
  </div>;
}
