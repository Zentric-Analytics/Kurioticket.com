import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import flightDetailsHero from "../../../../apps/mobile/assets/heroes/flight-details-hero.webp";

export function FlightDetailsLoadingShell({ resultsHref }: { resultsHref?: string }) {
  return (
    <main className="flex-1 bg-white pb-[calc(2rem+env(safe-area-inset-bottom))] sm:bg-[#F7F9FC] sm:py-7 lg:pt-7">
      <div className="mx-auto w-full max-w-[1500px] px-0 sm:px-6 lg:px-8">
        <div role="status" aria-label="Loading flight details" className="grid gap-5 lg:grid-cols-[minmax(0,2.45fr)_minmax(310px,0.95fr)] lg:gap-7">
          <span className="sr-only">Loading flight details</span>
          <div className="overflow-hidden border-y border-slate-200 bg-white sm:rounded-[15px] sm:border">
            <div className="relative min-h-[310px] overflow-hidden px-4 pb-16 pt-[calc(1rem+env(safe-area-inset-top))] sm:min-h-[280px] sm:px-6 sm:pt-5 lg:min-h-[300px]">
              <Image src={flightDetailsHero} alt="" fill priority sizes="(min-width: 1024px) 68vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-slate-950/50" aria-hidden="true" />
              {resultsHref ? <Link href={resultsHref} className="relative z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/55 bg-white/90 px-4 text-[13px] font-bold text-slate-900"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to results</Link> : null}
              <div className="absolute inset-x-4 bottom-16 z-10 h-8 w-2/5 animate-pulse rounded bg-white/35 sm:inset-x-6" />
            </div>
            <div className="relative z-10 -mt-8 p-4 pt-0 sm:-mt-7 sm:p-6 sm:pt-0">
            <div className="h-56 animate-pulse rounded-[10px] border border-slate-200 bg-slate-100 shadow-lg" />
            <div className="mt-7 h-6 w-36 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 h-40 w-[min(78vw,275px)] max-w-[275px] animate-pulse rounded-[10px] bg-slate-100" />
            <div className="mt-6 h-44 animate-pulse rounded-[10px] bg-slate-100" />
            </div>
          </div>
          <div className="hidden h-[620px] animate-pulse rounded-[15px] border border-slate-200 bg-white lg:block" />
        </div>
      </div>
    </main>
  );
}
