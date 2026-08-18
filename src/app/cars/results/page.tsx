import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { CarsResultsClient } from "@/components/results/CarsResultsClient";
import type { CarSearchParams } from "@/lib/cars/types";
import { hasExplicitDifferentReturnLocation } from "@/lib/cars/carsSearchUtils";
import { searchCars } from "@/services/travel/carAggregator";

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
  const inventory = await searchCars(values);

  return (
    <>
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
      />
      <CarsResultsClient
        key={JSON.stringify(values)}
        values={values}
        initialResults={inventory.results}
        inventoryStatus={inventory.status}
      />
      <Footer />
    </>
  );
}
