"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Headphones,
  LifeBuoy,
  LockKeyhole,
  Mail,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { useLocale } from "@/components/layout/LocaleProvider";
import { personalDetailsCountryOptions } from "@/lib/region/supportedRegions";
import { cn } from "@/lib/utils";
import type { TranslationDictionary } from "@/lib/i18n/types";
import type { UserProfileResponse } from "@/lib/userProfile";

const RawImage = "img";

type TwoFactorStatus = {
  enabled: boolean;
  method: string | null;
  enabledAt: string | null;
  disabledAt: string | null;
  recoveryCodesRemaining?: number;
};

type TotpSetup = { otpauthUri: string; manualSetupKey: string; expiresAt: string };
type TwoFactorMode = "setup" | "disable" | "recovery";

type PasskeySummary = { id: string; name: string | null; createdAt: string; lastUsedAt: string | null; deviceType: string | null; backedUp: boolean | null; label?: string | null; };

type AccountSessionActivity = {
  id: string;
  deviceLabel: string;
  browser: string;
  os: string;
  maskedIp: string | null;
  locationLabel: string | null;
  lastSeenAt: string;
  createdAt: string;
  revokedAt: string | null;
  isCurrent: boolean;
};

function formatSessionTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

type AccountDashboardRowItem = {
  labelKey: string;
  href: string;
  icon: LucideIcon;
};

type AccountDashboardPanelItem = {
  titleKey: string;
  rows: AccountDashboardRowItem[];
};

const accountDashboardPanels: AccountDashboardPanelItem[] = [
  {
    titleKey: "accountDashboard.hub.manageAccount",
    rows: [
      {
        labelKey: "accountDashboard.hub.personalDetails",
        href: "/dashboard",
        icon: UserRound,
      },
      {
        labelKey: "accountDashboard.hub.securitySettings",
        href: "/dashboard/security",
        icon: ShieldCheck,
      },
    ],
  },
  {
    titleKey: "accountDashboard.hub.travelActivity",
    rows: [
      {
        labelKey: "accountDashboard.hub.myTrips",
        href: "/dashboard/trips",
        icon: BriefcaseBusiness,
      },
      {
        labelKey: "accountDashboard.hub.savedTrips",
        href: "/saved?from=account",
        icon: Bookmark,
      },
      {
        labelKey: "accountDashboard.hub.priceAlerts",
        href: "/dashboard/alerts?from=account",
        icon: Bell,
      },
    ],
  },
  {
    titleKey: "accountDashboard.hub.preferences",
    rows: [
      {
        labelKey: "accountDashboard.hub.emailPreferences",
        href: "/dashboard/preferences/customization",
        icon: Mail,
      },
      {
        labelKey: "accountDashboard.hub.travelPreferences",
        href: "/dashboard/preferences/booking",
        icon: Settings,
      },
    ],
  },
  {
    titleKey: "accountDashboard.hub.helpAndSupport",
    rows: [
      {
        labelKey: "accountDashboard.hub.contactSupport",
        href: "/dashboard/support",
        icon: Headphones,
      },
      {
        labelKey: "accountDashboard.hub.faq",
        href: "/faq?from=account",
        icon: CircleHelp,
      },
    ],
  },
];

type DashboardOverviewProps = {
  initials: string;
  displayName: string;
  userEmail?: string | null;
  userName?: string | null;
  userProfile?: UserProfileResponse;
};

type PersonalDetailsDraft = {
  name: string;
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
  action?: string;
  status?: string;
  danger?: boolean;
  onAction: () => void;
  statusId?: string;
};

function formatAccountWelcome(template: string, name: string) {
  return template.replace("{name}", name);
}

function SavedEmptyStateIllustration() {
  return (
    <div
      className="relative mx-auto h-48 w-full max-w-[24rem] overflow-hidden sm:h-52"
      aria-hidden="true"
    >
      <div className="absolute start-1/2 top-5 h-36 w-36 -translate-x-1/2 rounded-full bg-teal/10" />
      <div className="absolute bottom-4 start-1/2 h-8 w-[19rem] -translate-x-1/2 rounded-[100%] bg-navy/5 blur-sm" />
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
        <path
          d="M166 46l78 28 8 96-78-28-8-96Z"
          className="fill-surface-muted"
        />
        <path d="M244 74l92-28 8 96-92 28-8-96Z" className="fill-white" />
        <path
          d="M48 80l118-34 78 28 92-28 8 96-92 28-78-28-118 34-8-96Z"
          stroke="currentColor"
          className="text-navy/20"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M132 57l9 97M213 63l9 96M278 64l8 96"
          stroke="currentColor"
          className="text-navy/10"
          strokeWidth="3"
        />
        <path
          d="M108 116c18-21 49-27 74-13 21 11 29 33 50 39 16 4 31-2 46-15"
          stroke="currentColor"
          className="text-teal"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="1 11"
        />
        <g className="drop-shadow-sm">
          <path
            d="M117 54c-18 0-33 14-33 32 0 26 33 59 33 59s33-33 33-59c0-18-15-32-33-32Z"
            className="fill-teal"
          />
          <path
            d="M117 99c7-5 18-14 18-24 0-7-5-12-12-12-3 0-5 1-6 3-2-2-4-3-7-3-7 0-12 5-12 12 0 10 12 19 19 24Z"
            className="fill-white"
          />
        </g>
        <g className="drop-shadow-sm">
          <rect
            x="237"
            y="34"
            width="54"
            height="68"
            rx="16"
            className="fill-navy"
          />
          <path d="M252 34h24v37l-12-7-12 7V34Z" className="fill-blue" />
          <path
            d="M254 81h21"
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".75"
          />
        </g>
        <path
          d="M290 108l35 10-22 9-6 21-13-31-24-9 30 0Z"
          className="fill-blue"
        />
        <path
          d="M290 108l35 10-22 9-6 21-13-31-24-9 30 0Z"
          stroke="white"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function AccountSectionHeader({
  title,
  description,
  titleId,
  flushStart = false,
}: {
  title: string;
  description: string;
  titleId?: string;
  flushStart?: boolean;
}) {
  return (
    <div
      className={cn(
        "pb-2 text-start sm:pb-3",
        flushStart ? "px-0" : "px-1 sm:px-2",
      )}
    >
      <h1
        id={titleId}
        className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]"
      >
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function AccountDashboardRow({ row }: { row: AccountDashboardRowItem }) {
  const { t } = useLocale();
  const RowIcon = row.icon;

  return (
    <Link
      href={row.href}
      className="focus-ring group/row flex min-h-12 items-center gap-3 border-t border-slate-100 px-5 py-2 text-start transition duration-150 hover:bg-slate-50 focus-visible:relative focus-visible:z-10 sm:min-h-[52px]"
    >
      <RowIcon
        className="size-[18px] shrink-0 text-blue-600"
        strokeWidth={2}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1 text-sm font-medium leading-5 text-slate-800">
        {t[row.labelKey]}
      </span>
      <ChevronRight
        className="size-[18px] shrink-0 text-slate-400 transition group-hover/row:translate-x-0.5"
        strokeWidth={2}
        aria-hidden="true"
      />
    </Link>
  );
}

function AccountDashboardPanel({
  panel,
}: {
  panel: AccountDashboardPanelItem;
}) {
  const { t } = useLocale();
  const title = t[panel.titleKey];

  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      aria-labelledby={`account-panel-${panel.titleKey.replace(/[^a-z0-9]+/g, "-")}`}
    >
      <div className="px-5 pb-3.5 pt-[18px]">
        <h2
          id={`account-panel-${panel.titleKey.replace(/[^a-z0-9]+/g, "-")}`}
          className="text-lg font-semibold leading-6 text-slate-900"
        >
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

export function AccountMenuPage({
  initials,
  displayName,
  userEmail,
}: Pick<DashboardOverviewProps, "initials" | "displayName" | "userEmail">) {
  const { t } = useLocale();
  return (
    <section className="overflow-x-hidden" aria-labelledby="account-title">
      <div className="px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10 lg:px-8 lg:pb-11 lg:pt-12">
        <div className="mx-auto max-w-[1120px] space-y-5">
          <header
            className="rounded-2xl border border-slate-200/80 bg-white p-[18px] text-start shadow-sm sm:p-6"
            aria-label={t["accountDashboard.hub.title"]}
          >
            <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-700 text-lg font-bold uppercase tracking-[-0.02em] text-white shadow-sm ring-1 ring-blue-200/70 sm:size-16 sm:text-xl">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <h1
                  id="account-title"
                  className="text-xl font-bold leading-7 tracking-[-0.03em] text-slate-950 [overflow-wrap:anywhere] sm:truncate sm:text-3xl sm:leading-tight sm:tracking-[-0.035em]"
                >
                  {formatAccountWelcome(
                    t["accountDashboard.overview.welcome"],
                    displayName,
                  )}{" "}
                  👋
                </h1>
                {userEmail ? (
                  <p className="mt-0.5 truncate text-sm leading-5 text-slate-500 sm:mt-1 sm:text-sm sm:text-slate-600">
                    {userEmail}
                  </p>
                ) : null}
                <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-600 sm:mt-2 sm:text-base sm:leading-6">
                  <span className="sm:hidden">
                    {t["accountDashboard.hub.mobileDescription"]}
                  </span>
                  <span className="hidden sm:inline">
                    {t["accountDashboard.hub.description"]}
                  </span>
                </p>
              </div>
            </div>
          </header>

          <nav
            aria-label={t["accountDashboard.mobile.manageAccount"]}
            className="grid gap-4 md:grid-cols-2 lg:gap-5"
          >
            {accountDashboardPanels.map((panel) => (
              <AccountDashboardPanel key={panel.titleKey} panel={panel} />
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}

const friendlyCountryLabelByIsoCode: Record<string, string> = {
  BO: "Bolivia",
  BN: "Brunei",
  CD: "Democratic Republic of the Congo",
  FM: "Micronesia",
  IR: "Iran",
  KP: "North Korea",
  KR: "South Korea",
  LA: "Laos",
  MD: "Moldova",
  PS: "Palestine",
  RU: "Russia",
  SY: "Syria",
  TZ: "Tanzania",
  VA: "Vatican City",
  VE: "Venezuela",
  VN: "Vietnam",
};

function getFriendlyCountryLabel(region: { code: string; country: string }) {
  return friendlyCountryLabelByIsoCode[region.code] ?? region.country;
}

const countryCallingCodeByIsoCode: Record<string, string> = {
  AF: "+93", AL: "+355", DZ: "+213", AD: "+376", AO: "+244", AG: "+1", AR: "+54", AM: "+374", AU: "+61", AT: "+43", AZ: "+994",
  BS: "+1", BH: "+973", BD: "+880", BB: "+1", BY: "+375", BE: "+32", BZ: "+501", BJ: "+229", BT: "+975", BO: "+591", BA: "+387", BW: "+267", BR: "+55", BN: "+673", BG: "+359", BF: "+226", BI: "+257",
  CV: "+238", KH: "+855", CM: "+237", CA: "+1", CF: "+236", TD: "+235", CL: "+56", CN: "+86", CO: "+57", KM: "+269", CG: "+242", CD: "+243", CR: "+506", HR: "+385", CU: "+53", CY: "+357", CZ: "+420", CI: "+225",
  DK: "+45", DJ: "+253", DM: "+1", DO: "+1", EC: "+593", EG: "+20", SV: "+503", GQ: "+240", ER: "+291", EE: "+372", SZ: "+268", ET: "+251", FJ: "+679", FI: "+358", FR: "+33",
  GA: "+241", GM: "+220", GE: "+995", DE: "+49", GH: "+233", GR: "+30", GD: "+1", GT: "+502", GN: "+224", GW: "+245", GY: "+592", HT: "+509", VA: "+39", HN: "+504", HU: "+36",
  IS: "+354", IN: "+91", ID: "+62", IR: "+98", IQ: "+964", IE: "+353", IL: "+972", IT: "+39", JM: "+1", JP: "+81", JO: "+962", KZ: "+7", KE: "+254", KI: "+686", KP: "+850", KR: "+82", KW: "+965", KG: "+996", LA: "+856",
  LV: "+371", LB: "+961", LS: "+266", LR: "+231", LY: "+218", LI: "+423", LT: "+370", LU: "+352", MG: "+261", MW: "+265", MY: "+60", MV: "+960", ML: "+223", MT: "+356", MH: "+692", MR: "+222", MU: "+230", MX: "+52", FM: "+691", MD: "+373", MC: "+377", MN: "+976", ME: "+382", MA: "+212", MZ: "+258", MM: "+95",
  NA: "+264", NR: "+674", NP: "+977", NL: "+31", NZ: "+64", NI: "+505", NE: "+227", NG: "+234", MK: "+389", NO: "+47", OM: "+968", PK: "+92", PW: "+680", PS: "+970", PA: "+507", PG: "+675", PY: "+595", PE: "+51", PH: "+63", PL: "+48", PT: "+351", QA: "+974", RO: "+40", RU: "+7", RW: "+250",
  KN: "+1", LC: "+1", VC: "+1", WS: "+685", SM: "+378", ST: "+239", SA: "+966", SN: "+221", RS: "+381", SC: "+248", SL: "+232", SG: "+65", SK: "+421", SI: "+386", SB: "+677", SO: "+252", ZA: "+27", SS: "+211", ES: "+34", LK: "+94", SD: "+249", SR: "+597", SE: "+46", CH: "+41", SY: "+963", TW: "+886", TJ: "+992", TZ: "+255", TH: "+66", TL: "+670", TG: "+228", TO: "+676", TT: "+1", TN: "+216", TR: "+90", TM: "+993", TV: "+688", UG: "+256", UA: "+380", AE: "+971", GB: "+44", US: "+1", UY: "+598", UZ: "+998", VU: "+678", VE: "+58", VN: "+84", YE: "+967", ZM: "+260", ZW: "+263",
};

type CountryProfileOption = {
  countryName: string;
  isoCode: string;
  dialCode?: string;
};

function getFlagImageUrl(countryCode: string) {
  return `https://flagcdn.com/${countryCode.toLowerCase()}.svg`;
}

function CountryFlagIcon({
  countryName,
  isoCode,
  className,
}: {
  countryName: string;
  isoCode: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100",
        className,
      )}
    >
      <RawImage
        src={getFlagImageUrl(isoCode)}
        alt={`${countryName} flag`}
        width={36}
        height={36}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}

function sortCountryProfileOptions(
  left: CountryProfileOption,
  right: CountryProfileOption,
) {
  return left.countryName.localeCompare(right.countryName);
}

const countryProfileOptions: CountryProfileOption[] = personalDetailsCountryOptions
  .map((region) => ({
    countryName: getFriendlyCountryLabel(region),
    isoCode: region.code,
    dialCode: countryCallingCodeByIsoCode[region.code],
  }))
  .sort(sortCountryProfileOptions);

const personalDetailsDropdownOptions = personalDetailsCountryOptions
  .map((region) => ({
    value: region.code,
    label: getFriendlyCountryLabel(region),
  }))
  .sort((left, right) => left.label.localeCompare(right.label));

const nationalityDropdownOptions = personalDetailsCountryOptions
  .map((region) => ({
    value: getFriendlyCountryLabel(region),
    label: getFriendlyCountryLabel(region),
  }))
  .sort((left, right) => left.label.localeCompare(right.label));

const countryCallingCodeOptions = countryProfileOptions.filter(
  (option): option is CountryProfileOption & { dialCode: string } =>
    Boolean(option.dialCode),
);

const defaultCountryCallingCodeOption =
  countryCallingCodeOptions.find((option) => option.isoCode === "NG") ??
  countryCallingCodeOptions[0];

const genderOptions = [
  { value: "Male", labelKey: "accountDashboard.personalDetails.gender.male" },
  {
    value: "Female",
    labelKey: "accountDashboard.personalDetails.gender.female",
  },
  {
    value: "I prefer not to say",
    labelKey: "accountDashboard.personalDetails.gender.preferNotToSay",
  },
];
const dateOfBirthMonthOptions = [
  {
    value: "January",
    labelKey: "accountDashboard.personalDetails.month.january",
  },
  {
    value: "February",
    labelKey: "accountDashboard.personalDetails.month.february",
  },
  { value: "March", labelKey: "accountDashboard.personalDetails.month.march" },
  { value: "April", labelKey: "accountDashboard.personalDetails.month.april" },
  { value: "May", labelKey: "accountDashboard.personalDetails.month.may" },
  { value: "June", labelKey: "accountDashboard.personalDetails.month.june" },
  { value: "July", labelKey: "accountDashboard.personalDetails.month.july" },
  {
    value: "August",
    labelKey: "accountDashboard.personalDetails.month.august",
  },
  {
    value: "September",
    labelKey: "accountDashboard.personalDetails.month.september",
  },
  {
    value: "October",
    labelKey: "accountDashboard.personalDetails.month.october",
  },
  {
    value: "November",
    labelKey: "accountDashboard.personalDetails.month.november",
  },
  {
    value: "December",
    labelKey: "accountDashboard.personalDetails.month.december",
  },
];
const dateOfBirthMonths = dateOfBirthMonthOptions.map((month) => month.value);

const personalDetailsFieldOrder: Array<keyof PersonalDetailsDraft> = [
  "name",
  "email",
  "phone",
  "dateOfBirth",
  "gender",
  "nationality",
  "address",
];

const dateOfBirthDays = Array.from({ length: 31 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);

const minDateOfBirthYear = 1900;
const currentDateOfBirthYear = new Date().getFullYear();
const dateOfBirthYears = Array.from(
  { length: currentDateOfBirthYear - minDateOfBirthYear + 1 },
  (_, index) => String(currentDateOfBirthYear - index),
);

function getPersonalDetailRows(t: TranslationDictionary): PersonalDetailRow[] {
  return [
    {
      key: "name",
      label: t["accountDashboard.personalDetails.name"],
      fallback: t["accountDashboard.personalDetails.addName"],
    },
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
    {
      key: "dateOfBirth",
      label: t["accountDashboard.personalDetails.dateOfBirth"],
      fallback: t["accountDashboard.personalDetails.addDateOfBirth"],
    },
    {
      key: "gender",
      label: t["accountDashboard.personalDetails.gender"],
      fallback: t["accountDashboard.personalDetails.addGender"],
      options: genderOptions.map((option) => ({
        value: option.value,
        label: t[option.labelKey],
      })),
    },
    {
      key: "nationality",
      label: t["accountDashboard.personalDetails.nationality"],
      fallback: t["accountDashboard.personalDetails.addNationality"],
    },
    {
      key: "address",
      label: t["accountDashboard.personalDetails.address"],
      fallback: t["accountDashboard.personalDetails.addAddress"],
      multiline: true,
    },
  ];
}

function getPersonalDetailsInitialValues({
  userEmail,
  userProfile,
}: DashboardOverviewProps): PersonalDetailsDraft {
  return {
    name: userProfile?.fullName?.trim() ?? "",
    email: userEmail?.trim() ?? "",
    phone: userProfile?.phoneNumber ?? "",
    dateOfBirth: userProfile?.dateOfBirth ?? "",
    gender: userProfile?.gender ?? "",
    nationality: userProfile?.nationality ?? "",
    address: userProfile?.address ?? "",
  };
}

function DetailValue({
  value,
  fallback,
  helper,
  preserveLines = false,
}: {
  value: string;
  fallback: string;
  helper?: string;
  preserveLines?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-0.5 text-start">
      <p
        className={cn(
          "break-words text-sm font-medium leading-6 text-slate-700",
          preserveLines && "whitespace-pre-line",
          !value && "text-slate-500",
        )}
      >
        {value || fallback}
      </p>
      {helper ? (
        <p className="max-w-lg text-sm leading-6 text-slate-500">{helper}</p>
      ) : null}
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

function formatDateOfBirthParts(parts: {
  day: string;
  month: string;
  year: string;
}) {
  const normalizedDay = parts.day ? parts.day.padStart(2, "0") : "";

  return [normalizedDay, parts.month, parts.year].filter(Boolean).join(" ");
}

function DateOfBirthInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  const { t } = useLocale();
  const parts = parseDateOfBirthParts(value);

  const updatePart = (part: keyof typeof parts, nextValue: string) => {
    const nextParts = {
      ...parts,
      [part]: nextValue,
    };

    onChange(formatDateOfBirthParts(nextParts));
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 sm:max-w-xl sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
      <select
        className={className}
        value={parts.day}
        onChange={(event) => updatePart("day", event.target.value)}
        aria-label={t["accountDashboard.personalDetails.dateOfBirthDay"]}
      >
        <option value="" disabled hidden>
          DD
        </option>
        {dateOfBirthDays.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
      <select
        className={className}
        value={parts.month}
        onChange={(event) => updatePart("month", event.target.value)}
        aria-label={t["accountDashboard.personalDetails.dateOfBirthMonth"]}
      >
        <option value="" disabled hidden>
          {t["accountDashboard.personalDetails.monthPlaceholder"]}
        </option>
        {dateOfBirthMonthOptions.map((month) => (
          <option key={month.value} value={month.value}>
            {t[month.labelKey]}
          </option>
        ))}
      </select>
      <select
        className={className}
        value={parts.year}
        onChange={(event) => updatePart("year", event.target.value)}
        aria-label={t["accountDashboard.personalDetails.dateOfBirthYear"]}
      >
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

type StructuredAddressParts = {
  countryCode: string;
  addressLine1: string;
  apartmentOrSuite: string;
  city: string;
  stateOrRegion: string;
  postalCode: string;
};

const emptyStructuredAddress: StructuredAddressParts = {
  countryCode: "",
  addressLine1: "",
  apartmentOrSuite: "",
  city: "",
  stateOrRegion: "",
  postalCode: "",
};

const structuredAddressPrefix = "kt-address-v1:";

function parseStructuredAddressDraft(value: string): StructuredAddressParts {
  const trimmedValue = value.trim();

  if (!trimmedValue) return emptyStructuredAddress;

  if (trimmedValue.startsWith(structuredAddressPrefix)) {
    try {
      const parsedValue = JSON.parse(
        trimmedValue.slice(structuredAddressPrefix.length),
      ) as Partial<StructuredAddressParts>;

      return {
        countryCode: parsedValue.countryCode ?? "",
        addressLine1:
          parsedValue.addressLine1 ??
          (parsedValue as { streetAddress?: string }).streetAddress ??
          "",
        apartmentOrSuite: parsedValue.apartmentOrSuite ?? "",
        city: parsedValue.city ?? "",
        stateOrRegion: parsedValue.stateOrRegion ?? "",
        postalCode: parsedValue.postalCode ?? "",
      };
    } catch {
      return emptyStructuredAddress;
    }
  }

  const [
    addressLine1 = "",
    cityPostal = "",
    postalOrCountry = "",
    country = "",
  ] = trimmedValue.split(/\r?\n/).map((line) => line.trim());
  const countryValue = country || postalOrCountry;
  const countryOption = personalDetailsCountryOptions.find(
    (option) =>
      option.country.toLowerCase() === countryValue.toLowerCase() ||
      getFriendlyCountryLabel(option).toLowerCase() ===
        countryValue.toLowerCase() ||
      option.code.toLowerCase() === countryValue.toLowerCase(),
  );

  return {
    ...emptyStructuredAddress,
    addressLine1,
    city: cityPostal,
    postalCode: country ? postalOrCountry : "",
    countryCode: countryOption?.code ?? "",
  };
}

function serializeStructuredAddressDraft(parts: StructuredAddressParts) {
  const normalizedParts = {
    countryCode: parts.countryCode,
    addressLine1: parts.addressLine1.trimStart(),
    apartmentOrSuite: parts.apartmentOrSuite.trimStart(),
    city: parts.city.trimStart(),
    stateOrRegion: parts.stateOrRegion.trimStart(),
    postalCode: parts.postalCode.trimStart(),
  };
  const hasAddressValue = Object.values(normalizedParts).some(Boolean);

  return hasAddressValue
    ? `${structuredAddressPrefix}${JSON.stringify(normalizedParts)}`
    : "";
}

function formatStructuredAddressForDisplay(value: string) {
  if (!value.trim() || !value.trim().startsWith(structuredAddressPrefix)) {
    return value.trim();
  }

  const parts = parseStructuredAddressDraft(value);
  const countryOption = personalDetailsCountryOptions.find(
    (option) => option.code === parts.countryCode,
  );
  const localityLine = [parts.city, parts.stateOrRegion]
    .filter(Boolean)
    .join(", ");
  const countryLine = countryOption
    ? getFriendlyCountryLabel(countryOption)
    : parts.countryCode;

  return [
    parts.addressLine1,
    parts.apartmentOrSuite,
    localityLine,
    parts.postalCode,
    countryLine,
  ]
    .filter(Boolean)
    .join("\n");
}

function StructuredAddressInput({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  const parts = useMemo(() => parseStructuredAddressDraft(value), [value]);

  const updatePart = (
    part: keyof StructuredAddressParts,
    nextValue: string,
  ) => {
    onChange(
      serializeStructuredAddressDraft({
        ...parts,
        [part]: nextValue,
      }),
    );
  };

  const fieldLabelClassName =
    "mb-1.5 block text-sm font-semibold leading-5 text-slate-900";

  return (
    <div className="w-full min-w-0 max-w-3xl space-y-4">
      <div className="max-w-md">
        <label
          className={fieldLabelClassName}
          htmlFor="personal-address-country"
        >
          Country/region
        </label>
        <select
          id="personal-address-country"
          className={className}
          value={parts.countryCode}
          onChange={(event) => updatePart("countryCode", event.target.value)}
          autoComplete="country"
        >
          <option value="" disabled hidden>
            Country/region
          </option>
          {personalDetailsDropdownOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="max-w-3xl">
        <label
          className={fieldLabelClassName}
          htmlFor="personal-address-street"
        >
          Street address
        </label>
        <input
          id="personal-address-street"
          className={className}
          value={parts.addressLine1}
          onChange={(event) => updatePart("addressLine1", event.target.value)}
          placeholder="Street address"
          autoComplete="address-line1"
        />
      </div>
      <div className="max-w-md">
        <label
          className={fieldLabelClassName}
          htmlFor="personal-address-apartment"
        >
          Apartment, suite, unit, building
        </label>
        <input
          id="personal-address-apartment"
          className={className}
          value={parts.apartmentOrSuite}
          onChange={(event) =>
            updatePart("apartmentOrSuite", event.target.value)
          }
          placeholder="Apartment, suite, unit, building"
          autoComplete="address-line2"
        />
      </div>
      <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label
            className={fieldLabelClassName}
            htmlFor="personal-address-city"
          >
            Town / City
          </label>
          <input
            id="personal-address-city"
            className={className}
            value={parts.city}
            onChange={(event) => updatePart("city", event.target.value)}
            placeholder="Town / City"
            autoComplete="address-level2"
          />
        </div>
        <div className="min-w-0">
          <label
            className={fieldLabelClassName}
            htmlFor="personal-address-state"
          >
            State / Province / Region
          </label>
          <input
            id="personal-address-state"
            className={className}
            value={parts.stateOrRegion}
            onChange={(event) =>
              updatePart("stateOrRegion", event.target.value)
            }
            placeholder="State / Province / Region"
            autoComplete="address-level1"
          />
        </div>
      </div>
      <div className="max-w-xs">
        <label
          className={fieldLabelClassName}
          htmlFor="personal-address-postal"
        >
          Postcode / ZIP code
        </label>
        <input
          id="personal-address-postal"
          className={className}
          value={parts.postalCode}
          onChange={(event) => updatePart("postalCode", event.target.value)}
          placeholder="Postcode / ZIP code"
          autoComplete="postal-code"
        />
      </div>
    </div>
  );
}

function parsePhoneDraftValue(value: string) {
  const trimmedValue = value.trim();
  const matchedOption = [...countryCallingCodeOptions]
    .sort((left, right) => right.dialCode.length - left.dialCode.length)
    .find(
      (option) =>
        trimmedValue === option.dialCode ||
        trimmedValue.startsWith(`${option.dialCode} `),
    );

  if (!matchedOption) {
    return {
      countryCode: defaultCountryCallingCodeOption?.isoCode ?? "",
      localNumber: trimmedValue.replace(/^\+\d+\s*/, ""),
    };
  }

  return {
    countryCode: matchedOption.isoCode,
    localNumber: trimmedValue.slice(matchedOption.dialCode.length).trimStart(),
  };
}

function formatPhoneDraftValue(countryCode: string, localNumber: string) {
  const selectedOption =
    countryCallingCodeOptions.find(
      (option) => option.isoCode === countryCode,
    ) ?? defaultCountryCallingCodeOption;

  if (!selectedOption) return localNumber.trimStart();
  const trimmedLocalNumber = localNumber.trimStart();

  return [selectedOption.dialCode, trimmedLocalNumber]
    .filter(Boolean)
    .join(" ");
}

function PhoneNumberInput({
  value,
  onChange,
  className,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
  label: string;
}) {
  const [selectedPhoneCountryCode, setSelectedPhoneCountryCode] = useState(
    () => parsePhoneDraftValue(value).countryCode,
  );
  const parsedValue = useMemo(() => parsePhoneDraftValue(value), [value]);
  const selectedOption =
    countryCallingCodeOptions.find(
      (option) => option.isoCode === selectedPhoneCountryCode,
    ) ?? defaultCountryCallingCodeOption;
  const selectedCountryCode =
    selectedOption?.isoCode ?? defaultCountryCallingCodeOption?.isoCode ?? "";

  const handleCountryChange = (nextCountryCode: string) => {
    setSelectedPhoneCountryCode(nextCountryCode);
    onChange(formatPhoneDraftValue(nextCountryCode, parsedValue.localNumber));
  };

  const handleLocalNumberChange = (nextLocalNumber: string) => {
    onChange(formatPhoneDraftValue(selectedCountryCode, nextLocalNumber));
  };

  return (
    <div className="flex w-full min-w-0 items-center gap-2 sm:max-w-xl">
      <div className="group relative h-10 w-[72px] shrink-0 sm:h-11 sm:w-20">
        <div
          aria-hidden="true"
          className="pointer-events-none flex h-full w-full items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 transition group-focus-within:border-violet-500 group-focus-within:ring-2 group-focus-within:ring-violet-100"
        >
          <CountryFlagIcon
            countryName={selectedOption.countryName}
            isoCode={selectedOption.isoCode}
            className="h-6 w-6 rounded-full bg-white sm:h-7 sm:w-7"
          />
          <ChevronDown
            className="h-4 w-4 shrink-0 text-slate-500"
            aria-hidden="true"
          />
        </div>

        <select
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          value={selectedCountryCode}
          onChange={(event) => handleCountryChange(event.target.value)}
          aria-label={`${label} country calling code`}
        >
          {countryCallingCodeOptions.map((option) => (
            <option key={option.isoCode} value={option.isoCode}>
              {option.countryName} {option.dialCode}
            </option>
          ))}
        </select>
      </div>
      <div
        className={cn(
          className,
          "flex min-w-0 items-center gap-2 overflow-hidden",
        )}
      >
        <span className="shrink-0 whitespace-nowrap text-slate-900">
          {selectedOption.dialCode}
        </span>
        <input
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-medium leading-5 text-slate-900 outline-none sm:text-sm"
          type="tel"
          value={parsedValue.localNumber}
          onChange={(event) => handleLocalNumberChange(event.target.value)}
          aria-label={label}
          inputMode="tel"
          autoComplete="tel-national"
        />
      </div>
    </div>
  );
}

function NationalityInput({
  value,
  onChange,
  className,
  label,
  fallback,
}: {
  value: string;
  onChange: (value: string) => void;
  className: string;
  label: string;
  fallback: string;
}) {
  return (
    <select
      className={className}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      autoComplete="country-name"
    >
      <option value="" disabled hidden>
        {fallback}
      </option>
      {nationalityDropdownOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function PersonalDetailsEditRow({
  row,
  value,
  onChange,
}: {
  row: PersonalDetailRow;
  value: string;
  onChange: (key: keyof PersonalDetailsDraft, value: string) => void;
}) {
  const isAddress = row.key === "address";

  return (
    <div
      className={cn(
        "max-w-3xl py-3.5",
        isAddress && "mt-5 border-t border-slate-200 pt-7",
      )}
    >
      <label className="mb-1.5 block text-sm font-semibold leading-5 text-slate-900">
        {row.label}
      </label>
      <div className="min-w-0">
        <DetailInput row={row} value={value} onChange={onChange} />
        {row.helper ? (
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            {row.helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DetailInput({
  row,
  value,
  onChange,
}: {
  row: PersonalDetailRow;
  value: string;
  onChange: (key: keyof PersonalDetailsDraft, value: string) => void;
}) {
  const baseClassName = cn(
    "h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-base font-medium leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100 sm:max-w-lg sm:text-sm",
    row.readOnly &&
      "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-200 focus:border-slate-200 focus:ring-0",
  );

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    onChange(row.key, event.target.value);
  };

  if (row.key === "dateOfBirth") {
    return (
      <DateOfBirthInput
        value={value}
        onChange={(nextValue) => onChange(row.key, nextValue)}
        className={baseClassName}
      />
    );
  }

  if (row.key === "phone") {
    return (
      <PhoneNumberInput
        value={value}
        onChange={(nextValue) => onChange(row.key, nextValue)}
        className={baseClassName}
        label={row.label}
      />
    );
  }

  if (row.key === "nationality") {
    return (
      <NationalityInput
        value={value}
        onChange={(nextValue) => onChange(row.key, nextValue)}
        className={baseClassName}
        label={row.label}
        fallback={row.fallback}
      />
    );
  }

  if (row.key === "address") {
    return (
      <StructuredAddressInput
        value={value}
        onChange={(nextValue) => onChange(row.key, nextValue)}
        className={baseClassName}
      />
    );
  }

  if (row.options) {
    return (
      <select
        className={baseClassName}
        value={value}
        onChange={handleChange}
        aria-label={row.label}
      >
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
        className={cn(baseClassName, "min-h-24 resize-y")}
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
  const router = useRouter();
  const [savedValues, setSavedValues] = useState<PersonalDetailsDraft>(() =>
    getPersonalDetailsInitialValues(props),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<PersonalDetailsDraft>(savedValues);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const personalDetailRows = getPersonalDetailRows(t);

  const handleEdit = () => {
    setDraft(savedValues);
    setStatusMessage(null);
    setErrorMessage(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(savedValues);
    setIsEditing(false);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: draft.name,
          phoneNumber: draft.phone,
          dateOfBirth: draft.dateOfBirth,
          gender: draft.gender,
          nationality: draft.nationality,
          address: draft.address,
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
        profile?: UserProfileResponse;
      } | null;

      if (!response.ok || !data?.profile) {
        throw new Error(data?.error || "Unable to save profile details.");
      }

      const nextSavedValues: PersonalDetailsDraft = {
        name: data.profile.fullName,
        email: savedValues.email,
        phone: data.profile.phoneNumber,
        dateOfBirth: data.profile.dateOfBirth,
        gender: data.profile.gender,
        nationality: data.profile.nationality,
        address: data.profile.address,
      };

      setSavedValues(nextSavedValues);
      setDraft(nextSavedValues);
      setIsEditing(false);
      setStatusMessage(
        t["accountDashboard.personalDetails.saveSuccess"] ||
          "Personal details saved.",
      );
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : t["accountDashboard.personalDetails.saveError"] ||
              "Unable to save profile details.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = (key: keyof PersonalDetailsDraft, value: string) => {
    if (key === "email") return;
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const personalDetailRowByKey = new Map(
    personalDetailRows.map((row) => [row.key, row]),
  );

  const getPersonalDetailRow = (key: keyof PersonalDetailsDraft) => {
    const row = personalDetailRowByKey.get(key);

    if (!row) {
      throw new Error(`Missing personal details row for ${key}`);
    }

    return row;
  };

  const renderEditField = (key: keyof PersonalDetailsDraft) => {
    const row = getPersonalDetailRow(key);

    return (
      <PersonalDetailsEditRow
        key={row.key}
        row={row}
        value={draft[key]}
        onChange={updateDraft}
      />
    );
  };

  const renderReadOnlyRow = (key: keyof PersonalDetailsDraft) => {
    const row = getPersonalDetailRow(key);
    const readOnlyValue = savedValues[row.key];

    return (
      <div
        key={row.key}
        className="grid grid-cols-1 gap-2 border-b border-slate-200 py-5 last:border-b-0 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6"
      >
        <div className="text-sm font-semibold leading-5 text-slate-900 sm:pt-0.5">
          {row.label}
        </div>
        <DetailValue
          value={
            row.key === "address"
              ? formatStructuredAddressForDisplay(readOnlyValue)
              : readOnlyValue
          }
          fallback={row.fallback}
          helper={row.helper}
          preserveLines={row.key === "address"}
        />
      </div>
    );
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        isEditing && "rounded-none border-0 bg-transparent shadow-none",
      )}
      aria-labelledby="dashboard-title"
    >
      <div
        className={cn(
          "border-b border-slate-200 px-5 py-4 sm:px-6",
          isEditing && "border-b-0 px-0 pb-5 pt-0",
        )}
      >
        <p className="text-sm text-slate-600">
          {t["accountDashboard.personalDetails.description"] ||
            "Manage the information Kurioticket uses for your account."}
        </p>
      </div>

      {statusMessage || errorMessage ? (
        <div
          className={cn("px-5 pt-4 sm:px-6", isEditing && "px-0")}
          role="status"
          aria-live="polite"
        >
          <p
            className={cn(
              "rounded-xl px-4 py-3 text-sm font-medium",
              errorMessage
                ? "border border-red-200 bg-red-50 text-red-700"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            {errorMessage || statusMessage}
          </p>
        </div>
      ) : null}

      {isEditing ? (
        <div className="px-0">
          {personalDetailsFieldOrder.map((key) => renderEditField(key))}
        </div>
      ) : (
        <div className="px-5 sm:px-6">
          {personalDetailsFieldOrder.map((key) => renderReadOnlyRow(key))}
        </div>
      )}

      <div
        className={cn(
          "border-t border-slate-200 bg-slate-50/60 px-5 py-4 sm:px-6",
          isEditing && "mt-4 bg-transparent px-0",
        )}
      >
        {isEditing ? (
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {t["accountDashboard.personalDetails.cancel"]}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300 sm:w-auto"
            >
              {isSaving
                ? t["accountDashboard.personalDetails.saving"] || "Saving…"
                : t["accountDashboard.personalDetails.saveChanges"]}
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleEdit}
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-blue-700 bg-white px-5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 sm:w-auto"
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
          <h3 className="min-w-0 break-words text-base font-semibold text-slate-900">
            {title}
          </h3>
          {status ? (
            <span className="break-words rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
              {status}
            </span>
          ) : null}
        </div>
        <p className="mt-1 break-words text-sm leading-6 text-slate-600">
          {body}
        </p>
      </div>
      {href ? (
        <ChevronRight
          className="mt-2 size-4 shrink-0 text-teal-dark"
          aria-hidden="true"
        />
      ) : null}
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

export function DashboardOverview({
  initials,
  displayName,
  userEmail,
  userName,
  userProfile,
}: DashboardOverviewProps) {
  const { t } = useLocale();
  const personalDetailsKey = [
    userEmail ?? "",
    userProfile?.fullName ?? "",
    userProfile?.phoneNumber ?? "",
    userProfile?.dateOfBirth ?? "",
    userProfile?.gender ?? "",
    userProfile?.nationality ?? "",
    userProfile?.address ?? "",
  ].join("|");

  return (
    <div className="min-w-0 max-w-[60rem] space-y-5 pb-6 pt-0 sm:pb-8 lg:ms-[4.875rem] lg:pb-10">
      <AccountSectionHeader
        title={t["accountDashboard.personalDetails.title"]}
        description={t["accountDashboard.personalDetails.subtitle"]}
        titleId="dashboard-title"
        flushStart
      />
      <PersonalDetailsSection
        key={personalDetailsKey}
        initials={initials}
        displayName={displayName}
        userEmail={userEmail}
        userName={userName}
        userProfile={userProfile}
      />
    </div>
  );
}


export function SavedDashboardPage() {
  const { t } = useLocale();

  return (
    <section
      className="mx-auto min-w-0 max-w-[72rem] bg-white pb-12 pt-3 sm:pt-6"
      aria-labelledby="saved-dashboard-title"
    >
      <div className="flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h1
            id="saved-dashboard-title"
            className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]"
          >
            {t["accountDashboard.saved.title"]}
          </h1>
        </div>
      </div>

      <div className="flex min-h-[34rem] items-start justify-center px-3 pb-10 pt-16 sm:min-h-[38rem] sm:pt-16 lg:min-h-[40rem] lg:pt-20">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.6rem]">
            {t["accountDashboard.saved.emptyTitle"]}
          </h2>
          <div className="mt-2 w-full sm:mt-6">
            <SavedEmptyStateIllustration />
          </div>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:mt-4">
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
    <section
      aria-labelledby="preferences-title"
      className="mx-auto min-w-0 max-w-[62rem] space-y-4 xl:max-w-[64rem]"
    >
      <AccountSectionHeader
        title={t["accountDashboard.preferences.title"]}
        description={t["accountDashboard.preferences.description"]}
        titleId="preferences-title"
      />
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

function SecuritySettingRow({
  title,
  body,
  action,
  status,
  danger = false,
  onAction,
  statusId,
}: SecuritySettingRowProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 border-b border-slate-200 py-5 last:border-b-0 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6 sm:py-5">
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-6 text-slate-900">
          {title}
        </h2>
      </div>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p
            className={cn(
              "max-w-2xl text-sm leading-6",
              danger ? "text-red-700" : "text-slate-600",
            )}
          >
            {body}
          </p>
          {status ? (
            <p
              className={cn(
                "mt-2 inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold leading-4",
                danger
                  ? "bg-red-50 text-red-700"
                  : "bg-slate-100 text-slate-700",
              )}
            >
              {status}
            </p>
          ) : null}
        </div>
        {action ? (
          <button
            type="button"
            onClick={onAction}
            aria-describedby={statusId}
            className={cn(
              "focus-ring inline-flex min-h-10 w-full max-w-full shrink-0 cursor-pointer items-center justify-center rounded-lg border bg-white px-4 py-2 text-center text-sm font-semibold leading-5 transition sm:w-auto",
              danger
                ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                : "border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50",
            )}
          >
            {action}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SecurityDashboardPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [actionMessage, setActionMessage] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deleteRequestSaving, setDeleteRequestSaving] = useState(false);
  const [securityEmailAlerts, setSecurityEmailAlerts] = useState(true);
  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus>({ enabled: false, method: null, enabledAt: null, disabledAt: null, recoveryCodesRemaining: 0 });
  const [twoFactorModal, setTwoFactorModal] = useState<TwoFactorMode | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [totpSetup, setTotpSetup] = useState<TotpSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [twoFactorSaving, setTwoFactorSaving] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
  const [passkeysModalOpen, setPasskeysModalOpen] = useState(false);
  const [passkeySaving, setPasskeySaving] = useState(false);
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessions, setSessions] = useState<AccountSessionActivity[]>([]);
  const [sessionNotice, setSessionNotice] = useState(
    "Tracked from sign-ins and security page access. JWT sessions remain valid until they expire or you sign out.",
  );
  const [removingSessionId, setRemovingSessionId] = useState<string | null>(null);
  const securityActionStatusId = "security-action-status";
  const tx = (key: string, fallback: string) => t[key] || fallback;

  useEffect(() => {
    let active = true;

    async function loadSecurityPreferences() {
      try {
        const response = await fetch("/api/account/security/preferences", {
          method: "GET",
          credentials: "same-origin",
        });
        const data = await response.json().catch(() => ({}));

        if (!active) return;

        if (response.ok) {
          setSecurityEmailAlerts(Boolean(data.preferences?.securityEmailAlerts));
          const twoFactorResponse = await fetch("/api/account/security/two-factor", { method: "GET", credentials: "same-origin" });
          const twoFactorData = await twoFactorResponse.json().catch(() => ({}));
          if (active && twoFactorResponse.ok) setTwoFactor(twoFactorData.twoFactor);
          const passkeysResponse = await fetch("/api/account/security/passkeys", { method: "GET", credentials: "same-origin" });
          const passkeysData = await passkeysResponse.json().catch(() => ({}));
          if (active && passkeysResponse.ok) setPasskeys(Array.isArray(passkeysData.passkeys) ? passkeysData.passkeys : []);
        } else {
          setActionMessage(data.error || "Unable to load security preferences.");
        }
      } catch {
        if (active) setActionMessage("Unable to load security preferences.");
      } finally {
        if (active) setPreferencesLoading(false);
      }
    }

    loadSecurityPreferences();

    return () => {
      active = false;
    };
  }, []);

  const handlePasswordFieldChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setPasswordForm((current) => ({ ...current, [name]: value }));
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionMessage("");

    if (!passwordForm.currentPassword) {
      setActionMessage("Current password is required.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setActionMessage("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setActionMessage("Confirm password must match the new password.");
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setActionMessage("Choose a new password that is different from your current password.");
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch("/api/account/security/password", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordForm),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionMessage(data.error || "Unable to update password.");
        return;
      }

      setPasswordModalOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setActionMessage("Password updated successfully. Use the new password next time you sign in.");
    } catch {
      setActionMessage("Unable to update password.");
    } finally {
      setPasswordSaving(false);
    }
  };


  const loadPasskeys = async () => {
    const response = await fetch("/api/account/security/passkeys", { method: "GET", credentials: "same-origin" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) setPasskeys(Array.isArray(data.passkeys) ? data.passkeys : []);
  };
  const requestPasskeyReauth = async () => {
    const sendResponse = await fetch("/api/account/security/passkeys/reauth", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send-email-code" }) });
    const sendData = await sendResponse.json().catch(() => ({}));
    if (!sendResponse.ok) throw new Error(sendData.error || "Unable to send a confirmation code.");
    const secret = window.prompt("Enter the 6-digit code we sent to your account email. If authenticator-app 2FA is enabled, you can enter that code instead.");
    if (!secret) throw new Error("Verification is required before managing passkeys.");
    const response = await fetch("/api/account/security/passkeys/reauth", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", code: secret.trim() }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.reauthToken) throw new Error(data.error || "Unable to verify that request.");
    return String(data.reauthToken);
  };
  const defaultPasskeyName = () => {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? "Microsoft Edge" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) && !/Chrome\//.test(ua) ? "Safari" : "Chrome";
    const device = /iPhone/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "MacBook" : /Windows/.test(ua) ? "Windows" : "device";
    return `${browser} on ${device}`;
  };
  const handleAddPasskey = async () => {
    if (!window.PublicKeyCredential || !navigator.credentials) { setActionMessage("Passkeys are not supported on this browser. Use password sign-in instead."); return; }
    setPasskeySaving(true); setActionMessage("We’ll confirm your email before opening your device security prompt.");
    try {
      const reauthToken = await requestPasskeyReauth();
      const optionsResponse = await fetch("/api/account/security/passkeys/register/options", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reauthToken }) });
      const optionsData = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(optionsData.error || "Unable to start passkey setup.");
      const credential = await navigator.credentials.create({ publicKey: decodeCreationOptions(optionsData.options) }) as PublicKeyCredential | null;
      if (!credential) throw new Error("Passkey setup was cancelled.");
      const name = window.prompt("Name this passkey", defaultPasskeyName()) || defaultPasskeyName();
      const verifyResponse = await fetch("/api/account/security/passkeys/register/verify", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...serializeCreatedCredential(credential), name }) });
      const verifyData = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok) throw new Error(verifyData.error || "Unable to save passkey.");
      setActionMessage("Passkey added. You can now sign in to Kurioticket with this device, password manager, or security key.");
      await loadPasskeys();
    } catch (error) { setActionMessage(error instanceof Error ? error.message : "Unable to add passkey."); } finally { setPasskeySaving(false); }
  };
  const handleRenamePasskey = async (id: string, currentName: string | null) => {
    const name = window.prompt("Rename passkey", currentName || "Passkey");
    if (!name) return;
    setPasskeySaving(true); setActionMessage("");
    try {
      const response = await fetch(`/api/account/security/passkeys/${id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to rename passkey.");
      setActionMessage("Passkey renamed."); await loadPasskeys();
    } catch (error) { setActionMessage(error instanceof Error ? error.message : "Unable to rename passkey."); } finally { setPasskeySaving(false); }
  };
  const handleRemovePasskey = async (id: string) => {
    if (passkeys.length <= 1 && !window.confirm("You will no longer be able to sign in with passkeys. Keep a backup sign-in method in case you lose access to this passkey.")) return;
    setPasskeySaving(true); setActionMessage("");
    try {
      const reauthToken = await requestPasskeyReauth();
      const response = await fetch(`/api/account/security/passkeys/${id}`, { method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reauthToken }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to remove passkey.");
      setActionMessage("Passkey removed."); await loadPasskeys();
    } catch (error) { setActionMessage(error instanceof Error ? error.message : "Unable to remove passkey."); } finally { setPasskeySaving(false); }
  };

  const loadSessionActivities = async () => {
    setSessionsLoading(true);
    setActionMessage("");

    try {
      const response = await fetch("/api/account/security/sessions", {
        method: "GET",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionMessage(data.error || "Unable to load active sessions.");
        return;
      }

      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      if (data.notice) {
        setSessionNotice(String(data.notice));
      }
    } catch {
      setActionMessage("Unable to load active sessions.");
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleOpenSessions = () => {
    setSessionsModalOpen(true);
    void loadSessionActivities();
  };

  const handleRemoveSessionRecord = async (sessionId: string) => {
    setRemovingSessionId(sessionId);
    setActionMessage("");

    try {
      const response = await fetch("/api/account/security/sessions/revoke", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionMessage(data.error || "Unable to remove device record.");
        return;
      }

      setActionMessage("Device record marked as signed out. Existing JWTs are not forcibly invalidated.");
      await loadSessionActivities();
    } catch {
      setActionMessage("Unable to remove device record.");
    } finally {
      setRemovingSessionId(null);
    }
  };


  const openTwoFactorModal = async (mode: TwoFactorMode) => {
    setTwoFactorModal(mode);
    setTwoFactorCode("");
    setTwoFactorPassword("");
    setTotpSetup(null);
    setRecoveryCodes([]);
    setActionMessage("");
    if (mode !== "setup") return;
    setTwoFactorSaving(true);
    try {
      const response = await fetch("/api/account/security/two-factor/setup", { method: "POST", credentials: "same-origin" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setActionMessage(data.error || "Unable to start authenticator setup.");
      else setTotpSetup(data.setup);
    } catch {
      setActionMessage("Unable to start authenticator setup.");
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const handleTwoFactorConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!twoFactorModal) return;
    setTwoFactorSaving(true);
    setActionMessage("");
    try {
      const body = twoFactorModal === "disable" ? { code: twoFactorCode || undefined, password: twoFactorPassword || undefined } : { code: twoFactorCode };
      const endpoint = twoFactorModal === "setup" ? "/api/account/security/two-factor/confirm" : twoFactorModal === "recovery" ? "/api/account/security/two-factor/recovery-codes/regenerate" : "/api/account/security/two-factor/disable";
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setActionMessage(data.error || "Unable to update two-factor authentication.");
        return;
      }
      setTwoFactor(data.twoFactor);
      setRecoveryCodes(Array.isArray(data.recoveryCodes) ? data.recoveryCodes : []);
      if (!Array.isArray(data.recoveryCodes)) setTwoFactorModal(null);
      setTwoFactorCode("");
      setTwoFactorPassword("");
      setActionMessage(twoFactorModal === "setup" ? "Two-factor authentication is enabled. Save your recovery codes now." : twoFactorModal === "recovery" ? "Recovery codes regenerated. Save them now." : "Two-factor authentication is disabled.");
    } catch {
      setActionMessage("Unable to update two-factor authentication.");
    } finally {
      setTwoFactorSaving(false);
    }
  };

  const handleSecurityAlertsToggle = async (enabled: boolean) => {
    setPreferencesSaving(true);
    setActionMessage("");

    try {
      const response = await fetch("/api/account/security/preferences", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ securityEmailAlerts: enabled }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionMessage(data.error || "Unable to save security preferences.");
        return;
      }

      setSecurityEmailAlerts(Boolean(data.preferences?.securityEmailAlerts));
      setActionMessage(enabled ? "Email security alerts are on." : "Email security alerts are off.");
    } catch {
      setActionMessage("Unable to save security preferences.");
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handleDeletionRequest = async () => {
    setDeleteRequestSaving(true);
    setActionMessage("");

    try {
      const response = await fetch("/api/account/security/deletion-request", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionMessage(data.error || "Unable to request account deletion.");
        return;
      }

      setDeleteModalOpen(false);
      setActionMessage(`${data.message || "Your account deletion request is under review."} Deadline: ${data.request?.deletionScheduledAt ? new Date(data.request.deletionScheduledAt).toLocaleString() : "7 days from now"}.`);
      router.push("/account/pending-deletion");
    } catch {
      setActionMessage("Unable to request account deletion.");
    } finally {
      setDeleteRequestSaving(false);
    }
  };

  return (
    <section
      aria-labelledby="security-title"
      className="min-w-0 max-w-[60rem] space-y-5 pt-0 lg:ms-[4.875rem]"
    >
      <AccountSectionHeader
        title={tx("accountDashboard.security.title", "Security settings")}
        description={tx(
          "accountDashboard.security.description",
          "Manage sign-in and account security for your Kurioticket account.",
        )}
        titleId="security-title"
        flushStart
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-5 sm:px-6">
          <SecuritySettingRow
            title={tx("accountDashboard.security.password.title", "Password")}
            body={tx("accountDashboard.security.password.description", "Update the password used to sign in to your Kurioticket account.")}
            action={tx("accountDashboard.security.action.changePassword", "Change password")}
            onAction={() => setPasswordModalOpen(true)}
            statusId={securityActionStatusId}
          />
          <SecuritySettingRow
            title={tx("accountDashboard.security.twoFactor.title", "Two-factor authentication")}
            body={twoFactor.enabled ? `Authenticator app is required at sign-in. Recovery codes remaining: ${twoFactor.recoveryCodesRemaining ?? 0}.` : "Use Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden, Authy, 2FAS, or another TOTP app."}
            status={twoFactor.enabled ? "Enabled · Authenticator app" : "Not enabled"}
            action={twoFactor.enabled ? "Disable" : "Set up"}
            onAction={() => void openTwoFactorModal(twoFactor.enabled ? "disable" : "setup")}
            statusId={securityActionStatusId}
          />
          <SecuritySettingRow
            title={tx("accountDashboard.security.passkeys.title", "Passkeys")}
            body={passkeys.length ? "Sign in with your face, fingerprint, screen lock, password manager, or security key. Passkey login is strong sign-in and does not require an authenticator code again by default." : "Sign in faster and more securely with your device screen lock, Face ID, fingerprint, password manager, or security key."}
            status={passkeys.length ? `${passkeys.length} passkey${passkeys.length === 1 ? "" : "s"} added` : "Not set up"}
            action={passkeys.length ? tx("accountDashboard.security.action.manage", "Manage") : "Set up passkey"}
            onAction={() => setPasskeysModalOpen(true)}
            statusId={securityActionStatusId}
          />
          <SecuritySettingRow
            title={tx("accountDashboard.security.activeSessions.title", "Active sessions")}
            body={tx("accountDashboard.security.activeSessions.description", "Review recent devices tracked for your account. Because sign-in uses JWT sessions, removing a record does not instantly invalidate an issued token.")}
            status={sessions.some((session) => session.isCurrent) ? "This device tracked" : "Tracking enabled"}
            action={tx("accountDashboard.security.action.manageSessions", "Manage sessions")}
            onAction={handleOpenSessions}
            statusId={securityActionStatusId}
          />
          <div className="grid min-w-0 grid-cols-1 gap-3 border-b border-slate-200 py-5 last:border-b-0 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-6 sm:py-5">
            <div className="min-w-0">
              <h2 className="text-base font-semibold leading-6 text-slate-900">
                {tx("accountDashboard.security.notifications.title", "Security notifications")}
              </h2>
            </div>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  {tx("accountDashboard.security.notifications.description", "Get notified about important account security activity.")}
                </p>
                <p className="mt-2 inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold leading-4 text-slate-700">
                  {securityEmailAlerts ? "Email alerts on" : "Email alerts off"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={securityEmailAlerts}
                disabled={preferencesLoading || preferencesSaving}
                onClick={() => handleSecurityAlertsToggle(!securityEmailAlerts)}
                className={cn(
                  "focus-ring inline-flex min-h-10 w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition sm:w-auto",
                  securityEmailAlerts ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
                  preferencesLoading || preferencesSaving ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                )}
              >
                {preferencesSaving ? "Saving…" : securityEmailAlerts ? "Turn off" : "Turn on"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-100 bg-red-50/60 px-5 py-4 sm:px-6">
          <p className="text-sm font-semibold leading-5 text-red-700">
            {tx("accountDashboard.security.dangerZone.title", "Danger zone")}
          </p>
        </div>
        <div className="px-5 sm:px-6">
          <SecuritySettingRow
            title={tx("accountDashboard.security.deleteAccount.title", "Delete account")}
            body={tx("accountDashboard.security.deleteAccount.description", "Request permanent account deletion. Support review is required before any account records are removed.")}
            action={tx("accountDashboard.security.action.deleteAccount", "Delete account")}
            onAction={() => setDeleteModalOpen(true)}
            statusId={securityActionStatusId}
            danger
          />
        </div>
      </div>
      <p id={securityActionStatusId} role="status" aria-live="polite" className={cn("px-1 text-sm font-medium leading-5 text-slate-600 sm:px-2", actionMessage ? "" : "sr-only")}>{actionMessage}</p>


      {twoFactorModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="two-factor-title">
          <form onSubmit={handleTwoFactorConfirm} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="two-factor-title" className="text-xl font-semibold text-slate-950">{twoFactorModal === "setup" ? "Set up authenticator app" : twoFactorModal === "recovery" ? "Regenerate recovery codes" : "Disable two-factor authentication"}</h2>
            {recoveryCodes.length > 0 ? (
              <div className="mt-5 space-y-4"><p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Save these recovery codes now. They will not be shown again.</p><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{recoveryCodes.map((code) => <code key={code} className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm font-bold text-slate-900">{code}</code>)}</div><button type="button" onClick={() => void navigator.clipboard?.writeText(recoveryCodes.join("\n"))} className="focus-ring rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">Copy codes</button></div>
            ) : (
              <><p className="mt-2 text-sm leading-6 text-slate-600">{twoFactorModal === "setup" ? "Scan the QR code with an authenticator app, or enter the manual setup key. Then enter the current 6-digit code." : twoFactorModal === "recovery" ? "Enter a current authenticator app code to replace your recovery codes." : "Disabling 2FA reduces account protection. Verify with your authenticator/recovery code, or your current password."}</p>
              {twoFactorModal === "setup" && totpSetup ? <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-center"><img alt="Authenticator app QR code" className="mx-auto h-48 w-48 rounded-lg bg-white p-2" src={`https://api.qrserver.com/v1/create-qr-code/?size=192x192&data=${encodeURIComponent(totpSetup.otpauthUri)}`} /><p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Manual setup key</p><code className="mt-1 block break-all rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-900">{totpSetup.manualSetupKey}</code></div> : null}
              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-slate-800">{twoFactorModal === "disable" ? "Authenticator or recovery code" : "Authenticator code"}
                  <input value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 32))} autoComplete="one-time-code" maxLength={32} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="123456" />
                </label>
                {twoFactorModal === "disable" ? <label className="block text-sm font-medium text-slate-800">Or current password<input type="password" value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} autoComplete="current-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label> : null}
              </div></>
            )}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setTwoFactorModal(null)} className="focus-ring rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">{recoveryCodes.length > 0 ? "Done" : "Cancel"}</button>
              {recoveryCodes.length === 0 ? <button type="submit" disabled={twoFactorSaving || (twoFactorModal === "setup" ? twoFactorCode.length !== 6 || !totpSetup : twoFactorModal === "recovery" ? twoFactorCode.length !== 6 : !twoFactorPassword && twoFactorCode.length < 6)} className="focus-ring rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{twoFactorSaving ? "Verifying…" : twoFactorModal === "setup" ? "Confirm and enable" : twoFactorModal === "recovery" ? "Regenerate codes" : "Disable 2FA"}</button> : null}
            </div>
          </form>
        </div>
      ) : null}

      {passkeysModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="passkeys-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <h2 id="passkeys-title" className="text-xl font-semibold text-slate-950">Manage passkeys</h2>
            <div className="mt-2 space-y-2 text-sm leading-6 text-slate-600"><p className="font-semibold text-slate-900">Set up a passkey</p><p>Use Face ID, fingerprint, Windows Hello, your phone screen lock, password manager, or security key to sign in faster and more securely.</p><p>Kurioticket never receives your fingerprint, face, device PIN, or private key.</p><p>Passkeys are separate from authenticator-app 2FA. Password sign-in may still ask for your authenticator code. Before adding or removing a passkey, we’ll send a confirmation code to your account email; authenticator-app codes can also confirm removal or setup when enabled.</p></div>
            <button type="button" onClick={handleAddPasskey} disabled={passkeySaving} className="focus-ring mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{passkeySaving ? "Working…" : passkeys.length ? "Add another passkey" : "Set up passkey"}</button>
            <div className="mt-5 space-y-3">{passkeys.length ? passkeys.map((passkey) => <div key={passkey.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-950">{passkey.name || "Passkey"}</p><p className="text-sm text-slate-600">Created {formatSessionTime(passkey.createdAt)} · Last used {passkey.lastUsedAt ? formatSessionTime(passkey.lastUsedAt) : "never"} · {passkey.label || (passkey.backedUp ? "Synced passkey" : passkey.deviceType || "Device or security key")}</p></div><div className="flex gap-2"><button type="button" onClick={() => void handleRenamePasskey(passkey.id, passkey.name)} disabled={passkeySaving} className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60">Rename</button><button type="button" onClick={() => void handleRemovePasskey(passkey.id)} disabled={passkeySaving} className="focus-ring rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-60">Remove</button></div></div>) : <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No passkeys yet.</p>}</div>
            <div className="mt-6 flex justify-end"><button type="button" onClick={() => setPasskeysModalOpen(false)} className="focus-ring rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Done</button></div>
          </div>
        </div>
      ) : null}

      {sessionsModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="active-sessions-title">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 id="active-sessions-title" className="text-xl font-semibold text-slate-950">Active sessions</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{sessionNotice}</p>
              </div>
              <button type="button" onClick={loadSessionActivities} disabled={sessionsLoading} className="focus-ring rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 disabled:opacity-60">
                {sessionsLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {sessionsLoading && sessions.length === 0 ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading tracked sessions…</p>
              ) : sessions.length ? (
                sessions.map((session) => (
                  <div key={session.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-sm font-semibold text-slate-950">
                            {session.isCurrent ? "This device" : session.deviceLabel}
                          </p>
                          {session.isCurrent ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Current</span> : null}
                          {session.revokedAt ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Marked signed out</span> : null}
                        </div>
                        <p className="mt-1 break-words text-sm text-slate-600">{session.browser} on {session.os}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Last active {formatSessionTime(session.lastSeenAt)}</p>
                        <p className="text-xs leading-5 text-slate-500">IP network {session.maskedIp || "not available"}</p>
                      </div>
                      {!session.isCurrent && !session.revokedAt ? (
                        <button
                          type="button"
                          disabled={removingSessionId === session.id}
                          onClick={() => void handleRemoveSessionRecord(session.id)}
                          className="focus-ring inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                        >
                          {removingSessionId === session.id ? "Removing…" : "Remove device record"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">No tracked sessions are available yet. Refresh this page after signing in to record this device.</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={() => setSessionsModalOpen(false)} className="focus-ring rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Done</button>
            </div>
          </div>
        </div>
      ) : null}

      {passwordModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
          <form onSubmit={handlePasswordSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="change-password-title" className="text-xl font-semibold text-slate-950">Change password</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Enter your current password and choose a new password with at least 8 characters. OAuth-only accounts should use password reset to create a password.</p>
            <div className="mt-5 space-y-4">
              {[
                ["currentPassword", "Current password"],
                ["newPassword", "New password"],
                ["confirmPassword", "Confirm new password"],
              ].map(([name, label]) => (
                <label key={name} className="block text-sm font-medium text-slate-800">
                  {label}
                  <input name={name} type="password" value={passwordForm[name as keyof typeof passwordForm]} onChange={handlePasswordFieldChange} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" autoComplete={name === "currentPassword" ? "current-password" : "new-password"} />
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPasswordModalOpen(false)} className="focus-ring rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">Cancel</button>
              <button type="submit" disabled={passwordSaving} className="focus-ring rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{passwordSaving ? "Saving…" : "Save password"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="delete-account-title" className="text-xl font-semibold text-slate-950">Request account deletion</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">This starts a 7-day grace period. Your account will be marked pending deletion, normal dashboard browsing will be restricted, and you can reactivate by logging in before the deadline. Kurioticket will not instantly hard-delete your account from this page; support must review retention obligations first.</p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="focus-ring rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800">Cancel</button>
              <button type="button" disabled={deleteRequestSaving} onClick={handleDeletionRequest} className="focus-ring rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{deleteRequestSaving ? "Requesting…" : "Request 7-day deletion"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function SupportDashboardPage() {
  const { t } = useLocale();

  return (
    <section
      aria-labelledby="support-title"
      className="mx-auto min-w-0 max-w-[62rem] space-y-4 xl:max-w-[64rem]"
    >
      <AccountSectionHeader
        title={t["accountDashboard.support.title"]}
        description={t["accountDashboard.support.description"]}
        titleId="support-title"
      />
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

function webauthnToBase64url(buffer: ArrayBuffer) { const bytes = new Uint8Array(buffer); let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function webauthnFromBase64url(value: string) { const normalized = value.replace(/-/g, "+").replace(/_/g, "/"); const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="); return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)).buffer; }
function decodeCreationOptions(options: PublicKeyCredentialCreationOptions & { challenge: string; user: PublicKeyCredentialUserEntity & { id: string }; excludeCredentials?: Array<PublicKeyCredentialDescriptor & { id: string }> }) { return { ...options, challenge: webauthnFromBase64url(options.challenge), user: { ...options.user, id: webauthnFromBase64url(options.user.id) }, excludeCredentials: options.excludeCredentials?.map((credential) => ({ ...credential, id: webauthnFromBase64url(String(credential.id)) })) }; }
function serializeCreatedCredential(credential: PublicKeyCredential) { const response = credential.response as AuthenticatorAttestationResponse; return { id: credential.id, rawId: webauthnToBase64url(credential.rawId), type: credential.type, response: { attestationObject: webauthnToBase64url(response.attestationObject), clientDataJSON: webauthnToBase64url(response.clientDataJSON), transports: response.getTransports?.() || [], authenticatorData: webauthnToBase64url(response.getAuthenticatorData()) }, authenticatorAttachment: credential.authenticatorAttachment }; }
