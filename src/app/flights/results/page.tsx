import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { FlightResultsClient } from "@/components/results/FlightResultsClient";
import { FlightCardSkeleton } from "@/components/ui/Skeleton";

export const metadata = {
  title: "Flight Results",
};

export default function FlightResultsPage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<ResultsFallback />}>
        <FlightResultsClient />
      </Suspense>
      <Footer />
    </>
  );
}

function ResultsFallback() {
  return (
    <main className="page-shell flex-1 py-6">
      <FlightCardSkeleton />
    </main>
  );
}
