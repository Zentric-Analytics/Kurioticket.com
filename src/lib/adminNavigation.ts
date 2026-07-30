import type React from "react";

import {
  Activity,
  BookOpen,
  BookOpenCheck,
  Car,
  FileText,
  Headphones,
  Hotel,
  LayoutDashboard,
  LockKeyhole,
  Plane,
  Search,
  Settings,
  Users,
} from "lucide-react";

export type AdminRole = "ADMIN" | "SUPPORT" | "USER";

export type AdminNavDefinition = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles: AdminRole[];
  description: string;
};

export const adminNavigationGroups = [
  { label: "Operations", hrefs: ["/admin", "/admin/users", "/admin/searches", "/admin/bookings", "/admin/support"] },
  { label: "Provider readiness", hrefs: ["/admin/providers", "/admin/flights", "/admin/hotels", "/admin/cars"] },
  { label: "Website content", hrefs: ["/admin/content"] },
  { label: "System & security", hrefs: ["/admin/logs", "/admin/system", "/admin/settings"] },
] as const;

export const adminNavigation: AdminNavDefinition[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "SUPPORT"], description: "Operations dashboard and platform health." },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN", "SUPPORT"], description: "Manage customer accounts, roles and status." },
  { href: "/admin/providers", label: "Providers", icon: Activity, roles: ["ADMIN"], description: "Monitor provider configuration and health." },
  { href: "/admin/searches", label: "Searches", icon: Search, roles: ["ADMIN", "SUPPORT"], description: "Review recent search activity and request metadata." },
  { href: "/admin/bookings", label: "Bookings", icon: BookOpenCheck, roles: ["ADMIN", "SUPPORT"], description: "Review booking readiness and operations." },
  { href: "/admin/content", label: "Content", icon: FileText, roles: ["ADMIN"], description: "Review admin-managed site content." },
  { href: "/admin/flights", label: "Flights", icon: Plane, roles: ["ADMIN"], description: "Review flight administration readiness." },
  { href: "/admin/hotels", label: "Hotels", icon: Hotel, roles: ["ADMIN"], description: "Review hotel administration readiness." },
  { href: "/admin/cars", label: "Cars", icon: Car, roles: ["ADMIN"], description: "Review car administration readiness." },
  { href: "/admin/support", label: "Support", icon: Headphones, roles: ["ADMIN", "SUPPORT"], description: "Review tickets and respond to customers." },
  { href: "/admin/logs", label: "Logs", icon: BookOpen, roles: ["ADMIN"], description: "Review administrative and security-sensitive actions." },
  { href: "/admin/system", label: "System", icon: LockKeyhole, roles: ["ADMIN"], description: "Manage system-level administrative controls." },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["ADMIN"], description: "Review administrative settings." },
];

export function isAdminNavItemActive(itemHref: string, pathname: string) {
  if (itemHref === "/admin") return pathname === itemHref;
  return pathname === itemHref || pathname.startsWith(`${itemHref}/`);
}

export function getAdminNavForRole(role: AdminRole) {
  return adminNavigation.filter((item) => item.roles.includes(role));
}
