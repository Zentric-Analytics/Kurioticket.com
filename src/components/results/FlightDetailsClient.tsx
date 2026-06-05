"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Info,
  Luggage,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react";
import type { FlightLeg, PublicFlightResult } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
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
        if (!response.ok) throw new Error(data.error || "Flight quote unavailable.");
        return data.flight as PublicFlightResult;
      })
      .then(setFlight)
      .catch((detailsError) => setError(detailsError instanceof Error ? detailsError.message : "Flight quote unavailable."))
      .finally(() => setLoading(false));
  }, [id]);

  async function continueToProvider() {
    const response = await fetch("/api/redirect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type: "flight", sourcePage: "flight_details" }),
    });
    const data = (await response.json()) as { url?: string; error?: string };
    if (data.url) window.location.href = data.url;
    if (data.error) setError(data.error);
  }

  const timelineLegs = useMemo(() => {
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
          <h1 className="text-xl font-bold text-navy">Flight quote unavailable</h1>
          <p className="mt-2 text-muted">{error || "Please search again for current prices."}</p>
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
  const hasProviderLink = Boolean(flight.partnerRedirectUrl || flight.bookingUrl);
  const providerDisclaimer = "Final price, availability, payment, booking, and fare rules are confirmed by the provider.";

  return (
    <main className="flex-1 bg-surface-muted/40">
      <section className="border-b border-border bg-white">
        <div className="page-shell py-6 sm:py-8">
          <div className="grid gap-5">
            <Card className="overflow-hidden border-indigo-100 p-0 shadow-[0_20px_50px_-28px_rgba(49,46,129,0.65)]">
              <div className="border-b border-border bg-gradient-to-r from-indigo-50 via-white to-teal/10 px-5 py-4 sm:px-6">
                <p className="flex items-center gap-2 text-sm font-semibold text-teal-dark">
                  <Sparkles size={16} /> Flight details
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-muted">
                      <span>{flight.airlineName}</span>
                      {flight.flightNumber ? <span>Flight {flight.flightNumber}</span> : null}
                    </div>
                    <h1 className="mt-3 flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                      <span>{flight.originAirport}</span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-blue">
                        <ArrowRight size={22} />
                      </span>
                      <span>{flight.destinationAirport}</span>
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <DetailChip icon={<Plane size={12} />} label="Stops" value={stopLabel} />
                      <DetailChip icon={<Clock3 size={12} />} label="Duration" value={flight.duration} />
                      {flight.cabinClass ? <DetailChip icon={<Ticket size={12} />} label="Cabin" value={flight.cabinClass} /> : null}
                      <DetailChip icon={<Luggage size={12} />} label="Baggage" value={flight.baggageInfo || "Confirmed by provider"} maxWidthClassName="max-w-[360px]" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-4 md:min-w-52 md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">From</p>
                    <div
                      className="mt-1 text-3xl font-bold text-navy"
                      aria-label={displayPrice.ariaLabel}
                      title={displayPrice.title}
                    >
                      {displayPrice.formatted}
                    </div>
                    {displayPrice.isConvertedEstimate ? (
                      <p className="mt-1 text-xs leading-5 text-muted">Estimate shown. Provider price: {displayPrice.providerFormatted}.</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex gap-2 text-sm leading-6 text-slate-700">
                    <Info size={18} className="mt-0.5 shrink-0 text-blue" />
                    <span>{providerDisclaimer}</span>
                  </p>
                  <Button variant="accent" size="lg" className="shrink-0 rounded-xl px-6" onClick={continueToProvider} disabled={!hasProviderLink}>
                    Continue to Provider <ArrowRight size={18} />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <div className="page-shell py-6">
        <section className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-teal-dark">Flight summary</p>
                <h2 className="text-xl font-bold text-navy">Your selected itinerary</h2>
              </div>
              <p className="text-sm font-semibold text-muted">{flight.airlineName}{flight.flightNumber ? ` • ${flight.flightNumber}` : ""}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-[1fr_220px_1fr] md:items-center">
              <AirportTimeBlock label="Departure" time={formatTime(flight.departureTime)} airport={flight.originAirport} icon={<PlaneTakeoff size={20} />} />
              <div className="rounded-2xl border border-border bg-surface-muted/70 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted">
                  <span className="h-px flex-1 bg-border" />
                  <Plane size={20} className="text-teal" />
                  <span className="h-px flex-1 bg-border" />
                </div>
                <p className="mt-3 text-lg font-bold text-navy">{flight.duration}</p>
                <p className="text-sm text-muted">{stopLabel}</p>
              </div>
              <AirportTimeBlock label="Arrival" time={formatTime(flight.arrivalTime)} airport={flight.destinationAirport} icon={<PlaneLanding size={20} />} align="right" />
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-teal-dark">Travel timeline</p>
                <h2 className="text-xl font-bold text-navy">Route details</h2>
              </div>
              <Badge variant={flight.stops === 0 ? "teal" : "blue"}>{stopLabel}</Badge>
            </div>
            <div className="mt-6 space-y-6">
              {timelineLegs.map((leg, legIndex) => (
                <div key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}-${legIndex}`}>
                  {timelineLegs.length > 1 ? (
                    <p className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">{formatLegDirection(leg.direction, legIndex)}</p>
                  ) : null}
                  <div className="space-y-0">
                    <TimelineItem
                      icon={<PlaneTakeoff size={18} />}
                      title="Departure"
                      eyebrow={leg.originAirport}
                      body={`${leg.originAirport} at ${formatTime(leg.departureTime)}`}
                    />
                    {leg.layovers.map((layover, layoverIndex) => (
                      <TimelineItem
                        key={`${layover.airport}-${layover.duration}-${layoverIndex}`}
                        icon={<CalendarClock size={18} />}
                        title={`Layover in ${layover.airport}`}
                        eyebrow={layover.duration}
                        body={`${layover.duration}${layover.quality !== "unknown" ? ` • ${layover.quality} connection` : ""}`}
                      />
                    ))}
                    <TimelineItem
                      icon={<PlaneLanding size={18} />}
                      title="Arrival"
                      eyebrow={leg.destinationAirport}
                      body={`${leg.destinationAirport} at ${formatTime(leg.arrivalTime)}`}
                      isLast
                    />
                  </div>
                  {leg.segments.length ? (
                    <div className="mt-4 rounded-2xl border border-border bg-surface-muted/60 p-4">
                      <p className="text-sm font-bold text-navy">Flight segments</p>
                      <div className="mt-3 grid gap-3">
                        {leg.segments.map((segment, segmentIndex) => (
                          <div key={`${segment.originAirport}-${segment.destinationAirport}-${segmentIndex}`} className="grid gap-1 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                            <span className="font-semibold text-navy">{segment.originAirport} {formatTime(segment.departureTime)}</span>
                            <span className="hidden text-muted sm:block">→</span>
                            <span className="font-semibold text-navy sm:text-right">{segment.destinationAirport} {formatTime(segment.arrivalTime)}</span>
                            {(segment.airlineName || segment.flightNumber) ? (
                              <span className="text-muted sm:col-span-3">
                                {[segment.airlineName, segment.flightNumber].filter(Boolean).join(" • ")}
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} className="text-teal" />
              <h2 className="text-xl font-bold text-navy">Why this option is highlighted</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {flight.recommendationReasons.length ? (
                flight.recommendationReasons.map((reason) => (
                  <p key={reason} className="rounded-xl border border-border bg-surface-muted/70 p-3 text-sm leading-6 text-slate-700">
                    {reason}
                  </p>
                ))
              ) : (
                <p className="rounded-xl border border-border bg-surface-muted/70 p-3 text-sm leading-6 text-slate-700">
                  This option is shown from the selected live flight result.
                </p>
              )}
            </div>
          </Card>

          <Card className="border-indigo-100 bg-indigo-50/60 p-5 sm:p-6">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-blue shadow-sm">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-navy">Provider transparency</h2>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Kurioticket helps you compare flight options. {flight.provider} confirms booking, payment, final price, availability, and fare rules before you complete your purchase.
                </p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </main>
  );
}


function AirportTimeBlock({ label, time, airport, icon, align = "left" }: { label: string; time: string; airport: string; icon: React.ReactNode; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-left md:text-right" : "text-left"}>
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="text-teal">{icon}</span>
        {label}
      </p>
      <div className="mt-2 text-3xl font-bold text-navy">{time}</div>
      <div className="mt-1 text-base font-semibold text-slate-700">{airport}</div>
    </div>
  );
}

function TimelineItem({ icon, title, eyebrow, body, isLast = false }: { icon: React.ReactNode; title: string; eyebrow: string; body: string; isLast?: boolean }) {
  return (
    <div className="relative grid grid-cols-[44px_1fr] gap-3 pb-6 last:pb-0">
      {!isLast ? <span className="absolute left-[21px] top-11 h-[calc(100%-2.75rem)] w-px bg-border" aria-hidden="true" /> : null}
      <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full border border-teal/20 bg-teal/10 text-teal shadow-sm">{icon}</div>
      <div className="min-w-0 rounded-2xl border border-border bg-white p-4 shadow-[0_12px_30px_-26px_rgba(30,27,75,0.55)]">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-semibold text-navy">{title}</div>
          <div className="text-sm font-semibold text-muted">{eyebrow}</div>
        </div>
        <div className="mt-1 text-sm leading-6 text-slate-700">{body}</div>
      </div>
    </div>
  );
}

function DetailChip({ icon, label, value, maxWidthClassName = "max-w-full" }: { icon: React.ReactNode; label: string; value: string; maxWidthClassName?: string }) {
  return (
    <div className={`inline-flex ${maxWidthClassName} items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold leading-5 text-slate-700 shadow-sm`}>
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">{icon}</span>
      <span className="min-w-0 truncate">
        <span className="text-slate-500">{label}:</span> {value}
      </span>
    </div>
  );
}

function formatStops(stops: number) {
  if (stops === 0) return "Nonstop";
  return `${stops} stop${stops > 1 ? "s" : ""}`;
}

function formatLegDirection(direction: FlightLeg["direction"], index: number) {
  if (direction === "outbound") return "Outbound";
  if (direction === "return") return "Return";
  return `Leg ${index + 1}`;
}
