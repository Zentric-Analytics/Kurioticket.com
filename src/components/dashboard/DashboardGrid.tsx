"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  Car,
  ChevronRight,
  Clock3,
  Grid2X2,
  Headphones,
  LifeBuoy,
  LockKeyhole,
  Luggage,
  Mail,
  Plane,
  Route,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: Grid2X2 },
  { label: "Trips", href: "/dashboard/trips", icon: BriefcaseBusiness },
  { label: "Saved", href: "/dashboard/saved", icon: Bookmark },
  { label: "Price alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Preferences", href: "/dashboard/preferences", icon: Settings },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
];

const quickActions = [
  {
    title: "Search flights",
    body: "Find the best flight deals",
    href: "/flights/results",
    icon: Plane,
  },
  {
    title: "Search hotels",
    body: "Find the perfect stay",
    href: "/hotels",
    icon: Building2,
  },
  {
    title: "Search cars",
    body: "Compare car rental deals",
    href: "/cars",
    icon: Car,
  },
  {
    title: "View saved trips",
    body: "See your saved trips and ideas",
    href: "/dashboard/saved",
    icon: Bookmark,
  },
];

const snapshotItems = [
  { label: "Trips", value: "0", href: "/dashboard/trips", linkText: "View trips", icon: BriefcaseBusiness },
  { label: "Saved", value: "0", href: "/dashboard/saved", linkText: "View saved", icon: Bookmark },
  { label: "Price alerts", value: "0", href: "/dashboard/alerts", linkText: "View price alerts", icon: Bell },
  { label: "Recent searches", value: "0", href: "/flights/results", linkText: "Start searching", icon: Clock3 },
];

type AccountDashboardFrameProps = {
  children: ReactNode;
  mobileOverviewTabs?: boolean;
};

type DashboardOverviewProps = {
  initials: string;
  displayName: string;
  userEmail?: string | null;
};

type ListRowProps = {
  title: string;
  body: string;
  href?: string;
  icon: LucideIcon;
  status?: string;
};

function isActiveDashboardRoute(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function TravelIllustration({ compact = false, variant = "luggage" }: { compact?: boolean; variant?: "luggage" | "globe" }) {
  return (
    <div
      className={cn(
        "relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100/70 text-violet-700",
        compact ? "size-20" : "size-20 sm:size-28",
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-3 rounded-full bg-white/35" />
      <div className="absolute -left-4 top-7 h-6 w-14 rounded-full bg-white/60" />
      <div className="absolute right-2 top-8 h-5 w-12 rounded-full bg-white/70" />
      {variant === "globe" ? (
        <>
          <div className="absolute inset-4 rounded-full border border-violet-300/60" />
          <div className="absolute h-20 w-20 rounded-full border-l border-violet-300/70 sm:h-24 sm:w-24" />
          <div className="absolute h-14 w-24 rotate-12 rounded-[100%] border-t border-dashed border-violet-400/80 sm:w-28" />
          <Plane className="absolute right-3 top-8 size-7 rotate-45 fill-violet-700 text-violet-700" />
        </>
      ) : (
        <>
          <div className="absolute bottom-7 h-3 w-20 rounded-full bg-violet-300/30 blur-sm" />
          <Luggage className={cn("relative fill-violet-500/20 text-violet-700 drop-shadow-sm", compact ? "size-12" : "size-12 sm:size-16")} />
        </>
      )}
    </div>
  );
}

export function AccountDashboardFrame({ children, mobileOverviewTabs = false }: AccountDashboardFrameProps) {
  const pathname = usePathname();

  return (
    <div className={cn("grid min-w-0 items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15.75rem_minmax(0,1fr)]", mobileOverviewTabs && "gap-3 sm:gap-4")}>
      <aside className="min-w-0 lg:sticky lg:top-5 lg:self-start" aria-label="Account navigation">
        <div
          className={cn(
            "border border-violet-100/80 bg-white shadow-[0_22px_60px_-50px_rgba(49,46,129,0.45)] lg:min-h-[calc(100vh-7.25rem)]",
            mobileOverviewTabs
              ? "-mx-4 border-x-0 px-4 py-0 shadow-none lg:mx-0 lg:rounded-[1.25rem] lg:border-x lg:p-2.5 lg:shadow-[0_22px_60px_-50px_rgba(49,46,129,0.45)]"
              : "rounded-[1.25rem] p-2 lg:p-2.5",
          )}
        >
          <nav className="overflow-x-auto lg:overflow-visible">
            <div className={cn("flex min-w-max lg:min-w-0 lg:flex-col lg:gap-1.5", mobileOverviewTabs ? "gap-7 lg:gap-1.5" : "gap-2")}>
              {navItems.map((item) => {
                const active = isActiveDashboardRoute(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex items-center gap-2.5 text-[13px] font-semibold transition hover:bg-violet-50 hover:text-violet-700 lg:rounded-xl lg:px-3.5 lg:py-2.5",
                      mobileOverviewTabs && "relative whitespace-nowrap rounded-none px-0 py-3.5 text-[13px] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:after:hidden",
                      !mobileOverviewTabs && "rounded-xl px-3.5 py-2.5",
                      active
                        ? cn(
                          "text-violet-700 lg:bg-violet-50 lg:shadow-[inset_0_0_0_1px_rgba(124,58,237,0.08),0_10px_28px_-22px_rgba(79,70,229,0.55)]",
                          mobileOverviewTabs && "after:bg-violet-700 lg:bg-violet-50 lg:shadow-[inset_0_0_0_1px_rgba(124,58,237,0.08),0_10px_28px_-22px_rgba(79,70,229,0.55)]",
                        )
                        : "text-slate-900",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", mobileOverviewTabs && "hidden lg:block")} strokeWidth={active ? 2.35 : 2.1} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="mt-5 hidden rounded-2xl border border-violet-100/80 bg-gradient-to-b from-violet-50/55 to-white p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] lg:block lg:mt-14 xl:mt-16">
            <div className="mx-auto mb-2 flex justify-center opacity-85">
              <TravelIllustration compact />
            </div>
            <h2 className="text-[13px] font-semibold text-slate-900">Book your next trip</h2>
            <p className="mx-auto mt-1 max-w-36 text-[11px] leading-4 text-slate-600">Find great deals on flights and hotels.</p>
            <Link
              href="/flights/results"
              className="focus-ring mt-2.5 inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-white px-3 text-[11px] font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
            >
              <Plane className="size-3.5" aria-hidden="true" />
              Search flights
            </Link>
          </div>
        </div>
      </aside>
      <div className="min-w-0 space-y-3.5 sm:space-y-4">{children}</div>
    </div>
  );
}

function QuickActionTile({ title, body, href, icon: Icon }: { title: string; body: string; href: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="focus-ring group flex min-h-20 min-w-0 items-center gap-3 rounded-xl border border-slate-300/80 bg-white/95 p-3 shadow-[0_18px_48px_-36px_rgba(30,27,75,0.62)] transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white hover:shadow-[0_22px_54px_-34px_rgba(79,70,229,0.52)]"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-100/80 text-violet-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
        <Icon className="size-5" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-700">{body}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-violet-800" strokeWidth={2.4} aria-hidden="true" />
    </Link>
  );
}

function QuickActionListRow({ title, body, href, icon: Icon }: { title: string; body: string; href: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="focus-ring group flex min-w-0 items-center gap-3 border-b border-slate-200 px-3 py-3 transition last:border-b-0 hover:bg-violet-50/60"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100/70 text-violet-700">
        <Icon className="size-5" strokeWidth={2.3} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-0.5 block text-sm leading-5 text-slate-700">{body}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-950 transition group-hover:translate-x-0.5 group-hover:text-violet-800" strokeWidth={2.5} aria-hidden="true" />
    </Link>
  );
}

function AccountIdentityHeader({ initials, displayName, userEmail }: DashboardOverviewProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-300/80 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_58%,#f8fafc_100%)] shadow-[0_24px_66px_-46px_rgba(49,46,129,0.62)]"
      aria-labelledby="dashboard-title"
    >
      <div className="flex min-w-0 items-center gap-4 p-4 sm:p-5 lg:p-5">
        <div
          className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-800 text-2xl font-bold text-white shadow-[0_18px_38px_-22px_rgba(79,70,229,0.9)] ring-1 ring-white/80 sm:size-18 sm:text-3xl"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <h1 id="dashboard-title" className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            Welcome back, {displayName} 👋
          </h1>
          {userEmail ? <p className="mt-1.5 break-words text-xs font-semibold text-slate-600 sm:text-sm">{userEmail}</p> : null}
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
            Manage your trips, saved items, and preferences.
          </p>
        </div>
      </div>
    </section>
  );
}

function QuickActionsRow() {
  return (
    <>
      <section
        className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_20px_60px_-48px_rgba(49,46,129,0.6)] lg:hidden"
        aria-labelledby="quick-actions-title"
      >
        <div className="px-4 pt-3.5">
          <h2 id="quick-actions-title" className="text-base font-semibold text-slate-950">Quick actions</h2>
        </div>
        <div className="m-3 mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {quickActions.map((action) => (
            <QuickActionListRow key={action.title} {...action} />
          ))}
        </div>
      </section>

      <section aria-label="Quick actions" className="hidden min-w-0 gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <QuickActionTile key={action.title} {...action} />
        ))}
      </section>
    </>
  );
}

function SnapshotLink({ label, value, href, linkText, icon: Icon }: { label: string; value: string; href?: string; linkText: string; icon: LucideIcon }) {
  const content = (
    <div className="flex min-w-0 items-start gap-2 px-2 py-3 sm:gap-3 sm:px-4 lg:min-h-20 lg:items-center lg:gap-2.5 lg:border-l lg:border-slate-300/80 lg:first:border-l-0">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-100/75 text-violet-800 sm:size-10">
        <Icon className="size-4.5 sm:size-5" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-semibold leading-tight text-slate-800 lg:truncate">{label}</dt>
        <dd className="mt-1 text-xl font-bold leading-none text-slate-950">{value}</dd>
        <p className="mt-1 text-[11px] font-bold leading-tight text-violet-800 sm:text-xs lg:hidden">{linkText}</p>
      </div>
      <p className="hidden shrink-0 text-[11px] font-bold text-violet-800 sm:text-xs lg:block">{linkText}</p>
      <ChevronRight className="hidden size-3.5 shrink-0 text-slate-700 lg:block" strokeWidth={2.4} aria-hidden="true" />
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="focus-ring block rounded-2xl border border-slate-200 transition hover:bg-violet-50/70 lg:border-0">
      {content}
    </Link>
  );
}

function SetupRow({ title, body, href, icon: Icon }: { title: string; body: string; href: string; icon: LucideIcon }) {
  return (
    <Link href={href} className="focus-ring group flex min-w-0 items-center gap-3 px-5 py-3.5 transition hover:bg-violet-50/70 sm:px-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-200/80 bg-violet-100/70 text-violet-800">
        <Icon className="size-4" strokeWidth={2.25} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-700">{body}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-violet-800" strokeWidth={2.4} aria-hidden="true" />
    </Link>
  );
}

function ListRow({ title, body, href, icon: Icon, status }: ListRowProps) {
  const row = (
    <div className="flex min-w-0 items-start gap-4 rounded-2xl border border-border bg-white p-4 transition hover:border-teal/40">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal-dark">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-navy">{title}</h3>
          {status ? <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">{status}</span> : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
      </div>
      {href ? <ChevronRight className="mt-2 size-4 shrink-0 text-teal-dark" aria-hidden="true" /> : null}
    </div>
  );

  if (!href) {
    return row;
  }

  return (
    <Link href={href} className="focus-ring block rounded-2xl">
      {row}
    </Link>
  );
}

export function DashboardOverview({ initials, displayName, userEmail }: DashboardOverviewProps) {
  return (
    <div className="mx-auto min-w-0 max-w-[62rem] space-y-3.5 sm:space-y-4 xl:max-w-[64rem]">
      <AccountIdentityHeader initials={initials} displayName={displayName} userEmail={userEmail} />
      <QuickActionsRow />

      <section
        className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_24px_70px_-48px_rgba(49,46,129,0.6)]"
        aria-label="Your travel status"
      >
        <div className="px-5 pt-4 lg:hidden">
          <h2 className="text-base font-semibold text-slate-950">Your travel status</h2>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 p-4 pt-4 sm:gap-5 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] xl:px-7 xl:py-7">
          <TravelIllustration />
          <div className="min-w-0">
            <h2 className="hidden text-base font-semibold text-slate-950 lg:block">Your travel status</h2>
            <h3 className="mt-0 text-lg font-bold tracking-tight text-slate-950 sm:text-[1.6rem] lg:mt-3">No upcoming trips yet</h3>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-700 lg:mt-2.5">
              Trips you book or save will appear here when available.
            </p>
            <div className="mt-4 flex flex-row gap-2 max-[380px]:flex-col lg:mt-5 lg:gap-3">
              <Link
                href="/flights/results"
                className="focus-ring inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl bg-violet-700 px-3 text-[13px] font-bold text-white transition hover:bg-violet-800 max-[380px]:w-full sm:px-4 sm:text-sm"
              >
                Search flights
              </Link>
              <Link
                href="/hotels"
                className="focus-ring inline-flex h-10 items-center justify-center whitespace-nowrap rounded-xl border border-violet-500 bg-white px-3 text-[13px] font-bold text-violet-700 transition hover:bg-violet-50 max-[380px]:w-full sm:px-4 sm:text-sm"
              >
                Search hotels
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex">
            <TravelIllustration variant="globe" />
          </div>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_24px_70px_-48px_rgba(49,46,129,0.6)]"
        aria-labelledby="snapshot-title"
      >
        <div className="px-5 pt-4 sm:px-6">
          <h2 id="snapshot-title" className="text-base font-semibold text-slate-950">Account snapshot</h2>
        </div>
        <dl className="grid grid-cols-2 gap-1.5 p-2.5 sm:p-3 lg:grid-cols-4 lg:gap-0">
          {snapshotItems.map((item) => (
            <SnapshotLink key={item.label} {...item} />
          ))}
        </dl>
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-slate-300/80 bg-white shadow-[0_24px_70px_-48px_rgba(49,46,129,0.6)]"
        aria-labelledby="setup-title"
      >
        <div className="border-b border-slate-300/80 px-5 py-3.5 sm:px-6">
          <h2 id="setup-title" className="text-base font-semibold text-slate-950">Finish setting up your account</h2>
        </div>
        <div className="divide-y divide-slate-300/80">
          <SetupRow
            title="Personal details"
            body="Add your name, phone number and more"
            href="/dashboard/preferences"
            icon={UserRound}
          />
          <SetupRow
            title="Travel preferences"
            body="Set your preferred travel options"
            href="/dashboard/preferences"
            icon={Plane}
          />
          <SetupRow
            title="Security and privacy"
            body="Manage your password and privacy settings"
            href="/dashboard/preferences"
            icon={ShieldCheck}
          />
        </div>
      </section>
    </div>
  );
}

export function TripsDashboardPage() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border bg-surface-muted/70 px-5 py-5 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Trips</p>
        <h1 className="mt-2 text-3xl font-bold text-navy">Trips</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Booked and saved trip activity tied to your account will appear here when it exists.
        </p>
      </div>
      <div className="px-5 py-6 sm:px-6">
        <div className="rounded-2xl border border-dashed border-border bg-white p-6">
          <Route className="size-10 text-teal-dark" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold text-navy">No trips booked yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            When real booked or saved trip activity is available for your account, it will be organized here. Start with a flight or hotel search to keep planning.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/flights/results">Search flights</LinkButton>
            <LinkButton href="/hotels" variant="secondary">Search hotels</LinkButton>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SavedDashboardPage() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border bg-surface-muted/70 px-5 py-5 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Saved</p>
        <h1 className="mt-2 text-3xl font-bold text-navy">Saved</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Saved trips, routes, stays, and planning items connected to your account belong here.
        </p>
      </div>
      <div className="px-5 py-6 sm:px-6">
        <div className="rounded-2xl border border-dashed border-border bg-white p-6">
          <Bookmark className="size-10 text-teal-dark" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold text-navy">No saved items yet</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Items you save from Kurioticket planning tools will appear here. You can also open the existing saved trips area when saved data is available.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/saved">Open saved trips</LinkButton>
            <LinkButton href="/flights/results" variant="secondary">Search flights</LinkButton>
            <LinkButton href="/hotels" variant="secondary">Search hotels</LinkButton>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function PreferencesDashboardPage() {
  return (
    <section aria-labelledby="preferences-title" className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Preferences</p>
        <h1 id="preferences-title" className="mt-2 text-3xl font-bold text-navy">Preferences</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Account settings are grouped here as clean shortcuts. Controls that are not active yet are marked clearly.
        </p>
      </div>
      <div className="grid gap-3">
        <ListRow title="Personal details" body="Review your account profile details when editable profile controls are available." icon={UserRound} status="Coming soon" />
        <ListRow title="Notification preferences" body="Manage email and alert preferences as notification controls are added." icon={Mail} status="Coming soon" />
        <ListRow title="Travel preferences" body="Keep preferred planning defaults easy to find for future account settings." icon={Settings} status="Coming soon" />
        <ListRow title="Security and privacy" body="Review current privacy and platform policy information." href="/legal" icon={ShieldCheck} />
      </div>
    </section>
  );
}

export function SupportDashboardPage() {
  return (
    <section aria-labelledby="support-title" className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Support</p>
        <h1 id="support-title" className="mt-2 text-3xl font-bold text-navy">Support</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Find help and policy resources without presenting inactive support tools as complete workflows.
        </p>
      </div>
      <div className="grid gap-3">
        <ListRow title="Help center" body="Browse the existing support area for Kurioticket help and travel-planning guidance." href="/support" icon={LifeBuoy} />
        <ListRow title="Contact support" body="Contact options are being prepared for account support requests." icon={Headphones} status="Coming soon" />
        <ListRow title="Privacy and data" body="Review legal and privacy information for account data and platform policies." href="/legal" icon={LockKeyhole} />
      </div>
    </section>
  );
}
