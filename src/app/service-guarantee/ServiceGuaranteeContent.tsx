"use client";

import { HelpCircle } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { LinkButton } from "@/components/ui/Button";
import { translations as enTranslations } from "@/lib/i18n/en";

const serviceFaqKeys = [
  {
    question: "serviceGuaranteeFaqWhatGuaranteeQuestion",
    answer: "serviceGuaranteeFaqWhatGuaranteeAnswer",
  },
  {
    question: "serviceGuaranteeFaqResultsDisplayedQuestion",
    answer: "serviceGuaranteeFaqResultsDisplayedAnswer",
  },
  {
    question: "serviceGuaranteeFaqRedirectedQuestion",
    answer: "serviceGuaranteeFaqRedirectedAnswer",
  },
  {
    question: "serviceGuaranteeFaqBookDirectlyQuestion",
    answer: "serviceGuaranteeFaqBookDirectlyAnswer",
  },
  {
    question: "serviceGuaranteeFaqPricesGuaranteedQuestion",
    answer: "serviceGuaranteeFaqPricesGuaranteedAnswer",
  },
  {
    question: "serviceGuaranteeFaqChooseProvidersQuestion",
    answer: "serviceGuaranteeFaqChooseProvidersAnswer",
  },
  {
    question: "serviceGuaranteeFaqEncounterIssueQuestion",
    answer: "serviceGuaranteeFaqEncounterIssueAnswer",
  },
  {
    question: "serviceGuaranteeFaqContactSupportQuestion",
    answer: "serviceGuaranteeFaqContactSupportAnswer",
  },
];

export function ServiceGuaranteeContent() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">{t("serviceGuaranteeEyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {t("serviceGuaranteeTitle")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
            {t("serviceGuaranteeDescription")}
          </p>
        </section>

        <section aria-labelledby="service-faq-heading" className="mt-10 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-teal/10 p-2 text-teal">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 id="service-faq-heading" className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
                {t("serviceGuaranteeFaqHeading")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                {t("serviceGuaranteeFaqDescription")}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-x-8 gap-y-1">
            {serviceFaqKeys.map((item) => {
              const question = t(item.question);

              return (
                <details key={item.question} className="group border-b border-border py-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold leading-6 text-navy marker:hidden sm:text-base">
                    <span>{question}</span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 text-base leading-none text-muted transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{t(item.answer)}</p>
                </details>
              );
            })}
          </div>
        </section>

        <section className="mt-10 max-w-3xl rounded-2xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-xl font-bold text-navy">{t("serviceGuaranteeHelpCardTitle")}</h2>
          <LinkButton href="/support" variant="accent" size="lg" className="mt-5 w-full sm:w-auto">
            {t("serviceGuaranteeSupportCta")}
          </LinkButton>
        </section>
      </main>
      <Footer />
    </>
  );
}
