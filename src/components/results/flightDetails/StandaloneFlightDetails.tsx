"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Armchair,
  ArrowLeft,
  Check,
  Clock3,
  LockKeyhole,
  Luggage,
  Pencil,
  Plane,
  ShieldCheck,
} from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import type { FlightLeg, PublicFlightResult } from "@/lib/types";
import { fareBenefits, groupFareOffers } from "./flightDetailsPresentation";

type DetailsResponse = {
  flight?: PublicFlightResult;
  fareOffers?: PublicFlightResult[];
  error?: string;
};

export function StandaloneFlightDetails({ id, resultsHref }: { id: string; resultsHref: string }) {
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const [response, setResponse] = useState<DetailsResponse | null>(null);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [selectedFareKey, setSelectedFareKey] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/flights/details?id=${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then(async (result) => {
        const data = (await result.json()) as DetailsResponse;
        if (!result.ok || !data.flight) throw new Error(data.error || "This flight quote is no longer available.");
        return data;
      })
      .then((data) => setResponse(data))
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "This flight quote is no longer available.");
        }
      });
    return () => controller.abort();
  }, [id]);

  const flight = response?.flight;
  const fareGroups = useMemo(
    () => groupFareOffers(response?.fareOffers?.length ? response.fareOffers : flight ? [flight] : []),
    [response, flight],
  );

  const initialFare = flight
    ? fareGroups.find((group) => group.offers.some((offer) => offer.id === flight.id))
    : undefined;
  const selectedFare = fareGroups.find((group) => group.key === selectedFareKey) ?? initialFare ?? fareGroups[0];
  const providers = selectedFare?.offers ?? [];
  const selectedOffer = providers.find((offer) => offer.id === selectedProviderId)
    ?? providers.find((offer) => offer.id === flight?.id)
    ?? selectedFare?.lowest
    ?? flight;

  async function continueToProvider() {
    if (!selectedOffer || redirecting) return;
    setRedirecting(true);
    setError("");
    try {
      const result = await fetch("/api/redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedOffer.id, type: "flight", sourcePage: "flight_details" }),
      });
      const data = (await result.json()) as { url?: string; error?: string };
      if (!result.ok || !data.url) throw new Error(data.error || "This provider link is unavailable.");
      window.location.href = data.url;
    } catch (redirectError) {
      setError(redirectError instanceof Error ? redirectError.message : "This provider link is unavailable.");
      setRedirecting(false);
    }
  }

  if (!response && !error) return <FlightDetailsSkeleton resultsHref={resultsHref} />;
  if (!flight || error && !response) return <FlightDetailsUnavailable resultsHref={resultsHref} message={error} />;

  const leg = primaryLeg(flight);
  const origin = searchParams.get("originName") || searchParams.get("origin") || flight.originAirport;
  const destination = searchParams.get("destinationName") || searchParams.get("destination") || flight.destinationAirport;
  const route = `${cleanLocation(origin)} to ${cleanLocation(destination)}`;
  const travelers = readTravelerSummary(searchParams);
  const tripType = searchParams.get("tripType") === "round-trip" || (flight.legs?.length ?? 0) > 1 ? "Round-trip" : "One-way";
  const tripLine = `${tripType} • ${travelers.count} ${travelers.count === 1 ? "traveler" : "travelers"}`;
  const date = formatTripDate(searchParams.get("departureDate") || leg.departureTime, locale);
  const providerPrice = selectedOffer
    ? formatDisplayPrice({
        amount: selectedOffer.price,
        sourceCurrency: selectedOffer.currency,
        displayCurrency: selectedOption.currency,
        convertUsdEstimate: true,
        rates: currencyRates.rates,
        isFallbackRate: currencyRates.isFallback,
      })
    : null;

  return (
    <main className="flex-1 bg-[#F7F9FC] pb-14 pt-5 text-slate-950 lg:pb-20 lg:pt-7">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <Link href={resultsHref} className="mb-4 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[#075EE8] transition hover:text-[#004BB8] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to results
        </Link>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.25fr)_minmax(300px,0.95fr)] lg:gap-7 xl:gap-8">
          <section className="min-w-0 rounded-[15px] border border-[#E2E8F0] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.05)] sm:p-7 lg:p-8" aria-labelledby="flight-details-heading">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 ref={headingRef} id="flight-details-heading" tabIndex={-1} className="text-2xl font-bold tracking-[-0.025em] text-slate-950 outline-none sm:text-[26px]">{route}</h1>
                <p className="mt-1 text-sm font-medium text-slate-600">{tripLine}</p>
              </div>
              <Link href={resultsHref} className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-lg border border-[#075EE8] bg-white px-4 text-sm font-semibold text-[#075EE8] transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35">
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit search
              </Link>
            </div>

            <ItineraryCard flight={flight} leg={leg} origin={cleanLocation(origin)} destination={cleanLocation(destination)} locale={locale} />

            <h2 className="mb-3 mt-7 text-xl font-bold tracking-[-0.015em] text-slate-950">Step 1: Pick your fare</h2>
            <div role="radiogroup" aria-label="Available fares" className={`grid gap-4 ${fareGroups.length >= 3 ? "md:grid-cols-3" : fareGroups.length === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
              {fareGroups.map((fare) => {
                const selected = fare.key === selectedFare?.key;
                const price = formatDisplayPrice({ amount: fare.lowest.price, sourceCurrency: fare.lowest.currency, displayCurrency: selectedOption.currency, convertUsdEstimate: true, rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback });
                const benefits = fareBenefits(fare.lowest);
                return (
                  <button key={fare.key} type="button" role="radio" aria-checked={selected} onClick={() => { setSelectedFareKey(fare.key); setSelectedProviderId(fare.lowest.id); }} className={`relative min-h-[218px] rounded-[13px] border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/40 ${selected ? "border-2 border-[#075EE8] bg-[#075EE8]/[0.035]" : "border-[#E2E8F0] bg-white hover:border-slate-300"}`}>
                    <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${selected ? "border-[#075EE8]" : "border-slate-300"}`} aria-hidden="true"><span className={`h-2 w-2 rounded-full ${selected ? "bg-[#075EE8]" : "bg-transparent"}`} /></span>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-[#075EE8]"><Luggage className="h-5 w-5" aria-hidden="true" /></span>
                      <div><p className="text-[17px] font-semibold text-slate-950">{fare.label}</p><p className="text-[21px] font-bold leading-6 text-[#075EE8]" aria-label={price.ariaLabel}>{price.formatted}</p></div>
                    </div>
                    {benefits.length ? <ul className="mt-5 space-y-2.5">{benefits.map((benefit) => <li key={benefit} className="flex items-start gap-2 text-[13px] leading-5 text-slate-700"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-emerald-500 text-emerald-600"><Check className="h-2.5 w-2.5" aria-hidden="true" /></span>{benefit}</li>)}</ul> : null}
                  </button>
                );
              })}
            </div>

            <h2 className="mb-3 mt-7 text-xl font-bold tracking-[-0.015em] text-slate-950">Step 2: Choose where to book</h2>
            <div className="space-y-3">
              {providers.map((provider) => {
                const selected = provider.id === selectedOffer?.id;
                const price = formatDisplayPrice({ amount: provider.price, sourceCurrency: provider.currency, displayCurrency: selectedOption.currency, convertUsdEstimate: true, rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback });
                return (
                  <div key={provider.id} className={`flex min-h-[76px] flex-col gap-3 rounded-xl border px-4 py-3.5 transition sm:flex-row sm:items-center ${selected ? "border-[#075EE8] bg-[#075EE8]/[0.03]" : "border-[#E2E8F0] bg-white"}`}>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <ProviderMark provider={provider} />
                      <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{provider.provider}</p><p className="mt-0.5 text-xs text-slate-500">Booking provider</p></div>
                    </div>
                    <div className="flex items-center gap-4 sm:justify-end">
                      <div className="min-w-[88px] text-right"><p className="text-lg font-semibold text-slate-950" aria-label={price.ariaLabel}>{price.formatted}</p><p className="text-[11px] text-slate-500">Total</p></div>
                      <button type="button" onClick={() => setSelectedProviderId(provider.id)} aria-label={`Select ${provider.provider} for ${price.formatted}`} className="h-10 w-[102px] rounded-lg border border-[#075EE8] bg-white text-sm font-semibold text-[#075EE8] transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35">{selected ? "Selected" : "Select"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <TripSidebar flight={flight} leg={leg} route={route} date={date} tripLine={tripLine} travelers={travelers.label} selectedFare={selectedFare?.label || selectedOffer?.cabinClass || ""} selectedOffer={selectedOffer} price={providerPrice} locale={locale} redirecting={redirecting} onContinue={continueToProvider} error={error} />
        </div>
      </div>
    </main>
  );
}

function ItineraryCard({ flight, leg, origin, destination, locale }: { flight: PublicFlightResult; leg: FlightLeg; origin: string; destination: string; locale: string }) {
  const logo = flight.airlineLogo || undefined;
  return <div className="mt-5 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
    <div className="grid gap-5 p-5 sm:grid-cols-[1.2fr_0.8fr_1.2fr_0.8fr] sm:items-center lg:p-6">
      <div className="flex min-w-0 items-center gap-3">{logo ? <Image src={logo} alt={`${flight.airlineName} logo`} width={42} height={42} className="h-10 w-10 object-contain" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#075EE8]"><Plane className="h-5 w-5" aria-hidden="true" /></span>}<div className="min-w-0"><p className="truncate text-sm font-semibold">{flight.airlineName}</p>{flight.flightNumber ? <p className="mt-1 text-xs text-slate-500">Flight {flight.flightNumber}</p> : null}</div></div>
      <AirportTime time={leg.departureTime} airport={leg.originAirport} city={origin} locale={locale} />
      <div className="text-center"><p className="mb-1 text-xs font-medium text-slate-500">{leg.duration}</p><div className="flex items-center text-slate-400"><Plane className="h-4 w-4 rotate-45 text-[#075EE8]" aria-hidden="true" /><span className="mx-2 h-px flex-1 border-t border-dashed border-slate-300" /><span className="h-1.5 w-1.5 rounded-full bg-slate-400" /></div><p className="mt-1.5 text-xs font-medium text-slate-500">{formatStops(leg.stops)}</p></div>
      <AirportTime time={leg.arrivalTime} airport={leg.destinationAirport} city={destination} locale={locale} />
    </div>
    <div className="grid border-t border-[#E2E8F0] sm:grid-cols-2">
      {flight.cabinClass ? <Metadata icon={Armchair} label="Cabin" value={titleCase(flight.cabinClass)} /> : null}
      <Metadata icon={Clock3} label="Duration" value={leg.duration} divided={Boolean(flight.cabinClass)} />
    </div>
  </div>;
}

function AirportTime({ time, airport, city, locale }: { time: string; airport: string; city: string; locale: string }) { return <div className="min-w-0"><p className="text-base font-semibold">{formatTime(time, locale)}</p><p className="mt-1 text-sm font-bold">{airport}</p>{city !== airport ? <p className="mt-1 truncate text-xs text-slate-500">{city}</p> : null}</div>; }

function Metadata({ icon: Icon, label, value, divided = false }: { icon: typeof Plane; label: string; value: string; divided?: boolean }) { return <div className={`flex items-center gap-3 px-5 py-4 lg:px-6 ${divided ? "sm:border-l sm:border-[#E2E8F0]" : ""}`}><Icon className="h-5 w-5 text-slate-700" aria-hidden="true" /><div><p className="text-[11px] text-slate-500">{label}</p><p className="mt-0.5 text-xs font-medium text-slate-800">{value}</p></div></div>; }

function TripSidebar({ flight, leg, route, date, tripLine, travelers, selectedFare, selectedOffer, price, locale, redirecting, onContinue, error }: { flight: PublicFlightResult; leg: FlightLeg; route: string; date: string; tripLine: string; travelers: string; selectedFare: string; selectedOffer?: PublicFlightResult; price: ReturnType<typeof formatDisplayPrice> | null; locale: string; redirecting: boolean; onContinue: () => void; error: string }) {
  return <aside className="rounded-[15px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_18px_rgba(15,23,42,0.05)] lg:sticky lg:top-24" aria-labelledby="your-trip-heading">
    <h2 id="your-trip-heading" className="text-xl font-bold">Your trip</h2><p className="mt-4 text-base font-semibold">{route}</p><p className="mt-1 text-xs leading-5 text-slate-600">{date} • {tripLine}</p>
    <div className="my-5 border-t border-[#E2E8F0]" />
    <div className="flex items-center gap-3">{flight.airlineLogo ? <Image src={flight.airlineLogo} alt={`${flight.airlineName} logo`} width={38} height={38} className="h-9 w-9 object-contain" /> : <Plane className="h-7 w-7 text-[#075EE8]" aria-hidden="true" />}<div><p className="text-sm font-semibold">{flight.airlineName}</p>{flight.flightNumber ? <p className="mt-0.5 text-xs text-slate-500">Flight {flight.flightNumber}</p> : null}</div></div>
    <div className="mt-5 grid grid-cols-[1fr_0.85fr_1fr] items-start gap-2"><AirportTime time={leg.departureTime} airport={leg.originAirport} city="" locale={locale} /><div className="pt-1 text-center"><Plane className="mx-auto h-5 w-5 rotate-45 text-slate-500" aria-hidden="true" /><p className="mt-2 text-xs text-slate-500">{leg.duration}</p><p className="text-xs text-slate-500">{formatStops(leg.stops)}</p></div><div className="text-right"><p className="text-base font-semibold">{formatTime(leg.arrivalTime, locale)}</p><p className="mt-1 text-sm font-bold">{leg.destinationAirport}</p></div></div>
    <div className="my-5 border-t border-[#E2E8F0]" /><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-600">Fare</dt><dd className="font-medium text-slate-800">{selectedFare}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-600">Traveler</dt><dd className="font-medium text-slate-800">{travelers}</dd></div>{selectedOffer?.provider ? <div className="flex justify-between gap-4"><dt className="text-slate-600">Provider</dt><dd className="max-w-[60%] truncate font-medium text-slate-800">{selectedOffer.provider}</dd></div> : null}</dl>
    <div className="my-5 border-t border-[#E2E8F0]" /><div className="flex items-end justify-between gap-4"><p className="text-sm font-semibold">Total per traveler</p>{price ? <p className="text-[30px] font-bold leading-none text-[#075EE8]" aria-label={price.ariaLabel}>{price.formatted}</p> : null}</div>
    <button type="button" disabled={!selectedOffer || redirecting} onClick={onContinue} className="mt-6 h-[52px] w-full rounded-[9px] bg-[#075EE8] text-base font-semibold text-white transition hover:bg-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{redirecting ? "Opening provider…" : "Continue to provider"}</button>
    <p className="mt-3 text-center text-xs leading-5 text-slate-500">You’ll complete your booking on the provider’s website.</p><p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700"><LockKeyhole className="h-4 w-4" aria-hidden="true" /> Secure provider handoff</p>
    {error ? <p role="alert" className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
    <div className="mt-5 flex gap-3 rounded-[10px] border border-blue-200 bg-blue-50/60 p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#075EE8]" aria-hidden="true" /><div><p className="text-xs font-medium text-slate-700">Price and availability are confirmed by the provider before purchase.</p><p className="mt-1 text-xs text-slate-500">Review the provider’s final fare terms before booking.</p></div></div>
  </aside>;
}

function ProviderMark({ provider }: { provider: PublicFlightResult }) { return provider.airlineLogo ? <Image src={provider.airlineLogo} alt={`${provider.provider} logo`} width={40} height={40} className="h-10 w-10 rounded-lg border border-slate-100 bg-white object-contain p-1" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-base font-bold text-[#075EE8]" aria-hidden="true">{provider.provider.trim().charAt(0).toUpperCase()}</span>; }

function FlightDetailsSkeleton({ resultsHref }: { resultsHref: string }) { return <main className="flex-1 bg-[#F7F9FC] py-7"><div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8"><Link href={resultsHref} className="inline-flex items-center gap-2 text-sm font-semibold text-[#075EE8]"><ArrowLeft className="h-4 w-4" /> Back to results</Link><div role="status" aria-label="Loading flight details" className="mt-4 grid gap-7 lg:grid-cols-[minmax(0,2.25fr)_minmax(300px,0.95fr)]"><div className="h-[720px] animate-pulse rounded-[15px] border border-slate-200 bg-white" /><div className="h-[620px] animate-pulse rounded-[15px] border border-slate-200 bg-white" /></div></div></main>; }
function FlightDetailsUnavailable({ resultsHref, message }: { resultsHref: string; message: string }) { return <main className="flex-1 bg-[#F7F9FC] py-10"><div className="mx-auto max-w-3xl px-4"><Link href={resultsHref} className="inline-flex items-center gap-2 text-sm font-semibold text-[#075EE8]"><ArrowLeft className="h-4 w-4" /> Back to results</Link><section className="mt-4 rounded-[15px] border border-slate-200 bg-white p-8"><h1 className="text-xl font-bold">Flight quote unavailable</h1><p className="mt-2 text-sm text-slate-600">{message || "Please return to results and search again for current prices."}</p></section></div></main>; }

function primaryLeg(flight: PublicFlightResult): FlightLeg { return flight.legs?.[0] ?? { direction: "leg", originAirport: flight.originAirport, destinationAirport: flight.destinationAirport, departureTime: flight.departureTime, arrivalTime: flight.arrivalTime, duration: flight.duration, durationMinutes: flight.durationMinutes, stops: flight.stops, layovers: flight.layovers, segments: [] }; }
function readTravelerSummary(params: URLSearchParams) { const adults = Number(params.get("adults") || 1); const children = Number(params.get("children") || 0); const infants = Number(params.get("infants") || 0); const count = Math.max(1, adults + children + infants); const parts = [adults ? `${adults} ${adults === 1 ? "adult" : "adults"}` : "", children ? `${children} ${children === 1 ? "child" : "children"}` : "", infants ? `${infants} ${infants === 1 ? "infant" : "infants"}` : ""].filter(Boolean); return { count, label: parts.join(", ") || "1 adult" }; }
function formatTripDate(value: string, locale: string) { const date = new Date(value.includes("T") ? value : `${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }).format(date); }
function formatTime(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function formatStops(stops: number) { return stops === 0 ? "Non-stop" : `${stops} ${stops === 1 ? "stop" : "stops"}`; }
function titleCase(value: string) { return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function cleanLocation(value: string) { return value.split("(")[0].split(",")[0].trim() || value; }
