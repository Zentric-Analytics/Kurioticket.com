"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { ChevronDown, LogOut, Settings, Building2 } from "lucide-react";
import { getAdminHeaderGroups, getAdminNavForRole, getAdminWorkspaceSections, isAdminNavItemActive, isAdminWorkspaceSectionActive, type AdminRole } from "@/lib/adminNavigation";
import { KurioticketLogo } from "@/components/brand/KurioticketLogo";
import { AdminWorkspaceSearchProvider, AdminSearchTrigger, AdminSearchHeader, AdminSearchContent } from "./AdminWorkspaceSearch";

import { AdminNotificationsPanel } from "./AdminNotificationsPanel";

type HeaderGroup = ReturnType<typeof getAdminHeaderGroups>[number];
type HeaderEntry = HeaderGroup["links"][number];

function HeaderNavLink({ entry, pathname, close }: { entry: HeaderEntry; pathname: string; close: () => void }) {
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
      className={"relative inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-1.5 text-[13px] font-semibold leading-none tracking-[-0.005em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 " + style + underline}>
      <Icon size={13} aria-hidden="true" className="h-[13px] w-[13px] shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function Navigation({ groups, pathname, close }: { groups: HeaderGroup[]; pathname: string; close: () => void }) {
  return (
    <nav aria-label="Admin navigation" className="flex w-max min-w-full flex-nowrap items-center justify-start gap-2 whitespace-nowrap">
      {groups.flatMap(group => group.links).map(entry =>
        <HeaderNavLink key={entry.item.href} entry={entry} pathname={pathname} close={close} />
      )}
    </nav>
  );
}

function WorkspaceSectionNavigation({ pathname, role }: { pathname: string; role: AdminRole }) {
  // Providers already has its own Health / Attribution tabs. Do not render two bars.
  if (pathname === "/admin/providers" || pathname === "/admin/providers/") return null;
  const group = getAdminWorkspaceSections(pathname, role);
  if (!group || group.links.length < 2) return null;
  return (
    <nav aria-label={group.label + " sections"} className="mb-5 flex min-w-0 flex-wrap items-end gap-x-5 gap-y-1 border-b border-[#D8E1EC] sm:gap-x-6">
      {group.links.map((item) => {
        const active = isAdminWorkspaceSectionActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
            className={"inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-1 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8] " +
              (active ? "border-[#004BB8] text-[#004BB8]" : "border-transparent text-[#475569] hover:border-[#D8E1EC] hover:text-[#020617]")}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function WorkspaceSidebar({ pathname, role, showPreviewTesters }: { pathname: string; role: AdminRole; showPreviewTesters: boolean }) {
  const groups = getAdminHeaderGroups(role, showPreviewTesters);
  const navigation = getAdminNavForRole(role, showPreviewTesters);
  const searchParams = useSearchParams();
  const activeGroup = groups.flatMap(group => group.links).find(entry =>
    isAdminNavItemActive(entry.item.href, pathname)
    || entry.children.some(child => isAdminNavItemActive(child.href, pathname))
  );
  const sections = getAdminWorkspaceSections(pathname, role);
  const links = sections?.links.length
    ? sections.links
    : activeGroup
      ? [{ href: activeGroup.item.href, label: activeGroup.item.label }, ...activeGroup.children.map(child => ({ href: child.href, label: child.label }))]
      : [];
  const uniqueLinks = links.filter((link, index) => links.findIndex(other => other.href === link.href) === index);
  const title = sections?.label || activeGroup?.item.label || "Workspace";
  const providerAttribution = pathname === "/admin/providers" && searchParams.get("view") === "attribution";

  return (
    <aside aria-label={title + " navigation"} className="admin-sticky-sidebar min-w-0 border-b border-[#D8E1EC] pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
      <h2 className="px-2 text-[15px] font-semibold text-[#020617]">{title}</h2>
      <nav aria-label={title + " subsections"} className="mt-4 space-y-4">
        <div>
          <div className="mt-1 flex flex-col gap-0.5">
            {uniqueLinks.map(link => {
              const destination = link.href.split("?")[0];
              const Icon = navigation.find(item => item.href === destination)?.icon || activeGroup?.item.icon;
              const active = link.href === "/admin/providers?view=attribution"
                ? providerAttribution || pathname === "/admin/referral-attribution"
                : !(providerAttribution && link.href === "/admin/providers")
                  && isAdminWorkspaceSectionActive(pathname, link.href);
              return (
                <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
                  className={"flex min-h-10 min-w-0 items-center gap-2.5 rounded-r-md border-l-2 px-3 py-2 text-[13px] font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30 " +
                    (active ? "border-[#004BB8] bg-[#F2F7FF] text-[#004BB8]" : "border-transparent text-[#475569] hover:bg-[#F8FAFC] hover:text-[#020617]")}>
                  {Icon ? <Icon size={15} aria-hidden="true" className="shrink-0" /> : null}
                  <span className="min-w-0">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </aside>
  );
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
        {([{ href: "/admin/settings", label: "Admin settings", icon: Settings }, { href: "/", label: "Switch to public site", icon: Building2 }, { href: "/api/auth/signout", label: "Logout", icon: LogOut }]).map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpenMenu(null)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Icon size={16} aria-hidden="true" />{label}</Link>)}
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
  const isOverview = pathname === "/admin" || pathname === "/admin/";
  const isSettings = pathname === "/admin/settings" || pathname.startsWith("/admin/settings/") || pathname === "/admin/preview-testers";
  // Platform Health is a standalone top-level destination, not a System subsection.
  const isStandalonePlatformHealth = pathname === "/admin/platform-health" || pathname === "/admin/platform-health/";
  const overviewGroups = groups.map(group => ({ ...group, links: group.links.filter(entry => entry.item.href === "/admin") })).filter(group => group.links.length > 0);
  const contentLanding = pathname === "/admin/content" || pathname === "/admin/content/";
  const workspaceRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  // Keep the sticky navigation offset aligned with the real header height, including search and zoom.
  useLayoutEffect(() => {
    if (!headerRef.current || !workspaceRef.current) return;
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


  // Every non-Overview Admin workspace uses a white canvas. Keep the established
  // Overview surface unchanged; route-specific flags remain for contract QA.
  const usersDirectory = pathname === "/admin/users" || pathname === "/admin/users/";
  const visitorJourneysWorkspace = pathname === "/admin/journeys" || pathname.startsWith("/admin/journeys/");
  const userActivity = /^\/admin\/users\/(?:user|guest)\/[a-z0-9_-]{6,80}\/activity\/?$/i.test(pathname);
  const searchDetail = /^\/admin\/searches\/[a-z0-9_-]{6,128}\/?$/i.test(pathname);
  const searchesWorkspace = pathname === "/admin/searches" || pathname === "/admin/searches/" || pathname === "/admin/searches/activity" || pathname === "/admin/searches/activity/" || searchDetail;
  const supportWorkspace = pathname === "/admin/support" || pathname.startsWith("/admin/support/");
  const providersWorkspace = pathname === "/admin/providers" || pathname === "/admin/providers/";
  const providerReportingWorkspace = pathname === "/admin/referral-attribution"
    || pathname === "/admin/referral-attribution/"
    || pathname === "/admin/redirects" || pathname === "/admin/redirects/"
    || /^\/admin\/redirects\/[^/]+\/?$/.test(pathname);
  // Account deletion requests and their detail pages share the white Support workspace.
  const accountDeletionWorkspace = pathname === "/admin/account-deletions" || pathname === "/admin/account-deletions/";
  const accountDeletionParts = pathname.split("/").filter(Boolean);
  const accountDeletionDetail = accountDeletionParts.length === 3
    && accountDeletionParts[0] === "admin"
    && accountDeletionParts[1] === "account-deletions";
  // All Content lists, drafts and editors use the same white workspace as Support details.
  const contentWorkspace = pathname === "/admin/content" || pathname.startsWith("/admin/content/");
  const auditLogsWorkspace = pathname === "/admin/logs" || pathname === "/admin/logs/";
  const emailDeliveryWorkspace = pathname === "/admin/email-delivery" || pathname === "/admin/email-delivery/";
  const settingsWorkspace = pathname === "/admin/settings" || pathname.startsWith("/admin/settings/") || pathname === "/admin/preview-testers";
  const notificationsWorkspace = pathname === "/admin/notifications" || pathname === "/admin/notifications/";
  const homepageFaresWorkspace = pathname === "/admin/homepage-fares" || pathname.startsWith("/admin/homepage-fares/");
  // Hotel and Car Operations use the same full-white Providers workspace as Homepage Fares.
  const hotelCarsWorkspace = pathname === "/admin/hotels" || pathname === "/admin/hotels/" || pathname === "/admin/cars" || pathname === "/admin/cars/";
  const whiteWorkspace = userActivity || pathname === "/admin/platform-health" || pathname === "/admin/platform-health/" || pathname === "/admin/system" || pathname === "/admin/system/" || pathname === "/admin/system/cms-health" || pathname === "/admin/system/cms-health/" || auditLogsWorkspace || emailDeliveryWorkspace || settingsWorkspace || usersDirectory || visitorJourneysWorkspace || searchesWorkspace || supportWorkspace
    || providersWorkspace || providerReportingWorkspace || hotelCarsWorkspace || accountDeletionWorkspace || accountDeletionDetail || contentWorkspace || notificationsWorkspace || homepageFaresWorkspace || !isOverview;
  return <AdminWorkspaceSearchProvider account={adminEmail || "admin"}><div ref={workspaceRef} className={"min-h-screen text-slate-950 " + (whiteWorkspace ? "bg-white" : "bg-[#f1f5fb]")}>
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
        </div>
      </div>
      <div className="min-w-0 border-t border-slate-100">
        <div role="region" aria-label="Admin navigation links" tabIndex={0}
          className="mx-auto w-full max-w-[1920px] overflow-x-auto overscroll-x-contain px-2 pb-2 pt-2 sm:px-3 lg:px-5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#004BB8]">
          <Navigation groups={isOverview ? groups : overviewGroups} pathname={pathname} close={() => {}} />
        </div>
      </div>
      </AdminSearchHeader>
    </header>
    <main className={"mx-auto w-full max-w-[1920px] " + (isOverview ? "px-4 py-5 sm:px-6 lg:px-10" : "px-4 py-5 sm:px-5 lg:px-6")}>
      <AdminSearchContent>
        {!isOverview && !isSettings && !isStandalonePlatformHealth && role === "ADMIN" ? (
          <div className="grid min-w-0 grid-cols-1 gap-5 bg-white lg:grid-cols-[196px_minmax(0,1fr)] lg:gap-4">
            <WorkspaceSidebar pathname={pathname} role={role} showPreviewTesters={showPreviewTesters} />
            <div data-admin-page-content className="min-w-0">{children}</div>
          </div>
        ) : (
          <>{children}</>
        )}
      </AdminSearchContent>
    </main>

  </div></AdminWorkspaceSearchProvider>;
}
