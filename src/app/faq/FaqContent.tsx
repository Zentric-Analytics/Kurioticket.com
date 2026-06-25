"use client";

import Link from "next/link";
import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getGeneralFaqs } from "@/content/faqs";
import { translations as enTranslations } from "@/lib/i18n/en";

type FaqContentProps = {
  showAccountLink: boolean;
};

export function FaqContent({ showAccountLink }: FaqContentProps) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const faqItems = getGeneralFaqs(t);

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-gradient-to-b from-[#f8f7ff] via-white to-white pb-10 pt-0 sm:pt-5 lg:pt-5">
        <section className="page-shell pb-12 pt-3 sm:pt-6 lg:pb-16">
          <div className="mx-auto max-w-[72rem]">
            {showAccountLink ? <AccountBackLink /> : null}

            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                {t("faqHeading")}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                {t("faqIntro")}
              </p>
            </div>

            <section
              aria-labelledby="faq-list-heading"
              className="mt-10 max-w-6xl"
            >
              <h2
                id="faq-list-heading"
                className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
              >
                {t("faqGeneralQuestions")}
              </h2>

              <div className="mt-5 grid gap-x-8 gap-y-0 md:grid-cols-2">
                {faqItems.map((item) => (
                  <details
                    key={item.question}
                    className="group border-b border-slate-200 py-4"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-sm font-semibold leading-6 text-slate-950 marker:hidden sm:text-base">
                      <span>{item.question}</span>
                      <span
                        aria-hidden="true"
                        className="mt-0.5 text-base leading-none text-slate-500 transition-transform duration-200 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 text-sm font-medium leading-6 text-slate-700 sm:p-6 sm:text-base">
              {t("faqNeedMoreHelpPrefix")} {" "}
              <Link
                href="/dashboard/support"
                className="font-bold text-indigo-700 underline-offset-4 hover:text-indigo-900 hover:underline"
              >
                {t("faqSupportPage")}
              </Link>{" "}
              {t("faqNeedMoreHelpSuffix")}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
