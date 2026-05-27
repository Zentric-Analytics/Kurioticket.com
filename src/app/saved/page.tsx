import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SavedTripsAndRecentSearches } from "@/components/saved/SavedTripsAndRecentSearches";

export default function SavedPage() {
  return (
    <>
      <AppHeader />
      <main className="flex-1 bg-[radial-gradient(circle_at_top,rgba(244,244,255,0.9),rgba(255,255,255,1)_42%)] pb-14 pt-6 md:pb-20 md:pt-10">
        <SavedTripsAndRecentSearches />
      </main>
      <Footer />
    </>
  );
}
