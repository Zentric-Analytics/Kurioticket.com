import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { CarsResultsClient } from "@/components/results/CarsResultsClient";

type CarsResultsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const defaultDriverAge = "18-70";

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

  return (
    <>
      <AppHeader />
      <CarsResultsClient
        values={{
          pickupLocation,
          dropoffLocation: dropoffLocation || pickupLocation,
          pickupDate: getParamValue(params, "pickupDate"),
          pickupTime: getParamValue(params, "pickupTime") || "10:00",
          dropoffDate: getParamValue(params, "dropoffDate"),
          dropoffTime: getParamValue(params, "dropoffTime") || "10:00",
          driverAge: getParamValue(params, "driverAge") || defaultDriverAge,
        }}
      />
      <Footer />
    </>
  );
}
