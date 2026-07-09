import { Suspense } from "react";
import { cookies } from "next/headers";

import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { FlightResultsClient } from "@/components/results/FlightResultsClient";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";

type FlightResultsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function generateMetadata() {
  const cookieStore = await cookies();
  const t = getTranslations(cookieStore.get(LOCALE_COOKIE_KEY)?.value);

  return {
    title: t["metadata.flightResults.title"],
    description: t["metadata.flightResults.description"],
  };
}

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

  const t = getTranslations((await cookies()).get(LOCALE_COOKIE_KEY)?.value);

  return (
    <>
      <AppHeader hideTravelNav flushDesktopBottom />
      <Suspense
        fallback={
          <ResultsFallback
            title={t["flightResults.loading.title"]}
            description={t["flightResults.loading.checkingAirlinesAndFares"]}
          />
        }
      >
        <FlightResultsClient />
      </Suspense>
      <Footer />
    </>
  );
}

function ResultsFallback({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-[100svh] bg-[#F3F6FA]">
      <BrandedLoading
        variant="fullscreen"
        visual="logoPulse"
        showProgress={false}
        className="min-h-[100svh] bg-transparent px-5"
        contentClassName="max-w-md text-center"
        title={title}
        description={description}
      />
    </main>
  );
}
