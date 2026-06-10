"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  ChevronRight,
  Grid2X2,
  Headphones,
  LifeBuoy,
  LockKeyhole,
  Luggage,
  Mail,
  PencilLine,
  Plane,
  Route,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: Grid2X2 },
  { label: "My Trips", href: "/dashboard/trips", icon: BriefcaseBusiness },
  { label: "Saved", href: "/dashboard/saved", icon: Bookmark },
  { label: "Price alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Preference", href: "/dashboard/preferences", icon: Settings },
  { label: "Security", href: "/dashboard/security", icon: ShieldCheck },
  { label: "Support", href: "/dashboard/support", icon: LifeBuoy },
];

type AccountDashboardFrameProps = {
  children: ReactNode;
  mobileOverviewTabs?: boolean;
};

type DashboardOverviewProps = {
  initials: string;
  displayName: string;
  userEmail?: string | null;
  userName?: string | null;
};

type MemberProfileDetails = {
  legalName: string;
  dateOfBirth: string;
};

type PersonalInfoDetails = {
  gender: string;
  displayName: string;
  nationality: string;
  cityOfResidence: string;
  frequentlyVisitedCity: string;
};

type ProfileDrawerType = "member" | "personal" | null;

type ProfileDetailRow = {
  label: string;
  value: string;
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
    <div
      className={cn(
        "grid min-w-0 items-start gap-4 lg:h-[calc(100dvh-7.75rem)] lg:min-h-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-stretch lg:overflow-hidden xl:grid-cols-[15.75rem_minmax(0,1fr)]",
        mobileOverviewTabs && "gap-3 sm:gap-4",
      )}
    >
      <aside className="min-w-0 lg:min-h-0" aria-label="Account navigation">
        <div
          className={cn(
            "border border-violet-100/80 bg-white shadow-[0_22px_60px_-50px_rgba(49,46,129,0.45)] lg:max-h-full lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-contain lg:[scrollbar-width:thin]",
            mobileOverviewTabs
              ? "-mx-4 border-x-0 px-4 py-0 shadow-none lg:mx-0 lg:h-full lg:rounded-[1.25rem] lg:border-x lg:p-2.5 lg:shadow-[0_22px_60px_-50px_rgba(49,46,129,0.45)]"
              : "rounded-[1.25rem] p-2 lg:h-full lg:p-2.5",
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
      <div className="min-w-0 space-y-3.5 sm:space-y-4 lg:min-h-0 lg:max-h-full lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-contain lg:pr-1 lg:[scrollbar-width:thin]">{children}</div>
    </div>
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

function getMemberProfileDetails({ userName }: DashboardOverviewProps): MemberProfileDetails {
  return {
    legalName: userName?.trim() ?? "",
    dateOfBirth: "",
  };
}

function getPersonalInfoDetails({ displayName, userName }: DashboardOverviewProps): PersonalInfoDetails {
  return {
    gender: "",
    displayName: userName?.trim() ? displayName.trim() : "",
    nationality: "",
    cityOfResidence: "",
    frequentlyVisitedCity: "",
  };
}

function formatDetailValue(value: string) {
  return value.trim() || "-";
}

function ProfileCard({
  title,
  subtitle,
  rows,
  variant = "list",
  onEdit,
}: {
  title: string;
  subtitle: string;
  rows: ProfileDetailRow[];
  variant?: "list" | "grid";
  onEdit: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_70px_-56px_rgba(49,46,129,0.5)]" aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-title`}>
      <div className="flex min-w-0 items-start justify-between gap-4 px-4 pb-4 pt-5 sm:px-6">
        <div className="min-w-0">
          <h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-title`} className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="focus-ring inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 hover:text-violet-800"
        >
          <PencilLine className="size-4" aria-hidden="true" />
          Edit
        </button>
      </div>

      <div className="px-4 pb-5 sm:px-6">
        <div className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white", variant === "grid" ? "grid sm:grid-cols-2" : "divide-y divide-slate-200")}>
          {rows.map((row, index) => (
            <div
              key={row.label}
              className={cn(
                "min-w-0 px-4 py-4 sm:px-5",
                variant === "grid" && "border-slate-200 sm:border-r sm:[&:nth-child(2n)]:border-r-0",
                variant === "grid" && index < rows.length - 1 && "border-b",
                variant === "grid" && rows.length % 2 === 1 && index === rows.length - 1 && "sm:col-span-2 sm:border-r-0",
              )}
            >
              <p className="text-sm font-semibold leading-6 text-slate-950">{row.label}</p>
              <p className="mt-2 break-words text-sm font-semibold leading-6 text-slate-800">{formatDetailValue(row.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TextField({ label, placeholder, type = "text" }: { label?: string; placeholder: string; type?: "text" | "date" }) {
  return (
    <label className="block min-w-0">
      {label ? <span className="mb-2 block text-sm font-semibold text-slate-950">{label}</span> : null}
      <input
        type={type}
        placeholder={placeholder}
        className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </label>
  );
}

function CheckboxField({ label }: { label: string }) {
  return (
    <label className="flex min-w-0 items-center gap-2.5 text-sm font-semibold leading-6 text-slate-950">
      <input type="checkbox" className="size-4 shrink-0 rounded border-slate-300 text-violet-700 focus:ring-violet-200" />
      <span>{label}</span>
    </label>
  );
}

function MemberProfileDrawerFields() {
  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold text-slate-950">
          Name (basic Latin alphabet)<span className="text-red-500">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField placeholder="Given names" />
          <TextField placeholder="Surname" />
        </div>
        <CheckboxField label="I don't have a surname" />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-bold text-slate-950">
          Name (in original language)<span className="text-red-500">*</span>
        </legend>
        <CheckboxField label="I don't need to add a name (in original language)" />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField placeholder="Given names" />
          <TextField placeholder="Surname" />
        </div>
        <CheckboxField label="I don't have a surname" />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-slate-950">
          Date of birth<span className="text-red-500">*</span>
        </legend>
        <TextField placeholder="Date of birth" type="date" />
      </fieldset>
    </div>
  );
}

function PersonalInfoDrawerFields() {
  return (
    <div className="space-y-4">
      <TextField label="Display name" placeholder="Display name" />
      <TextField label="Gender" placeholder="Gender" />
      <TextField label="Nationality (country or region)" placeholder="Nationality (country or region)" />
      <TextField label="City of residence" placeholder="City of residence" />
      <TextField label="Frequently visited city" placeholder="Frequently visited city" />
    </div>
  );
}

function ProfileEditDrawer({ drawerType, onClose }: { drawerType: ProfileDrawerType; onClose: () => void }) {
  if (!drawerType) {
    return null;
  }

  const isMemberProfile = drawerType === "member";
  const title = isMemberProfile ? "Member Profile" : "Edit Profile";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close profile editor" onClick={onClose} />
      <aside
        className="relative flex h-full w-full min-w-0 flex-col bg-white shadow-[0_30px_90px_-35px_rgba(15,23,42,0.65)] sm:max-w-[32rem]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-drawer-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <h2 id="profile-edit-drawer-title" className="text-2xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex size-10 shrink-0 items-center justify-center rounded-full text-slate-950 transition hover:bg-slate-100"
            aria-label="Close profile editor"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {isMemberProfile ? <MemberProfileDrawerFields /> : <PersonalInfoDrawerFields />}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
          <p className="mb-3 text-sm leading-6 text-slate-500">Profile saving is not available yet.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl border border-violet-300 bg-white px-5 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled
              className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-5 text-sm font-bold text-slate-500"
              title="Profile saving is not available yet."
            >
              Save
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function ProfileDetailsSection(props: DashboardOverviewProps) {
  const [activeDrawer, setActiveDrawer] = useState<ProfileDrawerType>(null);
  const memberProfile = getMemberProfileDetails(props);
  const personalInfo = getPersonalInfoDetails(props);

  return (
    <>
      <div className="space-y-4">
        <ProfileCard
          title="Member Profile"
          subtitle="Add your legal name and date of birth to complete your member profile. Please ensure the info matches your travel ID."
          rows={[
            { label: "Legal name", value: memberProfile.legalName },
            { label: "Date of birth", value: memberProfile.dateOfBirth },
          ]}
          onEdit={() => setActiveDrawer("member")}
        />
        <ProfileCard
          title="Personal info"
          subtitle="Enter your personal info to help us tailor your trips and discover nearby deals for you"
          rows={[
            { label: "Gender", value: personalInfo.gender },
            { label: "Display name", value: personalInfo.displayName },
            { label: "Nationality (country or region)", value: personalInfo.nationality },
            { label: "City of residence", value: personalInfo.cityOfResidence },
            { label: "Frequently visited city", value: personalInfo.frequentlyVisitedCity },
          ]}
          variant="grid"
          onEdit={() => setActiveDrawer("personal")}
        />
      </div>
      <ProfileEditDrawer drawerType={activeDrawer} onClose={() => setActiveDrawer(null)} />
    </>
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

export function DashboardOverview({ initials, displayName, userEmail, userName }: DashboardOverviewProps) {
  return (
    <div className="mx-auto min-w-0 max-w-[62rem] space-y-4 xl:max-w-[64rem]">
      <AccountIdentityHeader initials={initials} displayName={displayName} userEmail={userEmail} />
      <ProfileDetailsSection initials={initials} displayName={displayName} userEmail={userEmail} userName={userName} />
    </div>
  );
}

export function TripsDashboardPage() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border bg-surface-muted/70 px-5 py-5 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">My Trips</p>
        <h1 className="mt-2 text-3xl font-bold text-navy">My Trips</h1>
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

export function SecurityDashboardPage() {
  return (
    <section aria-labelledby="security-title" className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">Security</p>
        <h1 id="security-title" className="mt-2 text-3xl font-bold text-navy">Security</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Manage your account security and privacy settings.
        </p>
      </div>
      <div className="grid gap-3">
        <ListRow title="Password" body="Manage your password and sign-in security." icon={LockKeyhole} status="Coming soon" />
        <ListRow title="Two-step verification" body="Add an extra layer of protection to your account." icon={ShieldCheck} status="Coming soon" />
        <ListRow title="Active sessions" body="Review devices signed in to your account." icon={UserRound} status="Coming soon" />
        <ListRow title="Privacy" body="Review how your account information is used." href="/legal" icon={LockKeyhole} />
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
