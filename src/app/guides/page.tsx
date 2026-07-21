"use client";

import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Card } from "@/components/ui/Card";

const guides = [
  "best-time-to-book-flights",
  "how-to-avoid-risky-layovers",
  "how-to-compare-baggage-inclusive-fares",
];

export default function GuidesPage() {
  const { t } = useLocale();

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-gradient-to-b from-indigo-50 via-white to-violet-50/40 pt-24 pb-10 sm:pt-28 lg:pt-28">
        <section className="page-shell">
          <h1 className="text-4xl font-extrabold tracking-tight text-indigo-950">{t["guides.title"]}</h1>
          <p className="mt-3 max-w-2xl text-slate-600">{t["guides.description"]}</p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {guides.map((guide) => (
              <Link key={guide} href={`/guides/${guide}`}>
                <Card className="h-full border-indigo-100 p-6 transition hover:border-violet-300 hover:shadow-[0_20px_45px_-24px_rgba(76,29,149,0.45)]">
                  <h2 className="text-xl font-bold text-indigo-950">{titleize(guide)}</h2>
                  <p className="mt-2 text-sm text-slate-600">{t["guides.cardPlaceholder"]}</p>
                </Card>
              </Link>
            ))}
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
