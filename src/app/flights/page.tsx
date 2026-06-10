import { FlightLandingClient } from "@/components/flights/FlightLandingClient";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Flights",
  description:
    "Search routes, compare dates, and explore flight options for your next journey.",
};

export default function FlightsPage() {
  return (
    <>
      <AppHeader />
      <FlightLandingClient />
      <Footer />
    </>
  );
}
