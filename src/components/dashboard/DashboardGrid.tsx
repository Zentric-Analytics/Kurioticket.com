"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
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

type PersonalDetailsDraft = {
  name: string;
  displayName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  address: string;
};

type PersonalDetailRow = {
  key: keyof PersonalDetailsDraft;
  label: string;
  fallback: string;
  helper?: string;
  inputType?: "text" | "tel" | "date" | "email";
  options?: string[];
  multiline?: boolean;
  readOnly?: boolean;
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
        "grid min-w-0 items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15.75rem_minmax(0,1fr)]",
        mobileOverviewTabs && "gap-3 sm:gap-4",
      )}
    >
      <aside className="min-w-0" aria-label="Account navigation">
        <div
          className={cn(
            "border border-violet-100/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_50px_-52px_rgba(49,46,129,0.45)] backdrop-blur-[1px]",
            mobileOverviewTabs
              ? "-mx-4 border-x-0 bg-white px-4 py-0 shadow-none lg:mx-0 lg:rounded-[1.25rem] lg:border-x lg:border-black/25 lg:bg-violet-50/35 lg:p-2.5 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_50px_-52px_rgba(49,46,129,0.45)]"
              : "rounded-[1.25rem] bg-violet-50/35 p-2 lg:p-2.5",
          )}
        >
          <nav>
            <div className={cn("flex min-w-0 flex-wrap lg:flex-col lg:flex-nowrap lg:gap-1.5", mobileOverviewTabs ? "gap-x-7 gap-y-0 lg:gap-1.5" : "gap-2")}>
              {navItems.map((item) => {
                const active = isActiveDashboardRoute(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex items-center gap-2.5 text-[13px] font-semibold transition hover:bg-white/55 hover:text-violet-700 lg:rounded-xl lg:px-3.5 lg:py-2.5",
                      mobileOverviewTabs && "relative whitespace-nowrap rounded-none px-0 py-3.5 text-[13px] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:after:hidden",
                      !mobileOverviewTabs && "rounded-xl px-3.5 py-2.5",
                      active
                        ? cn(
                          "text-violet-700 lg:bg-white/65 lg:shadow-[inset_0_0_0_1px_rgba(124,58,237,0.10),0_10px_26px_-24px_rgba(79,70,229,0.55)]",
                          mobileOverviewTabs && "after:bg-violet-700 lg:bg-white/65 lg:shadow-[inset_0_0_0_1px_rgba(124,58,237,0.10),0_10px_26px_-24px_rgba(79,70,229,0.55)]",
                        )
                        : "text-slate-800",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", mobileOverviewTabs && "hidden lg:block")} strokeWidth={active ? 2.35 : 2.1} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="mt-5 hidden rounded-2xl border border-violet-100/60 bg-violet-50/45 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] lg:block lg:mt-14 xl:mt-16">
            <div className="mx-auto mb-2 flex justify-center opacity-85">
              <TravelIllustration compact />
            </div>
            <h2 className="text-[13px] font-semibold text-slate-900">Book your next trip</h2>
            <p className="mx-auto mt-1 max-w-36 text-[11px] leading-4 text-slate-600">Find great deals on flights and hotels.</p>
            <Link
              href="/flights"
              className="focus-ring mt-2.5 inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-violet-200/80 bg-white/75 px-3 text-[11px] font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-white"
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

function AccountIdentityHeader({ initials, displayName, userEmail }: DashboardOverviewProps) {
  return (
    <section
      className="border-b border-slate-200/80 pb-5"
      aria-labelledby="dashboard-title"
    >
      <div className="flex min-w-0 items-center gap-4 px-1 py-2 sm:gap-5 sm:px-2 sm:py-3">
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

const genderOptions = ["Male", "Female", "I prefer not to say"];
const dateOfBirthMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dateOfBirthDays = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));

const minDateOfBirthYear = 1900;
const currentDateOfBirthYear = new Date().getFullYear();
const dateOfBirthYears = Array.from(
  { length: currentDateOfBirthYear - minDateOfBirthYear + 1 },
  (_, index) => String(currentDateOfBirthYear - index),
);

const personalDetailRows: PersonalDetailRow[] = [
  { key: "name", label: "Name", fallback: "Add your name" },
  { key: "displayName", label: "Display name", fallback: "Choose a display name" },
  {
    key: "email",
    label: "Email address",
    fallback: "Add your email address",
    inputType: "email",
    readOnly: true,
  },
  {
    key: "phone",
    label: "Phone number",
    fallback: "Add your phone number",
    inputType: "tel",
  },
  { key: "dateOfBirth", label: "Date of birth", fallback: "Add your date of birth" },
  { key: "gender", label: "Gender", fallback: "Add your gender", options: genderOptions },
  { key: "nationality", label: "Nationality", fallback: "Add your nationality" },
  { key: "address", label: "Address", fallback: "Add your address", multiline: true },
];

function getPersonalDetailsInitialValues({ displayName, userEmail, userName }: DashboardOverviewProps): PersonalDetailsDraft {
  const trimmedName = userName?.trim() ?? "";
  const trimmedDisplayName = trimmedName ? displayName.trim() : "";

  return {
    name: trimmedName,
    displayName: trimmedDisplayName,
    email: userEmail?.trim() ?? "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    nationality: "",
    address: "",
  };
}

function DetailValue({ value, fallback, helper }: { value: string; fallback: string; helper?: string }) {
  return (
    <div className="min-w-0 space-y-0.5 text-left">
      <p className={cn("break-words text-sm font-semibold leading-6 text-slate-900", !value && "text-slate-500")}>{value || fallback}</p>
      {helper ? <p className="max-w-lg text-sm leading-6 text-slate-500">{helper}</p> : null}
    </div>
  );
}

function normalizeDateOfBirthDay(day: string) {
  const normalizedDay = day.padStart(2, "0");

  return dateOfBirthDays.includes(normalizedDay) ? normalizedDay : "";
}

function parseDateOfBirthParts(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return { day: "", month: "", year: "" };
  }

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);

  if (isoDateMatch) {
    const [, year, monthNumber, day] = isoDateMatch;
    const monthIndex = Number(monthNumber) - 1;

    return {
      day: normalizeDateOfBirthDay(day),
      month: dateOfBirthMonths[monthIndex] ?? "",
      year,
    };
  }

  const [day = "", month = "", year = ""] = trimmedValue.split(/\s+/);

  return {
    day: normalizeDateOfBirthDay(day),
    month: dateOfBirthMonths.includes(month) ? month : "",
    year,
  };
}

function formatDateOfBirthParts(parts: { day: string; month: string; year: string }) {
  const normalizedDay = parts.day ? parts.day.padStart(2, "0") : "";

  return [normalizedDay, parts.month, parts.year].filter(Boolean).join(" ");
}

function DateOfBirthInput({ value, onChange, className }: { value: string; onChange: (value: string) => void; className: string }) {
  const [parts, setParts] = useState(() => parseDateOfBirthParts(value));

  const updatePart = (part: keyof typeof parts, nextValue: string) => {
    const nextParts = {
      ...parts,
      [part]: nextValue,
    };

    setParts(nextParts);
    onChange(formatDateOfBirthParts(nextParts));
  };

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
      <select className={className} value={parts.day} onChange={(event) => updatePart("day", event.target.value)} aria-label="Date of birth day">
        <option value="" disabled hidden>
          DD
        </option>
        {dateOfBirthDays.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
      <select className={className} value={parts.month} onChange={(event) => updatePart("month", event.target.value)} aria-label="Date of birth month">
        <option value="" disabled hidden>
          Month
        </option>
        {dateOfBirthMonths.map((month) => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>
      <select className={className} value={parts.year} onChange={(event) => updatePart("year", event.target.value)} aria-label="Date of birth year">
        <option value="" disabled hidden>
          YYYY
        </option>
        {dateOfBirthYears.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}

function DetailInput({ row, value, onChange }: { row: PersonalDetailRow; value: string; onChange: (key: keyof PersonalDetailsDraft, value: string) => void }) {
  const baseClassName = cn(
    "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100",
    row.readOnly && "cursor-not-allowed bg-slate-50 text-slate-500 focus:border-slate-200 focus:ring-0",
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    onChange(row.key, event.target.value);
  };

  if (row.key === "dateOfBirth") {
    return <DateOfBirthInput value={value} onChange={(nextValue) => onChange(row.key, nextValue)} className={baseClassName} />;
  }

  if (row.options) {
    return (
      <select className={baseClassName} value={value} onChange={handleChange} disabled={row.readOnly} aria-label={row.label}>
        <option value="" disabled hidden>
          {row.fallback}
        </option>
        {row.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (row.multiline) {
    return (
      <textarea
        className={cn(baseClassName, "min-h-28 resize-y")}
        value={value}
        onChange={handleChange}
        placeholder={row.fallback}
        readOnly={row.readOnly}
        rows={4}
      />
    );
  }

  return (
    <input
      className={baseClassName}
      type={row.inputType ?? "text"}
      value={value}
      onChange={handleChange}
      placeholder={row.fallback}
      readOnly={row.readOnly}
    />
  );
}

function PersonalDetailsSection(props: DashboardOverviewProps) {
  const initialValues = getPersonalDetailsInitialValues(props);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PersonalDetailsDraft>(initialValues);

  const handleEdit = () => {
    setDraft(initialValues);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(initialValues);
    setIsEditing(false);
  };

  const updateDraft = (key: keyof PersonalDetailsDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section
      className="min-w-0"
      aria-labelledby="personal-details-title"
    >
      <div className="flex min-w-0 flex-col gap-4 px-1 pb-5 pt-2 sm:px-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 id="personal-details-title" className="text-2xl font-bold tracking-tight text-slate-950">
            Personal details
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Update your information and manage how it is used across Kurioticket.
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-200 border-y border-slate-200/90">
        {personalDetailRows.map((row) => {
          const readOnlyValue = initialValues[row.key];
          const editValue = draft[row.key];

          return (
            <div key={row.key} className="grid min-w-0 gap-1.5 px-1 py-4 sm:px-2 md:grid-cols-[180px_minmax(0,1fr)] md:items-start md:gap-5">
              <div className="text-sm font-semibold text-slate-700">{row.label}</div>
              {isEditing ? (
                <div className="min-w-0 space-y-1.5">
                  <DetailInput row={row} value={editValue} onChange={updateDraft} />
                  {row.helper ? <p className="text-sm leading-6 text-slate-500">{row.helper}</p> : null}
                </div>
              ) : (
                <DetailValue value={readOnlyValue} fallback={row.fallback} helper={row.helper} />
              )}
            </div>
          );
        })}
      </div>

      <div className="px-1 py-5 sm:px-2">
        {isEditing ? (
          <div className="flex min-w-0 flex-col gap-3 sm:items-end">
            <p className="text-sm leading-6 text-slate-500 sm:text-right">Profile editing coming soon.</p>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled
                className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 text-sm font-semibold text-slate-500"
              >
                Save changes
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEdit}
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-violet-700 px-5 text-sm font-semibold text-white shadow-[0_16px_34px_-22px_rgba(79,70,229,0.9)] transition hover:bg-violet-800 sm:w-auto"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </section>
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
      <PersonalDetailsSection initials={initials} displayName={displayName} userEmail={userEmail} userName={userName} />
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
            <LinkButton href="/flights">Search flights</LinkButton>
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
            <LinkButton href="/flights" variant="secondary">Search flights</LinkButton>
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
