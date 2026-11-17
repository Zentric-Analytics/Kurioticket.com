import {
  getAdminHeaderGroups,
  getAdminNavForRole,
  getAdminWorkspaceSections,
  isAdminNavItemActive,
  isAdminWorkspaceSectionActive,
  type AdminNavDefinition,
  type AdminRole,
} from "@/lib/adminNavigation";

export type AdminSidebarLink = { href: string; label: string; active: boolean };
export type AdminSidebarEntry = {
  item: AdminNavDefinition;
  active: boolean;
  sections: AdminSidebarLink[];
};
export type AdminSidebarGroup = { label: string; entries: AdminSidebarEntry[] };
export type AdminSidebarModel = {
  currentLabel: string;
  groups: AdminSidebarGroup[];
};

export function isAdminOverviewPath(pathname: string): boolean {
  return pathname === "/admin" || pathname === "/admin/";
}

export function isAdminSettingsPath(pathname: string): boolean {
  return pathname === "/admin/settings" || pathname.startsWith("/admin/settings/");
}

function childrenForSection(
  parent: AdminNavDefinition,
  pathname: string,
  role: AdminRole,
  showPreviewTesters: boolean,
): Array<{ href: string; label: string }> {
  if (parent.href === "/admin/confirmed-trips") {
    return [
      { href: "/admin/confirmed-trips", label: "Confirmed Trips" },
      { href: "/admin/confirmed-trips/monitoring", label: "Trip Monitoring" },
    ];
  }
  if (parent.href === "/admin/content") {
    return [
      { href: "/admin/content", label: "Content Overview" },
      { href: "/admin/content/homepage", label: "Homepage Content" },
      { href: "/admin/content/faqs", label: "FAQs" },
      { href: "/admin/content/health", label: "Content Health" },
    ];
  }
  if (parent.href === "/admin/settings") {
    const permitted = new Set(getAdminNavForRole(role, showPreviewTesters).map(item => item.href));
    return [
      { href: "/admin/settings", label: "Product availability" },
      { href: "/admin/settings/travel-automation", label: "Travel automation" },
      { href: "/admin/settings/notifications", label: "Notifications" },
      ...(permitted.has("/admin/preview-testers")
        ? [{ href: "/admin/preview-testers", label: "Team Access" }]
        : []),
      { href: "/admin/settings/recent-changes", label: "Recent changes" },
    ];
  }
  // Reuse the existing route/role-filtered subsection definitions. In
  // particular, never accidentally expose a child page under another role.
  const existing = getAdminWorkspaceSections(pathname, role);
  if (existing?.label !== parent.label) return [];
  return existing.links.map(link => ({
    href: link.href === "/admin/providers?view=attribution"
      ? "/admin/referral-attribution" : link.href,
    label: link.label,
  }));
}

function isSubsectionPath(pathname: string, href: string): boolean {
  return isAdminWorkspaceSectionActive(pathname, href);
}

/** Navigation-only view model: no data fetching and no authorization changes.
 * Overview uses the complete top navbar. Other named departments use one
 * Settings-like left nav with the selected department expanded. */
export function getAdminDepartmentSidebar(
  pathname: string,
  role: AdminRole,
  showPreviewTesters = false,
): AdminSidebarModel | null {
  if (isAdminOverviewPath(pathname)) return null;
  const headerGroups = getAdminHeaderGroups(role, showPreviewTesters);
  const allEntries = headerGroups.flatMap(group =>
    group.links.filter(entry => entry.item.href !== "/admin"));
  const current = allEntries.find(entry =>
    isAdminNavItemActive(entry.item.href, pathname)
    || entry.children.some(child => isAdminNavItemActive(child.href, pathname)));
  if (!current) return null;

  return {
    currentLabel: current.item.label,
    groups: headerGroups.map(group => ({
      label: group.label,
      entries: group.links
        .filter(entry => entry.item.href !== "/admin")
        .map(entry => {
          const active = entry.item.href === current.item.href;
          const links = active
            ? childrenForSection(entry.item, pathname, role, showPreviewTesters) : [];
          const selected = links
            .filter(link => isSubsectionPath(pathname, link.href))
            .sort((a, b) => b.href.length - a.href.length)[0]?.href;
          return {
            item: entry.item,
            active,
            sections: links.map(link => ({
              ...link,
              active: link.href === selected,
            })),
          };
        }),
    })).filter(group => group.entries.length > 0),
  };
}
