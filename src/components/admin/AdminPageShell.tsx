"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  Car,
  ChevronDown,
  ClipboardList,
  FileText,
  Headphones,
  Hotel,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Plane,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/Card";

type AdminRole = "ADMIN" | "SUPPORT" | "USER";
type StatusTone = "good" | "bad" | "warn" | "neutral" | "info";

type AdminNavDefinition = {
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

const sectionLabels = {
  operations: "Operations",
  readiness: "Provider readiness",
  content: "Website content",
  controls: "System & security",
};

export function AdminShell({
  children,
  adminEmail,
  adminName,
  adminRole,
}: {
  children: React.ReactNode;
  adminEmail?: string | null;
  adminName?: string | null;
  adminRole: string;
}) {
  const safeRole: AdminRole = adminRole === "SUPPORT" || adminRole === "USER" ? adminRole : "ADMIN";
  const navItems = adminNavigation.filter((item) => item.roles.includes(safeRole));

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto grid min-h-screen w-full max-w-[1600px] lg:grid-cols-[280px_1fr]">
        <AdminSidebar items={navItems} />
        <div className="min-w-0 border-l border-slate-200 bg-slate-100">
          <AdminTopbar adminEmail={adminEmail} adminName={adminName} adminRole={safeRole} />
          <main className="px-4 py-5 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

export function AdminSidebar({ items }: { items: AdminNavDefinition[] }) {
  const grouped = items.reduce<Record<AdminNavDefinition["section"], AdminNavDefinition[]>>(
    (acc, item) => {
      acc[item.section].push(item);
      return acc;
    },
    { operations: [], readiness: [], content: [], controls: [] },
  );

  return (
    <aside className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:h-screen lg:border-b-0 lg:bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4 lg:h-20 lg:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 text-sm font-black text-white">KT</div>
        <div>
          <p className="text-sm font-black text-slate-950">Kurioticket</p>
          <p className="text-xs font-semibold text-slate-500">Internal operations</p>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 py-3 lg:block lg:h-[calc(100vh-5rem)] lg:space-y-6 lg:overflow-y-auto lg:px-4 lg:py-5" aria-label="Admin navigation">
        {(Object.keys(grouped) as Array<AdminNavDefinition["section"]>).map((section) =>
          grouped[section].length > 0 ? (
            <div key={section} className="min-w-max lg:min-w-0">
              <p className="mb-2 hidden px-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 lg:block">
                {sectionLabels[section]}
              </p>
              <div className="flex gap-2 lg:grid lg:gap-1">
                {grouped[section].map((item) => (
                  <AdminNavItem key={item.href} item={item} />
                ))}
              </div>
            </div>
          ) : null,
        )}
      </nav>
    </aside>
  );
}

export function AdminNavItem({ item }: { item: AdminNavDefinition }) {
  const pathname = usePathname();
  const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition lg:w-full ${
        active
          ? "bg-indigo-50 text-indigo-800 ring-1 ring-indigo-100"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={active ? "text-indigo-700" : "text-slate-400"} size={17} />
      <span>{item.label}</span>
    </Link>
  );
}

export function AdminTopbar({
  adminEmail,
  adminName,
  adminRole,
}: {
  adminEmail?: string | null;
  adminName?: string | null;
  adminRole: AdminRole;
}) {
  const displayName = adminName || adminEmail || "Admin";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black text-slate-950">Kurioticket Admin</p>
            <p className="text-xs font-semibold text-slate-500">Secure internal workspace</p>
          </div>
          <AdminProfileMenu className="xl:hidden" adminEmail={adminEmail} displayName={displayName} />
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center xl:min-w-[760px] xl:justify-end">
          <label className="relative block md:flex-1 xl:max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="search"
              placeholder="Search users, searches, providers..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </label>
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-400"
            aria-label="Notifications unavailable"
            title="Notifications are not live yet"
          >
            <Bell size={16} />
            <span className="hidden sm:inline">No notifications</span>
          </button>
          <div className="hidden items-center gap-2 xl:flex">
            <AdminStatusBadge tone="info">{adminRole}</AdminStatusBadge>
            <AdminProfileMenu adminEmail={adminEmail} displayName={displayName} />
          </div>
        </div>
      </div>
    </header>
  );
}

function AdminProfileMenu({
  adminEmail,
  className = "",
  displayName,
}: {
  adminEmail?: string | null;
  className?: string;
  displayName: string;
}) {
  return (
    <details className={`relative ${className}`}>
      <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm marker:hidden">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-800">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-40 truncate sm:inline">{displayName}</span>
        <ChevronDown size={14} className="text-slate-400" />
      </summary>
      <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
        <div className="border-b border-slate-100 px-4 pb-3 pt-2">
          <p className="text-sm font-black text-slate-900">Admin profile</p>
          <p className="truncate text-xs font-medium text-slate-500">{adminEmail || "No email available"}</p>
        </div>
        <ProfileLink href="/admin/settings" label="Admin settings" icon={Settings} />
        <ProfileLink href="/admin/logs" label="Audit logs" icon={ShieldCheck} />
        <ProfileLink href="/" label="Switch to public site" icon={Building2} />
        <ProfileLink href="/api/auth/signout" label="Logout" icon={LogOut} />
      </div>
    </details>
  );
}

function ProfileLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-800">
      <Icon size={16} className="text-slate-400" />
      {label}
    </Link>
  );
}

export function AdminPageShell({
  title,
  eyebrow = "Admin operations",
  description,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-700">{eyebrow}</p> : null}
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function AdminMetricCard({ label, value, hint, tone = "neutral" }: { label: string; value: string | number; hint?: string; tone?: StatusTone }) {
  return (
    <AdminSectionCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${dotClass(tone)}`} />
      </div>
      <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
      {hint ? <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p> : null}
    </AdminSectionCard>
  );
}

export function AdminStatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: StatusTone }) {
  const classes = {
    good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bad: "bg-rose-50 text-rose-700 ring-rose-200",
    warn: "bg-amber-50 text-amber-700 ring-amber-200",
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
    info: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  }[tone];

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-black ring-1 ${classes}`}>{children}</span>;
}

export function AdminSectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <Card className={`border-slate-200 bg-white shadow-sm ${className}`}>{children}</Card>;
}

export function AdminEmptyState({ title = "No data available", message, action }: { title?: string; message: string; action?: React.ReactNode }) {
  return (
    <AdminSectionCard className="p-6">
      <div className="max-w-2xl">
        <p className="text-base font-black text-slate-950">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </AdminSectionCard>
  );
}

export function AdminDataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<{ id: string; cells: React.ReactNode[] }>;
}) {
  return (
    <AdminSectionCard className="overflow-x-auto p-0">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-black">{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-200 align-top">
              {row.cells.map((cell, index) => <td key={`${row.id}-${index}`} className="px-4 py-3 text-slate-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </AdminSectionCard>
  );
}

export function AdminProviderStatusCard({
  product,
  providerName,
  environment,
  credentialsPresent,
  searchEnabled,
  bookingEnabled,
  lastSuccessfulRequest,
  lastFailedRequest,
  notes,
}: {
  product: string;
  providerName: string;
  environment: string;
  credentialsPresent: boolean;
  searchEnabled: boolean;
  bookingEnabled: boolean;
  lastSuccessfulRequest?: string | null;
  lastFailedRequest?: string | null;
  notes: string;
}) {
  return (
    <AdminSectionCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{product}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{providerName}</h3>
        </div>
        <AdminStatusBadge tone={searchEnabled ? "good" : credentialsPresent ? "warn" : "neutral"}>{searchEnabled ? "Search ready" : credentialsPresent ? "Configured" : "Not connected"}</AdminStatusBadge>
      </div>
      <div className="mt-4 grid gap-3 text-sm">
        <StatusLine label="Environment" value={environment} />
        <StatusLine label="Credentials present" value={credentialsPresent ? "Yes" : "No"} tone={credentialsPresent ? "good" : "neutral"} />
        <StatusLine label="Search status" value={searchEnabled ? "Enabled" : "Not enabled"} tone={searchEnabled ? "good" : "neutral"} />
        <StatusLine label="Booking status" value={bookingEnabled ? "Enabled" : "Not live yet"} tone={bookingEnabled ? "good" : "warn"} />
        <StatusLine label="Last successful request" value={lastSuccessfulRequest || "Unavailable"} />
        <StatusLine label="Last failed request" value={lastFailedRequest || "Unavailable"} />
      </div>
      <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{notes}</p>
    </AdminSectionCard>
  );
}

export function AdminActivityList({ items }: { items: Array<{ id: string; title: string; detail: string; timestamp: string }> }) {
  if (items.length === 0) {
    return <AdminEmptyState title="No admin activity yet" message="Audit log entries will appear here after admin actions are recorded." />;
  }

  return (
    <AdminSectionCard className="divide-y divide-slate-100 p-0">
      {items.map((item) => (
        <div key={item.id} className="p-4">
          <p className="font-black text-slate-950">{item.title}</p>
          <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
          <p className="mt-2 text-xs font-semibold text-slate-400">{item.timestamp}</p>
        </div>
      ))}
    </AdminSectionCard>
  );
}

function StatusLine({ label, value, tone = "neutral" }: { label: string; value: string; tone?: StatusTone }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="inline-flex items-center gap-2 text-right font-black text-slate-800"><span className={`h-2 w-2 rounded-full ${dotClass(tone)}`} />{value}</span>
    </div>
  );
}

function dotClass(tone: StatusTone) {
  return {
    good: "bg-emerald-500",
    bad: "bg-rose-500",
    warn: "bg-amber-500",
    neutral: "bg-slate-300",
    info: "bg-indigo-500",
  }[tone];
}

export const MetricCard = AdminMetricCard;
export const EmptyState = AdminEmptyState;
export const StatusPill = AdminStatusBadge;
