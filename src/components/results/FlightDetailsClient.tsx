"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Info,
  Luggage,
  Plane,
  Sparkles,
  Ticket,
} from "lucide-react";
import type { FlightLeg, PublicFlightResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { formatTime } from "@/lib/utils";

export function FlightDetailsClient({ id }: { id: string }) {
  const { selectedOption } = useRegion();
  const currencyRates = useCurrencyRates();
  const [flight, setFlight] = useState<PublicFlightResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/flights/details?id=${encodeURIComponent(id)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Flight quote unavailable.");
        return data.flight as PublicFlightResult;
      })
      .then(setFlight)
      .catch((detailsError) =>
        setError(
          detailsError instanceof Error
            ? detailsError.message
            : "Flight quote unavailable.",
        ),
      )
      .finally(() => setLoading(false));
  }, [id]);

  async function continueToProvider() {
    const response = await fetch("/api/redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        type: "flight",
        sourcePage: "flight_details",
      }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    if (data.error) setError(data.error);
  }

  const itineraryLegs = useMemo(() => {
    if (!flight) return [];
    if (flight.legs?.length) return flight.legs;
    return [
      {
        direction: "leg",
        originAirport: flight.originAirport,
        destinationAirport: flight.destinationAirport,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
        durationMinutes: flight.durationMinutes,
        stops: flight.stops,
        layovers: flight.layovers,
        segments: [],
      } satisfies FlightLeg,
    ];
  }, [flight]);

  const connectionAirports = useMemo(() => {
    return itineraryLegs.flatMap((leg) =>
      leg.layovers.map((layover) => layover.airport),
    );
  }, [itineraryLegs]);

  if (loading) {
    return (
      <main className="page-shell flex-1 py-10">
        <Card className="p-6 text-muted">Loading flight details...</Card>
      </main>
    );
  }

  if (error || !flight) {
    return (
      <main className="page-shell flex-1 py-10">
        <Card className="p-6">
          <h1 className="text-xl font-bold text-navy">
            Flight quote unavailable
          </h1>
          <p className="mt-2 text-muted">
            {error || "Please search again for current prices."}
          </p>
        </Card>
      </main>
    );
  }

  const displayPrice = formatDisplayPrice({
    amount: flight.price,
    sourceCurrency: flight.currency,
    displayCurrency: selectedOption.currency,
    convertUsdEstimate: true,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });

  const stopLabel = formatStops(flight.stops);
  const hasProviderLink = Boolean(
    flight.partnerRedirectUrl || flight.bookingUrl,
  );
  const providerDisclaimer =
    "Final price, availability, payment, booking, and fare rules are confirmed by the provider.";

  return (
    <main className="flex-1 bg-surface-muted/40">
      <section className="border-b border-border bg-white">
        <div className="page-shell py-4 sm:py-5">
          <div className="mx-auto grid w-full max-w-5xl gap-4">
            <Card className="overflow-hidden border-indigo-100 p-0 shadow-[0_24px_60px_-34px_rgba(49,46,129,0.8)]">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 bg-gradient-to-br from-white via-white to-indigo-50/60 p-3.5 sm:p-4 lg:p-5">
                  <p className="inline-flex items-center gap-2 rounded-full border border-teal/15 bg-teal/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-teal-dark">
                    <Sparkles size={14} aria-hidden="true" /> Flight details
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-sm font-semibold text-slate-700">
                      {flight.airlineName}
                    </span>
                    {flight.flightNumber ? (
                      <>
                        <span
                          className="h-1 w-1 rounded-full bg-slate-300"
                          aria-hidden="true"
                        />
                        <span className="text-sm font-medium text-slate-500">
                          Flight {flight.flightNumber}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <h1 className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2.5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    <span>{flight.originAirport}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-indigo-100 bg-white text-blue shadow-sm sm:h-8 sm:w-8">
                      <ArrowRight size={16} aria-hidden="true" />
                    </span>
                    <span>{flight.destinationAirport}</span>
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium leading-5 text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Plane
                        size={14}
                        className="shrink-0 text-indigo-600"
                        aria-hidden="true"
                      />
                      <span>
                        <span className="font-semibold text-slate-800">
                          Stops:
                        </span>{" "}
                        {stopLabel}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3
                        size={14}
                        className="shrink-0 text-indigo-600"
                        aria-hidden="true"
                      />
                      <span>
                        <span className="font-semibold text-slate-800">
                          Duration:
                        </span>{" "}
                        {flight.duration}
                      </span>
                    </span>
                    {flight.cabinClass ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Ticket
                          size={14}
                          className="shrink-0 text-indigo-600"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="font-semibold text-slate-800">
                            Cabin:
                          </span>{" "}
                          {flight.cabinClass}
                        </span>
                      </span>
                    ) : null}
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Luggage
                        size={14}
                        className="shrink-0 text-indigo-600"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">
                        <span className="font-semibold text-slate-800">
                          Baggage:
                        </span>{" "}
                        {flight.baggageInfo || "Confirmed by provider"}
                      </span>
                    </span>
                  </div>
                </div>

                <aside className="border-t border-indigo-100 bg-white p-3 sm:p-3.5 lg:border-l lg:border-t-0 lg:p-4">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      From
                    </p>
                    <div
                      className="mt-1 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
                      aria-label={displayPrice.ariaLabel}
                      title={displayPrice.title}
                    >
                      {displayPrice.formatted}
                    </div>
                    {displayPrice.isConvertedEstimate ? (
                      <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
                        Estimate shown. Provider price:{" "}
                        {displayPrice.providerFormatted}.
                      </p>
                    ) : null}
                  </div>
                  <Button
                    variant="accent"
                    size="lg"
                    className="mt-2.5 w-full rounded-xl px-6 text-sm font-semibold sm:text-base"
                    onClick={continueToProvider}
                    disabled={!hasProviderLink}
                  >
                    Continue to Provider <ArrowRight size={18} />
                  </Button>
                  <p className="mt-2 flex gap-2 text-xs font-medium leading-5 text-slate-600">
                    <Info size={16} className="mt-0.5 shrink-0 text-blue" />
                    <span>{providerDisclaimer}</span>
                  </p>
                </aside>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <div className="page-shell py-6">
        <div className="mx-auto w-full max-w-3xl">
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-indigo-950/5 sm:p-4">
            <div className="border-b border-slate-200 pb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-teal-dark">
                  Selected flight
                </p>
                <h2 className="mt-0.5 truncate text-lg font-bold text-navy sm:text-xl">
                  {flight.airlineName}
                  {flight.flightNumber ? ` · ${flight.flightNumber}` : ""}
                </h2>
              </div>
            </div>

            <div className="mt-2 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-teal/10 p-2.5">
              <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <CompactAirportTime
                  airport={flight.originAirport}
                  time={formatTime(flight.departureTime)}
                />
                <div className="flex min-w-0 items-center justify-center gap-1.5 text-center text-sm font-bold text-slate-600">
                  <span className="hidden h-px w-8 bg-indigo-200 sm:block" />
                  <span className="rounded-full border border-indigo-100 bg-white px-2.5 py-0.5 shadow-sm">
                    {connectionAirports.length
                      ? `${flight.duration} · ${connectionAirports.join(" · ")}`
                      : `${flight.duration} · ${stopLabel}`}
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-teal" />
                  <span className="hidden h-px w-8 bg-indigo-200 sm:block" />
                </div>
                <CompactAirportTime
                  airport={flight.destinationAirport}
                  time={formatTime(flight.arrivalTime)}
                  align="right"
                />
              </div>
            </div>

            <div className="mt-2 grid gap-1.5">
              {itineraryLegs.map((leg, legIndex) => (
                <div
                  key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}-${legIndex}`}
                  className={
                    legIndex > 0 ? "mt-2 border-t border-slate-200 pt-3" : ""
                  }
                >
                  <CompactLegSection
                    leg={leg}
                    legIndex={legIndex}
                    legCount={itineraryLegs.length}
                    fallbackAirlineName={flight.airlineName}
                    fallbackFlightNumber={flight.flightNumber}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function CompactAirportTime({
  airport,
  time,
  align = "left",
}: {
  airport: string;
  time: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "sm:text-right" : ""}>
      <p className="text-lg font-black tracking-tight text-navy sm:text-xl">{airport}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-600">{time}</p>
    </div>
  );
}

function CompactLegSection({
  leg,
  legIndex,
  legCount,
  fallbackAirlineName,
  fallbackFlightNumber,
}: {
  leg: FlightLeg;
  legIndex: number;
  legCount: number;
  fallbackAirlineName: string;
  fallbackFlightNumber?: string;
}) {
  const segments = leg.segments.length
    ? leg.segments
    : [
        {
          originAirport: leg.originAirport,
          destinationAirport: leg.destinationAirport,
          departureTime: leg.departureTime,
          arrivalTime: leg.arrivalTime,
          airlineName: fallbackAirlineName,
          flightNumber: fallbackFlightNumber,
        },
      ];

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
      <div className="mb-1.5 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
          {formatLegDirection(leg.direction, legIndex, legCount)} · {leg.originAirport} to{" "}
          {leg.destinationAirport}
        </p>
        <p className="text-xs font-semibold text-slate-500">
          {leg.duration} · {formatStops(leg.stops)}
        </p>
      </div>
      <div className="grid gap-1.5">
        {segments.map((segment, segmentIndex) => (
          <div
            key={`${segment.originAirport}-${segment.destinationAirport}-${segmentIndex}`}
          >
            <CompactFlightRow
              originAirport={segment.originAirport}
              destinationAirport={segment.destinationAirport}
              departureTime={segment.departureTime}
              arrivalTime={segment.arrivalTime}
              airlineName={segment.airlineName || fallbackAirlineName}
              flightNumber={segment.flightNumber || fallbackFlightNumber}
            />
            {leg.layovers[segmentIndex] ? (
              <LayoverSeparator layover={leg.layovers[segmentIndex]} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactFlightRow({
  originAirport,
  destinationAirport,
  departureTime,
  arrivalTime,
  airlineName,
  flightNumber,
}: {
  originAirport: string;
  destinationAirport: string;
  departureTime: string;
  arrivalTime: string;
  airlineName?: string;
  flightNumber?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-[0_10px_24px_-24px_rgba(30,27,75,0.55)] sm:p-2.5">
      <div className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
        <div>
          <p className="text-lg font-black tracking-tight text-navy">
            {originAirport}{" "}
            <span className="text-base font-bold text-slate-700">
              {formatTime(departureTime)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-teal sm:justify-center">
          <span className="h-px w-7 bg-teal/30" />
          <ArrowRight size={17} aria-hidden="true" />
          <span className="hidden h-px w-7 bg-teal/30 sm:block" />
        </div>
        <div className="sm:text-right">
          <p className="text-lg font-black tracking-tight text-navy">
            {destinationAirport}{" "}
            <span className="text-base font-bold text-slate-700">
              {formatTime(arrivalTime)}
            </span>
          </p>
        </div>
      </div>
      {airlineName || flightNumber ? (
        <p className="mt-0.5 text-sm font-semibold text-slate-600">
          {[airlineName, flightNumber].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function LayoverSeparator({
  layover,
}: {
  layover: FlightLeg["layovers"][number];
}) {
  return (
    <div className="px-2 py-1 text-xs font-semibold text-slate-500 sm:px-2.5">
      Layover in {layover.airport} · {layover.duration}
      {layover.quality !== "unknown"
        ? ` · ${layover.quality} connection`
        : ""}
    </div>
  );
}

function formatStops(stops: number) {
  if (stops === 0) return "Nonstop";
  return `${stops} stop${stops > 1 ? "s" : ""}`;
}

function formatLegDirection(
  direction: FlightLeg["direction"],
  index: number,
  legCount: number,
) {
  if (direction === "outbound") return "Outbound";
  if (direction === "return") return "Return";
  return legCount > 1 ? `Leg ${index + 1}` : "Itinerary";
}
