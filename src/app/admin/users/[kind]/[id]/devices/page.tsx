import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { requireAdminSession } from "@/lib/auth-guards";
import { validActivityIdentity } from "@/lib/adminIdentityActivity";
import { deviceHistoryHref, parseDeviceHistoryQuery, DEVICE_HISTORY_PAGE_SIZE } from "@/lib/adminDeviceHistory";
import { loadAdminFullDeviceHistory } from "@/services/adminDeviceSessionsService";
import { platformLabel, sourceIcon, deviceValue } from "@/components/admin/AdminIdentityDeviceAccess";
import { AdminEmptyState } from "@/components/admin/AdminPageShell";
import { AdminDeviceHistoryFilters } from "@/components/admin/AdminDeviceHistoryFilters";

export const metadata = { title: "Admin Device & Access History" };
type RawQuery = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ kind: string; id: string }>; searchParams: Promise<RawQuery> };
const linkClass = "focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC]";
const format = (date: Date) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  hour12: false, timeZone: "UTC",
}).format(date) + " UTC";

export default async function AdminDeviceHistoryPage({ params, searchParams }: Props) {
  const { kind, id } = await params;
  if (!validActivityIdentity(kind, id)) notFound();
  const path = "/admin/users/" + kind + "/" + encodeURIComponent(id);
  await requireAdminSession(path + "/devices");
  if (kind !== "user") notFound(); // No authenticated guest device ownership exists.
  const raw = await searchParams;
  const activityPath = path + "/activity";
  const incoming = typeof raw.activityReturn === "string" ? raw.activityReturn : "";
  const backHref = incoming.length <= 1000
    && (incoming === activityPath || incoming.startsWith(activityPath + "?"))
    ? incoming : activityPath;
  const parsed = parseDeviceHistoryQuery(raw);
  if (!parsed.ok) return <div className="min-w-0 space-y-4 bg-white">
    <Link href={backHref} className={linkClass}><ArrowLeft size={15} aria-hidden="true"/> Back to Activity</Link>
    <AdminEmptyState title="Invalid device history filters" message={parsed.error}
      action={<Link href={path + "/devices"} className={linkClass}>Reset device filters</Link>} />
  </div>;
  const query = parsed.query;
  const result = await loadAdminFullDeviceHistory(id, query);
  if (result.status === "not_found") notFound();
  if (result.status === "unavailable") return <div className="min-w-0 space-y-4">
    <Link href={backHref} className={linkClass}><ArrowLeft size={15} aria-hidden="true"/> Back to Activity</Link>
    <AdminEmptyState title="Device history unavailable"
      message="Stored device sessions could not be loaded. This does not mean that the account has no history."
      action={<Link href={deviceHistoryHref(path + "/devices", query, {}, backHref)} className={linkClass}>Retry</Link>} />
  </div>;

  const totalPages = Math.max(1, Math.ceil(result.total / DEVICE_HISTORY_PAGE_SIZE));
  const pagePath = path + "/devices";
  return <div className="min-w-0 space-y-5 bg-white pb-6 text-[#0F172A]">
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
      <Link href={backHref} className="focus-ring inline-flex items-center gap-1.5 text-[#004BB8] hover:underline">
        <ArrowLeft size={15} aria-hidden="true"/> Back to Activity
      </Link>
    </nav>
    <section className="min-w-0 space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-3 sm:p-5"
      aria-label="Full device and access history">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[19px] font-semibold">Device &amp; Access History</h1>
          <p className="mt-1 text-[12px] text-[#64748B]">Recorded account sessions · Times in UTC · Location is a network estimate when available</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F8FAFC] px-2.5 py-1.5 text-[12px] text-[#475569]">
          <Clock3 size={14} aria-hidden="true"/>{result.total.toLocaleString()} matching sessions
        </span>
      </header>
      <AdminDeviceHistoryFilters key={query.range + ":" + (query.from ?? "") + ":" + (query.to ?? "")}
        path={pagePath} query={query} returnHref={backHref}/>
      {result.sessions.length === 0 ? <p role="status" className="rounded-lg bg-[#F8FAFC] px-4 py-7 text-center text-[13px] text-[#64748B]">
        {result.total === 0 ? "No device history matches this date range." : "No records on this page. Go to a previous page."}
      </p> : <>
        <div className="space-y-2 md:hidden" aria-label="Device history mobile records">
          {result.sessions.map(session => {
            const Icon = sourceIcon(session);
            return <article key={session.id} data-testid="device-history-row"
              className="space-y-1 rounded-lg border border-[#E2E8F0] p-3 text-[12px]">
              <p className="flex items-center gap-2 font-semibold"><Icon size={15} aria-hidden="true"/>{platformLabel(session)}</p>
              <p className="break-words text-[#475569]">{deviceValue(session.deviceLabel)} · {deviceValue(session.os)}</p>
              <p className="break-words text-[#64748B]">{session.client === "MOBILE" ? "In-app" : deviceValue(session.browser)} · {deviceValue(session.locationLabel)}</p>
              <p className="tabular-nums text-[#64748B]"><time dateTime={session.lastSeenAt.toISOString()}>{format(session.lastSeenAt)}</time>{session.revokedAt ? " · Revoked" : ""}</p>
            </article>;
          })}
        </div>
        <div className="admin-responsive-records hidden min-w-0 overflow-x-auto md:block"
          role="region" aria-label="Full device history table" tabIndex={0}>
          <table className="w-full min-w-[760px] table-fixed text-left text-[12px]">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] uppercase text-[11px] text-[#64748B]">
              <tr>
                <th scope="col" className="w-[17%] px-3 py-3 font-medium">Platform</th>
                <th scope="col" className="w-[22%] px-3 py-3 font-medium">Device</th>
                <th scope="col" className="w-[12%] px-3 py-3 font-medium">OS</th>
                <th scope="col" className="w-[14%] px-3 py-3 font-medium">Browser</th>
                <th scope="col" className="w-[17%] px-3 py-3 font-medium">Location</th>
                <th scope="col" className="w-[18%] px-3 py-3 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {result.sessions.map(session => {
                const Icon = sourceIcon(session);
                return <tr key={session.id} data-testid="device-history-row">
                  <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 font-medium"><Icon size={15} aria-hidden="true"/>{platformLabel(session)}</span></td>
                  <td className="break-words px-3 py-3">{deviceValue(session.deviceLabel)}</td>
                  <td className="px-3 py-3">{deviceValue(session.os)}</td>
                  <td className="px-3 py-3">{session.client === "MOBILE" ? "In-app" : deviceValue(session.browser)}</td>
                  <td className="break-words px-3 py-3">{deviceValue(session.locationLabel)}</td>
                  <td className="px-3 py-3 tabular-nums"><time dateTime={session.lastSeenAt.toISOString()}>{format(session.lastSeenAt)}</time>{session.revokedAt ? <span className="block text-[11px] text-[#64748B]">Revoked</span> : null}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </>}
      <nav aria-label="Device history pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] pt-3">
        <span className="text-[12px] text-[#64748B]">Page {query.page.toLocaleString()} of {totalPages.toLocaleString()}</span>
        <div className="flex gap-2">
          {query.page > 1 ? <Link href={deviceHistoryHref(pagePath, query, { page: query.page - 1 }, backHref)} className={linkClass}>
            <ChevronLeft size={14} aria-hidden="true"/>Previous</Link> : null}
          {result.hasNext ? <Link href={deviceHistoryHref(pagePath, query, { page: query.page + 1 }, backHref)} className={linkClass}>
            Next<ChevronRight size={14} aria-hidden="true"/></Link> : null}
        </div>
      </nav>
    </section>
  </div>;
}
