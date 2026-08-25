"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  Luggage,
  Leaf,
  Info,
  MinusCircle,
  Pencil,
  Plane,
} from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { canUseOfferAirlineLogo, compactFareTerms, resolveSegmentCarrierName } from "@/components/results/flightDetails/flightDetailsPresentation";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import type {
  FlightDetailsFareChoice,
  FlightDetailsOffer,
  FlightDetailsResponse,
} from "@/lib/flights/flightDetailsContract";
import { flightDetailsRouteLabel, flightDetailsTotalLabel } from "@/lib/flights/flightDetailsContract";
import type { FlightLeg, FlightProviderCondition, FlightSegment } from "@/lib/types";

type FareTab = "details" | "conditions" | "extras";
const fareTabs: Array<{ id: FareTab; label: string }> = [
  { id: "details", label: "Fare details" },
  { id: "conditions", label: "Fare conditions" },
  { id: "extras", label: "Optional extras" },
];

export function StandaloneFlightDetails({ id, resultsHref }: { id: string; resultsHref: string }) {
  const searchParams = useSearchParams();
  const detailsQuery = searchParams.toString();
  const { locale } = useLocale();
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const [response, setResponse] = useState<FlightDetailsResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const [selectedFareKey, setSelectedFareKey] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [activeTab, setActiveTab] = useState<FareTab>("details");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fareButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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

  const available = response?.status === "available" ? response : null;
  const fareChoices = useMemo(() => available?.fareChoices ?? [], [available]);
  const selectedFare = fareChoices.find((fare) => fare.key === selectedFareKey) ?? fareChoices[0];
  const selectedOffer = selectedFare?.offer ?? available?.flight;
  const handoff = selectedFare?.handoff ?? available?.handoff ?? { available: false as const };
  const canContinue = Boolean(selectedOffer && handoff.available);

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
      const data = (await result.json()) as { url?: string; error?: string; code?: string };
      if (result.status === 409 && data.code === "offer_changed") {
        setNotice("The provider updated this offer. Review the refreshed price and fare terms before continuing.");
        setReloadToken((value) => value + 1);
        setRedirecting(false);
        return;
      }
      if (!result.ok || !data.url) throw new Error(data.error || "This provider link is unavailable.");
      window.location.href = data.url;
    } catch (redirectError) {
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
  const travelers = readTravelerSummary(available.search);
  const tripType = available.search.tripType === "round-trip" ? "Round-trip" : available.search.tripType === "multi-city" ? `Multi-city • ${legs.length} flights` : "One-way";
  const tripLine = `${tripType} • ${travelers.count} ${travelers.count === 1 ? "traveler" : "travelers"}`;
  const date = available.search.tripType === "multi-city"
    ? available.search.legs.map((leg) => formatTripDate(leg.departureDate, locale)).join(" • ")
    : available.search.returnDate
    ? `${formatTripDate(available.search.departureDate, locale)} – ${formatTripDate(available.search.returnDate, locale)}`
    : formatTripDate(available.search.departureDate, locale);
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

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = (index + offset + fareTabs.length) % fareTabs.length;
    setActiveTab(fareTabs[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <main className="flex-1 bg-white pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-2 text-[#142033] sm:bg-[#F7F9FC] sm:pt-4 lg:pb-16 lg:pt-3">
      <div className="mx-auto w-full max-w-[1470px] px-0 sm:px-6 lg:px-[34px]">
        <Link href={resultsHref} className="mb-3 ml-4 inline-flex min-h-10 items-center gap-2 text-[13px] font-semibold text-[#075EE8] hover:text-[#004BB8] focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35 sm:ml-0">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to results
        </Link>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.45fr)_minmax(310px,0.95fr)] lg:gap-7">
          <section className="min-w-0 border-y border-[#E2E8F0] bg-white p-4 sm:rounded-[13px] sm:border sm:p-6 sm:shadow-[0_3px_15px_rgba(15,23,42,0.045)] lg:p-6" aria-labelledby="flight-details-heading">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 ref={headingRef} id="flight-details-heading" tabIndex={-1} className="text-[22px] font-bold leading-tight tracking-[-0.025em] text-slate-950 outline-none sm:text-[26px]">{route}</h1>
                <p className="mt-1.5 text-[13px] font-medium text-slate-600">{tripLine}</p>
              </div>
              <Link href={resultsHref} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#075EE8] bg-white px-3 text-xs font-semibold text-[#075EE8] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/35 sm:px-4 sm:text-sm">
                <Pencil className="h-4 w-4" aria-hidden="true" /> Edit search
              </Link>
            </div>
            <div className="mt-5 space-y-4">{legs.map((leg, index) => <ItineraryCard key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}`} leg={leg} label={available.search.tripType === "multi-city" ? `FLIGHT ${index + 1}` : index === 0 ? "OUTBOUND" : "RETURN"} locale={locale} offerAirlineName={flight.airlineName} offerAirlineLogo={flight.airlineLogo} />)}</div>

            <h2 className="mb-3 mt-6 text-[18px] font-semibold leading-tight text-slate-950">Pick your fare</h2>
            <div role="radiogroup" aria-label="Available fares" className={`min-w-0 ${fareChoices.length > 1 ? "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:snap-none sm:overflow-visible sm:pb-0" : "grid gap-3"} ${fareChoices.length === 1 ? "max-w-[310px]" : fareChoices.length === 2 ? "sm:grid-cols-2 lg:max-w-[632px]" : fareChoices.length === 3 ? "sm:grid-cols-2 md:grid-cols-3 lg:max-w-[954px]" : "sm:grid-cols-2 xl:max-w-[1276px] xl:grid-cols-4"}`}>
              {fareChoices.map((fare, index) => {
                const selected = fare.key === selectedFare?.key;
                const price = formatDisplayPrice({ amount: fare.offer.price, sourceCurrency: fare.offer.currency, displayCurrency: selectedOption.currency, convertUsdEstimate: true, rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback });
                const compactTerms = compactFareTerms(fare.distinguishingTerms, available.search.tripType);
                return <button key={fare.key} ref={(element) => { fareButtonRefs.current[index] = element; }} type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1} onClick={() => selectFare(index)} onKeyDown={(event) => handleFareKeyDown(event, index)} className={`min-w-0 max-w-[310px] rounded-[10px] border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/40 ${fareChoices.length > 1 ? "w-[min(82vw,310px)] shrink-0 snap-start sm:w-full sm:shrink" : "w-[min(100%,310px)]"} ${selected ? "border-[1.5px] border-[#075EE8] bg-[#075EE8]/[0.02]" : "border-[#E2E8F0] bg-white hover:border-slate-300"}`}>
                  <div className="flex items-start gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#075EE8]"><Luggage className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0"><p className="text-[13px] font-semibold text-slate-950">{fare.label}</p><p className="text-[20px] font-bold leading-5 text-[#075EE8] lg:text-[19px]" aria-label={price.ariaLabel}>{price.formatted}</p></div></div>
                  {compactTerms.length ? <ul className="mt-2 space-y-1">{compactTerms.map(({ term, text }, termIndex) => <FareTerm key={`${term.category}-${term.legDirection || "trip"}-${term.text}-${termIndex}`} term={term} text={text} compact />)}</ul> : null}
                </button>;
              })}
            </div>

            <div className="mt-5 grid min-w-0 grid-cols-3 sm:flex sm:flex-nowrap" role="tablist" aria-label="Fare information">{fareTabs.map((tab, index) => <button key={tab.id} ref={(element) => { tabRefs.current[index] = element; }} id={`fare-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`fare-panel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`min-h-11 min-w-0 whitespace-nowrap border-b-2 px-0 text-center text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#075EE8]/35 sm:px-4 sm:text-sm ${activeTab === tab.id ? "border-[#075EE8] text-[#075EE8]" : "border-transparent text-slate-700 hover:text-slate-950"}`}>{tab.label}</button>)}</div>
            <FarePanel activeTab={activeTab} offer={selectedOffer} locale={locale} />
            <MobileCheckoutDock travelerCount={travelers.count} price={providerPrice} redirecting={redirecting} handoff={handoff} canContinue={canContinue} onContinue={continueToProvider} error={error || notice} />
          </section>
          <TripSidebar tripType={available.search.tripType} legs={legs} route={route} date={date} tripLine={tripLine} travelers={travelers.label} travelerCount={travelers.count} selectedFare={selectedFare?.label || selectedOffer.cabinClass || ""} fareTerms={selectedFare?.distinguishingTerms ?? []} price={providerPrice} locale={locale} redirecting={redirecting} handoff={handoff} canContinue={canContinue} onContinue={continueToProvider} error={error || notice} />
        </div>
      </div>
    </main>
  );
}

function ItineraryCard({ leg, label, locale, offerAirlineName, offerAirlineLogo }: { leg: FlightLeg; label: string; locale: string; offerAirlineName: string; offerAirlineLogo?: string | null }) {
  return <section className="overflow-hidden rounded-[10px] border border-[#E2E8F0] bg-white" aria-labelledby={`${label.toLowerCase()}-heading`}>
    <div className="px-3 pt-3 sm:px-4 sm:pt-4">
      <h2 id={`${label.toLowerCase()}-heading`} className="inline-flex rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold tracking-[0.04em] text-[#075EE8]">{label}</h2>
    </div>
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(82px,1.1fr)_minmax(0,1fr)] items-center gap-2 px-3 pb-4 pt-3 sm:gap-5 sm:px-4 lg:px-5 lg:pb-5">
      <AirportTime time={leg.departureTime} airport={leg.originAirport} city={leg.segments[0]?.originDetails?.cityName || ""} name={leg.segments[0]?.originDetails?.name} terminal={leg.segments[0]?.originDetails?.terminal} timeZone={leg.segments[0]?.originDetails?.timeZone} locale={locale} />
      <div className="min-w-0 text-center"><p className="mb-2 text-[11px] font-medium text-slate-600">{leg.duration}</p><div className="flex items-center gap-1 text-[#075EE8]"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#075EE8]" /><span className="min-w-2 flex-1 border-t border-dashed border-[#075EE8]" /><Plane className="h-[18px] w-[18px] shrink-0 rotate-45" aria-hidden="true" /><span className="min-w-2 flex-1 border-t border-dashed border-[#075EE8]" /><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#075EE8]" /></div><p className="mt-2 text-[11px] font-medium text-slate-600">{formatStops(leg.stops, technicalStopCount(leg))}</p></div>
      <div className="text-right"><AirportTime time={leg.arrivalTime} airport={leg.destinationAirport} city={leg.segments.at(-1)?.destinationDetails?.cityName || ""} name={leg.segments.at(-1)?.destinationDetails?.name} terminal={leg.segments.at(-1)?.destinationDetails?.terminal} timeZone={leg.segments.at(-1)?.destinationDetails?.timeZone} locale={locale} /></div>
    </div>
    <div className="border-t border-[#E2E8F0] px-3 py-3.5 sm:px-4 lg:px-5">
      <ol className="space-y-3">
        {leg.segments.map((segment, index) => (
          <li key={`${segment.originAirport}-${segment.destinationAirport}-${segment.departureTime}`}>
            {index > 0 && leg.layovers[index - 1] ? <p className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">Connection at {leg.layovers[index - 1].airport} • {leg.layovers[index - 1].duration}</p> : null}
            <div className="flex items-start gap-3">
              <SegmentAirlineMark segment={segment} offerAirlineName={offerAirlineName} offerAirlineLogo={offerAirlineLogo} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="font-semibold text-slate-900">{segment.originAirport} → {segment.destinationAirport}</p><p className="text-xs text-slate-600">{formatTime(segment.departureTime, locale)} – {formatTime(segment.arrivalTime, locale)}</p></div>
                <p className="mt-1 text-xs text-slate-600">{resolveSegmentCarrierName(segment, offerAirlineName)}{segment.flightNumber || segment.marketingFlightNumber ? ` • Flight ${segment.flightNumber || segment.marketingFlightNumber}` : ""}</p>
                {segment.operatingCarrier && segment.marketingCarrier && (segment.operatingCarrier.name !== segment.marketingCarrier.name || segment.operatingFlightNumber !== segment.marketingFlightNumber) ? <p className="mt-1 text-xs text-slate-600">Operated by {segment.operatingCarrier.name}{segment.operatingFlightNumber ? ` • Flight ${segment.operatingFlightNumber}` : ""}</p> : null}
                {segment.aircraft?.name || segment.aircraft?.iataCode ? <p className="mt-1 text-xs text-slate-600">Aircraft: {segment.aircraft.name || segment.aircraft.iataCode}{segment.aircraft.name && segment.aircraft.iataCode ? ` (${segment.aircraft.iataCode})` : ""}</p> : null}
                {segment.distanceKm !== undefined ? <p className="mt-1 text-xs text-slate-600">Flight distance: {formatDistanceKm(segment.distanceKm, locale)}</p> : null}
              </div>
            </div>
            {segment.technicalStops?.map((stop) => <div key={`${stop.airport.iataCode}-${stop.arrivalTime || "stop"}`} className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-slate-700"><p>Technical stop at {stop.airport.iataCode}{stop.airport.name ? ` — ${stop.airport.name}` : ""}{stop.duration ? ` • ${stop.duration}` : ""}</p>{stop.arrivalTime || stop.departureTime ? <p className="mt-1 font-normal">{stop.arrivalTime ? `Arrives ${formatTime(stop.arrivalTime, locale)}` : ""}{stop.arrivalTime && stop.departureTime ? " • " : ""}{stop.departureTime ? `Departs ${formatTime(stop.departureTime, locale)}` : ""}</p> : null}</div>)}
          </li>
        ))}
      </ol>
    </div>
  </section>;
}

function AirportTime({ time, airport, city, name, terminal, timeZone, locale }: { time: string; airport: string; city: string; name?: string; terminal?: string; timeZone?: string; locale: string }) { return <div className="min-w-0"><p className="text-[15px] font-bold sm:text-[17px]">{formatTime(time, locale)}</p><p className="mt-1 text-sm font-bold">{airport}</p>{name ? <p className="mt-1 break-words text-[10px] leading-4 text-slate-600 sm:text-xs">{name}</p> : null}{city && city !== airport ? <p className="mt-1 break-words text-[10px] leading-4 text-slate-600 sm:text-xs">{city}</p> : null}{terminal ? <p className="mt-1 text-[10px] font-medium leading-4 text-slate-600 sm:text-xs">Terminal {terminal}</p> : null}{timeZone ? <p className="mt-1 break-words text-[10px] leading-4 text-slate-600 sm:text-xs">Time zone: {timeZone}</p> : null}</div>; }

function SegmentAirlineMark({ segment, offerAirlineName, offerAirlineLogo }: { segment: FlightSegment; offerAirlineName: string; offerAirlineLogo?: string | null }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const carrierName = resolveSegmentCarrierName(segment, offerAirlineName);
  const canUseOfferLogo = canUseOfferAirlineLogo(segment, offerAirlineName, offerAirlineLogo);
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#075EE8]" aria-label={`${carrierName} airline mark`}>{canUseOfferLogo && !logoFailed ? <Image src={offerAirlineLogo!} alt="" width={24} height={24} className="h-6 w-6 object-contain" onError={() => setLogoFailed(true)} /> : <Plane className="h-4 w-4 rotate-45" aria-hidden="true" />}</span>;
}

function FareTerm({ term, text = term.text, compact = false }: { term: FlightDetailsFareChoice["distinguishingTerms"][number]; text?: string; compact?: boolean }) {
  const Icon = term.semantic === "positive" ? Check : term.semantic === "negative" ? MinusCircle : Info;
  const iconClass = term.semantic === "positive" ? "border-emerald-500 text-emerald-600" : "border-slate-300 text-slate-500";
  return <li className={`flex min-w-0 items-start text-slate-700 ${compact ? "gap-1.5 text-[12px] leading-4" : "gap-2 text-[13px] leading-5"}`}><span className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full border ${compact ? "h-4 w-4" : "h-4 w-4"} ${iconClass}`}><Icon className="h-2.5 w-2.5" aria-hidden="true" /></span><span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] [text-wrap:pretty] [word-break:normal]">{text}</span></li>;
}

function FarePanel({ activeTab, offer, locale }: { activeTab: FareTab; offer: FlightDetailsOffer; locale: string }) {
  const details = offer.providerDetails;
  const conditions = details?.conditions ?? [];
  const optionalServices = details?.optionalServices ?? [];
  const legalLinks = carrierConditionsLinks(offer);
  if (activeTab === "conditions") return <section id="fare-panel-conditions" role="tabpanel" aria-labelledby="fare-tab-conditions" className="rounded-[10px] border border-[#E2E8F0] p-4 sm:p-5"><h2 className="text-sm font-semibold text-slate-950">Fare conditions</h2>{conditions.length ? <ul className="mt-3 space-y-3">{conditions.map((condition, index) => <li key={`${condition.scope}-${condition.category}-${index}`} className="text-sm text-slate-700"><p>{conditionLabel(condition)}</p>{condition.penaltyAmount !== undefined && condition.penaltyCurrency ? <p className="mt-1 text-xs text-slate-500">Penalty: {formatSourceMoney(condition.penaltyAmount, condition.penaltyCurrency, locale)}</p> : null}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600">Conditions not supplied by the provider.</p>}{details?.passengerIdentityDocumentsRequired ? <p className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-slate-700">Passport information is required by the airline to complete booking.</p> : null}{details?.supportedIdentityDocumentTypes?.length ? <p className="mt-4 text-sm text-slate-700"><span className="font-semibold">Supported identity documents:</span> {details.supportedIdentityDocumentTypes.map(titleCase).join(", ")}</p> : null}{details?.offerOwner ? <p className="mt-4 text-sm text-slate-700"><span className="font-semibold">Offer airline:</span> {details.offerOwner.name}{details.offerOwner.iataCode ? ` (${details.offerOwner.iataCode})` : ""}</p> : null}{legalLinks.length ? <div className="mt-4 text-sm"><p className="font-semibold text-slate-900">Airline conditions</p><ul className="mt-1 space-y-1">{legalLinks.map((link) => <li key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#075EE8] hover:underline">{link.name} conditions of carriage</a></li>)}</ul></div> : null}{details?.updatedAt ? <p className="mt-4 text-xs text-slate-500">Provider offer last updated {formatProviderTimestamp(details.updatedAt, locale)}</p> : null}</section>;
  if (activeTab === "extras") return <section id="fare-panel-extras" role="tabpanel" aria-labelledby="fare-tab-extras" className="rounded-[10px] border border-[#E2E8F0] p-4 sm:p-5"><h2 className="text-sm font-semibold text-slate-950">Optional extras</h2>{optionalServices.length ? <ul className="mt-3 space-y-3">{optionalServices.map((service, index) => <li key={`${service.type}-${service.journeyContext || index}`} className="text-sm text-slate-700"><p className="font-medium">{service.description}</p><p>{formatSourceMoney(service.price, service.currency, locale)}{service.pricedPerTraveler ? " each" : ""}</p>{service.travelerCount ? <p className="text-xs text-slate-500">Available for {service.travelerCount} {service.travelerCount === 1 ? "traveler" : "travelers"}</p> : null}{service.maximumQuantity !== undefined ? <p className="text-xs text-slate-500">{service.pricedPerTraveler ? "Maximum quantity per traveler" : "Maximum quantity"}: {service.maximumQuantity}</p> : null}{service.journeyContext ? <p className="text-xs text-slate-500">{service.journeyContext}</p> : null}</li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No optional services supplied by the provider.</p>}{details?.supportedLoyaltyProgrammes?.length ? <p className="mt-4 text-sm text-slate-700"><span className="font-semibold">Supported loyalty airline codes:</span> {details.supportedLoyaltyProgrammes.join(", ")}</p> : null}</section>;
  return <FareDetails offer={offer} locale={locale} />;
}

function FareDetails({ offer, locale }: { offer: FlightDetailsOffer; locale: string }) {
  const details = offer.providerDetails;
  const segmentCabins = (offer.legs ?? []).flatMap((leg) => leg.segments.flatMap((segment) =>
    (segment.cabinDetails ?? []).map((cabin) => ({ segment, cabin })),
  ));
  return <section id="fare-panel-details" role="tabpanel" aria-labelledby="fare-tab-details" className="rounded-[10px] border border-[#E2E8F0] p-4 sm:p-5">
    <div className="grid gap-6 lg:grid-cols-2 lg:divide-x lg:divide-[#E2E8F0]">
      <DetailGroup title="Cabin and fare by flight">{segmentCabins.length ? <div className="space-y-4">{segmentCabins.map(({ segment, cabin }, index) => <div key={`${segment.departureTime}-${JSON.stringify(cabin)}-${index}`} className="space-y-1 text-sm text-slate-700"><p className="font-semibold text-slate-900">{segment.originAirport} → {segment.destinationAirport}{segment.marketingFlightNumber || segment.flightNumber ? ` • ${segment.marketingFlightNumber || segment.flightNumber}` : ""}</p><p>{[cabin.fareBrandName && `Fare: ${cabin.fareBrandName}`, cabin.cabinClass && `Cabin: ${titleCase(cabin.cabinClass)}`, cabin.cabinMarketingName && `Cabin product: ${cabin.cabinMarketingName}`, cabin.fareBasisCode && `Fare basis: ${cabin.fareBasisCode}`].filter(Boolean).join(" • ")}</p>{amenityLines(cabin).map((line) => <p key={line}>{line}</p>)}</div>)}</div> : <p className="text-sm text-slate-600">Additional cabin details not supplied by the provider.</p>}</DetailGroup>
      <DetailGroup title="Provider source price breakdown">{details?.price ? <dl className="space-y-2 text-sm">{details.price.baseAmount !== undefined && details.price.baseCurrency ? <PriceRow label="Base fare" amount={details.price.baseAmount} currency={details.price.baseCurrency} locale={locale} /> : null}{details.price.taxAmount !== undefined && details.price.taxCurrency ? <PriceRow label="Taxes" amount={details.price.taxAmount} currency={details.price.taxCurrency} locale={locale} /> : null}<PriceRow label="Trip total" amount={details.price.totalAmount} currency={details.price.totalCurrency} locale={locale} /></dl> : <p className="text-sm text-slate-600">Price breakdown not supplied by the provider.</p>}</DetailGroup>
    </div>
    {details?.totalEmissionsKg !== undefined ? <EmissionsRow amount={details.totalEmissionsKg} locale={locale} /> : null}
    {details?.updatedAt ? <p className="mt-4 text-xs text-slate-500">Provider offer last updated {formatProviderTimestamp(details.updatedAt, locale)}</p> : null}
  </section>;
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const displayTitle = title === "Cabin and fare by flight" ? "Cabin & Flight" : title === "Provider source price breakdown" ? "Price breakdown" : title;
  return <div className="lg:px-1"><h3 className="mb-2 text-sm font-semibold text-slate-950">{displayTitle}</h3>{children}</div>;
}
function PriceRow({ label, amount, currency, locale }: { label: string; amount: number; currency: string; locale: string }) { return <div className="flex justify-between gap-3"><dt className="text-slate-600">{label}</dt><dd className="font-medium">{formatSourceMoney(amount, currency, locale)}</dd></div>; }
function formatSourceMoney(amount: number, currency: string, locale: string) { try { return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code" }).format(amount); } catch { return `${currency} ${amount.toFixed(2)}`; } }
function amenityLines(cabin: NonNullable<FlightLeg["segments"][number]["cabinDetails"]>[number]) { const lines: string[] = []; if (cabin.amenities?.wifi) lines.push(`Wi-Fi: ${cabin.amenities.wifi.state === "included" ? cabin.amenities.wifi.cost ? `Available (${titleCase(cabin.amenities.wifi.cost)})` : "Available" : cabin.amenities.wifi.state === "not-included" ? "Not available" : "Not supplied by provider"}`); if (cabin.amenities?.power) lines.push(`Power: ${cabin.amenities.power.state === "included" ? "Available" : cabin.amenities.power.state === "not-included" ? "Not available" : "Not supplied by provider"}`); if (cabin.amenities?.seat) lines.push(`Seat: ${[cabin.amenities.seat.type && titleCase(cabin.amenities.seat.type), cabin.amenities.seat.pitch && `${cabin.amenities.seat.pitch} in pitch`, cabin.amenities.seat.legroom && `${cabin.amenities.seat.legroom.toUpperCase() === "N/A" ? "N/A" : titleCase(cabin.amenities.seat.legroom)} legroom`].filter(Boolean).join(", ")}`); return lines; }
function conditionLabel(condition: FlightProviderCondition) { const scope = condition.scope === "trip" ? "Whole trip" : condition.legIndex !== undefined ? `Flight ${condition.legIndex + 1}` : condition.scope === "outbound" ? "Outbound only" : condition.scope === "return" ? "Return only" : "Leg"; const category = condition.category === "change" ? "Changes" : titleCase(condition.category); const permission = condition.category === "change" || condition.category === "refund"; const state = condition.state === "allowed" ? permission ? "Allowed" : "Included" : condition.state === "not-allowed" ? permission ? "Not allowed" : "Not included" : "Not supplied by provider"; return `${scope} • ${category}: ${state}`; }
function formatProviderTimestamp(value: string, locale: string) { const timestamp = new Date(value); return Number.isNaN(timestamp.getTime()) ? value : new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(timestamp); }
function formatDistanceKm(distanceKm: number, locale: string) { return `${new Intl.NumberFormat(locale, { maximumFractionDigits: distanceKm >= 100 ? 0 : 1 }).format(distanceKm)} km`; }
function carrierConditionsLinks(offer: FlightDetailsOffer) {
  const entries = (offer.legs ?? []).flatMap((leg) => leg.segments.flatMap((segment) => [segment.marketingCarrier, segment.operatingCarrier])).flatMap((carrier) => carrier?.conditionsOfCarriageUrl ? [{ name: carrier.name, url: carrier.conditionsOfCarriageUrl }] : []);
  if (offer.providerDetails?.offerOwner?.conditionsOfCarriageUrl) entries.push({ name: offer.providerDetails.offerOwner.name, url: offer.providerDetails.offerOwner.conditionsOfCarriageUrl });
  return [...new Map(entries.map((entry) => [entry.url, entry])).values()];
}

function EmissionsRow({ amount, locale }: { amount: number; locale: string }) { return <div className="mt-4 flex min-h-9 items-center justify-between gap-3 rounded-md bg-emerald-50/70 px-3 py-2 text-xs"><span className="inline-flex items-center gap-2 font-medium text-emerald-700"><Leaf className="h-4 w-4" aria-hidden="true" /> Estimated CO₂ emissions</span><span className="inline-flex items-center gap-2 text-right font-medium text-slate-800">{amount.toLocaleString(locale)} kg for this offer <Info className="h-3.5 w-3.5" aria-hidden="true" /></span></div>; }

function CheckoutButton({ redirecting, handoff, canContinue, onContinue, dock = false }: { redirecting: boolean; handoff: FlightDetailsFareChoice["handoff"]; canContinue: boolean; onContinue: () => void; dock?: boolean }) { return <button type="button" aria-label={handoff.available ? "Continue to checkout" : "Checkout currently unavailable"} aria-disabled={!canContinue || redirecting} disabled={!canContinue || redirecting} onClick={onContinue} className={`${dock ? "inline-flex min-h-[50px] min-w-[168px] flex-1 sm:max-w-[260px]" : "mt-4 inline-flex min-h-[50px] w-full"} items-center justify-center gap-2 whitespace-nowrap rounded-[8px] bg-[#075EE8] px-4 text-sm font-semibold text-white transition hover:bg-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`}><LockKeyhole className="h-4 w-4" aria-hidden="true" />{redirecting ? "Opening checkout…" : "Continue to checkout"}</button>; }

function MobileCheckoutDock({ travelerCount, price, redirecting, handoff, canContinue, onContinue, error }: { travelerCount: number; price: ReturnType<typeof formatDisplayPrice> | null; redirecting: boolean; handoff: FlightDetailsFareChoice["handoff"]; canContinue: boolean; onContinue: () => void; error: string }) { return <section className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#E2E8F0] bg-white px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.10)] lg:hidden" aria-labelledby="mobile-trip-total-heading"><div className="mx-auto max-w-3xl">{error ? <p role="alert" className="mb-2 line-clamp-2 text-xs font-medium leading-4 text-red-700">{error}</p> : null}<div className="flex items-center gap-3"><div className="min-w-0 flex-1"><h2 id="mobile-trip-total-heading" className="text-[11px] font-semibold leading-4 text-slate-600">{flightDetailsTotalLabel(travelerCount)}</h2>{price ? <p className="truncate text-[22px] font-bold leading-6 text-[#075EE8]" aria-label={price.ariaLabel}>{price.formatted}</p> : <p className="text-sm font-semibold text-slate-500">Price unavailable</p>}</div><CheckoutButton dock redirecting={redirecting} handoff={handoff} canContinue={canContinue} onContinue={onContinue} /></div></div></section>; }

function TripSidebar({ tripType, legs, route, date, tripLine, travelers, travelerCount, selectedFare, fareTerms, price, locale, redirecting, handoff, canContinue, onContinue, error }: { tripType: "one-way" | "round-trip" | "multi-city"; legs: FlightLeg[]; route: string; date: string; tripLine: string; travelers: string; travelerCount: number; selectedFare: string; fareTerms: FlightDetailsFareChoice["distinguishingTerms"]; price: ReturnType<typeof formatDisplayPrice> | null; locale: string; redirecting: boolean; handoff: FlightDetailsFareChoice["handoff"]; canContinue: boolean; onContinue: () => void; error: string }) {
  return <aside className="hidden self-start rounded-[13px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_18px_rgba(15,23,42,0.05)] lg:block" aria-labelledby="your-trip-heading">
    <h2 id="your-trip-heading" className="text-xl font-bold">Your trip</h2><p className="mt-4 text-base font-semibold">{route}</p><p className="mt-1 text-xs leading-5 text-slate-600">{date} • {tripLine}</p>
    <div className="my-5 border-t border-[#E2E8F0]" />
    <div className="space-y-5">{legs.map((leg, index) => <div key={`${leg.direction}-${leg.departureTime}`}><p className="text-xs font-bold tracking-[0.12em] text-[#075EE8]">{tripType === "multi-city" ? `FLIGHT ${index + 1}` : index === 0 ? "OUTBOUND" : "RETURN"}</p><p className="mt-1 text-sm font-semibold">{leg.originAirport} → {leg.destinationAirport}</p><div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600"><span>{formatTime(leg.departureTime, locale)}</span><span>{leg.duration} • {formatStops(leg.stops, technicalStopCount(leg))}</span><span>{formatTime(leg.arrivalTime, locale)}</span></div></div>)}</div>
    <div className="my-5 border-t border-[#E2E8F0]" /><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-600">Fare</dt><dd className="font-medium text-slate-800">{selectedFare}</dd></div>{fareTerms.length ? <div><dt className="text-slate-600">Fare terms</dt><dd className="mt-1 space-y-1 text-xs leading-5 text-slate-700">{fareTerms.map((term) => <p key={`${term.category}-${term.legDirection || "trip"}-${term.text}`}>{term.text}</p>)}</dd></div> : null}<div className="flex justify-between gap-4"><dt className="text-slate-600">Traveler</dt><dd className="font-medium text-slate-800">{travelers}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-600">Handoff provider</dt><dd className="max-w-[60%] text-right font-medium text-slate-800">{handoff.available ? handoff.providerName : "Unavailable"}</dd></div></dl>
    <div className="my-5 border-t border-[#E2E8F0]" /><div className="flex items-end justify-between gap-4"><p className="text-sm font-semibold">{flightDetailsTotalLabel(travelerCount)}</p>{price ? <p className="text-[30px] font-bold leading-none text-[#075EE8]" aria-label={price.ariaLabel}>{price.formatted}</p> : null}</div>
    <CheckoutButton redirecting={redirecting} handoff={handoff} canContinue={canContinue} onContinue={onContinue} />
    {error ? <p role="alert" className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
  </aside>;
}

function FlightDetailsSkeleton({ resultsHref }: { resultsHref: string }) { return <main className="flex-1 bg-white py-7 sm:bg-[#F7F9FC]"><div className="mx-auto max-w-[1500px] px-0 sm:px-6 lg:px-8"><Link href={resultsHref} className="ml-4 inline-flex items-center gap-2 text-sm font-semibold text-[#075EE8] sm:ml-0"><ArrowLeft className="h-4 w-4" /> Back to results</Link><div role="status" aria-label="Loading flight details" className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,2.45fr)_minmax(310px,0.95fr)] lg:gap-7"><div className="h-[720px] animate-pulse border-y border-slate-200 bg-white sm:rounded-[15px] sm:border" /><div className="hidden h-[620px] animate-pulse rounded-[15px] border border-slate-200 bg-white lg:block" /><div className="h-32 animate-pulse border-y border-slate-200 bg-white sm:rounded-[10px] sm:border lg:hidden" /></div></div></main>; }
function FlightDetailsUnavailable({ resultsHref, message }: { resultsHref: string; message: string }) { return <main className="flex-1 bg-white py-10 sm:bg-[#F7F9FC]"><div className="mx-auto max-w-3xl px-0 sm:px-4"><Link href={resultsHref} className="ml-4 inline-flex items-center gap-2 text-sm font-semibold text-[#075EE8] sm:ml-0"><ArrowLeft className="h-4 w-4" /> Back to results</Link><section className="mt-4 border-y border-slate-200 bg-white p-6 sm:rounded-[15px] sm:border sm:p-8"><h1 className="text-xl font-bold">Flight quote unavailable</h1><p className="mt-2 text-sm text-slate-600">{message || "Please return to results and search again for current prices."}</p></section></div></main>; }

function readTravelerSummary(search: { adults: number; children: number; infants: number; travelers: number }) { const { adults, children, infants } = search; const count = search.travelers; const parts = [adults ? `${adults} ${adults === 1 ? "adult" : "adults"}` : "", children ? `${children} ${children === 1 ? "child" : "children"}` : "", infants ? `${infants} ${infants === 1 ? "infant" : "infants"}` : ""].filter(Boolean); return { count, label: parts.join(", ") || "1 adult" }; }
function formatTripDate(value: string, locale: string) { const date = new Date(value.includes("T") ? value : `${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }).format(date); }
function formatTime(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function technicalStopCount(leg: FlightLeg) { return leg.segments.reduce((total, segment) => total + (segment.technicalStops?.length ?? 0), 0); }
function formatStops(connections: number, technicalStops = 0) { const parts = []; if (connections) parts.push(`${connections} ${connections === 1 ? "connection" : "connections"}`); if (technicalStops) parts.push(`${technicalStops} technical ${technicalStops === 1 ? "stop" : "stops"}`); return parts.length ? parts.join(" • ") : "Non-stop"; }
function titleCase(value: string) { return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
