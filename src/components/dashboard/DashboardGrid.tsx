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
  { labelKey: "accountDashboard.nav.priceAlerts", href: "/dashboard/alerts", icon: Bell },
  { labelKey: "accountDashboard.nav.preference", href: "/dashboard/preferences", icon: Settings },
  { labelKey: "accountDashboard.nav.security", href: "/dashboard/security", icon: ShieldCheck },
  { labelKey: "accountDashboard.nav.support", href: "/dashboard/support", icon: LifeBuoy },
];

const mobileAccountNavItems = [
  { labelKey: "accountDashboard.personalDetails.title", href: "/dashboard", icon: UserRound },
  { labelKey: "accountDashboard.nav.trips", href: "/dashboard/trips", icon: BriefcaseBusiness },
  { labelKey: "accountDashboard.nav.saved", href: "/dashboard/saved", icon: Bookmark },
  { labelKey: "accountDashboard.nav.priceAlerts", href: "/dashboard/alerts", icon: Bell },
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
    <svg
      className="mx-auto h-auto w-full max-w-[19rem] shrink-0 text-violet-700 drop-shadow-[0_28px_42px_rgba(79,70,229,0.14)] sm:max-w-[23rem] lg:mx-0 lg:max-w-[24rem]"
      viewBox="0 0 420 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="195" cy="138" r="112" fill="#ede9fe" />
      <circle cx="195" cy="138" r="82" fill="#f5f3ff" />
      <path d="M125 86c22 15 41 12 59 18 23 8 33 28 62 21 20-5 33-22 58-15" stroke="#ddd6fe" strokeWidth="11" strokeLinecap="round" />
      <path d="M99 158c30-13 62-4 85 14 36 28 60 19 86 1 20-14 40-13 58 0" stroke="#ddd6fe" strokeWidth="11" strokeLinecap="round" />
      <path d="M143 51c10 18 26 26 52 26M222 43c-8 24-3 46 15 66M103 117c28-7 45-32 45-57M268 60c-9 18-4 36 14 54" stroke="#c4b5fd" strokeWidth="5" strokeLinecap="round" opacity=".72" />
      <path d="M261 96c23-18 49-27 76-29" stroke="#7c3aed" strokeWidth="3" strokeDasharray="9 8" strokeLinecap="round" />
      <path d="M337 51l11 16 18-3 4 7-16 8 4 19-7 3-11-17-19 4-4-7 17-9-4-18 7-3Z" fill="#4f46e5" />
      <circle cx="76" cy="170" r="7" fill="#c4b5fd" />
      <circle cx="356" cy="162" r="4" fill="#c4b5fd" />
      <circle cx="92" cy="201" r="3.5" fill="#ddd6fe" />
      <ellipse cx="202" cy="329" rx="154" ry="10" fill="#ddd6fe" opacity=".95" />

      <rect x="60" y="224" width="64" height="96" rx="8" fill="#8b5cf6" />
      <path d="M77 224v-23c0-5 4-9 9-9h13c5 0 9 4 9 9v23" stroke="#6d28d9" strokeWidth="8" strokeLinecap="round" />
      <path d="M79 242v58M96 242v58M113 242v58" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" opacity=".75" />
      <circle cx="76" cy="324" r="6" fill="#312e81" />
      <circle cx="112" cy="324" r="6" fill="#312e81" />

      <path d="M204 314c-33-2-51-11-55-30-4-18 7-37 24-52l49 12 17 50c-6 14-17 21-35 20Z" fill="#312e81" />
      <path d="M231 320h87c-13-38-39-61-77-69l-34 9c-5 26 3 46 24 60Z" fill="#312e81" />
      <path d="M166 206c8-29 24-45 50-46 27 1 45 17 53 48l-24 73h-79v-75Z" fill="#5b36e6" />
      <path d="M194 158c-2 12 2 22 13 28 11 0 19-5 24-15v-30l-31-7-6 24Z" fill="#ffd0b5" />
      <path d="M216 166c5 0 12-4 16-10v16c-5 7-13 11-23 11-7-4-11-10-13-18 6 1 13 1 20 1Z" fill="#e9a384" opacity=".55" />
      <path d="M175 139c-3-23 12-40 35-39 21 1 35 17 34 38-6 6-13 7-20 3-6-3-10-8-18-5-9 3-14 10-31 3Z" fill="#22146f" />
      <circle cx="175" cy="133" r="18" fill="#22146f" />
      <path d="M197 140c8-14 26-10 34 1v17c-2 12-10 20-22 22-15-3-23-12-24-28 2-8 6-12 12-12Z" fill="#ffd0b5" />
      <circle cx="215" cy="153" r="2.8" fill="#111827" />
      <path d="M229 153c4 3 4 8 0 12M210 169c8 5 16 4 23-3" stroke="#2e1065" strokeWidth="3" strokeLinecap="round" />
      <path d="M240 224c17 10 33 8 48-6" stroke="#ffd0b5" strokeWidth="16" strokeLinecap="round" />
      <path d="M289 218c8-9 12-19 12-29" stroke="#ffd0b5" strokeWidth="14" strokeLinecap="round" />
      <path d="M159 218c-9 20-8 39 5 58" stroke="#ffd0b5" strokeWidth="16" strokeLinecap="round" />
      <path d="M166 274c14 3 28-3 42-17" stroke="#ffd0b5" strokeWidth="14" strokeLinecap="round" />
      <path d="M262 193c19-35 67-22 70 18 2 28-24 48-69 79-45-31-71-51-69-79 3-40 51-53 68-18Z" fill="#4f46e5" />
      <path d="M278 211h28v55l-14-10-14 10v-55Z" fill="#fff" opacity=".92" />
      <path d="M205 253c11-1 24-7 37-19" stroke="#ffd0b5" strokeWidth="14" strokeLinecap="round" />
      <path d="M168 205c-10 14-15 29-15 45M263 203c11 16 16 31 14 47" stroke="#4421c8" strokeWidth="10" strokeLinecap="round" />

      <path d="M334 317c-12-38 0-68 39-91-1 43-14 73-39 91Z" fill="#8b5cf6" opacity=".78" />
      <path d="M349 316c4-32 22-55 53-70-4 41-21 65-53 70Z" fill="#7c3aed" opacity=".66" />
      <rect x="328" y="306" width="49" height="24" rx="4" fill="#a78bfa" />
    </svg>
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
    <section className="mx-auto min-w-0 max-w-[62rem] space-y-6 xl:max-w-[64rem]" aria-labelledby="saved-dashboard-title">
      <div className="px-1 text-left sm:px-2">
        <h1 id="saved-dashboard-title" className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
          {t["accountDashboard.saved.title"]}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base lg:mx-0">
          {t["accountDashboard.saved.description"]}
        </p>
      </div>
      <div className="px-1 py-7 sm:px-2 sm:py-9 lg:overflow-hidden lg:rounded-[1.65rem] lg:border lg:border-slate-200/90 lg:bg-white lg:px-8 lg:py-14 lg:shadow-[0_24px_70px_-58px_rgba(49,46,129,0.7)] xl:px-10">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(17rem,0.92fr)_minmax(0,1fr)] lg:gap-14">
          <SavedEmptyStateIllustration />
          <div className="mx-auto max-w-md text-center lg:mx-0 lg:text-left">
            <h2 className="text-2xl font-black tracking-[-0.025em] text-slate-950 lg:text-[1.65rem]">
              {t["accountDashboard.saved.emptyTitle"]}
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-base leading-7 text-slate-600 lg:mx-0">
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
      </div>
    </section>
  );
}

export function PreferencesDashboardPage() {
  const { t } = useLocale();

  return (
    <section aria-labelledby="preferences-title" className="space-y-4">
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

export function SecurityDashboardPage() {
  const { t } = useLocale();

  return (
    <section aria-labelledby="security-title" className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-dark">
          {t["accountDashboard.security.eyebrow"]}
        </p>
        <h1 id="security-title" className="mt-2 text-3xl font-bold text-navy">
          {t["accountDashboard.security.title"]}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {t["accountDashboard.security.description"]}
        </p>
      </div>
      <div className="grid gap-3">
        <ListRow
          title={t["accountDashboard.security.password.title"]}
          body={t["accountDashboard.security.password.description"]}
          icon={LockKeyhole}
          status={t["accountDashboard.security.comingSoon"]}
        />
        <ListRow
          title={t["accountDashboard.security.twoStep.title"]}
          body={t["accountDashboard.security.twoStep.description"]}
          icon={ShieldCheck}
          status={t["accountDashboard.security.comingSoon"]}
        />
        <ListRow
          title={t["accountDashboard.security.activeSessions.title"]}
          body={t["accountDashboard.security.activeSessions.description"]}
          icon={UserRound}
          status={t["accountDashboard.security.comingSoon"]}
        />
        <ListRow
          title={t["accountDashboard.security.privacy.title"]}
          body={t["accountDashboard.security.privacy.description"]}
          href="/legal"
          icon={LockKeyhole}
        />
      </div>
    </section>
  );
}

export function SupportDashboardPage() {
  const { t } = useLocale();

  return (
    <section aria-labelledby="support-title" className="space-y-4">
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
