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
      <main className="page-shell flex-1 py-8">
        <p className="text-sm font-semibold text-teal-dark">Future hotel destination page</p>
        <h1 className="mt-2 text-3xl font-bold text-navy">{titleize(slug)} hotels</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Prepared for destination lodging guides, arrival convenience, best areas, transportation difficulty, and hotel quality intelligence.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <SearchTabs t={searchTabTranslations} />
          <Card className="p-5">
            <h2 className="font-bold text-navy">Destination content system</h2>
            <p className="mt-2 text-sm text-muted">Editors can add local convenience, airport transfer notes, and area recommendations in Phase 2.</p>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

function titleize(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
