import { AccountDetailShell } from "@/components/dashboard/AccountDetailShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { SavedTripsAndRecentSearches } from "@/components/saved/SavedTripsAndRecentSearches";

type SavedPageProps = {
  searchParams?: Promise<{ from?: string | string[] }>;
};

export default async function SavedPage({ searchParams }: SavedPageProps) {
  const resolvedSearchParams = await searchParams;
  const fromParam = resolvedSearchParams?.from;
  const showAccountLink = Array.isArray(fromParam)
    ? fromParam.includes("account")
    : fromParam === "account";

  return (
    <>
      <div className="[&>header]:!border-b-0 [&>header]:!shadow-none">
        <AppHeader />
      </div>
      <main className="flex-1 bg-[#f3f7fc] pb-16 lg:pb-20">
        {showAccountLink ? (
          <AccountDetailShell>
            <SavedTripsAndRecentSearches />
          </AccountDetailShell>
        ) : (
          <SavedTripsAndRecentSearches />
        )}
      </main>
      <Footer />
    </>
  );
}
