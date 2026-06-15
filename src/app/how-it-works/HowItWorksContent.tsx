"use client";

import { ExternalLink, GitCompare, MousePointerClick, Search } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";

const steps = [
  {
    number: "01",
    titleKey: "howItWorks.steps.search.title",
    icon: Search,
    descriptionKey: "howItWorks.steps.search.description",
  },
  {
    number: "02",
    titleKey: "howItWorks.steps.compare.title",
    icon: GitCompare,
    descriptionKey: "howItWorks.steps.compare.description",
  },
  {
    number: "03",
    titleKey: "howItWorks.steps.choose.title",
    icon: MousePointerClick,
    descriptionKey: "howItWorks.steps.choose.description",
  },
  {
    number: "04",
    titleKey: "howItWorks.steps.continue.title",
    icon: ExternalLink,
    descriptionKey: "howItWorks.steps.continue.description",
  },
];

export function HowItWorksContent() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">{t("howItWorksEyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {t("howItWorksTitle")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            {t("howItWorksIntro")}
          </p>
        </section>

        <section aria-labelledby="how-it-works-steps" className="mt-10 max-w-3xl">
          <h2 id="how-it-works-steps" className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
            {t("howItWorksFlowHeading")}
          </h2>

          <div className="mt-5 grid gap-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.titleKey}
                  className="grid gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:grid-cols-[auto_1fr] sm:p-5"
                >
                  <div className="flex items-center gap-3 sm:block">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal/10 text-teal ring-1 ring-teal/15">
                      <Icon size={21} />
                    </div>
                    <span className="inline-flex rounded-full bg-surface-muted px-2.5 py-1 text-xs font-bold text-teal-dark sm:mt-3">
                      {step.number}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-navy sm:text-lg">{t(step.titleKey)}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{t(step.descriptionKey)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-10 max-w-3xl rounded-2xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold text-navy">{t("howItWorks.providerWebsites.title")}</h2>
          <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
            {t("howItWorks.providerWebsites.description")}
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
