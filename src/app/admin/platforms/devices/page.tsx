import Link from "next/link";
import { Monitor, Smartphone, TabletSmartphone, Users } from "lucide-react";
import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { formatAdminTimeZoneLabel } from "@/lib/adminLocalTime";
import { getAdminViewerTimeZone } from "@/lib/adminViewerTimeZone.server";
import { getPublicEnvironment } from "@/lib/stagingSafety";
import { getOnlinePresenceSnapshot } from "@/services/onlinePresenceService";
import { readPlatformOperations } from "@/services/platformOperationsService";
import { OperationalStatus } from "@/components/admin/OperationalStatus";
import { AdminPlatformOnlinePresence } from "@/components/admin/AdminPlatformOnlinePresence";
import { requireAdminSession } from "@/lib/auth-guards";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import {
  loadPlatformAccess, parsePlatformAccessQuery, platformAccessHref,
} from "@/services/adminPlatformAccessService";

export const metadata = { title: "Admin Platform Metrics" };
type RawQuery = Record<string, string | string[] | undefined>;
const rangeOptions = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];
const platformOptions = [
  { value: "all", label: "All platforms" },
  { value: "web", label: "Web sessions" },
  { value: "ios", label: "iOS app" },
  { value: "android", label: "Android app" },
  { value: "other", label: "Unclassified native app" },
];
const navigationLink = "focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";

export default async function AdminPlatformsDevicesPage({ searchParams }: {
  searchParams: Promise<RawQuery>;
}) {
  const session = await requireAdminSession("/admin/platforms/devices");
  const query = parsePlatformAccessQuery(await searchParams);
  if (!query) return <AdminEmptyState title="Invalid Platform Metrics filters"
    message="Choose a valid period, platform and page."
    action={<Link className={navigationLink} href="/admin/platforms/devices">Reset filters</Link>} />;

  const timeZone = await getAdminViewerTimeZone(session.user.id);
  const [result, health, presence] = await Promise.all([
    loadPlatformAccess(query, timeZone),
    readPlatformOperations(24, "today", timeZone).catch(() => null),
    getOnlinePresenceSnapshot(getPublicEnvironment()),
  ]);
  // Application activity is an observed search signal, not an uptime or crash-free claim.
  const healthTiles = [
    { label: "Web Search Activity", state: health?.activity.data?.searches.applications.WEB.state ?? "MONITORING_UNAVAILABLE",
      scope: "Desktop and mobile web" },
    { label: "iOS Search Activity", state: health?.activity.data?.searches.applications.IOS.state ?? "MONITORING_UNAVAILABLE",
      scope: "Native iOS app" },
    { label: "Android Search Activity", state: health?.activity.data?.searches.applications.ANDROID.state ?? "MONITORING_UNAVAILABLE",
      scope: "Native Android app" },
    { label: "Database Status", state: health?.database.state ?? "MONITORING_UNAVAILABLE",
      scope: "Shared service connection" },
  ];
  const summaries = result.status === "ok" ? [
    { label: "Web browser sessions", value: result.counts.web, icon: Monitor },
    { label: "iOS app sessions", value: result.counts.ios, icon: Smartphone },
    { label: "Android app sessions", value: result.counts.android, icon: TabletSmartphone },
    { label: "Unclassified native sessions", value: result.counts.other, icon: Users },
  ] : [];
  return <div className="min-w-0 space-y-6 bg-white pb-6 text-[#0F172A]">
    <header className="min-w-0 border-b border-[#E2E8F0] pb-3">
      <h1 className="text-xl font-semibold tracking-tight">Platform Metrics</h1>
      <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
        View platform activity, online users, app reporting and account sessions.
      </p>
    </header>

    <section aria-labelledby="platform-health-heading" className="min-w-0 space-y-3 border-b border-[#E2E8F0] pb-5">
      <h2 id="platform-health-heading" className="text-[15px] font-semibold">Platform Checks</h2>
      <div className="grid min-w-0 grid-cols-2 gap-3 min-[1024px]:grid-cols-4">
        {healthTiles.map(tile => <div key={tile.label} data-testid="platform-health-metric" className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/75 px-3.5 py-3">
          <h3 className="min-h-9 text-[12px] font-medium leading-4 text-[#334155]">{tile.label}</h3>
          <OperationalStatus state={tile.state} />
          <p className="mt-2 text-[11px] leading-4 text-[#64748B]">{tile.scope}</p>
        </div>)}
      </div>
      <p className="text-[11px] leading-[17px] text-[#64748B]">
        Checks do not establish overall uptime. Installed-app crash health: <span className="font-medium">
          {health?.nativeApplicationHealth.state === "UNKNOWN" ? "Unknown"
            : health?.nativeApplicationHealth.state === "MONITORING_UNAVAILABLE" || !health
              ? "Monitoring unavailable" : "Not verified by these observations"}.
        </span> Online activity and sessions cannot verify crash health.
      </p>
    </section>

    <AdminPlatformOnlinePresence initial={presence} />

    <section aria-label="Mobile app distribution" className="min-w-0 space-y-2">
      <h2 className="text-[15px] font-semibold">App Download Reporting</h2>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div data-testid="ios-download-metric" className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/75 px-3.5 py-3">
          <p className="text-[12px] text-[#64748B]">iOS App Store downloads</p>
          <p className="mt-2 text-[18px] font-semibold text-[#0F172A]">Not connected</p>
          <p className="mt-1 text-[11px] text-[#64748B]">Requires verified App Store data</p>
        </div>
        <div data-testid="android-download-metric" className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/75 px-3.5 py-3">
          <p className="text-[12px] text-[#64748B]">Android Google Play installs</p>
          <p className="mt-2 text-[18px] font-semibold text-[#0F172A]">Not connected</p>
          <p className="mt-1 text-[11px] text-[#64748B]">Requires verified Google Play data</p>
        </div>
      </div>
      <p className="text-[11px] leading-4 text-[#64748B]">
        Store reporting is not connected. Session and online counts are not downloads.
      </p>
    </section>

    <div className="min-w-0">
      <h2 className="mb-2 text-[15px] font-semibold">Account Sessions</h2>
      <p className="mb-3 text-[11px] leading-4 text-[#64748B]">Sessions in the selected period, including ended sessions; not live users or unique devices.</p>
    {result.status === "ok" ? <section data-testid="platform-session-metrics"
      aria-label="Account sessions matching selected filters"
      className="grid min-w-0 grid-cols-2 gap-3 min-[900px]:grid-cols-4">
      {summaries.map(({ label, value, icon: Icon }) =>
        <div key={label} data-testid="platform-session-metric"
          className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/75 px-3.5 py-3 sm:px-4">
          <div className="flex min-h-9 min-w-0 items-start gap-2 text-[12px] leading-[17px] text-[#64748B]">
            <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0"/>
            <span className="min-w-0">{label}</span>
          </div>
          <p className="mt-1 text-[22px] font-semibold leading-7 tabular-nums tracking-tight text-[#0F172A]">
            {value.toLocaleString()}
          </p>
        </div>)}
    </section> : null}
    </div>

    <form action="/admin/platforms/devices" method="get" aria-label="Platform Metrics filters"
      className="flex min-w-0 flex-wrap items-end gap-3 border-b border-[#E2E8F0] pb-4">
      <div className="flex w-full min-w-0 flex-col gap-1 text-[12px] font-medium text-[#475569] sm:w-[200px]">
        <span>Session period</span>
        <AdminDirectorySelect name="range" label="Session period" value={query.range}
          options={rangeOptions} timeZoneLabel={formatAdminTimeZoneLabel(timeZone)} />
      </div>
      <label className="flex w-full min-w-0 flex-col gap-1 text-[12px] font-medium text-[#475569] sm:w-[200px]">
        Platform
        <select name="platform" defaultValue={query.platform}
          className="focus-ring h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[13px] font-normal text-[#0F172A]">
          {platformOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button type="submit" className="focus-ring h-10 w-full rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97] sm:w-auto sm:min-w-[124px]">Apply filters</button>
    </form>

    {result.status === "unavailable" ? <AdminEmptyState title="Account session metrics unavailable"
      message="Account-session totals could not be loaded. This does not mean there are no sessions."
      action={<Link className={navigationLink} href={platformAccessHref(query, 1)}>Retry</Link>} /> : null}
  </div>;
}
