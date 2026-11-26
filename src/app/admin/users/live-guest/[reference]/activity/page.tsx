import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { safeLiveGuestReference } from "@/lib/guestFirstAccessObservation";
import { resolveLiveGuestActivity } from "@/lib/adminOnlineUsersSnapshot";
import { readAdminOnlineUsers } from "@/services/adminOnlineUsersService";
import { AdminUnifiedActivityList } from "@/components/admin/AdminUnifiedActivityList";

export const metadata = { title: "Admin Customer Activity" };
export const dynamic = "force-dynamic";
const platformNames = {desktop_web:"Desktop web",mobile_web:"Mobile web",ios:"iOS app",android:"Android app",unclassified:"Unknown"};
const linkClass="focus-ring inline-flex items-center gap-1.5 text-[13px] text-[#004BB8] hover:underline";

/** Live references are not permanent visitor IDs. No historical reader or
 * fabricated search/page counts may be used here. */
export default async function LiveGuestActivityPage({params}: {params:Promise<{reference:string}>}) {
  const {reference}=await params;
  const session=await requireAdminSession("/admin/users");
  const environment=getPublicEnvironment();
  const timeZone=await getAdminViewerTimeZone(session.user.id);
  const snapshot=safeLiveGuestReference(reference)&&environment==="staging"
    ? await readAdminOnlineUsers(environment) : null;
  const checkedAt=new Date();
  const row=resolveLiveGuestActivity(snapshot,reference,checkedAt);
  const stamp=(at:string)=>new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:false,timeZone}).format(new Date(at));
  const platforms=row?.platforms.map(platform=>platformNames[platform]).join(" · ");
  return <div className="min-w-0 space-y-6 bg-white pb-2 text-[#0F172A]">
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[13px] text-[#475569]">
      <Link href="/admin/users" className={linkClass}><ArrowLeft size={16} aria-hidden="true"/> Users</Link>
      <span aria-hidden="true">/</span><span className="font-medium text-[#0F172A]">Activity</span>
    </nav>
    <section data-testid="activity-page-card" aria-label="Customer activity workspace"
      className="min-w-0 space-y-4 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <section aria-label="Customer identity" className="min-w-0 border-b border-[#E2E8F0] pb-4">
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-5">
          <div className="flex min-w-0 items-center gap-3 lg:col-span-2">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xl font-semibold">G</span>
            <div className="min-w-0"><h1 className="text-xl font-semibold">Guest session</h1>
              <p className="mt-1 text-[12px] text-[#64748B]">Live presence · No permanent guest identity</p></div>
          </div>
          {row ? <dl className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 lg:contents">
            {[
              ["Platform",platforms??"Unavailable"],
              ["Location",row.locationLabel??"Unavailable"],
              ["Last seen",<time key="last" dateTime={row.lastSeenAt}>{stamp(row.lastSeenAt)}</time>],
            ].map(([label,value],i)=><div key={i} className="min-w-0 border-l border-[#E2E8F0] pl-3">
              <dt className="text-[12px] font-normal text-[#64748B]">{label}</dt>
              <dd className="mt-1 break-words text-[16px] font-medium leading-6 tabular-nums text-[#0F172A]">{value}</dd>
            </div>)}
          </dl>:null}
        </div>
      </section>
      {row ? <>
        <p className="text-[12px] text-[#64748B]">Verified at {stamp(checkedAt.toISOString())}. Historical activity is not linked to this temporary session.</p>
        <AdminUnifiedActivityList overview events={[]} timeZone={timeZone} environment={environment}
          access={{at:new Date(row.lastSeenAt),label:"Latest verified access",detail:platforms??"Platform unavailable"}}/>
      </>:<p role="status" className="text-[13px] text-[#64748B]">This live guest session is no longer available or cannot be verified.</p>}
      <Link href="/admin/users/online" className={linkClass}>Back to Online Users</Link>
    </section>
  </div>;
}
