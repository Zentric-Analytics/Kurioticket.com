"use client";

import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { useLocale } from "@/components/layout/LocaleProvider";

const textFieldSections = [
  {
    titleKey: "accountDashboard.preferences.booking.airports.title",
    descriptionKey: "accountDashboard.preferences.booking.airports.description",
    fields: [
      {
        id: "home-airport",
        labelKey: "accountDashboard.preferences.booking.homeAirport",
        placeholderKey: "accountDashboard.preferences.booking.searchAirport",
      },
      {
        id: "secondary-airports",
        labelKey: "accountDashboard.preferences.booking.secondaryAirports",
        placeholderKey:
          "accountDashboard.preferences.booking.addAlternativeAirports",
      },
    ],
  },
  {
    titleKey: "accountDashboard.preferences.booking.airlines.title",
    descriptionKey: "accountDashboard.preferences.booking.airlines.description",
    fields: [
      {
        id: "preferred-airlines",
        labelKey: "accountDashboard.preferences.booking.preferredAirlines",
        placeholderKey: "accountDashboard.preferences.booking.searchAirlines",
      },
      {
        id: "avoid-airlines",
        labelKey: "accountDashboard.preferences.booking.avoidAirlines",
        placeholderKey: "accountDashboard.preferences.booking.searchAirlines",
      },
    ],
  },
  {
    titleKey: "accountDashboard.preferences.booking.stays.title",
    descriptionKey: "accountDashboard.preferences.booking.stays.description",
    fields: [
      {
        id: "preferred-hotel-chains",
        labelKey: "accountDashboard.preferences.booking.preferredHotelChains",
        placeholderKey:
          "accountDashboard.preferences.booking.searchHotelChains",
      },
      {
        id: "avoid-hotel-chains",
        labelKey: "accountDashboard.preferences.booking.avoidHotelChains",
        placeholderKey:
          "accountDashboard.preferences.booking.searchHotelChains",
      },
    ],
  },
];

const fieldClassName =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#004BB8] focus:ring-4 focus:ring-[#004BB8]/15";

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
        <h2
          id={`${title.toLowerCase().replace(/\s+/g, "-")}-preferences`}
          className="text-lg font-semibold leading-7 text-slate-900"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5 grid w-full gap-4 sm:max-w-lg sm:gap-5">
        {children}
      </div>
    </section>
  );
}

export function BookingPreferencesContent() {
  const { t } = useLocale();

  return (
    <main className="flex-1 bg-[#f3f7fc] pb-10 pt-0">
      <header className="bg-[#021C2B] text-start">
        <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <AccountBackLink variant="hero" />
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
            {t["accountDashboard.preferences.booking.title"]}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">
            {t["accountDashboard.preferences.booking.description"]}
          </p>
        </div>
      </header>

      <div className="mx-auto -mt-6 min-w-0 max-w-6xl space-y-6 px-4 pb-6 pt-0 sm:-mt-8 sm:px-6 sm:pb-8 lg:px-8">
        <form className="w-full space-y-6" action="#">
          {textFieldSections.map((section) => (
            <PreferenceSection
              key={section.titleKey}
              title={t[section.titleKey]}
              description={t[section.descriptionKey]}
              blendWithFormArea={
                section.titleKey ===
                "accountDashboard.preferences.booking.airports.title"
              }
            >
              {section.fields.map((field) => (
                <div key={field.id} className="min-w-0 space-y-2">
                  <label
                    htmlFor={field.id}
                    className="block text-sm font-medium leading-5 text-slate-700"
                  >
                    {t[field.labelKey]}
                  </label>
                  <input
                    id={field.id}
                    name={field.id}
                    type="search"
                    placeholder={t[field.placeholderKey]}
                    className={fieldClassName}
                  />
                </div>
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
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#004BB8] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#021C2B] sm:w-auto"
            >
              {t["accountDashboard.preferences.savePreferences"]}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
