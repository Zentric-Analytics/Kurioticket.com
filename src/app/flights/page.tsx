import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { StandaloneFlightSearchForm } from "@/components/search/StandaloneFlightSearchForm";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Flights",
};

export default function FlightsLandingPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-slate-50">
        <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 text-white">
          <div className="page-shell pt-24 pb-10 sm:pt-28 lg:pt-32 lg:pb-14">
            <div className="max-w-3xl">
              <p className="text-sm font-extrabold uppercase tracking-[0.24em] text-indigo-100">
                Flights
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                Search flights with flexible dates and traveler details.
              </h1>
              <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-indigo-50/90 sm:text-lg">
                Compare routes by origin, destination, travel dates, travelers, and cabin class before continuing to live flight results.
              </p>
            </div>
          </div>
        </section>

        <section className="page-shell -mt-8 grid gap-6 pb-12 lg:-mt-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <StandaloneFlightSearchForm />

          <Card className="p-5">
            <h2 className="text-lg font-black text-slate-950">Plan your flight search</h2>
            <ul className="mt-4 grid gap-3 text-sm font-medium leading-6 text-slate-600">
              <li>Use airport-backed suggestions for cleaner origin and destination matches.</li>
              <li>Pick one-way or round-trip dates with past dates disabled.</li>
              <li>Set adults, children, infants, and cabin class before searching.</li>
            </ul>
          </Card>
        </section>
      </main>
      <Footer />
    </>
  );
}
