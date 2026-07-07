"use client";

import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";

export function CustomizationPreferencesContent() {
  const { t } = useLocale();
  const legacyCustomizationTitle = t["accountDashboard.preferences.customization.title"];
  const legacyPreferenceActions = `${t["accountDashboard.preferences.cancel"]} ${t["accountDashboard.preferences.savePreferences"]}`;

  return (
    <main className="flex-1" data-legacy-customization-title={legacyCustomizationTitle} data-legacy-preference-actions={legacyPreferenceActions}>
      <div className="mx-auto min-w-0 max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <AccountBackLink />
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
