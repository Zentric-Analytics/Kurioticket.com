import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { HotelResultsClient } from "@/components/results/HotelResultsClient";
import { LocalizedLoadingLabel } from "@/components/layout/LocalizedLoadingLabel";

export const metadata = {
  title: "Hotel Results",
};

export default function HotelResultsPage() {
  return (
    <>
      <AppHeader />
      <Suspense fallback={<main className="page-shell flex-1 py-6"><div className="rounded-3xl border border-indigo-100 bg-white p-5 text-sm font-semibold text-violet-700 shadow-sm"><LocalizedLoadingLabel labelKey="loadingHotelSearch" /></div></main>}>
        <HotelResultsClient />
      </Suspense>
      <Footer />
    </>
  );
}
