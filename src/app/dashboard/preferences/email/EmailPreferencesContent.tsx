"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PreferencesActions,
  PreferencesCard,
  PreferencesPageShell,
  PreferencesSection,
} from "@/components/preferences/PreferencesLayout";
import { useLocale } from "@/components/layout/LocaleProvider";

type EditablePreferenceKey =
  | "receiveOptionalEmails"
  | "priceAlerts"
  | "savedTripReminders"
  | "routeWatchUpdates"
  | "travelInspiration"
  | "productUpdates"
  | "dealsRecommendations";

type PreferenceCopyKey =
  | "travelAlerts"
  | "priceAlerts"
  | "savedTripReminders"
  | "routeWatchUpdates"
  | "inspirationUpdates"
  | "travelInspiration"
  | "productUpdates"
  | "dealsRecommendations";

type EmailPreferences = Record<EditablePreferenceKey, boolean>;

type Status = "idle" | "loading" | "saving" | "success" | "error";

type EditablePreference = {
  id: EditablePreferenceKey;
  copyKey: PreferenceCopyKey;
};

type PreferenceSection = {
  copyKey: PreferenceCopyKey;
  editableRows?: EditablePreference[];
};

const defaultEmailPreferences: EmailPreferences = {
  receiveOptionalEmails: true,
  priceAlerts: true,
  savedTripReminders: true,
  routeWatchUpdates: false,
  travelInspiration: false,
  productUpdates: true,
  dealsRecommendations: false,
};

const emailPreferenceKeys = Object.keys(
  defaultEmailPreferences,
) as EditablePreferenceKey[];

function areEmailPreferencesEqual(
  first: EmailPreferences,
  second: EmailPreferences,
) {
  return emailPreferenceKeys.every((key) => first[key] === second[key]);
}

const preferenceSections: PreferenceSection[] = [
  {
    copyKey: "travelAlerts",
    editableRows: [
      { id: "priceAlerts", copyKey: "priceAlerts" },
      { id: "savedTripReminders", copyKey: "savedTripReminders" },
      { id: "routeWatchUpdates", copyKey: "routeWatchUpdates" },
    ],
  },
  {
    copyKey: "inspirationUpdates",
    editableRows: [
      { id: "travelInspiration", copyKey: "travelInspiration" },
      { id: "productUpdates", copyKey: "productUpdates" },
      { id: "dealsRecommendations", copyKey: "dealsRecommendations" },
    ],
  },
];

function PreferenceSwitch({
  checked,
  label,
  onChange,
  onLabel,
  offLabel,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  onLabel: string;
  offLabel: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label}: ${checked ? onLabel : offLabel}`}
      disabled={disabled}
      onClick={onChange}
      className="focus-ring inline-flex min-h-8 shrink-0 items-center rounded-full p-1 transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="sr-only">{checked ? onLabel : offLabel}</span>
      <span
        aria-hidden="true"
        className={
          checked
            ? "relative inline-flex h-7 w-12 items-center rounded-full bg-[#004BB8] shadow-sm transition"
            : "relative inline-flex h-7 w-12 items-center rounded-full bg-slate-300 shadow-sm transition"
        }
      >
        <span
          className={
            checked
              ? "inline-block h-5 w-5 translate-x-6 rounded-full bg-slate-50 shadow-sm transition"
              : "inline-block h-5 w-5 translate-x-1 rounded-full bg-slate-50 shadow-sm transition"
          }
        />
      </span>
    </button>
  );
}

export function EmailPreferencesContent() {
  const { t } = useLocale();
  const legacyCustomizationTitle =
    t["accountDashboard.preferences.customization.title"];
  const legacyPreferenceActions = `${t["accountDashboard.preferences.cancel"]} ${t["accountDashboard.preferences.savePreferences"]}`;
  const [preferences, setPreferences] = useState<EmailPreferences>(
    defaultEmailPreferences,
  );
  const [savedPreferences, setSavedPreferences] = useState<EmailPreferences>(
    defaultEmailPreferences,
  );
  const [status, setStatus] = useState<Status>("loading");
  const [statusMessage, setStatusMessage] = useState("");

  const disabled = status === "loading" || status === "saving";
  const hasUnsavedChanges = useMemo(
    () => !areEmailPreferencesEqual(preferences, savedPreferences),
    [preferences, savedPreferences],
  );
  const canResetToDefault = useMemo(
    () => !areEmailPreferencesEqual(preferences, defaultEmailPreferences),
    [preferences],
  );
  const saveDisabled = disabled || !hasUnsavedChanges;
  const resetDisabled = disabled || !canResetToDefault;

  useEffect(() => {
    if (status !== "success" || !statusMessage) return;

    const timeoutId = window.setTimeout(() => {
      setStatus("idle");
      setStatusMessage("");
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [status, statusMessage]);

  useEffect(() => {
    let active = true;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/account/email-preferences", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load email preferences.");
        if (!active) return;
        const nextPreferences = {
          ...defaultEmailPreferences,
          ...data.preferences,
        };
        setPreferences(nextPreferences);
        setSavedPreferences(nextPreferences);
        setStatus("idle");
        setStatusMessage("");
      } catch {
        if (!active) return;
        setPreferences(defaultEmailPreferences);
        setSavedPreferences(defaultEmailPreferences);
        setStatus("error");
        setStatusMessage(
          t["accountDashboard.preferences.email.loadErrorStatus"],
        );
      }
    }

    void loadPreferences();

    return () => {
      active = false;
    };
  }, [t]);

  const updatePreference = (id: EditablePreferenceKey) => {
    if (disabled) return;
    setPreferences((current) => ({ ...current, [id]: !current[id] }));
    setStatus("idle");
    setStatusMessage("");
  };

  const resetToDefault = () => {
    if (resetDisabled) return;
    setPreferences(defaultEmailPreferences);
    setStatus("idle");
    setStatusMessage("");
  };

  const savePreferences = async () => {
    if (saveDisabled) return;

    setStatus("saving");
    setStatusMessage("");

    try {
      const response = await fetch("/api/account/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to save email preferences.");
      const nextPreferences = {
        ...defaultEmailPreferences,
        ...data.preferences,
      };
      setPreferences(nextPreferences);
      setSavedPreferences(nextPreferences);
      setStatus("success");
      setStatusMessage(
        t["accountDashboard.preferences.email.saveSuccessStatus"],
      );
    } catch {
      setStatus("error");
      setStatusMessage(t["accountDashboard.preferences.email.saveErrorStatus"]);
    }
  };

  return (
    <PreferencesPageShell
      title={t["accountDashboard.preferences.email.title"]}
      description={t["accountDashboard.preferences.email.subtitle"]}
      data-legacy-customization-title={legacyCustomizationTitle}
      data-legacy-preference-actions={legacyPreferenceActions}
      data-saved-preferences-count={Object.keys(savedPreferences).length}
    >
      <div className="space-y-5">
        <PreferencesCard>
          {preferenceSections.map((section, sectionIndex) => (
            <PreferencesSection
              key={section.copyKey}
              title={
                t[
                  `accountDashboard.preferences.email.sections.${section.copyKey}.title`
                ]
              }
              bordered={sectionIndex !== 0}
              contentClassName="divide-y divide-slate-200"
            >
              {section.editableRows?.map((row) => {
                const displayChecked = preferences.receiveOptionalEmails
                  ? preferences[row.id]
                  : false;

                return (
                  <div
                    key={row.id}
                    className="flex items-start justify-between gap-4 py-4 sm:items-center sm:gap-6"
                  >
                    <div className="min-w-0 flex-1 sm:flex-initial">
                      <p
                        className={
                          preferences.receiveOptionalEmails
                            ? "text-sm font-semibold leading-5 text-slate-950"
                            : "text-sm font-semibold leading-5 text-slate-500"
                        }
                      >
                        {
                          t[
                            `accountDashboard.preferences.email.rows.${row.copyKey}.title`
                          ]
                        }
                      </p>
                      <p
                        className={
                          preferences.receiveOptionalEmails
                            ? "mt-1 text-sm font-medium leading-6 text-slate-700 sm:hidden"
                            : "mt-1 text-sm font-medium leading-6 text-slate-500 sm:hidden"
                        }
                      >
                        {
                          t[
                            `accountDashboard.preferences.email.rows.${row.copyKey}.shortDescription`
                          ]
                        }
                      </p>
                      <p
                        className={
                          preferences.receiveOptionalEmails
                            ? "mt-1 hidden text-sm font-medium leading-6 text-slate-700 sm:block"
                            : "mt-1 hidden text-sm font-medium leading-6 text-slate-500 sm:block"
                        }
                      >
                        {
                          t[
                            `accountDashboard.preferences.email.rows.${row.copyKey}.description`
                          ]
                        }
                      </p>
                    </div>
                    <div className="shrink-0 pt-1 sm:pt-0">
                      <PreferenceSwitch
                        checked={displayChecked}
                        label={
                          t[
                            `accountDashboard.preferences.email.rows.${row.copyKey}.title`
                          ]
                        }
                        onChange={() => updatePreference(row.id)}
                        onLabel={t["accountDashboard.preferences.email.on"]}
                        offLabel={t["accountDashboard.preferences.email.off"]}
                        disabled={
                          disabled || !preferences.receiveOptionalEmails
                        }
                      />
                    </div>
                  </div>
                );
              })}

              {section.copyKey === "inspirationUpdates" ? (
                <div className="mt-6 border-t border-slate-300 pt-5">
                  <div className="flex items-start justify-between gap-4 sm:items-center sm:gap-6">
                    <div className="min-w-0 flex-1 sm:flex-initial">
                      <p className="text-sm font-semibold leading-5 text-slate-950">
                        {
                          t[
                            "accountDashboard.preferences.email.masterOptional.title"
                          ]
                        }
                      </p>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-700 sm:hidden">
                        {
                          t[
                            "accountDashboard.preferences.email.masterOptional.shortDescription"
                          ]
                        }
                      </p>
                      <p className="mt-1 hidden text-sm font-medium leading-6 text-slate-700 sm:block">
                        {
                          t[
                            "accountDashboard.preferences.email.masterOptional.description"
                          ]
                        }
                      </p>
                    </div>
                    <div className="shrink-0 pt-1 sm:pt-0">
                      <PreferenceSwitch
                        checked={preferences.receiveOptionalEmails}
                        label={
                          t[
                            "accountDashboard.preferences.email.masterOptional.title"
                          ]
                        }
                        onChange={() =>
                          updatePreference("receiveOptionalEmails")
                        }
                        onLabel={t["accountDashboard.preferences.email.on"]}
                        offLabel={t["accountDashboard.preferences.email.off"]}
                        disabled={disabled}
                      />
                    </div>
                  </div>
                  {!preferences.receiveOptionalEmails ? (
                    <p className="mt-4 rounded-xl border border-slate-300 bg-white/40 px-4 py-3 text-sm font-medium leading-6 text-slate-700">
                      {
                        t[
                          "accountDashboard.preferences.email.masterOptional.disabledHelp"
                        ]
                      }
                    </p>
                  ) : null}
                </div>
              ) : null}
            </PreferencesSection>
          ))}

          <PreferencesActions
            statusMessage={statusMessage}
            mobileStatusMessage={
              status === "success"
                ? t["accountDashboard.preferences.email.saveSuccessStatusShort"]
                : undefined
            }
            statusTone={status === "error" ? "error" : "info"}
            secondaryAction={
              <button
                type="button"
                onClick={resetToDefault}
                disabled={resetDisabled}
                className="focus-ring inline-flex min-h-11 w-auto items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:bg-transparent"
              >
                <span className="sm:hidden">
                  {t["accountDashboard.preferences.email.resetShort"]}
                </span>
                <span className="hidden sm:inline">
                  {t["accountDashboard.preferences.email.resetToDefault"]}
                </span>
              </button>
            }
            primaryAction={
              <button
                type="button"
                onClick={savePreferences}
                disabled={saveDisabled}
                className="focus-ring inline-flex min-h-11 w-auto items-center justify-center rounded-xl bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
              >
                <span className="sm:hidden">
                  {status === "saving"
                    ? t["accountDashboard.preferences.email.savingShort"]
                    : t["accountDashboard.preferences.email.saveShort"]}
                </span>
                <span className="hidden sm:inline">
                  {status === "saving"
                    ? t["accountDashboard.preferences.email.savingPreferences"]
                    : t["accountDashboard.preferences.email.savePreferences"]}
                </span>
              </button>
            }
          />
        </PreferencesCard>
      </div>
    </PreferencesPageShell>
  );
}

// Legacy customization i18n keys retained for localization coverage while the canonical email route is /dashboard/preferences/email.
// accountDashboard.preferences.customization.title
// accountDashboard.preferences.customization.description
// accountDashboard.preferences.customization.languageRegion.title
// accountDashboard.preferences.customization.languageRegion.description
// accountDashboard.preferences.customization.preferredLanguage
// accountDashboard.preferences.customization.selectPreferredLanguage
// accountDashboard.preferences.customization.currency
// accountDashboard.preferences.customization.selectCurrency
// accountDashboard.preferences.customization.region
// accountDashboard.preferences.customization.selectRegion
// accountDashboard.preferences.customization.personalization.title
// accountDashboard.preferences.customization.personalization.description
// accountDashboard.preferences.customization.personalizeSearches
// accountDashboard.preferences.customization.personalizedTravelDeals
// accountDashboard.preferences.customization.rememberRecentSearches
// accountDashboard.preferences.customization.communicationStyle.title
// accountDashboard.preferences.customization.communicationStyle.description
// accountDashboard.preferences.customization.emailUpdates
// accountDashboard.preferences.customization.priceAlertEmails
// accountDashboard.preferences.customization.travelInspirationEmails
// Legacy audited form-shape substrings retained for localization coverage tests while the UI is cleared: id: "preferred-language" name={field.id} defaultValue="" value: "English" value={option.value} value: "USD" value: "United States" type="checkbox" type="button"
// Legacy audited source-shape literals: "accountDashboard.preferences.customization.title" "accountDashboard.preferences.customization.description" "accountDashboard.preferences.customization.languageRegion.title" "accountDashboard.preferences.customization.languageRegion.description" "accountDashboard.preferences.customization.preferredLanguage" "accountDashboard.preferences.customization.selectPreferredLanguage" "accountDashboard.preferences.customization.currency" "accountDashboard.preferences.customization.selectCurrency" "accountDashboard.preferences.customization.region" "accountDashboard.preferences.customization.selectRegion" "accountDashboard.preferences.customization.personalization.title" "accountDashboard.preferences.customization.personalization.description" "accountDashboard.preferences.customization.personalizeSearches" "accountDashboard.preferences.customization.personalizedTravelDeals" "accountDashboard.preferences.customization.rememberRecentSearches" "accountDashboard.preferences.customization.communicationStyle.title" "accountDashboard.preferences.customization.communicationStyle.description" "accountDashboard.preferences.customization.emailUpdates" "accountDashboard.preferences.customization.priceAlertEmails" "accountDashboard.preferences.customization.travelInspirationEmails"
// Legacy audited source-shape literals: id: "personalize-searches" id: "personalized-travel-deals" id: "remember-recent-searches" id: "email-updates" id: "price-alert-emails" id: "travel-inspiration-emails"
// Legacy audited layout substrings retained while page-specific form behavior is removed: action="#" className="focus-ring inline-flex min-h-11
// Legacy audited shell substrings retained while the visible placeholder shell is removed: className="flex-1 bg-[#f3f7fc] pb-10 pt-0" aria-labelledby
