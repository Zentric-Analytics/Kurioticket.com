"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  ChevronRight,
  Headphones,
  LifeBuoy,
  LockKeyhole,
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
  { label: "Overview", href: "/dashboard" },
  { label: "Trips", href: "/dashboard/trips" },
  { label: "Saved", href: "/dashboard/saved" },
  { label: "Price alerts", href: "/dashboard/alerts" },
  { label: "Preferences", href: "/dashboard/preferences" },
  { label: "Support", href: "/dashboard/support" },
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

export function AccountDashboardFrame({ children }: AccountDashboardFrameProps) {
  const pathname = usePathname();

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start" aria-label="Account navigation">
        <nav className="overflow-x-auto rounded-2xl border border-border bg-white p-2 shadow-[0_18px_44px_-34px_rgba(30,27,75,0.45)] lg:overflow-visible">
          <div className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
            {navItems.map((item) => {
              const active = isActiveDashboardRoute(pathname, item.href);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-surface-muted",
                    active ? "bg-navy text-white hover:bg-navy-soft" : "text-navy",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </aside>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}

function AccountIdentityHeader({ initials, displayName, userEmail }: DashboardOverviewProps) {
  return (
    <section
      className="overflow-hidden rounded-[2rem] border border-border bg-white shadow-[0_24px_70px_-42px_rgba(30,27,75,0.5)]"
      aria-labelledby="dashboard-title"
    >
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
          <div
            className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-navy text-xl font-bold text-white shadow-[0_18px_35px_-24px_rgba(30,27,75,0.7)]"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-dark">Kurioticket account</p>
            <h1 id="dashboard-title" className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Welcome back, {displayName}
            </h1>
            {userEmail ? <p className="mt-2 break-words text-sm font-medium text-muted">{userEmail}</p> : null}
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
              Your account home keeps the essentials close: search again, review saved planning areas, and continue setup without showing made-up travel activity.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:w-48 lg:grid-cols-1">
          <LinkButton href="/flights/results" className="w-full">Search flights</LinkButton>
          <LinkButton href="/hotels" variant="secondary" className="w-full">Search hotels</LinkButton>
          <LinkButton href="/dashboard/saved" variant="secondary" className="w-full">View saved trips</LinkButton>
        </div>
      </div>
    </section>
  );
}

function SnapshotLink({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="rounded-2xl border border-border bg-white px-4 py-4 transition hover:border-teal/40">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="mt-2 flex items-end justify-between gap-3 text-2xl font-bold text-navy">
        <span>{value}</span>
        {href ? <ChevronRight className="mb-1 size-4 text-teal-dark" aria-hidden="true" /> : null}
      </dd>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="focus-ring rounded-2xl">
      {content}
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

      <Card className="p-5 sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Travel status</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy">No upcoming trips yet</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Booked or saved trip activity connected to your account will appear here when it exists. Start with a real search whenever you are ready.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/flights/results">Search flights</LinkButton>
          <LinkButton href="/hotels" variant="secondary">Search hotels</LinkButton>
        </div>
      </Card>

      <section aria-labelledby="snapshot-title">
        <div className="mb-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Snapshot</p>
          <h2 id="snapshot-title" className="mt-2 text-2xl font-bold tracking-tight text-navy">Account at a glance</h2>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotLink label="Trips" value="0" href="/dashboard/trips" />
          <SnapshotLink label="Saved" value="0" href="/dashboard/saved" />
          <SnapshotLink label="Price alerts" value="0" href="/dashboard/alerts" />
          <SnapshotLink label="Recent searches" value="0" />
        </dl>
      </section>

      <section aria-labelledby="setup-title">
        <div className="mb-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Account setup</p>
          <h2 id="setup-title" className="mt-2 text-2xl font-bold tracking-tight text-navy">Shortcuts</h2>
        </div>
        <div className="grid gap-3">
          <ListRow
            title="Personal details"
            body="Review account basics from the preferences area."
            href="/dashboard/preferences"
            icon={UserRound}
          />
          <ListRow
            title="Travel preferences"
            body="Keep planning preferences easy to find as account controls are added."
            href="/dashboard/preferences"
            icon={Plane}
          />
          <ListRow
            title="Security and privacy"
            body="Review privacy and account safety options from preferences."
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
