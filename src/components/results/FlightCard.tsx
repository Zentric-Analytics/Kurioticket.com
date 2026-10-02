"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Armchair,
  Award,
  ChevronRight,
  Heart,
  Luggage,
  PlaneTakeoff,
  Share2,
  ShieldCheck,
  Tag,
  Zap,
} from "lucide-react";
import type { FlightLeg, PublicFlightResult } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { useCurrencyRates } from "@/components/currency/CurrencyRatesProvider";
import { useRegion } from "@/components/region/RegionProvider";
import { formatDisplayPrice } from "@/lib/currency/formatCurrency";
import { useLocale } from "@/components/layout/LocaleProvider";
import { translations as enTranslations } from "@/lib/i18n/en";
import { cn, formatItineraryShortDate, formatTime } from "@/lib/utils";
import { formatFlightCardPrice } from "@/components/results/flightCardPrice";
import { MobileFlightCard } from "@/components/results/MobileFlightCard";
import { formatDesktopBaggageValue } from "@/components/results/flightCardBaggage";
import { useSavedFlightResult } from "@/components/results/useSavedFlightResult";

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
  providerLabel,
  actionAriaLabel,
  onAction,
}: {
  flight: PublicFlightResult;
  isAccented?: boolean;
  resultBadge?: ResultBadge;
  detailsHref?: string | null;
  actionLabel?: string;
  providerLabel?: string;
  actionAriaLabel?: string;
  onAction?: (flight: PublicFlightResult) => void;
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
    convertSourceEstimate: true,
    useFlightResultSymbols: true,
    maximumFractionDigits: 0,
    rates: currencyRates.rates,
    isFallbackRate: currencyRates.isFallback,
  });
  const cardPrice = formatFlightCardPrice({
    amount: displayPrice.amount,
    formatted: displayPrice.formatted,
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
  const resolvedDetailsHref =
    detailsHref === undefined
      ? `/flights/details/${encodeURIComponent(flight.id)}`
      : detailsHref;
  const resolvedActionLabel = actionLabel ?? t("viewDeal");
  const { isSaved, pending: savedFlightPending, toggleSavedFlight } = useSavedFlightResult(
    flight,
    resolvedDetailsHref,
  );
  const [shareConfirmation, setShareConfirmation] = useState("");

  async function shareFlight() {
    const relativeUrl = resolvedDetailsHref ?? window.location.href;
    const url = new URL(relativeUrl, window.location.origin).toString();
    const route = `${flight.originAirport} → ${flight.destinationAirport}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: route, text: flight.airlineName, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareConfirmation(t("linkCopied") || "Flight link copied");
      window.setTimeout(() => setShareConfirmation(""), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareConfirmation(t("unableToShare") || "Unable to share this flight");
      window.setTimeout(() => setShareConfirmation(""), 2200);
    }
  }

  function renderFlightUtilityActions(className?: string) {
    return (
      <div data-flight-card-actions className={cn("flex shrink-0 items-center", className)}>
        <button
          type="button"
          aria-label={`${isSaved ? "Unsave" : "Save"} ${flight.airlineName} flight`}
          aria-pressed={isSaved}
          disabled={savedFlightPending}
          onClick={() => void toggleSavedFlight()}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40 disabled:cursor-wait disabled:opacity-60",
            isSaved ? "text-rose-600" : "text-slate-600",
          )}
        >
          <Heart
            size={18}
            fill={isSaved ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          aria-label={`Share ${flight.airlineName} flight`}
          onClick={() => void shareFlight()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-transparent text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/40"
        >
          <Share2 size={18} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <>
      <MobileFlightCard
        flight={flight}
        resultBadge={resultBadge}
        detailsHref={resolvedDetailsHref}
        providerLabel={providerLabel}
        onAction={onAction}
      />
    <Card
      data-flight-result-card
      className={cn(
        "relative hidden w-full overflow-hidden rounded-[14px] border-[#D8E1EC] bg-white shadow-[0_12px_30px_-24px_rgba(15,23,42,0.5)] transition duration-200 hover:-translate-y-0.5 hover:border-[#BFCEDF] hover:shadow-[0_18px_38px_-26px_rgba(15,23,42,0.4)] sm:block lg:rounded-2xl lg:border-[#CDD8E5] lg:bg-[#FEFFFF]",
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
      {providerLabel && <p className="px-4 pt-3 text-xs font-semibold text-amber-800">{providerLabel}</p>}
      {shareConfirmation ? (
        <span
          role="status"
          aria-live="polite"
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full bg-[#07133B] px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"
        >
          {shareConfirmation}
        </span>
      ) : null}
      <div className="flight-card-desktop-shell">
        <div className="flight-card-desktop">
          <div className="flight-card-desktop-header relative flex min-w-0 items-start justify-between pb-2">
            <div className="flight-card-desktop-brand flex min-w-0 items-center">
              <div className="flight-card-header-logo">
                <AirlineLogo flight={flight} />
              </div>
              <div className="min-w-0">
                <p
                  className="flight-card-airline-name truncate whitespace-nowrap font-bold text-slate-900"
                  dir="auto"
                >
                  <span>{flight.airlineName}</span>
                </p>
                {flight.flightNumber ? (
                  <p className="flight-card-flight-number truncate font-medium text-[#536B92]" dir="ltr">
                    {flight.flightNumber}
                  </p>
                ) : null}
              </div>
            </div>
            <div
              data-flight-card-header-actions
              className="flight-card-header-actions flex shrink-0 items-center justify-end gap-1"
            >
              {resultBadge ? <ResultBadgePill badge={resultBadge} /> : null}
              {renderFlightUtilityActions("hidden lg:flex")}
            </div>
          </div>

          <div className="flight-card-body mt-2 grid min-w-0 items-stretch gap-y-4">
            <div className="flight-card-legs grid min-w-0 gap-5">
              {visibleLegs.map((leg, index) => (
                <ResponsiveFlightLegRow
                  key={`${leg.direction}-${leg.originAirport}-${leg.destinationAirport}-${leg.departureTime}-${index}`}
                  leg={leg}
                  locale={locale}
                />
              ))}
            </div>

            <FlightDetailLines details={details} />
            <FlightFareAction
              detailsHref={resolvedDetailsHref}
              formattedPrice={cardPrice.formatted}
              priceSize={cardPrice.size}
              priceAriaLabel={priceAriaLabel}
              priceTitle={priceTitle}
              viewFlightLabel={resolvedActionLabel}
              viewFlightAriaLabel={actionAriaLabel}
              onAction={onAction ? () => onAction(flight) : undefined}
              actions={renderFlightUtilityActions("lg:hidden")}
            />
          </div>
        </div>
      </div>
    </Card>
    </>
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
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[10px] font-extrabold leading-[13px]",
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
      <p className="flight-card-leg-label font-bold uppercase text-[#0057E7]">
        {legTitle}
      </p>
      <div className="flight-card-leg-grid grid min-w-0">
          <div className="flight-card-leg-endpoint min-w-0">
          <div className="flight-card-leg-time-row flex min-w-0 items-center">
            <div
              className="flight-card-time min-w-0 font-extrabold tracking-[-0.025em] text-slate-950"
              dir="ltr"
            >
              {formatTime(leg.departureTime, locale)}
            </div>
          </div>
          <div
            className="flight-card-airport font-semibold text-slate-900"
            dir="ltr"
          >
            {leg.originAirport}
          </div>
          <div
            className="flight-card-departure-date flight-card-leg-meta font-medium text-[#536B92]"
            dir="auto"
          >
            {formatItineraryShortDate({ value: leg.departureTime, locale })}
          </div>
        </div>

        <div className="flight-card-leg-center min-w-0 text-center">
          <div className="flight-card-duration flex items-center justify-center font-semibold text-slate-600">
            <span dir="auto">{leg.duration}</span>
            <span
              className="h-1 w-1 rounded-full bg-slate-500"
              aria-hidden="true"
            />
            <span>{formatStopsLabel(leg.stops, t)}</span>
          </div>
          <div className="flight-card-path flex items-center text-slate-400" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="h-px flex-1 bg-slate-300" />
            <PlaneTakeoff className="mx-2 h-3.5 w-3.5 text-[#004BB8]" />
            <span className="h-px flex-1 bg-slate-300" />
            <span className="h-2 w-2 rounded-full bg-slate-400" />
          </div>
          {leg.layovers.length ? (
            <p
              className="flight-card-layover flight-card-leg-meta truncate font-medium text-[#536B92]"
              title={formatLayoverText(leg, t)}
            >
              {formatLayoverText(leg, t)}
            </p>
          ) : (
            <p className="flight-card-route-codes flight-card-leg-meta font-medium text-[#536B92]">
              {leg.originAirport} → {leg.destinationAirport}
            </p>
          )}
        </div>

        <div className="flight-card-leg-endpoint min-w-0 text-right">
          <div
            className="flight-card-time font-extrabold tracking-[-0.025em] text-slate-950"
            dir="ltr"
          >
            {formatTime(leg.arrivalTime, locale)}
          </div>
          <div
            className="flight-card-airport truncate font-semibold text-slate-900"
            dir="ltr"
          >
            {leg.destinationAirport}
          </div>
          <div
            className="flight-card-arrival-date flight-card-leg-meta font-medium text-[#536B92]"
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
  inline = false,
}: {
  flight: PublicFlightResult;
  inline?: boolean;
}) {
  if (flight.airlineLogo) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center",
          inline ? "flight-card-inline-logo" : "rounded-lg border border-slate-200 bg-white shadow-sm",
          "flight-card-logo-box",
        )}
      >
        <Image
          src={flight.airlineLogo}
          alt={`${flight.airlineName} logo`}
          width={38}
          height={38}
          className={cn("flight-card-logo-image object-contain", inline && "flight-card-inline-logo-image")}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center text-[#004BB8]",
        inline ? "flight-card-inline-logo" : "rounded-lg border border-[#004BB8]/8 bg-[#004BB8]/5 shadow-sm",
        "flight-card-logo-box",
      )}
    >
      <PlaneTakeoff
        className={cn("flight-card-logo-icon", inline && "flight-card-inline-logo-icon")}
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
  viewFlightLabel,
  viewFlightAriaLabel,
  onAction,
  actions,
  className,
}: {
  detailsHref: string | null;
  formattedPrice: string;
  priceSize: "normal" | "large" | "compact";
  priceAriaLabel: string;
  priceTitle: string | undefined;
  viewFlightLabel: string;
  viewFlightAriaLabel?: string;
  onAction?: () => void;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flight-card-fare-action flex flex-col items-end justify-start text-right",
        className,
      )}
    >
      {actions ? (
        <div
          data-flight-card-fare-actions
          className="mb-1 flex w-full justify-end lg:hidden"
        >
          {actions}
        </div>
      ) : null}
      <div className="flight-card-fare-commerce flex w-full flex-col items-end">
        <div
          className={cn(
            "flight-card-price-frame min-w-0 text-right",
            "flex flex-col items-end justify-center",
          )}
        >
          <div
            className={cn(
              "flight-card-price-value font-bold leading-tight tracking-[-0.025em] text-slate-950",
              "flight-card-price",
            )}
            aria-label={priceAriaLabel}
            title={priceTitle}
            data-price-size={priceSize}
            dir="ltr"
          >
            {formattedPrice}
          </div>
        </div>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            aria-label={viewFlightAriaLabel}
            className="flight-card-view-button mt-2 inline-flex min-h-9 shrink-0 items-center justify-end gap-1 whitespace-nowrap text-sm font-semibold text-[#004BB8] transition hover:text-[#064CF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
          >
            <span>{viewFlightLabel}</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : detailsHref ? (
          <Link
            href={detailsHref}
            aria-label={viewFlightAriaLabel}
            className="flight-card-view-button mt-2 inline-flex min-h-9 shrink-0 items-center justify-end gap-1 whitespace-nowrap text-sm font-semibold text-[#004BB8] transition hover:text-[#064CF7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#004BB8]/30"
          >
            <span>{viewFlightLabel}</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label={viewFlightAriaLabel}
            className="flight-card-view-button mt-2 inline-flex min-h-9 cursor-not-allowed items-center justify-end gap-1 whitespace-nowrap text-sm font-semibold text-slate-400"
          >
            <span>{viewFlightLabel}</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
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
        "flight-card-details mt-3 grid min-w-0 flex-1 items-start gap-3 px-3 py-2.5 text-[10.5px] leading-[15px] text-slate-600",
      )}
    >
      {details.map((detail) => {
        const Icon = detail.icon;

        return (
          <p
            key={detail.label}
            className={cn(
              "flight-card-detail-item grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-1.5 gap-y-0.5 whitespace-normal",
            )}
          >
            <Icon
              className="flight-card-detail-icon h-3.5 w-3.5 shrink-0 text-slate-500"
              aria-hidden="true"
            />
            <span className="flight-card-detail-label shrink-0 font-semibold text-[#07133B]">
              {detail.label}:
            </span>
            <span
              className="flight-card-detail-value min-w-0 font-medium text-[#536B92]"
              title={detail.value}
            >
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
      value: formatDesktopBaggageValue(flight.baggageInfo, t),
      icon: Luggage,
    },
    {
      label: t("cabin"),
      value: formatCabinClass(flight.cabinClass, t),
      icon: Armchair,
    },
    {
      label: t("fareRules"),
      value: t("checkProvider"),
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
