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
  section: "operations" | "readiness" | "content" | "controls";
};

export const adminNavigation: AdminNavDefinition[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ["ADMIN", "SUPPORT"], section: "operations" },
  { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN", "SUPPORT"], section: "operations" },
  { href: "/admin/providers", label: "Providers", icon: Activity, roles: ["ADMIN"], section: "readiness" },
  { href: "/admin/searches", label: "Searches", icon: Search, roles: ["ADMIN", "SUPPORT"], section: "operations" },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList, roles: ["ADMIN", "SUPPORT"], section: "operations" },
  { href: "/admin/content", label: "Content", icon: FileText, roles: ["ADMIN"], section: "content" },
  { href: "/admin/flights", label: "Flights", icon: Plane, roles: ["ADMIN"], section: "readiness" },
  { href: "/admin/hotels", label: "Hotels", icon: Hotel, roles: ["ADMIN"], section: "readiness" },
  { href: "/admin/cars", label: "Cars", icon: Car, roles: ["ADMIN"], section: "readiness" },
  { href: "/admin/support", label: "Support", icon: Headphones, roles: ["ADMIN", "SUPPORT"], section: "operations" },
  { href: "/admin/logs", label: "Logs", icon: BookOpen, roles: ["ADMIN"], section: "controls" },
  { href: "/admin/system", label: "System", icon: LockKeyhole, roles: ["ADMIN"], section: "controls" },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["ADMIN"], section: "controls" },
];
