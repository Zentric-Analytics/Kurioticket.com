import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SearchTabs } from "@/components/search/SearchTabs";
import { Card } from "@/components/ui/Card";

const searchTabTranslations = {
  flights: "Flights", hotels: "Hotels", searchHotelsInstead: "Search hotels instead", from: "From", to: "To", departure: "Departure", return: "Return", destination: "Destination", checkIn: "Check-in", checkOut: "Check-out", guests: "Guests", rooms: "Rooms", cityAirport: "City or airport", cityHotelArea: "City or hotel area", selectDate: "Select date", notNeeded: "Not needed", travelersClass: "Travelers & Class", oneTraveler: "1 Traveler", twoTravelers: "2 Travelers", threeTravelers: "3 Travelers", fourTravelers: "4 Travelers", economy: "Economy", premiumEconomy: "Premium economy", business: "Business", first: "First", adults: "Adults", room: "Room", searchFlights: "Search Flights", searchHotels: "Search Hotels" };


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: `${titleize(slug)} Hotels` };
}

export default async function HotelDestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-gradient-to-b from-indigo-50 via-white to-violet-50/40 pt-24 pb-10 sm:pt-28 lg:pt-28">
        <section className="page-shell">
        <p className="text-sm font-semibold text-violet-700">Future hotel destination page</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-indigo-950">{titleize(slug)} hotels</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Prepared for destination lodging guides, arrival convenience, best areas, transportation difficulty, and hotel quality intelligence.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <SearchTabs t={searchTabTranslations} />
          <Card className="border-indigo-100 p-6">
            <h2 className="text-lg font-bold text-indigo-950">Destination content system</h2>
            <p className="mt-2 text-sm text-slate-600">Editors can add local convenience, airport transfer notes, and area recommendations in Phase 2.</p>
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
