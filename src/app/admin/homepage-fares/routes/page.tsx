import Link from "next/link";

import { AdminPageShell } from "@/components/admin/AdminPageShell";
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
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#D8E1EC] pb-4 pt-1">
          <div>
            <h1 className="text-[20px] font-semibold leading-7 tracking-[-0.02em] text-[#020617]">Route inspector</h1>
            <p className="mt-1 text-[12px] leading-5 text-[#64748B]">Inspect saved homepage fare routes by market and status.</p>
          </div>
          <nav aria-label="Homepage fares pages" className="flex flex-wrap items-center gap-2">
            <Link href="/admin/homepage-fares" className="inline-flex min-h-9 items-center rounded-md border border-[#D8E1EC] px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">Back to Homepage Fare Operations</Link>
            <Link href="/admin/homepage-fares/diagnostics" className="inline-flex min-h-9 items-center rounded-md border border-[#D8E1EC] px-3 text-[12px] font-medium text-[#004BB8] hover:bg-[#F8FAFC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004BB8]">Fare diagnostics</Link>
          </nav>
        </header>
        <HomepageFaresRefreshCard view="routes" initialMarket={initialMarket} />
      </div>
    </AdminPageShell>
  );
}
