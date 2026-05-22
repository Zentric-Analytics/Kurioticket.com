import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";

const searchTabTranslations = {
  flights: "Flights",
  hotels: "Hotels",
  from: "From",
  to: "To",
  departure: "Departure",
  return: "Return",
  oneTraveler: "1 Traveler",
  twoTravelers: "2 Travelers",
  threeTravelers: "3 Travelers",
  fourTravelers: "4 Travelers",
  economy: "Economy",
  premiumEconomy: "Premium economy",
  business: "Business",
  first: "First",
  destination: "Destination",
  searchFlights: "Search Flights",
  searchHotels: "Search Hotels",
};

export default function HomePage() {
  return (
    <>
      <AppHeader />

      <main className="flex-1 bg-slate-50">
        <section className="page-shell py-10 md:py-14">
          <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Find better flight and hotel deals in seconds.
            </h1>

            <p className="mt-4 max-w-3xl text-base text-slate-600 md:text-lg">
              Compare providers, narrow options quickly, and book with more confidence.
            </p>

            <div className="mt-8">
              <SearchTabs t={searchTabTranslations} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}