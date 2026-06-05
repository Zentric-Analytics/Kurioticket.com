"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Luggage, Plane, ShieldCheck } from "lucide-react";
import type { PublicFlightResult } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScoreMeter } from "@/components/ui/ScoreMeter";
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

  return (
    <main className="flex-1">
      <div className="border-b border-border bg-white">
        <div className="page-shell py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-teal-dark">Flight Metasearch Details</p>
              <h1 className="mt-2 text-3xl font-bold text-navy">
                {flight.originAirport} <ArrowRight className="inline" size={24} /> {flight.destinationAirport}
              </h1>
              <p className="mt-2 text-muted">
                {flight.airlineName} {flight.flightNumber ? `• ${flight.flightNumber}` : ""} • {flight.provider}
              </p>
            </div>
            <div className="text-left lg:text-right">
              <div
                className="text-3xl font-bold text-navy"
                aria-label={displayPrice.ariaLabel}
                title={displayPrice.title}
              >
                {displayPrice.formatted}
              </div>
              {displayPrice.isConvertedEstimate ? (
                <p className="text-sm text-muted">
                  Display estimate. Provider price: {displayPrice.providerFormatted}. Final price, availability, and fare rules are confirmed by the provider.
                </p>
              ) : (
                <p className="text-sm text-muted">Final price, availability, and fare rules are confirmed by the provider.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page-shell grid gap-6 py-6 lg:grid-cols-[1fr_340px]">
        <section className="space-y-6">
          <Card className="p-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <div>
                <div className="text-2xl font-bold text-navy">{formatTime(flight.departureTime)}</div>
                <div className="text-sm font-semibold text-muted">{flight.originAirport}</div>
              </div>
              <div className="text-center text-sm text-muted">
                <Plane className="mx-auto mb-2 text-teal" size={22} />
                {flight.duration}
                <div>{flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-navy">{formatTime(flight.arrivalTime)}</div>
                <div className="text-sm font-semibold text-muted">{flight.destinationAirport}</div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-navy">Travel Timeline</h2>
            <div className="mt-4 grid gap-4">
              <TimelineItem icon={<Plane size={18} />} title="Departure" body={`${flight.originAirport} at ${formatTime(flight.departureTime)}`} />
              {flight.layovers.map((layover) => (
                <TimelineItem key={`${layover.airport}-${layover.duration}`} icon={<CalendarClock size={18} />} title={`Layover in ${layover.airport}`} body={`${layover.duration} • ${layover.quality} connection`} />
              ))}
              <TimelineItem icon={<ShieldCheck size={18} />} title="Arrival" body={`${flight.destinationAirport} at ${formatTime(flight.arrivalTime)}`} />
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-navy">Why This Is Recommended</h2>
            <div className="mt-3 grid gap-3">
              {flight.recommendationReasons.map((reason) => (
                <p key={reason} className="rounded-md bg-surface-muted p-3 text-sm text-muted">
                  {reason}
                </p>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-lg font-bold text-navy">External Provider Transparency</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Kurioticket helps you compare this option. Booking, payment, final price, availability, and fare rules are confirmed by the provider.
            </p>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-lg font-bold text-navy">Confidence Scores</h2>
            <div className="mt-4 grid gap-4">
              <ScoreMeter label="Value" score={flight.valueScore} />
              <ScoreMeter label="Risk" score={flight.riskScore} invert />
              <ScoreMeter label="Comfort" score={flight.comfortScore} />
              <ScoreMeter label="Travel Confidence" score={flight.travelConfidenceScore} />
              <ScoreMeter label="Travel Effort" score={flight.travelEffortScore} invert />
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-bold text-navy">Fare Notes</h2>
            <div className="mt-3 grid gap-3 text-sm text-muted">
              <p className="flex gap-2"><Luggage size={16} className="shrink-0 text-teal" />{flight.baggageInfo}</p>
              <p>{flight.refundInfo}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {flight.badges.map((badge) => (
                <Badge key={badge} variant="teal">{badge}</Badge>
              ))}
            </div>
          </Card>
          <div className="space-y-2">
            <p className="text-xs font-semibold leading-5 text-muted">
              Booking, payment, final price, availability, and fare rules are confirmed by the provider.
            </p>
            <Button variant="accent" size="lg" className="w-full" onClick={continueToProvider} disabled={!flight.partnerRedirectUrl && !flight.bookingUrl}>
              Continue to Provider
            </Button>
          </div>
        </aside>
      </div>
    </main>
  );
}

function TimelineItem({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">{icon}</div>
      <div>
        <div className="font-semibold text-navy">{title}</div>
        <div className="text-sm text-muted">{body}</div>
      </div>
    </div>
  );
}
