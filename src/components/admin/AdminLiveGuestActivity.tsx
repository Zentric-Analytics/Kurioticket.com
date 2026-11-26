import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { safeLiveGuestReference } from "@/lib/guestFirstAccessObservation";
import { resolveLiveGuestActivity } from "@/lib/adminOnlineUsersSnapshot";
import { readAdminOnlineUsers } from "@/services/adminOnlineUsersService";
import { AdminCustomerActivityWorkspace } from "./AdminCustomerActivityWorkspace";
import { AdminUnifiedActivityList, type AccessPreview } from "./AdminUnifiedActivityList";

const platformNames = {desktop_web:"Desktop web",mobile_web:"Mobile web",ios:"iOS app",android:"Android app",unclassified:"Unknown"};
const linkClass = "focus-ring inline-flex items-center gap-1.5 text-[13px] font-medium text-[#004BB8] hover:underline";
const unavailable = "This live guest session is no longer available or cannot be verified.";
const historyNote = "Historical activity cannot be attributed to this temporary session. Unavailable values are not zero.";
const categories = [
  {value:"all",label:"All activity"},{value:"access",label:"Device & Access"},
  {value:"pages",label:"Pages visited"},{value:"searches",label:"Searches"},
  {value:"selections",label:"Selections"},{value:"handoffs",label:"Provider handoffs"},
  {value:"interactions",label:"Saved, shared & alerts"},
] as const;

/** Same Users Directory route and workspace as recorded identities, but no
 * historical identity lookup, new persistent ID, or inferred ownership. */
export async function AdminLiveGuestActivity({ reference, full = false, input = {} }: {
  reference: string; full?: boolean; input?: Record<string,string|string[]|undefined>;
}) {
  const session = await requireAdminSession("/admin/users");
  const environment = getPublicEnvironment();
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const safeReference = safeLiveGuestReference(reference);
  const path = safeReference ? "/admin/users/live-guest/" + encodeURIComponent(safeReference) + "/activity" : "/admin/users";
  const snapshot = safeReference && environment === "staging" ? await readAdminOnlineUsers(environment) : null;
  const row = resolveLiveGuestActivity(snapshot, reference, new Date());
  const platforms = row?.platforms.map(platform => platformNames[platform]).join(" · ");
  const access: AccessPreview | null = row ? {
    at: new Date(row.lastSeenAt), label: "Latest verified access",
    detail: [platforms, row.liveAccess?.deviceLabel, row.liveAccess?.os, row.liveAccess?.browser,
      row.locationLabel ?? "Location unavailable"].filter(Boolean).join(" · "),
  } : null;

  if (full) {
    // Only these two categories have evidence. Reject unsupported filters or
    // cursor attempts without broadening the view or consulting history.
    const valid = Object.keys(input).every(key => key === "tab")
      && (input.tab === undefined || input.tab === "all" || input.tab === "access");
    const active = input.tab === "access" ? "access" : "all";
    return <div className="min-w-0 space-y-5 bg-white pb-5 text-[#0F172A]">
      <nav aria-label="Breadcrumb"><Link href={path} className={linkClass}><ArrowLeft size={15} aria-hidden="true"/> Back to Activity</Link></nav>
      <section className="min-w-0 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <header><h1 className="text-[20px] font-semibold">All activity</h1><p className="mt-1 text-[13px] text-[#475569]">Guest session · Live presence</p></header>
        {row && valid ? <>
          <nav aria-label="Activity categories" className="flex flex-wrap gap-x-5 gap-y-1">
            {categories.map(tab => tab.value === "all" || tab.value === "access"
              ? <Link key={tab.value} prefetch={false} href={path + "/all" + (tab.value === "access" ? "?tab=access" : "")}
                aria-current={active===tab.value?"page":undefined}
                className={"focus-ring whitespace-nowrap border-b-2 px-1 py-2 text-[13px] font-medium " + (active===tab.value?"border-[#004BB8] text-[#004BB8]":"border-transparent text-[#475569]")}>{tab.label}</Link>
              : <span key={tab.value} aria-disabled="true" title="Historical ownership unavailable" className="border-b-2 border-transparent px-1 py-2 text-[13px] text-[#94A3B8]">{tab.label}</span>)}
          </nav>
          <p className="text-[12px] text-[#64748B]">{historyNote} Only the current verified access is available.</p>
          <AdminUnifiedActivityList events={[]} access={access} timeZone={timeZone} environment={environment}/>
        </> : <p role="status" className="text-[13px] text-[#64748B]">{!row ? unavailable : "This filter is unavailable for a temporary guest session."}</p>}
        {row && !valid ? <Link prefetch={false} href={path + "/all"} className={linkClass}>Reset filters</Link> : null}
      </section>
    </div>;
  }

  return <AdminCustomerActivityWorkspace backHref="/admin/users" title="Guest session"
    badge={row ? "Live session" : "Unavailable"} avatar="G" firstLabel="First seen"
    firstSeenAt={row?.liveAccess ? new Date(row.liveAccess.firstSeenAt) : null}
    lastSeenAt={row ? new Date(row.lastSeenAt) : null} lastSeenAvailable={Boolean(row)}
    eventCount={null} summary={null} timeZone={timeZone}
    identityDetails={row ? <div className="mt-1 space-y-0.5 break-words text-[12px] text-[#475569]">
      <p><span className="font-medium">Platform: </span><span>{platforms ?? "Unavailable"}</span></p>
      <p><span className="font-medium">Location: </span><span>{row.locationLabel ?? "Unavailable"}</span></p>
    </div> : null}>
    {row ? <>
      <p className="text-[12px] text-[#64748B]">{historyNote}</p>
      <AdminUnifiedActivityList overview events={[]} timeZone={timeZone} environment={environment}
        access={access} allHref={path + "/all"}/>
    </> : <p role="status" className="text-[13px] text-[#64748B]">{unavailable}</p>}
  </AdminCustomerActivityWorkspace>;
}
