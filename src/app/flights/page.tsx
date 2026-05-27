import { FlightsLandingPage } from "@/components/flights/FlightsLandingPage";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Flights",
};

export default function FlightsPage() {
  return (
    <>
      <AppHeader />
      <FlightsLandingPage />
      <Footer />
    </>
  );
}
