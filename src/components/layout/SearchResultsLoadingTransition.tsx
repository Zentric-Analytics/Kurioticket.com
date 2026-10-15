"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BrandedLoading } from "@/components/layout/BrandedLoading";
import {
  CarCardSkeleton,
  FlightCardSkeleton,
  HotelCardSkeleton,
  Skeleton,
} from "@/components/ui/Skeleton";

type SearchType = "flight" | "hotel" | "car";

type LoadingSession = {
  routeIdentity: string;
  searchKey: string;
  startedAt: number;
};

type HeaderSlots = {
  desktopSearch: HTMLElement | null;
  mobileSearch: HTMLElement | null;
  mobileFilters: HTMLElement | null;
};

const loadingSessions = new Map<SearchType, LoadingSession>();
const BRANDED_LOADING_DURATION_MS = 8_000;

export function clearSearchResultsLoadingSession(searchType: SearchType, searchKey = "") {
  if (typeof window === "undefined") return;
  const session = loadingSessions.get(searchType);
  if (!session) return;

  const routeIdentity = window.location.pathname + window.location.search;
  if (session.routeIdentity !== routeIdentity) return;
  if (searchKey && session.searchKey && session.searchKey !== searchKey) return;

  loadingSessions.delete(searchType);
}

export function SearchResultsLoadingTransition({
  searchType,
  title,
  messages,
  searchKey = "",
  active = true,
  mobileHeaderProvided = false,
  desktopHeaderProvided = false,
}: {
  searchType: SearchType;
  title?: string;
  messages?: string[];
  summary?: string[];
  searchKey?: string;
  active?: boolean;
  mobileHeaderProvided?: boolean;
  desktopHeaderProvided?: boolean;
}) {
  const [completedIdentity, setCompletedIdentity] = useState<string | null>(null);
  const [headerSlots, setHeaderSlots] = useState<HeaderSlots>({
    desktopSearch: null,
    mobileSearch: null,
    mobileFilters: null,
  });
  const loadingIdentity = searchType + ":" + searchKey;

  useEffect(() => {
    const selectors = searchType === "hotel"
      ? {
          desktopSearch: desktopHeaderProvided ? null : "[data-hotel-results-nav-search]",
          mobileSearch: mobileHeaderProvided ? null : "[data-hotel-results-mobile-nav-search]",
          mobileFilters: mobileHeaderProvided ? null : "[data-hotel-results-mobile-nav-filters]",
        }
      : searchType === "flight"
        ? {
            desktopSearch: desktopHeaderProvided ? null : "[data-flight-results-nav-search]",
            mobileSearch: mobileHeaderProvided ? null : "[data-flight-results-mobile-nav-summary]",
            mobileFilters: mobileHeaderProvided ? null : "[data-flight-results-mobile-nav-filters]",
          }
        : {
            desktopSearch: desktopHeaderProvided ? null : "[data-cars-results-nav-search]",
            mobileSearch: mobileHeaderProvided ? null : "[data-cars-results-mobile-nav-search]",
            mobileFilters: null,
          };

    const frame = window.requestAnimationFrame(() => {
      setHeaderSlots({
        desktopSearch: selectors.desktopSearch
          ? document.querySelector<HTMLElement>(selectors.desktopSearch)
          : null,
        mobileSearch: selectors.mobileSearch
          ? document.querySelector<HTMLElement>(selectors.mobileSearch)
          : null,
        mobileFilters: selectors.mobileFilters
          ? document.querySelector<HTMLElement>(selectors.mobileFilters)
          : null,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [desktopHeaderProvided, mobileHeaderProvided, searchType]);

  useEffect(() => {
    const currentRouteIdentity = window.location.pathname + window.location.search;

    if (!active) {
      clearSearchResultsLoadingSession(searchType, searchKey);
      return;
    }

    const session = loadingSessions.get(searchType);
    const shouldStartNewSession =
      !session ||
      session.routeIdentity !== currentRouteIdentity ||
      (Boolean(searchKey) && Boolean(session.searchKey) && session.searchKey !== searchKey);
    const currentSession: LoadingSession = shouldStartNewSession
      ? { routeIdentity: currentRouteIdentity, searchKey, startedAt: Date.now() }
      : {
          ...session,
          searchKey: searchKey || session.searchKey,
        };
    loadingSessions.set(searchType, currentSession);

    const remainingMs = Math.max(
      0,
      BRANDED_LOADING_DURATION_MS - (Date.now() - currentSession.startedAt),
    );
    const timer = window.setTimeout(() => setCompletedIdentity(loadingIdentity), remainingMs);
    return () => window.clearTimeout(timer);
  }, [active, loadingIdentity, searchKey, searchType]);

  if (active && completedIdentity === loadingIdentity) {
    return (
      <ResultsShell
        searchType={searchType}
        headerSlots={headerSlots}
        mobileHeaderProvided={mobileHeaderProvided}
        desktopHeaderProvided={desktopHeaderProvided}
      />
    );
  }

  return (
    <BrandedLoading
      variant="fullscreen"
      visual="logoPulse"
      showProgress={false}
      searchType={searchType}
      title={title}
      messages={messages}
      className="min-h-[calc(100svh-5rem)] w-full bg-white px-5"
      contentClassName="max-w-md text-center"
    />
  );
}

function ResultsShell({
  searchType,
  headerSlots,
  mobileHeaderProvided,
  desktopHeaderProvided,
}: {
  searchType: SearchType;
  headerSlots: HeaderSlots;
  mobileHeaderProvided: boolean;
  desktopHeaderProvided: boolean;
}) {
  return (
    <>
      {headerSlots.desktopSearch && !desktopHeaderProvided
        ? createPortal(<HeaderSearchSkeleton searchType={searchType} />, headerSlots.desktopSearch)
        : null}
      {headerSlots.mobileSearch && !mobileHeaderProvided
        ? createPortal(<MobileSearchSkeleton searchType={searchType} />, headerSlots.mobileSearch)
        : null}
      {headerSlots.mobileFilters && !mobileHeaderProvided
        ? createPortal(<MobileFiltersSkeleton />, headerSlots.mobileFilters)
        : null}
      {searchType === "hotel" ? <HotelResultsShell /> : null}
      {searchType === "flight" ? <FlightResultsShell /> : null}
      {searchType === "car" ? <CarResultsShell /> : null}
    </>
  );
}

function HeaderSearchSkeleton({ searchType }: { searchType: SearchType }) {
  const fieldCount = searchType === "hotel" ? 3 : 4;

  return (
    <div
      aria-hidden="true"
      className={`mx-auto grid h-10 w-full min-w-0 items-center gap-1 ${
        searchType === "hotel"
          ? "grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_40px]"
          : "grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.7fr)_40px]"
      }`}
    >
      {Array.from({ length: fieldCount }, (_, index) => (
        <div
          key={index}
          className="flex h-10 min-w-0 items-center border-e border-[#E2E8F0] bg-[#F8FAFC] px-2.5 last:border-e-0"
        >
          <Skeleton className="h-3 w-[72%] rounded-sm bg-slate-200" />
        </div>
      ))}
      <Skeleton className="h-9 w-9 rounded-lg bg-slate-200" />
    </div>
  );
}

function MobileSearchSkeleton({ searchType }: { searchType: SearchType }) {
  return (
    <div aria-hidden="true" className="flex h-full w-full min-w-0 items-center gap-3 px-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className={searchType === "car" ? "h-3.5 w-3/4" : "h-3.5 w-2/3"} />
        <Skeleton className="h-2.5 w-4/5" />
      </div>
      <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
    </div>
  );
}

function MobileFiltersSkeleton() {
  return (
    <div aria-hidden="true" className="scrollbar-hide flex w-full min-w-0 gap-1.5 overflow-hidden px-3 py-2">
      {[82, 72, 72, 94, 108].map((width, index) => (
        <div key={index} className="h-9 shrink-0" style={{ width }}>
          <Skeleton className="h-full w-full rounded-[9px] border border-[#D8E1EC] bg-white" />
        </div>
      ))}
    </div>
  );
}

function HotelResultsShell() {
  return (
    <main
      className="min-h-[calc(100svh-5rem)] w-full flex-1 bg-[#F5F7FB] pb-2 sm:bg-[#f6f8fb] sm:pb-8 lg:bg-white"
      role="status"
      aria-label="Loading hotel results"
      aria-busy="true"
    >
      <div aria-hidden="true" className="hidden bg-[#f6f8fb] pb-1 pt-5 sm:block lg:hidden">
        <div className="page-shell">
          <div className="h-[58px] rounded-xl border border-[#CFD9E5] bg-white p-2 shadow-sm">
            <div className="grid h-full grid-cols-[1.2fr_1fr_1fr_42px] gap-1">
              {[0, 1, 2].map((index) => <Skeleton key={index} className="h-full rounded-md bg-slate-100" />)}
              <Skeleton className="h-full rounded-md bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
      <div className="page-shell grid min-w-0 gap-y-3 pb-2 pt-0 max-sm:w-[calc(100%-24px)] sm:gap-y-5 sm:pb-6 sm:pt-6 min-[1200px]:grid-cols-[288px_minmax(0,1fr)] min-[1200px]:gap-x-8">
        <aside aria-hidden="true" className="relative hidden w-[260px] justify-self-end space-y-4 min-[1200px]:block">
          <Skeleton className="h-[176px] w-full rounded-xl bg-slate-200" />
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <Skeleton className="h-5 w-24" />
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="space-y-2 border-t border-slate-100 pt-3">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-full bg-slate-100" />
                <Skeleton className="h-3 w-4/5 bg-slate-100" />
              </div>
            ))}
          </div>
        </aside>
        <section className="min-w-0 space-y-2 sm:space-y-4">
          <div aria-hidden="true" className="flex items-center justify-between gap-3 py-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-[38px] w-[116px] rounded-[10px] sm:w-28" />
          </div>
          <div className="space-y-2 sm:space-y-4">
            {[0, 1, 2, 3].map((index) => <HotelCardSkeleton key={index} />)}
          </div>
        </section>
      </div>
    </main>
  );
}

function FlightResultsShell() {
  return (
    <main
      data-flight-results-main
      className="min-h-[calc(100svh-5rem)] flex-1 bg-[#F5F7FB] pb-0 sm:bg-[#F3F6FA] sm:pb-8 lg:bg-white"
      role="status"
      aria-label="Loading flight results"
      aria-busy="true"
    >
      <div className="flight-results-grid grid gap-x-6 gap-y-4 pb-5 pt-3 lg:gap-x-9 lg:pt-4">
        <aside aria-hidden="true" className="hidden space-y-5 lg:block">
          <Skeleton className="h-6 w-24" />
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="space-y-3 border-t border-slate-200 bg-white px-3 py-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full bg-slate-100" />
              <Skeleton className="h-3 w-4/5 bg-slate-100" />
            </div>
          ))}
        </aside>
        <section className="min-w-0 space-y-3 sm:space-y-4">
          <div aria-hidden="true" className="flex min-h-8 items-center justify-between gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-28 rounded-full" />
          </div>
          <div aria-hidden="true" className="flex gap-2 overflow-hidden sm:grid sm:grid-cols-7">
            {Array.from({ length: 7 }, (_, index) => <Skeleton key={index} className="h-[70px] w-20 shrink-0 rounded-lg sm:w-full" />)}
          </div>
          <div className="space-y-3 sm:space-y-4">
            {[0, 1, 2].map((index) => <FlightCardSkeleton key={index} />)}
          </div>
        </section>
      </div>
    </main>
  );
}

function CarResultsShell() {
  return (
    <div
      className="min-h-[calc(100svh-5rem)] flex-1 bg-[#F5F7FB] pb-8 sm:bg-[#f6f8fb] lg:bg-white"
      role="status"
      aria-label="Loading car results"
      aria-busy="true"
    >
      <div className="mx-auto max-w-[1020px] px-4 py-5 sm:py-6">
        <div aria-hidden="true" className="mb-4 flex gap-2 overflow-hidden sm:hidden">
          {[84, 92, 76, 116].map((width) => (
            <div key={width} className="h-11 shrink-0" style={{ width }}>
              <Skeleton className="h-full w-full rounded-lg border border-slate-200 bg-white" />
            </div>
          ))}
        </div>
        <div className="grid min-w-0 gap-5 lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[236px_minmax(0,1fr)]">
          <aside aria-hidden="true" className="hidden space-y-5 border-r border-slate-200 pr-5 lg:block">
            <Skeleton className="h-6 w-24" />
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="space-y-3 border-t border-slate-200 pt-5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-4/5 bg-slate-100" />
                <Skeleton className="h-4 w-3/5 bg-slate-100" />
              </div>
            ))}
          </aside>
          <section className="min-w-0">
            <div aria-hidden="true" className="mb-4 flex items-center justify-between gap-3">
              <div className="space-y-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-16 bg-slate-100" /></div>
              <Skeleton className="hidden h-9 w-36 sm:block" />
            </div>
            <div className="space-y-4">
              {[0, 1, 2].map((index) => <CarCardSkeleton key={index} desktopSurfaceParity />)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
