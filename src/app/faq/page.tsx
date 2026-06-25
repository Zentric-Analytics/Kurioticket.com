"use client";

import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";

export default function FaqPage() {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-gradient-to-b from-[#f8f7ff] via-white to-white pb-10 pt-0 sm:pt-5 lg:pt-5">
        <section className="page-shell pb-12 pt-3 sm:pt-6 lg:pb-16">
          <div className="mx-auto max-w-[72rem]">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                {t("faqHeading")}
              </h1>
            </div>

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
