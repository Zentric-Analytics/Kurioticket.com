"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatCurrency } from "@/lib/currency/formatCurrency";

const deals: Array<[string, number]> = [
  ["Houston to Tokyo", 711],
  ["New York to London", 394],
  ["Chicago to Cancun", 246],
  ["Los Angeles to Mexico City", 218],
];

const copy = {
  en: {
    title: "Best Deals",
    subtitle: "Featured deal controls are ready for curation and provider-backed deal feeds.",
    cta: "Search route",
  },
  fr: {
    title: "Meilleures offres",
    subtitle: "Les offres en vedette sont prêtes pour la curation et les flux partenaires.",
    cta: "Rechercher l'itinéraire",
  },
};

export default function DealsPage() {
  const { locale } = useLocale();
  const { selectedOption } = useRegion();
  const lang = locale.startsWith("fr") ? "fr" : "en";
  const c = copy[lang];

  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-gradient-to-b from-indigo-50 via-white to-violet-50/40 py-10">
        <section className="page-shell">
          <h1 className="text-4xl font-extrabold tracking-tight text-indigo-950">{c.title}</h1>
          <p className="mt-3 max-w-2xl text-slate-600">{c.subtitle}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {deals.map(([route, amount]) => (
              <Card key={route} className="border-indigo-100 p-6">
                <p className="text-sm font-semibold text-slate-500">{route}</p>
                <div className="mt-2 text-3xl font-extrabold text-indigo-950">{formatCurrency(amount, selectedOption.currency)}</div>
                <LinkButton href="/flights/results" variant="secondary" className="mt-4 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">{c.cta}</LinkButton>
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
