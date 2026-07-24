"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { AlertTriangle, Building2, ChevronRight, Inbox, Loader2, LogOut, Menu, Settings, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { formatAdminBadgeLabel } from "@/components/admin/adminDesignSystem";
import { getActiveAdminHub, getAdminNavbarHubsForRole, type AdminHubDefinition, type AdminRole } from "@/lib/adminNavigation";

const AdminLogoImage = "img";
const AdminMobileDrawerPanel = "aside";

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
  const hubs = getAdminNavbarHubsForRole(safeRole);

  const pathname = usePathname();
  const isAdminHome = pathname === "/admin";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <AdminNavbar hubs={hubs} adminEmail={adminEmail} adminName={adminName} adminImage={adminImage} />
      <div className={cn(isAdminHome && "min-h-[calc(100vh-4rem)] bg-[#F7F6F2] sm:min-h-[calc(100vh-68px)]")}>
        <main className="page-shell py-5 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminNavbar({
  hubs,
  adminEmail,
  adminName,
  adminImage,
}: {
  hubs: AdminHubDefinition[];
  adminEmail?: string | null;
  adminName?: string | null;
  adminImage?: string | null;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const displayName = adminName || adminEmail || "Admin";
  const adminInitials = getAccountInitials(displayName, adminEmail);
  const pathname = usePathname();

  useEffect(() => {
    const closePanelsOnRouteChange = window.setTimeout(() => {
      setMobileMenuOpen(false);
      setMobileAccountOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(closePanelsOnRouteChange);
    };
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen && !mobileAccountOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenuOpen(false);
        setMobileAccountOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileAccountOpen, mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#DDE7F0] bg-white/95 backdrop-blur">
        <div className="page-shell flex min-h-16 items-center justify-between gap-3 py-2 md:grid md:min-h-[68px] md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-6">
          <div className="min-w-0 justify-self-start">
            <AdminBrandLink onNavigate={() => setMobileMenuOpen(false)} />
          </div>
          <nav className="hidden min-w-0 items-center justify-self-center gap-3 md:flex md:translate-y-1.5 lg:gap-4" aria-label="Admin navigation">
            {hubs.map((hub) => <AdminHubNavLink key={hub.key} hub={hub} />)}
          </nav>
          <div className="hidden shrink-0 items-center justify-self-end md:flex">
            <AdminProfileMenu adminEmail={adminEmail} adminImage={adminImage} displayName={displayName} />
          </div>
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              aria-label="Open Admin account menu"
              aria-expanded={mobileAccountOpen}
              aria-controls="admin-mobile-account-drawer"
              aria-haspopup="dialog"
              onClick={() => {
                setMobileMenuOpen(false);
                setMobileAccountOpen((open) => !open);
              }}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#DDE7F0] bg-[#F3F7FA]/70 text-xs font-black text-[#021C2B] transition-colors hover:border-[#004BB8]/30 hover:bg-[#EEF6FC] hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 focus-visible:ring-offset-2"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-transparent text-[11px] font-black text-[#004BB8]">
                {adminImage ? <AdminLogoImage src={adminImage} alt="" className="h-full w-full object-cover" /> : adminInitials}
              </span>
            </button>

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close Admin mobile menu" : "Open Admin mobile menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-mobile-menu-drawer"
              aria-haspopup="dialog"
              onClick={() => {
                setMobileAccountOpen(false);
                setMobileMenuOpen((open) => !open);
              }}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#DDE7F0] bg-[#F3F7FA]/70 text-[#021C2B] transition-colors hover:border-[#004BB8]/30 hover:bg-[#EEF6FC] hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 focus-visible:ring-offset-2"
            >
              {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] md:hidden" role="presentation">
              <button
                type="button"
                className="absolute inset-0 h-full w-full cursor-default bg-slate-950/45"
                aria-label="Close Admin mobile menu backdrop"
                onClick={() => setMobileMenuOpen(false)}
              />

              <AdminMobileDrawerPanel
                id="admin-mobile-menu-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Admin menu"
                className="fixed inset-y-0 end-0 z-[80] flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-white text-slate-900 shadow-2xl md:hidden"
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <h2 className="truncate text-xl font-semibold tracking-[-0.02em] text-slate-950">Menu</h2>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
                    aria-label="Close Admin mobile menu"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>

                <nav className="page-shell min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]" aria-label="Admin mobile navigation">
                  <div className="grid gap-1">
                    {hubs.map((hub) => <AdminHubNavLink key={hub.key} hub={hub} onNavigate={() => setMobileMenuOpen(false)} mobile />)}
                  </div>
                </nav>
              </AdminMobileDrawerPanel>
            </div>,
            document.body,
          )
        : null}

      {mobileAccountOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[70] md:hidden" role="presentation">
              <button
                type="button"
                className="absolute inset-0 h-full w-full cursor-default bg-slate-950/45"
                aria-label="Close Admin account backdrop"
                onClick={() => setMobileAccountOpen(false)}
              />

              <AdminMobileDrawerPanel
                id="admin-mobile-account-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Admin account menu"
                className="fixed inset-y-0 end-0 z-[80] flex h-[100dvh] max-h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-white text-slate-900 shadow-2xl md:hidden"
              >
                <nav className="page-shell min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
                  <section aria-label="Admin account">
                    <div className="flex items-center gap-3 px-2.5 pb-5">
                      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#004BB8] text-base font-semibold text-white shadow-sm ring-4 ring-[#004BB8]/10">
                        {adminImage ? <AdminLogoImage src={adminImage} alt="" className="h-full w-full object-cover" /> : adminInitials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="block truncate text-lg font-semibold text-slate-950">{displayName}</div>
                        <div className="mt-0.5 block truncate text-sm font-medium text-slate-500">{adminEmail || "No email available"}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMobileAccountOpen(false)}
                        className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
                        aria-label="Close Admin account menu"
                      >
                        <X size={18} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="border-t border-slate-100" />

                    <div className="grid gap-1 py-4">
                      <AdminAccountDrawerLink href="/admin/system" label="System" icon={Settings} onNavigate={() => setMobileAccountOpen(false)} />
                      <AdminAccountDrawerLink href="/admin/logs" label="Audit logs" icon={ShieldCheck} onNavigate={() => setMobileAccountOpen(false)} />
                      <AdminAccountDrawerLink href="/" label="Switch to public site" icon={Building2} onNavigate={() => setMobileAccountOpen(false)} />
                      <AdminAccountDrawerLink href="/api/auth/signout" label="Logout" icon={LogOut} onNavigate={() => setMobileAccountOpen(false)} />
                    </div>
                  </section>
                </nav>
              </AdminMobileDrawerPanel>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function AdminBrandLink({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = pathname === "/admin";

  return (
    <Link
      href="/admin"
      aria-label="Go to Admin Overview"
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center py-1 text-[#021C2B] opacity-95 transition hover:opacity-100",
        active && "opacity-100",
      )}
    >
      <AdminLogoImage
        src="/brand/kurioticket-logo-primary-light-bg.svg"
        alt="Kurioticket"
        className="h-8 w-auto md:h-9"
      />
    </Link>
  );
}

function AdminHubNavLink({ hub, mobile = false, onNavigate }: { hub: AdminHubDefinition; mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = getActiveAdminHub(pathname) === hub.key;

  return (
    <Link
      href={hub.href}
      onClick={onNavigate}
      className={cn(
        "focus-ring inline-flex items-center border transition-colors",
        mobile
          ? "min-h-12 px-2 py-2.5 text-[15px] font-semibold leading-5"
          : "min-h-[38px] rounded-full px-3.5 py-2 text-[15px] font-semibold leading-none tracking-[-0.005em] lg:px-4",
        active
          ? "border-[#004BB8]/18 bg-[#004BB8]/6 text-[#021C2B]"
          : "border-[#DDE7F0] bg-[#F3F7FA]/70 text-[#021C2B]/85 hover:border-[#004BB8]/20 hover:bg-[#004BB8]/5 hover:text-[#021C2B]",
      )}
      aria-current={active ? "page" : undefined}
    >
      {hub.label}
    </Link>
  );
}

function AdminProfileMenu({
  adminEmail,
  adminImage,
  className = "",
  displayName,
}: {
  adminEmail?: string | null;
  adminImage?: string | null;
  className?: string;
  displayName: string;
}) {
  const [open, setOpen] = useState(false);
  const profileLabel = "Open Admin profile menu";
  const adminInitials = getAccountInitials(displayName, adminEmail);

  return (
    <details className={`relative ${className}`} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary
        aria-label={profileLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        title={profileLabel}
        className="inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-transparent bg-transparent text-[#021C2B] marker:hidden transition-colors hover:border-[#004BB8]/20 hover:bg-[#004BB8]/5 hover:text-[#021C2B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25 focus-visible:ring-offset-2"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-[#F2F7FA] text-[11px] font-black text-[#004BB8] shadow-sm">
          {adminImage ? <AdminLogoImage src={adminImage} alt="" className="h-full w-full object-cover" /> : adminInitials}
        </span>
      </summary>
      <div role="menu" aria-label={profileLabel} className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl ring-1 ring-slate-950/5">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
          <p className="truncate text-xs font-normal text-slate-500">{adminEmail || "No email available"}</p>
        </div>
        <div className="grid gap-1 p-2">
          <ProfileLink href="/admin/system" label="System" icon={Settings} />
          <ProfileLink href="/admin/logs" label="Audit logs" icon={ShieldCheck} />
          <ProfileLink href="/" label="Switch to public site" icon={Building2} />
          <ProfileLink href="/api/auth/signout" label="Logout" icon={LogOut} />
        </div>
      </div>
    </details>
  );
}

function getAccountInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Admin";

  return (
    source
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "A"
  );
}

function ProfileLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <Link href={href} role="menuitem" className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-[#F2F7FA] hover:text-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F2F7FA] text-[#004BB8] group-hover:bg-white">
        <Icon size={17} aria-hidden="true" />
      </span>
      {label}
    </Link>
  );
}

function AdminAccountDrawerLink({ href, label, icon: Icon, onNavigate }: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group inline-flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 text-base font-semibold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/25"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition-colors group-hover:border-[#004BB8]/15 group-hover:bg-[#F2F7FA] group-hover:text-[#004BB8]">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block whitespace-normal break-words">{label}</span>
      </span>
      <ChevronRight size={18} className="ml-auto shrink-0 text-slate-400 transition-colors group-hover:text-[#004BB8]" aria-hidden="true" />
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
    <div>
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

export function AdminPageHeader({ eyebrow, title, titleId, description, actions }: { eyebrow?: string; title: string; titleId?: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#004BB8]">{eyebrow}</p> : null}
        <h1 id={titleId} className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
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
      <p className="mt-3 text-2xl font-extrabold text-slate-950">{value}</p>
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

  return <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1 ${classes}`}>{formatAdminBadgeLabel(children)}</span>;
}

export function AdminSectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</section>;
}

const adminButtonVariants = {
  primary: "border border-indigo-700 bg-indigo-700 text-white shadow-sm hover:border-indigo-800 hover:bg-indigo-800",
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
        "focus-ring inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
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
        "focus-ring inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition",
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

const adminControlClass = "focus-ring h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

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

export function AdminEmptyState({
  title = "No data available",
  message,
  action,
  variant = "full",
}: {
  title?: string;
  message: string;
  action?: React.ReactNode;
  variant?: "full" | "compact";
}) {
  return (
    <AdminSectionCard className={cn("p-6", variant === "compact" && "rounded-none border-0 bg-transparent shadow-none")}>
      <div className={cn("flex gap-4", variant === "compact" ? "items-start" : "max-w-2xl items-start")} role="status" aria-live="polite">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
          <Inbox className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-base font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </AdminSectionCard>
  );
}

export function AdminDataErrorState({
  title = "Unable to load data",
  message = "Please try again. If the issue continues, contact an administrator.",
  retry,
  secondaryAction,
}: {
  title?: string;
  message?: string;
  retry?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}) {
  return (
    <AdminSectionCard className="border-rose-100 bg-rose-50/40 p-6">
      <div className="flex gap-4" role="alert">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 ring-1 ring-rose-200">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-base font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          {retry || secondaryAction ? <div className="mt-4 flex flex-wrap gap-2">{retry}{secondaryAction}</div> : null}
        </div>
      </div>
    </AdminSectionCard>
  );
}

type AdminDataColumn = string | { key: string; label: React.ReactNode; align?: "left" | "right" | "center"; className?: string };

type AdminDataRow = { id: string; cells: React.ReactNode[] };

function columnKey(column: AdminDataColumn) {
  return typeof column === "string" ? column : column.key;
}

function columnLabel(column: AdminDataColumn) {
  return typeof column === "string" ? column : column.label;
}

function columnAlignClass(column: AdminDataColumn) {
  const align = typeof column === "string" ? undefined : column.align;
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function columnCustomClass(column: AdminDataColumn) {
  return typeof column === "string" ? "" : column.className || "";
}

export function AdminDataTable({
  columns,
  rows,
  caption,
  summary,
  footer,
  density = "comfortable",
  minWidth = "900px",
}: {
  columns: AdminDataColumn[];
  rows: AdminDataRow[];
  caption?: string;
  summary?: React.ReactNode;
  footer?: React.ReactNode;
  density?: "compact" | "comfortable";
  minWidth?: string;
}) {
  const cellPadding = density === "compact" ? "px-4 py-3" : "px-5 py-4";

  return (
    <AdminSectionCard className="overflow-hidden p-0 shadow-sm">
      {summary ? <div className="border-b border-slate-200 px-5 py-4 text-sm text-slate-600">{summary}</div> : null}
      <div className="overflow-x-auto bg-[linear-gradient(to_right,white,white),linear-gradient(to_right,white,white),linear-gradient(to_right,rgba(15,23,42,0.08),rgba(255,255,255,0)),linear-gradient(to_left,rgba(15,23,42,0.08),rgba(255,255,255,0))] bg-[length:24px_100%,24px_100%,12px_100%,12px_100%] bg-[position:left_center,right_center,left_center,right_center] bg-no-repeat [background-attachment:local,local,scroll,scroll]">
        <table className="w-full border-separate border-spacing-0 text-left text-sm" style={{ minWidth }} aria-label={caption}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs text-slate-500 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th key={columnKey(column)} scope="col" className={cn(cellPadding, "border-b border-slate-200 font-semibold uppercase tracking-wide", columnAlignClass(column), columnCustomClass(column))}>
                  {columnLabel(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="group align-top transition-colors hover:bg-slate-50/80 focus-within:bg-slate-50/80">
                {row.cells.map((cell, index) => <td key={`${row.id}-${index}`} className={cn(cellPadding, "max-w-[22rem] text-slate-700 first:font-medium first:text-slate-950 [&_a]:focus-ring [&_button]:focus-ring", index === row.cells.length - 1 && "whitespace-nowrap text-right")}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ? <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div> : null}
    </AdminSectionCard>
  );
}

export function AdminDataTableSkeleton({
  columns,
  rows = 5,
  caption = "Loading table data",
  density = "comfortable",
}: {
  columns: string[];
  rows?: number;
  caption?: string;
  density?: "compact" | "comfortable";
}) {
  return (
    <AdminDataTable
      caption={caption}
      density={density}
      columns={columns}
      rows={Array.from({ length: rows }, (_, rowIndex) => ({
        id: `skeleton-${rowIndex}`,
        cells: columns.map((column, columnIndex) => (
          <span key={`${column}-${columnIndex}`} className="block h-4 w-full max-w-32 rounded bg-slate-100 motion-safe:animate-pulse" aria-hidden="true" />
        )),
      }))}
    />
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
