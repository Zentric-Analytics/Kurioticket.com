"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Command, LogOut, Menu, Search, Settings, ShieldCheck, X, Building2 } from "lucide-react";
import { getAdminHeaderGroups, isAdminNavItemActive, type AdminNavDefinition, type AdminRole } from "@/lib/adminNavigation";
import { KurioticketLogo } from "@/components/brand/KurioticketLogo";

type HeaderGroup = ReturnType<typeof getAdminHeaderGroups>[number];
type HeaderEntry = HeaderGroup["links"][number];

function HeaderNavLink({ entry, pathname, close }: { entry: HeaderEntry; pathname: string; mobile?: boolean; close: () => void }) {
  const { item } = entry;
  const selected =
    isAdminNavItemActive(item.href, pathname) ||
    entry.children.some((child) => isAdminNavItemActive(child.href, pathname));
  const Icon = item.icon;
  // Match the public Hotel navbar: white surface, compact semibold type and dark navy copy.
  const style = "text-[#021C2B]/85 hover:bg-[#004BB8]/5 hover:text-[#021C2B]";
  const underline = selected
    ? " after:absolute after:-bottom-1 after:left-1 after:right-1 after:h-0.5 after:rounded-full after:bg-[#004BB8]"
    : "";
  return (
    <Link href={item.href} onClick={close} aria-current={selected ? "page" : undefined}
      className={"relative inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-2.5 text-[15px] font-semibold leading-none tracking-[-0.005em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 " + style + underline}>
      <Icon size={14} aria-hidden="true" className="h-[13px] w-[13px] shrink-0 xl:h-3.5 xl:w-3.5 2xl:h-4 2xl:w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

function Navigation({ groups, pathname, mobile = false, close }: { groups: HeaderGroup[]; pathname: string; mobile?: boolean; close: () => void }) {
  return <nav aria-label="Admin navigation" className={mobile
    ? "flex flex-col gap-2 p-3"
    : "flex w-full flex-wrap items-center justify-start gap-x-5 gap-y-2"}>
    {groups.map((group) => (
      <div key={group.label} className={mobile
        ? "flex flex-col gap-1"
        : "contents"}>
                {mobile ? <p className="px-3 pt-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p> : null}
        {group.links.map((entry) => <HeaderNavLink key={entry.item.href} entry={entry} pathname={pathname} mobile={mobile} close={close} />)}
      </div>
    ))}
  </nav>;
}

export function AdminHorizontalShell({ children, adminEmail, adminName, adminRole, showPreviewTesters = false }: {
  children: React.ReactNode; adminEmail?: string | null; adminName?: string | null; adminRole: string; showPreviewTesters?: boolean;
}) {
  const role: AdminRole = adminRole === "SUPPORT" || adminRole === "USER" ? adminRole : "ADMIN";
  const groups = getAdminHeaderGroups(role, showPreviewTesters);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [unreadAlertCount, setUnreadAlertCount] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const name = adminName || adminEmail || "Admin";
  const initial = name.slice(0, 1).toUpperCase();
  const allPages: AdminNavDefinition[] = groups.flatMap((group) => group.links.flatMap(({ item, children: subpages }) => [item, ...subpages]));
  const matches = allPages.filter((item) => (item.label + " " + item.description).toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setSearchOpen(true);
      }
      if (event.key === "Escape") { setSearchOpen(false); setProfileOpen(false); setMobileOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);
  useEffect(() => {
    let cancelled = false;
    let requestInFlight = false;

    async function loadAlertCount() {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const response = await fetch("/api/admin/notifications?summary=1", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok) return;
        const body = await response.json();
        const count = typeof body.unreadCount === "number" ? body.unreadCount : 0;
        if (!cancelled) setUnreadAlertCount(count);
      } catch {
        if (!cancelled) setUnreadAlertCount(null);
      } finally {
        requestInFlight = false;
      }
    }

    void loadAlertCount();
    const refresh = () => void loadAlertCount();
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void loadAlertCount();
    };
    const interval = window.setInterval(refreshIfVisible, 60_000);

    window.addEventListener("admin-alerts-updated", refresh);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("admin-alerts-updated", refresh);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [pathname]);

  // The Users directory and its individual Activity pages share a flat white canvas.
  // Keep other Admin routes, including Journeys and Search details, unchanged.
  const usersDirectory = pathname === "/admin/users" || pathname === "/admin/users/";
  const userActivity = /^\/admin\/users\/(?:user|guest)\/[a-z0-9_-]{6,80}\/activity\/?$/i.test(pathname);
  return <div className={"min-h-screen text-slate-950 " + (usersDirectory || userActivity ? "bg-white" : "bg-[#f1f5fb]")}>
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between gap-4 pl-2 pr-4 sm:pr-6 lg:pr-10">
        <div className="flex min-w-0 items-center gap-2">
          {/* Official Kurioticket mark stays in the top-left header beside the title at every width. */}
          <Link href="/admin" aria-label="Kurioticket Admin overview"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            <KurioticketLogo variant="mark" className="h-11 w-11" markClassName="h-11 w-11" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-[-0.01em] text-[#021C2B]">Kurioticket Admin</p>
            <p className="truncate text-xs font-medium text-[#475569]">Secure internal workspace</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => { setQuery(""); setSearchOpen(true); }} aria-label="Search admin pages"
            className="inline-flex h-10 items-center gap-3 rounded-xl border border-[#D8E1EC] bg-[#F5F7FB] px-3 text-sm font-medium text-[#475569] transition-colors hover:border-[#C4CFDC] hover:bg-[#F3F6FA] sm:w-52 sm:justify-between lg:w-60">
            <span className="inline-flex items-center gap-2"><Search size={17} /><span className="hidden sm:inline">Search</span></span>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 sm:inline">Ctrl K</kbd>
          </button>
          <Link
            href="/admin/notifications"
            aria-label={unreadAlertCount && unreadAlertCount > 0 ? `${unreadAlertCount} unread admin alerts` : "Admin notifications and alerts"}
            title="Admin notifications and alerts"
            className="relative flex h-10 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          >
            <Bell size={19} />
            {unreadAlertCount && unreadAlertCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                {unreadAlertCount > 99 ? "99+" : unreadAlertCount}
              </span>
            ) : null}
          </Link>
          <div className="relative">
            <button type="button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen} aria-label="Admin profile"
              className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{initial}</span>
              <ChevronDown size={15} className="text-slate-500" aria-hidden="true" />
            </button>
            {profileOpen ? <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-xs text-slate-500">{adminEmail || role}</p><p className="mt-1 text-xs font-semibold text-indigo-700">{role}</p></div>
              {([{ href: "/admin/settings", label: "Admin settings", icon: Settings }, { href: "/admin/logs", label: "Audit logs", icon: ShieldCheck }, { href: "/", label: "Switch to public site", icon: Building2 }, { href: "/api/auth/signout", label: "Logout", icon: LogOut }]).map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Icon size={16} />{label}</Link>)}
            </div> : null}
          </div>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 min-[1100px]:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? "Close admin navigation" : "Open admin navigation"} aria-expanded={mobileOpen}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>
      <div className="hidden border-t border-slate-100 min-[1100px]:block">
        <div className="mx-auto max-w-[1920px] px-4 pb-2 pt-2 sm:px-6 lg:px-10">
          <Navigation groups={groups} pathname={pathname} close={() => {}} />
        </div>
      </div>
      {mobileOpen ? <div className="max-h-[70vh] overflow-y-auto border-t border-slate-100 bg-white min-[1100px]:hidden"><Navigation groups={groups} pathname={pathname} mobile close={() => setMobileOpen(false)} /></div> : null}
    </header>
    <main className="mx-auto w-full max-w-[1920px] px-4 py-5 sm:px-6 lg:px-10">{children}</main>
    {searchOpen ? <div className="fixed inset-0 z-[90] flex items-start justify-center bg-slate-950/30 px-4 pt-[12vh]" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
      <div role="dialog" aria-modal="true" aria-label="Search admin pages" className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4"><Search size={19} className="text-slate-400" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search admin pages..." aria-label="Search admin pages" className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none" /><button onClick={() => setSearchOpen(false)} aria-label="Close search" className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"><X size={18} /></button></div>
        <p className="px-4 pt-3 text-xs text-slate-500">Jump to an admin page</p>
        <div className="max-h-72 overflow-y-auto p-2">{matches.length ? matches.map((item) => { const Icon = item.icon; return <Link href={item.href} key={item.href} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-indigo-50"><Icon size={17} className="text-indigo-600" />{item.label}</Link>; }) : <p className="px-3 py-6 text-center text-sm text-slate-500">No matching admin pages.</p>}</div>
        <div className="border-t border-slate-100 px-4 py-2 text-right text-xs text-slate-400"><Command size={12} className="mr-1 inline" /> Search navigation only</div>
      </div>
    </div> : null}
  </div>;
}
