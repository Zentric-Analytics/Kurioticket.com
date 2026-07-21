"use client";

import { use } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { SearchTabs } from "@/components/search/SearchTabs";
import { Card } from "@/components/ui/Card";

export default function HotelDestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { locale, t } = useLocale();

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-gradient-to-b from-indigo-50 via-white to-violet-50/40 pt-24 pb-10 sm:pt-28 lg:pt-28">
        <section className="page-shell">
          <p className="text-sm font-semibold text-violet-700">{t["hotelGuide.eyebrow"]}</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-indigo-950">
            {titleize(slug)} {t["hotelGuide.titleSuffix"]}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">{t["hotelGuide.description"]}</p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <SearchTabs t={t} locale={locale} />
            <Card className="border-indigo-100 p-6">
              <h2 className="text-lg font-bold text-indigo-950">{t["hotelGuide.contentSystemTitle"]}</h2>
              <p className="mt-2 text-sm text-slate-600">{t["hotelGuide.contentSystemBody"]}</p>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function titleize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
