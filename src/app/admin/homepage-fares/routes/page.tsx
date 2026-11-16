import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { HomepageFareSubpageNavigation } from "@/components/admin/HomepageFareSubpageNavigation";
import { HomepageFaresRefreshCard } from "@/components/admin/HomepageFaresRefreshCard";
import { ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE } from "@/lib/admin/homepageFareRouteGrouping";

export const metadata = { title: "Admin Homepage Fare Route Inspector" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminHomepageFareRoutesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawMarket = typeof params.market === "string" ? params.market.trim() : "";
  // Market values are routing hints, not database query inputs. Reject
  // malformed or excessive values and let the inspector resolve known scopes.
  const initialMarket = rawMarket === ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE
    || /^[A-Za-z0-9_-]{1,40}$/.test(rawMarket)
      ? rawMarket || ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE
      : ADMIN_HOMEPAGE_FARE_ALL_ROUTES_SCOPE;

  return (
    <AdminPageShell title="Route inspector" hideHeader>
      <div className="mx-auto w-full min-w-0 max-w-[1500px] bg-white text-[#020617]">
        <h1 className="sr-only">Route inspector</h1>
        <HomepageFareSubpageNavigation active="routes" />
        <HomepageFaresRefreshCard view="routes" initialMarket={initialMarket} />
      </div>
    </AdminPageShell>
  );
}
