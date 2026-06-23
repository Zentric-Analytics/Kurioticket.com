import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SavedTripsAndRecentSearches } from "@/components/saved/SavedTripsAndRecentSearches";

export default function SavedPage() {
  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AppHeader />
      </div>
      <main className="flex-1 bg-[#f3f7fc] pb-16 lg:pb-20">
        <SavedTripsAndRecentSearches />
      </main>
      <Footer />
    </>
  );
}
