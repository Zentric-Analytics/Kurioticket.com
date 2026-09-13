import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";

import { redirect } from "next/navigation";

import { AppHeader } from "@/components/layout/AppHeader";
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import { FlightResultsClient } from "@/components/results/FlightResultsClient";
import { getTranslations } from "@/lib/i18n";
import { LOCALE_COOKIE_KEY } from "@/lib/preferences/preferences";
import { parseFlightLegParams } from "@/lib/flights/flightSearchJourney";
import { isKayakSandboxEnabled } from "@/services/travel/kayakSandbox";
import { adaptKayakFlightSearch } from "@/services/travel/kayakSearchAdapter";
import { flightSearchSchema } from "@/lib/validation";
import { KayakSandboxResults } from "@/components/results/KayakSandboxResults";
import { notFound } from "next/navigation";

type FlightResultsSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export async function generateMetadata({ searchParams }: { searchParams: FlightResultsSearchParams }) {
  if (getParamValue(await searchParams, "provider") === "kayak-sandbox") {
    return { title: "KAYAK sandbox flight results", robots: { index: false, follow: false } };
  }
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
  const tripType = requestedTripType === "one-way" ? "one-way" : requestedTripType === "multi-city" ? "multi-city" : "round-trip";

  if (tripType === "multi-city") {
    const url = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      const first = Array.isArray(value) ? value[0] : value;
      if (first) url.set(key, first);
    });
    const legs = parseFlightLegParams(url);
    return legs.length >= 2 && legs.every((leg, index) =>
      Boolean(leg.origin && leg.destination && leg.origin !== leg.destination && isValidFutureOrTodayDate(leg.departureDate) && (index === 0 || leg.departureDate >= legs[index - 1].departureDate)),
    );
  }

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

  if (getParamValue(params, "provider") === "kayak-sandbox") {
    if (!isKayakSandboxEnabled()) notFound();
    const values = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
    const parsed = flightSearchSchema.safeParse(values);
    const adapted = parsed.success ? adaptKayakFlightSearch(parsed.data) : null;
    return <><AppHeader />{adapted?.supported
      ? <KayakSandboxResults key={JSON.stringify(adapted.search)} search={adapted.search} />
      : <main className="page-shell py-6"><h1>KAYAK sandbox search unavailable</h1><p>{adapted && !adapted.supported ? adapted.reason : "Check the flight search details."}</p><Link href="/flights">Edit flight search</Link></main>}</>;
  }

  if (!hasValidFlightSearchParams(params)) {
    redirect("/flights");
  }

  const t = getTranslations((await cookies()).get(LOCALE_COOKIE_KEY)?.value);

  return (
    <>
      <AppHeader
        flushDesktopBottom
        flushMobileBottom
        hideDesktopTravelNav
        hideMobileCategoryTabs
      />
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
    <main className="min-h-[calc(100svh-5rem)] bg-white">
      <BrandedLoading
        variant="fullscreen"
        visual="logoPulse"
        showProgress={false}
        className="min-h-[calc(100svh-5rem)] bg-transparent px-5"
        contentClassName="max-w-md text-center"
        title={title}
        description={description}
      />
    </main>
  );
}
