import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { isKayakSandboxEnabled } from "@/services/travel/kayakSandbox";


import { HotelResultsClient } from "@/components/results/HotelResultsClient";
import { LocalizedLoadingLabel } from "@/components/layout/LocalizedLoadingLabel";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import { resolveHotelResultsRoute } from "@/lib/hotels/hotelResultsRoute";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: HotelResultsSearchParams;
}) {
  if (first((await searchParams).provider) === "kayak-sandbox") {
    return {
      title: "KAYAK sandbox hotel results",
      robots: { index: false, follow: false },
    };
  }
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return {
    title: t["metadata.hotelResults.title"],
    description: t["metadata.hotelResults.description"],
  };
}

type HotelResultsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;
const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function HotelResultsPage({
  searchParams,
}: {
  searchParams: HotelResultsSearchParams;
}) {
  const query = await searchParams;
  const sandboxProviderMode = first(query.provider) === "kayak-sandbox";
  if (sandboxProviderMode && !isKayakSandboxEnabled()) notFound();

  const requestedDestinationId = first(query.destinationId);
  const sandboxDestinationId =
    sandboxProviderMode &&
    requestedDestinationId &&
    /^kplace:\d+$/.test(requestedDestinationId)
      ? requestedDestinationId
      : undefined;
  const destination =
    first(query.destination) ||
    (sandboxDestinationId ? "KAYAK sandbox destination" : undefined);
  const route = resolveHotelResultsRoute({
    destination,
    destinationId: sandboxDestinationId ? undefined : requestedDestinationId,
    checkIn: first(query.checkIn),
    checkOut: first(query.checkOut),
    guests: first(query.guests),
    rooms: first(query.rooms),
    sort: first(query.sort),
  });
  if (!route.resultsReady) redirect(route.recoveryHref);

  return (
    <>
      <Suspense
        fallback={
          <>
            <AppHeader flushDesktopBottom flushMobileBottom hideDesktopTravelNav hideMobileCategoryTabs />
            <main className="page-shell min-h-[calc(100svh-5rem)] flex-1 py-6">
              <div className="rounded-3xl border border-indigo-100 bg-white p-5 text-sm font-semibold text-violet-700 shadow-sm">
                <LocalizedLoadingLabel labelKey="loadingHotelSearch" />
              </div>
            </main>
          </>
        }
      >
        <HotelResultsClient />
      </Suspense>
    </>
  );
}
