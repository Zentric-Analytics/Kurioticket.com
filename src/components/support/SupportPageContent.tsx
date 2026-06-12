"use client";

import { HelpCircle } from "lucide-react";
import { useLocale } from "@/components/layout/LocaleProvider";
import { SupportForm } from "@/components/support/SupportForm";

const supportFaqs = [
  {
    questionKey: "supportFaqAccountQuestion",
    answerKey: "supportFaqAccountAnswer",
  },
  {
    questionKey: "supportFaqSearchQuestion",
    answerKey: "supportFaqSearchAnswer",
  },
  {
    questionKey: "supportFaqSavedTripsQuestion",
    answerKey: "supportFaqSavedTripsAnswer",
  },
  {
    questionKey: "supportFaqBookingRedirectQuestion",
    answerKey: "supportFaqBookingRedirectAnswer",
  },
  {
    questionKey: "supportFaqAlreadyBookedQuestion",
    answerKey: "supportFaqAlreadyBookedAnswer",
  },
  {
    questionKey: "supportFaqChangeBookingQuestion",
    answerKey: "supportFaqChangeBookingAnswer",
  },
  {
    questionKey: "supportFaqProviderQuestion",
    answerKey: "supportFaqProviderAnswer",
  },
];

export function SupportPageContent() {
  const { t } = useLocale();

  return (
    <main className="page-shell flex-1 pt-8 pb-10 sm:pt-10 lg:pt-12">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold text-teal-dark">{t.supportHelpDeskLabel}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
          {t.supportPageHeading}
        </h1>
      </section>

      <section className="mt-6 max-w-3xl">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-teal/10 p-2 text-teal">
            <HelpCircle size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-navy">{t.supportBeforeContactHeading}</h2>
            <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
              {t.supportBeforeContactBody}
            </p>
          </div>
        </div>
      </section>

      <section aria-label={t.supportCreateTicketTitle} className="mx-auto mt-8 w-full max-w-2xl">
        <SupportForm />
      </section>

      <section aria-labelledby="support-faq-heading" className="mt-10 max-w-3xl">
        <h2 id="support-faq-heading" className="text-xl font-bold tracking-tight text-navy sm:text-2xl">
          {t.supportFaqHeading}
        </h2>

        <div className="mt-5 grid gap-x-8 gap-y-1">
          {supportFaqs.map((item) => (
            <details key={item.questionKey} className="group border-b border-border py-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold leading-6 text-navy marker:hidden sm:text-base">
                <span className="min-w-0">{t[item.questionKey]}</span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 text-base leading-none text-muted transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-6 text-muted sm:text-base">{t[item.answerKey]}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
