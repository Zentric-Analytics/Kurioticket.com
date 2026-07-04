"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";

const STORAGE_KEY = "kurioticket_account_preferences_v1";

type PreferencesForm = {
  homeAirport: string;
  preferredAirlines: string;
  budgetStyle: string;
  directVsCheaper: string;
  comfortVsSavings: string;
  travelPurpose: string;
  travelFrequency: string;
  preferredLanguage: string;
  region: string;
  currency: string;
  priceAlertEmails: boolean;
  travelInsightEmails: boolean;
  supportUpdateEmails: boolean;
  inAppNotifications: boolean;
  rememberRecentSearches: boolean;
  useSearchesForPersonalization: boolean;
  highlightRelevantIdeas: boolean;
};

const selectOptions = {
  budgetStyle: [
    ["lowest-reasonable-fare", "Lowest reasonable fare"],
    ["balanced-value", "Balanced value"],
    ["comfort-when-it-matters", "Comfort when it matters"],
  ],
  directVsCheaper: [
    ["prefer-direct-when-close", "Prefer direct when prices are close"],
    ["choose-cheaper-if-layover-good", "Choose cheaper if the layover is reasonable"],
    ["minimize-travel-effort", "Minimize travel effort"],
  ],
  comfortVsSavings: [
    ["save-first", "Save first"],
    ["balanced", "Balanced"],
    ["comfort-first", "Comfort first"],
  ],
  travelPurpose: [
    ["leisure", "Leisure"],
    ["family", "Family"],
    ["business", "Business"],
    ["mixed", "Mixed"],
  ],
  travelFrequency: [
    ["few-times-year", "A few times a year"],
    ["monthly", "Monthly"],
    ["often-for-work", "Often for work"],
  ],
};

const fieldClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#004BB8] focus:ring-4 focus:ring-[#004BB8]/15";

const toggleClassName =
  "h-5 w-5 rounded border-slate-300 text-[#004BB8] focus:ring-[#004BB8]/25";

function getStoredPreferences(): Partial<PreferencesForm> {
  if (typeof window === "undefined") return {};

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return {};
    const parsedValue = JSON.parse(storedValue);
    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch {
    return {};
  }
}

function buildInitialPreferences({
  locale,
  region,
  currency,
}: {
  locale: string;
  region: string;
  currency: string;
}): PreferencesForm {
  const stored = getStoredPreferences();

  return {
    homeAirport: stored.homeAirport ?? "",
    preferredAirlines: stored.preferredAirlines ?? "",
    budgetStyle: stored.budgetStyle ?? "balanced-value",
    directVsCheaper: stored.directVsCheaper ?? "prefer-direct-when-close",
    comfortVsSavings: stored.comfortVsSavings ?? "balanced",
    travelPurpose: stored.travelPurpose ?? "mixed",
    travelFrequency: stored.travelFrequency ?? "few-times-year",
    preferredLanguage: locale,
    region,
    currency,
    priceAlertEmails: stored.priceAlertEmails ?? true,
    travelInsightEmails: stored.travelInsightEmails ?? false,
    supportUpdateEmails: stored.supportUpdateEmails ?? true,
    inAppNotifications: stored.inAppNotifications ?? true,
    rememberRecentSearches: stored.rememberRecentSearches ?? true,
    useSearchesForPersonalization: stored.useSearchesForPersonalization ?? true,
    highlightRelevantIdeas: stored.highlightRelevantIdeas ?? true,
  };
}

function getLanguageLabel(option: { label: string; nativeLabel: string }) {
  return option.label === option.nativeLabel
    ? option.label
    : `${option.label} - ${option.nativeLabel}`;
}

function PreferenceSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="text-lg font-semibold leading-7 text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function TextField({
  id,
  label,
  helper,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  helper?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      />
      {helper ? <p className="text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClassName}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
    >
      <span>{label}</span>
      <input
        id={id}
        name={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={toggleClassName}
      />
    </label>
  );
}

export function PreferencesContent() {
  const { locale, locales, setLocale } = useLocale();
  const {
    currencies,
    mode,
    options: regionOptions,
    selectedCurrency,
    setCurrency,
    setMode,
  } = useRegion();

  const languageOptions = useMemo(
    () => locales.filter((option) => option.status === "available"),
    [locales],
  );
  const sortedCurrencies = useMemo(
    () => [...currencies].sort((a, b) => a.code.localeCompare(b.code)),
    [currencies],
  );
  const sortedRegions = useMemo(
    () => [...regionOptions].sort((a, b) => a.country.localeCompare(b.country)),
    [regionOptions],
  );

  const [form, setForm] = useState<PreferencesForm>(() =>
    buildInitialPreferences({ locale, region: mode, currency: selectedCurrency }),
  );
  const [savedForm, setSavedForm] = useState<PreferencesForm>(() =>
    buildInitialPreferences({ locale, region: mode, currency: selectedCurrency }),
  );
  const [saveMessage, setSaveMessage] = useState("");

  const hasChanges = JSON.stringify(form) !== JSON.stringify(savedForm);

  function updateValue<Key extends keyof PreferencesForm>(
    key: Key,
    value: PreferencesForm[Key],
  ) {
    setSaveMessage("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!setLocale(form.preferredLanguage)) return;

    setMode(form.region);
    setCurrency(form.currency);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Best effort only; display settings above still update through providers.
    }

    setSavedForm(form);
    setSaveMessage("Preferences saved.");
  }

  function handleCancel() {
    setForm(savedForm);
    setSaveMessage("");
  }

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-12">
      <header className="bg-[#021C2B] text-start text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <AccountBackLink variant="hero" />
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
            Preferences
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50 sm:text-base">
            Personalize how Kurioticket searches, displays prices, remembers activity,
            and sends alerts. Final prices, rules, availability, and booking steps are
            always confirmed by the external provider.
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-6 max-w-6xl space-y-6 px-4 sm:-mt-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <PreferenceSection
            title="Search defaults"
            description="Defaults Kurioticket can use to prefill searches and organize comparison results."
          >
            <TextField
              id="homeAirport"
              label="Home airport"
              placeholder="Example: JFK, LHR, LOS"
              value={form.homeAirport}
              onChange={(value) => updateValue("homeAirport", value)}
            />
            <TextField
              id="preferredAirlines"
              label="Preferred airlines"
              helper="Optional. Used only for search personalization when provider data supports it."
              placeholder="Example: Delta, Emirates, British Airways"
              value={form.preferredAirlines}
              onChange={(value) => updateValue("preferredAirlines", value)}
            />
            <SelectField
              id="budgetStyle"
              label="Budget style"
              value={form.budgetStyle}
              options={selectOptions.budgetStyle}
              onChange={(value) => updateValue("budgetStyle", value)}
            />
            <SelectField
              id="directVsCheaper"
              label="Direct vs cheaper"
              value={form.directVsCheaper}
              options={selectOptions.directVsCheaper}
              onChange={(value) => updateValue("directVsCheaper", value)}
            />
            <SelectField
              id="comfortVsSavings"
              label="Comfort vs savings"
              value={form.comfortVsSavings}
              options={selectOptions.comfortVsSavings}
              onChange={(value) => updateValue("comfortVsSavings", value)}
            />
            <SelectField
              id="travelPurpose"
              label="Travel purpose"
              value={form.travelPurpose}
              options={selectOptions.travelPurpose}
              onChange={(value) => updateValue("travelPurpose", value)}
            />
            <SelectField
              id="travelFrequency"
              label="Travel frequency"
              value={form.travelFrequency}
              options={selectOptions.travelFrequency}
              onChange={(value) => updateValue("travelFrequency", value)}
            />
          </PreferenceSection>

          <PreferenceSection
            title="Display settings"
            description="Control language, market, and display currency across Kurioticket."
          >
            <SelectField
              id="preferredLanguage"
              label="Language"
              value={form.preferredLanguage}
              options={languageOptions.map((option) => [option.code, getLanguageLabel(option)])}
              onChange={(value) => updateValue("preferredLanguage", value)}
            />
            <SelectField
              id="region"
              label="Country / region"
              value={form.region}
              options={sortedRegions.map((option) => [option.code, `${option.country} (${option.code})`])}
              onChange={(value) => updateValue("region", value)}
            />
            <SelectField
              id="currency"
              label="Display currency"
              value={form.currency}
              options={sortedCurrencies.map((option) => [option.code, `${option.name} (${option.code})`])}
              onChange={(value) => updateValue("currency", value)}
            />
          </PreferenceSection>

          <PreferenceSection
            title="Alerts & notifications"
            description="Choose which Kurioticket updates can reach you."
          >
            <ToggleField
              id="priceAlertEmails"
              label="Price alert emails"
              checked={form.priceAlertEmails}
              onChange={(checked) => updateValue("priceAlertEmails", checked)}
            />
            <ToggleField
              id="travelInsightEmails"
              label="Travel insight emails"
              checked={form.travelInsightEmails}
              onChange={(checked) => updateValue("travelInsightEmails", checked)}
            />
            <ToggleField
              id="supportUpdateEmails"
              label="Support update emails"
              checked={form.supportUpdateEmails}
              onChange={(checked) => updateValue("supportUpdateEmails", checked)}
            />
            <ToggleField
              id="inAppNotifications"
              label="In-app notifications"
              checked={form.inAppNotifications}
              onChange={(checked) => updateValue("inAppNotifications", checked)}
            />
          </PreferenceSection>

          <PreferenceSection
            title="Privacy & personalization"
            description="Control how Kurioticket remembers activity and personalizes comparison tools."
          >
            <ToggleField
              id="rememberRecentSearches"
              label="Remember recent searches"
              checked={form.rememberRecentSearches}
              onChange={(checked) => updateValue("rememberRecentSearches", checked)}
            />
            <ToggleField
              id="useSearchesForPersonalization"
              label="Use searches to personalize recommendations"
              checked={form.useSearchesForPersonalization}
              onChange={(checked) => updateValue("useSearchesForPersonalization", checked)}
            />
            <ToggleField
              id="highlightRelevantIdeas"
              label="Highlight relevant travel ideas"
              checked={form.highlightRelevantIdeas}
              onChange={(checked) => updateValue("highlightRelevantIdeas", checked)}
            />
          </PreferenceSection>

          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
            <p className="text-sm font-medium text-slate-600" aria-live="polite">
              {saveMessage || "Preferences only personalize Kurioticket search, alerts, and display settings."}
            </p>
            <div className="mt-4 flex flex-col-reverse gap-3 sm:mt-0 sm:flex-row">
              <button
                type="button"
                disabled={!hasChanges}
                onClick={handleCancel}
                className="focus-ring min-h-11 rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!hasChanges}
                className="focus-ring min-h-11 rounded-lg bg-[#004BB8] px-5 text-sm font-semibold text-white transition hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save preferences
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
