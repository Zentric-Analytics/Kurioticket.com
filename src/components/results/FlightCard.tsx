import Image from "next/image";
import { Clock, Luggage, PlaneTakeoff, ShieldCheck } from "lucide-react";
import type { PublicFlightResult } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScoreMeter } from "@/components/ui/ScoreMeter";
import { formatCurrency, formatTime } from "@/lib/utils";

export function FlightCard({ flight, premium = false }: { flight: PublicFlightResult; premium?: boolean }) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {flight.badges.slice(0, 4).map((badge) => (
              <Badge key={badge} variant={badge.includes("Risk") ? "teal" : badge.includes("Price") ? "blue" : "neutral"}>
                {badge}
              </Badge>
            ))}
          </div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{flight.provider} live offer</p>
        </div>
      </div>

      <div className="p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
            {flight.airlineLogo ? (
              <Image src={flight.airlineLogo} alt="" width={32} height={32} unoptimized />
            ) : (
              <PlaneTakeoff size={22} className="text-teal" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-navy">{flight.airlineName}</h2>
            <p className="text-sm font-semibold text-muted">{flight.flightNumber || flight.provider}</p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div>
            <div className="text-2xl font-black text-navy">{formatTime(flight.departureTime)}</div>
            <div className="text-sm font-semibold text-muted">{flight.originAirport}</div>
          </div>
          <div className="min-w-28 text-center">
            <div className="mx-auto mb-2 flex items-center">
              <span className="h-px flex-1 bg-slate-200" />
              <PlaneTakeoff size={16} className="mx-2 text-teal" />
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="text-xs font-bold text-navy">{flight.duration}</div>
            <div className="text-xs font-semibold text-muted">{flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-navy">{formatTime(flight.arrivalTime)}</div>
            <div className="text-sm font-semibold text-muted">{flight.destinationAirport}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 lg:w-48 lg:flex-col lg:items-end">
          <div className="text-right">
            <div className="text-3xl font-black text-navy">{formatCurrency(flight.price, flight.currency)}</div>
            <div className="text-xs font-semibold text-muted">total estimate</div>
          </div>
          <LinkButton href={`/flights/details/${encodeURIComponent(flight.id)}`} variant="primary" className="whitespace-nowrap bg-navy px-5 hover:bg-navy-soft">
            View Flight
          </LinkButton>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr] lg:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-muted">
          <p className="flex items-center gap-2">
            <Luggage size={16} className="text-teal" />
            {flight.baggageInfo}
          </p>
          <p className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-teal" />
            {flight.recommendationReasons[0]}
          </p>
          <p className="flex items-center gap-2">
            <Clock size={16} className="text-teal" />
            {flight.refundInfo}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ScoreMeter label="Value" score={flight.valueScore} />
          <ScoreMeter label="Risk" score={flight.riskScore} invert />
          <ScoreMeter label="Comfort" score={flight.comfortScore} />
          <ScoreMeter label="Confidence" score={flight.travelConfidenceScore} />
        </div>
      </div>

      {premium ? (
        <div className="mt-4 rounded-md border border-teal/20 bg-teal/5 p-3 text-sm text-teal-dark">
          Best Option For You signals can personalize this ranking using your saved airport, comfort, savings, and alert preferences.
        </div>
      ) : null}
      </div>
    </Card>
  );
}
