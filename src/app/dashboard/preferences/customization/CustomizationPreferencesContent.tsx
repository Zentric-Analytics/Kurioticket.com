"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Clock3,
  Globe2,
  Lightbulb,
  Mail,
  Plane,
  Search,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";

const displayFields = [
  {
    id: "preferred-language",
    label: "Language",
    initialValue: "English",
    options: ["English", "Spanish", "French", "German", "Portuguese", "Dutch"],
  },
  {
    id: "currency",
    label: "Currency",
    initialValue: "USD",
    options: ["USD", "EUR", "GBP", "CAD", "AUD"],
  },
  {
    id: "region",
    label: "Region / Market",
    initialValue: "United States",
    options: ["United States", "Canada", "United Kingdom", "Europe", "Australia"],
  },
] as const;

const notificationRows = [
  {
    id: "price-alerts",
    icon: Tag,
    title: "Price Alerts",
    description: "Notify me when saved flights or hotels change price.",
  },
  {
    id: "saved-search-updates",
    icon: Search,
    title: "Saved Search Updates",
    description: "Notify me when saved searches have better deals.",
  },
  {
    id: "trip-reminders",
    icon: Clock3,
    title: "Trip Reminders",
    description: "Receive reminders before upcoming trips.",
  },
  {
    id: "travel-inspiration",
    icon: Lightbulb,
    title: "Travel Inspiration",
    description: "Discover destinations and seasonal offers.",
  },
  {
    id: "product-updates",
    icon: Plane,
    title: "Product Updates",
    description: "Learn about new Kurioticket features and improvements.",
  },
] as const;

const initialDisplayState = Object.fromEntries(
  displayFields.map((field) => [field.id, field.initialValue]),
) as Record<(typeof displayFields)[number]["id"], string>;

const initialToggleState = {
  "price-alerts": true,
  "saved-search-updates": true,
  "trip-reminders": true,
  "travel-inspiration": false,
  "product-updates": true,
  "marketing-emails": false,
};

type ToggleId = keyof typeof initialToggleState;

function SettingsSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, "-")}-settings`}>
      <div className="px-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#004BB8]">{eyebrow}</p>
        <h2 id={`${title.toLowerCase().replace(/\s+/g, "-")}-settings`} className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
        {children}
      </div>
    </section>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`focus-ring relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${checked ? "bg-[#004BB8]" : "bg-slate-300"}`}
    >
      <span className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export function CustomizationPreferencesContent() {
  const { t } = useLocale();
  const [displayState, setDisplayState] = useState(initialDisplayState);
  const [toggles, setToggles] = useState(initialToggleState);
  const [statusMessage, setStatusMessage] = useState("");

  const displaySummary = useMemo(
    () => `${displayState["preferred-language"]} · ${displayState.currency} · ${displayState.region}`,
    [displayState],
  );

  const updateToggle = (id: ToggleId) => {
    setStatusMessage("");
    setToggles((current) => ({ ...current, [id]: !current[id] }));
  };

  const resetPreferences = () => {
    setDisplayState(initialDisplayState);
    setToggles(initialToggleState);
    setStatusMessage("");
  };

  return (
    <main className="flex-1 bg-[#f6f8fb] pb-12 pt-0">
      <header className="border-b border-white/10 bg-[#021C2B] text-start">
        <div className="mx-auto min-w-0 max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <AccountBackLink variant="hero" />
          <div className="mt-5 flex max-w-3xl items-start gap-4">
            <span className="hidden rounded-2xl bg-white/10 p-3 text-blue-50 ring-1 ring-white/15 sm:inline-flex">
              <Globe2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {t["accountDashboard.preferences.customization.title"]}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/90 sm:text-base">
                {t["accountDashboard.preferences.customization.description"]}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto min-w-0 max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <form className="space-y-8" action="#">
          <SettingsSection eyebrow="Appearance" title="Display" description="How should Kurioticket appear for me?">
            <div className="divide-y divide-slate-100">
              {displayFields.map((field) => (
                <label key={field.id} htmlFor={field.id} className="flex min-h-20 cursor-pointer items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-950">{field.label}</span>
                    <span className="mt-1 block text-sm text-slate-500">{displayState[field.id]}</span>
                  </span>
                  <span className="relative shrink-0">
                    <select
                      id={field.id}
                      name={field.id}
                      value={displayState[field.id]}
                      onChange={(event) => {
                        setStatusMessage("");
                        setDisplayState((current) => ({ ...current, [field.id]: event.target.value }));
                      }}
                      className="focus-ring w-40 appearance-none rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-9 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 sm:w-48"
                    >
                      {field.options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  </span>
                </label>
              ))}
            </div>
            <p className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-500 sm:px-6">Current display: {displaySummary}</p>
          </SettingsSection>

          <SettingsSection eyebrow="Notifications" title="Stay informed" description="Choose the travel updates that should reach you first.">
            <div className="divide-y divide-slate-100">
              {notificationRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div key={row.id} className="flex min-h-24 items-center gap-4 px-5 py-4 sm:px-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#004BB8]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-950">{row.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-slate-500">{row.description}</p>
                    </div>
                    <Toggle checked={toggles[row.id]} onChange={() => updateToggle(row.id)} label={`${row.title} notifications`} />
                  </div>
                );
              })}
            </div>
          </SettingsSection>

          <SettingsSection eyebrow="Privacy" title="Privacy" description="Control promotional messages while keeping important account updates available.">
            <div className="divide-y divide-slate-100">
              <div className="flex min-h-24 items-center gap-4 px-5 py-4 sm:px-6">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-950">Marketing Emails</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">Receive promotional emails and exclusive travel offers.</p>
                </div>
                <Toggle checked={toggles["marketing-emails"]} onChange={() => updateToggle("marketing-emails")} label="Marketing Emails" />
              </div>
              <div className="space-y-4 px-5 py-5 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setStatusMessage("");
                    setToggles((current) => ({ ...current, "marketing-emails": false, "travel-inspiration": false, "product-updates": false }));
                  }}
                  className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:w-auto"
                >
                  Turn off all promotional emails
                </button>
                <div className="flex gap-3 rounded-2xl bg-blue-50/70 p-4 text-sm leading-6 text-slate-600">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#004BB8]" aria-hidden="true" />
                  <p>You&apos;ll still receive important account, security, booking, support and any alerts you&apos;ve chosen to receive.</p>
                </div>
              </div>
            </div>
          </SettingsSection>

          {statusMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{statusMessage}</p> : null}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={resetPreferences} className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto">
              {t["accountDashboard.preferences.cancel"]}
            </button>
            <button type="button" onClick={() => setStatusMessage("Preferences saved for this session.")} className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] sm:w-auto">
              {t["accountDashboard.preferences.savePreferences"]}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
