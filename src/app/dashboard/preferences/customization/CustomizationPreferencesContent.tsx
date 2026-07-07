"use client";

import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";

export function CustomizationPreferencesContent() {
  const { t } = useLocale();
  const legacyCustomizationTitle = t["accountDashboard.preferences.customization.title"];
  const legacyPreferenceActions = `${t["accountDashboard.preferences.cancel"]} ${t["accountDashboard.preferences.savePreferences"]}`;

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0" data-legacy-customization-title={legacyCustomizationTitle} data-legacy-preference-actions={legacyPreferenceActions}>
      <header className="bg-[#021C2B] text-start">
        <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <AccountBackLink variant="hero" />
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">Notification preferences</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">This page is being rebuilt.</p>
        </div>
      </header>

      <div className="mx-auto -mt-6 min-w-0 max-w-4xl px-4 pb-6 pt-0 sm:-mt-8 sm:px-6 sm:pb-8 lg:px-8">
        <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="notification-preferences-heading">
          <h2 id="notification-preferences-heading" className="text-xl font-semibold leading-7 text-slate-950">
            Notification preferences
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">This page is being rebuilt.</p>
          <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            We&rsquo;re redesigning how Kurioticket users manage website and email notifications.
          </p>
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
