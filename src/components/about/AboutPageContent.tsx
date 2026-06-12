"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { getTranslations } from "@/lib/i18n";
import type { TranslationDictionary } from "@/lib/i18n/types";

const englishTranslations = getTranslations("en-us");

function getTranslation(
  t: TranslationDictionary,
  key: string
) {
  return t[key] || englishTranslations[key];
}

export function AboutPageContent() {
  const { t } = useLocale();

  return (
    <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold text-teal-dark">
          {getTranslation(t, "aboutPageEyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          {getTranslation(t, "aboutPageTitle")}
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
          {getTranslation(t, "aboutPageIntroPrimary")}
        </p>
        <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
          {getTranslation(t, "aboutPageIntroSecondary")}
        </p>
      </section>

      <section className="mt-10 max-w-3xl rounded-2xl border border-border bg-white p-5 sm:p-6">
        <h2 className="text-xl font-bold text-navy">
          {getTranslation(t, "aboutPagePlanningCardHeading")}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
          {getTranslation(t, "aboutPagePlanningCardBody")}
        </p>
      </section>
    </main>
  );
}
