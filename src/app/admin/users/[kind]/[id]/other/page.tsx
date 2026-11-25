import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ActivityTimeline } from "@/components/admin/ActivityTimeline";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { normalizeUserActivityQuery, safeActivityQueryParams } from "@/lib/adminActivityDateQuery";
import { activityHref, parseActivityFilters, validActivityIdentity } from "@/lib/adminIdentityActivity";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { requireAdminSession } from "@/lib/auth-guards";
import { loadAdminIdentityActivity } from "@/services/adminIdentityActivityService";

export const metadata = { title: "Admin Other Recorded Activity" };
type RawQuery = Record<string, string | string[] | undefined>;
const linkClass = "focus-ring inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";

export default async function AdminIdentityOtherActivityPage({
  params, searchParams,
}: {
  params: Promise<{kind: string; id: string}>;
  searchParams: Promise<RawQuery>;
}) {
  const { kind, id } = await params;
  if (!validActivityIdentity(kind, id)) notFound();
  const path = "/admin/users/" + kind + "/" + encodeURIComponent(id);
  const session = await requireAdminSession(path + "/other");
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const raw = normalizeUserActivityQuery(await searchParams, new Date(), timeZone);
  const paramsForActivity = safeActivityQueryParams(raw);
  const activityPath = path + "/activity";
  const backHref = activityHref(activityPath, paramsForActivity, {});
  const parsed = parseActivityFilters(raw, timeZone);
  if (!parsed.ok) return <div className="space-y-4">
    <Link href={backHref} className={linkClass}><ArrowLeft size={15} aria-hidden="true"/> Back to Activity</Link>
    <AdminEmptyState title="Invalid activity filters" message={parsed.error}
      action={<Link className={linkClass} href={activityPath}>Reset activity filters</Link>}/>
  </div>;
  // This deliberately reuses the complete authorized reader; neither the
  // account-action nor unlinked-operational trail is an invented journey.
  // The event list is filtered by identical date, product, stage and search
  // constraints as the previous Activity summary.
  const result = await loadAdminIdentityActivity(kind, id, parsed.filters, undefined, "all");
  if (result.status === "not_found") notFound();
  if (result.status !== "ok") return <div className="space-y-4">
    <Link href={backHref} className={linkClass}><ArrowLeft size={15} aria-hidden="true"/> Back to Activity</Link>
    <AdminEmptyState title="Other activity temporarily unavailable"
      message="The activity reader could not retrieve the selected visitor's records. This does not mean the history is empty."
      action={<Link className={linkClass} href={backHref}>Return to Activity</Link>}/>
  </div>;

  const rows = result.data.events.filter(row => !row.journeyId);
  return <div className="min-w-0 space-y-5 bg-white pb-5 text-[#0F172A]">
    <nav aria-label="Breadcrumb">
      <Link href={backHref} className={linkClass}><ArrowLeft size={15} aria-hidden="true"/> Back to Activity</Link>
    </nav>
    <section aria-label="Other recorded activity identity" className="min-w-0 border-b border-[#E2E8F0] pb-4">
      <h1 className="text-[19px] font-semibold">Other recorded activity</h1>
      <p className="mt-1 break-words text-[13px] text-[#475569]">{result.data.title}</p>
      <p className="mt-2 text-[12px] text-[#64748B]">Actions and operational records outside tracked journeys. Date, product and activity filters match the previous Activity view. Events remain in their recorded order.</p>
    </section>
    <ActivityTimeline timeZone={timeZone} events={rows} nextHref={null} environment={result.data.environment}
      returnHref={backHref} clearHref={activityPath}/>
  </div>;
}
