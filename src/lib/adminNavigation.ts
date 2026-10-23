import type React from "react";

import {
  Activity,
  BookOpen,
  Car,
  ClipboardList,
  FileText,
  Headphones,
  Hotel,
  LayoutDashboard,
  LockKeyhole,
  MousePointerClick,
  Plane,
  Search,
  Settings,
  Users,
  UserCheck,
} from "lucide-react";

export type AdminRole = "ADMIN" | "SUPPORT" | "USER";

export type AdminNavDefinition = {
  href: string;
  /** Optional parent destination used to render secondary navigation. */
  parentHref?: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles: AdminRole[];
  section: "operations" | "readiness" | "content" | "controls";
  description: string;
};

export const adminNavigationGroups = [
  { label: "Operations", hrefs: ["/admin", "/admin/users", "/admin/searches", "/admin/journeys", "/admin/redirects", "/admin/referral-attribution", "/admin/confirmed-trips", "/admin/support", "/admin/account-deletions"] },
  { label: "Provider readiness", hrefs: ["/admin/providers", "/admin/flights", "/admin/hotels", "/admin/cars"] },
  { label: "Website content", hrefs: ["/admin/content"] },
  { label: "System & security", hrefs: ["/admin/logs", "/admin/system", "/admin/settings"] },
] as const;

export const adminNavigation: AdminNavDefinition[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN"], section: "operations", description: "Operations dashboard and platform health." },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN"], section: "operations", description: "Manage customer accounts, roles and status." },
  { href: "/admin/providers", label: "Providers", icon: Activity, roles: ["ADMIN"], section: "readiness", description: "Monitor provider configuration and health." },
  { href: "/admin/searches", label: "Searches", icon: Search, roles: ["ADMIN"], section: "operations", description: "Review safe operational search activity and request metadata." },
  { href: "/admin/journeys", parentHref: "/admin/searches", label: "Journeys", icon: Activity, roles: ["ADMIN"], section: "operations", description: "Trace consented search-to-handoff journey events." },
  { href: "/admin/redirects", parentHref: "/admin/searches", label: "Provider Handoffs", icon: MousePointerClick, roles: ["ADMIN"], section: "operations", description: "Review recorded outbound provider handoffs." },
  { href: "/admin/referral-attribution", parentHref: "/admin/searches", label: "Referral Attribution", icon: Activity, roles: ["ADMIN"], section: "operations", description: "Summarize verified provider referrals without inferring bookings." },
  { href: "/admin/confirmed-trips", label: "Confirmed Trips", icon: ClipboardList, roles: ["ADMIN"], section: "operations", description: "Monitor provider-confirmed My Trips from signed partner callbacks." },
  { href: "/admin/content", label: "Content", icon: FileText, roles: ["ADMIN"], section: "content", description: "Review admin-managed site content." },
  { href: "/admin/flights", label: "Flights", icon: Plane, roles: ["ADMIN"], section: "readiness", description: "Review flight administration readiness." },
  { href: "/admin/hotels", label: "Hotels", icon: Hotel, roles: ["ADMIN"], section: "readiness", description: "Review hotel administration readiness." },
  { href: "/admin/cars", label: "Cars", icon: Car, roles: ["ADMIN"], section: "readiness", description: "Review car administration readiness." },
  { href: "/admin/support", label: "Support", icon: Headphones, roles: ["ADMIN"], section: "operations", description: "Review tickets and respond to customers." },
  { href: "/admin/account-deletions", parentHref: "/admin/support", label: "Deletion Requests", icon: ClipboardList, roles: ["ADMIN"], section: "operations", description: "Review account deletion request lifecycles." },
  { href: "/admin/logs", label: "Logs", icon: BookOpen, roles: ["ADMIN"], section: "controls", description: "Review administrative and security-sensitive actions." },
  { href: "/admin/system", label: "System", icon: LockKeyhole, roles: ["ADMIN"], section: "controls", description: "Manage system-level administrative controls." },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["ADMIN"], section: "controls", description: "Review administrative settings." },
];

export function isAdminNavItemActive(itemHref: string, pathname: string) {
  if (itemHref === "/admin") return pathname === itemHref;
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

const previewTesterNavigation: AdminNavDefinition = { href: "/admin/preview-testers", label: "Team Access", icon: UserCheck, roles: ["ADMIN"], section: "controls", description: "Manage Preview team roles, access and developer build notifications." };

export function getAdminNavForRole(role: AdminRole, includePreviewTesters = false) {
  return [...adminNavigation, ...(includePreviewTesters ? [previewTesterNavigation] : [])].filter((item) => item.roles.includes(role));
}

export type AdminHeaderGroup = {
  label: string;
  links: Array<{ item: AdminNavDefinition; children: AdminNavDefinition[] }>;
};

/**
 * Keep the compact header in sync with the existing sidebar hierarchy and
 * role-aware navigation. Secondary pages remain children of their parents.
 */
export function getAdminHeaderGroups(role: AdminRole, includePreviewTesters = false): AdminHeaderGroup[] {
  const visible = getAdminNavForRole(role, includePreviewTesters);
  const byHref = new Map(visible.map((item) => [item.href, item]));
  const groupedHrefs = new Set<string>(adminNavigationGroups.flatMap((group) => group.hrefs));
  const extraTopLevel = visible.filter((item) => !groupedHrefs.has(item.href) && !item.parentHref);

  return adminNavigationGroups.map((group, index) => {
    const hrefs: string[] = [...group.hrefs];
    if (index === adminNavigationGroups.length - 1) {
      hrefs.push(...extraTopLevel.map((item) => item.href));
    }
    const links = hrefs.flatMap((href) => {
      const item = byHref.get(href);
      if (!item || item.parentHref) return [];
      return [{ item, children: visible.filter((child) => child.parentHref === item.href) }];
    });
    return { label: group.label, links };
  }).filter((group) => group.links.length > 0);
}
