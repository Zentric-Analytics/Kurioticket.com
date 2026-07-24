import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { CarDetailsClient } from "@/components/results/CarDetailsClient";
import type { CarSearchParams } from "@/lib/cars/types";
import { getCarDetails } from "@/services/travel/carAggregator";

const value = (input: string | string[] | undefined) => (Array.isArray(input) ? input[0] : input)?.trim() || "";
export default async function CarDetailsPage({ params, searchParams }: { params: Promise<{id:string}>; searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const [{id}, query] = await Promise.all([params, searchParams]);
  const search: CarSearchParams = { pickupLocation:value(query.pickupLocation), dropoffLocation:value(query.dropoffLocation), pickupDate:value(query.pickupDate), pickupTime:value(query.pickupTime)||"10:00", dropoffDate:value(query.dropoffDate), dropoffTime:value(query.dropoffTime)||"10:00", driverAge:value(query.driverAge)||"18-70" };
  const qs = new URLSearchParams(); Object.entries(search).forEach(([key,item])=>item&&qs.set(key,item)); const resultsHref=`/cars/results?${qs}`;
  const car = await getCarDetails(id, search);
  return <><AppHeader
    flushDesktopBottom
    flushMobileBottom
    hideDesktopTravelNav
    hideMobileCategoryTabs
  />{car ? <CarDetailsClient car={car} search={search} resultsHref={resultsHref} /> : <main className="flex-1 bg-[#f6f8fb] py-20"><div className="page-shell"><div role="status" className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-10 text-center"><h1 className="text-2xl font-extrabold">Car unavailable</h1><p className="mt-3 text-slate-600">This vehicle cannot be displayed for the current search.</p><Link href={resultsHref} className="mt-6 inline-flex rounded-lg bg-[#004BB8] px-5 py-3 font-bold text-white">Back to Cars results</Link></div></div></main>}<Footer /></>;
}
