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

export type AdminNavDefinition = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles: AdminRole[];
  section: "operations" | "readiness" | "observability" | "content" | "controls";
};

export const adminNavigation: AdminNavDefinition[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "SUPPORT"], section: "operations" },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN", "SUPPORT"], section: "operations" },
  { href: "/admin/support", label: "Support", icon: Headphones, roles: ["ADMIN", "SUPPORT"], section: "operations" },
  { href: "/admin/account-deletions", label: "Account Deletions", icon: Trash2, roles: ["ADMIN"], section: "operations" },
  { href: "/admin/providers", label: "Providers", icon: Activity, roles: ["ADMIN"], section: "readiness" },
  { href: "/admin/searches", label: "Searches", icon: Search, roles: ["ADMIN", "SUPPORT"], section: "observability" },
  { href: "/admin/redirects", label: "Provider Handoffs", icon: ExternalLink, roles: ["ADMIN"], section: "observability" },
  { href: "/admin/logs", label: "Admin Logs", icon: BookOpen, roles: ["ADMIN"], section: "observability" },
  { href: "/admin/content", label: "Content Inventory", icon: FileText, roles: ["ADMIN"], section: "content" },
  { href: "/admin/system", label: "System", icon: LockKeyhole, roles: ["ADMIN"], section: "controls" },
];

export function isAdminNavItemActive(itemHref: string, pathname: string) {
  if (itemHref === "/admin") return pathname === itemHref;
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}
