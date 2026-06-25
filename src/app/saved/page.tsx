import { AccountBackLink } from "@/components/dashboard/AccountBackLink";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SavedTripsAndRecentSearches } from "@/components/saved/SavedTripsAndRecentSearches";

type SavedPageProps = {
  searchParams?: Promise<{ from?: string | string[] }>;
};

export default async function SavedPage({ searchParams }: SavedPageProps) {
  const resolvedSearchParams = await searchParams;
  const showAccountLink = resolvedSearchParams?.from === "account";

  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AppHeader />
      </div>
      <main className="flex-1 bg-[#f3f7fc] pb-16 lg:pb-20">
        {showAccountLink ? (
          <div className="page-shell min-w-0">
            <AccountBackLink />
          </div>
        ) : null}
        <SavedTripsAndRecentSearches />
      </main>
      <Footer />
    </>
  );
}
