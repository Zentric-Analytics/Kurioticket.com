import type React from "react";

import {
  Activity,
  BookOpen,
  ExternalLink,
  FileText,
  Headphones,
  LayoutDashboard,
  LockKeyhole,
  Search,
  Trash2,
  Users,
} from "lucide-react";

export type AdminRole = "ADMIN" | "SUPPORT" | "USER";
export type AdminHubKey = "overview" | "operations" | "monitoring" | "platform";

export type AdminNavDefinition = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles: AdminRole[];
  hub: AdminHubKey;
};

export type AdminHubDefinition = {
  key: AdminHubKey;
  href: string;
  label: string;
  description: string;
  destinationHrefs: string[];
};

export const adminNavigation: AdminNavDefinition[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "SUPPORT"], hub: "overview" },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN", "SUPPORT"], hub: "operations" },
  { href: "/admin/support", label: "Support", icon: Headphones, roles: ["ADMIN", "SUPPORT"], hub: "operations" },
  { href: "/admin/account-deletions", label: "Account Deletions", icon: Trash2, roles: ["ADMIN"], hub: "operations" },
  { href: "/admin/searches", label: "Searches", icon: Search, roles: ["ADMIN", "SUPPORT"], hub: "monitoring" },
  { href: "/admin/redirects", label: "Provider Handoffs", icon: ExternalLink, roles: ["ADMIN"], hub: "monitoring" },
  { href: "/admin/logs", label: "Admin Logs", icon: BookOpen, roles: ["ADMIN"], hub: "monitoring" },
  { href: "/admin/providers", label: "Providers", icon: Activity, roles: ["ADMIN"], hub: "platform" },
  { href: "/admin/content", label: "Content Inventory", icon: FileText, roles: ["ADMIN"], hub: "platform" },
  { href: "/admin/system", label: "System", icon: LockKeyhole, roles: ["ADMIN"], hub: "platform" },
];

export const adminHubs: AdminHubDefinition[] = [
  { key: "overview", href: "/admin", label: "Overview", description: "Review the admin overview.", destinationHrefs: ["/admin"] },
  { key: "operations", href: "/admin/operations", label: "Operations", description: "Manage customer and support operations.", destinationHrefs: ["/admin/users", "/admin/support", "/admin/account-deletions"] },
  { key: "monitoring", href: "/admin/monitoring", label: "Monitoring", description: "Review search activity, provider handoffs and admin audit trails.", destinationHrefs: ["/admin/searches", "/admin/redirects", "/admin/logs"] },
  { key: "platform", href: "/admin/platform", label: "Platform", description: "Manage provider readiness, content inventory and system controls.", destinationHrefs: ["/admin/providers", "/admin/content", "/admin/system"] },
];

const destinationDescriptions: Record<string, string> = {
  "/admin/users": "Manage customer accounts, roles and status.",
  "/admin/support": "Review tickets, reply to customers and update ticket status.",
  "/admin/account-deletions": "Review and process account deletion requests.",
  "/admin/searches": "Review recent search activity and request metadata.",
  "/admin/redirects": "Review outbound provider handoffs from Kurioticket.",
  "/admin/logs": "Review administrative and security-sensitive actions.",
  "/admin/providers": "Monitor provider configuration and health.",
  "/admin/content": "Review homepage fare and content inventory.",
  "/admin/system": "Manage system-level administrative controls.",
};

export function isAdminNavItemActive(itemHref: string, pathname: string) {
  if (itemHref === "/admin") return pathname === itemHref;
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

export function getAdminNavForRole(role: AdminRole) {
  return adminNavigation.filter((item) => item.roles.includes(role));
}

export function getAdminHubDestinations(hubKey: AdminHubKey, role: AdminRole) {
  const hub = adminHubs.find((candidate) => candidate.key === hubKey);
  if (!hub) return [];

  return hub.destinationHrefs
    .map((href) => adminNavigation.find((item) => item.href === href))
    .filter((item): item is AdminNavDefinition => item !== undefined && item.roles.includes(role))
    .map((item) => ({ ...item, description: destinationDescriptions[item.href] }));
}

export function getAdminHubsForRole(role: AdminRole) {
  return adminHubs.filter((hub) => hub.key === "overview" ? adminNavigation[0].roles.includes(role) : getAdminHubDestinations(hub.key, role).length > 0);
}

export function getActiveAdminHub(pathname: string): AdminHubKey | null {
  const hubRoute = adminHubs.find((hub) => hub.href !== "/admin" && isAdminNavItemActive(hub.href, pathname));
  if (hubRoute) return hubRoute.key;

  const destination = adminNavigation.find((item) => isAdminNavItemActive(item.href, pathname));
  return destination?.hub ?? null;
}
