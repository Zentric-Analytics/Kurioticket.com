import { Suspense } from "react";
import { cookies } from "next/headers";

import { AppHeader } from "@/components/layout/AppHeader";
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { CarsResultsClient } from "@/components/results/CarsResultsClient";
import type { CarSearchParams } from "@/lib/cars/types";
import { hasExplicitDifferentReturnLocation } from "@/lib/cars/carsSearchUtils";
import { CARS_RESULTS_RELOAD_SCROLL_SCRIPT } from "@/lib/cars/carsResultsReloadScroll";
import { getTranslations } from "@/lib/i18n";
import { translations as enTranslations } from "@/lib/i18n/en";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import { searchCars } from "@/services/travel/carAggregator";
import { notFound } from "next/navigation";
import { isKayakSandboxEnabled } from "@/services/travel/kayakSandbox";
import { adaptKayakCarSearch } from "@/services/travel/kayakSearchAdapter";
import { KayakSandboxResults } from "@/components/results/KayakSandboxResults";
import { KayakMetasearchSection } from "@/components/results/KayakMetasearchSection";

export async function generateMetadata({ searchParams }: { searchParams: CarsResultsSearchParams }) {
  return getParamValue(await searchParams, "provider") === "kayak-sandbox"
    ? { title: "KAYAK sandbox car results", robots: { index: false, follow: false } }
    : {};
}

type CarsResultsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const defaultDriverAge = "18-70";
const minimumDriverAge = 18;
const maximumDriverAge = 70;
const driverAgeOptions = [
  defaultDriverAge,
  ...Array.from(
    { length: maximumDriverAge - minimumDriverAge + 1 },
    (_, index) => String(index + minimumDriverAge),
  ),
];

const normalizeDriverAge = (value: string) =>
  driverAgeOptions.includes(value) ? value : defaultDriverAge;

const getParamValue = (
  params: Awaited<CarsResultsSearchParams>,
  key: keyof Awaited<CarsResultsSearchParams>,
) => {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0]?.trim() || "";
  }

  return value?.trim() || "";
};

export default async function CarsResultsPage({
  searchParams,
}: {
  searchParams: CarsResultsSearchParams;
}) {
  const params = await searchParams;
  if (getParamValue(params, "provider") === "kayak-sandbox") {
    if (!isKayakSandboxEnabled()) notFound();
    const adapted = adaptKayakCarSearch(Object.fromEntries(Object.keys(params).map((key) => [key, getParamValue(params, key)])));
    return <><AppHeader />{adapted.supported
      ? <KayakSandboxResults key={JSON.stringify(adapted.search)} search={adapted.search} />
      : <main className="page-shell py-6"><h1>KAYAK sandbox search unavailable</h1><p>{adapted.reason}</p><a href="/sandbox/kayak">Edit sandbox search</a></main>}</>;
  }
  const pickupLocation = getParamValue(params, "pickupLocation");
  const dropoffLocation = getParamValue(params, "dropoffLocation");
  const returnToDifferentLocation = hasExplicitDifferentReturnLocation({
    pickupLocation,
    dropoffLocation,
    marker: getParamValue(params, "returnToDifferentLocation"),
  });
  const values: CarSearchParams & { returnToDifferentLocation: boolean } = {
    pickupLocation,
    dropoffLocation: dropoffLocation || pickupLocation,
    returnToDifferentLocation,
    pickupDate: getParamValue(params, "pickupDate"),
    pickupTime: getParamValue(params, "pickupTime") || "10:00",
    dropoffDate: getParamValue(params, "dropoffDate"),
    dropoffTime: getParamValue(params, "dropoffTime") || "10:00",
    driverAge: normalizeDriverAge(getParamValue(params, "driverAge")),
  };
  const searchIdentity = JSON.stringify(values);
  const t = getTranslations((await cookies()).get(LOCALE_COOKIE_KEY)?.value);

  return (
    <>
      <script
        data-cars-results-reload-scroll-policy
        dangerouslySetInnerHTML={{ __html: CARS_RESULTS_RELOAD_SCROLL_SCRIPT }}
      />
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
      />
      <KayakMetasearchSection vertical="cars" params={params} />
      <Suspense
        key={searchIdentity}
        fallback={
          <CarsResultsFallback
            title={
              t["carsResults.loading.title"] ??
              enTranslations["carsResults.loading.title"]
            }
            messages={[
              t["carsResults.loading.checkingCarsAndRates"] ??
                enTranslations["carsResults.loading.checkingCarsAndRates"],
              t["carsResults.loading.comparingVehiclesAndProviders"] ??
                enTranslations[
                  "carsResults.loading.comparingVehiclesAndProviders"
                ],
              t["carsResults.loading.findingBestAvailableOptions"] ??
                enTranslations[
                  "carsResults.loading.findingBestAvailableOptions"
                ],
              t["carsResults.loading.preparingResults"] ??
                enTranslations["carsResults.loading.preparingResults"],
            ]}
          />
        }
      >
        <CarsResultsContent values={values} searchIdentity={searchIdentity} />
      </Suspense>
    </>
  );
}

async function CarsResultsContent({
  values,
  searchIdentity,
}: {
  values: CarSearchParams & { returnToDifferentLocation: boolean };
  searchIdentity: string;
}) {
  const inventory = await searchCars(values);

  return (
    <CarsResultsClient
      key={searchIdentity}
      values={values}
      initialResults={inventory.results}
      inventoryStatus={inventory.status}
    />
  );
}

function CarsResultsFallback({
  title,
  messages,
}: {
  title: string;
  messages: string[];
}) {
  return (
    <main className="flex min-h-[calc(100svh-5rem)] flex-1 bg-white">
      <BrandedLoading
        variant="fullscreen"
        visual="logoPulse"
        showProgress={false}
        className="min-h-[calc(100svh-5rem)] flex-1 bg-transparent px-5"
        contentClassName="max-w-md text-center"
        title={title}
        messages={messages}
      />
    </main>
  );
}
