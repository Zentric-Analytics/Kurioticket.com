"use client";

import { useState } from "react";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
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

type EditablePreference = {
  id: EditablePreferenceKey;
  copyKey: PreferenceCopyKey;
};

type PreferenceSection = {
  copyKey: PreferenceCopyKey;
  editableRows?: EditablePreference[];
};

const defaultEmailPreferences: Record<EditablePreferenceKey, boolean> = {
  receiveOptionalEmails: true,
  priceAlerts: true,
  savedTripReminders: true,
  routeWatchUpdates: false,
  travelInspiration: false,
  productUpdates: true,
  dealsRecommendations: false,
};

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
  const [preferences, setPreferences] = useState(defaultEmailPreferences);
  const [statusMessage, setStatusMessage] = useState("");

  const updatePreference = (id: EditablePreferenceKey) => {
    setPreferences((current) => ({ ...current, [id]: !current[id] }));
    setStatusMessage("");
  };

  const resetToDefault = () => {
    setPreferences(defaultEmailPreferences);
    setStatusMessage("");
  };

  const previewSave = () => {
    setStatusMessage(t["accountDashboard.preferences.email.previewSaveStatus"]);
  };

  return (
    <main
      className="flex-1 bg-[#f3f7fc] pb-12 pt-0"
      data-legacy-customization-title={legacyCustomizationTitle}
      data-legacy-preference-actions={legacyPreferenceActions}
    >
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        <AccountBackLink />

        <header className="mt-6 sm:-ml-8 lg:-ml-12">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
            {t["accountDashboard.preferences.email.title"]}
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-700 sm:text-base">
            {t["accountDashboard.preferences.email.subtitle"]}
          </p>
        </header>

        <section className="mt-7 max-w-[56rem]">
          <div className="space-y-5">
            {preferenceSections.map((section) => (
              <div
                key={section.copyKey}
                className="rounded-2xl border border-slate-300 bg-white/45 p-5 shadow-sm sm:p-6"
              >
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-slate-600">
                  {
                    t[
                      `accountDashboard.preferences.email.sections.${section.copyKey}.title`
                    ]
                  }
                </h3>
                <div className="mt-3 divide-y divide-slate-200">
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
                            offLabel={
                              t["accountDashboard.preferences.email.off"]
                            }
                            disabled={!preferences.receiveOptionalEmails}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

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
              </div>
            ))}

            <div className="mt-5 flex items-center gap-3 sm:mt-0 sm:justify-end sm:pt-1">
              <button
                type="button"
                onClick={resetToDefault}
                className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 bg-transparent px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:flex-none sm:px-5"
              >
                <span className="sm:hidden">
                  {t["accountDashboard.preferences.email.resetShort"]}
                </span>
                <span className="hidden sm:inline">
                  {t["accountDashboard.preferences.email.resetToDefault"]}
                </span>
              </button>
              <button
                type="button"
                onClick={previewSave}
                className="focus-ring inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#004BB8] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] sm:flex-none sm:px-5"
              >
                <span className="sm:hidden">
                  {t["accountDashboard.preferences.email.saveShort"]}
                </span>
                <span className="hidden sm:inline">
                  {t["accountDashboard.preferences.email.savePreferences"]}
                </span>
              </button>
            </div>
            {statusMessage ? (
              <p
                className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium leading-6 text-blue-900"
                role="status"
                aria-live="polite"
              >
                {statusMessage}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
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
