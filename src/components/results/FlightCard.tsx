"use client";

import Image from "next/image";
import {
  Armchair,
  Luggage,
  PlaneTakeoff,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { FlightLeg, PublicFlightResult } from "@/lib/types";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { cn, formatTime } from "@/lib/utils";

type DetailItem = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function FlightCard({ flight }: { flight: PublicFlightResult }) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const displayPrice = formatDisplayPrice({
    amount: flight.price,
    sourceCurrency: flight.currency,
    displayCurrency: selectedOption.currency,
    convertUsdEstimate: true,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const details = buildFlightDetails(flight);
  const visibleLegs = getVisibleLegs(flight);
  const showsProviderBackedReturn = visibleLegs.some((leg) => leg.direction === "return");

  return (
    <Card className="w-full overflow-hidden border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.1)]">
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-500 px-3.5 py-2 sm:px-4">
        <div className="flex items-center text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
          <span>Flight option</span>
        </div>
      </div>

      <div className="p-3.5 sm:p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <AirlineLogo flight={flight} />
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-slate-950 sm:text-base">
              {flight.airlineName}
            </h2>
            <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
              {flight.flightNumber || "Flight itinerary"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="space-y-2.5">
              {visibleLegs.map((leg, index) => (
                <FlightLegRow
                  key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}-${leg.departureTime}-${index}`}
                  leg={leg}
                  compact={visibleLegs.length > 1}
                />
              ))}
            </div>

            <FlightDetailLines details={details} />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 lg:w-40 lg:shrink-0 lg:flex-col lg:items-end lg:border-t-0 lg:pt-0 lg:text-right">
            <div className="min-w-0 lg:text-right">
              <div
                className="text-xl font-semibold tracking-[-0.025em] text-slate-950 sm:text-2xl"
                aria-label={displayPrice.ariaLabel}
                title={displayPrice.title}
              >
                {displayPrice.formatted}
              </div>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500">
                Estimated price
              </p>
            </div>
            <LinkButton
              href={`/flights/details/${encodeURIComponent(flight.id)}`}
              variant="primary"
              size="sm"
              className="shrink-0 whitespace-nowrap rounded-full bg-navy px-3.5 text-xs font-semibold hover:bg-navy-soft"
            >
              View Flight
            </LinkButton>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11px] font-medium leading-5 text-slate-600">
          {showsProviderBackedReturn
            ? "Outbound and return details are shown from provider-normalized itinerary data. Booking, payment, final price, availability, baggage, seat selection, and fare rules are confirmed by the provider before booking."
            : "Booking, payment, final price, availability, baggage, seat selection, and fare rules are confirmed by the provider before booking."}
        </div>
      </div>
    </Card>
  );
}

function FlightLegRow({ leg, compact }: { leg: FlightLeg; compact: boolean }) {
  return (
    <section
      aria-label={formatLegTitle(leg)}
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-3 shadow-sm",
        compact ? "sm:p-3" : "sm:p-3.5"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
          {formatLegTitle(leg)}
        </p>
        <p className="truncate text-[11px] font-medium text-slate-500">
          {leg.originAirport} → {leg.destinationAirport}
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950 sm:text-xl">
            {formatTime(leg.departureTime)}
          </div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
            {leg.originAirport}
          </div>
        </div>

        <div className="min-w-[74px] text-center sm:min-w-28">
          <div className="flex items-center justify-center text-teal">
            <span className="h-px flex-1 bg-slate-200" />
            <PlaneTakeoff className="mx-1.5 h-3.5 w-3.5" />
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-800">{leg.duration}</div>
          <div className="text-[10px] font-medium text-slate-500">{formatStopsLabel(leg.stops)}</div>
        </div>

        <div className="min-w-0 text-right">
          <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950 sm:text-xl">
            {formatTime(leg.arrivalTime)}
          </div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
            {leg.destinationAirport}
          </div>
        </div>
      </div>

      {leg.layovers.length ? (
        <p className="mt-2 truncate text-[11px] font-medium text-slate-500" title={formatLayoverText(leg)}>
          {formatLayoverText(leg)}
        </p>
      ) : null}
    </section>
  );
}

function AirlineLogo({ flight }: { flight: PublicFlightResult }) {
  if (flight.airlineLogo) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
        <Image
          src={flight.airlineLogo}
          alt={`${flight.airlineName} logo`}
          width={28}
          height={28}
          className="h-7 w-7 object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50/80 text-indigo-700 shadow-sm">
      <PlaneTakeoff className="h-4 w-4" aria-hidden="true" />
    </div>
  );
}

function FlightDetailLines({ details }: { details: DetailItem[] }) {
  return (
    <div className="grid gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] leading-5 text-slate-600 sm:grid-cols-2">
      {details.map((detail) => {
        const Icon = detail.icon;

        return (
          <p key={detail.label} className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-500" aria-hidden="true" />
            <span className="shrink-0 font-medium text-slate-700">{detail.label}:</span>
            <span className="min-w-0 text-slate-600" title={detail.value}>
              {detail.value}
            </span>
          </p>
        );
      })}
    </div>
  );
}

function getVisibleLegs(flight: PublicFlightResult): FlightLeg[] {
  if (flight.legs?.length) return flight.legs;

  return [
    {
      direction: "outbound",
      originAirport: flight.originAirport,
      destinationAirport: flight.destinationAirport,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.duration,
      durationMinutes: flight.durationMinutes,
      stops: flight.stops,
      layovers: flight.layovers,
      segments: [],
    },
  ];
}

function buildFlightDetails(flight: PublicFlightResult): DetailItem[] {
  return [
    {
      label: "Baggage",
      value: formatBaggageValue(flight.baggageInfo),
      icon: Luggage,
    },
    {
      label: "Cabin",
      value: formatCabinClass(flight.cabinClass),
      icon: Armchair,
    },
    {
      label: "Seat selection",
      value: "Provider rules apply",
      icon: Settings,
    },
    {
      label: "Fare rules",
      value: formatFareRulesValue(flight.refundInfo),
      icon: ShieldCheck,
    },
  ];
}

function formatLegTitle(leg: FlightLeg) {
  if (leg.direction === "return") return "Return";
  if (leg.direction === "outbound") return "Outbound";
  return "Flight leg";
}

function formatStopsLabel(stops: number) {
  return stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`;
}

function formatCabinClass(value?: string) {
  if (!value) return "Check provider";
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatBaggageValue(value?: string) {
  if (!value || isProviderReviewCopy(value) || /rules vary|vary by fare/i.test(value)) {
    return "Check provider";
  }

  return value;
}

function formatFareRulesValue(value?: string) {
  if (!value || isProviderReviewCopy(value)) return "Review before booking";
  return value;
}

function formatLayoverText(leg: FlightLeg) {
  const firstLayover = leg.layovers[0];
  const firstConnection = `${firstLayover.airport} ${firstLayover.duration}`;
  const extraConnections = leg.layovers.length > 1 ? ` +${leg.layovers.length - 1} more` : "";
  return `Layover: ${firstConnection}${extraConnections}`;
}

function isProviderReviewCopy(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("reviewed on the external provider") ||
    normalized.includes("shown by the external provider") ||
    normalized.includes("reviewed externally") ||
    normalized.includes("rules vary") ||
    normalized.includes("vary by fare")
  );
}
