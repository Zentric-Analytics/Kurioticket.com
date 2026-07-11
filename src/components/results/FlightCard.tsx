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
  const { t: dictionary, locale } = useLocale();
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
  const providerPrice = `${displayPrice.providerFormatted} ${displayPrice.sourceCurrency}`;
  const priceAriaLabel = displayPrice.isConvertedEstimate
    ? t("displayEstimateConvertedFromProviderPrice")
        .replace("{{formatted}}", displayPrice.formatted)
        .replace("{{providerPrice}}", providerPrice)
    : providerPrice;
  const priceTitle = displayPrice.isConvertedEstimate
    ? t("convertedDisplayEstimateProviderPrice").replace(
        "{{providerPrice}}",
        providerPrice,
      )
    : undefined;
  const priceLabel = displayPrice.isConvertedEstimate
    ? t("estimatedPrice")
    : t("providerPrice");
  const providerHandoffCopy = t("flightCardProviderHandoff");

  return (
    <Card
      className={cn(
        "relative w-full overflow-hidden border-[#D8E1EC] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-[#CBD6E2] hover:shadow-[0_16px_34px_rgba(15,23,42,0.095)]",
        isAccented && "ring-1 ring-slate-950/[0.03]",
      )}
    >
      <div className="p-2.5 sm:p-3">
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_132px] lg:items-stretch">
          <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#004BB8]">
                {t("flightOption")}
              </p>
              <p
                className="min-w-0 truncate text-end text-xs font-semibold text-slate-700"
                dir="auto"
              >
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
                  locale={locale}
                />
              ))}
            </div>

            <div className="mt-1 flex items-start justify-between gap-3 border-t border-slate-100 pt-3.5 lg:mt-0 lg:block lg:border-t-0 lg:pt-0">
              <FlightDetailLines details={details} />
              <FlightFareAction
                flightId={flight.id}
                formattedPrice={displayPrice.formatted}
                priceAriaLabel={priceAriaLabel}
                priceTitle={priceTitle}
                priceLabel={priceLabel}
                showConvertedProviderPrice={displayPrice.isConvertedEstimate}
                providerPrice={providerPrice}
                providerPriceLabel={t("providerPrice")}
                viewFlightLabel={t("viewFlight")}
                className="lg:hidden"
              />
            </div>
          </div>

          <FlightFareAction
            flightId={flight.id}
            formattedPrice={displayPrice.formatted}
            priceAriaLabel={priceAriaLabel}
            priceTitle={priceTitle}
            priceLabel={priceLabel}
            showConvertedProviderPrice={displayPrice.isConvertedEstimate}
            providerPrice={providerPrice}
            providerPriceLabel={t("providerPrice")}
            viewFlightLabel={t("viewFlight")}
            className="hidden lg:flex"
          />
        </div>

        <div className="mt-3 rounded-xl border border-[#D8E1EC]/80 bg-[#F8FAFC] px-3 py-2 text-xs font-medium leading-5 text-slate-600">
          {providerHandoffCopy}
        </div>
      </div>
    </Card>
  );
}

function FlightLegRow({
  flight,
  leg,
  compact,
  locale,
}: {
  flight: PublicFlightResult;
  leg: FlightLeg;
  compact: boolean;
  locale: string;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";

  return (
    <section
      aria-label={formatLegTitle(leg, t)}
      className={cn(
        "rounded-xl border border-[#D8E1EC] bg-[#F8FAFC] p-2",
        compact ? "sm:p-2" : "sm:p-2.5",
      )}
    >
      <div className="flex min-w-0 gap-2.5">
        <AirlineLogo flight={flight} />

        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#004BB8]">
              {formatLegTitle(leg, t)}
            </p>
            <p
              className="truncate text-xs font-medium text-slate-600"
              dir="ltr"
            >
              {leg.originAirport} → {leg.destinationAirport}
            </p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
            <div className="min-w-0">
              <div
                className="text-base font-semibold leading-5 tracking-[-0.02em] text-slate-950 sm:text-[17px]"
                dir="ltr"
              >
                {formatTime(leg.departureTime, locale)}
              </div>
              <div
                className="mt-0.5 truncate text-xs font-medium text-slate-600"
                dir="ltr"
              >
                {leg.originAirport}
              </div>
            </div>

            <div className="min-w-[68px] text-center sm:min-w-24">
              <div className="flex items-center justify-center text-teal">
                <span className="h-px flex-1 bg-slate-200" />
                <PlaneTakeoff className="mx-1.5 h-3 w-3" />
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div
                className="mt-0.5 text-xs font-semibold leading-4 text-slate-800"
                dir="auto"
              >
                {leg.duration}
              </div>
              <div className="text-[11px] font-medium leading-4 text-slate-600">
                {formatStopsLabel(leg.stops, t)}
              </div>
            </div>

            <div className="min-w-0 text-end">
              <div
                className="text-base font-semibold leading-5 tracking-[-0.02em] text-slate-950 sm:text-[17px]"
                dir="ltr"
              >
                {formatTime(leg.arrivalTime, locale)}
              </div>
              <div
                className="mt-0.5 truncate text-xs font-medium text-slate-600"
                dir="ltr"
              >
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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#004BB8]/8 bg-[#004BB8]/5 text-[#004BB8] shadow-sm">
      <PlaneTakeoff className="h-3.5 w-3.5" aria-hidden="true" />
    </div>
  );
}

function FlightFareAction({
  flightId,
  formattedPrice,
  priceAriaLabel,
  priceTitle,
  priceLabel,
  showConvertedProviderPrice,
  providerPrice,
  providerPriceLabel,
  viewFlightLabel,
  className,
}: {
  flightId: string;
  formattedPrice: string;
  priceAriaLabel: string;
  priceTitle: string | undefined;
  priceLabel: string;
  showConvertedProviderPrice: boolean;
  providerPrice: string;
  providerPriceLabel: string;
  viewFlightLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-end gap-2.5 rounded-xl px-0 py-0 text-end lg:min-h-[118px] lg:items-stretch lg:justify-center lg:gap-2 lg:self-stretch lg:px-1 lg:py-3 lg:text-center",
        className,
      )}
    >
      <div className="min-w-0 lg:flex lg:min-h-[72px] lg:flex-col lg:items-center lg:justify-center lg:text-center">
        <div
          className="text-lg font-semibold leading-tight tracking-[-0.025em] text-slate-950 sm:text-xl"
          aria-label={priceAriaLabel}
          title={priceTitle}
          dir="ltr"
        >
          {formattedPrice}
        </div>
        <p className="mt-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-slate-600 sm:text-[11px] lg:mt-1">
          {priceLabel}
        </p>
        {showConvertedProviderPrice ? (
          <div className="mt-1.5 space-y-0.5 text-xs font-medium leading-4 text-slate-600 lg:text-center">
            <p>
              <span>{providerPriceLabel}:</span>{" "}
              <span dir="ltr">{providerPrice}</span>
            </p>
          </div>
        ) : null}
      </div>
      <LinkButton
        href={`/flights/details/${encodeURIComponent(flightId)}`}
        variant="primary"
        size="sm"
        className="w-auto shrink-0 justify-center whitespace-nowrap rounded-full bg-[#004BB8] px-3 py-1.5 text-xs font-semibold hover:bg-[#021C2B] focus-visible:ring-[#004BB8]/35 sm:px-3.5 sm:text-sm lg:w-full lg:px-3.5 lg:py-2 lg:text-sm"
      >
        {viewFlightLabel}
      </LinkButton>
    </div>
  );
}

function FlightDetailLines({ details }: { details: DetailItem[] }) {
  return (
    <div className="grid min-w-0 flex-1 gap-x-4 gap-y-1 text-xs leading-5 text-slate-600 sm:grid-cols-2 lg:border-t lg:border-slate-100 lg:pt-2">
      {details.map((detail) => {
        const Icon = detail.icon;

        return (
          <p
            key={detail.label}
            className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5"
          >
            <Icon
              className="h-3.5 w-3.5 shrink-0 text-[#004BB8]"
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

function formatCabinClass(
  value: string | undefined,
  t: (key: string) => string,
) {
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

function formatBaggageValue(
  value: string | undefined,
  t: (key: string) => string,
) {
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
  const summaryTemplate = t("layoverSummaryTemplate");
  const baseText = summaryTemplate
    ? summaryTemplate
        .replace("{{airport}}", firstLayover.airport)
        .replace("{{duration}}", firstLayover.duration)
    : `${t("layover")}: ${firstConnection}`;
  return `${baseText}${extraConnections}`;
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
