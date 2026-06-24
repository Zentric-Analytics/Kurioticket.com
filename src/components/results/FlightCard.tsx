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
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn, formatTime } from "@/lib/utils";

type DetailItem = {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function FlightCard({
  flight,
  isAccented = false,
}: {
  flight: PublicFlightResult;
  isAccented?: boolean;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
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
  const details = buildFlightDetails(flight, t);
  const visibleLegs = getVisibleLegs(flight);
  const showsProviderBackedReturn = visibleLegs.some(
    (leg) => leg.direction === "return",
  );
  const providerPrice = `${displayPrice.providerFormatted} ${displayPrice.sourceCurrency}`;
  const priceAriaLabel = displayPrice.isConvertedEstimate
    ? t("displayEstimateConvertedFromProviderPrice")
        .replace("{{formatted}}", displayPrice.formatted)
        .replace("{{providerPrice}}", providerPrice)
    : providerPrice;
  const priceTitle = displayPrice.isConvertedEstimate
    ? t("convertedDisplayEstimateProviderPrice")
        .replace("{{providerPrice}}", providerPrice)
    : undefined;
  const priceLabel = displayPrice.isConvertedEstimate
    ? t("estimatedPrice")
    : t("providerPrice");
  const providerHandoffCopy = displayPrice.isConvertedEstimate
    ? t("flightCardProviderHandoffConverted")
    : t("flightCardProviderHandoff");

  return (
    <Card
      className={cn(
        "relative w-full overflow-hidden border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.065)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(15,23,42,0.095)]",
        isAccented &&
          "border-indigo-200/80 bg-[linear-gradient(180deg,rgba(79,70,229,0.035),#fff_34%)] shadow-[0_10px_28px_rgba(79,70,229,0.09)] ring-1 ring-indigo-500/10",
      )}
    >
      {isAccented ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500/55 via-purple-500/45 to-teal/40"
        />
      ) : null}
      <div className="p-2.5 sm:p-3">
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_132px] lg:items-stretch">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
                {t("flightOption")}
              </p>
              <p className="min-w-0 truncate text-end text-xs font-semibold text-slate-700" dir="auto">
                {flight.airlineName}
                {flight.flightNumber ? ` · ${flight.flightNumber}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              {visibleLegs.map((leg, index) => (
                <FlightLegRow
                  key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}-${leg.departureTime}-${index}`}
                  flight={flight}
                  leg={leg}
                  compact={visibleLegs.length > 1}
                />
              ))}
            </div>

            <FlightDetailLines details={details} />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 lg:min-h-[118px] lg:shrink-0 lg:flex-col lg:items-stretch lg:justify-center lg:gap-2 lg:self-stretch lg:border-0 lg:bg-transparent lg:px-1 lg:py-3 lg:text-center">
            <div className="min-w-0 lg:flex lg:min-h-[72px] lg:flex-col lg:items-center lg:justify-center lg:text-center">
              <div
                className="text-lg font-semibold leading-tight tracking-[-0.025em] text-slate-950 sm:text-xl"
                aria-label={priceAriaLabel}
                title={priceTitle}
                dir="ltr"
              >
                {displayPrice.formatted}
              </div>
              <p className="mt-1 text-[11px] font-medium uppercase leading-none tracking-[0.1em] text-slate-600">
                {priceLabel}
              </p>
              {displayPrice.isConvertedEstimate ? (
                <div className="mt-1.5 space-y-0.5 text-xs font-medium leading-4 text-slate-600 lg:text-center">
                  <p><span>{t("providerPrice")}:</span> <span dir="ltr">{providerPrice}</span></p>
                </div>
              ) : null}
            </div>
            <LinkButton
              href={`/flights/details/${encodeURIComponent(flight.id)}`}
              variant="primary"
              size="sm"
              className="shrink-0 whitespace-nowrap rounded-full bg-navy px-3.5 text-sm font-semibold hover:bg-navy-soft lg:w-full lg:justify-center"
            >
              {t("viewFlight")}
            </LinkButton>
          </div>
        </div>

        <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50/50 px-2.5 py-1.5 text-xs font-medium leading-5 text-slate-600">
          {showsProviderBackedReturn
            ? `${t("providerNormalizedItineraryPrefix")} ${providerHandoffCopy}`
            : providerHandoffCopy}
        </div>
      </div>
    </Card>
  );
}

function FlightLegRow({
  flight,
  leg,
  compact,
}: {
  flight: PublicFlightResult;
  leg: FlightLeg;
  compact: boolean;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <section
      aria-label={formatLegTitle(leg, t)}
      className={cn(
        "rounded-xl border border-slate-200 bg-slate-50/60 p-2",
        compact ? "sm:p-2" : "sm:p-2.5",
      )}
    >
      <div className="flex min-w-0 gap-2.5">
        <AirlineLogo flight={flight} />

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
              {formatLegTitle(leg, t)}
            </p>
            <p className="truncate text-xs font-medium text-slate-600" dir="ltr">
              {leg.originAirport} → {leg.destinationAirport}
            </p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold leading-5 tracking-[-0.02em] text-slate-950 sm:text-[17px]" dir="ltr">
                {formatTime(leg.departureTime)}
              </div>
              <div className="mt-0.5 truncate text-xs font-medium text-slate-600" dir="ltr">
                {leg.originAirport}
              </div>
            </div>

            <div className="min-w-[68px] text-center sm:min-w-24">
              <div className="flex items-center justify-center text-teal">
                <span className="h-px flex-1 bg-slate-200" />
                <PlaneTakeoff className="mx-1.5 h-3 w-3" />
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="mt-0.5 text-xs font-semibold leading-4 text-slate-800" dir="auto">
                {leg.duration}
              </div>
              <div className="text-[11px] font-medium leading-4 text-slate-600">
                {formatStopsLabel(leg.stops, t)}
              </div>
            </div>

            <div className="min-w-0 text-end">
              <div className="text-base font-semibold leading-5 tracking-[-0.02em] text-slate-950 sm:text-[17px]" dir="ltr">
                {formatTime(leg.arrivalTime)}
              </div>
              <div className="mt-0.5 truncate text-xs font-medium text-slate-600" dir="ltr">
                {leg.destinationAirport}
              </div>
            </div>
          </div>

          {leg.layovers.length ? (
            <p
              className="mt-1 truncate text-xs font-medium text-slate-600"
              title={formatLayoverText(leg, t)}
            >
              {formatLayoverText(leg, t)}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AirlineLogo({ flight }: { flight: PublicFlightResult }) {
  if (flight.airlineLogo) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
        <Image
          src={flight.airlineLogo}
          alt={`${flight.airlineName} logo`}
          width={24}
          height={24}
          className="h-6 w-6 object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50/80 text-indigo-700 shadow-sm">
      <PlaneTakeoff className="h-3.5 w-3.5" aria-hidden="true" />
    </div>
  );
}

function FlightDetailLines({ details }: { details: DetailItem[] }) {
  return (
    <div className="grid gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-600 sm:grid-cols-2">
      {details.map((detail) => {
        const Icon = detail.icon;

        return (
          <p
            key={detail.label}
            className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5"
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0 text-indigo-500"
              aria-hidden="true"
            />
            <span className="shrink-0 font-medium text-slate-700">
              {detail.label}:
            </span>
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

function buildFlightDetails(
  flight: PublicFlightResult,
  t: (key: string) => string,
): DetailItem[] {
  return [
    {
      label: t("baggage"),
      value: formatBaggageValue(flight.baggageInfo, t),
      icon: Luggage,
    },
    {
      label: t("cabin"),
      value: formatCabinClass(flight.cabinClass, t),
      icon: Armchair,
    },
    {
      label: t("seatSelection"),
      value: t("providerRulesApply"),
      icon: Settings,
    },
    {
      label: t("fareRules"),
      value: t("reviewBeforeBooking"),
      icon: ShieldCheck,
    },
  ];
}

function formatLegTitle(leg: FlightLeg, t: (key: string) => string) {
  if (leg.direction === "return") return t("return");
  if (leg.direction === "outbound") return t("outbound");
  return t("flightLeg");
}

function formatStopsLabel(stops: number, t: (key: string) => string) {
  if (stops === 0) return t("nonstop");
  return stops === 1
    ? t("oneStop")
    : t("stopCount").replace("{{count}}", String(stops));
}

function formatCabinClass(value: string | undefined, t: (key: string) => string) {
  if (!value) return t("checkProvider");
  const normalized = value.toLowerCase().replace(/[-_]/g, " ");
  if (normalized === "economy") return t("economy");
  if (normalized === "business") return t("business");
  if (normalized === "first") return t("first");
  if (normalized === "premium economy") return t("premiumEconomy");
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatBaggageValue(value: string | undefined, t: (key: string) => string) {
  if (
    !value ||
    isProviderReviewCopy(value) ||
    /rules vary|vary by fare/i.test(value)
  ) {
    return t("checkProvider");
  }

  if (/carry-on included/i.test(value)) return t("carryOnIncluded");
  return value;
}

function formatLayoverText(leg: FlightLeg, t: (key: string) => string) {
  const firstLayover = leg.layovers[0];
  const firstConnection = `${firstLayover.airport} ${firstLayover.duration}`;
  const extraConnections =
    leg.layovers.length > 1
      ? ` +${t("moreCount").replace("{{count}}", String(leg.layovers.length - 1))}`
      : "";
  return `${t("layover")}: ${firstConnection}${extraConnections}`;
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
