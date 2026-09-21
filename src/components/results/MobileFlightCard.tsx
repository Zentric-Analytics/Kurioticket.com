"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Armchair, ChevronRight, FileText, Luggage, Plane, PlaneTakeoff } from "lucide-react";

import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useLocale } from "@/components/layout/LocaleProvider";
import { formatFlightCardPrice } from "@/components/results/flightCardPrice";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { translations as enTranslations } from "@/lib/i18n/en";
import type { FlightLeg, PublicFlightResult } from "@/lib/types";
import { cn, formatItineraryShortDate, formatTime } from "@/lib/utils";

type ResultBadge = "best" | "fastest" | "cheapest";

export function MobileFlightCard({
  flight,
  resultBadge,
  detailsHref,
  providerLabel,
  onAction,
}: {
  flight: PublicFlightResult;
  resultBadge?: ResultBadge;
  detailsHref: string | null;
  providerLabel?: string;
  onAction?: (flight: PublicFlightResult) => void;
}) {
  const router = useRouter();
  const { t: dictionary, locale } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const displayPrice = formatDisplayPrice({
    amount: flight.price,
    sourceCurrency: flight.currency,
    displayCurrency: selectedOption.currency,
    convertSourceEstimate: true,
    useFlightResultSymbols: true,
    maximumFractionDigits: 0,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const price = formatFlightCardPrice({ amount: displayPrice.amount, formatted: displayPrice.formatted });
  const legs = getVisibleLegs(flight);
  const operator = operatingCarrierPresentation(flight);
  const journeySummary = legs.map((leg, index) => `${legLabel(leg, index, legs)} ${formatTime(leg.departureTime, locale)} ${leg.originAirport} to ${formatTime(leg.arrivalTime, locale)} ${leg.destinationAirport}, ${leg.duration}, ${stopsLabel(leg.stops, t)}`).join(". ");
  const providerPrice = `${displayPrice.providerFormatted} ${displayPrice.sourceCurrency}`;
  const priceContext = displayPrice.isConvertedEstimate ? `${displayPrice.formatted}, converted estimate from ${providerPrice}` : providerPrice;
  const accessibleName = `${flight.airlineName}${flight.flightNumber ? `, ${flight.flightNumber}` : ""}${operator ? `, ${operator.accessibilityText}` : ""}. ${journeySummary}. ${priceContext}. Opens Kurioticket flight details`;
  const content = (
    <>
      <div className="flex min-w-0 items-start gap-2.5">
        <AirlineLogo flight={flight} />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-bold leading-[17px] text-slate-900">{flight.airlineName}</p>
          {providerLabel ? <p className="truncate text-[10px] font-semibold leading-[14px] text-amber-800">{providerLabel}</p> : null}
          {flight.flightNumber ? <p className="truncate text-[11px] font-medium leading-[14px] text-slate-500" dir="ltr">{flight.flightNumber}</p> : null}
          {operator ? <p className="truncate text-[11px] font-medium leading-[15px] text-slate-500">{operator.text}</p> : null}
        </div>
        <MobileBadge badge={resultBadge} />
      </div>

      <div className="mt-2 space-y-2.5">
        {legs.map((leg, index) => <MobileJourney key={`${leg.direction}-${leg.departureTime}-${index}`} leg={leg} label={legLabel(leg, index, legs)} locale={locale} stops={stopsLabel(leg.stops, t)} />)}
      </div>

      <div className="mt-[5px] grid grid-cols-[minmax(0,1fr)_minmax(104px,46%)] gap-2 border-t border-slate-200 pt-[7px]">
        <div className="min-w-0 space-y-[5px] pt-px text-[10.5px] leading-[15px]">
          <Metadata icon={Luggage} label={t("baggage")} value={baggageSummary(flight.baggageInfo, t)} />
          <Metadata icon={Armchair} label={t("cabin")} value={cabinSummary(flight.cabinClass, t)} />
          <Metadata icon={FileText} label={t("fareRules")} value={locale.startsWith("en") ? "Review" : (t("reviewBeforeBooking") || "Review")} />
        </div>
        <div className="flex min-w-[104px] flex-col items-end justify-between text-right">
          <p className={cn("max-w-full whitespace-nowrap font-bold tracking-[-0.025em] text-slate-950", price.size === "normal" ? "text-[19px] leading-6" : price.size === "large" ? "text-[17px] leading-[22px]" : "text-[15px] leading-5")} data-price-size={price.size} dir="ltr" title={displayPrice.isConvertedEstimate ? providerPrice : undefined}>{price.formatted}</p>
          <span className="mt-1 inline-flex items-center gap-0.5 text-[13px] font-semibold leading-[15px] text-[#004BB8]">View deals <ChevronRight className="h-4 w-4" aria-hidden="true" /></span>
        </div>
      </div>
    </>
  );

  const classes = "focus-ring block w-full rounded-2xl border border-[#D8E1EC] bg-white px-3 py-[9px] text-left shadow-[0_10px_28px_-24px_rgba(15,23,42,0.5)] transition-[opacity,transform] active:scale-[0.995] active:opacity-90 motion-reduce:transition-none sm:hidden";
  if (onAction) return <button type="button" data-mobile-flight-card aria-label={accessibleName} className={classes} onClick={() => onAction(flight)}>{content}</button>;
  if (detailsHref) return <a data-mobile-flight-card aria-label={accessibleName} href={detailsHref} className={classes} onClick={(event) => { event.preventDefault(); router.push(detailsHref); }}>{content}</a>;
  return <div data-mobile-flight-card aria-label={accessibleName} role="group" className={classes}>{content}</div>;
}

function AirlineLogo({ flight }: { flight: PublicFlightResult }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">{flight.airlineLogo ? <Image src={flight.airlineLogo} alt="" width={32} height={32} className="h-8 w-8 object-contain" /> : <Plane className="h-4 w-4 text-[#004BB8]" aria-hidden="true" />}</span>;
}

function MobileBadge({ badge }: { badge?: ResultBadge }) {
  if (!badge) return null;
  const label = badge === "best" ? "Best value" : badge === "fastest" ? "Fastest" : "Cheapest";
  return <span className={cn("inline-flex h-6 shrink-0 items-center rounded-full px-2 text-[10px] font-extrabold leading-[13px]", badge === "fastest" ? "bg-blue-50 text-[#004BB8]" : "bg-emerald-50 text-emerald-700")}>{label}</span>;
}

function MobileJourney({ leg, label, locale, stops }: { leg: FlightLeg; label: string; locale: string; stops: string }) {
  return <section aria-label={label}>
    <p className="text-[10px] font-bold uppercase leading-3 tracking-[0.08em] text-[#0057E7]">{label}</p>
    <div className="mt-1 grid grid-cols-[72px_minmax(46px,1fr)_72px] items-center gap-1.5">
      <p className="text-[14px] font-extrabold leading-[18px] text-slate-950" dir="ltr">{formatTime(leg.departureTime, locale)}</p>
      <p className="truncate text-center text-[11px] font-semibold leading-[14px] text-slate-600">{leg.duration}</p>
      <p className="text-right text-[14px] font-extrabold leading-[18px] text-slate-950" dir="ltr">{formatTime(leg.arrivalTime, locale)}</p>
    </div>
    <div className="mt-0.5 grid grid-cols-[72px_minmax(46px,1fr)_72px] items-center gap-1.5">
      <Endpoint airport={leg.originAirport} time={leg.departureTime} locale={locale} />
      <div className="flex min-w-[46px] items-center gap-0.5" aria-hidden="true"><span className="h-[7px] w-[7px] shrink-0 rounded-full bg-slate-400" /><span className="h-[1.5px] flex-1 bg-slate-300" /><PlaneTakeoff className="h-3.5 w-3.5 shrink-0 text-[#004BB8]" /><span className="h-[1.5px] flex-1 bg-slate-300" /><span className="h-[7px] w-[7px] shrink-0 rounded-full bg-slate-400" /></div>
      <Endpoint airport={leg.destinationAirport} time={leg.arrivalTime} locale={locale} align="right" />
    </div>
    <div className="mt-0.5 grid grid-cols-[72px_minmax(46px,1fr)_72px] gap-1.5">
      <span />
      <p className="truncate text-center text-[10px] font-medium leading-[13px] text-slate-500">{stops}</p>
      <span />
    </div>
  </section>;
}

function Endpoint({ time, airport, locale, align = "left" }: { time: string; airport: string; locale: string; align?: "left" | "right" }) {
  return <div className={cn("min-w-0", align === "right" && "text-right")}><p className="truncate text-[11px] font-bold leading-[14px] text-slate-900" dir="ltr">{airport}</p><p className="mt-px truncate text-[9.5px] font-medium leading-3 text-slate-500">{formatItineraryShortDate({ value: time, locale })}</p></div>;
}

function Metadata({ icon: Icon, label, value }: { icon: typeof Luggage; label: string; value: string }) {
  return <p className="flex min-h-4 min-w-0 items-center gap-1.5 text-slate-600"><Icon className="h-[15px] w-[15px] shrink-0 text-slate-500" aria-hidden="true" /><span className="shrink-0 font-semibold">{label}:</span><span className="truncate font-medium" title={value}>{value}</span></p>;
}

function getVisibleLegs(flight: PublicFlightResult): FlightLeg[] {
  return flight.legs?.length ? flight.legs : [{ direction: "outbound", originAirport: flight.originAirport, destinationAirport: flight.destinationAirport, departureTime: flight.departureTime, arrivalTime: flight.arrivalTime, duration: flight.duration, durationMinutes: flight.durationMinutes, stops: flight.stops, layovers: flight.layovers, segments: [] }];
}

function legLabel(leg: FlightLeg, index: number, legs: FlightLeg[]) {
  const multiCity = legs.some((item) => item.direction === "leg");
  if (multiCity || leg.direction === "leg") return `FLIGHT ${(leg.legIndex ?? index) + 1}`;
  return leg.direction === "return" ? "RETURN" : "OUTBOUND";
}

function stopsLabel(stops: number, t: (key: string) => string) {
  return stops === 0 ? t("nonstop") : stops === 1 ? t("oneStop") : t("stopCount").replace("{{count}}", String(stops));
}

function baggageSummary(value: string | undefined, t: (key: string) => string) {
  if (!value || /reviewed on|shown by|reviewed externally|rules vary|vary by fare|check provider/i.test(value)) return "Review policy";
  if (/carry-on included/i.test(value)) return t("carryOnIncluded");
  return value;
}

function cabinSummary(value: string | undefined, t: (key: string) => string) {
  if (!value) return "Review fare";
  const normalized = value.toLowerCase().replace(/[-_]/g, " ");
  if (normalized === "economy") return t("economy");
  if (normalized === "premium economy") return t("premiumEconomy");
  if (normalized === "business") return t("business");
  if (normalized === "first") return t("first");
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function operatingCarrierPresentation(flight: PublicFlightResult) {
  const segments = flight.legs?.flatMap((leg) => leg.segments ?? []) ?? [];
  if (!segments.length) return null;
  const eligible = segments.map((segment) => {
    const marketing = segment.marketingCarrier;
    const operating = segment.operatingCarrier;
    if (!marketing?.name.trim() || !operating?.name.trim()) return null;
    const same = marketing.iataCode && operating.iataCode ? marketing.iataCode.toLowerCase() === operating.iataCode.toLowerCase() : marketing.name.toLowerCase() === operating.name.toLowerCase();
    return { operating, differs: !same };
  });
  if (eligible.some((item) => item === null)) return null;
  const differing = eligible.filter((item) => item?.differs);
  if (!differing.length) return null;
  const names = new Set(differing.map((item) => item!.operating.name.trim()));
  if (names.size > 1) return { text: "Includes partner-operated flights", accessibilityText: "includes partner-operated flights" };
  const name = [...names][0];
  return differing.length === segments.length ? { text: `Operated by ${name}`, accessibilityText: `operated by ${name}` } : { text: `Includes flight operated by ${name}`, accessibilityText: `includes flight operated by ${name}` };
}
