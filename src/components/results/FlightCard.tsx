"use client";

import Image from "next/image";
import {
  Armchair,
  Award,
  Luggage,
  PlaneTakeoff,
  Settings,
  ShieldCheck,
  Tag,
  Zap,
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

type ResultBadge = "best" | "fastest" | "cheapest";

export function FlightCard({
  flight,
  isAccented = false,
  resultBadge,
}: {
  flight: PublicFlightResult;
  isAccented?: boolean;
  resultBadge?: ResultBadge;
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
  const desktopDetails = details.filter(
    (detail) => detail.label !== t("seatSelection"),
  );
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

  const mobileCard = (
    <div className="p-2.5 sm:p-3 lg:hidden">
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

          <div className="mt-2 flex items-start justify-between gap-4 border-t border-slate-100 pt-4">
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
            />
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-[#D8E1EC]/70 bg-[#F8FAFC]/80 px-3 py-2.5 text-xs font-medium leading-5 text-slate-600">
        {providerHandoffCopy}
      </div>
    </div>
  );

  return (
    <Card
      className={cn(
        "relative w-full overflow-hidden border-[#D8E1EC] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-[#CBD6E2] hover:shadow-[0_16px_34px_rgba(15,23,42,0.095)] lg:rounded-xl lg:border-[#CDD8E5] lg:bg-[#FEFFFF] lg:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]",
        isAccented && "ring-1 ring-slate-950/[0.03]",
      )}
    >
      {mobileCard}

      <div className="hidden px-[clamp(1rem,1.25vw,1.5rem)] py-4 lg:block">
        <div className="flex min-w-0 items-start justify-between gap-[clamp(0.75rem,1vw,1rem)] pb-2">
          <div className="flex min-w-0 items-center gap-[clamp(0.625rem,0.8vw,0.75rem)]">
            <AirlineLogo flight={flight} desktop />
            <div className="min-w-0">
              <p className="truncate text-[clamp(0.8125rem,0.8vw,0.875rem)] font-semibold leading-5 text-slate-800" dir="auto">
                {flight.airlineName}
              </p>
              {flight.flightNumber ? (
                <p className="mt-0.5 truncate text-sm font-medium leading-5 text-[#536B92]" dir="ltr">
                  {flight.flightNumber}
                </p>
              ) : null}
            </div>
          </div>
          <ResultBadgePill badge={resultBadge} />
        </div>

        <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(150px,0.85fr)] items-stretch gap-x-[clamp(0.875rem,1.15vw,1.5rem)] gap-y-4">
          <div className="grid min-w-0 gap-5">
            {visibleLegs.map((leg, index) => (
              <DesktopFlightLegRow
                key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}-${leg.departureTime}-${index}`}
                leg={leg}
                locale={locale}
              />
            ))}
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
            desktop
          />
        </div>

        <FlightDetailLines details={desktopDetails} desktop />
      </div>
    </Card>
  );
}


function ResultBadgePill({ badge }: { badge?: ResultBadge }) {
  if (!badge) return null;

  const badgeConfig = {
    best: {
      label: "Best value",
      Icon: Award,
      className: "bg-emerald-50 text-emerald-700",
    },
    fastest: {
      label: "Fastest",
      Icon: Zap,
      className: "bg-blue-50 text-[#004BB8]",
    },
    cheapest: {
      label: "Cheapest",
      Icon: Tag,
      className: "bg-emerald-50 text-emerald-700",
    },
  } satisfies Record<
    ResultBadge,
    {
      label: string;
      Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
      className: string;
    }
  >;

  const { label, Icon, className } = badgeConfig[badge];

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold leading-5",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </div>
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

function DesktopFlightLegRow({
  leg,
  locale,
}: {
  leg: FlightLeg;
  locale: string;
}) {
  const { t: dictionary } = useLocale();
  const t = (key: string) => dictionary[key] ?? enTranslations[key] ?? "";
  const legTitle = formatLegTitle(leg, t);

  return (
    <section aria-label={legTitle} className="min-w-0">
      <div className="grid min-w-0 grid-cols-[minmax(115px,0.8fr)_minmax(220px,1.5fr)_minmax(110px,0.75fr)] items-center gap-[clamp(0.875rem,1.2vw,1.5rem)]">
        <div className="min-w-0 self-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0057E7]">
            {legTitle}
          </p>
          <div
            className="mt-1 text-[clamp(1.25rem,1.25vw,1.375rem)] font-semibold leading-6 tracking-[-0.025em] text-[#07133B]"
            dir="ltr"
          >
            {formatTime(leg.departureTime, locale)}
          </div>
          <div
            className="mt-1 text-sm font-bold leading-5 text-[#07133B]"
            dir="ltr"
          >
            {leg.originAirport}
          </div>
        </div>

        <div className="min-w-0 self-center text-center">
          <div className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold text-[#07133B]">
            <span dir="auto">{leg.duration}</span>
            <span
              className="h-1 w-1 rounded-full bg-[#07133B]"
              aria-hidden="true"
            />
            <span>{formatStopsLabel(leg.stops, t)}</span>
          </div>
          <div className="flex items-center text-[#7890B8]" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-[#7890B8]" />
            <span className="h-px flex-1 bg-[#B9C5D8]" />
            <PlaneTakeoff className="mx-2 h-3.5 w-3.5 text-[#0057E7]" />
            <span className="h-px flex-1 bg-[#B9C5D8]" />
            <span className="h-2 w-2 rounded-full bg-[#7890B8]" />
          </div>
          {leg.layovers.length ? (
            <p
              className="mt-2 truncate text-sm font-medium leading-5 text-[#536B92]"
              title={formatLayoverText(leg, t)}
            >
              {formatLayoverText(leg, t)}
            </p>
          ) : (
            <p className="mt-2 text-sm font-medium leading-5 text-[#536B92]">
              {leg.originAirport} → {leg.destinationAirport}
            </p>
          )}
        </div>

        <div className="min-w-0 self-center text-right">
          <div
            className="text-[clamp(1.25rem,1.25vw,1.375rem)] font-semibold leading-6 tracking-[-0.025em] text-[#07133B]"
            dir="ltr"
          >
            {formatTime(leg.arrivalTime, locale)}
          </div>
          <div
            className="mt-1 truncate text-sm font-bold leading-5 text-[#07133B]"
            dir="ltr"
          >
            {leg.destinationAirport}
          </div>
          <div
            className="mt-0.5 text-sm font-medium leading-5 text-[#07133B]"
            dir="auto"
          >
            {formatShortDate(leg.arrivalTime, locale)}
          </div>
        </div>
      </div>
    </section>
  );
}

function AirlineLogo({
  flight,
  desktop = false,
}: {
  flight: PublicFlightResult;
  desktop?: boolean;
}) {
  if (flight.airlineLogo) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm",
          desktop ? "h-[clamp(2.625rem,2.7vw,3rem)] w-[clamp(2.625rem,2.7vw,3rem)]" : "h-8 w-8",
        )}
      >
        <Image
          src={flight.airlineLogo}
          alt={`${flight.airlineName} logo`}
          width={desktop ? 38 : 24}
          height={desktop ? 38 : 24}
          className={cn("object-contain", desktop ? "h-[clamp(2.125rem,2.25vw,2.5rem)] w-[clamp(2.125rem,2.25vw,2.5rem)]" : "h-6 w-6")}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-[#004BB8]/8 bg-[#004BB8]/5 text-[#004BB8] shadow-sm",
        desktop ? "h-[clamp(2.625rem,2.7vw,3rem)] w-[clamp(2.625rem,2.7vw,3rem)]" : "h-8 w-8",
      )}
    >
      <PlaneTakeoff
        className={cn(desktop ? "h-[clamp(1.125rem,1.2vw,1.25rem)] w-[clamp(1.125rem,1.2vw,1.25rem)]" : "h-3.5 w-3.5")}
        aria-hidden="true"
      />
    </div>
  );
}

function formatShortDate(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
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
  desktop = false,
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
  desktop?: boolean;
}) {
  return (
    <div
      className={cn(
        desktop
          ? "flex min-w-[150px] flex-col items-center justify-center gap-[clamp(0.625rem,0.85vw,0.75rem)] border-l border-[#D8E1EC] pl-[clamp(0.875rem,1.15vw,1.5rem)] text-center"
          : "flex w-[104px] shrink-0 flex-col items-center gap-2.5 rounded-xl px-0 py-0 text-center sm:w-[112px] lg:min-h-[118px] lg:w-auto lg:items-stretch lg:justify-center lg:gap-2 lg:self-stretch lg:px-1 lg:py-3 lg:text-center",
        className,
      )}
    >
      <div
        className={cn(
          "min-w-0 text-center",
          desktop
            ? "flex flex-col items-center justify-center"
            : "lg:flex lg:min-h-[72px] lg:flex-col lg:items-center lg:justify-center lg:text-center",
        )}
      >
        <div
          className={cn(
            "font-semibold leading-tight tracking-[-0.025em] text-slate-950",
            desktop ? "text-[clamp(1.25rem,1.25vw,1.375rem)]" : "text-lg sm:text-xl",
          )}
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
        className={cn(
          "w-auto shrink-0 justify-center whitespace-nowrap bg-[#004BB8] text-sm font-semibold hover:bg-[#021C2B] focus-visible:ring-[#004BB8]/35",
          desktop
            ? "min-w-[126px] rounded-md px-[clamp(1rem,1.1vw,1.25rem)] py-2.5"
            : "min-w-[104px] rounded-full px-5 py-2.5 sm:px-4 sm:py-2 sm:text-sm lg:w-full lg:min-w-0 lg:px-3.5 lg:py-2 lg:text-sm",
        )}
      >
        {viewFlightLabel}
      </LinkButton>
    </div>
  );
}

function FlightDetailLines({
  details,
  desktop = false,
}: {
  details: DetailItem[];
  desktop?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid min-w-0 flex-1 text-xs leading-5 text-slate-600",
        desktop
          ? "mt-4 grid grid-cols-3 items-center gap-x-[clamp(0.75rem,1.25vw,1.5rem)] border-t border-[#D8E1EC] pt-3"
          : "gap-x-4 gap-y-1 sm:grid-cols-2 lg:border-t lg:border-slate-100 lg:pt-2",
      )}
    >
      {details.map((detail) => {
        const Icon = detail.icon;

        return (
          <p
            key={detail.label}
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5",
              desktop &&
                "flex-nowrap whitespace-nowrap border-r border-[#EEF2F7] pr-[clamp(0.75rem,1.25vw,1.5rem)] last:border-r-0 last:pr-0",
            )}
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
