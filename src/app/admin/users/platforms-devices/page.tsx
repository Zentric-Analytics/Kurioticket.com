import Link from "next/link";
import { ArrowLeft, Monitor, Smartphone, TabletSmartphone, Clock3, Users } from "lucide-react";
import { requireAdminSession } from "@/lib/auth-guards";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { platformLabel, deviceValue } from "@/components/admin/AdminIdentityDeviceAccess";
import {
  loadPlatformAccess, parsePlatformAccessQuery, platformAccessHref, PLATFORM_ACCESS_PAGE_SIZE,
} from "@/services/adminPlatformAccessService";

export const metadata = { title: "Admin Platforms & Devices" };
type RawQuery = Record<string, string | string[] | undefined>;
const rangeOptions = [
  { value: "today", label: "Today (UTC)" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];
const platformOptions = [
  { value: "all", label: "All platforms" },
  { value: "web", label: "Web sessions" },
  { value: "ios", label: "iOS app" },
  { value: "android", label: "Android app" },
  { value: "other", label: "Other mobile app" },
];
const format = (date: Date) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit",
  minute: "2-digit", hour12: false, timeZone: "UTC",
}).format(date) + " UTC";
const navigationLink = "focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";

export default async function AdminPlatformsDevicesPage({ searchParams }: {
  searchParams: Promise<RawQuery>;
}) {
  await requireAdminSession("/admin/users/platforms-devices");
  const query = parsePlatformAccessQuery(await searchParams);
  if (!query) return <AdminEmptyState title="Invalid Platforms & Devices filters"
    message="Choose a valid time range, platform and page."
    action={<Link className={navigationLink} href="/admin/users/platforms-devices">Reset filters</Link>} />;

  const result = await loadPlatformAccess(query);
  const totalPages = result.status === "ok" ? Math.max(1, Math.ceil(result.total / PLATFORM_ACCESS_PAGE_SIZE)) : 1;
  const summaries = result.status === "ok" ? [
    { label: "Web sessions", value: result.counts.web, icon: Monitor },
    { label: "iOS app sessions", value: result.counts.ios, icon: Smartphone },
    { label: "Android app sessions", value: result.counts.android, icon: TabletSmartphone },
    { label: "Other app sessions", value: result.counts.other, icon: Users },
  ] : [];
  return <div className="min-w-0 space-y-5 bg-white pb-6 text-[#0F172A]">
    <header className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">Platforms &amp; Devices</h1>
        <p className="mt-1 text-[12px] leading-5 text-[#64748B]">
          Recorded signed-in account sessions across Kurioticket platforms. Guest activity is managed separately.
        </p>
      </div>
      <Link href="/admin/users" className={navigationLink}>
        <ArrowLeft size={14} aria-hidden="true"/> Users directory
      </Link>
    </header>

    <form action="/admin/users/platforms-devices" method="get" aria-label="Platforms and devices filters"
      className="flex min-w-0 flex-wrap items-end gap-3 border-b border-[#E2E8F0] pb-4">
      <label className="flex min-w-[145px] max-w-[220px] flex-1 flex-col gap-1 text-[12px] font-medium text-[#475569]">
        Activity window
        <select name="range" defaultValue={query.range}
          className="focus-ring h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[13px] font-normal text-[#0F172A]">
          {rangeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="flex min-w-[145px] max-w-[220px] flex-1 flex-col gap-1 text-[12px] font-medium text-[#475569]">
        Platform
        <select name="platform" defaultValue={query.platform}
          className="focus-ring h-10 w-full rounded-lg border border-[#CBD5E1] bg-white px-3 text-[13px] font-normal text-[#0F172A]">
          {platformOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <button type="submit" className="focus-ring h-10 rounded-lg bg-[#004BB8] px-4 text-[13px] font-medium text-white hover:bg-[#003D97]">Apply filters</button>
    </form>

    {result.status === "unavailable" ? <AdminEmptyState title="Platform access unavailable"
      message="Stored account sessions could not be read. This does not mean that no devices have accessed Kurioticket."
      action={<Link className={navigationLink} href={platformAccessHref(query, 1)}>Retry</Link>} /> : <>
      <section aria-label="Recorded platform summary" className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        {summaries.map(({ label, value, icon: Icon }) =>
          <div key={label} className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white p-3.5 sm:p-4">
            <div className="flex items-center gap-2 text-[12px] text-[#64748B]"><Icon size={15} aria-hidden="true"/>{label}</div>
            <p className="mt-3 text-[24px] font-semibold tabular-nums tracking-tight">{value.toLocaleString()}</p>
          </div>)}
      </section>
      <section aria-labelledby="access-history-heading" className="min-w-0 rounded-xl border border-[#E2E8F0] bg-white">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-3 py-4 sm:px-4">
          <div>
            <h2 id="access-history-heading" className="flex items-center gap-2 text-[15px] font-semibold">
              <Clock3 size={16} aria-hidden="true" className="text-[#64748B]"/>Device &amp; Access History
            </h2>
            <p className="mt-1 text-[12px] text-[#64748B]">
              {result.total.toLocaleString()} matching account sessions · All times UTC
            </p>
          </div>
          <span className="text-[11px] text-[#64748B]">
            {rangeOptions.find(item => item.value === query.range)?.label}
          </span>
        </div>
        {result.sessions.length === 0 ? <p role="status" className="border-t border-[#E2E8F0] px-4 py-8 text-center text-[13px] text-[#64748B]">
          {result.total === 0 ? "No recorded account sessions match these filters." : "No records on this page. Return to the first page."}
        </p> : <>
          <div className="space-y-2 border-t border-[#E2E8F0] p-3 md:hidden" aria-label="Device access records">
            {result.sessions.map(row => <article key={row.id} className="min-w-0 space-y-1 rounded-lg border border-[#E2E8F0] p-3 text-[12px]">
              <Link href={"/admin/users/user/" + encodeURIComponent(row.userId) + "/devices"}
                className="focus-ring block break-words font-semibold text-[#004BB8] hover:underline">
                {row.user.name || row.user.email || "Registered account"}
              </Link>
              <p className="break-words text-[#334155]">{platformLabel(row)} · {deviceValue(row.deviceLabel)} · {deviceValue(row.os)}</p>
              <p className="break-words text-[#64748B]">{row.client === "MOBILE" ? "In-app" : deviceValue(row.browser)} · {deviceValue(row.locationLabel)}</p>
              <time className="block tabular-nums text-[#64748B]" dateTime={row.lastSeenAt.toISOString()}>
                {format(row.lastSeenAt)}{row.revokedAt ? " · Revoked" : ""}
              </time>
            </article>)}
          </div>
          <div role="region" aria-label="Platform access history table" tabIndex={0}
            className="admin-responsive-records hidden min-w-0 overflow-x-auto border-t border-[#E2E8F0] md:block">
            <table className="w-full min-w-[850px] table-fixed text-left text-[12px]">
              <thead className="bg-[#F8FAFC] uppercase text-[11px] text-[#64748B]">
                <tr>
                  <th scope="col" className="w-[21%] px-3 py-3 font-medium">Account</th>
                  <th scope="col" className="w-[15%] px-3 py-3 font-medium">Platform</th>
                  <th scope="col" className="w-[17%] px-3 py-3 font-medium">Device / OS</th>
                  <th scope="col" className="w-[13%] px-3 py-3 font-medium">Browser</th>
                  <th scope="col" className="w-[16%] px-3 py-3 font-medium">Location</th>
                  <th scope="col" className="w-[18%] px-3 py-3 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {result.sessions.map(row => <tr key={row.id} className="align-top text-[#334155]">
                  <td className="break-words px-3 py-3">
                    <Link href={"/admin/users/user/" + encodeURIComponent(row.userId) + "/devices"}
                      className="focus-ring font-medium text-[#004BB8] hover:underline">{row.user.name || row.user.email || row.user.id}</Link>
                  </td>
                  <td className="px-3 py-3">{platformLabel(row)}</td>
                  <td className="break-words px-3 py-3">{deviceValue(row.deviceLabel)} · {deviceValue(row.os)}</td>
                  <td className="break-words px-3 py-3">{row.client === "MOBILE" ? "In-app" : deviceValue(row.browser)}</td>
                  <td className="break-words px-3 py-3">{deviceValue(row.locationLabel)}</td>
                  <td className="px-3 py-3 tabular-nums">
                    <time dateTime={row.lastSeenAt.toISOString()}>{format(row.lastSeenAt)}</time>
                    {row.revokedAt ? <span className="mt-1 block text-[11px] text-[#64748B]">Revoked</span> : null}
                  </td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </>}
        <nav aria-label="Platform access pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] px-3 py-3 sm:px-4">
          <span className="text-[12px] tabular-nums text-[#64748B]">Page {query.page.toLocaleString()} of {totalPages.toLocaleString()}</span>
          <div className="flex gap-2">
            {query.page > 1 ? <Link className={navigationLink} href={platformAccessHref(query, query.page - 1)}>Previous</Link> : null}
            {query.page < totalPages ? <Link className={navigationLink} href={platformAccessHref(query, query.page + 1)}>Next</Link> : null}
          </div>
        </nav>
      </section>
      <p className="text-[12px] leading-5 text-[#64748B]">
        Counts represent recorded account sessions, not distinct people or installed devices. Web includes desktop and mobile browsers;
        unrecognized native platforms appear under Other. Location is an approximate network estimate when recorded.
      </p>
    </>}
  </div>;
}
