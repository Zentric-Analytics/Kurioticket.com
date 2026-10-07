"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Clock3,
  Luggage,
  Leaf,
  Info,
  Heart,
  MinusCircle,
  Plane,
  Share2,
} from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { FlightDetailsLoadingShell } from "@/components/results/flightDetails/FlightDetailsLoadingShell";
import { FlightIdentityMark } from "@/components/results/flightDetails/FlightIdentityMark";
import { MobileNativeFareRail } from "@/components/results/flightDetails/MobileNativeFareRail";
import { MobileNativeFareInformationDeck, type MobileFareInfoTab } from "@/components/results/flightDetails/MobileNativeFareInformationDeck";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { useRegion } from "@/components/region/RegionProvider";
import { canUseOfferAirlineLogo, compactFareTerms, formatItineraryDepartureDate, resolveDealIdentityMark, resolveSegmentCarrierName } from "@/components/results/flightDetails/flightDetailsPresentation";
import { formatDisplayPrice, formatFlightResultCurrency } from "@/lib/currency/formatCurrency";
import type { ExchangeRates } from "@/lib/currency/exchangeRates";
import type {
  FlightDetailsFareChoice,
  FlightDetailsOffer,
  FlightDetailsResponse,
} from "@/lib/flights/flightDetailsContract";
import { flightDetailsRouteLabel } from "@/lib/flights/flightDetailsContract";
import { nativeFlightDealSelection } from "@/lib/flights/nativeFlightDealSelection";
import type { FlightLeg, FlightProviderCondition, FlightSegment } from "@/lib/types";
import { readSavedItemIds, toggleSavedItemId, writeSavedItemIds } from "@/lib/saved-items-local";
import { invalidateSavedFlightsClientCache } from "@/lib/saved-flight-events";
import flightDetailsHero from "../../../../apps/mobile/assets/heroes/flight-details-hero.webp";

type FareTab = MobileFareInfoTab;
const fareTabs: Array<{ id: FareTab; label: string }> = [
  { id: "deals", label: "Compare deals" },
  { id: "details", label: "Fare details" },
  { id: "conditions", label: "Fare conditions" },
  { id: "extras", label: "Optional extras" },
];

export function StandaloneFlightDetails({ id, resultsHref }: { id: string; resultsHref: string }) {
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const detailsQuery = searchParams.toString();
  const { locale, t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const [response, setResponse] = useState<FlightDetailsResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [selectedFareKey, setSelectedFareKey] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [activeTab, setActiveTab] = useState<FareTab>("deals");
  const [selectedDealOfferId, setSelectedDealOfferId] = useState<string | null>(null);
  const [localSavedFlightIds, setLocalSavedFlightIds] = useState<string[]>([]);
  const [savedFlightBackendId, setSavedFlightBackendId] = useState<string | null>(null);
  const [savedFlightPending, setSavedFlightPending] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fareButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const mobileHeroRef = useRef<HTMLDivElement>(null);
  const mobileItineraryRef = useRef<HTMLDivElement>(null);
  const mobileBackControlRef = useRef<HTMLDivElement>(null);
  const [mobileHeaderProtected, setMobileHeaderProtected] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/flights/details?id=${encodeURIComponent(id)}${detailsQuery ? `&${detailsQuery}` : ""}`, {
      signal: controller.signal,
    })
      .then(async (result) => {
        const data = (await result.json()) as FlightDetailsResponse;
        if (!result.ok || data.status !== "available") throw new Error(data.status === "unavailable" ? data.error : "This flight quote is no longer available.");
        return data;
      })
      .then((data) => {
        setResponse(data);
        setError("");
        setSelectedFareKey((current) =>
          data.fareChoices.some((fare) => fare.key === current)
            ? current
            : data.fareChoices.find((fare) => fare.selectedOffer)?.key || data.fareChoices[0]?.key || "",
        );
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "This flight quote is no longer available.");
        }
      });
    return () => controller.abort();
  }, [detailsQuery, id, reloadToken]);

  useEffect(() => {
    if (sessionStatus === "authenticated" || typeof window === "undefined") return;
    setLocalSavedFlightIds(readSavedItemIds());
  }, [sessionStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      if (window.matchMedia("(min-width: 640px)").matches) {
        setMobileHeaderProtected(false);
        return;
      }
      const hero = mobileHeroRef.current;
      const itinerary = mobileItineraryRef.current;
      if (!hero || !itinerary) return;
      const heroTop = hero.getBoundingClientRect().top + window.scrollY;
      const heroHeight = hero.getBoundingClientRect().height;
      const itineraryTop = itinerary.getBoundingClientRect().top + window.scrollY;
      const foregroundOffset = itineraryTop - (heroTop + heroHeight);
      const protectedHeight = (mobileBackControlRef.current?.getBoundingClientRect().bottom ?? 52) + 12;
      const threshold = Math.max(0, heroTop + heroHeight + foregroundOffset - protectedHeight);
      setMobileHeaderProtected(window.scrollY >= threshold);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [response]);

  const available = response?.status === "available" ? response : null;
  const fareChoices = useMemo(() => available?.fareChoices ?? [], [available]);
  const selectedFare = fareChoices.find((fare) => fare.key === selectedFareKey) ?? fareChoices[0];
  const selectedOffer = selectedFare?.offer ?? available?.flight;
  const selectedDeal = selectedFare ? nativeFlightDealSelection(selectedDealOfferId, selectedFare) : null;
  const activeOffer = selectedDeal?.offer ?? selectedOffer;
  const savedFlightKey = selectedOffer?.id ?? id;
  const mobilePricesReady = !currencyRates.isLoading;

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !selectedOffer) {
      setSavedFlightBackendId(null);
      return;
    }

    const controller = new AbortController();
    fetch("/api/dashboard/saved?type=flight", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ items?: Array<{ id: string; payload?: Record<string, unknown> }> }>;
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const matching = data?.items?.find((item) => item.payload?.flightResultId === selectedOffer.id);
        setSavedFlightBackendId(matching?.id ?? null);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [selectedOffer, sessionStatus]);

  useEffect(() => {
    if (!selectedFare) {
      setSelectedDealOfferId(null);
      return;
    }
    setSelectedDealOfferId((current) => nativeFlightDealSelection(current, selectedFare)?.offerId ?? null);
  }, [selectedFare]);



  function selectFare(index: number) {
    const fare = fareChoices[index];
    if (!fare) return;
    setSelectedFareKey(fare.key);
  }

  function handleFareKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    const offset = event.key === "ArrowRight" || event.key === "ArrowDown"
      ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp"
        ? -1
        : 0;
    if (!offset) return;
    event.preventDefault();
    const nextIndex = (index + offset + fareChoices.length) % fareChoices.length;
    selectFare(nextIndex);
    const nextFare = fareButtonRefs.current[nextIndex];
    nextFare?.focus();
    nextFare?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  async function continueToOffer(offerId: string) {
    if (redirecting) return;
    const providerWindow = window.open("about:blank", "_blank");
    if (!providerWindow) {
      setError("Allow pop-ups to open this provider link in a new tab.");
      return;
    }
    providerWindow.opener = null;
    const referrerPolicy = providerWindow.document.createElement("meta");
    referrerPolicy.name = "referrer";
    referrerPolicy.content = "no-referrer";
    providerWindow.document.head.append(referrerPolicy);
    setRedirecting(true);
    setError("");
    try {
      const result = await fetch("/api/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: offerId, type: "flight", sourcePage: "flight_details" }),
      });
      const data = (await result.json()) as { url?: string; error?: string; code?: string };
      if (result.status === 409 && data.code === "offer_changed") {
        if (!providerWindow.closed) providerWindow.close();
        setNotice("The provider updated this offer. Review the refreshed price and fare terms before continuing.");
        setReloadToken((value) => value + 1);
        setRedirecting(false);
        return;
      }
      if (!result.ok || !data.url) throw new Error(data.error || "This provider link is unavailable.");
      providerWindow.location.replace(data.url);
      setRedirecting(false);
    } catch (redirectError) {
      if (!providerWindow.closed) providerWindow.close();
      setError(redirectError instanceof Error ? redirectError.message : "This provider link is unavailable.");
      setRedirecting(false);
    }
  }

  if (!response && !error) return <FlightDetailsSkeleton resultsHref={resultsHref} />;
  if (!available || !selectedOffer || error && !response) return <FlightDetailsUnavailable resultsHref={resultsHref} message={error} />;

  const flight = selectedOffer;
  const legs = flight.legs ?? [];
  const route = flightDetailsRouteLabel(
    available.search.tripType,
    legs,
    flight.originAirport,
    flight.destinationAirport,
  );
  const travelers = readTravelerSummary(available.search, locale, t);
  const tripType = available.search.tripType === "multi-city"
    ? `${t("multiCity")} • ${new Intl.NumberFormat(locale).format(legs.length)} ${t("flights")}`
    : t(available.search.tripType === "round-trip" ? "roundTrip" : "oneWay");
  const tripLine = `${tripType} • ${new Intl.NumberFormat(locale).format(travelers.count)} ${t(travelers.count === 1 ? "deals.travelerSingular" : "deals.travelerPlural")}`;
  const nativeTripType = available.search.tripType === "round-trip" ? "Round-trip" : available.search.tripType === "multi-city" ? "Multi-city" : "One-way";
  const nativeTripLine = `${nativeTripType} · ${available.search.travelers} traveler${available.search.travelers === 1 ? "" : "s"} · ${titleCase(available.search.cabinClass)}`;
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = (index + offset + fareTabs.length) % fareTabs.length;
    setActiveTab(fareTabs[next].id);
    tabRefs.current[next]?.focus();
  };

  async function toggleSavedFlight() {
    if (!selectedOffer || savedFlightPending) return;
    setSavedFlightPending(true);

    try {
      if (sessionStatus === "authenticated") {
        if (savedFlightBackendId) {
          const response = await fetch("/api/dashboard/saved", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ type: "flight", id: savedFlightBackendId }),
          });
          if (response.ok) { setSavedFlightBackendId(null); invalidateSavedFlightsClientCache(); }
          return;
        }

        const response = await fetch("/api/dashboard/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            type: "flight",
            provider: selectedOffer.provider,
            airlineName: selectedOffer.airlineName,
            flightNumber: selectedOffer.flightNumber ?? null,
            originAirport: selectedOffer.originAirport,
            destinationAirport: selectedOffer.destinationAirport,
            departureTime: selectedOffer.departureTime,
            arrivalTime: selectedOffer.arrivalTime,
            price: selectedOffer.price,
            currency: selectedOffer.currency,
            payload: {
              flightResultId: selectedOffer.id,
              detailsHref: window.location.pathname + window.location.search,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json() as { item?: { id?: string } };
          setSavedFlightBackendId(data.item?.id ?? selectedOffer.id);
          invalidateSavedFlightsClientCache();
        } else if (response.status === 409) {
          const existing = await fetch("/api/dashboard/saved?type=flight", {
            headers: { Accept: "application/json" },
          });
          if (existing.ok) {
            const data = await existing.json() as { items?: Array<{ id: string; payload?: Record<string, unknown> }> };
            const matching = data.items?.find((item) => item.payload?.flightResultId === selectedOffer.id);
            if (matching) { setSavedFlightBackendId(matching.id); invalidateSavedFlightsClientCache(); }
          }
        }
        return;
      }

      setLocalSavedFlightIds((current) => {
        const next = toggleSavedItemId(current, savedFlightKey);
        writeSavedItemIds(next);
        return next;
      });
    } finally {
      setSavedFlightPending(false);
    }
  }

  async function shareFlight() {
    const url = window.location.href;
    const shareData = {
      title: route,
      text: `${route} · ${tripLine}`,
      url,
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(url);
        setShareFeedback("Flight link copied");
        window.setTimeout(() => setShareFeedback(""), 1800);
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
      setShareFeedback("Unable to share this flight");
      window.setTimeout(() => setShareFeedback(""), 1800);
    }
  }

  const flightSaved = sessionStatus === "authenticated"
    ? Boolean(savedFlightBackendId)
    : localSavedFlightIds.includes(savedFlightKey);

  return (
    <main className="flex-1 bg-[#F3F6FA] pb-[calc(1.75rem+env(safe-area-inset-bottom))] text-[#142033] sm:bg-[#F7F9FC] sm:pb-16 sm:pt-4 lg:pt-3">
      <div aria-hidden="true" className={`pointer-events-none fixed inset-x-0 top-0 z-[70] h-[calc(env(safe-area-inset-top)+64px)] transition-colors sm:hidden ${mobileHeaderProtected ? "bg-[#F3F6FA]" : "bg-transparent"}`} />
      <div ref={mobileBackControlRef} className="fixed left-4 top-[calc(env(safe-area-inset-top)+8px)] z-[80] sm:hidden">
        <Link href={resultsHref} aria-label="Back to results" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/55 bg-white/90 text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.12)] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35">
          <ArrowLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <div data-flight-details-mobile-floating-actions className="fixed right-4 top-[calc(env(safe-area-inset-top)+8px)] z-[80] inline-flex h-11 w-[88px] items-center rounded-[20px] border border-white/55 bg-white/90 shadow-[0_2px_6px_rgba(15,23,42,0.12)] backdrop-blur-md sm:hidden">
        <button type="button" aria-label={flightSaved ? "Remove saved flight" : "Save flight"} aria-pressed={flightSaved} disabled={savedFlightPending} onClick={() => void toggleSavedFlight()} className="inline-flex h-11 w-11 items-center justify-center rounded-l-[20px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#075EE8]/35 disabled:cursor-wait disabled:opacity-60">
          <Heart className="h-[17px] w-[17px] translate-x-1" strokeWidth={2} fill={flightSaved ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <button type="button" aria-label="Share flight" onClick={() => void shareFlight()} className="inline-flex h-11 w-11 items-center justify-center rounded-r-[20px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#075EE8]/35">
          <Share2 className="h-[17px] w-[17px] -translate-x-1" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">{shareFeedback}</span>
      <div className="mx-auto w-full max-w-[1080px] px-0 sm:px-6 lg:px-[30px]">
        <div className="min-w-0">
          <section className="min-w-0 border-b border-[#E2E8F0] bg-[#F3F6FA] sm:rounded-[13px] sm:border sm:bg-white sm:shadow-[0_3px_15px_rgba(15,23,42,0.045)]" aria-labelledby="flight-details-heading">
            <div ref={mobileHeroRef} data-testid="flight-details-hero" className="relative flex min-h-[318px] flex-col justify-end overflow-hidden px-[18px] pb-[122px] pt-[calc(env(safe-area-inset-top)+64px)] sm:min-h-[280px] sm:justify-end sm:rounded-t-[12px] sm:px-6 sm:pb-14 sm:pt-5 lg:min-h-[300px]">
              <Image src={flightDetailsHero} alt="" fill priority sizes="(min-width: 1024px) 68vw, 100vw" className="object-cover" />
              <div
                data-flight-details-desktop-navigation
                className="pointer-events-none absolute inset-x-0 top-0 z-20 hidden items-start justify-between p-4 sm:flex lg:p-5"
              >
                <Link
                  href={resultsHref}
                  aria-label="Back to flight results"
                  className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/55 bg-white/90 text-[#07133B] shadow-[0_2px_8px_rgba(15,23,42,0.14)] backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                </Link>
                <div data-flight-details-desktop-actions className="pointer-events-auto flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label={flightSaved ? "Remove saved flight" : "Save flight"}
                    aria-pressed={flightSaved}
                    disabled={savedFlightPending}
                    onClick={() => void toggleSavedFlight()}
                    className={`inline-flex size-11 items-center justify-center rounded-full border border-white/55 bg-white/90 shadow-[0_2px_8px_rgba(15,23,42,0.14)] backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-wait disabled:opacity-60 ${flightSaved ? "text-[#075EE8]" : "text-[#07133B]"}`}
                  >
                    <Heart className="h-5 w-5" strokeWidth={2} fill={flightSaved ? "currentColor" : "none"} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Share flight"
                    onClick={() => void shareFlight()}
                    className="inline-flex size-11 items-center justify-center rounded-full border border-white/55 bg-white/90 text-[#07133B] shadow-[0_2px_8px_rgba(15,23,42,0.14)] backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  >
                    <Share2 className="h-[19px] w-[19px]" strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="absolute inset-0 bg-[rgba(5,13,26,0.30)]" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-[66px] h-[150px] bg-gradient-to-b from-transparent via-[rgba(5,13,26,0.18)] to-[rgba(5,13,26,0.42)] sm:bottom-0 sm:h-3/4 sm:bg-gradient-to-t sm:from-slate-950/80 sm:via-slate-950/35 sm:to-transparent" aria-hidden="true" />
              <div className="relative z-10 min-w-0 text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]">
                <h1 ref={headingRef} id="flight-details-heading" tabIndex={-1} className="text-[27px] font-extrabold leading-[1.12] tracking-[-0.025em] outline-none sm:text-[30px]">{route}</h1>
                <p className="mt-[3px] text-[11px] font-bold uppercase leading-4 tracking-[0.55px] text-white/95 sm:mt-2 sm:text-[13px] sm:leading-normal sm:tracking-[0.08em]"><span className="sm:hidden">{nativeTripLine}</span><span className="hidden sm:inline">{tripLine}</span></p>
              </div>
              <svg data-flight-details-hero-curve aria-hidden="true" viewBox="0 0 100 64" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-[-1px] h-[65px] w-full sm:hidden"><path d="M0 12 Q50 64 100 12 L100 64 L0 64 Z" fill="#F3F6FA" /></svg>
            </div>
            <div className="relative z-10 px-[18px] pb-4 pt-0 sm:-mt-7 sm:p-6 sm:pt-0 lg:px-6 lg:pb-6">
            <div ref={mobileItineraryRef} data-mobile-native-itinerary-stack className="-mx-[10px] -mt-[104px] space-y-[14px] sm:mx-0 sm:mt-0 sm:space-y-4">{legs.map((leg, index) => <ItineraryCard key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}`} leg={leg} label={available.search.tripType === "multi-city" ? `FLIGHT ${index + 1}` : index === 0 ? "OUTBOUND" : "RETURN"} departureDate={available.search.legs[index]?.departureDate ?? leg.departureTime.slice(0, 10)} locale={locale} offerAirlineName={flight.airlineName} offerAirlineLogo={flight.airlineLogo} />)}</div>

            <h2 className="mb-0 mt-6 text-[16px] font-medium leading-[21px] tracking-[-0.15px] text-[#1A1A1A] sm:mb-3 sm:text-[18px] sm:font-medium sm:leading-tight sm:tracking-normal sm:text-slate-950">Pick your fare</h2>
            {mobilePricesReady ? <MobileNativeFareRail fares={fareChoices} selectedFareKey={selectedFare?.key ?? ""} tripType={available.search.tripType} selectedCurrency={selectedOption.currency} currencyRates={currencyRates.rates} isFallbackRate={currencyRates.isFallback} onSelect={selectFare} /> : <div data-mobile-native-fare-price-loading role="progressbar" aria-label="Loading fare prices" aria-busy="true" className="flex gap-[10px] overflow-hidden pb-[18px] pt-3 pr-[38px] sm:hidden">{fareChoices.slice(0,2).map((fare)=><div key={fare.key} className="relative h-[142px] w-[clamp(197px,calc(197px+(100vw-320px)*0.27),217px)] shrink-0 rounded-[15px] border-[1.5px] border-[#D7E0EC] bg-white px-3 pb-2 pt-1.5 shadow-[0_2px_6px_rgba(7,19,59,0.06)]"><div className="flex justify-center gap-[7px]"><div className="h-6 w-6 animate-pulse rounded-lg bg-slate-200"/><div className="mt-1.5 h-3 w-[72px] animate-pulse rounded bg-slate-200"/></div><div className="mt-[5px] space-y-[5px]">{[0,1,2].map((row)=><div key={row} className="flex items-center gap-[7px]"><div className="h-[14px] w-[14px] shrink-0 animate-pulse rounded-full bg-slate-200"/><div className="h-[10px] flex-1 animate-pulse rounded bg-slate-200"/></div>)}</div><div className="absolute inset-x-3 bottom-1.5 flex justify-center"><div className="h-4 w-[82px] animate-pulse rounded bg-slate-200"/></div></div>)}</div>}
            {mobilePricesReady ? <div role="radiogroup" aria-label="Available fares" data-desktop-fare-rail className="hidden min-w-0 gap-3 overflow-x-auto overscroll-x-contain pb-3 pr-6 sm:flex sm:snap-x sm:snap-mandatory [scrollbar-width:thin]">
              {fareChoices.map((fare, index) => {
                const selected = fare.key === selectedFare?.key;
                const price = formatDisplayPrice({ amount: fare.offer.price, sourceCurrency: fare.offer.currency, displayCurrency: selectedOption.currency, convertSourceEstimate: true, useFlightResultSymbols: true, maximumFractionDigits: 0, rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback });
                const compactTerms = compactFareTerms(fare.distinguishingTerms, available.search.tripType)
                  .filter(({ text }) => !/^(?:base|total)\s+price\s*·\s*(?:display\s+)?price\s*:/i.test(text.trim()))
                  .map((row) => ({ ...row, text: formatDesktopCompactFareBenefit(row.text) }));
                return <button data-desktop-fare-card data-empty-benefits={!compactTerms.length || undefined} key={fare.key} ref={(element) => { fareButtonRefs.current[index] = element; }} type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1} onClick={() => selectFare(index)} onKeyDown={(event) => handleFareKeyDown(event, index)} className={`relative h-[150px] w-[250px] min-w-[250px] shrink-0 snap-start rounded-[15px] border-[1.5px] px-3 pb-2 pt-2 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/40 ${selected ? "border-[#075EE8] bg-[#075EE8]/[0.025] shadow-[0_6px_16px_rgba(7,19,59,0.16)]" : "border-[#D7E0EC] bg-white shadow-[0_2px_7px_rgba(7,19,59,0.07)] hover:border-[#B9C8DA] hover:shadow-[0_4px_11px_rgba(7,19,59,0.11)]"}`}>
                  {compactTerms.length ? (
                    <>
                      <div data-desktop-fare-content className="min-w-0 pb-14">
                        <div data-desktop-fare-identity className="mx-auto flex max-w-full items-center justify-center gap-[7px]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#CFE3FA] bg-[#EAF3FF] text-[#075EE8]"><Luggage className="h-3.5 w-3.5" aria-hidden="true" /></span><p className="min-w-0 max-w-full line-clamp-2 text-[13px] font-bold leading-[17px] tracking-[0.1px] text-slate-950">{fare.label}</p></div>
                        <ul data-desktop-fare-benefits className="mt-1 space-y-1">{compactTerms.map(({ term, text }, termIndex) => <FareTerm key={`${term.category}-${term.legDirection || "trip"}-${term.text}-${termIndex}`} term={term} text={text} compact />)}</ul>
                      </div>
                      <div data-desktop-fare-price className="absolute inset-x-3 bottom-2 flex min-h-12 min-w-0 items-end justify-center"><p className="max-w-full break-words text-center text-[19px] font-semibold leading-6 tabular-nums text-slate-950 [overflow-wrap:anywhere]" aria-label={price.ariaLabel}>{price.formatted}</p></div>
                    </>
                  ) : (
                    <div data-desktop-fare-empty-benefits className="flex h-full min-w-0 flex-col items-center justify-center gap-5 pb-1">
                      <div data-desktop-fare-identity className="flex max-w-full items-center justify-center gap-[7px]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#CFE3FA] bg-[#EAF3FF] text-[#075EE8]"><Luggage className="h-3.5 w-3.5" aria-hidden="true" /></span><p className="min-w-0 max-w-full line-clamp-2 text-[13px] font-bold leading-[17px] tracking-[0.1px] text-slate-950">{fare.label}</p></div>
                      <div data-desktop-fare-price className="flex min-w-0 justify-center"><p className="max-w-full break-words text-center text-[19px] font-semibold leading-6 tabular-nums text-slate-950 [overflow-wrap:anywhere]" aria-label={price.ariaLabel}>{price.formatted}</p></div>
                    </div>
                  )}
                </button>;
              })}
            </div> : <div data-desktop-fare-price-loading role="status" aria-label="Loading fare prices" aria-busy="true" className="hidden min-w-0 gap-3 overflow-hidden pb-3 pr-6 sm:flex">{fareChoices.map((fare)=><div data-desktop-fare-loading-card key={fare.key} className="relative h-[150px] w-[250px] min-w-[250px] shrink-0 rounded-[15px] border-[1.5px] border-[#D7E0EC] bg-white px-3 pb-2 pt-2 shadow-[0_2px_7px_rgba(7,19,59,0.07)]"><div className="min-w-0 pb-14"><div className="flex max-w-full items-center justify-center gap-[7px]"><div className="h-6 w-6 shrink-0 animate-pulse rounded-lg bg-slate-200 motion-reduce:animate-none" /><div className="h-3 w-[72px] max-w-[60%] animate-pulse rounded bg-slate-200 motion-reduce:animate-none" /></div><div className="mt-[5px] space-y-[5px]">{[0,1,2].map((row)=><div key={row} className="flex min-w-0 items-center gap-[7px]"><div className="h-[14px] w-[14px] shrink-0 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" /><div className="h-[10px] flex-1 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" /></div>)}</div></div><div data-desktop-fare-loading-price className="absolute inset-x-3 bottom-2 flex min-h-12 items-end justify-center"><div className="h-5 w-[82px] animate-pulse rounded bg-slate-200 motion-reduce:animate-none" /></div></div>)}</div>}

            {error || notice ? (
              <p
                role={error ? "alert" : "status"}
                className={`mt-2 rounded-lg px-3 py-2 text-[12px] font-medium sm:hidden ${error ? "bg-red-50 text-red-700" : "bg-blue-50 text-[#075EE8]"}`}
              >
                {error || notice}
              </p>
            ) : null}
            <MobileNativeFareInformationDeck
              activeTab={activeTab}
              onTabChange={setActiveTab}
              fare={selectedFare}
              activeOffer={activeOffer}
              selectedDealOfferId={selectedDeal?.offerId ?? null}
              onSelectDeal={setSelectedDealOfferId}
              selectedCurrency={selectedOption.currency}
              currencyRates={currencyRates.rates}
              isFallbackRate={currencyRates.isFallback}
              locale={locale}
              pricesReady={mobilePricesReady}
              redirecting={redirecting}
              onViewDeal={continueToOffer}
            />
            <div data-desktop-fare-information-tabs className="mt-5 hidden min-w-0 sm:flex lg:sticky lg:top-0 lg:z-40 lg:border-b lg:border-slate-200 lg:bg-white" role="tablist" aria-label="Fare information">{fareTabs.map((tab, index) => <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} id={`fare-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`fare-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`min-h-11 flex-1 whitespace-nowrap border-b-[3px] px-1 text-center text-sm font-semibold text-[#536B92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#075EE8]/35 ${activeTab === tab.id ? "border-[#075EE8]" : "border-transparent"}`}>{tab.label}</button>)}</div>
            <div className="hidden sm:block">
              {error || notice ? (
                <p
                  role={error ? "alert" : "status"}
                  className={`mt-4 rounded-lg px-3 py-2 text-sm font-medium ${error ? "bg-red-50 text-red-700" : "bg-blue-50 text-[#075EE8]"}`}
                >
                  {error || notice}
                </p>
              ) : null}
              <FarePanel activeTab={activeTab} fare={selectedFare} offer={activeOffer} locale={locale} selectedCurrency={selectedOption.currency} currencyRates={currencyRates.rates} isFallbackRate={currencyRates.isFallback} redirecting={redirecting} selectedDealOfferId={selectedDeal?.offerId ?? null} onSelectDeal={setSelectedDealOfferId} onViewDeal={continueToOffer} />
            </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function formatDesktopCompactFareBenefit(text: string) {
  const normalized = text.trim().replace(/\.$/, "");
  const scoped = normalized.match(/^(Outbound|Return|Flight \d+):\s*(.+)$/i);
  const scope = scoped?.[1];
  const body = scoped?.[2] ?? normalized;
  const withScope = (value: string) => (scope ? `${scope} · ${value}` : value);

  if (/^baggage details not supplied by (?:the )?provider$/i.test(body)) {
    return withScope("Baggage not provided");
  }

  if (/^baggage allowance not supplied for one or more passengers$/i.test(body)) {
    return withScope("Baggage not provided");
  }

  if (/^no additional comparable fare benefits were supplied by (?:the )?provider$/i.test(body)) {
    return withScope("No additional fare benefits");
  }

  const unavailableRules = body.match(
    /^(Change(?:s)?(?: and refund)?|Refunds?) rules? not supplied by (?:the )?provider$/i,
  );
  if (unavailableRules) {
    const ruleKind = unavailableRules[1].toLocaleLowerCase("en-US");
    const label = /change(?:s)? and refund/.test(ruleKind)
      ? "Change/refund rules unavailable"
      : /refund/.test(ruleKind)
        ? "Refund rules unavailable"
        : "Change rules unavailable";
    return withScope(label);
  }

  if (/^changes not supplied by (?:the )?provider$/i.test(body)) {
    return withScope("Changes unavailable");
  }

  if (/^refunds? not supplied by (?:the )?provider$/i.test(body)) {
    return withScope("Refunds unavailable");
  }

  if (/^changes not allowed(?: before departure)?$/i.test(body)) {
    return withScope("Changes not allowed");
  }

  if (/^changes allowed(?: before departure)?$/i.test(body)) {
    return withScope("Changes allowed");
  }

  const changeFee = body.match(
    /^Changes allowed with\s+([A-Z]{3})\s+([\d,]+(?:\.\d+)?)\s+penalty$/i,
  );
  if (changeFee) {
    return withScope(
      `Changes · ${changeFee[1].toUpperCase()} ${compactFareFeeAmount(changeFee[2])} fee`,
    );
  }

  if (/^not refundable(?: before departure)?$/i.test(body)) {
    return withScope("Not refundable");
  }

  if (/^refundable(?: before departure)?$/i.test(body)) {
    return withScope("Refundable");
  }

  const refundFee = body.match(
    /^Refundable(?: before departure)? with\s+([A-Z]{3})\s+([\d,]+(?:\.\d+)?)\s+penalty$/i,
  );
  if (refundFee) {
    return withScope(
      `Refundable · ${refundFee[1].toUpperCase()} ${compactFareFeeAmount(refundFee[2])} fee`,
    );
  }

  const baggage = body.match(
    /^(\d+)\s+(carry-ons?|checked bags?)\s+included(?:\s+(each way))?$/i,
  );
  if (baggage) {
    const count = Number(baggage[1]);
    const kind = baggage[2].toLocaleLowerCase("en-US");
    const eachWay = Boolean(baggage[3]);
    const suffix = eachWay ? " each way" : "";

    if (count === 1 && kind.startsWith("carry")) {
      return withScope(`Carry-on included${suffix}`);
    }
    if (count === 1 && kind.startsWith("checked")) {
      return withScope(`Checked bag included${suffix}`);
    }
    return withScope(`${count} ${kind} included${suffix}`);
  }

  return withScope(body);
}

function compactFareFeeAmount(value: string) {
  const [whole, fraction] = value.split(".");
  if (!fraction || /^0+$/.test(fraction)) return whole;
  return `${whole}.${fraction.replace(/0+$/, "")}`;
}

const PROVIDER_LOCAL_ISO_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-](\d{2}):(\d{2}))?)?$/;

function providerLocalCalendarDay(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const match = PROVIDER_LOCAL_ISO_DATETIME.exec(value.trim());
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0", offsetHourText, offsetMinuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText ?? 0);
  const minute = Number(minuteText ?? 0);
  const second = Number(secondText);
  const offsetHour = Number(offsetHourText ?? 0);
  const offsetMinute = Number(offsetMinuteText ?? 0);
  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 23 || offsetMinute > 59) return null;
  const calendarDay = Date.UTC(year, month - 1, day);
  const validated = new Date(calendarDay);
  if (validated.getUTCFullYear() !== year || validated.getUTCMonth() !== month - 1 || validated.getUTCDate() !== day) return null;
  return calendarDay;
}

function providerLocalFlightDate(value: string | null | undefined, locale: string): string | null {
  const calendarDay = providerLocalCalendarDay(value);
  if (calendarDay === null) return null;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(calendarDay));
}

function providerLocalFlightDateLong(value: string | null | undefined, locale: string): string | null {
  const calendarDay = providerLocalCalendarDay(value);
  if (calendarDay === null) return null;
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(calendarDay));
}

function NativeFlightGlyph({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 13 7.5-2.5L8 4l2-1 5 6 5-1.5c1.5-.4 2.4.2 2.6 1 .2.9-.6 1.7-1.8 2.2L15 13l-2 7-2 .7.2-6L5 17l-2-4Z" /></svg>;
}

function ItineraryCard({ leg, label, departureDate, locale, offerAirlineName, offerAirlineLogo }: { leg: FlightLeg; label: string; departureDate: string; locale: string; offerAirlineName: string; offerAirlineLogo?: string | null }) {
  const departurePoint = leg.segments[0]?.originDetails;
  const arrivalPoint = leg.segments.at(-1)?.destinationDetails;
  const airportName = (point: typeof departurePoint, fallback: string) => point?.name ?? point?.cityName ?? point?.iataCode ?? fallback;
  const stopStatus = leg.stops === 0 ? "Non-stop" : `${leg.stops} ${leg.stops === 1 ? "stop" : "stops"}`;
  const departureLongDate = providerLocalFlightDateLong(leg.departureTime, locale) ?? formatItineraryDepartureDate(departureDate, locale);
  const departureShortDate = providerLocalFlightDate(leg.departureTime, locale);
  const arrivalShortDate = providerLocalFlightDate(leg.arrivalTime, locale);
  const departureTimeZone = departurePoint?.timeZone;
  const arrivalTimeZone = arrivalPoint?.timeZone;
  const hasFlightInfo = Boolean(departureTimeZone || arrivalTimeZone);
  const layoverLabel = (airport: string) => {
    const point = leg.segments
      .flatMap((segment) => [segment.destinationDetails, segment.originDetails])
      .find((candidate) => candidate?.iataCode === airport);
    return point?.cityName && point.cityName !== airport ? `${point.cityName} • ${airport}` : airport;
  };

  return <>
    <section
      data-mobile-native-itinerary-card
      className="relative overflow-hidden rounded-[15px] border border-[#E1E7EF] bg-white p-[15px] shadow-[0_6px_18px_rgba(7,19,59,0.14)] sm:hidden"
      aria-labelledby={`${label.toLowerCase()}-mobile-heading`}
    >
      <div
        data-flight-details-itinerary-gloss
        className="pointer-events-none absolute inset-x-0 top-0 h-[52%] overflow-hidden rounded-t-[15px] bg-[linear-gradient(135deg,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.18)_46%,rgba(255,255,255,0)_100%)]"
        aria-hidden="true"
      />
      <div className="relative z-[1]">
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${label.toLowerCase()}-mobile-heading`} className="min-w-0 shrink text-[11px] font-extrabold uppercase leading-[15px] tracking-[0.5px] text-[#075EE8]">{label}</h2>
          <time dateTime={leg.departureTime} className="shrink-0 whitespace-nowrap text-right text-[11px] font-medium leading-[15px] text-[#536B92]">{departureLongDate}</time>
        </div>

        <div className="mt-[14px] grid grid-cols-[1.1fr_.8fr_1.1fr] items-center gap-2">
          <div className="min-w-0">
            <p className="whitespace-nowrap text-[19px] font-extrabold leading-6 tabular-nums text-[#142033]">{formatTime(leg.departureTime, locale)}</p>
            <p className="mt-[3px] text-[13px] font-bold leading-[17px] text-[#142033]">{leg.originAirport}</p>
            {departureShortDate ? <p className="mt-px whitespace-nowrap text-[9.5px] font-medium leading-3 text-[#536B92]">{departureShortDate}</p> : null}
          </div>

          <div className="min-w-[72px] text-center">
            <p className="text-[11px] font-semibold leading-4 text-[#536B92]">{leg.duration}</p>
            <div className="mt-[5px] flex items-center" aria-hidden="true">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#075EE8]" />
              <span className="h-px min-w-1 flex-1 bg-[#94A3B8]/60" />
              <NativeFlightGlyph className="h-4 w-4 shrink-0 text-[#075EE8]" />
              <span className="h-px min-w-1 flex-1 bg-[#94A3B8]/60" />
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#075EE8]" />
            </div>
            <p className="mt-[5px] text-[10px] font-medium leading-[13px] text-[#536B92]">{stopStatus}</p>
          </div>

          <div className="min-w-0 text-right">
            <p className="whitespace-nowrap text-[19px] font-extrabold leading-6 tabular-nums text-[#142033]">{formatTime(leg.arrivalTime, locale)}</p>
            <p className="mt-[3px] text-[13px] font-bold leading-[17px] text-[#142033]">{leg.destinationAirport}</p>
            {arrivalShortDate ? <p className="mt-px whitespace-nowrap text-[9.5px] font-medium leading-3 text-[#536B92]">{arrivalShortDate}</p> : null}
          </div>
        </div>

        <div className="mt-[13px] grid grid-cols-2 items-start gap-5">
          <div className="min-w-0">
            <p className="text-[12px] font-medium leading-[17px] text-[#142033]">{airportName(departurePoint, leg.originAirport)}</p>
            {departurePoint?.terminal ? <p className="mt-[5px] text-[11px] font-normal leading-4 text-[#536B92]">Terminal {departurePoint.terminal}</p> : null}
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[12px] font-medium leading-[17px] text-[#142033]">{airportName(arrivalPoint, leg.destinationAirport)}</p>
            {arrivalPoint?.terminal ? <p className="mt-[5px] text-[11px] font-normal leading-4 text-[#536B92]">Terminal {arrivalPoint.terminal}</p> : null}
          </div>
        </div>

        <div className="my-[13px] h-px bg-[#E2E8F0]" />

        <ol>
          {leg.segments.map((segment, index) => {
            const carrier = resolveSegmentCarrierName(segment, offerAirlineName);
            const flightNumber = segment.marketingFlightNumber ?? segment.flightNumber;
            const operatingDiffers = Boolean(segment.operatingCarrier && (segment.operatingCarrier.name !== segment.marketingCarrier?.name || segment.operatingFlightNumber !== segment.marketingFlightNumber));
            const aircraftName = segment.aircraft?.name?.trim() || segment.aircraft?.iataCode?.trim();
            const aircraftSuffix = segment.aircraft?.name?.trim() && segment.aircraft?.iataCode?.trim() ? ` (${segment.aircraft.iataCode.trim()})` : "";
            const layover = index > 0 ? leg.layovers[index - 1] : undefined;
            return <li key={`${segment.originAirport}-${segment.destinationAirport}-${segment.departureTime}-${index}`}>
              {layover ? (
                <div data-flight-details-connection-row className="mb-0.5 flex items-center gap-[7px] rounded-[9px] border border-[#D6E2F0] bg-[#F3F7FC] px-[11px] py-2">
                  <Clock3 className="h-[13px] w-[13px] shrink-0 text-[#5D7496]" strokeWidth={1.8} aria-hidden="true" />
                  <p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-4 text-[#142033]">
                    Connection at {layoverLabel(layover.airport)}
                    <span className="font-medium text-[#536B92]"> · {layover.duration}</span>
                  </p>
                </div>
              ) : null}
              <div className="flex items-start gap-[10px] py-[9px]">
                <SegmentAirlineMark segment={segment} offerAirlineName={offerAirlineName} offerAirlineLogo={offerAirlineLogo} preferSegmentLogo />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-[10px]">
                    <p className="min-w-0 shrink text-[13px] font-bold leading-[18px] text-[#142033]">{segment.originAirport} → {segment.destinationAirport}</p>
                    <p className="max-w-[48%] shrink-0 whitespace-nowrap text-right text-[11px] font-semibold leading-4 tabular-nums text-[#142033]">{formatTime(segment.departureTime, locale)} – {formatTime(segment.arrivalTime, locale)}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium leading-4 text-[#536B92]">{carrier || "Carrier not supplied"}{flightNumber ? ` · Flight ${flightNumber}` : ""}</p>
                  {operatingDiffers ? <p className="mt-0.5 text-[11px] font-normal leading-4 text-[#536B92]">Operated by {segment.operatingCarrier?.name}{segment.operatingFlightNumber ? ` · Flight ${segment.operatingFlightNumber}` : ""}</p> : null}
                  {aircraftName ? <p className="mt-0.5 text-[11px] font-normal leading-4 text-[#536B92]">Aircraft: {aircraftName}{aircraftSuffix}</p> : null}
                  {segment.distanceKm !== undefined ? <p className="mt-0.5 text-[11px] font-normal leading-4 text-[#536B92]">Flight distance: {formatDistanceKm(segment.distanceKm, locale)}</p> : null}
                </div>
              </div>
            </li>;
          })}
        </ol>

        {hasFlightInfo ? <>
          <div className="my-[13px] h-px bg-[#E2E8F0]" />
          <div className="space-y-[7px]">
            <p className="mb-0.5 text-[12px] font-bold uppercase leading-4 tracking-[0.65px] text-[#142033]">Flight info</p>
            {departureTimeZone && arrivalTimeZone && departureTimeZone === arrivalTimeZone ? (
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1 text-[11px] font-semibold leading-4 text-[#142033]">Time zone</span>
                <span className="max-w-[52%] text-right text-[11px] font-normal leading-4 text-[#536B92]">{departureTimeZone}</span>
              </div>
            ) : <>
              {departureTimeZone ? <div className="flex items-start justify-between gap-3"><span className="min-w-0 flex-1 text-[11px] font-semibold leading-4 text-[#142033]">Departure time zone</span><span className="max-w-[52%] text-right text-[11px] font-normal leading-4 text-[#536B92]">{departureTimeZone}</span></div> : null}
              {arrivalTimeZone ? <div className="flex items-start justify-between gap-3"><span className="min-w-0 flex-1 text-[11px] font-semibold leading-4 text-[#142033]">Arrival time zone</span><span className="max-w-[52%] text-right text-[11px] font-normal leading-4 text-[#536B92]">{arrivalTimeZone}</span></div> : null}
            </>}
          </div>
        </> : null}
      </div>
    </section>

    <section data-desktop-itinerary-card className="hidden overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white sm:block sm:shadow-[0_6px_18px_rgba(7,19,59,0.10)]" aria-labelledby={`${label.toLowerCase()}-heading`}>
      <div className="flex items-start justify-between gap-3 px-4 pt-4 lg:px-5">
        <h2 id={`${label.toLowerCase()}-heading`} className="min-w-0 text-[11px] font-bold uppercase leading-4 tracking-[0.05em] text-[#075EE8]">{label}</h2>
        <time dateTime={leg.departureTime} className="shrink-0 whitespace-nowrap text-right text-[11px] font-medium leading-4 text-slate-600">{departureLongDate}</time>
      </div>
      <div data-desktop-journey-summary className="grid grid-cols-[minmax(0,1fr)_minmax(120px,180px)_minmax(0,1fr)] items-center gap-6 px-4 pt-3 lg:px-5">
        <AirportTime time={leg.departureTime} airport={leg.originAirport} date={departureShortDate} locale={locale} />
        <div className="min-w-0 text-center">
          <p className="text-[11px] font-semibold leading-4 text-slate-600">{leg.duration}</p>
          <div className="mt-1 flex items-center text-[#075EE8]" aria-hidden="true"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#075EE8]" /><span className="min-w-2 flex-1 border-t border-dashed border-[#075EE8]" /><Plane className="h-4 w-4 shrink-0 rotate-45" /><span className="min-w-2 flex-1 border-t border-dashed border-[#075EE8]" /><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#075EE8]" /></div>
          <p className="mt-1 text-[10px] font-medium leading-[14px] text-slate-600">{formatStops(leg.stops, technicalStopCount(leg))}</p>
        </div>
        <div className="text-right"><AirportTime time={leg.arrivalTime} airport={leg.destinationAirport} date={arrivalShortDate} locale={locale} /></div>
      </div>
      <div data-desktop-airport-details className="mt-3 grid grid-cols-2 items-start gap-8 px-4 pb-3 lg:px-5">
        <div className="min-w-0">
          <p className="break-words text-[12px] font-medium leading-[17px] text-slate-800">{airportName(departurePoint, leg.originAirport)}</p>
          {departurePoint?.terminal ? <p className="mt-1 text-[11px] font-normal leading-4 text-slate-600">Terminal {departurePoint.terminal}</p> : null}
        </div>
        <div className="min-w-0 text-right">
          <p className="break-words text-[12px] font-medium leading-[17px] text-slate-800">{airportName(arrivalPoint, leg.destinationAirport)}</p>
          {arrivalPoint?.terminal ? <p className="mt-1 text-[11px] font-normal leading-4 text-slate-600">Terminal {arrivalPoint.terminal}</p> : null}
        </div>
      </div>
      <div data-desktop-segment-list className="border-t border-[#E2E8F0] px-4 py-3 lg:px-5">
        <ol className="space-y-2.5">
          {leg.segments.map((segment, index) => (
            <li key={`${segment.originAirport}-${segment.destinationAirport}-${segment.departureTime}`}>
              {index > 0 && leg.layovers[index - 1] ? <p className="mb-2.5 rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">Connection at {leg.layovers[index - 1].airport} • {leg.layovers[index - 1].duration}</p> : null}
              <div className="flex items-start gap-3">
                <SegmentAirlineMark segment={segment} offerAirlineName={offerAirlineName} offerAirlineLogo={offerAirlineLogo} preferSegmentLogo />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"><p className="text-[13px] font-semibold leading-[18px] text-slate-900">{segment.originAirport} → {segment.destinationAirport}</p><p className="shrink-0 text-right text-[11px] font-medium leading-4 tabular-nums text-slate-600">{formatTime(segment.departureTime, locale)} – {formatTime(segment.arrivalTime, locale)}</p></div>
                  <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-600">{resolveSegmentCarrierName(segment, offerAirlineName)}{segment.flightNumber || segment.marketingFlightNumber ? ` • Flight ${segment.flightNumber || segment.marketingFlightNumber}` : ""}</p>
                  {segment.operatingCarrier && segment.marketingCarrier && (segment.operatingCarrier.name !== segment.marketingCarrier.name || segment.operatingFlightNumber !== segment.marketingFlightNumber) ? <p className="mt-0.5 text-[11px] leading-4 text-slate-600">Operated by {segment.operatingCarrier.name}{segment.operatingFlightNumber ? ` • Flight ${segment.operatingFlightNumber}` : ""}</p> : null}
                  {segment.aircraft?.name || segment.aircraft?.iataCode ? <p className="mt-0.5 text-[11px] leading-4 text-slate-600">Aircraft: {segment.aircraft.name || segment.aircraft.iataCode}{segment.aircraft.name && segment.aircraft.iataCode ? ` (${segment.aircraft.iataCode})` : ""}</p> : null}
                  {segment.distanceKm !== undefined ? <p className="mt-0.5 text-[11px] leading-4 text-slate-600">Flight distance: {formatDistanceKm(segment.distanceKm, locale)}</p> : null}
                </div>
              </div>
              {segment.technicalStops?.map((stop) => <div key={`${stop.airport.iataCode}-${stop.arrivalTime || "stop"}`} className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-slate-700"><p>Technical stop at {stop.airport.iataCode}{stop.airport.name ? ` — ${stop.airport.name}` : ""}{stop.duration ? ` • ${stop.duration}` : ""}</p>{stop.arrivalTime || stop.departureTime ? <p className="mt-1 font-normal">{stop.arrivalTime ? `Arrives ${formatTime(stop.arrivalTime, locale)}` : ""}{stop.arrivalTime && stop.departureTime ? " • " : ""}{stop.departureTime ? `Departs ${formatTime(stop.departureTime, locale)}` : ""}</p> : null}</div>)}
            </li>
          ))}
        </ol>
      </div>
      {hasFlightInfo ? <div data-desktop-flight-info className="border-t border-[#E2E8F0] px-4 py-3 lg:px-5">
        <h3 className="text-[11px] font-bold uppercase leading-4 tracking-[0.06em] text-slate-900">Flight info</h3>
        <dl className="mt-1.5 space-y-1.5">
          {departureTimeZone && arrivalTimeZone && departureTimeZone === arrivalTimeZone ? <div className="flex items-start justify-between gap-4"><dt className="min-w-0 flex-1 text-[11px] font-semibold leading-4 text-slate-800">Time zone</dt><dd className="max-w-[52%] break-words text-right text-[11px] leading-4 text-slate-600">{departureTimeZone}</dd></div> : <>
            {departureTimeZone ? <div className="flex items-start justify-between gap-4"><dt className="min-w-0 flex-1 text-[11px] font-semibold leading-4 text-slate-800">Departure time zone</dt><dd className="max-w-[52%] break-words text-right text-[11px] leading-4 text-slate-600">{departureTimeZone}</dd></div> : null}
            {arrivalTimeZone ? <div className="flex items-start justify-between gap-4"><dt className="min-w-0 flex-1 text-[11px] font-semibold leading-4 text-slate-800">Arrival time zone</dt><dd className="max-w-[52%] break-words text-right text-[11px] leading-4 text-slate-600">{arrivalTimeZone}</dd></div> : null}
          </>}
        </dl>
      </div> : null}
    </section>
  </>;
}

function AirportTime({ time, airport, date, locale }: { time: string; airport: string; date: string | null; locale: string }) { return <div className="min-w-0"><p className="whitespace-nowrap text-[19px] font-bold leading-6 tabular-nums text-slate-900">{formatTime(time, locale)}</p><p className="mt-0.5 text-[13px] font-bold leading-[17px] text-slate-900">{airport}</p>{date ? <p className="mt-px whitespace-nowrap text-[10px] font-medium leading-[14px] text-slate-600">{date}</p> : null}</div>; }

function SegmentAirlineMark({ segment, offerAirlineName, offerAirlineLogo, preferSegmentLogo = false }: { segment: FlightSegment; offerAirlineName: string; offerAirlineLogo?: string | null; preferSegmentLogo?: boolean }) {
  const carrierName = resolveSegmentCarrierName(segment, offerAirlineName);
  const canUseOfferLogo = canUseOfferAirlineLogo(segment, offerAirlineName, offerAirlineLogo);
  const logoUrl = preferSegmentLogo ? segment.airlineLogo ?? (canUseOfferLogo ? offerAirlineLogo : null) : canUseOfferLogo ? offerAirlineLogo : null;
  return <FlightIdentityMark logoUrl={logoUrl} label={`${carrierName} airline mark`} />;
}

function FareTerm({ term, text = term.text, compact = false }: { term: FlightDetailsFareChoice["distinguishingTerms"][number]; text?: string; compact?: boolean }) {
  const Icon = term.semantic === "positive" ? Check : term.semantic === "negative" ? MinusCircle : Info;
  const iconClass = term.semantic === "positive" ? "border-emerald-500 text-emerald-600" : "border-slate-300 text-slate-500";
  return <li className={`flex min-w-0 items-start text-slate-700 ${compact ? "gap-[5px] text-[11px] leading-[15px]" : "gap-2 text-[13px] leading-5"}`}><span className={`flex shrink-0 items-center justify-center rounded-full border ${compact ? "mt-px h-3.5 w-3.5" : "mt-0.5 h-4 w-4"} ${iconClass}`}><Icon className={compact ? "h-[9px] w-[9px]" : "h-2.5 w-2.5"} aria-hidden="true" /></span><span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:normal]">{text}</span></li>;
}

function FarePanel({
  activeTab,
  fare,
  offer,
  locale,
  selectedCurrency,
  currencyRates,
  isFallbackRate,
  redirecting,
  selectedDealOfferId,
  onSelectDeal,
  onViewDeal,
}: {
  activeTab: FareTab;
  fare?: FlightDetailsFareChoice;
  offer: FlightDetailsOffer;
  locale: string;
  selectedCurrency: string;
  currencyRates: ExchangeRates;
  isFallbackRate: boolean;
  redirecting: boolean;
  selectedDealOfferId: string | null;
  onSelectDeal: (offerId: string) => void;
  onViewDeal: (offerId: string) => void;
}) {
  if (activeTab === "deals")
    return (
      <CompareDealsPanel
        fare={fare}
        selectedCurrency={selectedCurrency}
        currencyRates={currencyRates}
        isFallbackRate={isFallbackRate}
        redirecting={redirecting}
        selectedDealOfferId={selectedDealOfferId}
        onSelectDeal={onSelectDeal}
        onViewDeal={onViewDeal}
      />
    );
  if (activeTab === "conditions")
    return <FareConditions offer={offer} locale={locale} />;
  if (activeTab === "extras")
    return <OptionalExtras offer={offer} locale={locale} />;
  return <FareDetails offer={offer} locale={locale} />;
}

function CompareDealsPanel({
  fare,
  selectedCurrency,
  currencyRates,
  isFallbackRate,
  redirecting,
  selectedDealOfferId,
  onSelectDeal,
  onViewDeal,
}: {
  fare?: FlightDetailsFareChoice;
  selectedCurrency: string;
  currencyRates: ExchangeRates;
  isFallbackRate: boolean;
  redirecting: boolean;
  selectedDealOfferId: string | null;
  onSelectDeal: (offerId: string) => void;
  onViewDeal: (offerId: string) => void;
}) {
  const deals = fare?.deals ?? [];
  const fallbackOffer = fare?.offer;
  const fallbackProviderName =
    fallbackOffer?.bookingProviderName?.trim() ||
    fallbackOffer?.provider?.trim() ||
    fallbackOffer?.airlineName?.trim() ||
    "";
  const fallbackDeal =
    !deals.length &&
    fallbackOffer &&
    fallbackProviderName &&
    Number.isFinite(fallbackOffer.price) &&
    fallbackOffer.price > 0
      ? {
          key: `desktop-source-${fare?.key ?? fallbackOffer.id}`,
          offerId: fallbackOffer.id,
          providerName: fallbackProviderName,
          ...(fallbackOffer.bookingProviderLogoUrl ? { providerLogoUrl: fallbackOffer.bookingProviderLogoUrl } : {}),
          price: fallbackOffer.price,
          currency: fallbackOffer.currency,
          offer: fallbackOffer,
        }
      : null;
  const displayedDeals = deals.length
    ? deals.map((deal) => ({ deal, canContinue: true }))
    : fallbackDeal
      ? [{ deal: fallbackDeal, canContinue: Boolean(fare?.handoff.available) }]
      : [];

  if (!displayedDeals.length)
    return (
      <DesktopFarePanel id="deals">
        <DesktopEmptyState
          title="No fare price available"
          description="The provider did not supply a usable price for this fare."
        />
      </DesktopFarePanel>
    );

  return (
    <DesktopFarePanel id="deals">
      <div
        role="radiogroup"
        aria-label="Flight deal options"
        className="max-w-[640px] space-y-2 py-1"
        data-desktop-flight-deal-list
      >
        {displayedDeals.map(({ deal, canContinue }, index) => {
          const selected =
            deal.offerId === selectedDealOfferId ||
            (!selectedDealOfferId && index === 0);
          const identityMark = resolveDealIdentityMark(deal);
          const price = formatDisplayPrice({
            amount: deal.price,
            sourceCurrency: deal.currency,
            displayCurrency: selectedCurrency,
            convertSourceEstimate: true,
            useFlightResultSymbols: true,
            maximumFractionDigits: 0,
            rates: currencyRates,
            isFallbackRate,
          });
          return (
            <article
              key={deal.key}
              data-desktop-flight-deal-card
              data-selected={selected || undefined}
              data-provider-handoff-unavailable={!canContinue || undefined}
              className={`relative grid min-h-[92px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border bg-white px-4 py-3 transition ${selected ? "border-[#075EE8] shadow-[0_3px_10px_rgba(7,94,232,0.08)]" : "border-[#D9E2E8]"}`}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelectDeal(deal.offerId)}
                onKeyDown={(event) => {
                  const direction =
                    event.key === "ArrowRight" || event.key === "ArrowDown"
                      ? 1
                      : event.key === "ArrowLeft" || event.key === "ArrowUp"
                        ? -1
                        : 0;
                  const nextIndex =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? displayedDeals.length - 1
                        : direction
                          ? (index + direction + displayedDeals.length) %
                            displayedDeals.length
                          : -1;
                  if (nextIndex < 0) return;
                  event.preventDefault();
                  onSelectDeal(displayedDeals[nextIndex].deal.offerId);
                  event.currentTarget.parentElement?.parentElement
                    ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                    [nextIndex]?.focus();
                }}
                className="min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35 focus-visible:ring-offset-2"
              >
                <span className="block min-w-0" data-desktop-flight-deal-provider>
                  {deal.providerLogoUrl ? (
                    <BookingProviderLogo
                      providerName={deal.providerName}
                      logoUrl={deal.providerLogoUrl}
                    />
                  ) : identityMark.kind === "airline" ? (
                    <span className="inline-flex items-center gap-2">
                      <FlightIdentityMark
                        logoUrl={identityMark.logoUrl}
                        decorative
                      />
                      <strong className="truncate text-[15px] font-semibold leading-5 text-[#192024]">
                        {deal.providerName}
                      </strong>
                    </span>
                  ) : (
                    <strong className="truncate text-[15px] font-semibold leading-5 text-[#004BB8]">
                      {deal.providerName}
                    </strong>
                  )}
                </span>

                <span className="mt-2 block min-w-0" data-desktop-flight-deal-price>
                  <strong
                    className="block break-words text-[20px] font-semibold leading-6 tracking-[-0.02em] tabular-nums text-[#192024]"
                    aria-label={price.ariaLabel}
                  >
                    {price.formatted}
                  </strong>
                  <span className="block text-[12px] font-normal leading-[14px] text-[#59636a]">
                    {fare?.label ? `${fare.label} · Trip total` : "Trip total"}
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={redirecting || !canContinue}
                aria-label={
                  canContinue
                    ? `Continue deal with ${deal.providerName}`
                    : `Provider checkout unavailable for ${deal.providerName}`
                }
                onClick={() => {
                  onSelectDeal(deal.offerId);
                  onViewDeal(deal.offerId);
                }}
                className="inline-flex h-9 w-[112px] shrink-0 items-center justify-center rounded-lg bg-[#004BB8] px-3 text-[13px] font-semibold leading-5 text-white transition-colors hover:bg-[#003B91] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#004BB8] disabled:text-white disabled:opacity-100"
                data-desktop-flight-deal-action
              >
                {canContinue
                  ? redirecting
                    ? "Opening…"
                    : "View deal"
                  : "Unavailable"}
              </button>
            </article>
          );
        })}
      </div>
    </DesktopFarePanel>
  );
}

function BookingProviderLogo({
  providerName,
  logoUrl,
}: {
  providerName: string;
  logoUrl: string;
}) {
  return (
    <span
      data-desktop-flight-provider-logo
      className="inline-flex h-9 max-w-[82px] shrink-0 items-center justify-center overflow-hidden"
    >
      <Image
        src={logoUrl}
        alt=""
        aria-hidden="true"
        width={82}
        height={36}
        className="max-h-9 w-auto max-w-[82px] object-contain object-left"
        title={providerName}
      />
    </span>
  );
}

function FareDetails({
  offer,
  locale,
}: {
  offer: FlightDetailsOffer;
  locale: string;
}) {
  const provider = offer.providerDetails;
  const cabins = (offer.legs ?? []).flatMap((leg) =>
    leg.segments.flatMap((segment) =>
      (segment.cabinDetails ?? []).map((cabin) => ({ segment, cabin })),
    ),
  );
  return (
    <DesktopFarePanel id="details">
      <div className="divide-y divide-[#D8E1EC]">
        <section className="py-4">
          {cabins.length ? (
            cabins.map(({ segment, cabin }, index) => {
              const seat = [
                cabin.amenities?.seat?.type &&
                  titleCase(cabin.amenities.seat.type),
                cabin.amenities?.seat?.pitch &&
                  `${cabin.amenities.seat.pitch} in pitch`,
                cabin.amenities?.seat?.legroom &&
                  `${cabin.amenities.seat.legroom.toUpperCase() === "N/A" ? "N/A" : titleCase(cabin.amenities.seat.legroom)} legroom`,
              ]
                .filter(Boolean)
                .join(" · ");
              const wifi = cabin.amenities?.wifi;
              const wifiValue = wifi
                ? `${amenityState(wifi.state)}${wifi.state === "included" && wifi.cost ? ` (${titleCase(wifi.cost)})` : ""}`
                : undefined;
              const hasCabin = Boolean(
                cabin.fareBrandName ||
                cabin.cabinClass ||
                cabin.cabinMarketingName ||
                cabin.fareBasisCode,
              );
              const hasOnBoard = Boolean(
                seat || cabin.amenities?.wifi || cabin.amenities?.power,
              );
              return (
                <div
                  key={`${segment.departureTime}-${JSON.stringify(cabin)}-${index}`}
                  className={index ? "border-t border-[#D8E1EC] py-4" : "pb-1"}
                >
                  <p className="mb-3 break-words text-sm font-semibold leading-5 text-slate-950">
                    {segment.originAirport} → {segment.destinationAirport}
                    {segment.marketingFlightNumber || segment.flightNumber
                      ? ` · ${segment.marketingFlightNumber || segment.flightNumber}`
                      : ""}
                  </p>
                  {hasCabin ? (
                    <DesktopFareGroup label="Cabin">
                      <dl className="grid gap-2 md:max-w-3xl">
                        <DesktopDetailRow
                          label="Fare brand"
                          value={cabin.fareBrandName}
                        />
                        <DesktopDetailRow
                          label="Cabin"
                          value={
                            cabin.cabinClass && titleCase(cabin.cabinClass)
                          }
                        />
                        <DesktopDetailRow
                          label="Cabin product"
                          value={cabin.cabinMarketingName}
                        />
                        <DesktopDetailRow
                          label="Fare basis"
                          value={cabin.fareBasisCode}
                        />
                      </dl>
                    </DesktopFareGroup>
                  ) : null}
                  {hasCabin && hasOnBoard ? (
                    <div className="my-4 h-px bg-[#D8E1EC]" />
                  ) : null}
                  {hasOnBoard ? (
                    <DesktopFareGroup label="On board">
                      <dl className="grid gap-2 md:max-w-3xl">
                        <DesktopDetailRow
                          label="Seat"
                          value={seat || undefined}
                        />
                        <DesktopDetailRow label="Wi-Fi" value={wifiValue} />
                        <DesktopDetailRow
                          label="Power"
                          value={
                            cabin.amenities?.power
                              ? amenityState(cabin.amenities.power.state)
                              : undefined
                          }
                        />
                      </dl>
                    </DesktopFareGroup>
                  ) : null}
                </div>
              );
            })
          ) : (
            <DesktopQuietText>
              Additional cabin details not supplied by the provider.
            </DesktopQuietText>
          )}
        </section>
        <section className="py-4">
          <DesktopFareGroup label="Price breakdown">
            {provider?.price ? (
              <dl className="grid gap-2 md:max-w-3xl">
                {provider.price.baseAmount !== undefined &&
                provider.price.baseCurrency ? (
                  <DesktopDetailRow
                    label="Base fare"
                    value={formatSourceMoney(
                      provider.price.baseAmount,
                      provider.price.baseCurrency,
                      locale,
                    )}
                  />
                ) : null}
                {provider.price.taxAmount !== undefined &&
                provider.price.taxCurrency ? (
                  <DesktopDetailRow
                    label="Taxes"
                    value={formatSourceMoney(
                      provider.price.taxAmount,
                      provider.price.taxCurrency,
                      locale,
                    )}
                  />
                ) : null}
                <DesktopDetailRow
                  label="Trip total"
                  value={formatSourceMoney(
                    provider.price.totalAmount,
                    provider.price.totalCurrency,
                    locale,
                  )}
                  strong
                />
              </dl>
            ) : (
              <DesktopQuietText>
                Price breakdown not supplied by the provider.
              </DesktopQuietText>
            )}
          </DesktopFareGroup>
        </section>
        {provider?.totalEmissionsKg !== undefined ? (
          <section className="py-4">
            <EmissionsRow amount={provider.totalEmissionsKg} locale={locale} />
          </section>
        ) : null}
        {provider?.updatedAt ? (
          <DesktopProviderFreshness
            value={provider.updatedAt}
            locale={locale}
          />
        ) : null}
      </div>
    </DesktopFarePanel>
  );
}

function FareConditions({
  offer,
  locale,
}: {
  offer: FlightDetailsOffer;
  locale: string;
}) {
  const provider = offer.providerDetails;
  const conditions = provider?.conditions ?? [];
  const groups = [
    ...new Set(conditions.map((condition) => condition.category)),
  ].map((category) => ({
    category,
    conditions: conditions.filter(
      (condition) => condition.category === category,
    ),
  }));
  const links = carrierConditionsLinks(offer);
  return (
    <DesktopFarePanel id="conditions">
      <div className="divide-y divide-[#D8E1EC]">
        <section>
          {groups.length ? (
            groups.map((group, groupIndex) => (
              <div
                key={group.category}
                className={`py-4 ${groupIndex ? "border-t border-[#D8E1EC]" : ""}`}
              >
                <DesktopGroupLabel>
                  {conditionCategory(group.conditions[0])}
                </DesktopGroupLabel>
                <div className="grid gap-0 md:max-w-3xl">
                  {group.conditions.map((condition, index) => {
                    const semantic =
                      condition.state === "allowed"
                        ? "positive"
                        : condition.state === "not-allowed"
                          ? "negative"
                          : "informational";
                    const penalty =
                      condition.penaltyAmount !== undefined &&
                      condition.penaltyCurrency
                        ? `${formatSourceMoney(condition.penaltyAmount, condition.penaltyCurrency, locale)} penalty`
                        : null;
                    return (
                      <div
                        key={`${condition.scope}-${condition.category}-${index}`}
                        className={`flex items-start gap-3 py-2.5 ${index ? "border-t border-[#D8E1EC]" : ""}`}
                      >
                        <DesktopStatusIcon semantic={semantic} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold leading-[18px] text-slate-950">
                            {conditionState(condition)}
                          </p>
                          <p className="mt-0.5 text-xs leading-4 text-[#536B92]">
                            {conditionScope(condition)}
                          </p>
                          {penalty ? (
                            <p className="mt-0.5 text-xs font-medium leading-4 text-[#536B92]">
                              {penalty}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <DesktopEmptyState
              title="Fare conditions unavailable"
              description="Conditions were not supplied by the provider."
            />
          )}
        </section>
        {provider?.passengerIdentityDocumentsRequired ||
        provider?.supportedIdentityDocumentTypes?.length ? (
          <section className="py-4">
            <DesktopFareGroup label="Travel documents">
              {provider.passengerIdentityDocumentsRequired ? (
                <p className="mb-2 text-[13px] leading-[19px] text-slate-800">
                  Passport or identity information is required to complete
                  booking.
                </p>
              ) : null}
              {provider.supportedIdentityDocumentTypes?.length ? (
                <dl className="md:max-w-3xl">
                  <DesktopDetailRow
                    label="Supported documents"
                    value={provider.supportedIdentityDocumentTypes
                      .map(titleCase)
                      .join(", ")}
                  />
                </dl>
              ) : null}
            </DesktopFareGroup>
          </section>
        ) : null}
        {provider?.offerOwner || links.length ? (
          <section className="py-4">
            <DesktopFareGroup label="Airline">
              {provider?.offerOwner ? (
                <p className="mb-1 text-[13px] font-medium leading-[19px] text-slate-950">
                  {provider.offerOwner.name}
                  {provider.offerOwner.iataCode
                    ? ` · ${provider.offerOwner.iataCode}`
                    : ""}
                </p>
              ) : null}
              <ul className="md:max-w-3xl">
                {links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center justify-between gap-3 text-[13px] font-semibold leading-[18px] text-[#075EE8] hover:underline"
                    >
                      <span className="min-w-0 flex-1 break-words">
                        {link.name} conditions of carriage
                      </span>
                      <ExternalLink
                        className="h-[17px] w-[17px] shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </DesktopFareGroup>
          </section>
        ) : null}
        {provider?.updatedAt ? (
          <DesktopProviderFreshness
            value={provider.updatedAt}
            locale={locale}
          />
        ) : null}
      </div>
    </DesktopFarePanel>
  );
}

function OptionalExtras({
  offer,
  locale,
}: {
  offer: FlightDetailsOffer;
  locale: string;
}) {
  const provider = offer.providerDetails;
  const services = provider?.optionalServices ?? [];
  return (
    <DesktopFarePanel id="extras">
      <div className="divide-y divide-[#D8E1EC]">
        <section className="py-4">
          <DesktopGroupLabel>Optional services</DesktopGroupLabel>
          {services.length ? (
            <ul className="md:max-w-4xl">
              {services.map((service, index) => (
                <li
                  key={`${service.type}-${service.description}-${index}`}
                  className={`py-3 ${index ? "border-t border-[#D8E1EC]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-5">
                    <p className="min-w-0 flex-1 break-words text-[13px] font-semibold leading-[19px] text-slate-950">
                      {service.description}
                    </p>
                    <p className="max-w-[42%] shrink-0 break-words text-right text-[13px] font-bold leading-[19px] tabular-nums text-slate-950">
                      {formatSourceMoney(
                        service.price,
                        service.currency,
                        locale,
                      )}
                      {service.pricedPerTraveler ? " each" : ""}
                    </p>
                  </div>
                  {service.travelerCount ? (
                    <p className="mt-1 text-xs leading-[17px] text-[#536B92]">
                      Available for {service.travelerCount} traveler
                      {service.travelerCount === 1 ? "" : "s"}
                    </p>
                  ) : null}
                  {service.maximumQuantity !== undefined ? (
                    <p className="mt-1 text-xs leading-[17px] text-[#536B92]">
                      {service.pricedPerTraveler
                        ? "Maximum quantity per traveler"
                        : "Maximum quantity"}
                      : {service.maximumQuantity}
                    </p>
                  ) : null}
                  {service.journeyContext ? (
                    <p className="mt-1 text-xs leading-[17px] text-[#536B92]">
                      {service.journeyContext}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <DesktopQuietText>
              No optional services were supplied by this provider.
            </DesktopQuietText>
          )}
        </section>
        {provider?.supportedLoyaltyProgrammes?.length ? (
          <section className="py-4">
            <DesktopFareGroup label="Loyalty programmes">
              <p className="text-[13px] font-medium leading-[19px] text-slate-950">
                {provider.supportedLoyaltyProgrammes.join(", ")}
              </p>
            </DesktopFareGroup>
          </section>
        ) : null}
      </div>
    </DesktopFarePanel>
  );
}

function DesktopFarePanel({
  id,
  children,
}: {
  id: FareTab;
  children: React.ReactNode;
}) {
  return (
    <section
      data-desktop-fare-panel
      id={`fare-panel-${id}`}
      role="tabpanel"
      aria-labelledby={`fare-tab-${id}`}
      className="py-4 sm:py-5"
    >
      {children}
    </section>
  );
}
function DesktopGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-[9px] text-[11px] font-bold uppercase leading-[15px] tracking-[0.08em] text-[#536B92]">
      {children}
    </h3>
  );
}
function DesktopFareGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <DesktopGroupLabel>{label}</DesktopGroupLabel>
      {children}
    </div>
  );
}
function DesktopDetailRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value?: string | null;
  strong?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] items-start gap-6">
      <dt
        className={`min-w-0 break-words text-[13px] leading-[19px] text-[#536B92] ${strong ? "font-bold" : "font-normal"}`}
      >
        {label}
      </dt>
      <dd
        className={`min-w-0 break-words text-right text-[13px] leading-[19px] text-slate-950 [overflow-wrap:anywhere] ${strong ? "font-bold" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}
function DesktopQuietText({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-3 text-[13px] leading-[19px] text-[#536B92]">{children}</p>
  );
}
function DesktopEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-3 py-6 text-center">
      <p className="text-sm font-semibold leading-5 text-slate-950">{title}</p>
      <p className="mt-1 text-[13px] leading-[19px] text-[#536B92]">
        {description}
      </p>
    </div>
  );
}
function DesktopProviderFreshness({
  value,
  locale,
}: {
  value: string;
  locale: string;
}) {
  return (
    <section className="py-3">
      <p className="text-[11px] font-medium leading-4 text-[#536B92]">
        Provider offer last updated
      </p>
      <p className="text-[11px] leading-4 text-[#536B92]">
        {formatProviderTimestamp(value, locale)}
      </p>
    </section>
  );
}
function DesktopStatusIcon({
  semantic,
}: {
  semantic: "positive" | "negative" | "informational";
}) {
  return (
    <span
      className={`mt-0.5 flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full border ${semantic === "positive" ? "border-emerald-500" : "border-slate-400"}`}
    >
      {semantic === "positive" ? (
        <Check
          className="h-2.5 w-2.5 text-emerald-600"
          strokeWidth={2.2}
          aria-hidden="true"
        />
      ) : semantic === "negative" ? (
        <span
          className="h-[1.5px] w-[7px] rounded bg-slate-500"
          aria-hidden="true"
        />
      ) : (
        <span
          className="h-[3px] w-[3px] rounded-full bg-slate-500"
          aria-hidden="true"
        />
      )}
    </span>
  );
}
function amenityState(value: "included" | "not-included" | "unknown") {
  return value === "included"
    ? "Available"
    : value === "not-included"
      ? "Not available"
      : "Not supplied by provider";
}
function conditionScope(condition: FlightProviderCondition) {
  return condition.scope === "trip"
    ? "Whole trip"
    : condition.legIndex !== undefined
      ? `Flight ${condition.legIndex + 1}`
      : condition.scope === "outbound"
        ? "Outbound only"
        : condition.scope === "return"
          ? "Return only"
          : "Leg";
}
function conditionCategory(condition: FlightProviderCondition) {
  return condition.category === "change"
    ? "Changes"
    : titleCase(condition.category);
}
function conditionState(condition: FlightProviderCondition) {
  const permission =
    condition.category === "change" || condition.category === "refund";
  return condition.state === "allowed"
    ? permission
      ? "Allowed"
      : "Included"
    : condition.state === "not-allowed"
      ? permission
        ? "Not allowed"
        : "Not included"
      : "Not supplied by provider";
}
function formatSourceMoney(amount: number, currency: string, locale: string) { try { return formatFlightResultCurrency(amount, currency, { maximumFractionDigits: 0, locale }); } catch { return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount); } }
function formatProviderTimestamp(value: string, locale: string) { const timestamp = new Date(value); return Number.isNaN(timestamp.getTime()) ? value : new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(timestamp); }
function formatDistanceKm(distanceKm: number, locale: string) { return `${new Intl.NumberFormat(locale, { maximumFractionDigits: distanceKm >= 100 ? 0 : 1 }).format(distanceKm)} km`; }
function carrierConditionsLinks(offer: FlightDetailsOffer) {
  const entries = (offer.legs ?? []).flatMap((leg) => leg.segments.flatMap((segment) => [segment.marketingCarrier, segment.operatingCarrier])).flatMap((carrier) => carrier?.conditionsOfCarriageUrl ? [{ name: carrier.name, url: carrier.conditionsOfCarriageUrl }] : []);
  if (offer.providerDetails?.offerOwner?.conditionsOfCarriageUrl) entries.push({ name: offer.providerDetails.offerOwner.name, url: offer.providerDetails.offerOwner.conditionsOfCarriageUrl });
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}

function EmissionsRow({ amount, locale }: { amount: number; locale: string }) { return <div className="mt-4 flex min-h-9 items-center justify-between gap-3 rounded-md bg-emerald-50/70 px-3 py-2 text-xs"><span className="inline-flex items-center gap-2 font-medium text-emerald-700"><Leaf className="h-4 w-4" aria-hidden="true" /> Estimated CO₂ emissions</span><span className="inline-flex items-center gap-2 text-right font-medium text-slate-800">{amount.toLocaleString(locale)} kg for this offer <Info className="h-3.5 w-3.5" aria-hidden="true" /></span></div>; }

function FlightDetailsSkeleton({ resultsHref }: { resultsHref: string }) { return <FlightDetailsLoadingShell resultsHref={resultsHref} />; }
function FlightDetailsUnavailable({ resultsHref, message }: { resultsHref: string; message: string }) { return <main className="flex-1 bg-white sm:bg-[#F7F9FC] sm:py-10"><div className="flex min-h-[52px] items-center px-4 pt-[env(safe-area-inset-top)] sm:hidden"><Link href={resultsHref} aria-label="Back to results" className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold text-[#075EE8]"><ArrowLeft className="h-[18px] w-[18px]" /><span>Back to results</span></Link></div><div className="mx-auto max-w-3xl px-0 sm:px-4"><Link href={resultsHref} className="ml-4 hidden items-center gap-2 text-sm font-semibold text-[#075EE8] sm:inline-flex sm:ml-0"><ArrowLeft className="h-4 w-4" /> Back to results</Link><section className="mt-4 border-y border-slate-200 bg-white p-6 sm:rounded-[15px] sm:border sm:p-8"><h1 className="text-xl font-bold">Flight quote unavailable</h1><p className="mt-2 text-sm text-slate-600">{message || "Please return to results and search again for current prices."}</p></section></div></main>; }

function readTravelerSummary(search: { adults: number; children: number; infants: number; travelers: number }, locale: string, t: (key: string) => string) {
  const number = new Intl.NumberFormat(locale);
  const parts = ([
    [search.adults, "adultSingular", "adultPlural"],
    [search.children, "childSingular", "childPlural"],
    [search.infants, "infantSingular", "infantPlural"],
  ] as const).filter(([count]) => count > 0).map(([count, singular, plural]) => `${number.format(count)} ${t(count === 1 ? singular : plural)}`);
  return {
    count: search.travelers,
    label: parts.join(", ") || `${number.format(search.travelers)} ${t(search.travelers === 1 ? "deals.travelerSingular" : "deals.travelerPlural")}`,
  };
}
function formatTime(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function technicalStopCount(leg: FlightLeg) { return leg.segments.reduce((total, segment) => total + (segment.technicalStops?.length ?? 0), 0); }
function formatStops(connections: number, technicalStops = 0) { const parts = []; if (connections) parts.push(`${connections} ${connections === 1 ? "connection" : "connections"}`); if (technicalStops) parts.push(`${technicalStops} technical ${technicalStops === 1 ? "stop" : "stops"}`); return parts.length ? parts.join(" • ") : "Non-stop"; }
function titleCase(value: string) { return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
