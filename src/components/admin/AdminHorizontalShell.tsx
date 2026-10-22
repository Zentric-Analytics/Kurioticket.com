"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, ChevronDown, Command, LogOut, Menu, Search, Settings, ShieldCheck, X, Building2 } from "lucide-react";
import { getAdminHeaderGroups, isAdminNavItemActive, type AdminNavDefinition, type AdminRole } from "@/lib/adminNavigation";
import { KurioticketLogo } from "@/components/brand/KurioticketLogo";

type HeaderGroup = ReturnType<typeof getAdminHeaderGroups>[number];
type HeaderEntry = HeaderGroup["links"][number];

function HeaderNavLink({ entry, pathname, mobile = false, close }: { entry: HeaderEntry; pathname: string; mobile?: boolean; close: () => void }) {
  const { item, children } = entry;
  const selected = isAdminNavItemActive(item.href, pathname) || children.some((child) => isAdminNavItemActive(child.href, pathname));
  const [expanded, setExpanded] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const Icon = item.icon;
  // The underline alone distinguishes an active tab: its text, icon and surface
  // stay identical to the other tabs, including when a subpage is selected.
  const style = "text-slate-600 hover:bg-slate-50";
  const underline = selected
    ? " after:absolute after:-bottom-2 after:left-1 after:right-1 after:h-0.5 after:rounded-full after:bg-indigo-600"
    : "";

  // Keep desktop submenus above surrounding content regardless of the
  // navigation row and its responsive layout.
  useEffect(() => {
    if (!expanded || mobile) return;

    const dismissOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!anchorRef.current?.contains(target) && !popupRef.current?.contains(target)) {
        setExpanded(false);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        triggerRef.current?.focus();
      }
    };
    const dismissOnScroll = () => setExpanded(false);

    window.addEventListener("pointerdown", dismissOnOutsidePress);
    window.addEventListener("keydown", dismissOnEscape);
    window.addEventListener("scroll", dismissOnScroll, true);
    window.addEventListener("resize", dismissOnScroll);
    return () => {
      window.removeEventListener("pointerdown", dismissOnOutsidePress);
      window.removeEventListener("keydown", dismissOnEscape);
      window.removeEventListener("scroll", dismissOnScroll, true);
      window.removeEventListener("resize", dismissOnScroll);
    };
  }, [expanded, mobile]);

  function toggleSubmenu() {
    if (!expanded && !mobile && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const width = 240;
      setPopupPosition({
        top: rect.bottom + 8,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      });
    }
    setExpanded((value) => !value);
  }

  if (!children.length) return (
    <Link href={item.href} onClick={close} aria-current={isAdminNavItemActive(item.href, pathname) ? "page" : undefined}
      className={'relative inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-1.5 text-[12.5px] font-semibold transition min-[1600px]:gap-2 min-[1600px]:px-2 min-[1600px]:text-[13px] min-[1800px]:px-2.5 min-[1800px]:text-[13.5px] ' + style + underline}>
      <Icon size={14} aria-hidden="true" className="h-[13px] w-[13px] shrink-0 xl:h-3.5 xl:w-3.5 2xl:h-4 2xl:w-4" /><span>{item.label}</span>
    </Link>
  );

  const submenu = (
    <>
      <Link href={item.href} onClick={() => { setExpanded(false); close(); }}
        className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
        <Icon size={16} aria-hidden="true" />{item.label}
      </Link>
      {children.map((child) => {
        const ChildIcon = child.icon;
        const active = isAdminNavItemActive(child.href, pathname);
        return <Link key={child.href} href={child.href} onClick={() => { setExpanded(false); close(); }}
          aria-current={active ? "page" : undefined}
          className={'relative flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50' + (active ? " after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-indigo-600" : "")}>
          <ChildIcon size={16} aria-hidden="true" />{child.label}
        </Link>;
      })}
    </>
  );

  return (
    <div ref={anchorRef} className={"relative shrink-0 " + (mobile ? "w-full" : "")}>
      <div className={'relative inline-flex items-center whitespace-nowrap rounded-xl ' + (mobile ? "w-fit" : "w-full") + " " + style + underline}>
        <Link href={item.href} onClick={() => { setExpanded(false); close(); }}
          aria-current={isAdminNavItemActive(item.href, pathname) ? "page" : undefined}
          className="inline-flex h-10 min-w-0 items-center gap-1.5 whitespace-nowrap rounded-l-xl pl-1.5 pr-0.5 text-[12.5px] font-semibold min-[1600px]:gap-2 min-[1600px]:pl-2 min-[1600px]:text-[13px] min-[1800px]:pl-2.5 min-[1800px]:text-[13.5px]">
          <Icon size={14} aria-hidden="true" className="h-[13px] w-[13px] shrink-0 xl:h-3.5 xl:w-3.5 2xl:h-4 2xl:w-4" /><span>{item.label}</span>
        </Link>
        <button ref={triggerRef} type="button" aria-expanded={expanded} aria-controls={expanded ? menuId : undefined}
          aria-label={'Show ' + item.label + ' subpages'} onClick={toggleSubmenu}
          className="flex h-10 w-5 shrink-0 items-center justify-center rounded-r-xl hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 min-[1600px]:w-6">
          <ChevronDown size={12} aria-hidden="true" className={expanded ? "rotate-180 transition-transform xl:h-3.5 xl:w-3.5" : "transition-transform xl:h-3.5 xl:w-3.5"} />
        </button>
      </div>
      {expanded ? (
        mobile ? (
          <div id={menuId} className="mt-1 space-y-1 pl-4">{submenu}</div>
        ) : createPortal(
          <div id={menuId} ref={popupRef} aria-label={item.label + " subpages"}
            style={{ top: popupPosition.top, left: popupPosition.left }}
            className="fixed z-[70] w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {submenu}
          </div>,
          document.body,
        )
      ) : null}
    </div>
  );
}

function Navigation({ groups, pathname, mobile = false, close }: { groups: HeaderGroup[]; pathname: string; mobile?: boolean; close: () => void }) {
  return <nav aria-label="Admin navigation" className={mobile
    ? "flex flex-col gap-2 p-3"
    : "flex min-w-max w-full flex-nowrap items-center justify-between gap-2 whitespace-nowrap min-[1600px]:gap-3"}>
    {!mobile ? (
      <Link href="/admin" onClick={close} aria-label="Kurioticket Admin overview"
        className="inline-flex h-10 shrink-0 items-center border-r border-slate-200 pr-2 min-[1600px]:pr-4">
        {/* Use the actual public-site brand assets, never a recreated KT placeholder. */}
        <span className="min-[1360px]:hidden">
          <KurioticketLogo variant="mark" className="h-7 w-7" markClassName="h-7 w-7" />
        </span>
        <span className="hidden min-[1360px]:flex min-[1360px]:flex-col min-[1360px]:justify-center min-[1360px]:gap-0.5">
          <KurioticketLogo variant="full" className="h-6 w-auto" />
          <span className="text-[10px] font-medium leading-3 text-slate-500">Internal operations</span>
        </span>
      </Link>
    ) : null}
    {groups.map((group, index) => (
      <div key={group.label} className={mobile
        ? "flex flex-col gap-1"
        : "flex shrink-0 items-center gap-1.5 min-[1600px]:gap-2 min-[1800px]:gap-3"}>
        {!mobile && index > 0 ? (
          <span className="mx-1.5 h-5 w-px bg-slate-200 min-[1600px]:mx-2 min-[1800px]:mx-2.5" aria-hidden="true" />
        ) : null}
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
        <div className="flex min-w-0 items-center gap-3">
          {/* Genuine brand mark stays visible when the compact menu replaces the tab row. */}
          <span className="shrink-0 min-[1100px]:hidden">
            <KurioticketLogo variant="mark" className="h-9 w-9" markClassName="h-9 w-9" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold tracking-tight text-slate-950">Kurioticket Admin</p>
            <p className="truncate text-xs font-medium text-slate-500">Secure internal workspace</p>
          </div>
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
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 min-[1100px]:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? "Close admin navigation" : "Open admin navigation"} aria-expanded={mobileOpen}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>
      <div className="hidden border-t border-slate-100 min-[1100px]:block">
        <div className="mx-auto max-w-[1920px] overflow-x-auto overscroll-x-contain px-3 pb-2 pt-2 min-[1800px]:px-6">
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
