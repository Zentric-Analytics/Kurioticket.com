"use client";

import { useState, type ChangeEvent } from "react";
import Link from "next/link";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  ChevronRight,
  Headphones,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Plane,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { useLocale } from "@/components/layout/LocaleProvider";
import { cn } from "@/lib/utils";
import type { TranslationDictionary } from "@/lib/i18n/types";

type AccountDashboardRowItem = {
  labelKey: string;
  href: string;
  icon: LucideIcon;
};

type AccountDashboardPanelItem = {
  titleKey: string;
  icon: LucideIcon;
  rows: AccountDashboardRowItem[];
};

const accountDashboardPanels: AccountDashboardPanelItem[] = [
  {
    titleKey: "accountDashboard.hub.manageAccount",
    icon: UserRound,
    rows: [
      { labelKey: "accountDashboard.hub.personalDetails", href: "/dashboard", icon: UserRound },
      { labelKey: "accountDashboard.hub.securitySettings", href: "/dashboard/security", icon: ShieldCheck },
    ],
  },
  {
    titleKey: "accountDashboard.hub.travelActivity",
    icon: Plane,
    rows: [
      { labelKey: "accountDashboard.hub.myTrips", href: "/dashboard/trips", icon: BriefcaseBusiness },
      { labelKey: "accountDashboard.hub.savedTrips", href: "/dashboard/saved", icon: Bookmark },
      { labelKey: "accountDashboard.hub.priceAlerts", href: "/dashboard/alerts", icon: Bell },
    ],
  },
  {
    titleKey: "accountDashboard.hub.preferences",
    icon: SlidersHorizontal,
    rows: [
      { labelKey: "accountDashboard.hub.emailPreferences", href: "/dashboard/preferences/customization", icon: Mail },
      { labelKey: "accountDashboard.hub.travelPreferences", href: "/dashboard/preferences/booking", icon: Settings },
    ],
  },
  {
    titleKey: "accountDashboard.hub.helpAndSupport",
    icon: LifeBuoy,
    rows: [
      { labelKey: "accountDashboard.hub.contactSupport", href: "/dashboard/support", icon: Headphones },
    ],
  },
];


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
  onAction: () => void;
  statusId?: string;
};


function SavedEmptyStateIllustration() {
  return (
    <div className="relative mx-auto h-48 w-full max-w-[24rem] overflow-hidden sm:h-52" aria-hidden="true">
      <div className="absolute left-1/2 top-5 h-36 w-36 -translate-x-1/2 rounded-full bg-teal/10" />
      <div className="absolute bottom-4 left-1/2 h-8 w-[19rem] -translate-x-1/2 rounded-[100%] bg-navy/5 blur-sm" />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 384 208"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M72 66c34-24 64-29 90-15 26 13 31 42 59 49 25 6 43-12 72-7"
          stroke="currentColor"
          className="text-blue/30"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="8 12"
        />
        <path d="M48 80l118-34 8 96-118 34-8-96Z" className="fill-white" />
        <path d="M166 46l78 28 8 96-78-28-8-96Z" className="fill-surface-muted" />
        <path d="M244 74l92-28 8 96-92 28-8-96Z" className="fill-white" />
        <path d="M48 80l118-34 78 28 92-28 8 96-92 28-78-28-118 34-8-96Z" stroke="currentColor" className="text-navy/20" strokeWidth="3" strokeLinejoin="round" />
        <path d="M132 57l9 97M213 63l9 96M278 64l8 96" stroke="currentColor" className="text-navy/10" strokeWidth="3" />
        <path d="M108 116c18-21 49-27 74-13 21 11 29 33 50 39 16 4 31-2 46-15" stroke="currentColor" className="text-teal" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 11" />
        <g className="drop-shadow-sm">
          <path d="M117 54c-18 0-33 14-33 32 0 26 33 59 33 59s33-33 33-59c0-18-15-32-33-32Z" className="fill-teal" />
          <path d="M117 99c7-5 18-14 18-24 0-7-5-12-12-12-3 0-5 1-6 3-2-2-4-3-7-3-7 0-12 5-12 12 0 10 12 19 19 24Z" className="fill-white" />
        </g>
        <g className="drop-shadow-sm">
          <rect x="237" y="34" width="54" height="68" rx="16" className="fill-navy" />
          <path d="M252 34h24v37l-12-7-12 7V34Z" className="fill-blue" />
          <path d="M254 81h21" stroke="white" strokeWidth="4" strokeLinecap="round" opacity=".75" />
        </g>
        <path d="M290 108l35 10-22 9-6 21-13-31-24-9 30 0Z" className="fill-blue" />
        <path d="M290 108l35 10-22 9-6 21-13-31-24-9 30 0Z" stroke="white" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </div>
  );
}


export function AccountSectionHeader({ title, description, titleId }: { title: string; description: string; titleId?: string }) {
  return (
    <div className="px-1 pb-2 text-left sm:px-2 sm:pb-3">
      <h1 id={titleId} className="text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl lg:font-bold">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
    </div>
  );
}


function AccountDashboardRow({ row }: { row: AccountDashboardRowItem }) {
  const { t } = useLocale();
  const RowIcon = row.icon;

  return (
    <Link
      href={row.href}
      className="focus-ring group/row flex min-h-12 items-center gap-3 border-t border-slate-100 px-5 py-2 text-left transition duration-150 hover:bg-slate-50 focus-visible:relative focus-visible:z-10 sm:min-h-[52px]"
    >
      <RowIcon className="size-[18px] shrink-0 text-blue-600" strokeWidth={2} aria-hidden="true" />
      <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-slate-800">
        {t[row.labelKey]}
      </span>
      <ChevronRight className="size-[18px] shrink-0 text-slate-400 transition group-hover/row:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}

function AccountDashboardPanel({ panel }: { panel: AccountDashboardPanelItem }) {
  const { t } = useLocale();
  const PanelIcon = panel.icon;
  const title = t[panel.titleKey];

  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby={`account-panel-${panel.titleKey.replace(/[^a-z0-9]+/g, "-")}`}
    >
      <div className="flex items-center gap-3 px-5 pb-3.5 pt-[18px]">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100/80">
          <PanelIcon className="size-5" strokeWidth={2} aria-hidden="true" />
        </span>
        <h2 id={`account-panel-${panel.titleKey.replace(/[^a-z0-9]+/g, "-")}`} className="text-lg font-semibold leading-6 text-slate-900">
          {title}
        </h2>
      </div>

      <div>
        {panel.rows.map((row) => (
          <div key={`${row.href}-${row.labelKey}`}>
            <AccountDashboardRow row={row} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AccountMenuPage() {
  const { t } = useLocale();

  return (
    <section className="overflow-x-hidden" aria-labelledby="account-title">
      <header className="bg-[#4338CA] text-left">
        <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="max-w-2xl">
            <h1 id="account-title" className="text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:font-bold">
              {t["accountDashboard.hub.title"]}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">{t["accountDashboard.hub.description"]}</p>
          </div>
        </div>
      </header>

      <div className="bg-[#f3f7fc] px-4 pb-8 pt-0 sm:px-6 sm:pb-10 lg:px-8 lg:pb-11">
        <nav aria-label={t["accountDashboard.mobile.manageAccount"]} className="mx-auto -mt-2 grid max-w-[1120px] gap-4 sm:-mt-4 md:grid-cols-2 lg:gap-5">
          {accountDashboardPanels.map((panel) => (
            <AccountDashboardPanel key={panel.titleKey} panel={panel} />
          ))}
        </nav>
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
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby="dashboard-title"
    >
      <div>
        {personalDetailRows.map((row) => {
          const readOnlyValue = initialValues[row.key];
          const editValue = draft[row.key];

          return (
            <div key={row.key} className="grid min-w-0 gap-1 border-t border-slate-200 px-5 py-4 first:border-t-0 sm:min-h-16 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-center sm:gap-6 sm:px-6 sm:py-3">
              <div className="text-sm font-medium leading-5 text-slate-700 sm:text-slate-800">{row.label}</div>
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

      <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
        {isEditing ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-500">{t["accountDashboard.personalDetails.editingComingSoon"]}</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="focus-ring inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t["accountDashboard.personalDetails.cancel"]}
              </button>
              <button
                type="button"
                disabled
                className="inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-500"
              >
                {t["accountDashboard.personalDetails.saveChanges"]}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-stretch sm:justify-end">
            <button
              type="button"
              onClick={handleEdit}
              className="focus-ring inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-blue-700 bg-white px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 sm:w-auto"
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
  const { t } = useLocale();

  return (
    <div className="mx-auto min-w-0 max-w-[60rem] space-y-5 px-4 py-6 sm:px-6 sm:py-8 lg:px-6 lg:py-10">
      <AccountSectionHeader title={t["accountDashboard.personalDetails.title"]} description={t["accountDashboard.personalDetails.subtitle"]} titleId="dashboard-title" />
      <PersonalDetailsSection initials={initials} displayName={displayName} userEmail={userEmail} userName={userName} />
    </div>
  );
}


export function SavedDashboardPage() {
  const { t } = useLocale();

  return (
    <section className="mx-auto min-w-0 max-w-[72rem] bg-white pb-12 pt-3 sm:pt-6" aria-labelledby="saved-dashboard-title">
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 id="saved-dashboard-title" className="text-3xl font-black tracking-[-0.035em] text-navy sm:text-4xl lg:font-bold">
            {t["accountDashboard.saved.title"]}
          </h1>
        </div>
      </div>

      <div className="flex min-h-[34rem] items-start justify-center px-3 pb-10 pt-16 sm:min-h-[38rem] sm:pt-16 lg:min-h-[40rem] lg:pt-20">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
          <h2 className="text-2xl font-black tracking-[-0.035em] text-navy sm:text-3xl lg:font-bold">
            {t["accountDashboard.saved.emptyTitle"]}
          </h2>
          <div className="mt-2 w-full sm:mt-6">
            <SavedEmptyStateIllustration />
          </div>
          <p className="mx-auto mt-3 max-w-lg text-xs leading-5 text-slate-500 sm:mt-4 sm:text-sm sm:leading-6">
            {t["accountDashboard.saved.emptyDescription"]}
          </p>
          <LinkButton
            href="/dashboard/account"
            size="lg"
            className="mt-6 w-auto min-w-[8rem] rounded-lg bg-blue-600 px-8 text-white shadow-[0_18px_36px_-24px_rgba(37,99,235,0.9)] hover:bg-blue-700 sm:mt-4"
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
      <AccountSectionHeader title={t["accountDashboard.preferences.title"]} description={t["accountDashboard.preferences.description"]} titleId="preferences-title" />
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

function SecuritySettingRow({ title, body, action, danger = false, onAction, statusId }: SecuritySettingRowProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4 px-5 py-5 sm:min-h-[5.25rem] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-4">
      <div className="min-w-0 sm:pr-4">
        <h2 className="text-base font-semibold leading-6 text-slate-900 sm:text-[15px]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        aria-describedby={statusId}
        className={cn(
          "focus-ring inline-flex min-h-10 w-fit shrink-0 cursor-pointer items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold leading-5 transition sm:self-center",
          danger
            ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
            : "border-blue-200 text-blue-700 hover:border-blue-300 hover:bg-blue-50",
        )}
      >
        {action}
      </button>
    </div>
  );
}

export function SecurityDashboardPage() {
  const { t } = useLocale();
  const [actionMessage, setActionMessage] = useState("");
  const securityActionStatusId = "security-action-status";

  const handleUnavailableSecurityAction = () => {
    setActionMessage("This security action is not available yet.");
  };

  return (
    <section aria-labelledby="security-title" className="mx-auto min-w-0 max-w-[60rem] space-y-5 px-4 pt-6 sm:px-6 sm:pt-8 lg:px-6 lg:pt-10">
      <AccountSectionHeader title={t["accountDashboard.security.title"]} description={t["accountDashboard.security.description"]} titleId="security-title" />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_-38px_rgba(15,23,42,0.55)]">
        <div className="divide-y divide-slate-200">
          <SecuritySettingRow
            title={t["accountDashboard.security.passkeys.title"]}
            body={t["accountDashboard.security.passkeys.description"]}
            action={t["accountDashboard.security.action.setUp"]}
            onAction={handleUnavailableSecurityAction}
            statusId={securityActionStatusId}
          />
          <SecuritySettingRow
            title={t["accountDashboard.security.twoFactor.title"]}
            body={t["accountDashboard.security.twoFactor.description"]}
            action={t["accountDashboard.security.action.setUp"]}
            onAction={handleUnavailableSecurityAction}
            statusId={securityActionStatusId}
          />
          <SecuritySettingRow
            title={t["accountDashboard.security.activeSessions.title"]}
            body={t["accountDashboard.security.activeSessions.description"]}
            action={t["accountDashboard.security.action.manage"]}
            onAction={handleUnavailableSecurityAction}
            statusId={securityActionStatusId}
          />
          <SecuritySettingRow
            title={t["accountDashboard.security.deleteAccount.title"]}
            body={t["accountDashboard.security.deleteAccount.description"]}
            action={t["accountDashboard.security.action.deleteAccount"]}
            onAction={handleUnavailableSecurityAction}
            statusId={securityActionStatusId}
            danger
          />
        </div>
      </div>
      <p
        id={securityActionStatusId}
        role="status"
        aria-live="polite"
        className={cn(
          "px-1 text-sm font-medium leading-5 text-slate-600 sm:px-2",
          actionMessage ? "" : "sr-only",
        )}
      >
        {actionMessage}
      </p>
    </section>
  );
}

export function SupportDashboardPage() {
  const { t } = useLocale();

  return (
    <section aria-labelledby="support-title" className="mx-auto min-w-0 max-w-[62rem] space-y-4 xl:max-w-[64rem]">
      <AccountSectionHeader title={t["accountDashboard.support.title"]} description={t["accountDashboard.support.description"]} titleId="support-title" />
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
