"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, Command, LogOut, Menu, Search, Settings, ShieldCheck, X, Building2 } from "lucide-react";
import { getAdminHeaderGroups, isAdminNavItemActive, type AdminNavDefinition, type AdminRole } from "@/lib/adminNavigation";

type HeaderGroup = ReturnType<typeof getAdminHeaderGroups>[number];
type HeaderEntry = HeaderGroup["links"][number];

function HeaderNavLink({ entry, pathname, mobile = false, close }: { entry: HeaderEntry; pathname: string; mobile?: boolean; close: () => void }) {
  const { item, children } = entry;
  const selected = isAdminNavItemActive(item.href, pathname) || children.some((child) => isAdminNavItemActive(child.href, pathname));
  const [expanded, setExpanded] = useState(false);
  const Icon = item.icon;
  const style = selected ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950";

  if (!children.length) return (
    <Link href={item.href} onClick={close} aria-current={isAdminNavItemActive(item.href, pathname) ? "page" : undefined}
      className={'relative inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold transition sm:text-sm ' + style + (selected && !mobile ? " after:absolute after:-bottom-2 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-indigo-600" : "")}>
      <Icon size={17} aria-hidden="true" /><span>{item.label}</span>
    </Link>
  );

  return (
    <div className={"relative shrink-0 " + (mobile ? "w-full" : "")}>
      <div className={'relative inline-flex w-full items-center rounded-xl ' + style + (selected && !mobile ? " after:absolute after:-bottom-2 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-indigo-600" : "")}>
        <Link href={item.href} onClick={close} aria-current={isAdminNavItemActive(item.href, pathname) ? "page" : undefined}
          className="inline-flex h-10 min-w-0 items-center gap-2 rounded-l-xl pl-3 pr-1 text-xs font-semibold sm:text-sm">
          <Icon size={17} aria-hidden="true" /><span>{item.label}</span>
        </Link>
        <button type="button" aria-expanded={expanded} aria-label={'Show ' + item.label + ' subpages'}
          onClick={() => setExpanded((value) => !value)} className="flex h-10 w-8 items-center justify-center rounded-r-xl hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          <ChevronDown size={14} aria-hidden="true" className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      </div>
      {expanded ? (
        <div className={mobile ? "mt-1 space-y-1 pl-4" : "absolute left-0 top-full z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"}>
          <Link href={item.href} onClick={() => { setExpanded(false); close(); }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <Icon size={16} aria-hidden="true" />{item.label}
          </Link>
          {children.map((child) => {
            const ChildIcon = child.icon;
            const active = isAdminNavItemActive(child.href, pathname);
            return <Link key={child.href} href={child.href} onClick={() => { setExpanded(false); close(); }} aria-current={active ? "page" : undefined}
              className={'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ' + (active ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50")}>
              <ChildIcon size={16} aria-hidden="true" />{child.label}
            </Link>;
          })}
        </div>
      ) : null}
    </div>
  );
}

function Navigation({ groups, pathname, mobile = false, close }: { groups: HeaderGroup[]; pathname: string; mobile?: boolean; close: () => void }) {
  return <nav aria-label="Admin navigation" className={mobile ? "flex flex-col gap-2 p-3" : "flex w-full items-center justify-between gap-1"}>
    {groups.map((group, index) => (
      <div key={group.label} className={mobile ? "flex flex-col gap-1" : "flex shrink-0 items-center gap-1"}>
        {!mobile && index > 0 ? <span className="mx-2 h-5 w-px bg-slate-200" aria-hidden="true" /> : null}
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
  const searchRef = useRef<HTMLInputElement>(null);
  const name = adminName || adminEmail || "Admin";
  const initial = name.slice(0, 1).toUpperCase();
  const allPages: AdminNavDefinition[] = groups.flatMap((group) => group.links.flatMap(({ item, children: subpages }) => [item, ...subpages]));
  const matches = allPages.filter((item) => (item.label + " " + item.description).toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => { setMobileOpen(false); setProfileOpen(false); setSearchOpen(false); }, [pathname]);
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

  return <div className="min-h-screen bg-[#f1f5fb] text-slate-950">
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1920px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="min-w-0">
          <p className="truncate text-base font-extrabold tracking-tight text-slate-950">Kurioticket Admin</p>
          <p className="truncate text-xs font-medium text-slate-500">Secure internal workspace</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => { setQuery(""); setSearchOpen(true); }} aria-label="Search admin pages"
            className="inline-flex h-10 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 hover:bg-slate-100 sm:w-52 sm:justify-between lg:w-60">
            <span className="inline-flex items-center gap-2"><Search size={17} /><span className="hidden sm:inline">Search</span></span>
            <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500 sm:inline">Ctrl K</kbd>
          </button>
          <button type="button" aria-label="Notifications unavailable" title="Notifications are not live yet" disabled className="flex h-10 w-9 items-center justify-center text-slate-400"><Bell size={19} /></button>
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
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 xl:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? "Close admin navigation" : "Open admin navigation"} aria-expanded={mobileOpen}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>
      <div className="hidden border-t border-slate-100 xl:block">
        <div className="mx-auto max-w-[1920px] px-4 pb-2 pt-2 sm:px-6 lg:px-8">
          <Navigation groups={groups} pathname={pathname} close={() => {}} />
        </div>
      </div>
      {mobileOpen ? <div className="max-h-[70vh] overflow-y-auto border-t border-slate-100 bg-white xl:hidden"><Navigation groups={groups} pathname={pathname} mobile close={() => setMobileOpen(false)} /></div> : null}
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
