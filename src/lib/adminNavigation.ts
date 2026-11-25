import type React from "react";
import { activityJourneyReturnHref } from "./adminActivityJourneyNavigation";

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
  Mail,
  Search,
  Settings,
  MonitorSmartphone,
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
  { label: "Operations", hrefs: ["/admin", "/admin/users", "/admin/searches/activity", "/admin/confirmed-trips", "/admin/support"] },
  { label: "Provider readiness", hrefs: ["/admin/providers", "/admin/provider-management"] },
  { label: "Website content", hrefs: ["/admin/content"] },
  { label: "System & security", hrefs: ["/admin/system", "/admin/platform-health", "/admin/settings"] },
] as const;

export const adminNavigation: AdminNavDefinition[] = [
  {href:"/admin/provider-management",label:"Provider Management",icon:Activity,roles:["ADMIN"],section:"readiness",description:"Control display-only sandbox inventory across the production platform."},
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN"], section: "operations", description: "Operations dashboard and platform health." },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN"], section: "operations", description: "Manage customer accounts, roles and status." },
  { href: "/admin/users/online", parentHref: "/admin/users", label: "Online Users", icon: Activity, roles: ["ADMIN"], section: "operations", description: "Review verified current account and guest presence across platforms." },
  { href: "/admin/users/devices", parentHref: "/admin/users", label: "Device & Access", icon: MonitorSmartphone, roles: ["ADMIN"], section: "operations", description: "Find registered users and their recorded device sessions." },
  { href: "/admin/users/pages", parentHref: "/admin/users", label: "Pages Visited", icon: FileText, roles: ["ADMIN"], section: "operations", description: "Find registered users and consented guests with recorded page visits." },
  { href: "/admin/providers", label: "Providers", icon: Activity, roles: ["ADMIN"], section: "readiness", description: "Monitor provider configuration and health." },
  { href: "/admin/searches/activity", label: "Search Activity", icon: Search, roles: ["ADMIN"], section: "operations", description: "Review platform-wide search records, outcomes, and diagnostics." },
  { href: "/admin/confirmed-trips", label: "Trips", icon: ClipboardList, roles: ["ADMIN"], section: "operations", description: "Monitor provider-confirmed trips and their flight-status readiness." },
  { href: "/admin/confirmed-trips/monitoring", parentHref: "/admin/confirmed-trips", label: "Trip monitoring", icon: Activity, roles: ["ADMIN"], section: "operations", description: "Monitor trusted trip confirmations, provider deliveries and flight-status snapshots." },
  { href: "/admin/content", label: "Content", icon: FileText, roles: ["ADMIN"], section: "content", description: "Review admin-managed site content." },
  { href: "/admin/content/homepage/destinations", parentHref: "/admin/content", label: "Homepage destinations", icon: FileText, roles: ["ADMIN"], section: "content", description: "Manage published homepage destination content." },
  { href: "/admin/content/homepage/flight-routes", parentHref: "/admin/content", label: "Flight routes", icon: FileText, roles: ["ADMIN"], section: "content", description: "Manage published homepage flight routes." },
  { href: "/admin/content/homepage/hotel-destinations", parentHref: "/admin/content", label: "Hotel destinations", icon: Hotel, roles: ["ADMIN"], section: "content", description: "Manage homepage hotel destinations." },
  { href: "/admin/content/faqs", parentHref: "/admin/content", label: "FAQs", icon: BookOpen, roles: ["ADMIN"], section: "content", description: "Manage published frequently asked questions." },
  { href: "/admin/homepage-fares", parentHref: "/admin/providers", label: "Homepage Fares", icon: Activity, roles: ["ADMIN"], section: "readiness", description: "Monitor and refresh provider-backed homepage fare readiness." },
  { href: "/admin/hotels", parentHref: "/admin/providers", label: "Hotels", icon: Hotel, roles: ["ADMIN"], section: "readiness", description: "Review hotel administration readiness." },
  { href: "/admin/cars", parentHref: "/admin/providers", label: "Cars", icon: Car, roles: ["ADMIN"], section: "readiness", description: "Review car administration readiness." },
  { href: "/admin/support", label: "Support", icon: Headphones, roles: ["ADMIN"], section: "operations", description: "Review tickets and respond to customers." },
  { href: "/admin/account-deletions", parentHref: "/admin/support", label: "Deletion Requests", icon: ClipboardList, roles: ["ADMIN"], section: "operations", description: "Review account deletion request lifecycles." },
  { href: "/admin/logs", parentHref: "/admin/system", label: "Audit Logs", icon: BookOpen, roles: ["ADMIN"], section: "controls", description: "Review administrative and security-sensitive actions." },
  { href: "/admin/system", label: "System", icon: LockKeyhole, roles: ["ADMIN"], section: "controls", description: "Review safe runtime health and deployment configuration status." },
  { href: "/admin/platform-health", label: "Platforms", icon: MonitorSmartphone, roles: ["ADMIN"], section: "controls", description: "Platform Health, online presence, mobile app distribution and operational diagnostics." },
  { href: "/admin/system/cms-health", parentHref: "/admin/system", label: "CMS Health", icon: FileText, roles: ["ADMIN"], section: "controls", description: "Monitor content integrity, fallback policy and publishing health." },
  { href: "/admin/email-delivery", parentHref: "/admin/system", label: "Email Delivery", icon: Mail, roles: ["ADMIN"], section: "controls", description: "Monitor transactional email delivery health and test sending readiness." },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["ADMIN"], section: "controls", description: "Manage authoritative persisted platform controls." },
  { href: "/admin/platforms/devices", parentHref: "/admin/platform-health", label: "Platform Metrics", icon: MonitorSmartphone, roles: ["ADMIN"], section: "controls", description: "Platform checks, live online presence, mobile app reporting and aggregate account sessions." },
  { href: "/admin/redirects", parentHref: "/admin/searches/activity", label: "Provider Handoffs", icon: ClipboardList, roles: ["ADMIN"], section: "operations", description: "Investigate verified outbound provider handoffs." },
  { href: "/admin/referral-attribution", parentHref: "/admin/providers", label: "Referral Attribution", icon: Activity, roles: ["ADMIN"], section: "readiness", description: "Review provider referral-attribution reporting." },
];

export function isAdminNavItemActive(itemHref: string, pathname: string) {
  if (itemHref === "/admin") return pathname === itemHref;
  // The Search Activity workspace owns legacy search-detail routes as well as
  // its primary activity page. Never highlight it for unrelated Admin pages.
  if (itemHref === "/admin/searches/activity" && (pathname === "/admin/searches" || /^\/admin\/searches\/(?!activity(?:\/|$))[^/]+\/?$/.test(pathname))) return true;
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

const previewTesterNavigation: AdminNavDefinition = { href: "/admin/preview-testers", parentHref: "/admin/settings", label: "Team Access", icon: UserCheck, roles: ["ADMIN"], section: "controls", description: "Manage Preview team roles, access and developer build notifications." };

export function getAdminNavForRole(role: AdminRole, includePreviewTesters = false) {
  return [...adminNavigation, ...(includePreviewTesters ? [previewTesterNavigation] : [])].filter((item) => item.roles.includes(role));
}

export type AdminHeaderGroup = {
  label: string;
  links: Array<{ item: AdminNavDefinition; children: AdminNavDefinition[] }>;
};

/**
 * Keep the header focused on parent workspaces. Child routes remain available
 * for search, deep links and source actions without competing for navbar space.
 */
export function getAdminHeaderGroups(role: AdminRole, includePreviewTesters = false): AdminHeaderGroup[] {
  const visible = getAdminNavForRole(role, includePreviewTesters);
  const byHref = new Map(visible.map((item) => [item.href, item]));

  return adminNavigationGroups.map((group) => {
    const links = group.hrefs.flatMap((href) => {
      const item = byHref.get(href);
      if (!item) return [];
      const children = visible.filter((candidate) => candidate.parentHref === href);
      return [{ item, children }];
    });
    return { label: group.label, links };
  }).filter((group) => group.links.length > 0);
}

/**
 * Each secondary destination has one parent workspace. These are page-level
 * navigation groups; none of these links are repeated in the global header.
 * Keep legacy URLs working through explicit redirects for bookmarks and deep links.
 */
const workspaceSections: ReadonlyArray<{
  label: string;
  paths: readonly string[];
  links: ReadonlyArray<{ href: string; label: string }>;
}> = [
  {
    label: "Users",
    paths: ["/admin/users", "/admin/journeys"],
    links: [
      { href: "/admin/users", label: "Users Directory" },
      { href: "/admin/users/online", label: "Online Users" },
      { href: "/admin/users/devices", label: "Device & Access" },
      { href: "/admin/users/pages", label: "Pages Visited" },
    ],
  },
  {
    label: "Platforms",
    paths: ["/admin/platform-health", "/admin/platforms"],
    links: [
      { href: "/admin/platform-health", label: "Platform Health" },
      { href: "/admin/platforms/devices", label: "Platform Metrics" },
    ],
  },
  {
    label: "Search Activity",
    paths: ["/admin/searches", "/admin/redirects"],
    links: [
      { href: "/admin/searches/activity", label: "Search Records" },
      { href: "/admin/redirects", label: "Provider Handoffs" },
    ],
  },
  {
    label: "Trips",
    paths: ["/admin/confirmed-trips"],
    links: [
      { href: "/admin/confirmed-trips", label: "Trips Directory" },
      { href: "/admin/confirmed-trips/monitoring", label: "Trip Monitoring" },
    ],
  },
  {
    label: "Support",
    paths: ["/admin/support", "/admin/account-deletions"],
    links: [
      { href: "/admin/support", label: "Support Tickets" },
      { href: "/admin/account-deletions", label: "Deletion Requests" },
    ],
  },
  {
    label: "Provider Management",
    paths:["/admin/provider-management"],
    links:[{href:"/admin/provider-management",label:"Provider Management"}],
  },
  {
    label: "Providers",
    paths: ["/admin/providers", "/admin/hotels", "/admin/cars", "/admin/homepage-fares", "/admin/referral-attribution"],
    links: [
      { href: "/admin/providers", label: "Provider Health" },
      { href: "/admin/hotels", label: "Hotels" },
      { href: "/admin/cars", label: "Cars" },
      { href: "/admin/homepage-fares", label: "Homepage Fares" },
      { href: "/admin/providers?view=attribution", label: "Referral Attribution" },
    ],
  },
  {
    label: "Content",
    paths: ["/admin/content"],
    links: [
      { href: "/admin/content", label: "Content Overview" },
      { href: "/admin/content/homepage/destinations", label: "Homepage Destinations" },
      { href: "/admin/content/homepage/flight-routes", label: "Flight Routes" },
      { href: "/admin/content/homepage/hotel-destinations", label: "Hotel Destinations" },
      { href: "/admin/content/faqs", label: "FAQs" },
    ],
  },
  {
    label: "System",
    paths: ["/admin/system", "/admin/logs", "/admin/email-delivery"],
    links: [
      { href: "/admin/system", label: "System Overview" },
      { href: "/admin/logs", label: "Audit Logs" },
      { href: "/admin/system/cms-health", label: "CMS Health" },
      { href: "/admin/email-delivery", label: "Email Delivery" },
    ],
  },
] as const;

/**
 * Highlight exactly one section at a time, including legacy search detail URLs.
 * Providers renders its query-driven Attribution tab locally on the landing page.
 */
export function isAdminWorkspaceSectionActive(pathname: string, href: string, activityReturn?: string | null): boolean {
  const destination = href.split("?")[0];
  if (href.includes("?")) return pathname === "/admin/referral-attribution";
  if (destination === "/admin/searches/activity"
    && /^\/admin\/searches\/(?!activity(?:\/|$))[^/]+\/?$/.test(pathname)) return true;
  // The same history route is reachable from both global directories and Activity.
  // A validated same-identity Activity return keeps the Users Directory selected.
  const history = /^\/admin\/users\/(?:user|guest)\/[^/]+\/(devices|pages)\/?$/.exec(pathname);
  if (history && ["/admin/users", "/admin/users/devices", "/admin/users/pages"].includes(destination)) {
    const activityPath = pathname.replace(/\/(devices|pages)\/?$/, "/activity");
    const returnPath = activityJourneyReturnHref(activityReturn)?.split("?")[0];
    return destination === (returnPath === activityPath ? "/admin/users" : "/admin/users/" + history[1]);
  }
  // Only platform-wide monitoring belongs to the separate Platforms workspace.
  if (destination === "/admin/users") return (pathname === destination
    || pathname === "/admin/journeys" || pathname.startsWith("/admin/journeys/")
    || /^\/admin\/users\/(?:user|guest)\/[^/]+(?:\/.*)?$/.test(pathname));
  if (destination === "/admin/providers" || destination === "/admin/content"
    || destination === "/admin/system") return pathname === destination;
  if (destination === "/admin/confirmed-trips") {
    return pathname === destination || pathname.startsWith("/admin/confirmed-trips/records");
  }
  return pathname === destination || pathname.startsWith(destination + "/");
}

export type AdminWorkspaceSections = {
  label: string;
  links: Array<{ href: string; label: string }>;
};

export function getAdminWorkspaceSections(pathname: string, role: AdminRole): AdminWorkspaceSections | null {
  if (role !== "ADMIN") return null;
  const group = workspaceSections.find((candidate) =>
    candidate.paths.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"))
  );
  if (!group) return null;
  const permitted = new Set(getAdminNavForRole(role).map((item) => item.href));
  return {
    label: group.label,
    links: group.links.filter((link) => permitted.has(link.href.split("?")[0])),
  };
}
