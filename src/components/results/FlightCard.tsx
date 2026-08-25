"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Armchair,
  Award,
  Luggage,
  PlaneTakeoff,
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
import { cn, formatItineraryShortDate, formatTime } from "@/lib/utils";
import { formatFlightCardPrice } from "@/components/results/flightCardPrice";

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
  detailsHref,
  actionLabel,
  actionAriaLabel,
  onAction,
  showProviderHandoffCopy = true,
}: {
  flight: PublicFlightResult;
  isAccented?: boolean;
  resultBadge?: ResultBadge;
  detailsHref?: string | null;
  actionLabel?: string;
  actionAriaLabel?: string;
  onAction?: (flight: PublicFlightResult) => void;
  showProviderHandoffCopy?: boolean;
}) {
  const { t: dictionary, locale } = useLocale();
  const router = useRouter();
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
  const cardPrice = formatFlightCardPrice({
    amount: displayPrice.amount,
    currency: displayPrice.currency,
    formatted: displayPrice.formatted,
    locale,
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
  const resolvedDetailsHref =
    detailsHref === undefined
      ? `/flights/details/${encodeURIComponent(flight.id)}`
      : detailsHref;
  const resolvedActionLabel = actionLabel ?? t("viewFlight");

  return (
    <Card
      className={cn(
        "relative w-full overflow-hidden border-[#D8E1EC] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-[#CBD6E2] hover:shadow-[0_16px_34px_rgba(15,23,42,0.095)] lg:rounded-xl lg:border-[#CDD8E5] lg:bg-[#FEFFFF] lg:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.55)]",
        isAccented && "ring-1 ring-slate-950/[0.03]",
      )}
      onClick={(event) => {
        if (
          !resolvedDetailsHref ||
          onAction ||
          !window.matchMedia("(max-width: 1023px)").matches ||
          (event.target as HTMLElement).closest("a, button, input, select, textarea")
        ) {
          return;
        }
        router.push(resolvedDetailsHref);
      }}
    >
      <div className="flight-card-desktop-shell">
        <div className="flight-card-desktop">
          <div className="flight-card-desktop-header flex min-w-0 items-start justify-between pb-2">
            <div className="flight-card-desktop-brand flex min-w-0 items-center">
              <AirlineLogo flight={flight} />
              <div className="min-w-0">
                <p
                  className="flight-card-airline-name truncate font-semibold leading-5 text-slate-800"
                  dir="auto"
                >
                  {flight.airlineName}
                </p>
                {flight.flightNumber ? (
                  <p
                    className="mt-0.5 truncate text-sm font-medium leading-5 text-[#536B92]"
                    dir="ltr"
                  >
                    {flight.flightNumber}
                  </p>
                ) : null}
              </div>
            </div>
            <ResultBadgePill badge={resultBadge} />
          </div>

          <div className="flight-card-desktop-itinerary mt-2 grid min-w-0 items-stretch gap-y-4">
            <div className="grid min-w-0 gap-5">
              {visibleLegs.map((leg, index) => (
                <ResponsiveFlightLegRow
                  key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}-${leg.departureTime}-${index}`}
                  leg={leg}
                  locale={locale}
                />
              ))}
            </div>

            <FlightFareAction
              detailsHref={resolvedDetailsHref}
              formattedPrice={cardPrice.formatted}
              priceSize={cardPrice.size}
              priceAriaLabel={priceAriaLabel}
              priceTitle={priceTitle}
              priceLabel={priceLabel}
              showConvertedProviderPrice={displayPrice.isConvertedEstimate}
              providerPrice={providerPrice}
              providerPriceLabel={t("providerPrice")}
              viewFlightLabel={resolvedActionLabel}
              viewFlightAriaLabel={actionAriaLabel}
              onAction={onAction ? () => onAction(flight) : undefined}
            />
          </div>

          <FlightDetailLines details={details} />
          {showProviderHandoffCopy ? (
            <p className="flight-card-handoff text-xs font-medium leading-5 text-slate-600">
              {providerHandoffCopy}
            </p>
          ) : null}
        </div>
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
      Icon: React.ComponentType<{
        className?: string;
        "aria-hidden"?: boolean;
      }>;
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

function ResponsiveFlightLegRow({
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
      <div className="flight-card-leg-grid grid min-w-0 items-center">
        <div className="min-w-0 self-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0057E7]">
            {legTitle}
          </p>
          <div
            className="flight-card-time mt-1 font-semibold leading-6 tracking-[-0.025em] text-[#07133B]"
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
            className="flight-card-time font-semibold leading-6 tracking-[-0.025em] text-[#07133B]"
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
            className="flight-card-arrival-date mt-0.5 text-sm font-medium leading-5 text-[#07133B]"
            dir="auto"
          >
            {formatItineraryShortDate({ value: leg.arrivalTime, locale })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AirlineLogo({
  flight,
}: {
  flight: PublicFlightResult;
}) {
  if (flight.airlineLogo) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm",
          "flight-card-logo-box",
        )}
      >
        <Image
          src={flight.airlineLogo}
          alt={`${flight.airlineName} logo`}
          width={38}
          height={38}
          className="flight-card-logo-image object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg border border-[#004BB8]/8 bg-[#004BB8]/5 text-[#004BB8] shadow-sm",
        "flight-card-logo-box",
      )}
    >
      <PlaneTakeoff
        className="flight-card-logo-icon"
        aria-hidden="true"
      />
    </div>
  );
}

function FlightFareAction({
  detailsHref,
  formattedPrice,
  priceSize,
  priceAriaLabel,
  priceTitle,
  priceLabel,
  showConvertedProviderPrice,
  providerPrice,
  providerPriceLabel,
  viewFlightLabel,
  viewFlightAriaLabel,
  onAction,
  className,
}: {
  detailsHref: string | null;
  formattedPrice: string;
  priceSize: "normal" | "large" | "compact";
  priceAriaLabel: string;
  priceTitle: string | undefined;
  priceLabel: string;
  showConvertedProviderPrice: boolean;
  providerPrice: string;
  providerPriceLabel: string;
  viewFlightLabel: string;
  viewFlightAriaLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flight-card-fare-action flex flex-col items-center justify-center border-l border-[#D8E1EC] text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flight-card-price-frame min-w-0 text-center",
          "flex flex-col items-center justify-center",
        )}
      >
        <div
          className={cn(
            "flight-card-price-value font-semibold leading-tight tracking-[-0.025em] text-slate-950",
            "flight-card-price",
          )}
          aria-label={priceAriaLabel}
          title={priceTitle}
          data-price-size={priceSize}
          dir="ltr"
        >
          {formattedPrice}
        </div>
        <p className="mt-1.5 text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-slate-600 sm:text-[11px] lg:mt-1">
          {priceLabel}
        </p>
        {showConvertedProviderPrice ? (
          <div className="flight-card-provider-price mt-1.5 space-y-0.5 text-xs font-medium leading-4 text-slate-600 lg:text-center">
            <p>
              <span>{providerPriceLabel}:</span>{" "}
              <span dir="ltr">{providerPrice}</span>
            </p>
          </div>
        ) : null}
      </div>
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          aria-label={viewFlightAriaLabel}
          className={cn(
            "inline-flex min-h-11 w-auto shrink-0 items-center justify-center whitespace-nowrap bg-[#004BB8] text-sm font-semibold text-white hover:bg-[#021C2B] focus-visible:ring-[#004BB8]/35",
            "flight-card-view-button rounded-md px-3.5 py-2.5",
          )}
        >
          {viewFlightLabel}
        </button>
      ) : detailsHref ? (
        <LinkButton
          href={detailsHref}
          aria-label={viewFlightAriaLabel}
          variant="primary"
          size="sm"
          className={cn(
            "w-auto shrink-0 justify-center whitespace-nowrap bg-[#004BB8] text-sm font-semibold hover:bg-[#021C2B] focus-visible:ring-[#004BB8]/35",
            "flight-card-view-button rounded-md py-2.5",
          )}
        >
          {viewFlightLabel}
        </LinkButton>
      ) : (
        <button
          type="button"
          disabled
          aria-disabled="true"
          aria-label={viewFlightAriaLabel}
          className={cn(
            "inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-full bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-500",
            "flight-card-view-button rounded-md",
          )}
        >
          {viewFlightLabel}
        </button>
      )}
    </div>
  );
}

function FlightDetailLines({
  details,
}: {
  details: DetailItem[];
}) {
  return (
    <div
      className={cn(
        "flight-card-details mt-4 grid min-w-0 flex-1 grid-cols-3 items-center border-t border-[#D8E1EC] pt-3 text-xs leading-5 text-slate-600",
      )}
    >
      {details.map((detail) => {
        const Icon = detail.icon;

        return (
          <p
            key={detail.label}
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5",
              "flight-card-detail-item flex-nowrap whitespace-nowrap border-r border-[#EEF2F7] last:border-r-0 last:pr-0",
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
      label: t("fareRules"),
      value: t("reviewBeforeBooking"),
      icon: ShieldCheck,
    },
  ];
}

function formatLegTitle(leg: FlightLeg, t: (key: string) => string) {
  if (leg.direction === "return") return t("return");
  if (leg.direction === "outbound") return t("outbound");
  return leg.legIndex === undefined
    ? t("flightLeg")
    : (t("flightMultiCity.flight") || "Flight {{number}}").replace("{{number}}", String(leg.legIndex + 1));
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
