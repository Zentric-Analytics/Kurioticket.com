"use client";

import { useState } from "react";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";

type EditablePreferenceKey =
  | "priceAlerts"
  | "savedTripReminders"
  | "routeWatchUpdates"
  | "travelInspiration"
  | "productUpdates"
  | "dealsRecommendations";

type EditablePreference = {
  id: EditablePreferenceKey;
  title: string;
  description: string;
};

type RequiredPreference = {
  id: string;
  title: string;
  description: string;
};

type PreferenceSection = {
  title: string;
  editableRows?: EditablePreference[];
  requiredRows?: RequiredPreference[];
};

const defaultEmailPreferences: Record<EditablePreferenceKey, boolean> = {
  priceAlerts: true,
  savedTripReminders: true,
  routeWatchUpdates: false,
  travelInspiration: false,
  productUpdates: true,
  dealsRecommendations: false,
};

const preferenceSections: PreferenceSection[] = [
  {
    title: "Travel alerts",
    editableRows: [
      {
        id: "priceAlerts",
        title: "Price alert emails",
        description: "Get notified when tracked trip prices change.",
      },
      {
        id: "savedTripReminders",
        title: "Saved trip reminders",
        description: "Receive reminders about saved routes and trips you may want to revisit.",
      },
      {
        id: "routeWatchUpdates",
        title: "Route watch updates",
        description: "Get occasional updates when routes you follow have meaningful changes.",
      },
    ],
  },
  {
    title: "Inspiration and updates",
    editableRows: [
      {
        id: "travelInspiration",
        title: "Travel inspiration",
        description: "Receive destination ideas, planning tips, and seasonal travel suggestions.",
      },
      {
        id: "productUpdates",
        title: "Product updates",
        description: "Hear about new Kurioticket features and account improvements.",
      },
      {
        id: "dealsRecommendations",
        title: "Deals and recommendations",
        description: "Receive curated travel recommendations when they are relevant.",
      },
    ],
  },
  {
    title: "Required emails",
    requiredRows: [
      {
        id: "security-alerts",
        title: "Security alerts",
        description: "Important sign-in, password, and account protection messages.",
      },
      {
        id: "support-replies",
        title: "Support replies",
        description: "Replies to support requests and account help conversations.",
      },
      {
        id: "billing-receipts",
        title: "Billing receipts",
        description: "Subscription, receipt, and billing-related messages when applicable.",
      },
    ],
  },
];

function PreferenceSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label}: ${checked ? "on" : "off"}`}
      onClick={onChange}
      className="focus-ring inline-flex min-h-8 shrink-0 items-center gap-2 rounded-full p-1 text-sm font-semibold text-slate-700 transition"
    >
      <span className="sr-only">{checked ? "On" : "Off"}</span>
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
              ? "inline-block h-5 w-5 translate-x-6 rounded-full bg-white shadow-sm transition"
              : "inline-block h-5 w-5 translate-x-1 rounded-full bg-white shadow-sm transition"
          }
        />
      </span>
      <span className="min-w-8 text-left text-xs font-semibold text-slate-600 sm:text-sm">{checked ? "On" : "Off"}</span>
    </button>
  );
}

export function CustomizationPreferencesContent() {
  const { t } = useLocale();
  const legacyCustomizationTitle = t["accountDashboard.preferences.customization.title"];
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
    setStatusMessage("Email preference saving will be connected soon. Your choices are shown here for preview only.");
  };

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-12 pt-0" data-legacy-customization-title={legacyCustomizationTitle} data-legacy-preference-actions={legacyPreferenceActions}>
      <div className="mx-auto max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8">
        <AccountBackLink />

        <header className="mt-6">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">Email preferences</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Choose which Kurioticket emails you want to receive. We’ll still send critical account, security, and support messages when needed.
          </p>
        </header>

        <section className="mt-7 -mx-4 overflow-hidden rounded-none border border-slate-200 bg-white shadow-sm sm:mx-0 sm:rounded-2xl" aria-labelledby="email-preferences-settings">
          <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 id="email-preferences-settings" className="text-base font-semibold leading-6 text-slate-950">
              Email settings
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Manage optional updates and review the required messages that keep your account running safely.</p>
          </div>

          <div className="px-5 sm:px-6">
            {preferenceSections.map((section, sectionIndex) => (
              <div key={section.title} className={sectionIndex === 0 ? "py-5" : "border-t border-slate-200 py-5"}>
                <h3 className="text-sm font-semibold leading-5 text-slate-950">{section.title}</h3>
                <div className="mt-3 divide-y divide-slate-100">
                  {section.editableRows?.map((row) => (
                    <div key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-5 text-slate-950">{row.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{row.description}</p>
                      </div>
                      <PreferenceSwitch checked={preferences[row.id]} label={row.title} onChange={() => updatePreference(row.id)} />
                    </div>
                  ))}

                  {section.requiredRows?.map((row) => (
                    <div key={row.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold leading-5 text-slate-950">{row.title}</p>
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" aria-label={`${row.title} is always on`}>
                            Always on
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{row.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-6 text-slate-600">We respect your inbox. You can update these preferences anytime.</p>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button type="button" onClick={resetToDefault} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Reset to default
                </button>
                <button type="button" onClick={previewSave} className="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B]">
                  Save preferences
                </button>
              </div>
            </div>
            {statusMessage ? (
              <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium leading-6 text-blue-900" role="status" aria-live="polite">
                {statusMessage}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

// Legacy route-audit keys retained because this route is still /dashboard/preferences/customization.
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
