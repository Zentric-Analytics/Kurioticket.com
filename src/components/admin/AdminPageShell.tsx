"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, Loader2, LogOut, Search, Settings, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import { adminNavigationGroups, getAdminNavForRole, isAdminNavItemActive, type AdminNavDefinition, type AdminRole } from "@/lib/adminNavigation";

const AdminLogoImage = "img";

type StatusTone = "good" | "bad" | "warn" | "neutral" | "info";

export function AdminShell({
  children,
  adminEmail,
  adminName,
  adminRole,
  adminImage,
}: {
  children: React.ReactNode;
  adminEmail?: string | null;
  adminName?: string | null;
  adminImage?: string | null;
  adminRole: string;
}) {
  const safeRole: AdminRole = adminRole === "SUPPORT" || adminRole === "USER" ? adminRole : "ADMIN";
  const navigation = getAdminNavForRole(safeRole);
  const displayName = adminName || adminEmail || "Admin";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <AdminSidebar navigation={navigation} />
      <div className="min-w-0 flex-1">
        <AdminTopbar adminEmail={adminEmail} adminImage={adminImage} displayName={displayName} adminRole={safeRole} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function AdminSidebar({ navigation }: { navigation: AdminNavDefinition[] }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-800 bg-slate-950 text-white lg:h-screen lg:w-[280px] lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3 px-4 py-4 lg:px-6 lg:py-6">
        <AdminLogoImage src="/brand/kurioticket-logo-primary-dark-header.svg" alt="Kurioticket" className="h-8 w-auto" />
        <div className="border-l border-white/20 pl-3">
          <p className="text-sm font-black">Admin</p>
          <p className="text-xs text-slate-400">Internal operations</p>
        </div>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:h-[calc(100vh-96px)] lg:space-y-6 lg:overflow-y-auto lg:px-4" aria-label="Admin navigation">
        {adminNavigationGroups.map((group) => {
          const items = navigation.filter((item) => group.hrefs.some((href) => href === item.href));
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="contents lg:block">
              <p className="hidden px-3 pb-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 lg:block">{group.label}</p>
              {items.map((item) => {
                const active = isAdminNavItemActive(item.href, pathname);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn(
                    "focus-ring flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition lg:mb-1 lg:w-full lg:gap-3",
                    active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white",
                  )}>
                    <Icon size={17} aria-hidden="true" />{item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function AdminTopbar({ adminEmail, adminImage, displayName, adminRole }: { adminEmail?: string | null; adminImage?: string | null; displayName: string; adminRole: AdminRole }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm font-black text-slate-950">Kurioticket Admin</p>
          <p className="truncate text-xs text-slate-500">Secure internal workspace</p>
        </div>
        <label className="relative min-w-0 flex-1 md:ml-4 md:max-w-xl">
          <span className="sr-only">Search admin</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
          <input type="search" placeholder="Search users, searches, providers..." className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" />
        </label>
        <button type="button" disabled aria-label="Notifications unavailable" title="Notifications unavailable" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 disabled:cursor-not-allowed">
          <Bell size={18} aria-hidden="true" />
        </button>
        <span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-blue-700 sm:inline">{adminRole}</span>
        <AdminProfileMenu adminEmail={adminEmail} adminImage={adminImage} displayName={displayName} />
      </div>
    </header>
  );
}

function AdminProfileMenu({ adminEmail, adminImage, displayName }: { adminEmail?: string | null; adminImage?: string | null; displayName: string }) {
  const adminInitials = getAccountInitials(displayName, adminEmail);
  return (
    <details className="relative">
      <summary aria-label="Open administrator profile menu" className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-lg px-1 py-1 marker:hidden hover:bg-slate-50">
        <span className="hidden min-w-0 text-right xl:block"><span className="block truncate text-sm font-black text-slate-900">{displayName}</span><span className="block truncate text-xs text-slate-500">Administrator</span></span>
        <span className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-xs font-black text-white">{adminImage ? <AdminLogoImage src={adminImage} alt="" className="h-full w-full object-cover" /> : adminInitials}</span>
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-100 px-4 py-3"><p className="truncate text-sm font-black text-slate-900">{displayName}</p><p className="truncate text-xs text-slate-500">{adminEmail || "No email available"}</p></div>
        <div className="grid gap-1 p-2">
          <ProfileLink href="/admin/settings" label="Admin settings" icon={Settings} />
          <ProfileLink href="/admin/logs" label="Audit logs" icon={ShieldCheck} />
          <ProfileLink href="/" label="Switch to public site" icon={Building2} />
          <ProfileLink href="/api/auth/signout" label="Logout" icon={LogOut} />
        </div>
      </div>
    </details>
  );
}

function getAccountInitials(name?: string | null, email?: string | null) { const source = name?.trim() || email?.trim() || "Admin"; return source.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "A"; }
function ProfileLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ size?: number }> }) { return <Link href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-950"><Icon size={17} aria-hidden="true" />{label}</Link>; }

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
    <div>
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

export function AdminPageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#004BB8]">{eyebrow}</p> : null}
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
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
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
    info: "bg-[#F3F7FA] text-[#004BB8] ring-[#DDE7F0]",
  }[tone];

  return <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-black leading-none ring-1 ${classes}`}>{children}</span>;
}

export function AdminSectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

const adminButtonVariants = {
  primary: "border border-[#004BB8] bg-[#004BB8] text-white shadow-sm hover:border-[#003D96] hover:bg-[#003D96]",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
  ghost: "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  destructive: "border border-rose-600 bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700",
};

const adminButtonSizes = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

type AdminButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof adminButtonVariants;
  size?: keyof typeof adminButtonSizes;
  loading?: boolean;
};

export function AdminButton({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }: AdminButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-black transition disabled:cursor-not-allowed disabled:opacity-55",
        adminButtonVariants[variant],
        adminButtonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function AdminLinkButton({ className, variant = "secondary", size = "md", children, ...props }: React.ComponentProps<typeof Link> & { variant?: keyof typeof adminButtonVariants; size?: keyof typeof adminButtonSizes }) {
  return (
    <Link
      className={cn(
        "focus-ring inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-black transition",
        adminButtonVariants[variant],
        adminButtonSizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

const adminControlClass = "focus-ring h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#004BB8] focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

export function AdminInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(adminControlClass, className)} {...props} />;
}

export function AdminSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(adminControlClass, className)} {...props} />;
}

export function AdminTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(adminControlClass, "min-h-32 py-2 leading-6", className)} {...props} />;
}

export function AdminCheckbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={cn("focus-ring h-4 w-4 rounded border-slate-300 text-indigo-700", className)} {...props} />;
}

export function AdminFilterBar({ children, action, className = "" }: { children: React.ReactNode; action?: string; className?: string }) {
  return (
    <AdminSectionCard className={cn("p-4", className)}>
      <form className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] md:items-center" action={action}>
        {children}
      </form>
    </AdminSectionCard>
  );
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
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{product}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-950">{providerName}</h3>
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
          <p className="font-semibold text-slate-950">{item.title}</p>
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
      <span className="inline-flex items-center gap-2 text-right font-semibold text-slate-800"><span className={`h-2 w-2 rounded-full ${dotClass(tone)}`} />{value}</span>
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
