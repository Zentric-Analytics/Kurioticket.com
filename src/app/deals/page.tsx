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
    title: "Deals and route ideas",
    subtitle:
      "Use Kurioticket to start flexible searches and compare available provider results before booking. Prices and availability can change and are confirmed on the provider page.",
    verificationNote:
      "Live provider-backed deal feeds will appear only when those sources are connected, verified, and safe to present.",
    sections: [
      {
        title: "Start with flexible searches",
        text: "Use route ideas as a starting point, then adjust dates, travelers, and trip details on the results page.",
      },
      {
        title: "Compare before you book",
        text: "Review available provider results side by side so you can weigh route timing, stops, and booking terms clearly.",
      },
      {
        title: "Check final details with the provider",
        text: "Confirm the final fare, fees, availability, and policies on the provider page before completing your booking.",
      },
      {
        title: "Use saved routes and recent searches",
        text: "Keep useful searches close while you compare options over time and return to routes you want to revisit.",
      },
    ],
    startersTitle: "Try these search starters",
    startersSubtitle:
      "These are route ideas without displayed prices. Select one to begin a flight search and compare available provider results.",
    cta: "Search route",
  },

  fr: {
    title: "Offres et idées d’itinéraires",
    subtitle:
      "Utilisez Kurioticket pour lancer des recherches flexibles et comparer les résultats disponibles des fournisseurs avant de réserver. Les prix et disponibilités peuvent changer et sont confirmés sur la page du fournisseur.",
    verificationNote:
      "Les flux d’offres en direct soutenus par des fournisseurs n’apparaîtront que lorsque ces sources seront connectées, vérifiées et sûres à présenter.",
    sections: [
      {
        title: "Commencez par des recherches flexibles",
        text: "Utilisez les idées d’itinéraires comme point de départ, puis ajustez les dates, les voyageurs et les détails du voyage sur la page de résultats.",
      },
      {
        title: "Comparez avant de réserver",
        text: "Examinez les résultats disponibles des fournisseurs côte à côte afin d’évaluer clairement les horaires, les escales et les conditions de réservation.",
      },
      {
        title: "Vérifiez les détails finaux auprès du fournisseur",
        text: "Confirmez le tarif final, les frais, la disponibilité et les politiques sur la page du fournisseur avant de finaliser la réservation.",
      },
      {
        title: "Utilisez les itinéraires enregistrés et recherches récentes",
        text: "Gardez les recherches utiles à portée de main pendant que vous comparez les options et revenez aux itinéraires à revoir.",
      },
    ],
    startersTitle: "Essayez ces points de départ",
    startersSubtitle:
      "Ce sont des idées d’itinéraires sans prix affichés. Sélectionnez-en une pour lancer une recherche de vol et comparer les résultats disponibles des fournisseurs.",
    cta: "Rechercher l’itinéraire",
  },
};

export default function DealsPage() {
  const { locale } = useLocale();

  const lang = locale.startsWith("fr") ? "fr" : "en";

  const c = copy[lang];

  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-gradient-to-b from-indigo-50 via-white to-violet-50/40 pt-8 pb-12 sm:pt-10 lg:pt-12">
        <section className="page-shell">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-indigo-600">
              Kurioticket planning
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-indigo-950 sm:text-5xl">
              {c.title}
            </h1>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              {c.subtitle}
            </p>
            <p className="mt-3 rounded-2xl border border-indigo-100 bg-white/80 px-4 py-3 text-sm font-medium leading-6 text-slate-600 shadow-sm">
              {c.verificationNote}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {c.sections.map((section) => (
              <Card
                key={section.title}
                className="border-indigo-100 p-6"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-black text-indigo-700">
                  ✓
                </div>
                <h2 className="text-lg font-extrabold text-indigo-950">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {section.text}
                </p>
              </Card>
            ))}
          </div>

          <section className="mt-10 rounded-3xl border border-indigo-100 bg-white/85 p-5 shadow-[0_24px_70px_-45px_rgba(67,56,202,0.55)] sm:p-6">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-extrabold tracking-tight text-indigo-950">
                {c.startersTitle}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {c.startersSubtitle}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {searchStarters.map((starter) => (
                <Card
                  key={starter.route}
                  className="flex h-full flex-col border-indigo-100 p-5"
                >
                  <p className="text-lg font-extrabold text-indigo-950">
                    {starter.route}
                  </p>
                  <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
                    {starter.note}
                  </p>

                  <LinkButton
                    href={starter.href}
                    variant="secondary"
                    className="mt-5 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  >
                    {c.cta}
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
