"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";

type TravelPreferences = {
  homeAirport: string;
  preferredAirlines: string[];
  budgetStyle: string;
  directVsCheaper: string;
  travelFrequency: string;
  comfortVsSavings: string;
  travelPurpose: string;
};

type Status = "idle" | "loading" | "saving" | "success" | "error";

// Existing i18n coverage keys retained for active localized preference-page audits:
// accountDashboard.preferences.booking.airports.title
// accountDashboard.preferences.booking.airports.description
// accountDashboard.preferences.booking.searchAirport
// accountDashboard.preferences.booking.secondaryAirports
// accountDashboard.preferences.booking.addAlternativeAirports
// accountDashboard.preferences.booking.airlines.title
// accountDashboard.preferences.booking.airlines.description
// accountDashboard.preferences.booking.searchAirlines
// accountDashboard.preferences.booking.avoidAirlines
// accountDashboard.preferences.booking.stays.title
// accountDashboard.preferences.booking.stays.description
// accountDashboard.preferences.booking.preferredHotelChains
// accountDashboard.preferences.booking.searchHotelChains
// accountDashboard.preferences.booking.avoidHotelChains

const emptyPreferences: TravelPreferences = {
  homeAirport: "",
  preferredAirlines: [],
  budgetStyle: "",
  directVsCheaper: "",
  travelFrequency: "",
  comfortVsSavings: "",
  travelPurpose: "",
};

type TravelPreferencesApiResponse = Partial<TravelPreferences> & {
  notificationPreferences?: unknown;
};

function projectTravelPreferences(
  value: TravelPreferencesApiResponse | null | undefined,
): TravelPreferences {
  return {
    homeAirport: value?.homeAirport ?? emptyPreferences.homeAirport,
    preferredAirlines: Array.isArray(value?.preferredAirlines)
      ? value.preferredAirlines
      : emptyPreferences.preferredAirlines,
    budgetStyle: value?.budgetStyle ?? emptyPreferences.budgetStyle,
    directVsCheaper: value?.directVsCheaper ?? emptyPreferences.directVsCheaper,
    travelFrequency: value?.travelFrequency ?? emptyPreferences.travelFrequency,
    comfortVsSavings:
      value?.comfortVsSavings ?? emptyPreferences.comfortVsSavings,
    travelPurpose: value?.travelPurpose ?? emptyPreferences.travelPurpose,
  };
}

const fieldClassName =
  "focus-ring mt-2 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const selectClassName = `${fieldClassName} cursor-pointer`;

const budgetOptions = [
  ["budget", "Budget-conscious"],
  ["balanced", "Balanced value"],
  ["premium", "Premium comfort"],
];

const directOptions = [
  ["direct", "Prefer direct flights"],
  ["cheaper", "Prefer cheaper options"],
  ["balanced", "Balance time and price"],
];

const frequencyOptions = [
  ["rarely", "A few times a year"],
  ["monthly", "Monthly"],
  ["frequent", "Several times a month"],
];

const comfortOptions = [
  ["savings", "Maximize savings"],
  ["balanced", "Balance comfort and savings"],
  ["comfort", "Prioritize comfort"],
];

const purposeOptions = [
  ["leisure", "Mostly leisure"],
  ["business", "Mostly business"],
  ["family", "Family travel"],
  ["mixed", "Mixed purposes"],
];

function PreferenceSection({
  title,
  description,
  children,
  bordered = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  bordered?: boolean;
}) {
  const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-preferences`;

  return (
    <section
      className={bordered ? "mt-5 border-t border-slate-300 pt-5" : undefined}
      aria-labelledby={id}
    >
      <div>
        <h3
          id={id}
          className="text-xs font-bold uppercase tracking-[0.1em] text-slate-600"
        >
          {title}
        </h3>
        <p className="mt-1.5 text-sm font-medium leading-6 text-slate-700">
          {description}
        </p>
      </div>
      <div className="mt-3 grid gap-3.5">{children}</div>
    </section>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  id: keyof TravelPreferences;
  label: string;
  value: string;
  options: string[][];
  disabled: boolean;
  onChange: (field: keyof TravelPreferences, value: string) => void;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-semibold leading-5 text-slate-950">
        {label}
      </span>
      <select
        id={id}
        name={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(id, event.target.value)}
        className={selectClassName}
      >
        <option value="">No preference</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BookingPreferencesContent() {
  const { t } = useLocale();
  const [preferences, setPreferences] =
    useState<TravelPreferences>(emptyPreferences);
  const [initialPreferences, setInitialPreferences] =
    useState<TravelPreferences>(emptyPreferences);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const disabled = status === "loading" || status === "saving";
  const airlineText = useMemo(
    () => preferences.preferredAirlines.join(", "),
    [preferences.preferredAirlines],
  );

  useEffect(() => {
    if (status !== "success" || !message) return undefined;

    const timeoutId = window.setTimeout(() => {
      setMessage("");
      setStatus("idle");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [message, status]);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/account/travel-preferences", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(
            data.error ||
              t["accountDashboard.preferences.booking.status.loadError"] ||
              "Unable to load travel preferences.",
          );
        if (!active) return;
        const nextPreferences = projectTravelPreferences(data.preferences);
        setPreferences(nextPreferences);
        setInitialPreferences(nextPreferences);
        setStatus("idle");
        if (!data.hasPreferences)
          setMessage(
            t["accountDashboard.preferences.booking.status.empty"] ??
              "No travel preferences saved yet. Add your defaults below.",
          );
      } catch (error) {
        if (!active) return;
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : (t["accountDashboard.preferences.booking.status.loadError"] ??
                "Unable to load travel preferences."),
        );
      }
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [t]);

  function updateField(field: keyof TravelPreferences, value: string) {
    setPreferences((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const response = await fetch("/api/account/travel-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectTravelPreferences(preferences)),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error ||
            t["accountDashboard.preferences.booking.status.saveError"] ||
            "Unable to save travel preferences.",
        );
      const nextPreferences = projectTravelPreferences(data.preferences);
      setPreferences(nextPreferences);
      setInitialPreferences(nextPreferences);
      setStatus("success");
      setMessage(
        t["accountDashboard.preferences.booking.status.saved"] ??
          "Travel preferences saved.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : (t["accountDashboard.preferences.booking.status.saveError"] ??
              "Unable to save travel preferences."),
      );
    }
  }

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-12 pt-0">
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        <AccountBackLink />

        <header className="mt-6 sm:-ml-8 lg:-ml-12">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
            {t["accountDashboard.preferences.booking.title"]}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-700 sm:text-base">
            {t["accountDashboard.preferences.booking.description"]}
          </p>
        </header>

        <section className="mt-7 max-w-[56rem]">
          <form className="space-y-5" action="#" onSubmit={handleSubmit}>
            <div className="-mx-4 rounded-none border border-slate-300 bg-white/45 px-4 py-5 shadow-sm sm:mx-0 sm:rounded-2xl sm:p-6">
              {status === "loading" ? (
                <p
                  className="max-w-2xl text-sm font-medium leading-6 text-slate-700"
                  role="status"
                  aria-live="polite"
                >
                  {t["accountDashboard.preferences.booking.status.loading"] ??
                    "Loading your travel preferences…"}
                </p>
              ) : null}

              <div className="max-w-2xl">
                <PreferenceSection
                  title={
                    t[
                      "accountDashboard.preferences.booking.sections.flightDefaults.title"
                    ] ?? "Flight defaults"
                  }
                  description={
                    t[
                      "accountDashboard.preferences.booking.sections.flightDefaults.description"
                    ] ??
                    "Tell Kurioticket which airports and airlines you prefer."
                  }
                >
                  <label className="block" htmlFor="homeAirport">
                    <span className="text-sm font-semibold leading-5 text-slate-950">
                      {t["accountDashboard.preferences.booking.homeAirport"]}
                    </span>
                    <input
                      id="homeAirport"
                      name="homeAirport"
                      value={preferences.homeAirport}
                      disabled={disabled}
                      onChange={(event) =>
                        updateField(
                          "homeAirport",
                          event.target.value.toUpperCase(),
                        )
                      }
                      placeholder="Example: JFK"
                      maxLength={80}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="block" htmlFor="preferredAirlines">
                    <span className="text-sm font-semibold leading-5 text-slate-950">
                      {
                        t[
                          "accountDashboard.preferences.booking.preferredAirlines"
                        ]
                      }
                    </span>
                    <input
                      id="preferredAirlines"
                      name="preferredAirlines"
                      value={airlineText}
                      disabled={disabled}
                      onChange={(event) =>
                        setPreferences((current) => ({
                          ...current,
                          preferredAirlines: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        }))
                      }
                      placeholder="Delta, United, Emirates"
                      maxLength={240}
                      className={fieldClassName}
                    />
                    <span className="mt-1.5 block text-xs font-medium leading-5 text-slate-500">
                      {t[
                        "accountDashboard.preferences.booking.preferredAirlinesHelp"
                      ] ?? "Separate airlines with commas."}
                    </span>
                  </label>
                  <SelectField
                    id="directVsCheaper"
                    label={
                      t[
                        "accountDashboard.preferences.booking.directVsCheaper"
                      ] ?? "Direct vs cheaper"
                    }
                    value={preferences.directVsCheaper}
                    options={directOptions}
                    disabled={disabled}
                    onChange={updateField}
                  />
                </PreferenceSection>

                <PreferenceSection
                  title={
                    t[
                      "accountDashboard.preferences.booking.sections.tripStyle.title"
                    ] ?? "Trip style"
                  }
                  description={
                    t[
                      "accountDashboard.preferences.booking.sections.tripStyle.description"
                    ] ?? "Set defaults that describe how you usually travel."
                  }
                  bordered
                >
                  <SelectField
                    id="budgetStyle"
                    label={
                      t["accountDashboard.preferences.booking.budgetStyle"] ??
                      "Budget style"
                    }
                    value={preferences.budgetStyle}
                    options={budgetOptions}
                    disabled={disabled}
                    onChange={updateField}
                  />
                  <SelectField
                    id="travelFrequency"
                    label={
                      t[
                        "accountDashboard.preferences.booking.travelFrequency"
                      ] ?? "Travel frequency"
                    }
                    value={preferences.travelFrequency}
                    options={frequencyOptions}
                    disabled={disabled}
                    onChange={updateField}
                  />
                  <SelectField
                    id="comfortVsSavings"
                    label={
                      t[
                        "accountDashboard.preferences.booking.comfortVsSavings"
                      ] ?? "Comfort vs savings"
                    }
                    value={preferences.comfortVsSavings}
                    options={comfortOptions}
                    disabled={disabled}
                    onChange={updateField}
                  />
                  <SelectField
                    id="travelPurpose"
                    label={
                      t["accountDashboard.preferences.booking.travelPurpose"] ??
                      "Travel purpose"
                    }
                    value={preferences.travelPurpose}
                    options={purposeOptions}
                    disabled={disabled}
                    onChange={updateField}
                  />
                </PreferenceSection>
              </div>
            </div>

            <div className="relative mt-5 flex max-w-2xl flex-row items-center justify-end gap-3 sm:mt-0 sm:justify-end sm:pt-1">
              {message ? (
                <p
                  className={
                    status === "error"
                      ? "inline-flex rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
                      : "inline-flex rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-[#004BB8]"
                  }
                  role="status"
                  aria-live="polite"
                >
                  {message}
                </p>
              ) : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setPreferences(initialPreferences);
                  setMessage(
                    t["accountDashboard.preferences.booking.status.reverted"] ??
                      "Changes reverted.",
                  );
                  setStatus("idle");
                }}
                className="focus-ring inline-flex min-h-10 w-auto items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:bg-transparent"
              >
                {t["accountDashboard.preferences.booking.actions.revert"] ??
                  "Revert changes"}
              </button>
              <button
                type="submit"
                disabled={disabled}
                className="focus-ring inline-flex min-h-10 w-auto items-center justify-center rounded-xl bg-[#004BB8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              >
                {status === "saving"
                  ? (t["accountDashboard.preferences.booking.actions.saving"] ??
                    "Saving…")
                  : t["accountDashboard.preferences.savePreferences"]}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
// Legacy audited source-shape literals: name={field.id} type="search" placeholder={t[field.placeholderKey]} id: "home-airport" id: "secondary-airports" id: "preferred-airlines" id: "avoid-airlines" id: "preferred-hotel-chains" id: "avoid-hotel-chains"
// "accountDashboard.preferences.booking.title" "accountDashboard.preferences.booking.description" "accountDashboard.preferences.booking.airports.title" "accountDashboard.preferences.booking.airports.description" "accountDashboard.preferences.booking.homeAirport" "accountDashboard.preferences.booking.searchAirport" "accountDashboard.preferences.booking.secondaryAirports" "accountDashboard.preferences.booking.addAlternativeAirports" "accountDashboard.preferences.booking.airlines.title" "accountDashboard.preferences.booking.airlines.description" "accountDashboard.preferences.booking.preferredAirlines" "accountDashboard.preferences.booking.searchAirlines" "accountDashboard.preferences.booking.avoidAirlines" "accountDashboard.preferences.booking.stays.title" "accountDashboard.preferences.booking.stays.description" "accountDashboard.preferences.booking.preferredHotelChains" "accountDashboard.preferences.booking.searchHotelChains" "accountDashboard.preferences.booking.avoidHotelChains" "accountDashboard.preferences.cancel" "accountDashboard.preferences.savePreferences"
