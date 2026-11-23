import { decodeProviderRouteId } from "@/lib/travel/providerRouteId";
import Link from "next/link";
import { headers } from "next/headers";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { CarDetailsClient } from "@/components/results/CarDetailsClient";
import { CarUnavailableResultsReturnIntent } from "@/components/results/CarUnavailableResultsReturnIntent";
import type { LocationBoundCarSearchParams } from "@/lib/cars/types";
import { parseCarLocationTarget } from "@/lib/cars/carSearchLocationTarget";
import { carSearchUrlParams } from "@/lib/cars/carResults";
import { getCarDetails } from "@/services/travel/carAggregator";
import { getKayakClientIp } from "@/lib/kayak-client-ip";
import { journeyRequestId } from "@/lib/journeyEventClient";

const value = (input: string | string[] | undefined) => (Array.isArray(input) ? input[0] : input)?.trim() || "";
export default async function CarDetailsPage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const [{ id: routeId }, query] = await Promise.all([params, searchParams]);
  const id = decodeProviderRouteId(routeId);
  const pickupLocation = value(query.pickupLocation);
  const dropoffLocation = value(query.dropoffLocation) || pickupLocation;
  const pickupLocationTarget = parseCarLocationTarget(
    value(query.pickupLocationTarget),
  );
  const explicitDropoffLocationTarget = parseCarLocationTarget(
    value(query.dropoffLocationTarget),
  );
  const search: LocationBoundCarSearchParams = {
    pickupLocation,
    dropoffLocation,
    pickupDate: value(query.pickupDate),
    pickupTime: value(query.pickupTime) || "10:00",
    dropoffDate: value(query.dropoffDate),
    dropoffTime: value(query.dropoffTime) || "10:00",
    driverAge: value(query.driverAge) || "18-70",
    ...(pickupLocationTarget ? { pickupLocationTarget } : {}),
    ...(explicitDropoffLocationTarget
      ? { dropoffLocationTarget: explicitDropoffLocationTarget }
      : pickupLocationTarget && dropoffLocation === pickupLocation
        ? { dropoffLocationTarget: pickupLocationTarget }
        : {}),
  };
  const returnParams = new URLSearchParams(carSearchUrlParams(search));
  const returnFilters = value(query.filters);
  const returnSort = value(query.sort);
  if (/^[a-zA-Z0-9:,_-]{1,1024}$/.test(returnFilters)) returnParams.set("filters", returnFilters);
  if (["recommended", "lowestTotal", "topRated"].includes(returnSort)) returnParams.set("sort", returnSort);
  const resultsHref = `/cars/results?${returnParams.toString()}`;
  const requestHeaders = await headers();
  const request = new Request("https://kurioticket.invalid/cars/details", { headers: requestHeaders });
  const car = await getCarDetails(id, search, {
    clientIp: getKayakClientIp(request),
    userAgent: requestHeaders.get("user-agent") || undefined,
  });
  return <><div className="hidden lg:block" data-car-details-desktop-header><AppHeader
    flushDesktopBottom
    flushMobileBottom
    hideDesktopTravelNav
    hideMobileCategoryTabs
  /></div><div className="pt-[env(safe-area-inset-top)] lg:pt-0" data-car-details-mobile-safe-area>{car ? <CarDetailsClient car={car} search={search} resultsHref={resultsHref} requestId={journeyRequestId(value(query.requestId))} /> : <><CarUnavailableResultsReturnIntent resultsHref={resultsHref} /><main className="flex-1 bg-surface-muted/40"><section className="border-b border-border bg-white"><div className="page-shell py-20"><div role="status" className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-10 text-center"><h1 className="text-2xl font-extrabold">Car unavailable</h1><p className="mt-3 text-slate-600">This vehicle cannot be displayed for the current search.</p><Link href={resultsHref} className="mt-6 inline-flex rounded-lg bg-[#004BB8] px-5 py-3 font-bold text-white">Back to Cars results</Link></div></div></section></main></>}</div><div className="hidden lg:block" data-car-details-desktop-footer><Footer variant="brand-legal-only" /></div></>;
}
