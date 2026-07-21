"use client";

import { use } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { StandaloneFlightSearchForm } from "@/components/search/StandaloneFlightSearchForm";
import { Card } from "@/components/ui/Card";

export default function FlightRouteLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { t } = useLocale();

  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <section className="border-b border-border bg-white">
          <div className="page-shell pt-24 pb-8 sm:pt-28 lg:pt-28">
            <p className="text-sm font-semibold text-teal-dark">{t["flightGuide.eyebrow"]}</p>
            <h1 className="mt-2 text-3xl font-bold text-navy">{cheapRouteTitle(slug)}</h1>
            <p className="mt-3 max-w-2xl text-muted">{t["flightGuide.description"]}</p>
          </div>
        </section>
        <div className="page-shell grid gap-6 py-8 lg:grid-cols-[1fr_360px]">
          <StandaloneFlightSearchForm />
          <Card className="p-5">
            <h2 className="font-bold text-navy">{t["flightGuide.roadmapTitle"]}</h2>
            <ul className="mt-3 grid gap-2 text-sm text-muted">
              <li>{t["flightGuide.roadmap.bestTimeToBook"]}</li>
              <li>{t["flightGuide.roadmap.airportLayoverNotes"]}</li>
              <li>{t["flightGuide.roadmap.budgetRangesAlerts"]}</li>
              <li>{t["flightGuide.roadmap.hotelCoordinationInsights"]}</li>
            </ul>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

function cheapRouteTitle(slug: string) {
  return `Cheap flights: ${slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}`;
}
