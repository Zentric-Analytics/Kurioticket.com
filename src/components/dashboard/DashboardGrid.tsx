"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { useLocale } from "@/components/layout/LocaleProvider";
import { cn } from "@/lib/utils";
import type { TranslationDictionary } from "@/lib/i18n/types";

const navItems = [
  { labelKey: "accountDashboard.nav.overview", href: "/dashboard", icon: Grid2X2 },
  { labelKey: "accountDashboard.nav.trips", href: "/dashboard/trips", icon: BriefcaseBusiness },
  { labelKey: "accountDashboard.nav.saved", href: "/dashboard/saved", icon: Bookmark },
  { labelKey: "accountDashboard.nav.preference", href: "/dashboard/preferences", icon: Settings },
  { labelKey: "accountDashboard.nav.security", href: "/dashboard/security", icon: ShieldCheck },
  { labelKey: "accountDashboard.nav.support", href: "/dashboard/support", icon: LifeBuoy },
];

const mobileAccountNavItems = [
  { labelKey: "accountDashboard.personalDetails.title", href: "/dashboard", icon: UserRound },
  { labelKey: "accountDashboard.nav.trips", href: "/dashboard/trips", icon: BriefcaseBusiness },
  { labelKey: "accountDashboard.nav.saved", href: "/dashboard/saved", icon: Bookmark },
  { labelKey: "accountDashboard.nav.preference", href: "/dashboard/preferences", icon: Settings },
  { labelKey: "accountDashboard.nav.security", href: "/dashboard/security", icon: ShieldCheck },
  { labelKey: "accountDashboard.nav.support", href: "/dashboard/support", icon: LifeBuoy },
];

type AccountDashboardFrameProps = {
  children: ReactNode;
  mobileOverviewTabs?: boolean;
  mobileBackHref?: string;
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
  options?: Array<{ value: string; label: string }>;
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

type SecuritySettingRowProps = {
  title: string;
  body: string;
  action: string;
  danger?: boolean;
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

function SavedEmptyStateIllustration() {
  return (
    <div
      className="mx-auto flex size-20 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 shadow-[0_18px_42px_-28px_rgba(79,70,229,0.85)] sm:size-24"
      aria-hidden="true"
    >
      <Bookmark className="size-9 stroke-[1.8] sm:size-11" />
    </div>
  );
}

export function AccountDashboardFrame({ children, mobileOverviewTabs = false, mobileBackHref }: AccountDashboardFrameProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const resolvedMobileBackHref = mobileBackHref;

  return (
    <div
      className={cn(
        "grid min-w-0 items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15.75rem_minmax(0,1fr)]",
        mobileOverviewTabs && "gap-3 sm:gap-4",
      )}
    >
      <aside className="hidden min-w-0 lg:block" aria-label="Account navigation">
        <div
          className={cn(
            "border border-violet-100/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_50px_-52px_rgba(49,46,129,0.45)] backdrop-blur-[1px]",
            mobileOverviewTabs
              ? "-mx-4 border-x-0 bg-white px-4 py-0 shadow-none lg:mx-0 lg:rounded-[1.25rem] lg:border-x lg:border-black/25 lg:bg-violet-50/35 lg:p-2.5 lg:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_18px_50px_-52px_rgba(49,46,129,0.45)]"
              : "rounded-[1.25rem] bg-violet-50/35 p-2 lg:p-2.5",
          )}
        >
          <nav>
            <div
              className={cn(
                "flex min-w-0 flex-wrap lg:flex-col lg:flex-nowrap lg:gap-1.5",
                mobileOverviewTabs
                  ? "max-w-full flex-nowrap gap-x-6 gap-y-0 overflow-x-auto overscroll-x-contain [scrollbar-width:none] lg:gap-1.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
                  : "gap-2",
              )}
            >
              {navItems.map((item) => {
                const active = isActiveDashboardRoute(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "focus-ring flex items-center gap-2.5 text-[13px] font-semibold transition hover:bg-white/55 hover:text-violet-700 lg:rounded-xl lg:px-3.5 lg:py-2.5",
                      mobileOverviewTabs && "relative shrink-0 whitespace-nowrap rounded-none px-0 py-3 text-sm sm:text-[13px] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:after:hidden",
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
                    <span className="min-w-0 break-words leading-snug">{t[item.labelKey]}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="mt-5 hidden rounded-2xl border border-violet-100/60 bg-violet-50/45 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] lg:block lg:mt-14 xl:mt-16">
            <div className="mx-auto mb-2 flex justify-center opacity-85">
              <TravelIllustration compact />
            </div>
            <h2 className="text-[13px] font-semibold leading-snug text-slate-900">{t["accountDashboard.promo.title"]}</h2>
            <p className="mx-auto mt-1 max-w-36 text-[11px] leading-4 text-slate-600">{t["accountDashboard.promo.body"]}</p>
            <Link
              href="/flights"
              className="focus-ring mt-2.5 inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border border-violet-200/80 bg-white/75 px-3 text-[11px] font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-white"
            >
              <Plane className="size-3.5" aria-hidden="true" />
              {t["accountDashboard.promo.cta"]}
            </Link>
          </div>
        </div>
      </aside>
      <div className="min-w-0 space-y-3.5 sm:space-y-4">
        <MobileAccountBackLink href={resolvedMobileBackHref} />
        {children}
      </div>
    </div>
  );
}

export function MobileAccountBackLink({ href = "/dashboard/account" }: { href?: string }) {
  const { t } = useLocale();

  return (
    <Link
      href={href}
      aria-label={t["accountDashboard.mobile.backAriaLabel"]}
      className="focus-ring inline-flex min-h-10 items-center gap-1.5 rounded-full px-1 pr-3 text-sm font-black text-violet-700 transition hover:bg-violet-50 lg:hidden"
    >
      <span className="text-xl leading-none" aria-hidden="true">‹</span>
      <span>{t.myAccount}</span>
    </Link>
  );
}

export function MobileAccountMenuPage() {
  const { t } = useLocale();

  return (
    <section className="mx-auto max-w-2xl overflow-x-hidden lg:hidden" aria-labelledby="mobile-account-title">
      <div className="mb-5 px-1">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">Kurioticket</p>
        <h1 id="mobile-account-title" className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
          {t.myAccount}
        </h1>
      </div>

      <div className="overflow-hidden rounded-[1.35rem] border border-violet-100 bg-white shadow-[0_22px_58px_-48px_rgba(49,46,129,0.55)]">
        <div className="border-b border-slate-100 bg-violet-50/55 px-5 py-4">
          <h2 className="text-sm font-black text-slate-950">{t["accountDashboard.mobile.manageAccount"]}</h2>
        </div>

        <nav aria-label={t["accountDashboard.mobile.manageAccount"]}>
          {mobileAccountNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex min-h-14 w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-violet-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500"
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700 transition group-hover:bg-white">
                  <Icon className="size-4.5" strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 break-words text-base font-bold leading-snug text-slate-900">{t[item.labelKey]}</span>
                <ChevronRight className="size-5 shrink-0 text-slate-400 transition group-hover:text-violet-700" strokeWidth={2.2} aria-hidden="true" />
              </Link>
            );
          })}
        </nav>
      </div>
    </section>
  );
}

function AccountIdentityHeader({ initials, displayName, userEmail }: DashboardOverviewProps) {
  const { t } = useLocale();

  return (
    <section
      className="border-b border-slate-200/80 pb-4 sm:pb-5"
      aria-labelledby="dashboard-title"
    >
      <div className="flex min-w-0 items-center gap-3 px-1 py-1 sm:gap-5 sm:px-2 sm:py-3">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-800 text-xl font-bold text-white shadow-[0_18px_38px_-22px_rgba(79,70,229,0.9)] ring-1 ring-white/80 sm:size-18 sm:text-3xl"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <h1 id="dashboard-title" className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
            {t["accountDashboard.overview.welcome"].replace("{name}", displayName)} 👋
          </h1>
          {userEmail ? <p className="mt-1 break-all text-sm font-semibold text-slate-600 sm:mt-1.5 sm:break-words sm:text-sm">{userEmail}</p> : null}
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-700 sm:mt-2 sm:text-sm sm:leading-6">
            {t["accountDashboard.overview.subtitle"]}
          </p>
        </div>
      </div>
    </section>
  );
}

const genderOptions = [
  { value: "Male", labelKey: "accountDashboard.personalDetails.gender.male" },
  { value: "Female", labelKey: "accountDashboard.personalDetails.gender.female" },
  { value: "I prefer not to say", labelKey: "accountDashboard.personalDetails.gender.preferNotToSay" },
];
const dateOfBirthMonthOptions = [
  { value: "January", labelKey: "accountDashboard.personalDetails.month.january" },
  { value: "February", labelKey: "accountDashboard.personalDetails.month.february" },
  { value: "March", labelKey: "accountDashboard.personalDetails.month.march" },
  { value: "April", labelKey: "accountDashboard.personalDetails.month.april" },
  { value: "May", labelKey: "accountDashboard.personalDetails.month.may" },
  { value: "June", labelKey: "accountDashboard.personalDetails.month.june" },
  { value: "July", labelKey: "accountDashboard.personalDetails.month.july" },
  { value: "August", labelKey: "accountDashboard.personalDetails.month.august" },
  { value: "September", labelKey: "accountDashboard.personalDetails.month.september" },
  { value: "October", labelKey: "accountDashboard.personalDetails.month.october" },
  { value: "November", labelKey: "accountDashboard.personalDetails.month.november" },
  { value: "December", labelKey: "accountDashboard.personalDetails.month.december" },
];
const dateOfBirthMonths = dateOfBirthMonthOptions.map((month) => month.value);

const dateOfBirthDays = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));

const minDateOfBirthYear = 1900;
const currentDateOfBirthYear = new Date().getFullYear();
const dateOfBirthYears = Array.from(
  { length: currentDateOfBirthYear - minDateOfBirthYear + 1 },
  (_, index) => String(currentDateOfBirthYear - index),
);

function getPersonalDetailRows(t: TranslationDictionary): PersonalDetailRow[] {
  return [
    { key: "name", label: t["accountDashboard.personalDetails.name"], fallback: t["accountDashboard.personalDetails.addName"] },
    { key: "displayName", label: t["accountDashboard.personalDetails.displayName"], fallback: t["accountDashboard.personalDetails.chooseDisplayName"] },
    {
      key: "email",
      label: t["accountDashboard.personalDetails.emailAddress"],
      fallback: t["accountDashboard.personalDetails.addEmailAddress"],
      inputType: "email",
      readOnly: true,
    },
    {
      key: "phone",
      label: t["accountDashboard.personalDetails.phoneNumber"],
      fallback: t["accountDashboard.personalDetails.addPhoneNumber"],
      inputType: "tel",
    },
    { key: "dateOfBirth", label: t["accountDashboard.personalDetails.dateOfBirth"], fallback: t["accountDashboard.personalDetails.addDateOfBirth"] },
    {
      key: "gender",
      label: t["accountDashboard.personalDetails.gender"],
      fallback: t["accountDashboard.personalDetails.addGender"],
      options: genderOptions.map((option) => ({ value: option.value, label: t[option.labelKey] })),
    },
    { key: "nationality", label: t["accountDashboard.personalDetails.nationality"], fallback: t["accountDashboard.personalDetails.addNationality"] },
    { key: "address", label: t["accountDashboard.personalDetails.address"], fallback: t["accountDashboard.personalDetails.addAddress"], multiline: true },
  ];
}

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
      <p className={cn("break-words text-[15px] font-semibold leading-5 text-slate-900 sm:text-sm sm:leading-6", !value && "text-slate-500")}>{value || fallback}</p>
      {helper ? <p className="max-w-lg text-[13px] leading-5 text-slate-500 sm:text-sm sm:leading-6">{helper}</p> : null}
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
  const { t } = useLocale();
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
      <select className={className} value={parts.day} onChange={(event) => updatePart("day", event.target.value)} aria-label={t["accountDashboard.personalDetails.dateOfBirthDay"]}>
        <option value="" disabled hidden>
          DD
        </option>
        {dateOfBirthDays.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
      <select className={className} value={parts.month} onChange={(event) => updatePart("month", event.target.value)} aria-label={t["accountDashboard.personalDetails.dateOfBirthMonth"]}>
        <option value="" disabled hidden>
          {t["accountDashboard.personalDetails.monthPlaceholder"]}
        </option>
        {dateOfBirthMonthOptions.map((month) => (
          <option key={month.value} value={month.value}>
            {t[month.labelKey]}
          </option>
        ))}
      </select>
      <select className={className} value={parts.year} onChange={(event) => updatePart("year", event.target.value)} aria-label={t["accountDashboard.personalDetails.dateOfBirthYear"]}>
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
    "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[15px] font-medium text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 sm:py-2.5 sm:text-sm",
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
          <option key={option.value} value={option.value}>
            {option.label}
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
  const { t } = useLocale();
  const initialValues = getPersonalDetailsInitialValues(props);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PersonalDetailsDraft>(initialValues);
  const personalDetailRows = getPersonalDetailRows(t);

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
      <div className="flex min-w-0 flex-col gap-2 px-1 pb-3 pt-1 sm:gap-4 sm:px-2 sm:pb-5 sm:pt-2 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <h2 id="personal-details-title" className="text-[22px] font-bold tracking-tight text-slate-950 sm:text-2xl">
            {t["accountDashboard.personalDetails.title"]}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600 sm:mt-2 sm:text-sm sm:leading-6">
            {t["accountDashboard.personalDetails.subtitle"]}
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-200 border-y border-slate-200/90">
        {personalDetailRows.map((row) => {
          const readOnlyValue = initialValues[row.key];
          const editValue = draft[row.key];

          return (
            <div key={row.key} className="grid min-w-0 gap-1 px-1 py-2.5 sm:gap-1.5 sm:px-2 sm:py-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-start md:gap-5">
              <div className="text-[15px] font-semibold text-slate-700 sm:text-sm">{row.label}</div>
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

      <div className="px-1 py-4 sm:px-2 sm:py-5">
        {isEditing ? (
          <div className="flex min-w-0 flex-col gap-3 sm:items-end">
            <p className="text-sm leading-6 text-slate-500 sm:text-right">{t["accountDashboard.personalDetails.editingComingSoon"]}</p>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
              >
                {t["accountDashboard.personalDetails.cancel"]}
              </button>
              <button
                type="button"
                disabled
                className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 text-sm font-semibold text-slate-500"
              >
                {t["accountDashboard.personalDetails.saveChanges"]}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEdit}
              className="focus-ring inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-violet-700 px-5 text-[15px] font-semibold text-white shadow-[0_16px_34px_-22px_rgba(79,70,229,0.9)] transition hover:bg-violet-800 sm:min-h-11 sm:w-auto sm:text-sm"
            >
              {t["accountDashboard.personalDetails.edit"]}
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
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words font-semibold text-navy">{title}</h3>
          {status ? <span className="break-words rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">{status}</span> : null}
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-muted">{body}</p>
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


export function SavedDashboardPage() {
  const { t } = useLocale();

  return (
    <section className="mx-auto min-w-0 max-w-[62rem] space-y-4 xl:max-w-[64rem]" aria-labelledby="saved-dashboard-title">
      <div className="px-1 text-left sm:px-2">
        <h1 id="saved-dashboard-title" className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:font-bold">
          {t["accountDashboard.saved.title"]}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base lg:mx-0">
          {t["accountDashboard.saved.description"]}
        </p>
      </div>
      <div className="px-1 py-7 sm:px-2 sm:py-9 lg:overflow-hidden lg:rounded-[1.65rem] lg:border lg:border-slate-200/90 lg:bg-white lg:px-8 lg:py-14 lg:shadow-[0_24px_70px_-58px_rgba(49,46,129,0.7)] xl:px-10">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <SavedEmptyStateIllustration />
          <h2 className="mt-6 text-2xl font-black tracking-[-0.025em] text-slate-950 lg:text-[1.65rem] lg:font-bold">
            {t["accountDashboard.saved.emptyTitle"]}
          </h2>
          <p className="mx-auto mt-3 max-w-xs text-base leading-7 text-slate-600">
            {t["accountDashboard.saved.emptyDescription"]}
          </p>
          <LinkButton
            href="/"
            size="lg"
            className="mt-7 w-full rounded-xl bg-violet-700 px-8 text-white shadow-[0_18px_36px_-24px_rgba(79,70,229,0.95)] hover:bg-violet-800 sm:max-w-[19rem] lg:w-auto lg:min-w-36"
          >
            {t["accountDashboard.saved.explore"]}
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

export function PreferencesDashboardPage() {
  const { t } = useLocale();

  return (
    <section aria-labelledby="preferences-title" className="mx-auto min-w-0 max-w-[62rem] space-y-4 xl:max-w-[64rem]">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">
          {t["accountDashboard.preferences.eyebrow"]}
        </p>
        <h1 id="preferences-title" className="mt-2 text-3xl font-bold text-navy">
          {t["accountDashboard.preferences.title"]}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {t["accountDashboard.preferences.description"]}
        </p>
      </div>
      <div className="grid gap-3">
        <ListRow
          title={t["accountDashboard.preferences.personalDetails.title"]}
          body={t["accountDashboard.preferences.personalDetails.description"]}
          icon={UserRound}
          status={t["accountDashboard.preferences.comingSoon"]}
        />
        <ListRow
          title={t["accountDashboard.preferences.notifications.title"]}
          body={t["accountDashboard.preferences.notifications.description"]}
          icon={Mail}
          status={t["accountDashboard.preferences.comingSoon"]}
        />
        <ListRow
          title={t["accountDashboard.preferences.travel.title"]}
          body={t["accountDashboard.preferences.travel.description"]}
          icon={Settings}
          status={t["accountDashboard.preferences.comingSoon"]}
        />
        <ListRow
          title={t["accountDashboard.preferences.securityPrivacy.title"]}
          body={t["accountDashboard.preferences.securityPrivacy.description"]}
          href="/legal"
          icon={ShieldCheck}
        />
      </div>
    </section>
  );
}

function SecuritySettingRow({ title, body, action, danger = false }: SecuritySettingRowProps) {
  return (
    <div className="grid min-w-0 gap-3 px-1 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-2 sm:py-6">
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-[-0.01em] text-slate-950 sm:text-[17px]">{title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600">{body}</p>
      </div>
      <button
        type="button"
        className={cn(
          "focus-ring inline-flex min-h-10 w-full items-center justify-center rounded-xl border px-4 text-sm font-bold transition sm:w-auto",
          danger
            ? "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
            : "border-violet-200 bg-white text-violet-700 hover:border-violet-300 hover:bg-violet-50",
        )}
      >
        {action}
      </button>
    </div>
  );
}

export function SecurityDashboardPage() {
  const { t } = useLocale();

  return (
    <section aria-labelledby="security-title" className="mx-auto min-w-0 max-w-[62rem] space-y-5 xl:max-w-[64rem]">
      <div className="px-1 text-left sm:px-2">
        <h1 id="security-title" className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:font-bold">
          {t["accountDashboard.security.title"]}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {t["accountDashboard.security.description"]}
        </p>
      </div>
      <div className="divide-y divide-slate-200/90 border-y border-slate-200/90">
        <SecuritySettingRow
          title={t["accountDashboard.security.passkeys.title"]}
          body={t["accountDashboard.security.passkeys.description"]}
          action={t["accountDashboard.security.action.setUp"]}
        />
        <SecuritySettingRow
          title={t["accountDashboard.security.twoFactor.title"]}
          body={t["accountDashboard.security.twoFactor.description"]}
          action={t["accountDashboard.security.action.setUp"]}
        />
        <SecuritySettingRow
          title={t["accountDashboard.security.activeSessions.title"]}
          body={t["accountDashboard.security.activeSessions.description"]}
          action={t["accountDashboard.security.action.manage"]}
        />
        <SecuritySettingRow
          title={t["accountDashboard.security.deleteAccount.title"]}
          body={t["accountDashboard.security.deleteAccount.description"]}
          action={t["accountDashboard.security.action.deleteAccount"]}
          danger
        />
      </div>
    </section>
  );
}

export function SupportDashboardPage() {
  const { t } = useLocale();

  return (
    <section aria-labelledby="support-title" className="mx-auto min-w-0 max-w-[62rem] space-y-4 xl:max-w-[64rem]">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">
          {t["accountDashboard.support.eyebrow"]}
        </p>
        <h1 id="support-title" className="mt-2 text-3xl font-bold text-navy">
          {t["accountDashboard.support.title"]}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {t["accountDashboard.support.description"]}
        </p>
      </div>
      <div className="grid gap-3">
        <ListRow
          title={t["accountDashboard.support.helpCenter.title"]}
          body={t["accountDashboard.support.helpCenter.description"]}
          href="/support"
          icon={LifeBuoy}
        />
        <ListRow
          title={t["accountDashboard.support.contact.title"]}
          body={t["accountDashboard.support.contact.description"]}
          icon={Headphones}
          status={t["accountDashboard.support.comingSoon"]}
        />
        <ListRow
          title={t["accountDashboard.support.privacyData.title"]}
          body={t["accountDashboard.support.privacyData.description"]}
          href="/legal"
          icon={LockKeyhole}
        />
      </div>
    </section>
  );
}
