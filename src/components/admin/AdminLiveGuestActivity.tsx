import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth-guards";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { safeLiveGuestReference } from "@/lib/guestFirstAccessObservation";
import { resolveLiveGuestActivity } from "@/lib/adminOnlineUsersSnapshot";
import { recordedGuestActivityHref } from "@/lib/adminLiveGuestActivityNavigation";
import { readAdminOnlineUsers } from "@/services/adminOnlineUsersService";
import { resolveAdminLiveGuestHistory } from "@/services/adminLiveGuestHistoryService";
import { AdminCustomerActivityWorkspace } from "./AdminCustomerActivityWorkspace";
import { AdminFullActivityWorkspace, FULL_ACTIVITY_CATEGORIES } from "./AdminFullActivityWorkspace";
import { AdminUnifiedActivityList, type AccessPreview } from "./AdminUnifiedActivityList";
import { AdminActivityAccessSummary } from "./AdminActivityAccessSummary";
import { adminUsersActivityReturn, safeAdminUsersReturnHref } from "@/lib/adminUsersNavigation";
import { activityHref } from "@/lib/adminIdentityActivity";

const platformNames = {desktop_web:"Desktop web",mobile_web:"Mobile web",ios:"iOS app",android:"Android app",unclassified:"Unknown"};
const linkClass = "focus-ring inline-flex items-center gap-1.5 text-[13px] font-medium text-[#004BB8] hover:underline";
const unavailable = "This live guest session is no longer available or cannot be verified.";
const historyNote = "Historical activity cannot be attributed to this temporary session. Unavailable values are not zero.";

/** Verified recorded owners use the canonical Users Directory activity route.
 * A temporary session without that evidence retains the same visual workspace. */
export async function AdminLiveGuestActivity({ reference, full = false, input = {} }: {
  reference: string; full?: boolean; input?: Record<string,string|string[]|undefined>;
}) {
  const session = await requireAdminSession("/admin/users");
  const environment = getPublicEnvironment();
  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const safeReference = safeLiveGuestReference(reference);
  const path = safeReference ? "/admin/users/live-guest/" + encodeURIComponent(safeReference) + "/activity" : "/admin/users";
  const origin = adminUsersActivityReturn(input, timeZone);
  const usersReturn = safeAdminUsersReturnHref(input.usersReturn, timeZone);
  const directory = typeof input.directory === "string" && input.directory.length <= 1000
    && safeAdminUsersReturnHref("/admin/users?" + input.directory, timeZone) ? input.directory : undefined;
  const navigation = {range:"all",...(usersReturn ? {usersReturn} : {}),...(directory ? {directory} : {})};
  const overviewHref = activityHref(path,navigation,{});
  const fullHref = activityHref(path + "/all",navigation,{});
  const snapshot = safeReference && environment === "staging" ? await readAdminOnlineUsers(environment) : null;
  const now = new Date();
  const row = resolveLiveGuestActivity(snapshot, reference, now);
  const history = row ? await resolveAdminLiveGuestHistory(row, environment, now) : null;
  const recordedHref = history ? recordedGuestActivityHref(history.id, full, input) : null;
  // redirect throws to end this route; never catch it as a failed history read.
  if (recordedHref) redirect(recordedHref);
  const platforms = row?.platforms.map(platform => platformNames[platform]).join(" · ");
  const access: AccessPreview | null = row ? {
    at: new Date(row.lastSeenAt), label: "Latest verified access",
    detail: [platforms, row.liveAccess?.deviceLabel, row.liveAccess?.os, row.liveAccess?.browser,
      row.locationLabel ?? "Location unavailable"].filter(Boolean).join(" · "),
  } : null;

  if (full) {
    // Only these two categories have evidence. Reject unsupported filters or
    // cursor attempts without broadening the view or consulting history.
    const valid = Object.keys(input).every(key => ["tab","range","usersReturn","directory"].includes(key))
      && (input.tab === undefined || input.tab === "all" || input.tab === "access")
      && (input.range === undefined || input.range === "all")
      && (input.usersReturn === undefined || Boolean(usersReturn))
      && (input.directory === undefined || Boolean(directory));
    const active = input.tab === "access" ? "access" : "all";
    const historyUnavailable = "Recorded history is unavailable for this temporary guest session.";
    return <AdminFullActivityWorkspace backHref={overviewHref} title="Guest session" coverage="live"
      identityType={row ? "Live session" : "Unavailable"} prefetch={false}
      identityDetails={row && valid ? <p data-testid="live-guest-location" className="mt-1 text-[12px] text-[#475569]">Current location: {row.locationLabel ?? "Unavailable"}</p> : null}
      journeyAction={{label:"View journey history",unavailableReason:historyUnavailable}}
      filters={{timeZone,now:now.toISOString(),path:path + "/all",directory:directory ?? "",usersReturn:usersReturn ?? undefined,
        initial:{tab:active,q:"",product:"all",stage:"all",order:"newest",from:"",to:"",range:"all"},
        unavailableReason:"History filters are unavailable for this temporary guest session. Only the current verified access can be shown."}}
      activeCategory={active}
      categories={FULL_ACTIVITY_CATEGORIES.map(tab=>({...tab,...(row && (tab.value === "all" || tab.value === "access")
        ? {href:activityHref(path + "/all",navigation,{tab:tab.value === "access" ? "access" : null})}
        : {unavailableReason:row ? historyUnavailable : unavailable})}))}>
      {row && valid ? <>
        <p className="text-[12px] text-[#64748B]">{historyNote} Only the current verified access is available.</p>
        <AdminUnifiedActivityList events={[]} access={access} timeZone={timeZone} environment={environment}/>
      </> : <p role="status" className="text-[13px] text-[#64748B]">{!row ? unavailable : "This filter is unavailable for a temporary guest session."}</p>}
      {row && !valid ? <Link prefetch={false} href={fullHref} className={linkClass}>Reset filters</Link> : null}
    </AdminFullActivityWorkspace>;
  }

  return <AdminCustomerActivityWorkspace backHref={origin.href} backLabel={origin.label} title="Guest session" coverage="live"
    badge={row ? "Live session" : "Unavailable"} avatar="G" firstLabel="First observed"
    firstSeenAt={row?.liveAccess ? new Date(row.liveAccess.firstSeenAt) : null}
    lastSeenAt={row ? new Date(row.lastSeenAt) : null} lastSeenAvailable={Boolean(row)}
    eventCount={null} summary={null} timeZone={timeZone} periodLabel="History unavailable"
    accessContext={row ? <AdminActivityAccessSummary access={access} timeZone={timeZone}/> : null}
    identityDetails={row ? <div className="mt-1 space-y-0.5 break-words text-[12px] text-[#475569]">
      <p><span className="font-medium">Platform: </span><span>{platforms ?? "Unavailable"}</span></p>
      <p data-testid="live-guest-location"><span className="font-medium">Current location: </span><span>{row.locationLabel ?? "Unavailable"}</span></p>
    </div> : null}>
    {row ? <>
      <AdminUnifiedActivityList overview events={[]} timeZone={timeZone} environment={environment}
        historyUnavailable={historyNote} allHref={fullHref} allHrefPrefetch={false}/>
    </> : <p role="status" className="text-[13px] text-[#64748B]">{unavailable}</p>}
  </AdminCustomerActivityWorkspace>;
}
