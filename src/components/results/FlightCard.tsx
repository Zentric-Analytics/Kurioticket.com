import Image from "next/image";
import { Clock, Luggage, PlaneTakeoff, ShieldCheck } from "lucide-react";
import type { PublicFlightResult } from "@/lib/types";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScoreMeter } from "@/components/ui/ScoreMeter";
import { formatCurrency, formatTime } from "@/lib/utils";

export function FlightCard({ flight, premium = false }: { flight: PublicFlightResult; premium?: boolean }) {
  return (
    <Card className="mx-auto w-full max-w-[640px] overflow-hidden border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="border-b border-indigo-900/30 bg-gradient-to-r from-indigo-950 to-violet-800 px-3 py-2">
        <div aria-hidden="true" className="h-3" />
      </div>

      <div className="px-3 py-3">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
              {flight.airlineLogo ? (
                <Image src={flight.airlineLogo} alt="" width={24} height={24} unoptimized />
              ) : (
                <PlaneTakeoff size={16} className="text-teal" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black text-navy">{flight.airlineName}</h2>
              <p className="text-xs font-semibold text-muted">{flight.flightNumber || flight.provider}</p>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div>
              <div className="text-lg font-extrabold text-navy">{formatTime(flight.departureTime)}</div>
              <div className="text-xs font-semibold text-muted">{flight.originAirport}</div>
            </div>
            <div className="min-w-16 text-center">
              <div className="mx-auto mb-1 flex items-center">
                <span className="h-px flex-1 bg-slate-200" />
                <PlaneTakeoff size={14} className="mx-1 text-teal" />
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="text-xs font-bold text-navy">{flight.duration}</div>
              <div className="text-xs font-semibold text-muted">{flight.stops === 0 ? "Nonstop" : `${flight.stops} stop${flight.stops > 1 ? "s" : ""}`}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-extrabold text-navy">{formatTime(flight.arrivalTime)}</div>
              <div className="text-xs font-semibold text-muted">{flight.destinationAirport}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 lg:w-32 lg:flex-col lg:items-end">
            <div className="text-right">
              <div className="text-xl font-extrabold text-navy">{formatCurrency(flight.price, flight.currency)}</div>
              <div className="text-xs font-semibold text-muted">total estimate</div>
            </div>
            <LinkButton href={`/flights/details/${encodeURIComponent(flight.id)}`} variant="primary" size="sm" className="whitespace-nowrap bg-navy px-2.5 hover:bg-navy-soft">
              View Flight
            </LinkButton>
          </div>
        </div>

        <div className="mt-2.5 grid gap-2 md:grid-cols-[1fr_1fr] lg:grid-cols-[1.2fr_1fr]">
          <div className="grid gap-1 rounded-xl bg-slate-50 p-2.5 text-xs font-semibold text-muted">
            <p className="flex items-center gap-2">
              <Luggage size={14} className="text-teal" />
              {flight.baggageInfo}
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-teal" />
              {flight.recommendationReasons[0]}
            </p>
            <p className="flex items-center gap-2">
              <Clock size={14} className="text-teal" />
              {flight.refundInfo}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <ScoreMeter label="Value" score={flight.valueScore} />
            <ScoreMeter label="Risk" score={flight.riskScore} invert />
            <ScoreMeter label="Comfort" score={flight.comfortScore} />
            <ScoreMeter label="Confidence" score={flight.travelConfidenceScore} />
          </div>
        </div>

        {premium ? (
          <div className="mt-2.5 rounded-md border border-teal/20 bg-teal/5 p-2.5 text-xs text-teal-dark">
            Best Option For You signals can personalize this ranking using your saved airport, comfort, savings, and alert preferences.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
