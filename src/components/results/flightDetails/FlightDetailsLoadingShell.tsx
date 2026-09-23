import { ArrowLeft, Heart, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import flightDetailsHero from "../../../../apps/mobile/assets/heroes/flight-details-hero.webp";

export function FlightDetailsLoadingShell({ resultsHref }: { resultsHref?: string }) {
  return (
    <main className="flex-1 bg-[#F5F7FB] pb-[calc(2rem+env(safe-area-inset-bottom))] sm:bg-[#F7F9FC] sm:py-7 lg:pt-7">
      <div className="mx-auto w-full max-w-[1500px] px-0 sm:px-6 lg:px-8">
        <div role="status" aria-label="Loading flight details" className="grid gap-5 lg:grid-cols-[minmax(0,2.45fr)_minmax(310px,0.95fr)] lg:gap-7">
          <span className="sr-only">Loading flight details</span>
          <div className="overflow-hidden border-y border-slate-200 bg-[#F5F7FB] sm:rounded-[15px] sm:border sm:bg-white">
            <div className="relative min-h-[318px] overflow-hidden px-4 pb-[122px] pt-[calc(1rem+env(safe-area-inset-top))] sm:min-h-[280px] sm:px-6 sm:pb-16 sm:pt-5 lg:min-h-[300px]">
              <Image src={flightDetailsHero} alt="" fill priority sizes="(min-width: 1024px) 68vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-slate-950/50" aria-hidden="true" />
              <div className="relative z-10 flex items-start justify-between gap-3">
                {resultsHref ? (
                  <Link
                    href={resultsHref}
                    aria-label="Back to results"
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/55 bg-white/90 p-0 text-slate-900 shadow-sm"
                  >
                    <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  </Link>
                ) : <span className="h-11 w-11" aria-hidden="true" />}
                <div
                  aria-hidden="true"
                  className="inline-flex h-11 shrink-0 items-center rounded-full border border-white/55 bg-white/90 p-1 shadow-sm"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500">
                    <Heart className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500">
                    <Share2 className="h-[18px] w-[18px]" strokeWidth={2} />
                  </span>
                </div>
              </div>
              <div className="absolute inset-x-4 bottom-16 z-10 h-8 w-2/5 animate-pulse rounded bg-white/35 sm:inset-x-6" />
            </div>
            <div className="relative z-10 -mt-8 p-4 pt-0 sm:-mt-7 sm:p-6 sm:pt-0">
            <div data-mobile-native-itinerary-loading className="-mx-2 -mt-[72px] sm:mx-0 sm:mt-0">
              <div className="relative h-56 overflow-hidden rounded-[15px] border border-[#D8E1EC] bg-white shadow-[0_6px_18px_rgba(7,19,59,0.14)] sm:rounded-[10px] sm:border-slate-200 sm:bg-slate-100 sm:shadow-lg">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[52%] rounded-t-[15px] bg-[linear-gradient(135deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.18)_46%,rgba(255,255,255,0)_100%)] sm:hidden" aria-hidden="true" />
                <div className="relative z-[1] p-[15px] sm:hidden">
                  <div className="flex items-start justify-between"><div className="h-[10px] w-16 animate-pulse rounded bg-slate-200" /><div className="h-[10px] w-24 animate-pulse rounded bg-slate-200" /></div>
                  <div className="mt-[18px] grid grid-cols-[1.1fr_.8fr_1.1fr] items-center gap-2">
                    <div className="space-y-2"><div className="h-5 w-16 animate-pulse rounded bg-slate-200" /><div className="h-3 w-10 animate-pulse rounded bg-slate-200" /></div>
                    <div className="space-y-2"><div className="mx-auto h-3 w-12 animate-pulse rounded bg-slate-200" /><div className="h-px w-full bg-slate-200" /></div>
                    <div className="ml-auto space-y-2"><div className="ml-auto h-5 w-16 animate-pulse rounded bg-slate-200" /><div className="ml-auto h-3 w-10 animate-pulse rounded bg-slate-200" /></div>
                  </div>
                  <div className="mt-5 h-px bg-slate-200" />
                  <div className="mt-4 flex items-start gap-3"><div className="h-8 w-8 animate-pulse rounded-lg bg-slate-200" /><div className="flex-1 space-y-2"><div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" /><div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" /><div className="h-3 w-3/4 animate-pulse rounded bg-slate-200" /></div></div>
                </div>
              </div>
            </div>
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
