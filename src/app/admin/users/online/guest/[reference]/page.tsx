import Link from "next/link";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { guestFirstAccessPreviewEnabled } from "@/lib/guestFirstAccessObservation";
import { readAdminOnlineUsers } from "@/services/adminOnlineUsersService";
export const metadata = { title: "Admin Live Guest Activity" };
export const dynamic = "force-dynamic";

export default async function LiveGuestActivityPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const session = await requireAdminSession("/admin/users/online");
  const environment = getPublicEnvironment();
  const snapshot = /^[A-Za-z0-9_-]{43}$/.test(reference) && guestFirstAccessPreviewEnabled(environment)
    ? await readAdminOnlineUsers(environment) : null;
  const matches = snapshot?.status === "ok" ? snapshot.rows.filter(row =>
    row.kind === "guest" && row.liveAccess?.reference === reference) : [];
  const row = matches.length === 1 ? matches[0] : null;
  const access = row?.liveAccess;
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const stamp = (value:string) => new Intl.DateTimeFormat("en-GB", {
    day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false,timeZone,
  }).format(new Date(value));
  const platformNames = {desktop_web:"Desktop web",mobile_web:"Mobile web",ios:"iOS app",android:"Android app",unclassified:"Unknown"};
  return <div className="min-w-0 space-y-4 bg-white pb-5 text-[#0F172A]">
    <Link href="/admin/users/online" className="focus-ring text-[13px] font-medium text-[#004BB8] hover:underline">Back to Online Users</Link>
    <section className="space-y-3 rounded-lg border border-[#E2E8F0] p-4">
      <h1 className="text-[18px] font-semibold">Guest activity · Live access</h1>
      {row && access ? <>
        <p className="text-[12px] text-[#64748B]">Verified current guest session. This is not a historical visitor profile.</p>
        <dl className="grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Platform",row.platforms.map(p=>platformNames[p]).join(" · ")],
            ["Location",row.locationLabel??"Unavailable"],["Device",access.deviceLabel??"Unavailable"],
            ["Browser",access.browser??"Unavailable"],["Operating system",access.os??"Unavailable"],
            ["Last seen",stamp(row.lastSeenAt)],
          ].map(([label,value])=><div key={label}><dt className="text-[#64748B]">{label}</dt><dd className="break-words font-medium">{value}</dd></div>)}
        </dl>
        <div className="border-t border-[#E2E8F0] pt-3">
          <h2 className="text-[15px] font-semibold">Device &amp; Access</h2>
          <ol className="mt-2 divide-y divide-[#E2E8F0] text-[13px]">
            <li className="flex flex-wrap items-center justify-between gap-2 py-3"><span>First verified access</span><time dateTime={access.firstSeenAt}>{stamp(access.firstSeenAt)}</time></li>
            {access.firstSeenAt!==row.lastSeenAt?<li className="flex flex-wrap items-center justify-between gap-2 py-3"><span>Latest verified access</span><time dateTime={row.lastSeenAt}>{stamp(row.lastSeenAt)}</time></li>:null}
          </ol>
          <p className="text-[12px] text-[#64748B]">Search, handoff and page history are not inferred from live presence. No permanent guest identity is created.</p>
        </div>
      </>:<p role="status" className="text-[13px] text-[#64748B]">This live guest session is no longer available or cannot be verified.</p>}
    </section>
  </div>;
}
