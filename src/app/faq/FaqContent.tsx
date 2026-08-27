"use client";

import Link from "next/link";
import { AccountBackLinkRow } from "@/components/dashboard/AccountBackLinkRow";
import { AccountDetailShell } from "@/components/dashboard/AccountDetailShell";
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
  const supportCtaSuffix = t("faqNeedMoreHelpSuffix");
  const supportCtaSuffixSeparator = /^[,.;:!?]/.test(supportCtaSuffix)
    ? ""
    : " ";

  const content = (
    <div className="mx-auto max-w-[72rem]">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-[2rem] sm:font-semibold">
          {t("faqHeading")}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-6 text-slate-600 sm:text-base">
          {t("faqIntro")}
        </p>
      </div>

      <section aria-labelledby="faq-list-heading" className="mt-9 max-w-6xl sm:mt-10">
        <h2
          id="faq-list-heading"
          className="text-base font-bold tracking-tight text-slate-950 sm:text-2xl"
        >
          {t("faqGeneralQuestions")}
        </h2>

        <div className="mt-3 grid gap-x-8 gap-y-0 sm:mt-5 md:grid-cols-2">
          {faqItems.map((item) => (
            <details
              key={item.question}
              className="group border-b border-slate-300 py-4 sm:border-slate-200"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[15px] font-medium leading-6 text-slate-950 marker:hidden [&::-webkit-details-marker]:hidden sm:text-base sm:font-semibold">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 text-xl font-light leading-none text-slate-950 transition-transform duration-200 group-open:rotate-45 sm:text-base sm:text-slate-500"
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
        {t("faqNeedMoreHelpPrefix")}{" "}
        <Link
          href="/dashboard/support"
          className="font-bold text-indigo-700 underline-offset-4 hover:text-indigo-900 hover:underline"
        >
          {t("faqSupportPage")}
        </Link>
        {supportCtaSuffixSeparator}
        {supportCtaSuffix}
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden sm:block">
        <AppHeader simpleHeader />
      </div>
      <nav
        aria-label="FAQ navigation"
        className="page-shell flex h-12 items-center gap-4 border-b border-slate-100 bg-white sm:hidden"
      >
        <Link
          href={showAccountLink ? "/dashboard/account" : "/"}
          aria-label={showAccountLink ? t("accountDashboard.hub.title") : "Back to home"}
          className="-ml-2 flex h-10 w-10 items-center justify-center text-2xl font-light text-slate-950"
        >
          <span aria-hidden="true">←</span>
        </Link>
        <span className="text-base font-semibold text-slate-950">FAQ</span>
      </nav>
      <main
        className={
          showAccountLink
            ? "flex-1 bg-white pb-10 pt-0 sm:bg-gradient-to-b sm:from-[#f8f7ff] sm:via-white sm:to-white"
            : "flex-1 bg-white pb-10 pt-0 sm:bg-gradient-to-b sm:from-[#f8f7ff] sm:via-white sm:to-white sm:pt-5 lg:pt-5"
        }
      >
        {showAccountLink ? (
          <AccountDetailShell
            className="pb-12 pt-5 sm:pt-0 lg:pb-16"
            showAccountLink={false}
          >
            <div className="hidden sm:block">
              <AccountBackLinkRow />
            </div>
            {content}
          </AccountDetailShell>
        ) : (
          <section className="page-shell pb-12 pt-5 sm:pt-6 lg:pb-16">
            {content}
          </section>
        )}
      </main>
      <div className="hidden sm:block">
        <Footer />
      </div>
    </>
  );
}
