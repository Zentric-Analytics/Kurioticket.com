import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { FlightResultsClient } from "@/components/results/FlightResultsClient";
import { FlightCardSkeleton } from "@/components/ui/Skeleton";

type FlightResultsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export const metadata = {
  title: "Flight Results",
};

const getParamValue = (
  params: Awaited<FlightResultsSearchParams>,
  key: keyof Awaited<FlightResultsSearchParams>,
) => {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0]?.trim() || "";
  }

  return value?.trim() || "";
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseDateValue = (value: string) => {
  if (!isIsoDate(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const isValidFutureOrTodayDate = (value: string) => {
  const parsed = parseDateValue(value);
  return Boolean(parsed && parsed >= startOfToday());
};

const hasValidFlightSearchParams = (
  params: Awaited<FlightResultsSearchParams>,
) => {
  const origin = getParamValue(params, "origin");
  const destination = getParamValue(params, "destination");
  const departureDate = getParamValue(params, "departureDate");
  const returnDate = getParamValue(params, "returnDate");
  const requestedTripType = getParamValue(params, "tripType");
  const tripType = requestedTripType === "one-way" ? "one-way" : "round-trip";

  if (!origin || !destination || !isValidFutureOrTodayDate(departureDate)) {
    return false;
  }

  if (tripType !== "round-trip") {
    return true;
  }

  const parsedDepartureDate = parseDateValue(departureDate);
  const parsedReturnDate = parseDateValue(returnDate);

  return Boolean(
    parsedDepartureDate &&
      parsedReturnDate &&
      parsedReturnDate >= parsedDepartureDate &&
      isValidFutureOrTodayDate(returnDate),
  );
};

export default async function FlightResultsPage({
  searchParams,
}: {
  searchParams: FlightResultsSearchParams;
}) {
  const params = await searchParams;

  if (!hasValidFlightSearchParams(params)) {
    redirect("/flights");
  }

  return (
    <>
      <AppHeader />
      <Suspense fallback={<ResultsFallback />}>
        <FlightResultsClient />
      </Suspense>
      <Footer />
    </>
  );
}

function ResultsFallback() {
  return (
    <main className="page-shell flex-1 py-6">
      <FlightCardSkeleton />
    </main>
  );
}
