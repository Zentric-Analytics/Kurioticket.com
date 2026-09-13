import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { isKayakSandboxEnabled } from "@/services/travel/kayakSandbox";
import { adaptKayakHotelSearch } from "@/services/travel/kayakSearchAdapter";
import { KayakSandboxResults } from "@/components/results/KayakSandboxResults";
import { KayakMetasearchSection } from "@/components/results/KayakMetasearchSection";

import { AppHeader } from "@/components/layout/AppHeader";
import { HotelResultsClient } from "@/components/results/HotelResultsClient";
import { LocalizedLoadingLabel } from "@/components/layout/LocalizedLoadingLabel";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import { resolveHotelResultsRoute } from "@/lib/hotels/hotelResultsRoute";

export async function generateMetadata({ searchParams }: { searchParams: HotelResultsSearchParams }) {
  if (first((await searchParams).provider) === "kayak-sandbox") {
    return { title: "KAYAK sandbox hotel results", robots: { index: false, follow: false } };
  }
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return {
    title: t["metadata.hotelResults.title"],
    description: t["metadata.hotelResults.description"],
  };
}

type HotelResultsSearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function HotelResultsPage({ searchParams }: { searchParams: HotelResultsSearchParams }) {
  const query = await searchParams;
  if (first(query.provider) === "kayak-sandbox") {
    if (!isKayakSandboxEnabled()) notFound();
    const adapted = adaptKayakHotelSearch(Object.fromEntries(Object.entries(query).map(([key, value]) => [key, first(value)])));
    return <><AppHeader />{adapted.supported
      ? <KayakSandboxResults key={JSON.stringify(adapted.search)} search={adapted.search} />
      : <main className="page-shell py-6"><h1>KAYAK sandbox search unavailable</h1><p>{adapted.reason}</p><a href="/sandbox/kayak">Edit sandbox search</a></main>}</>;
  }
  const route = resolveHotelResultsRoute({ destination: first(query.destination), destinationId: first(query.destinationId), checkIn: first(query.checkIn), checkOut: first(query.checkOut), guests: first(query.guests), rooms: first(query.rooms), sort: first(query.sort) });
  if (!route.resultsReady) redirect(route.recoveryHref);
  return (
    <>
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
      />
      <KayakMetasearchSection vertical="hotels" params={query}>
      <Suspense
        fallback={
          <main className="page-shell min-h-[calc(100svh-5rem)] flex-1 py-6">
            <div className="rounded-3xl border border-indigo-100 bg-white p-5 text-sm font-semibold text-violet-700 shadow-sm">
              <LocalizedLoadingLabel labelKey="loadingHotelSearch" />
            </div>
          </main>
        }
      >
        <HotelResultsClient />
      </Suspense>
      </KayakMetasearchSection>
    </>
  );
}
