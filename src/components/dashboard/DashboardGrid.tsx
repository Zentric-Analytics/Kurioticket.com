"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
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
    title: "View saved trips",
    body: "See your saved itineraries",
    href: "/dashboard/saved",
    icon: Bookmark,
  },
];

const snapshotItems = [
  { label: "Trips", value: "0", href: "/dashboard/trips", linkText: "View trips →", icon: BriefcaseBusiness },
  { label: "Saved", value: "0", href: "/dashboard/saved", linkText: "View saved →", icon: Bookmark },
  { label: "Price alerts", value: "0", href: "/dashboard/alerts", linkText: "View price alerts →", icon: Bell },
  { label: "Recent searches", value: "0", href: "/flights/results", linkText: "Start searching →", icon: Clock3 },
];

type AccountDashboardFrameProps = {
  children: ReactNode;
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

function TravelIllustration({ variant = "luggage" }: { variant?: "luggage" | "globe" }) {
  return (
    <div
      className={cn(
        "relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100/70 text-violet-700",
        variant === "globe" ? "size-28 sm:size-36" : "size-28 sm:size-32",
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-3 rounded-full bg-white/35" />
      <div className="absolute -left-4 top-7 h-6 w-14 rounded-full bg-white/60" />
      <div className="absolute right-2 top-8 h-5 w-12 rounded-full bg-white/70" />
      {variant === "globe" ? (
        <>
          <div className="absolute inset-4 rounded-full border border-violet-300/60" />
          <div className="absolute h-24 w-24 rounded-full border-l border-violet-300/70 sm:h-28 sm:w-28" />
          <div className="absolute h-16 w-28 rotate-12 rounded-[100%] border-t border-dashed border-violet-400/80 sm:w-32" />
          <Plane className="absolute right-3 top-9 size-9 rotate-45 fill-violet-700 text-violet-700" />
        </>
      ) : (
        <>
          <div className="absolute bottom-7 h-3 w-20 rounded-full bg-violet-300/30 blur-sm" />
          <Luggage className="relative size-16 fill-violet-500/20 text-violet-700 drop-shadow-sm sm:size-20" />
        </>
      )}
    </div>
  );
}

export function AccountDashboardFrame({ children }: AccountDashboardFrameProps) {
  const pathname = usePathname();

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[16.5rem_minmax(0,1fr)] xl:grid-cols-[17.5rem_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start" aria-label="Account navigation">
        <div className="rounded-[1.75rem] border border-violet-100/80 bg-white p-2 shadow-[0_24px_70px_-48px_rgba(49,46,129,0.55)] lg:min-h-[calc(100vh-9rem)] lg:p-3">
          <nav className="overflow-x-auto lg:overflow-visible">
            <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col lg:gap-1.5">
              {navItems.map((item) => {
                const active = isActiveDashboardRoute(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition hover:bg-violet-50 hover:text-violet-700",
                      active ? "bg-violet-50 text-violet-700 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.04)]" : "text-slate-950",
                    )}
                  >
                    <Icon className="size-5 shrink-0" strokeWidth={active ? 2.35 : 2.1} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="mt-6 hidden rounded-2xl border border-violet-100 bg-gradient-to-b from-violet-50 to-white p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] lg:block lg:mt-28 xl:mt-36">
            <div className="mx-auto mb-4 flex justify-center">
              <TravelIllustration />
            </div>
            <h2 className="text-base font-bold text-slate-950">Book your next trip</h2>
            <p className="mx-auto mt-3 max-w-40 text-sm leading-6 text-slate-600">Find great deals on flights and hotels.</p>
            <Link
              href="/flights/results"
              className="focus-ring mt-5 inline-flex h-11 w-full items-center justify-center rounded-lg border border-violet-300 bg-white px-4 text-sm font-bold text-violet-700 transition hover:border-violet-500 hover:bg-violet-50"
            >
              Search flights
            </Link>
          </div>
        </div>
      </aside>
      <div className="min-w-0 space-y-4 sm:space-y-5">{children}</div>
    </div>
  );
}

function QuickActionTile({ title, body, href, icon: Icon }: { title: string; body: string; href: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="focus-ring group flex min-h-32 min-w-0 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_-36px_rgba(30,27,75,0.55)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_22px_52px_-34px_rgba(79,70,229,0.45)]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <ChevronRight className="mt-2 size-4 shrink-0 text-slate-950 transition group-hover:translate-x-0.5 group-hover:text-violet-700" aria-hidden="true" />
      </div>
      <div className="mt-5">
        <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      </div>
    </Link>
  );
}

function AccountIdentityHeader({ initials, displayName, userEmail }: DashboardOverviewProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-48px_rgba(49,46,129,0.55)]"
      aria-labelledby="dashboard-title"
    >
      <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_minmax(34rem,0.95fr)] xl:items-center">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 text-3xl font-extrabold text-white shadow-[0_20px_42px_-24px_rgba(79,70,229,0.85)] sm:size-24 sm:text-4xl"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 id="dashboard-title" className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Welcome back, {displayName} 👋
            </h1>
            {userEmail ? <p className="mt-2 break-words text-sm font-semibold text-slate-500">{userEmail}</p> : null}
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Manage your trips, saved travel plans, alerts, and account preferences from one place.
            </p>
          </div>
        </div>
        <div className="grid gap-3 border-slate-200 xl:grid-cols-3 xl:border-l xl:pl-7">
          {quickActions.map((action) => (
            <QuickActionTile key={action.title} {...action} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SnapshotLink({ label, value, href, linkText, icon: Icon }: { label: string; value: string; href?: string; linkText: string; icon: LucideIcon }) {
  const content = (
    <div className="flex min-w-0 items-center gap-4 px-4 py-3 sm:px-5 lg:min-h-24 lg:border-l lg:border-slate-200 lg:first:border-l-0">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-sm font-extrabold text-slate-950">{label}</dt>
        <dd className="mt-1 text-2xl font-extrabold leading-none text-slate-950">{value}</dd>
        <p className="mt-2 text-sm font-bold text-violet-700">{linkText}</p>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="focus-ring block rounded-2xl transition hover:bg-violet-50/45">
      {content}
    </Link>
  );
}

function SetupRow({ title, body, href, icon: Icon }: { title: string; body: string; href: string; icon: LucideIcon }) {
  return (
    <Link href={href} className="focus-ring group flex min-w-0 items-center gap-4 px-5 py-4 transition hover:bg-violet-50/45 sm:px-6">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold text-slate-950">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-600">{body}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-slate-950 transition group-hover:translate-x-0.5 group-hover:text-violet-700" aria-hidden="true" />
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
    <>
      <AccountIdentityHeader initials={initials} displayName={displayName} userEmail={userEmail} />

      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-50px_rgba(49,46,129,0.52)]"
        aria-labelledby="travel-status-title"
      >
        <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center xl:px-9 xl:py-8">
          <TravelIllustration />
          <div className="min-w-0">
            <h2 id="travel-status-title" className="text-lg font-extrabold text-slate-950">Your travel status</h2>
            <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">No upcoming trips yet</h3>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Trips you book or save will appear here when available.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/flights/results" className="bg-violet-700 hover:bg-violet-800">
                <Plane className="size-4" aria-hidden="true" />
                Search flights
              </LinkButton>
              <LinkButton href="/hotels" variant="secondary" className="border-violet-300 text-violet-700 hover:border-violet-500 hover:bg-violet-50">
                <Building2 className="size-4" aria-hidden="true" />
                Search hotels
              </LinkButton>
            </div>
          </div>
          <div className="hidden lg:flex">
            <TravelIllustration variant="globe" />
          </div>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-50px_rgba(49,46,129,0.52)]"
        aria-labelledby="snapshot-title"
      >
        <div className="px-5 pt-5 sm:px-6">
          <h2 id="snapshot-title" className="text-lg font-extrabold text-slate-950">Account snapshot</h2>
        </div>
        <dl className="grid gap-1 p-3 sm:p-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {snapshotItems.map((item) => (
            <SnapshotLink key={item.label} {...item} />
          ))}
        </dl>
      </section>

      <section
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-50px_rgba(49,46,129,0.52)]"
        aria-labelledby="setup-title"
      >
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 id="setup-title" className="text-lg font-extrabold text-slate-950">Finish setting up your account</h2>
        </div>
        <div className="divide-y divide-slate-200">
          <SetupRow
            title="Personal details"
            body="Add or update your personal information"
            href="/dashboard/preferences"
            icon={UserRound}
          />
          <SetupRow
            title="Travel preferences"
            body="Set your passengers, seat preference and more"
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
    </>
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
