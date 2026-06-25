"use client";

import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";

const selectSections = [
  {
    titleKey: "accountDashboard.preferences.customization.languageRegion.title",
    descriptionKey: "accountDashboard.preferences.customization.languageRegion.description",
    fields: [
      {
        id: "preferred-language",
        labelKey: "accountDashboard.preferences.customization.preferredLanguage",
        placeholderKey: "accountDashboard.preferences.customization.selectPreferredLanguage",
        options: [
          { value: "English", labelKey: "accountDashboard.preferences.customization.language.english" },
          { value: "Spanish", labelKey: "accountDashboard.preferences.customization.language.spanish" },
          { value: "French", labelKey: "accountDashboard.preferences.customization.language.french" },
          { value: "German", labelKey: "accountDashboard.preferences.customization.language.german" },
          { value: "Portuguese", labelKey: "accountDashboard.preferences.customization.language.portuguese" },
          { value: "Dutch", labelKey: "accountDashboard.preferences.customization.language.dutch" },
        ],
      },
      {
        id: "currency",
        labelKey: "accountDashboard.preferences.customization.currency",
        placeholderKey: "accountDashboard.preferences.customization.selectCurrency",
        options: [
          { value: "USD", labelKey: "accountDashboard.preferences.customization.currency.usd" },
          { value: "EUR", labelKey: "accountDashboard.preferences.customization.currency.eur" },
          { value: "GBP", labelKey: "accountDashboard.preferences.customization.currency.gbp" },
          { value: "CAD", labelKey: "accountDashboard.preferences.customization.currency.cad" },
          { value: "AUD", labelKey: "accountDashboard.preferences.customization.currency.aud" },
        ],
      },
      {
        id: "region",
        labelKey: "accountDashboard.preferences.customization.region",
        placeholderKey: "accountDashboard.preferences.customization.selectRegion",
        options: [
          { value: "United States", labelKey: "accountDashboard.preferences.customization.region.unitedStates" },
          { value: "Canada", labelKey: "accountDashboard.preferences.customization.region.canada" },
          { value: "United Kingdom", labelKey: "accountDashboard.preferences.customization.region.unitedKingdom" },
          { value: "Europe", labelKey: "accountDashboard.preferences.customization.region.europe" },
          { value: "Australia", labelKey: "accountDashboard.preferences.customization.region.australia" },
        ],
      },
    ],
  },
];

const toggleSections = [
  {
    titleKey: "accountDashboard.preferences.customization.personalization.title",
    descriptionKey: "accountDashboard.preferences.customization.personalization.description",
    fields: [
      { id: "personalize-searches", labelKey: "accountDashboard.preferences.customization.personalizeSearches" },
      { id: "personalized-travel-deals", labelKey: "accountDashboard.preferences.customization.personalizedTravelDeals" },
      { id: "remember-recent-searches", labelKey: "accountDashboard.preferences.customization.rememberRecentSearches" },
    ],
  },
  {
    titleKey: "accountDashboard.preferences.customization.communicationStyle.title",
    descriptionKey: "accountDashboard.preferences.customization.communicationStyle.description",
    fields: [
      { id: "email-updates", labelKey: "accountDashboard.preferences.customization.emailUpdates" },
      { id: "price-alert-emails", labelKey: "accountDashboard.preferences.customization.priceAlertEmails" },
      { id: "travel-inspiration-emails", labelKey: "accountDashboard.preferences.customization.travelInspirationEmails" },
    ],
  },
];

const fieldClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

function PreferenceSection({
  title,
  description,
  children,
  blendWithFormArea = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  blendWithFormArea?: boolean;
}) {
  return (
    <section
      className={`w-full rounded-2xl border border-slate-400 p-5 sm:p-6 ${blendWithFormArea ? "bg-[#f3f7fc]" : ""}`}
      aria-labelledby={`${title.toLowerCase().replace(/\s+/g, "-")}-preferences`}
    >
      <div>
        <h2 id={`${title.toLowerCase().replace(/\s+/g, "-")}-preferences`} className="text-lg font-semibold leading-7 text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5 grid w-full gap-4 sm:max-w-lg sm:gap-5">{children}</div>
    </section>
  );
}

export function CustomizationPreferencesContent() {
  const { t } = useLocale();

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0">
      <header className="bg-[#4338CA] text-start">
        <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="[&_a]:text-white [&_a]:focus-visible:ring-white">
            <AccountBackLink />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
            {t["accountDashboard.preferences.customization.title"]}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
            {t["accountDashboard.preferences.customization.description"]}
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-6 min-w-0 max-w-6xl space-y-6 px-4 pb-6 pt-0 sm:-mt-8 sm:px-6 sm:pb-8 lg:px-8">
        <form className="w-full space-y-6" action="#">
          {selectSections.map((section) => (
            <PreferenceSection key={section.titleKey} title={t[section.titleKey]} description={t[section.descriptionKey]} blendWithFormArea>
              {section.fields.map((field) => (
                <div key={field.id} className="min-w-0 space-y-2">
                  <label htmlFor={field.id} className="block text-sm font-medium leading-5 text-slate-700">
                    {t[field.labelKey]}
                  </label>
                  <select id={field.id} name={field.id} defaultValue="" className={fieldClassName}>
                    <option value="" disabled>
                      {t[field.placeholderKey]}
                    </option>
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t[option.labelKey]}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </PreferenceSection>
          ))}

          {toggleSections.map((section) => (
            <PreferenceSection key={section.titleKey} title={t[section.titleKey]} description={t[section.descriptionKey]}>
              {section.fields.map((field) => (
                <label
                  key={field.id}
                  htmlFor={field.id}
                  className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-5 text-slate-700 transition hover:border-slate-300"
                >
                  <span>{t[field.labelKey]}</span>
                  <input id={field.id} name={field.id} type="checkbox" className="h-5 w-5 rounded border-slate-300 text-blue-700 focus:ring-violet-500" />
                </label>
              ))}
            </PreferenceSection>
          ))}

          <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              {t["accountDashboard.preferences.cancel"]}
            </button>
            <button
              type="button"
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 sm:w-auto"
            >
              {t["accountDashboard.preferences.savePreferences"]}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
