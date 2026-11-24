import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { requireAdminSession } from "@/lib/auth-guards";
import { historyDirectoryReturnHref } from "@/lib/adminHistoryDirectory";
import { ACTIVITY_PAGE_SIZE, validActivityIdentity } from "@/lib/adminIdentityActivity";
import { PAGE_HISTORY_MAX_PAGE, pageHistoryBackHref, pageHistoryHref, parsePageHistoryQuery } from "@/lib/adminPageHistory";
import { loadAdminIdentityActivity } from "@/services/adminIdentityActivityService";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AdminPageHistoryFilters } from "@/components/admin/AdminPageHistoryFilters";
import { PageViewRecords } from "@/components/admin/PageViewRecords";

export const metadata = { title: "Admin Pages Visited History" };
type Props = { params: Promise<{ kind: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const linkClass = "focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";

export default async function AdminPagesHistoryPage({ params, searchParams }: Props) {
  const { kind, id } = await params;
  if (!validActivityIdentity(kind, id)) notFound();
  const path = "/admin/users/" + kind + "/" + encodeURIComponent(id) + "/pages";
  await requireAdminSession(path);
  const raw = await searchParams;
  const directoryReturn = historyDirectoryReturnHref("pages", raw.activityReturn);
  const backHref = directoryReturn ?? pageHistoryBackHref(kind, id, raw.activityReturn);
  const backLabel = directoryReturn ? "Back to Pages Visited" : "Back to Activity";
  const back = <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-[13px]">
    <Link href={backHref} className="focus-ring inline-flex items-center gap-1.5 text-[#004BB8] hover:underline"><ArrowLeft size={15} aria-hidden="true"/> {backLabel}</Link>
  </nav>;
  const parsed = parsePageHistoryQuery(raw, new Date());
  if (!parsed.ok) return <div className="min-w-0 space-y-4 bg-white">{back}
    <AdminEmptyState title="Invalid page history filters" message={parsed.error} action={<Link href={path + "?" + new URLSearchParams({ activityReturn: backHref }).toString()} className={linkClass}>Reset history filters</Link>}/>
  </div>;
  const query = parsed.query;
  const result = await loadAdminIdentityActivity(kind, id, query.filters, undefined, "page", { page: query.page, platform: query.platform });
  if (result.status === "not_found") notFound();
  if (result.status !== "ok") return <div className="min-w-0 space-y-4 bg-white">{back}
    <AdminEmptyState title="Page history unavailable" message="Recorded page visits could not be loaded. This does not mean there is no history." action={<Link href={pageHistoryHref(path, { ...query, page: 1 }, backHref)} className={linkClass}>Retry</Link>}/>
  </div>;
  const data = result.data;
  const count = data.summary.pagesVisited ?? 0;
  const totalPages = Math.min(PAGE_HISTORY_MAX_PAGE, Math.max(1, Math.ceil(count / ACTIVITY_PAGE_SIZE)));
  const operational = data.source === "operational";
  const url = (page: number) => pageHistoryHref(path, { ...query, page }, backHref);
  return <div className="min-w-0 space-y-5 bg-white pb-6 text-[#0F172A]">
    {back}
    <section aria-label="Full pages visited history" className="min-w-0 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-3 sm:p-5">
      <header className="min-w-0">
        <h1 className="text-[19px] font-semibold">Pages Visited History</h1>
        <p className="mt-1 break-words text-[12px] text-[#64748B]">{data.title} · {data.email ? data.email + " · " : ""}{id} · Recorded page and screen visits · UTC</p>
      </header>
      <AdminPageHistoryFilters key={JSON.stringify([query.range, query.platform, query.filters])} path={path} query={query} returnHref={backHref}/>
      {query.page > totalPages ? <AdminEmptyState title="No records on this page" message="Go to the first page to review the available history." action={<Link className={linkClass} href={url(1)}>First page</Link>}/> :
        <PageViewRecords events={data.events} count={count} full operational={operational}/>}
      {!operational && totalPages > 1 && query.page <= totalPages ? <nav aria-label="Page history pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-3">
        <span className="text-[12px] text-[#64748B]">Page {query.page} of {totalPages} · {count.toLocaleString()} matching visits</span>
        <div className="flex flex-wrap gap-2">
          {query.page > 1 ? <Link href={url(query.page - 1)} className={linkClass}><ChevronLeft size={15} aria-hidden="true"/> Previous</Link> : <span aria-disabled="true" className={linkClass + " opacity-40"}><ChevronLeft size={15} aria-hidden="true"/> Previous</span>}
          {query.page < totalPages ? <Link href={url(query.page + 1)} className={linkClass}>Next <ChevronRight size={15} aria-hidden="true"/></Link> : <span aria-disabled="true" className={linkClass + " opacity-40"}>Next <ChevronRight size={15} aria-hidden="true"/></span>}
        </div>
      </nav> : null}
    </section>
  </div>;
}
