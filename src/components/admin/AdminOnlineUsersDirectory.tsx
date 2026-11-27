"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Smartphone, TabletSmartphone, UsersRound } from "lucide-react";

import { AdminDirectorySelect } from "@/components/admin/AdminDirectorySelect";
import { onlinePresenceHeartbeatMs } from "@/lib/onlinePresence";
import { adminOnlineUsersLiveUntil, adminUsersRefreshQuietMs, createAdminUsersRefreshController, hasOpenAdminUsersInteraction, type AdminUsersRefreshState } from "@/lib/adminUsersLiveRefresh";
import { adminOnlineUsersHref, defaultOnlineUsersQuery, matchesAdminOnlineUser, parseAdminOnlineUsersQuery, type OnlineUsersFilters as Filters } from "@/lib/adminOnlineUsersQuery";
import { adminUsersActivityHref } from "@/lib/adminUsersNavigation";
import type { AdminOnlineUsersSnapshot, OnlineIdentityRow } from "@/services/adminOnlineUsersService";

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

function isSnapshot(value: unknown): value is AdminOnlineUsersSnapshot {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<AdminOnlineUsersSnapshot>;
  if (!Number.isFinite(Date.parse(result.observedAt ?? "")) || result.windowSeconds !== 90) return false;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const parsed = useMemo(() => parseAdminOnlineUsersQuery(new URLSearchParams(search)), [search]);
  const applied = parsed.ok ? parsed.query : defaultOnlineUsersQuery;
  const [snapshot, setSnapshot] = useState(initial);
  const [serverSnapshot, setServerSnapshot] = useState(initial);
  const [draft, setDraft] = useState<Filters>(applied);
  const scope = JSON.stringify([applied.q, applied.type, applied.role, applied.platform]);
  const [draftScope, setDraftScope] = useState(scope);
  // Browser navigation restores applied controls. A roster refresh or page
  // change with the same filters must not erase an unfinished filter draft.
  if (draftScope !== scope) {
    setDraftScope(scope);
    setDraft(applied);
  }
  const [refreshing, setRefreshing] = useState(false);
  const [refreshState, setRefreshState] = useState<AdminUsersRefreshState>("live");
  const interactionAt = useRef(0);
  const pointerDown = useRef(false);
  const [expiredObservation, setExpiredObservation] = useState<string | null>(null);
  const liveUntil = useMemo(() => adminOnlineUsersLiveUntil(snapshot), [snapshot]);
  useEffect(() => {
    // Deferring a roster update must never extend the claim that its sample is
    // current. An identity already 89 seconds old at observation has only one
    // second left, not a fresh 90 seconds. Preserve rows and sampled counts.
    const observedAt = snapshot.observedAt;
    const remaining = liveUntil - Date.now();
    const timer = setTimeout(() => setExpiredObservation(observedAt), Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [snapshot.observedAt, liveUntil]);
  // A URL navigation can supply a newer server sample without remounting this
  // component. Never replace a newer poll with an older cached route payload.
  if (serverSnapshot !== initial) {
    setServerSnapshot(initial);
    if (refreshState !== "authorization" && Date.parse(initial.observedAt) >= Date.parse(snapshot.observedAt)) {
      setSnapshot(initial);
      if (refreshState !== "offline") setRefreshState("live");
    }
  }
  const rows = useMemo(() => parsed.ok && snapshot.status === "ok"
    ? snapshot.rows.filter(row => matchesAdminOnlineUser(row, applied)) : [], [snapshot, applied, parsed.ok]);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(applied.page, pageCount);
  const visible = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const originHref = adminOnlineUsersHref({ ...applied, page: currentPage });

  useEffect(() => {
    let active = true;
    let received: AdminOnlineUsersSnapshot | null = null;
    const controller = createAdminUsersRefreshController({
      intervalMs: onlinePresenceHeartbeatMs,
      availability: () => {
        if (document.visibilityState !== "visible") return "hidden";
        if (!navigator.onLine) return "offline";
        if (pointerDown.current || Date.now() - interactionAt.current < adminUsersRefreshQuietMs
          || hasOpenAdminUsersInteraction()) return "interacting";
        return "ready";
      },
      probe: async signal => {
        received = null;
        setRefreshing(true);
        const response = await fetch("/api/admin/users/online", {
          credentials: "same-origin", cache: "no-store", signal, referrerPolicy: "origin",
        });
        if (response.status === 401 || response.status === 403) return "unauthorized";
        if (!response.ok) throw new Error("Live presence unavailable");
        const body: unknown = await response.json();
        if (!isSnapshot(body)) throw new Error("Invalid online presence response");
        if (active && !signal.aborted) received = body;
        return "ready";
      },
      refresh: async () => {
        if (!active || !received) return;
        const next = received;
        setSnapshot(current => Date.parse(next.observedAt) >= Date.parse(current.observedAt) ? next : current);
      },
      state: value => {
        if (!active) return;
        setRefreshState(value);
        setRefreshing(value === "updating");
        if (value === "authorization") setSnapshot({ status: "unavailable", observedAt: new Date().toISOString(), windowSeconds: 90 });
      },
      unauthorized: () => { if (active) router.refresh(); },
    });
    const resume = () => {
      setRefreshState(current => current === "authorization" ? current : navigator.onLine ? "delayed" : "offline");
      if (document.visibilityState !== "visible" || !navigator.onLine) {
        setRefreshing(false);
      }
      controller.resume();
    };
    const interacted = () => { interactionAt.current = Date.now(); };
    const pressed = () => { pointerDown.current = true; interacted(); };
    const released = () => { pointerDown.current = false; interacted(); };
    const blurred = () => { pointerDown.current = false; };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    document.addEventListener("input", interacted, true);
    document.addEventListener("keydown", interacted, true);
    document.addEventListener("pointerdown", pressed, true);
    document.addEventListener("pointerup", released, true);
    document.addEventListener("pointercancel", released, true);
    window.addEventListener("blur", blurred);
    controller.start();
    return () => {
      active = false;
      controller.dispose();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
      document.removeEventListener("input", interacted, true);
      document.removeEventListener("keydown", interacted, true);
      document.removeEventListener("pointerdown", pressed, true);
      document.removeEventListener("pointerup", released, true);
      document.removeEventListener("pointercancel", released, true);
      window.removeEventListener("blur", blurred);
    };
  }, [router]);

  const available = snapshot.status === "ok";
  const verified = available && refreshState === "live" && expiredObservation !== snapshot.observedAt;
  return <div className="min-w-0 space-y-5 bg-white pb-6">
    <section aria-label="Online Users" className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[17px] font-semibold text-[#0F172A]">Online Users</h1>
        <span className="text-[12px] text-[#64748B]" role="status">
          {refreshState === "authorization" ? "Checking your access…" : refreshing ? "Refreshing…"
            : refreshState === "offline" ? "Offline · updates resume when connected"
            : refreshState === "delayed" ? "Updates delayed · retrying automatically"
            : available ? verified ? "Live · last 90 seconds" : "Last observed · waiting for an update" : "Live data unavailable"}
        </span>
      </div>
      <div data-testid="users-online-metrics" role="group"
        aria-label={available ? verified ? "Live online counts" : "Last observed online counts" : "Online counts unavailable"}
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
      {available && !verified ? <p role="status" className="text-[12px] text-[#64748B]">
        Showing last observed counts and identities. Current online status is unverified until updates resume.
      </p> : null}
    </section>

    <section aria-label="Online user records" className="min-w-0 space-y-4">
      <form aria-label="Filter online users" onSubmit={event => {
        event.preventDefault(); router.push(adminOnlineUsersHref({ ...draft, page: 1 }), { scroll: false });
      }} data-testid="online-users-filter-row"
        className="grid min-w-0 grid-cols-1 items-center gap-2 border-b border-[#E2E8F0] pb-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_112px]">
        <label className="min-w-0">
          <span className="sr-only">Search online users</span>
          <input type="search" aria-label="Search online users" value={draft.q}
            onChange={event => setDraft(value => ({ ...value, q: event.target.value.slice(0,120) }))}
            placeholder="Search name, email, user ID, or country"
            className="focus-ring h-10 w-full min-w-0 rounded-lg border border-[#D8E1EC] bg-white px-3 text-[13px] text-[#0F172A] placeholder:text-[#64748B]" />
        </label>
        <AdminDirectorySelect name="type" label="Identity type" compact value={draft.type} options={types}
          onValueChange={type => setDraft(value => ({ ...value, type: type as Filters["type"] }))} />
        <AdminDirectorySelect name="platform" label="Platform" compact value={draft.platform} options={platforms}
          onValueChange={platform => setDraft(value => ({ ...value, platform: platform as Filters["platform"] }))} />
        <AdminDirectorySelect name="role" label="Account role" compact value={draft.role} options={roles}
          onValueChange={role => setDraft(value => ({ ...value, role: role as Filters["role"] }))} />
        <button type="submit" className="focus-ring inline-flex h-10 w-full min-w-0 items-center justify-center whitespace-nowrap rounded-lg bg-[#004BB8] px-3 text-[13px] font-medium text-white hover:bg-[#003D97]">
          Apply filters
        </button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[#0F172A]">Online records</h2>
        <span className="text-[12px] tabular-nums text-[#64748B]">
          {!parsed.ok ? "Invalid filters" : available ? rows.length.toLocaleString("en-US") + (verified ? " matching online records" : " matching recorded identities") : "Records unavailable"}
        </span>
      </div>
      {!parsed.ok ? <div role="status" className="rounded-lg border border-[#E2E8F0] p-5 text-[13px] text-[#475569]">
        <p>{parsed.error}</p><Link href="/admin/users/online" className="focus-ring mt-2 inline-block font-medium text-[#004BB8] hover:underline">Reset online filters</Link>
      </div> : !available ? <div role="status" className="rounded-lg border border-[#E2E8F0] p-5 text-[13px] text-[#475569]">
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
            {visible.map(row => {
              const activityHref = row.kind === "registered"
                ? adminUsersActivityHref("user", row.id, originHref)
                : row.liveReference ? adminUsersActivityHref("live-guest", row.liveReference, originHref) : null;
              return <tr key={row.kind + ":" + row.id} data-users-refresh-anchor={row.kind + ":" + (row.liveReference ?? row.id)}
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
                <span className={"inline-flex items-center gap-1.5 font-medium " + (verified ? "text-[#15803D]" : "text-[#64748B]")}>
                  <span aria-hidden="true" className={"h-2 w-2 shrink-0 rounded-full " + (verified ? "bg-[#16A34A]" : "bg-[#94A3B8]" )} />{verified ? "Online" : "Last observed"}
                </span>
              </td>
              <td data-label="Activity" className="px-3 py-3">
                {activityHref ? <Link prefetch={row.kind === "guest" ? false : undefined} href={activityHref}
                  className="focus-ring font-medium text-[#004BB8] hover:underline">View activity</Link>
                  : <span className="text-[11px] text-[#64748B]">Not linked</span>}
              </td>
            </tr>; })}
          </tbody>
        </table>
      </div>}
      {available && rows.length > pageSize ? <nav aria-label="Online users pagination"
        className="flex items-center justify-end gap-4 border-t border-[#E2E8F0] py-3 text-[12px]">
        <button type="button" disabled={currentPage <= 1}
          onClick={() => router.push(adminOnlineUsersHref({ ...applied, page: Math.max(1, currentPage - 1) }), { scroll: false })}
          className="focus-ring font-medium text-[#004BB8] disabled:text-[#94A3B8]">Previous</button>
        <span className="tabular-nums text-[#475569]">Page {currentPage} of {pageCount}</span>
        <button type="button" disabled={currentPage >= pageCount}
          onClick={() => router.push(adminOnlineUsersHref({ ...applied, page: Math.min(pageCount, currentPage + 1) }), { scroll: false })}
          className="focus-ring font-medium text-[#004BB8] disabled:text-[#94A3B8]">Next</button>
      </nav> : null}
    </section>
  </div>;
}
