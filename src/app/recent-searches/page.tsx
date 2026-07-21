import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { RecentSearchesPageContent } from "@/components/recent-searches/RecentSearchesPageContent";

export default function RecentSearchesPage() {
  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AppHeader />
      </div>
      <main className="flex-1 bg-[#f3f7fc] pb-16 lg:pb-20">
        <RecentSearchesPageContent />
      </main>
      <Footer />
    </>
  );
}
