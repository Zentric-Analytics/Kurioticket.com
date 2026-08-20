"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  LockKeyhole,
  Luggage,
  Info,
  MinusCircle,
  Pencil,
  Plane,
} from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import type {
  FlightDetailsFareChoice,
  FlightDetailsOffer,
  FlightDetailsResponse,
} from "@/lib/flights/flightDetailsContract";
import { flightDetailsTotalLabel } from "@/lib/flights/flightDetailsContract";
import type { FlightLeg, FlightProviderCondition } from "@/lib/types";

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
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fareButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
    fareButtonRefs.current[nextIndex]?.focus();
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
  const origin = flight.originAirport;
  const destination = flight.destinationAirport;
  const route = `${cleanLocation(origin)} to ${cleanLocation(destination)}`;
  const travelers = readTravelerSummary(available.search);
  const tripType = available.search.tripType === "round-trip" ? "Round-trip" : "One-way";
  const tripLine = `${tripType} • ${travelers.count} ${travelers.count === 1 ? "traveler" : "travelers"}`;
  const date = available.search.returnDate
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

            <div className="mt-5 space-y-4">
              {legs.map((leg, index) => (
                <ItineraryCard
                  key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}`}
                  leg={leg}
                  label={index === 0 ? "OUTBOUND" : "RETURN"}
                  locale={locale}
                />
              ))}
            </div>

            <h2 className="mb-3.5 mt-7 text-lg font-semibold leading-tight tracking-[-0.01em] text-slate-950 xl:text-[19px]">Pick your fare</h2>
            <div role="radiogroup" aria-label="Available fares" className={`grid gap-4 ${fareChoices.length === 1 ? "max-w-[350px] grid-cols-1" : fareChoices.length === 2 ? "sm:grid-cols-2" : fareChoices.length === 3 ? "md:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4"}`}>
              {fareChoices.map((fare, index) => {
                const selected = fare.key === selectedFare?.key;
                const price = formatDisplayPrice({ amount: fare.offer.price, sourceCurrency: fare.offer.currency, displayCurrency: selectedOption.currency, convertUsdEstimate: true, rates: currencyRates.rates, isFallbackRate: currencyRates.isFallback });
                return (
                  <button key={fare.key} ref={(element) => { fareButtonRefs.current[index] = element; }} type="button" role="radio" aria-checked={selected} tabIndex={selected ? 0 : -1} onClick={() => selectFare(index)} onKeyDown={(event) => handleFareKeyDown(event, index)} className={`relative rounded-[13px] border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/40 ${fareChoices.length === 1 ? "min-h-[160px]" : "min-h-[190px]"} ${selected ? "border-2 border-[#075EE8] bg-[#075EE8]/[0.035]" : "border-[#E2E8F0] bg-white hover:border-slate-300"}`}>
                    <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 ${selected ? "border-[#075EE8]" : "border-slate-300"}`} aria-hidden="true"><span className={`h-2 w-2 rounded-full ${selected ? "bg-[#075EE8]" : "bg-transparent"}`} /></span>
                    <div className="mt-3 flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-[#075EE8]"><Luggage className="h-5 w-5" aria-hidden="true" /></span>
                      <div><p className="text-base font-semibold text-slate-950">{fare.label}</p><p className="text-xl font-bold leading-6 text-[#075EE8]" aria-label={price.ariaLabel}>{price.formatted}</p></div>
                    </div>
                    {fare.offer.fareBrandName && fare.offer.cabinClass ? <p className="mt-2 text-xs font-medium text-slate-600">{titleCase(fare.offer.cabinClass)}</p> : null}
                    {fare.distinguishingTerms.length ? <ul className="mt-4 space-y-2">{fare.distinguishingTerms.map((term) => <FareTerm key={`${term.category}-${term.legDirection || "trip"}-${term.text}`} term={term} />)}</ul> : null}
                  </button>
                );
              })}
            </div>

            <FareDetails offer={selectedOffer} locale={locale} />

          </section>

          <TripSidebar legs={legs} route={route} date={date} tripLine={tripLine} travelers={travelers.label} travelerCount={travelers.count} selectedFare={selectedFare?.label || selectedOffer.cabinClass || ""} fareTerms={selectedFare?.distinguishingTerms ?? []} price={providerPrice} locale={locale} redirecting={redirecting} handoff={handoff} canContinue={canContinue} onContinue={continueToProvider} error={error || notice} />
        </div>
      </div>
    </main>
  );
}

function ItineraryCard({ leg, label, locale }: { leg: FlightLeg; label: "OUTBOUND" | "RETURN"; locale: string }) {
  return <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white" aria-labelledby={`${label.toLowerCase()}-heading`}>
    <div className="border-b border-[#E2E8F0] bg-slate-50 px-5 py-3 lg:px-6">
      <h2 id={`${label.toLowerCase()}-heading`} className="text-sm font-bold tracking-[0.12em] text-[#075EE8]">{label}</h2>
    </div>
    <div className="grid gap-5 p-5 sm:grid-cols-[0.8fr_1.2fr_0.8fr] sm:items-center lg:p-6">
      <AirportTime time={leg.departureTime} airport={leg.originAirport} city={leg.segments[0]?.originDetails?.cityName || ""} name={leg.segments[0]?.originDetails?.name} terminal={leg.segments[0]?.originDetails?.terminal} locale={locale} />
      <div className="text-center"><p className="mb-1 text-xs font-medium text-slate-500">{leg.duration}</p><div className="flex items-center text-slate-400"><Plane className="h-4 w-4 rotate-45 text-[#075EE8]" aria-hidden="true" /><span className="mx-2 h-px flex-1 border-t border-dashed border-slate-300" /><span className="h-1.5 w-1.5 rounded-full bg-slate-400" /></div><p className="mt-1.5 text-xs font-medium text-slate-500">{formatStops(leg.stops, technicalStopCount(leg))}</p></div>
      <div className="text-right"><AirportTime time={leg.arrivalTime} airport={leg.destinationAirport} city={leg.segments.at(-1)?.destinationDetails?.cityName || ""} name={leg.segments.at(-1)?.destinationDetails?.name} terminal={leg.segments.at(-1)?.destinationDetails?.terminal} locale={locale} /></div>
    </div>
    <div className="border-t border-[#E2E8F0] px-5 py-4 lg:px-6">
      <ol className="space-y-3">
        {leg.segments.map((segment, index) => (
          <li key={`${segment.originAirport}-${segment.destinationAirport}-${segment.departureTime}`}>
            {index > 0 && leg.layovers[index - 1] ? <p className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">Connection at {leg.layovers[index - 1].airport} • {leg.layovers[index - 1].duration}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <p className="font-semibold text-slate-900">{segment.originAirport} → {segment.destinationAirport}</p>
              <p className="text-xs text-slate-600">{formatTime(segment.departureTime, locale)} – {formatTime(segment.arrivalTime, locale)}</p>
            </div>
            {segment.airlineName ? <p className="mt-1 text-xs text-slate-600">{segment.airlineName}{segment.flightNumber ? ` • Flight ${segment.flightNumber}` : ""}</p> : null}
            {segment.operatingCarrier && segment.marketingCarrier && (segment.operatingCarrier.name !== segment.marketingCarrier.name || segment.operatingFlightNumber !== segment.marketingFlightNumber) ? <p className="mt-1 text-xs text-slate-600">Operated by {segment.operatingCarrier.name}{segment.operatingFlightNumber ? ` • Flight ${segment.operatingFlightNumber}` : ""}</p> : null}
            {segment.aircraft?.name || segment.aircraft?.iataCode ? <p className="mt-1 text-xs text-slate-600">Aircraft: {segment.aircraft.name || segment.aircraft.iataCode}{segment.aircraft.name && segment.aircraft.iataCode ? ` (${segment.aircraft.iataCode})` : ""}</p> : null}
            {segment.technicalStops?.map((stop) => <p key={`${stop.airport.iataCode}-${stop.arrivalTime || "stop"}`} className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-slate-700">Technical stop at {stop.airport.iataCode}{stop.airport.name ? ` — ${stop.airport.name}` : ""}{stop.duration ? ` • ${stop.duration}` : ""}</p>)}
          </li>
        ))}
      </ol>
    </div>
    <div className="border-t border-[#E2E8F0]"><Metadata icon={Clock3} label="Duration" value={leg.duration} /></div>
  </section>;
}

function AirportTime({ time, airport, city, name, terminal, locale }: { time: string; airport: string; city: string; name?: string; terminal?: string; locale: string }) { return <div className="min-w-0"><p className="text-base font-semibold">{formatTime(time, locale)}</p><p className="mt-1 text-sm font-bold">{airport}</p>{name ? <p className="mt-1 text-xs text-slate-500">{name}</p> : null}{city && city !== airport ? <p className="mt-1 truncate text-xs text-slate-500">{city}</p> : null}{terminal ? <p className="mt-1 text-xs font-medium text-slate-600">Terminal {terminal}</p> : null}</div>; }

function Metadata({ icon: Icon, label, value, divided = false }: { icon: typeof Plane; label: string; value: string; divided?: boolean }) { return <div className={`flex items-center gap-3 px-5 py-4 lg:px-6 ${divided ? "sm:border-l sm:border-[#E2E8F0]" : ""}`}><Icon className="h-5 w-5 text-slate-700" aria-hidden="true" /><div><p className="text-[11px] text-slate-500">{label}</p><p className="mt-0.5 text-xs font-medium text-slate-800">{value}</p></div></div>; }

function FareTerm({ term }: { term: FlightDetailsFareChoice["distinguishingTerms"][number] }) {
  const Icon = term.semantic === "positive" ? Check : term.semantic === "negative" ? MinusCircle : Info;
  const iconClass = term.semantic === "positive" ? "border-emerald-500 text-emerald-600" : "border-slate-300 text-slate-500";
  return <li className="flex items-start gap-2 text-[13px] leading-5 text-slate-700"><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${iconClass}`}><Icon className="h-2.5 w-2.5" aria-hidden="true" /></span>{term.text}</li>;
}

function FareDetails({ offer, locale }: { offer: FlightDetailsOffer; locale: string }) {
  const details = offer.providerDetails;
  const cabins = [...new Map((offer.legs ?? []).flatMap((leg) => leg.segments.flatMap((segment) => segment.cabinDetails ?? [])).map((item) => [JSON.stringify(item), item])).values()];
  const conditions = details?.conditions ?? [];
  const optionalServices = details?.optionalServices ?? [];
  return <section className="mt-7 border-t border-[#E2E8F0] pt-6" aria-labelledby="fare-details-heading">
    <h2 id="fare-details-heading" className="text-lg font-semibold tracking-[-0.01em]">Fare details</h2>
    <div className="mt-4 grid gap-5 sm:grid-cols-2">
      <DetailGroup title="Cabin and fare">{cabins.length ? cabins.map((cabin, index) => <div key={`${JSON.stringify(cabin)}-${index}`} className="space-y-1 text-sm text-slate-700"><p>{[cabin.fareBrandName && `Fare: ${cabin.fareBrandName}`, cabin.cabinClass && `Cabin: ${titleCase(cabin.cabinClass)}`, cabin.cabinMarketingName && `Cabin product: ${cabin.cabinMarketingName}`, cabin.fareBasisCode && `Fare basis: ${cabin.fareBasisCode}`].filter(Boolean).join(" • ")}</p>{amenityLines(cabin).map((line) => <p key={line}>{line}</p>)}</div>) : <p className="text-sm text-slate-600">Additional cabin details not supplied by the provider.</p>}</DetailGroup>
      <DetailGroup title="Price breakdown">{details?.price ? <dl className="space-y-2 text-sm">{details.price.baseAmount !== undefined && details.price.baseCurrency ? <PriceRow label="Base fare" amount={details.price.baseAmount} currency={details.price.baseCurrency} locale={locale} /> : null}{details.price.taxAmount !== undefined && details.price.taxCurrency ? <PriceRow label="Taxes" amount={details.price.taxAmount} currency={details.price.taxCurrency} locale={locale} /> : null}<PriceRow label="Trip total" amount={details.price.totalAmount} currency={details.price.totalCurrency} locale={locale} /></dl> : <p className="text-sm text-slate-600">Price breakdown not supplied by the provider.</p>}</DetailGroup>
      <DetailGroup title="Fare conditions">{conditions.length ? <ul className="space-y-2">{conditions.map((condition) => <li key={`${condition.scope}-${condition.category}`} className="text-sm text-slate-700">{conditionLabel(condition)}</li>)}</ul> : <p className="text-sm text-slate-600">Conditions not supplied by the provider.</p>}</DetailGroup>
      <DetailGroup title="Optional extras">{optionalServices.length ? <ul className="space-y-3">{optionalServices.map((service, index) => <li key={`${service.type}-${service.journeyContext || index}`} className="text-sm text-slate-700"><p className="font-medium">Optional extra</p><p>{service.description} • {formatSourceMoney(service.price, service.currency, locale)}</p>{service.journeyContext ? <p className="text-xs text-slate-500">{service.journeyContext}</p> : null}</li>)}</ul> : <p className="text-sm text-slate-600">No optional services supplied by the provider.</p>}</DetailGroup>
    </div>
    {details?.totalEmissionsKg !== undefined ? <p className="mt-5 text-sm text-slate-700"><span className="font-semibold">Estimated CO₂ emissions</span><br />{details.totalEmissionsKg.toLocaleString(locale)} kg for this offer</p> : null}
    {details?.passengerIdentityDocumentsRequired ? <p className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-slate-700">Passport information is required by the airline to complete booking.</p> : null}
  </section>;
}

function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) { return <div><h3 className="mb-2 text-sm font-semibold text-slate-950">{title}</h3>{children}</div>; }
function PriceRow({ label, amount, currency, locale }: { label: string; amount: number; currency: string; locale: string }) { return <div className="flex justify-between gap-3"><dt className="text-slate-600">{label}</dt><dd className="font-medium">{formatSourceMoney(amount, currency, locale)}</dd></div>; }
function formatSourceMoney(amount: number, currency: string, locale: string) { try { return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount); } catch { return `${currency} ${amount.toFixed(2)}`; } }
function amenityLines(cabin: NonNullable<FlightLeg["segments"][number]["cabinDetails"]>[number]) { const lines: string[] = []; if (cabin.amenities?.wifi) lines.push(`Wi-Fi: ${cabin.amenities.wifi.state === "included" ? cabin.amenities.wifi.cost === "free" ? "Available free" : "Available" : cabin.amenities.wifi.state === "not-included" ? "Not available" : "Not supplied"}`); if (cabin.amenities?.power) lines.push(`Power: ${cabin.amenities.power.state === "included" ? "Available" : cabin.amenities.power.state === "not-included" ? "Not available" : "Not supplied"}`); if (cabin.amenities?.seat) lines.push(`Seat: ${[cabin.amenities.seat.type, cabin.amenities.seat.pitch && `${cabin.amenities.seat.pitch} pitch`, cabin.amenities.seat.legroom && `${cabin.amenities.seat.legroom} legroom`].filter(Boolean).join(", ")}`); return lines; }
function conditionLabel(condition: FlightProviderCondition) { const scope = titleCase(condition.scope); const category = titleCase(condition.category); const state = condition.state === "allowed" ? "Included/allowed" : condition.state === "not-allowed" ? "Not included/not allowed" : "Not supplied"; const penalty = condition.penaltyAmount !== undefined && condition.penaltyCurrency ? ` • Penalty ${condition.penaltyCurrency} ${condition.penaltyAmount.toFixed(2)}` : ""; return `${scope} • ${category}: ${state}${penalty}`; }

function TripSidebar({ legs, route, date, tripLine, travelers, travelerCount, selectedFare, fareTerms, price, locale, redirecting, handoff, canContinue, onContinue, error }: { legs: FlightLeg[]; route: string; date: string; tripLine: string; travelers: string; travelerCount: number; selectedFare: string; fareTerms: FlightDetailsFareChoice["distinguishingTerms"]; price: ReturnType<typeof formatDisplayPrice> | null; locale: string; redirecting: boolean; handoff: FlightDetailsFareChoice["handoff"]; canContinue: boolean; onContinue: () => void; error: string }) {
  return <aside className="rounded-[15px] border border-[#E2E8F0] bg-white p-6 shadow-[0_4px_18px_rgba(15,23,42,0.05)] lg:sticky lg:top-24" aria-labelledby="your-trip-heading">
    <h2 id="your-trip-heading" className="text-xl font-bold">Your trip</h2><p className="mt-4 text-base font-semibold">{route}</p><p className="mt-1 text-xs leading-5 text-slate-600">{date} • {tripLine}</p>
    <div className="my-5 border-t border-[#E2E8F0]" />
    <div className="space-y-5">{legs.map((leg, index) => <div key={`${leg.direction}-${leg.departureTime}`}><p className="text-xs font-bold tracking-[0.12em] text-[#075EE8]">{index === 0 ? "OUTBOUND" : "RETURN"}</p><p className="mt-1 text-sm font-semibold">{leg.originAirport} → {leg.destinationAirport}</p><div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600"><span>{formatTime(leg.departureTime, locale)}</span><span>{leg.duration} • {formatStops(leg.stops, technicalStopCount(leg))}</span><span>{formatTime(leg.arrivalTime, locale)}</span></div></div>)}</div>
    <div className="my-5 border-t border-[#E2E8F0]" /><dl className="space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-600">Fare</dt><dd className="font-medium text-slate-800">{selectedFare}</dd></div>{fareTerms.length ? <div><dt className="text-slate-600">Fare terms</dt><dd className="mt-1 space-y-1 text-xs leading-5 text-slate-700">{fareTerms.map((term) => <p key={`${term.category}-${term.legDirection || "trip"}-${term.text}`}>{term.text}</p>)}</dd></div> : null}<div className="flex justify-between gap-4"><dt className="text-slate-600">Traveler</dt><dd className="font-medium text-slate-800">{travelers}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-600">Handoff provider</dt><dd className="max-w-[60%] text-right font-medium text-slate-800">{handoff.available ? handoff.providerName : "Unavailable"}</dd></div></dl>
    <div className="my-5 border-t border-[#E2E8F0]" /><div className="flex items-end justify-between gap-4"><p className="text-sm font-semibold">{flightDetailsTotalLabel(travelerCount)}</p>{price ? <p className="text-[30px] font-bold leading-none text-[#075EE8]" aria-label={price.ariaLabel}>{price.formatted}</p> : null}</div>
    <button type="button" aria-label={handoff.available ? `Continue to ${handoff.providerName}` : "Booking link currently unavailable"} disabled={!canContinue || redirecting} onClick={onContinue} className="mt-6 h-[52px] w-full rounded-[9px] bg-[#075EE8] text-base font-semibold text-white transition hover:bg-[#004BB8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#075EE8]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{handoff.available ? (redirecting ? `Opening ${handoff.providerName}…` : `Continue to ${handoff.providerName}`) : "Booking link currently unavailable"}</button>
    {handoff.available ? <><p className="mt-3 text-center text-xs leading-5 text-slate-500">You’ll complete your booking on {handoff.providerName}’s website.</p><p className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700"><LockKeyhole className="h-4 w-4" aria-hidden="true" /> Secure provider handoff</p></> : <p className="mt-3 text-center text-xs leading-5 text-slate-500">No verified external booking destination is available for this offer.</p>}
    {error ? <p role="alert" className="mt-4 text-sm font-medium text-red-700">{error}</p> : null}
  </aside>;
}

function FlightDetailsSkeleton({ resultsHref }: { resultsHref: string }) { return <main className="flex-1 bg-[#F7F9FC] py-7"><div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8"><Link href={resultsHref} className="inline-flex items-center gap-2 text-sm font-semibold text-[#075EE8]"><ArrowLeft className="h-4 w-4" /> Back to results</Link><div role="status" aria-label="Loading flight details" className="mt-4 grid gap-7 lg:grid-cols-[minmax(0,2.25fr)_minmax(300px,0.95fr)]"><div className="h-[720px] animate-pulse rounded-[15px] border border-slate-200 bg-white" /><div className="h-[620px] animate-pulse rounded-[15px] border border-slate-200 bg-white" /></div></div></main>; }
function FlightDetailsUnavailable({ resultsHref, message }: { resultsHref: string; message: string }) { return <main className="flex-1 bg-[#F7F9FC] py-10"><div className="mx-auto max-w-3xl px-4"><Link href={resultsHref} className="inline-flex items-center gap-2 text-sm font-semibold text-[#075EE8]"><ArrowLeft className="h-4 w-4" /> Back to results</Link><section className="mt-4 rounded-[15px] border border-slate-200 bg-white p-8"><h1 className="text-xl font-bold">Flight quote unavailable</h1><p className="mt-2 text-sm text-slate-600">{message || "Please return to results and search again for current prices."}</p></section></div></main>; }

function readTravelerSummary(search: { adults: number; children: number; infants: number; travelers: number }) { const { adults, children, infants } = search; const count = search.travelers; const parts = [adults ? `${adults} ${adults === 1 ? "adult" : "adults"}` : "", children ? `${children} ${children === 1 ? "child" : "children"}` : "", infants ? `${infants} ${infants === 1 ? "infant" : "infants"}` : ""].filter(Boolean); return { count, label: parts.join(", ") || "1 adult" }; }
function formatTripDate(value: string, locale: string) { const date = new Date(value.includes("T") ? value : `${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }).format(date); }
function formatTime(value: string, locale: string) { return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function technicalStopCount(leg: FlightLeg) { return leg.segments.reduce((total, segment) => total + (segment.technicalStops?.length ?? 0), 0); }
function formatStops(connections: number, technicalStops = 0) { const parts = []; if (connections) parts.push(`${connections} ${connections === 1 ? "connection" : "connections"}`); if (technicalStops) parts.push(`${technicalStops} technical ${technicalStops === 1 ? "stop" : "stops"}`); return parts.length ? parts.join(" • ") : "Non-stop"; }
function titleCase(value: string) { return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function cleanLocation(value: string) { return value.split("(")[0].split(",")[0].trim() || value; }
