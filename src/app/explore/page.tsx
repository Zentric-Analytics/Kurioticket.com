"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const copy = {
  en: {
    title: "Explore travel ideas",
    subtitle:
      "Start with routes, stays, and planning tools designed to help you compare options clearly before continuing with a provider.",
    waysTitle: "Ways to explore",
    ways: [
      {
        title: "Route discovery",
        text: "Begin with a flight route, then compare schedules, stopovers, and provider options when results are available.",
      },
      {
        title: "Hotel destination ideas",
        text: "Use destination-focused hotel searches to compare stay options, locations, and cancellation terms.",
      },
      {
        title: "Saved trips and recent searches",
        text: "Return to routes and searches you already started so planning stays organized over multiple sessions.",
      },
      {
        title: "Travel planning basics",
        text: "Think through timing, flexibility, baggage, lodging needs, and provider policies before committing.",
      },
    ],
    needsTitle: "Plan by travel need",
    needs: [
      {
        title: "Weekend city breaks",
        text: "Compare shorter routes, simple schedules, and hotel locations that fit limited time away.",
      },
      {
        title: "International trips",
        text: "Review longer itineraries carefully, including total travel time, stopovers, entry needs, and provider terms.",
      },
      {
        title: "Hotel-first planning",
        text: "Start with where you want to stay, then line up flights and other trip pieces around that location.",
      },
      {
        title: "Complete trip planning",
        text: "Use flights, hotels, saved trips, and recent searches together to keep the full trip picture clear.",
      },
    ],
    checklistTitle: "Before you book",
    checklist: [
      "Compare total travel time and stopovers",
      "Review baggage and flexibility",
      "Check hotel location and cancellation rules",
      "Confirm final price and availability with the provider",
      "Save routes or searches for later",
    ],
    ctas: {
      flights: "Search flights",
      hotels: "Search hotels",
      saved: "View saved trips",
    },
  },

  fr: {
    title: "Explorer des idées de voyage",
    subtitle:
      "Commencez par des itinéraires, des séjours et des outils de planification conçus pour vous aider à comparer clairement les options avant de continuer avec un fournisseur.",
    waysTitle: "Façons d’explorer",
    ways: [
      {
        title: "Découverte d’itinéraires",
        text: "Commencez par un itinéraire de vol, puis comparez les horaires, les escales et les options de fournisseurs lorsque les résultats sont disponibles.",
      },
      {
        title: "Idées de destinations hôtelières",
        text: "Utilisez des recherches d’hôtels axées sur la destination pour comparer les options de séjour, les emplacements et les conditions d’annulation.",
      },
      {
        title: "Voyages enregistrés et recherches récentes",
        text: "Revenez aux itinéraires et recherches déjà commencés afin de garder votre planification organisée sur plusieurs sessions.",
      },
      {
        title: "Bases de la planification de voyage",
        text: "Réfléchissez au calendrier, à la flexibilité, aux bagages, aux besoins d’hébergement et aux politiques des fournisseurs avant de vous engager.",
      },
    ],
    needsTitle: "Planifier selon le besoin de voyage",
    needs: [
      {
        title: "Week-ends en ville",
        text: "Comparez des itinéraires plus courts, des horaires simples et des emplacements d’hôtels adaptés à un séjour limité.",
      },
      {
        title: "Voyages internationaux",
        text: "Examinez attentivement les itinéraires plus longs, y compris la durée totale, les escales, les conditions d’entrée et les modalités du fournisseur.",
      },
      {
        title: "Planification d’abord par l’hôtel",
        text: "Commencez par l’endroit où vous souhaitez séjourner, puis organisez les vols et les autres éléments du voyage autour de cet emplacement.",
      },
      {
        title: "Planification complète du voyage",
        text: "Utilisez les vols, hôtels, voyages enregistrés et recherches récentes ensemble pour garder une vue claire du voyage.",
      },
    ],
    checklistTitle: "Avant de réserver",
    checklist: [
      "Comparer la durée totale du voyage et les escales",
      "Examiner les bagages et la flexibilité",
      "Vérifier l’emplacement de l’hôtel et les règles d’annulation",
      "Confirmer le prix final et la disponibilité auprès du fournisseur",
      "Enregistrer des itinéraires ou recherches pour plus tard",
    ],
    ctas: {
      flights: "Rechercher des vols",
      hotels: "Rechercher des hôtels",
      saved: "Voir les voyages enregistrés",
    },
  },
};

export default function ExplorePage() {
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
              Travel discovery
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-indigo-950 sm:text-5xl">
              {c.title}
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              {c.subtitle}
            </p>
          </div>

          <section className="mt-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-indigo-950">
              {c.waysTitle}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {c.ways.map((item) => (
                <Card
                  key={item.title}
                  className="h-full border-indigo-100 p-5"
                >
                  <div className="mb-4 h-1.5 w-12 rounded-full bg-indigo-200" />
                  <h3 className="text-lg font-extrabold text-indigo-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.text}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-10 rounded-3xl border border-indigo-100 bg-white/85 p-5 shadow-[0_24px_70px_-45px_rgba(67,56,202,0.55)] sm:p-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-indigo-950">
              {c.needsTitle}
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {c.needs.map((item) => (
                <Card
                  key={item.title}
                  className="border-indigo-100 p-5"
                >
                  <h3 className="text-lg font-extrabold text-indigo-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.text}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <Card className="border-indigo-100 p-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-indigo-950">
                {c.checklistTitle}
              </h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {c.checklist.map((item) => (
                  <li
                    key={item}
                    className="flex gap-3 text-sm font-medium leading-6 text-slate-600"
                  >
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-700">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-96 lg:grid-cols-1">
              <LinkButton
                href="/flights/results"
                className="bg-indigo-700 text-white hover:bg-indigo-800"
              >
                {c.ctas.flights}
              </LinkButton>
              <LinkButton
                href="/hotels"
                variant="secondary"
                className="border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
              >
                {c.ctas.hotels}
              </LinkButton>
              <LinkButton
                href="/saved"
                variant="secondary"
                className="border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
              >
                {c.ctas.saved}
              </LinkButton>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </>
  );
}
