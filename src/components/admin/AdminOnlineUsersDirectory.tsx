"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Monitor, Smartphone, TabletSmartphone, UsersRound } from "lucide-react";

import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { onlinePresenceHeartbeatMs } from "@/lib/onlinePresence";
import type { AdminOnlineUsersSnapshot, OnlineIdentityRow } from "@/services/adminOnlineUsersService";

type Filters = { q: string; type: string; role: string; platform: string };
const empty: Filters = { q: "", type: "ALL", role: "ALL", platform: "ALL" };
const types = [
  { value: "ALL", label: "All identities" },
  { value: "registered", label: "Registered" },
  { value: "guest", label: "Guests" },
];
const roles = [
  { value: "ALL", label: "All roles" },
  { value: "USER", label: "User" },
  { value: "SUPPORT", label: "Support" },
  { value: "ADMIN", label: "Admin" },
];
const platforms = [
  { value: "ALL", label: "All platforms" },
  { value: "website", label: "Website" },
  { value: "desktop_web", label: "Desktop web" },
  { value: "mobile_web", label: "Mobile web" },
  { value: "ios", label: "iOS" },
  { value: "android", label: "Android" },
  { value: "unclassified", label: "Unclassified" },
];
const platformNames: Record<OnlineIdentityRow["platforms"][number], string> = {
  desktop_web: "Desktop web", mobile_web: "Mobile web", ios: "iOS", android: "Android",
  unclassified: "Unclassified",
};
const roleNames = { USER: "Customer", SUPPORT: "Support", ADMIN: "Admin" };
const cardItems = [
  { label: "Total online users", icon: UsersRound, key: "total" },
  { label: "iOS online", icon: Smartphone, key: "ios" },
  { label: "Android online", icon: TabletSmartphone, key: "android" },
  { label: "Website online", icon: Monitor, key: "website" },
] as const;
const pageSize = 25;
const clock = (timeZone: string) => new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
});

function matches(row: OnlineIdentityRow, filters: Filters) {
  if (filters.type !== "ALL" && row.kind !== filters.type) return false;
  if (filters.role !== "ALL" && row.role !== filters.role) return false;
  if (filters.platform !== "ALL" && !(filters.platform === "website"
    ? row.platforms.some(p => p === "desktop_web" || p === "mobile_web")
    : row.platforms.includes(filters.platform as OnlineIdentityRow["platforms"][number]))) return false;
  const term = filters.q.trim().toLowerCase();
  if (!term) return true;
  if (row.kind === "guest") return "guest session".includes(term);
  return [row.name, row.email, row.id].some(value => value?.toLowerCase().includes(term));
}
function isSnapshot(value: unknown): value is AdminOnlineUsersSnapshot {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<AdminOnlineUsersSnapshot>;
  if (result.status === "not_configured" || result.status === "unavailable") return true;
  if (result.status !== "ok" || !Array.isArray(result.rows)
    || !result.platforms || !Number.isSafeInteger(result.total)
    || result.total !== result.rows.length || !Number.isSafeInteger(result.registeredAccounts)
    || !Number.isSafeInteger(result.guestSessions)) return false;
  return result.rows.every(row => row && (row.kind === "guest" || row.kind === "registered")
    && typeof row.name === "string" && Array.isArray(row.platforms)
    && row.platforms.length > 0 && Number.isFinite(Date.parse(row.lastSeenAt))
    && (row.locationLabel === null || (typeof row.locationLabel === "string" && row.locationLabel.length <= 160)));
}

export function AdminOnlineUsersDirectory({ initial, timeZone = "UTC" }: { initial: AdminOnlineUsersSnapshot; timeZone?: string }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [draft, setDraft] = useState<Filters>(empty);
  const [applied, setApplied] = useState<Filters>(empty);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const rows = useMemo(() => snapshot.status === "ok"
    ? snapshot.rows.filter(row => matches(row, applied)) : [], [snapshot, applied]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    let active = true;
    let inFlight: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (active && document.visibilityState === "visible") timer = setTimeout(refresh, onlinePresenceHeartbeatMs);
    };
    async function refresh() {
      if (!active || document.visibilityState !== "visible" || inFlight) return;
      const controller = new AbortController();
      inFlight = controller;
      setRefreshing(true);
      const deadline = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch("/api/admin/users/online", {
          cache: "no-store", signal: controller.signal, referrerPolicy: "origin",
        });
        if (!response.ok) throw new Error("Live presence unavailable");
        const received: unknown = await response.json();
        if (!isSnapshot(received)) throw new Error("Invalid online presence response");
        if (active && inFlight === controller) setSnapshot(received);
      } catch {
        if (active && inFlight === controller) setSnapshot({
          status: "unavailable", observedAt: new Date().toISOString(), windowSeconds: 90,
        });
      } finally {
        clearTimeout(deadline);
        if (inFlight === controller) inFlight = null;
        if (active) { setRefreshing(false); schedule(); }
      }
    }
    const onVisibility = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") void refresh();
      else inFlight?.abort();
    };
    document.addEventListener("visibilitychange", onVisibility);
    schedule();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      inFlight?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const available = snapshot.status === "ok";
  return <div className="min-w-0 space-y-5 bg-white pb-6">
    <section aria-label="Online Users" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[17px] font-semibold text-[#0F172A]">Online Users</h1>
        <span className="text-[12px] text-[#64748B]" role="status">
          {refreshing ? "Refreshing…" : available ? "Live · last 90 seconds" : "Live data unavailable"}
        </span>
      </div>
      <div data-testid="users-online-metrics"
        className="grid min-w-0 grid-cols-2 gap-3 min-[1024px]:grid-cols-4">
        {cardItems.map(({ label, icon: Icon, key }) =>
          <div key={key} data-testid="online-platform-metric"
            className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/75 px-3.5 py-3">
            <div className="flex min-h-8 items-start gap-2 text-[12px] leading-4 text-[#64748B]">
              <Icon size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{label}</span>
            </div>
            <p className="mt-1 break-words text-[20px] font-semibold leading-7 tabular-nums text-[#0F172A]">
              {available ? (key === "total" ? snapshot.total : snapshot.platforms[key]).toLocaleString("en-US")
                : snapshot.status === "not_configured" ? "Not configured" : "Unavailable"}
            </p>
          </div>)}
      </div>
      <p className="text-[11px] leading-4 text-[#64748B]">
        Accounts count once across platforms. Guests count by session. Website includes desktop and mobile web.
      </p>
    </section>

    <section aria-label="Online user records" className="min-w-0 space-y-4">
      <form aria-label="Filter online users" onSubmit={event => {
        event.preventDefault(); setApplied(draft); setPage(1);
      }} data-testid="online-users-filter-row"
        className="grid min-w-0 grid-cols-1 items-center gap-2 border-b border-[#E2E8F0] pb-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_112px]">
        <label className="min-w-0">
          <span className="sr-only">Search online users</span>
          <input type="search" aria-label="Search online users" value={draft.q}
            onChange={event => setDraft(value => ({ ...value, q: event.target.value.slice(0,120) }))}
            placeholder="Search name, email, or user ID"
            className="focus-ring h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#0F172A] placeholder:text-[#64748B]" />
        </label>
        <AdminDirectorySelect name="type" label="Identity type" compact value={draft.type} options={types}
          onValueChange={type => setDraft(value => ({ ...value, type }))} />
        <AdminDirectorySelect name="platform" label="Platform" compact value={draft.platform} options={platforms}
          onValueChange={platform => setDraft(value => ({ ...value, platform }))} />
        <AdminDirectorySelect name="role" label="Account role" compact value={draft.role} options={roles}
          onValueChange={role => setDraft(value => ({ ...value, role }))} />
        <button type="submit" className="focus-ring inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-3 text-[13px] font-medium text-white hover:bg-[#003D97]">
          Apply filters
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[#0F172A]">Online records</h2>
        <span className="text-[12px] tabular-nums text-[#64748B]">
          {available ? rows.length.toLocaleString("en-US") + " matching online users" : "Records unavailable"}
        </span>
      </div>
      {!available ? <div role="status" className="rounded-lg border border-[#E2E8F0] p-5 text-[13px] text-[#475569]">
        Online presence could not be verified. This does not mean nobody is online.
      </div> : !rows.length ? <div className="rounded-lg border border-[#E2E8F0] p-5 text-[13px] text-[#475569]">
        No online users match the selected filters.
      </div> : <div className="admin-responsive-records min-w-0 max-w-full" role="region"
          aria-label="Current online identities" tabIndex={0}>
        <table className="w-full min-w-0 table-fixed text-left text-[13px]">
          <thead className="border-b border-[#E2E8F0] text-[11px] font-medium text-[#64748B]">
            <tr>
              <th className="w-[24%] px-3 py-3 font-medium">IDENTITY</th>
              <th className="w-[10%] px-3 py-3 font-medium">TYPE</th>
              <th className="w-[17%] px-3 py-3 font-medium">PLATFORMS</th>
              <th className="w-[16%] px-3 py-3 font-medium">LOCATION</th>
              <th className="w-[15%] px-3 py-3 font-medium">LAST SEEN</th>
              <th className="w-[9%] px-3 py-3 font-medium">STATUS</th>
              <th className="w-[9%] px-3 py-3 font-medium">ACTIVITY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {visible.map(row => <tr key={row.kind + ":" + row.id}
              data-testid="online-user-row" className="align-middle hover:bg-[#F8FAFC]">
              <td data-label="Identity" className="break-words px-3 py-3">
                <p className="font-medium text-[#0F172A]">{row.name}</p>
                {row.email ? <p className="mt-0.5 break-all text-[11px] text-[#64748B]">{row.email}</p> : null}
              </td>
              <td data-label="Type" className="px-3 py-3 text-[#475569]">
                {row.kind === "guest" ? "Guest" : roleNames[row.role ?? "USER"]}
              </td>
              <td data-label="Platforms" className="px-3 py-3">
                <div className="flex flex-wrap gap-1.5">{row.platforms.map(platform =>
                  <span key={platform} className="rounded-md border border-[#E2E8F0] px-2 py-1 text-[11px] text-[#475569]">
                    {platformNames[platform]}
                  </span>)}</div>
              </td>
              <td data-label="Location" className="break-words px-3 py-3 text-[#475569]" data-testid="online-user-location"
                  title={row.locationLabel ? row.kind === "guest" ? "Approximate country from live access" : "Approximate location from a recorded device session" : "No verified location recorded"}>
                {row.locationLabel ?? "Unavailable"}
              </td>
              <td data-label="Last seen" className="px-3 py-3 tabular-nums text-[#475569]">
                <time dateTime={row.lastSeenAt}>{clock(timeZone).format(new Date(row.lastSeenAt))}</time>
              </td>
              <td data-label="Status" className="px-3 py-3">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#15803D]">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[#16A34A]" />Online
                </span>
              </td>
              <td data-label="Activity" className="px-3 py-3">
                {row.kind === "registered" ? <Link href={"/admin/users/user/" + encodeURIComponent(row.id) + "/activity"}
                  className="focus-ring font-medium text-[#004BB8] hover:underline">View Activity</Link>
                  : row.liveReference && /^[A-Za-z0-9_-]{43}$/.test(row.liveReference) ? <Link prefetch={false} href={"/admin/users/live-guest/" + encodeURIComponent(row.liveReference) + "/activity"}
                    className="focus-ring font-medium text-[#004BB8] hover:underline" title="View guest activity">View Activity</Link>
                  : <span className="text-[11px] text-[#64748B]">Not linked</span>}
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      {available && rows.length > pageSize ? <nav aria-label="Online users pagination"
        className="flex items-center justify-end gap-4 border-t border-[#E2E8F0] py-3 text-[12px]">
        <button type="button" disabled={currentPage <= 1}
          onClick={() => setPage(Math.max(1,currentPage - 1))}
          className="focus-ring font-medium text-[#004BB8] disabled:text-[#94A3B8]">Previous</button>
        <span className="tabular-nums text-[#475569]">Page {currentPage} of {pageCount}</span>
        <button type="button" disabled={currentPage >= pageCount}
          onClick={() => setPage(Math.min(pageCount,currentPage + 1))}
          className="focus-ring font-medium text-[#004BB8] disabled:text-[#94A3B8]">Next</button>
      </nav> : null}
    </section>
  </div>;
}
