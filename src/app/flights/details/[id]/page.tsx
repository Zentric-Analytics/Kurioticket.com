import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { FlightDetailsClient } from "@/components/results/FlightDetailsClient";

export const metadata = {
  title: "Flight Details",
};

export default async function FlightDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <AppHeader />
      <FlightDetailsClient id={id} />
      <Footer />
    </>
  );
}
