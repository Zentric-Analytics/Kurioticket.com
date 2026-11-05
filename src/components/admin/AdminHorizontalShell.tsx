"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { ChevronDown, LogOut, Menu, Settings, ShieldCheck, X, Building2 } from "lucide-react";
import { getAdminHeaderGroups, isAdminNavItemActive, type AdminRole } from "@/lib/adminNavigation";
import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { AdminWorkspaceSearchProvider, AdminSearchTrigger, AdminSearchHeader, AdminSearchContent } from "./AdminWorkspaceSearch";

import { AdminNotificationsPanel } from "./AdminNotificationsPanel";

type HeaderGroup = ReturnType<typeof getAdminHeaderGroups>[number];
type HeaderEntry = HeaderGroup["links"][number];

function HeaderNavLink({ entry, pathname, mobile = false, close }: { entry: HeaderEntry; pathname: string; mobile?: boolean; close: () => void }) {
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
    <Link href={item.href} onClick={close} aria-current={pathname === item.href || pathname === item.href + "/" ? "page" : undefined}
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

function AdminHeaderMenus({ adminEmail, adminName, role, headerRef }: {
  adminEmail?: string | null;
  adminName?: string | null;
  role: AdminRole;
  headerRef: RefObject<HTMLElement | null>;
}) {
  const [openMenu, setOpenMenu] = useState<"profile" | "notifications" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const notificationTriggerRef = useRef<HTMLButtonElement>(null);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);
  const name = adminName || adminEmail || "Admin";
  const initial = name.slice(0, 1).toUpperCase();

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (openMenu === "notifications") notificationTriggerRef.current?.focus();
      else profileTriggerRef.current?.focus();
      setOpenMenu(null);
    };
    const onPointer = (event: PointerEvent) => {
      // The notification panel remains beside the page until explicitly closed.
      if (openMenu === "profile" && event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpenMenu(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openMenu]);

  return <div ref={rootRef} className="flex items-center gap-2 sm:gap-3">
    {role === "ADMIN" ? <AdminNotificationsPanel
      open={openMenu === "notifications"}
      onToggle={() => setOpenMenu(value => value === "notifications" ? null : "notifications")}
      onClose={() => { setOpenMenu(null); notificationTriggerRef.current?.focus(); }}
      headerRef={headerRef}
      triggerRef={notificationTriggerRef}
    /> : null}
    <div className="relative">
      <button ref={profileTriggerRef} type="button" onClick={() => setOpenMenu(value => value === "profile" ? null : "profile")} aria-expanded={openMenu === "profile"} aria-label="Admin profile"
        className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D28D9]/30">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{initial}</span>
        <ChevronDown size={15} className="text-slate-500" aria-hidden="true" />
      </button>
      {openMenu === "profile" ? <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
        <div className="border-b border-slate-100 px-3 py-2"><p className="truncate text-sm font-semibold">{name}</p><p className="truncate text-xs text-slate-500">{adminEmail || role}</p><p className="mt-1 text-xs font-semibold text-indigo-700">{role}</p></div>
        {([{ href: "/admin/settings", label: "Admin settings", icon: Settings }, { href: "/admin/logs", label: "Audit Logs", icon: ShieldCheck }, { href: "/", label: "Switch to public site", icon: Building2 }, { href: "/api/auth/signout", label: "Logout", icon: LogOut }]).map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpenMenu(null)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Icon size={16} aria-hidden="true" />{label}</Link>)}
      </div> : null}
    </div>
  </div>;
}

export function AdminHorizontalShell({ children, adminEmail, adminName, adminRole, showPreviewTesters = false }: {
  children: React.ReactNode; adminEmail?: string | null; adminName?: string | null; adminRole: string; showPreviewTesters?: boolean;
}) {
  const role: AdminRole = adminRole === "SUPPORT" || adminRole === "USER" ? adminRole : "ADMIN";
  const groups = getAdminHeaderGroups(role, showPreviewTesters);
  const pathname = usePathname();
  const contentLanding = pathname === "/admin/content" || pathname === "/admin/content/";
  const workspaceRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Measure before paint to prevent the card hub from jumping when desktop navigation wraps.
  useLayoutEffect(() => {
    if (!contentLanding || !headerRef.current || !workspaceRef.current) return;
    const header = headerRef.current;
    const workspace = workspaceRef.current;
    const updateHeaderHeight = () => {
      workspace.style.setProperty("--admin-header-height", `${header.getBoundingClientRect().height}px`);
    };
    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);
    return () => {
      observer.disconnect();
      workspace.style.removeProperty("--admin-header-height");
    };
  }, [contentLanding]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Search and Support share the clean white operational workspace surface.
  // Other Admin sections keep their established background unchanged.
  const usersDirectory = pathname === "/admin/users" || pathname === "/admin/users/";
  const userActivity = /^\/admin\/users\/(?:user|guest)\/[a-z0-9_-]{6,80}\/activity\/?$/i.test(pathname);
  const searchDetail = /^\/admin\/searches\/[a-z0-9_-]{6,128}\/?$/i.test(pathname);
  const searchesWorkspace = pathname === "/admin/searches" || pathname === "/admin/searches/" || pathname === "/admin/searches/activity" || pathname === "/admin/searches/activity/" || searchDetail;
  const supportWorkspace = pathname === "/admin/support" || pathname.startsWith("/admin/support/");
  const providersWorkspace = pathname === "/admin/providers" || pathname === "/admin/providers/";
  const providerReportingWorkspace = pathname === "/admin/referral-attribution"
    || pathname === "/admin/referral-attribution/"
    || pathname === "/admin/redirects" || pathname === "/admin/redirects/"
    || /^\/admin\/redirects\/[^/]+\/?$/.test(pathname);
  // Account deletion request details share Support's white workspace; the queue keeps its existing surface.
  const accountDeletionParts = pathname.split("/").filter(Boolean);
  const accountDeletionDetail = accountDeletionParts.length === 3
    && accountDeletionParts[0] === "admin"
    && accountDeletionParts[1] === "account-deletions";
  // All Content lists, drafts and editors use the same white workspace as Support details.
  const contentWorkspace = pathname === "/admin/content" || pathname.startsWith("/admin/content/");
  const auditLogsWorkspace = pathname === "/admin/logs" || pathname === "/admin/logs/";
  const emailDeliveryWorkspace = pathname === "/admin/email-delivery" || pathname === "/admin/email-delivery/";
  const whiteWorkspace = pathname === "/admin/system" || pathname === "/admin/system/" || auditLogsWorkspace || emailDeliveryWorkspace || usersDirectory || searchesWorkspace || supportWorkspace
    || providersWorkspace || providerReportingWorkspace || accountDeletionDetail || contentWorkspace;
  return <AdminWorkspaceSearchProvider account={adminEmail || "admin"}><div ref={workspaceRef} className={"min-h-screen text-slate-950 " + (userActivity ? "bg-[#f1f5fb]" : whiteWorkspace ? "bg-white" : "bg-[#f1f5fb]")}>
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <AdminSearchHeader>
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
          <AdminSearchTrigger />
          <AdminHeaderMenus key={pathname} adminEmail={adminEmail} adminName={adminName} role={role} headerRef={headerRef} />
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 min-[1100px]:hidden" onClick={() => setMobileOpen((value) => !value)} aria-label={mobileOpen ? "Close admin navigation" : "Open admin navigation"} aria-expanded={mobileOpen}>{mobileOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </div>
      <div className="hidden border-t border-slate-100 min-[1100px]:block">
        <div className="mx-auto max-w-[1920px] px-4 pb-2 pt-2 sm:px-6 lg:px-10">
          <Navigation groups={groups} pathname={pathname} close={() => {}} />
        </div>
      </div>
      {mobileOpen ? <div className="max-h-[70vh] overflow-y-auto border-t border-slate-100 bg-white min-[1100px]:hidden"><Navigation groups={groups} pathname={pathname} mobile close={() => setMobileOpen(false)} /></div> : null}
      </AdminSearchHeader>
    </header>
    <main className="mx-auto w-full max-w-[1920px] px-4 py-5 sm:px-6 lg:px-10">
      <AdminSearchContent>{children}</AdminSearchContent>
    </main>

  </div></AdminWorkspaceSearchProvider>;
}
