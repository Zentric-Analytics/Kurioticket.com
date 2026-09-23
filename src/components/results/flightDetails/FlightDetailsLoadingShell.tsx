"use client";

import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import flightDetailsHero from "../../../../apps/mobile/assets/heroes/flight-details-hero.webp";

export function FlightDetailsLoadingShell({ resultsHref }: { resultsHref?: string }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const itineraryRef = useRef<HTMLDivElement>(null);
  const backControlRef = useRef<HTMLDivElement>(null);
  const [headerProtected, setHeaderProtected] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (window.matchMedia("(min-width: 640px)").matches) {
        setHeaderProtected(false);
        return;
      }
      const hero = heroRef.current;
      const itinerary = itineraryRef.current;
      if (!hero || !itinerary) return;
      const heroTop = hero.getBoundingClientRect().top + window.scrollY;
      const heroHeight = hero.getBoundingClientRect().height;
      const itineraryTop = itinerary.getBoundingClientRect().top + window.scrollY;
      const foregroundOffset = itineraryTop - (heroTop + heroHeight);
      const protectedHeight = (backControlRef.current?.getBoundingClientRect().bottom ?? 52) + 12;
      const threshold = Math.max(0, heroTop + heroHeight + foregroundOffset - protectedHeight);
      setHeaderProtected(window.scrollY >= threshold);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return (
    <main className="flex-1 bg-[#F3F6FA] pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:bg-[#F7F9FC] sm:py-7 lg:pt-7">
      <div aria-hidden="true" className={`pointer-events-none fixed inset-x-0 top-0 z-[70] h-[calc(env(safe-area-inset-top)+64px)] transition-colors sm:hidden ${headerProtected ? "bg-[#F3F6FA]" : "bg-transparent"}`} />
      {resultsHref ? (
        <div ref={backControlRef} className="fixed left-4 top-[calc(env(safe-area-inset-top)+8px)] z-[80] sm:hidden">
          <Link href={resultsHref} aria-label="Back to results" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/55 bg-white/90 text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.12)] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35">
            <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      <div aria-hidden="true" className="pointer-events-none fixed right-4 top-[calc(env(safe-area-inset-top)+8px)] z-[80] inline-flex h-11 w-[88px] items-center rounded-[20px] border border-white/55 bg-white/90 shadow-[0_2px_6px_rgba(15,23,42,0.12)] backdrop-blur-md sm:hidden">
        <span className="inline-flex h-11 w-11 translate-x-1 items-center justify-center text-slate-400"><Heart className="h-[17px] w-[17px]" strokeWidth={2} /></span>
        <span className="inline-flex h-11 w-11 -translate-x-1 items-center justify-center text-slate-400"><Share2 className="h-[17px] w-[17px]" strokeWidth={2} /></span>
      </div>
      <div className="mx-auto w-full max-w-[1500px] px-0 sm:px-6 lg:px-8">
        <div role="status" aria-label="Loading flight details" className="grid gap-5 lg:grid-cols-[minmax(0,2.45fr)_minmax(310px,0.95fr)] lg:gap-7">
          <span className="sr-only">Loading flight details</span>
          <div className="overflow-hidden border-b border-slate-200 bg-[#F3F6FA] sm:rounded-[15px] sm:border sm:bg-white">
            <div ref={heroRef} className="relative flex min-h-[318px] flex-col justify-end overflow-hidden bg-[#E2E8F0] px-[18px] pb-[122px] pt-[calc(env(safe-area-inset-top)+64px)] sm:min-h-[280px] sm:block sm:bg-transparent sm:px-6 sm:pb-16 sm:pt-5 lg:min-h-[300px]">
              <Image src={flightDetailsHero} alt="" fill priority sizes="(min-width: 1024px) 68vw, 100vw" className="hidden object-cover sm:block" />
              <div className="absolute inset-0 hidden bg-slate-950/50 sm:block" aria-hidden="true" />
              <div className="relative z-10 hidden items-start justify-between gap-3 sm:flex">
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
              <div className="relative z-10 flex w-full flex-col gap-[3px] sm:absolute sm:inset-x-6 sm:bottom-16 sm:w-2/5">
                <div className="h-8 w-[62%] animate-pulse rounded-lg bg-slate-300 sm:w-full sm:bg-white/35" />
                <div className="h-4 w-[58%] animate-pulse rounded bg-slate-300 sm:hidden" />
              </div>
              <svg data-flight-details-loading-hero-curve aria-hidden="true" viewBox="0 0 100 64" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-[65px] w-full sm:hidden"><path d="M0 12 Q50 64 100 12 L100 64 L0 64 Z" fill="#F3F6FA" /></svg>
            </div>
            <div className="relative z-10 px-[18px] pb-4 pt-0 sm:-mt-7 sm:p-6 sm:pt-0">
            <div ref={itineraryRef} data-mobile-native-itinerary-loading className="-mx-[10px] -mt-[104px] sm:mx-0 sm:mt-0">
              <div className="relative h-[226px] overflow-hidden rounded-[15px] border border-[#E1E7EF] bg-white shadow-[0_6px_18px_rgba(7,19,59,0.14)] sm:rounded-[10px] sm:border-slate-200 sm:bg-slate-100 sm:shadow-lg">
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
            <div className="mt-7 h-[23px] w-[136px] animate-pulse rounded bg-slate-200" />
            <div data-mobile-native-fare-loading className="mt-3 flex gap-[10px] overflow-hidden pb-[18px] pr-[38px] sm:hidden">
              {[0, 1].map((index) => (
                <div key={index} className="relative h-[142px] w-[clamp(197px,calc(197px+(100vw-320px)*0.27),217px)] shrink-0 rounded-[15px] border-[1.5px] border-[#D7E0EC] bg-white px-3 pb-2 pt-1.5 shadow-[0_2px_6px_rgba(7,19,59,0.06)]">
                  <div className="flex justify-center gap-[7px]"><div className="h-6 w-6 animate-pulse rounded-lg bg-slate-200" /><div className="mt-1.5 h-3 w-[72px] animate-pulse rounded bg-slate-200" /></div>
                  <div className="mt-[5px] space-y-[5px]">
                    {[0, 1, 2].map((row) => <div key={row} className="flex items-center gap-[7px]"><div className="h-[14px] w-[14px] shrink-0 animate-pulse rounded-full bg-slate-200" /><div className="h-[10px] flex-1 animate-pulse rounded bg-slate-200" /></div>)}
                  </div>
                  <div className="absolute inset-x-3 bottom-1.5 flex justify-center"><div className="h-4 w-[82px] animate-pulse rounded bg-slate-200" /></div>
                </div>
              ))}
            </div>
            <div className="mt-3 hidden h-40 w-[275px] animate-pulse rounded-[10px] bg-slate-100 sm:block" />
            <div data-mobile-native-info-loading className="mt-3 sm:hidden">
              <div className="-mx-[10px] flex h-12 items-center gap-[22px] overflow-hidden border-b border-[#D8E1EC]">
                {[110, 90, 120, 110].map((width) => <div key={width} className="h-[10px] shrink-0 animate-pulse rounded bg-slate-200" style={{ width }} />)}
              </div>
              <div className="space-y-[17px] px-1 py-[18px]">
                <div className="h-[10px] w-[92%] animate-pulse rounded bg-slate-200" />
                <div className="h-[10px] w-[68%] animate-pulse rounded bg-slate-200" />
                <div className="h-[10px] w-[84%] animate-pulse rounded bg-slate-200" />
              </div>
            </div>
            <div className="mt-6 hidden h-44 animate-pulse rounded-[10px] bg-slate-100 sm:block" />
            </div>
          </div>
          <div className="hidden h-[620px] animate-pulse rounded-[15px] border border-slate-200 bg-white lg:block" />
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex min-h-[88px] items-center justify-between gap-[14px] border-t border-[#D8E1EC] bg-white px-[18px] pb-[max(10px,env(safe-area-inset-bottom))] pt-[11px] shadow-[0_-4px_12px_rgba(7,19,59,0.10)] sm:hidden">
        <div className="min-w-0 max-w-[46%] flex-1 space-y-[5px]">
          <div className="h-[10px] w-[78%] max-w-[124px] animate-pulse rounded bg-slate-200" />
          <div className="h-[27px] w-[88%] max-w-[142px] animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-[45px] min-w-[132px] max-w-[210px] flex-1 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </main>
  );
}
