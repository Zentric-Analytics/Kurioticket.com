"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { useLocale } from "@/components/layout/LocaleProvider";
import { Card } from "@/components/ui/Card";

const copy = {
  en: {
    title: "Destinations",
    subtitle: "Explore curated destination ideas and travel inspiration.",
    cards: ["Beach escapes", "City breaks", "Adventure routes"],
  },
  fr: {
    title: "Destinations",
    subtitle: "Découvrez des idées de destinations et de l'inspiration voyage.",
    cards: ["Escapades plage", "Séjours urbains", "Itinéraires aventure"],
  },
};

export default function DestinationsPage() {
  const { locale } = useLocale();
  const lang = locale.startsWith("fr") ? "fr" : "en";
  const c = copy[lang];

  return (
    <>
      <AppHeader />
      <main className="page-shell py-10">
        <h1 className="text-3xl font-black text-slate-950">{c.title}</h1>
        <p className="mt-2 text-slate-600">{c.subtitle}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {c.cards.map((item) => (
            <Card key={item} className="p-5 text-sm font-semibold text-slate-800">{item}</Card>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
