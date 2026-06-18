"use client";

import Link from "next/link";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { getGeneralFaqs } from "@/content/faqs";
import { translations as enTranslations } from "@/lib/i18n/en";

export default function FaqPage() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const translatedFaqs = getGeneralFaqs(t);

  return (
    <>
      <AppHeader showAccountBackLink />
      <main className="flex-1 bg-gradient-to-b from-[#f8f7ff] via-white to-white">
        <section className="page-shell py-10 sm:py-14 lg:py-16">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-indigo-700">
              {t("faqHelpCenter")}
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              {t("faqHeading")}
            </h1>
            <p className="mt-4 text-sm font-medium leading-6 text-slate-700 sm:text-base sm:leading-7">
              {t("faqIntro")}
            </p>
          </div>

          <section aria-label={t("faqGeneralQuestions")} className="mt-8 sm:mt-10">
            <FaqAccordion items={translatedFaqs} />
          </section>

          <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-5 text-sm font-medium leading-6 text-slate-700 sm:p-6 sm:text-base">
            {t("faqNeedMoreHelpPrefix")} {" "}
            <Link
              href="/support"
              className="font-bold text-indigo-700 underline-offset-4 hover:text-indigo-900 hover:underline"
            >
              {t("faqSupportPage")}
            </Link>{" "}
            {t("faqNeedMoreHelpSuffix")}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
