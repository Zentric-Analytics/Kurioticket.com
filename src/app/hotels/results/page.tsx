import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { HotelResultsClient } from "@/components/results/HotelResultsClient";
import { Card } from "@/components/ui/Card";

export const metadata = {
  title: "Hotel Results",
};

export default function HotelResultsPage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<main className="page-shell flex-1 py-6"><Card className="p-5 text-muted">Loading hotel search...</Card></main>}>
        <HotelResultsClient />
      </Suspense>
      <Footer />
    </>
  );
}
