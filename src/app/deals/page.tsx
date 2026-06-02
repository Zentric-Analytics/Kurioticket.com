"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const searchStarters = [
  {
    route: "Houston → Tokyo",
    note: "Long-haul route idea for flexible international planning",
    href: "/flights/results?origin=Houston&destination=Tokyo",
  },
  {
    route: "New York → London",
    note: "Transatlantic search starter for comparing cabins and schedules",
    href: "/flights/results?origin=New%20York&destination=London",
  },
  {
    route: "Chicago → Cancun",
    note: "Warm-weather route idea for date-flexible searches",
    href: "/flights/results?origin=Chicago&destination=Cancun",
  },
  {
    route: "Los Angeles → Mexico City",
    note: "Regional international route starter for provider comparison",
    href: "/flights/results?origin=Los%20Angeles&destination=Mexico%20City",
  },
];

const copy = {
  en: {
    eyebrow: "Kurioticket planning",
    title: "Start a travel search",
    subtitle: "Use simple route starters to begin comparing provider results.",
    startersTitle: "Search starters",
    startersSubtitle: "Route ideas without displayed fares. Select one to begin a flight search.",
    cta: "Search route",
  },
  fr: {
    eyebrow: "Planification Kurioticket",
    title: "Lancez une recherche voyage",
    subtitle: "Utilisez des itinéraires simples pour commencer à comparer les résultats des fournisseurs.",
    startersTitle: "Points de départ",
    startersSubtitle: "Des idées d’itinéraires sans tarifs affichés. Sélectionnez-en une pour lancer une recherche de vol.",
    cta: "Rechercher l’itinéraire",
  },
};

export default function DealsPage() {
  const { locale } = useLocale();
  const lang = locale.startsWith("fr") ? "fr" : "en";
  const dictionary = copy[lang];

  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-slate-50 pb-12">
        <section className="border-b border-slate-200 bg-white">
          <div className="page-shell py-10 sm:py-14">
            <div className="max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-indigo-700">{dictionary.eyebrow}</p>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                {dictionary.title}
              </h1>
              <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-slate-600">{dictionary.subtitle}</p>
            </div>
          </div>
        </section>

        <section className="page-shell pt-10">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">{dictionary.startersTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{dictionary.startersSubtitle}</p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {searchStarters.map((starter) => (
                <Card key={starter.route} className="flex h-full flex-col border-slate-200 p-5">
                  <p className="text-lg font-extrabold text-slate-950">{starter.route}</p>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{starter.note}</p>

                  <LinkButton href={starter.href} variant="secondary" className="mt-5">
                    {dictionary.cta}
                  </LinkButton>
                </Card>
              ))}
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </>
  );
}
