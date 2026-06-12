"use client";

import { HelpCircle } from "lucide-react";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { SupportForm } from "@/components/support/SupportForm";
import { translations as enTranslations } from "@/lib/i18n/en";

const supportFaqKeys = [
  {
    question: "supportFaqAccountQuestion",
    answer: "supportFaqAccountAnswer",
  },
  {
    question: "supportFaqSearchQuestion",
    answer: "supportFaqSearchAnswer",
  },
  {
    question: "supportFaqSavedTripsQuestion",
    answer: "supportFaqSavedTripsAnswer",
  },
  {
    question: "supportFaqRedirectQuestion",
    answer: "supportFaqRedirectAnswer",
  },
  {
    question: "supportFaqAlreadyBookedQuestion",
    answer: "supportFaqAlreadyBookedAnswer",
  },
  {
    question: "supportFaqChangeBookingQuestion",
    answer: "supportFaqChangeBookingAnswer",
  },
  {
    question: "supportFaqWhyRedirectedQuestion",
    answer: "supportFaqWhyRedirectedAnswer",
  },
];

export function SupportContent() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <>
      <AppHeader />
      <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
        <section className="max-w-3xl">
          <p className="text-sm font-semibold text-teal-dark">{t("supportEyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            {t("supportTitle")}
          </h1>
        </section>

        <section className="mt-6 max-w-3xl">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-full bg-teal/10 p-2 text-teal">
              <HelpCircle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy">{t("supportBeforeContactHeading")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                {t("supportBeforeContactDescription")}
              </p>
            </div>
          </div>
        </section>

        <section aria-label={t("supportTicketHeading")} className="mx-auto mt-8 w-full max-w-2xl">
          <SupportForm />
        </section>

        <section aria-labelledby="support-faq-heading" className="mt-10 max-w-3xl">
          <h2 id="support-faq-heading" className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
            {t("supportFaqHeading")}
          </h2>

          <div className="mt-5 grid gap-x-8 gap-y-1">
            {supportFaqKeys.map((item) => {
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
      </main>
      <Footer />
    </>
  );
}
